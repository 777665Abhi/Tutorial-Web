---
title: "Core Components"
description: "Master Activities, Fragments, Services, and Broadcast Receivers."
---

## 1. What are the four core components of an Android application?
The four core components are **Activities**, **Services**, **Broadcast Receivers**, and **Content Providers**.

```kotlin
// Declared in AndroidManifest.xml:
// <activity android:name=".MainActivity" />
// <service android:name=".MyService" />
// <receiver android:name=".MyReceiver" />
// <provider android:name=".MyProvider" />
```

**What each one is for:**

- **Activity** — a single screen with a UI. The entry point for user interaction.
- **Service** — long-running work with no UI (music playback, syncing, downloads).
- **Broadcast Receiver** — responds to system-wide or app-wide announcements (battery low, connectivity change, boot completed).
- **Content Provider** — manages shared, structured data and exposes it to other apps through a `content://` URI.

**The thing that unites them:** each is an **entry point** the system can start *independently*. Another app (or the OS) can launch your Activity, start your Service, or query your Provider without your app already running — Android will create the process for it. This is why they must be declared in the manifest: the system needs to know they exist before your code has ever run.

It's also why you cannot rely on `Application` state being initialised, or on one component having run before another. Each component is instantiated by the system with its own lifecycle, which is the root cause of a great many Android bugs.

**A fifth thing that behaves like a component** in practice: `Application` itself, created once per process before any component, which is where you put process-wide initialisation.

## 2. Explain the Activity Lifecycle.
The lifecycle consists of standard state transitions: 
1. `onCreate()`: Initializes the activity, e.g., UI.
2. `onStart()`: Becomes visible to the user.
3. `onResume()`: Interacts with the user.
4. `onPause()`: Partially obscured or losing focus.
5. `onStop()`: No longer visible.
6. `onDestroy()`: Removed from memory.

```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main)
    println("Activity created")
}
```

**Think in three nested pairs**, each with a symmetric "set up / tear down" meaning:

- `onCreate` / `onDestroy` — the **entire lifetime**. Create things that last as long as the Activity object.
- `onStart` / `onStop` — the **visible lifetime**. Register and unregister anything that only matters while the user can see the screen.
- `onResume` / `onPause` — the **foreground lifetime**. The Activity is on top and receiving input.

Pairing them this way tells you where code belongs: whatever you acquire in `onStart`, release in `onStop`. A `BroadcastReceiver` for UI updates, a sensor listener, a location request — all `onStart`/`onStop`.

**The common transitions:**

- **Launch:** `onCreate` → `onStart` → `onResume`
- **Press Home:** `onPause` → `onStop`
- **Return to app:** `onRestart` → `onStart` → `onResume` (note `onRestart`, which is often forgotten — it runs only when coming back from a stopped state)
- **Press Back:** `onPause` → `onStop` → `onDestroy` (finished for good)
- **Rotate:** `onPause` → `onStop` → `onDestroy` → `onCreate` → `onStart` → `onResume` (a *new* instance)

**Two rules that matter in production:**

1. **`onPause` must be fast.** The next Activity's `onResume` doesn't run until your `onPause` returns, so heavy work here delays the whole transition and looks like a frozen app. Save durable data in `onStop` instead.
2. **`onDestroy` is not guaranteed.** If the system kills your process under memory pressure, it may never run. Anything that must survive goes to disk earlier, not here.

## 3. What is the difference between `onCreate()` and `onStart()`?
`onCreate()` is called only once during the activity's entire lifetime to initialize the UI and variables. 
`onStart()` is called every time the activity becomes visible to the user 
(e.g., when returning to it from another app).

```kotlin
override fun onStart() {
    super.onStart()
    // Register UI broadcast receivers or start animations
}
```

**Frequency is the whole distinction.** `onCreate` runs once per *instance*; `onStart` runs once per *visible period*, and one instance can go through many.

Walk through a concrete session: launch the app (`onCreate`, `onStart`), press Home (`onStop`), come back (`onStart` again), press Home (`onStop`), come back (`onStart` a third time). One `onCreate`, three `onStart`s.

**This dictates where code goes:**

- `onCreate` — `setContentView`, view binding, `ViewModel` wiring, adapter construction, reading `savedInstanceState`. One-time setup. Doing this in `onStart` means rebuilding your whole UI every time the user alt-tabs.
- `onStart` — registering listeners and receivers, starting animations, refreshing data that may have gone stale while you were away. Anything with a matching teardown in `onStop`.

**The classic bug:** registering a `BroadcastReceiver` in `onCreate` and unregistering it in `onStop`. The register runs once, the unregister runs every time the Activity is hidden — so the second time the user returns, the receiver is gone and nothing works. Or the mirror image: register in `onStart`, unregister in `onDestroy`, and you accumulate duplicate registrations (and a leak). **Keep the pairs symmetric.**

A caveat worth knowing: `onCreate` is "once per instance," not "once per app." Rotate the screen and you get a brand-new instance with a fresh `onCreate`, which is exactly why one-time *app* initialisation belongs in `Application.onCreate`, not here.

## 4. What happens to the lifecycle when a Dialog appears over an Activity?
The Activity's `onPause()` is called because it loses focus but is still partially visible. 

`onStop()` is NOT called unless the dialog is another activity that is fully opaque and covers the entire screen.

**Why:** visibility and focus are separate things. A `Dialog` is **not** a separate Activity — it is a separate `Window` added to the *same* Activity. The Activity is still visible behind the dim scrim, so it never becomes "stopped"; it only stops being the thing receiving input.

That said, the honest modern answer has a wrinkle worth raising:

**A plain `Dialog` or `DialogFragment` usually triggers nothing at all.** Because it belongs to the same Activity, the Activity typically stays `RESUMED`. The `onPause` answer is the classic one and is what most interviewers expect, but it's precisely true for a *translucent or partial Activity* (`Theme.Dialog`, `android:windowIsTranslucent="true"`) rather than an ordinary dialog.

**The same reasoning covers related cases:**

- **A translucent/dialog-themed Activity on top:** `onPause` only. The one below is still visible, so no `onStop`.
- **A normal, opaque Activity on top:** `onPause` → `onStop`.
- **Multi-window / split-screen (Android 7+):** both Activities can be `RESUMED` at once. The old "only one resumed Activity exists" assumption is no longer true, and on Android 10+ `onTopResumedActivityChanged()` tells you which one actually has top focus.
- **Screen off:** `onPause` → `onStop`, as if covered.

**The practical takeaway:** don't use `onPause`/`onStop` to infer "a dialog appeared." If you need to know, track it explicitly. And since `onPause` can fire for reasons as trivial as a notification shade pull, never put expensive teardown there.

## 5. What are Launch Modes in Android?
Launch modes define how a new instance of an activity should be associated with the current task. The four main modes are:
1. `standard` (Default, creates a new instance every time)
2. `singleTop` (Reuses the top instance if it's already at the top of the stack)
3. `singleTask` (Creates a new task or clears the stack down to this activity)
4. `singleInstance` (Activity runs in its own dedicated task).

```xml
<!-- In AndroidManifest.xml -->
<activity 
    android:name=".MainActivity"
    android:launchMode="singleTop" />
```

**First, what a "task" is:** a stack of Activities representing one user-facing job, which is what you see as a card in Recents. Launch modes are rules about *which* stack an Activity joins and *whether* it gets a fresh instance.

**Each mode, with its concrete effect.** Say the back stack is `A → B → C` and we launch `C` again:

- **`standard`** — result: `A → B → C → C`. Two separate `C` instances, both get `onCreate`. Multiple instances allowed, even across tasks.
- **`singleTop`** — result: `A → B → C`. Since `C` is already on top, no new instance; the existing one receives **`onNewIntent()`** instead. But launching `B` would still create a new `B`, because it is not on top.
- **`singleTask`** — only one instance exists in the whole system. Launching it clears everything above it: from `A → B → C`, launching `B` gives `A → B`, and `B` gets `onNewIntent`. `C` is destroyed.
- **`singleInstance`** — like `singleTask`, but the Activity is the *only* Activity in its task. Anything it launches goes into a different task.

**The `onNewIntent` trap**, which is the most common follow-up: when an instance is reused, `onCreate` does **not** run again — `onNewIntent` does. If you read `intent.extras` only in `onCreate`, your reused Activity silently keeps the stale intent. You must also update the stored intent:

```kotlin
override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)              // without this, getIntent() returns the OLD intent
    handleDeepLink(intent)
}
```

**Intent flags do the same job at runtime** and often more flexibly: `FLAG_ACTIVITY_NEW_TASK`, `FLAG_ACTIVITY_CLEAR_TOP`, `FLAG_ACTIVITY_SINGLE_TOP`. The combination `CLEAR_TOP or NEW_TASK` is the standard "log out and return to login" move.

**When to use which, in practice:** leave it as `standard` almost always. `singleTop` for a search or detail screen that can be re-triggered from a notification. `singleTask` for a true home/root screen. `singleInstance` almost never — it causes strange Recents and back-navigation behaviour, and is reserved for things like a launcher or a call screen.

## 6. What is a Fragment?
A Fragment represents a reusable portion of the UI. It has its own lifecycle, receives its own input events, and can be added or removed while the host Activity is running.

```kotlin
class MyFragment : Fragment(R.layout.fragment_my) {
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        // Setup UI
    }
}
```

**Why they exist.** Fragments were introduced for tablets — the same list and detail panes arranged one way on a phone and side by side on a tablet. That remains a good use, but today the dominant reason is **navigation**: the Jetpack Navigation component makes the single-Activity architecture the default, where one Activity hosts many Fragment destinations. Fragments are lighter than Activities (no manifest entry, no Binder round-trip to start) and can be swapped freely.

**The critical, non-obvious fact — a Fragment has two lifecycles:**

1. The **Fragment instance** lifecycle: `onAttach` → `onCreate` → … → `onDestroy` → `onDetach`.
2. The **Fragment's view** lifecycle: `onCreateView` → `onViewCreated` → … → `onDestroyView`.

The instance can **outlive its view**, repeatedly. Put a Fragment on the back stack, navigate away, and `onDestroyView` runs while the instance survives; navigate back and a *new* view is created for the *same* instance. This single fact explains most Fragment bugs:

```kotlin
// Leaks the entire view hierarchy — the binding outlives the view
private lateinit var binding: FragmentMyBinding

// Correct: null it out when the view dies
private var _binding: FragmentMyBinding? = null
private val binding get() = _binding!!

override fun onDestroyView() {
    super.onDestroyView()
    _binding = null
}
```

For the same reason, always observe `LiveData` with **`viewLifecycleOwner`**, not `this`. Using `this` keeps the observer alive across view recreations, so you end up with duplicate observers updating a destroyed view.

**Prefer the constructor that takes a layout ID** (`Fragment(R.layout.fragment_my)`) and do your work in `onViewCreated` — it's less boilerplate than overriding `onCreateView`. And always give a Fragment a **no-argument constructor**, passing data via `arguments` (a `Bundle`), because the system recreates Fragments reflectively after process death and cannot call a custom constructor.

## 7. Explain the Fragment Lifecycle.
It aligns closely with the Activity lifecycle but includes specific UI callbacks: 
1. `onAttach()`: Fragment is attached to its host activity.
2. `onCreate()`: Fragment state is restored.
3. `onCreateView()`: Inflation of the fragment's UI.
4. `onViewCreated()`: After the view is created.
5. `onStart()`: Fragment becomes visible.
6. `onResume()`: Fragment interacts with the user.
7. `onPause()`: Fragment loses focus.
8. `onStop()`: Fragment is no longer visible.
9. `onDestroyView()`: UI is destroyed.
10. `onDestroy()`: Fragment is destroyed.
11. `onDetach()`: Fragment is detached from its host activity.

```kotlin
override fun onCreateView(
    inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
): View? {
    return inflater.inflate(R.layout.fragment_my, container, false)
}
```

**What belongs in each callback** — the list above is the sequence; this is the judgement:

- **`onAttach`** — the host `Context` first becomes available. Good place to verify the host implements a required interface.
- **`onCreate`** — **no view exists yet.** Read `arguments`, initialise non-UI state, get your `ViewModel`. Never touch views here.
- **`onCreateView`** — *only* inflate and return the view. Do not set up listeners here.
- **`onViewCreated`** — views are ready. Bind data, set click listeners, start observing `LiveData`/`Flow` with `viewLifecycleOwner`. **This is where most of your code goes.**
- **`onDestroyView`** — null out view references and bindings. The instance lives on; the view does not.
- **`onDestroy` / `onDetach`** — instance-level teardown.

**The `container` argument and that `false`:** `inflater.inflate(layout, container, false)` passes the container so the inflater can compute correct `LayoutParams` from your root view's `layout_width`/`layout_height`, while `false` means "don't attach it yourself" — the `FragmentManager` does that. Passing `true` throws, because the view would be added twice.

**Nesting and the back stack** are where this gets subtle. A child Fragment uses `childFragmentManager`, not `parentFragmentManager`, and its lifecycle is bounded by its parent's *view* lifecycle. And when a Fragment goes onto the back stack, it stops at `onDestroyView` — it does **not** reach `onDestroy`. Coming back runs `onCreateView` → `onViewCreated` again on the same instance.

**A modern note:** `setRetainInstance(true)` is deprecated. Surviving configuration changes is `ViewModel`'s job now.

## 8. What is the difference between `add()` and `replace()` in FragmentTransaction?
- `add()` simply stacks the new fragment on top of existing ones (both are active in memory, but the top one is visible).
- `replace()` removes the existing fragment(s) in the container before adding the new one.

```kotlin
supportFragmentManager.commit {
    replace(R.id.fragment_container, newFragment)
    addToBackStack(null) // Allows user to press Back button to reverse
}
```

**The lifecycle consequence is the real difference.** `replace()` is `remove()` + `add()`, so the outgoing Fragment runs `onPause` → `onStop` → `onDestroyView`. With `add()`, the one underneath keeps its view entirely and stays `RESUMED` — it is simply covered.

**Which to pick:**

- **`add()`** when going back must be instant and preserve state exactly — scroll position, a half-filled form, a loaded map. The cost is memory (every view hierarchy stays alive) and the overlap hazard below.
- **`replace()`** when the previous screen's view can be thrown away and rebuilt. Lower memory, but you must restore state on return.

**The `add()` gotcha interviewers look for:** Fragment layouts normally have transparent backgrounds, so `add()` renders the new Fragment *on top of* the visible old one — you see both at once, and touches can fall through to the Fragment underneath. Set an opaque background, or use `replace()`.

**`addToBackStack(null)` is what makes Back work**, and it changes the meaning of `replace()`: without it, the removed Fragment is destroyed permanently; with it, the transaction is recorded so Back can reverse it. Note that even with `replace()` + back stack, the removed Fragment's *instance* is retained (only its view is destroyed) — which is exactly why `onDestroyView` cleanup matters.

**Commit variants, since this is a frequent follow-up:**

- `commit()` — asynchronous; the transaction runs on the next main-loop pass.
- `commitNow()` — synchronous, but cannot be used with `addToBackStack`.
- `commitAllowingStateLoss()` — won't throw `IllegalStateException` after `onSaveInstanceState`, at the price of possibly losing the transaction. Use it only when the UI change is genuinely disposable; a flood of these usually means a lifecycle bug elsewhere.

In new code, prefer the Navigation component over hand-written transactions — it handles the back stack, arguments, and animations for you.

## 9. What is an Intent?
An Intent is a messaging object used to request an action from another app component 
1. starting an activity
2. starting a service
3. delivering a broadcast
4. interacting with other apps
5. opening an app link

```kotlin
val intent = Intent(this, SecondActivity::class.java)
intent.putExtra("EXTRA_MESSAGE", "Hello")
startActivity(intent)
```

**What's actually inside one.** An Intent is a `Parcelable` bundle of fields the system uses for routing and delivery:

- **Component** — the explicit target class, if you named one.
- **Action** — a string naming what to do (`ACTION_VIEW`, `ACTION_SEND`).
- **Data** — a `Uri` to operate on, plus an optional MIME type.
- **Category** — extra qualification (`CATEGORY_LAUNCHER`, `CATEGORY_BROWSABLE`).
- **Extras** — a `Bundle` of key-value payload.
- **Flags** — instructions about task and stack behaviour.

The first four participate in **intent resolution** (matching against `<intent-filter>` entries). Extras do not — they are just cargo.

**Because an Intent crosses a Binder boundary**, two practical limits follow. Extras must be `Parcelable`/`Serializable` since everything is marshalled; and the whole thing is capped by the ~1 MB Binder transaction buffer shared across the process. Putting a bitmap or a large list in extras throws `TransactionTooLargeException`. Pass an ID or a content URI instead and let the receiver fetch the data.

```kotlin
// Getting a result back — the modern, lifecycle-safe API
private val launcher = registerForActivityResult(
    ActivityResultContracts.StartActivityForResult()
) { result ->
    if (result.resultCode == RESULT_OK) {
        val value = result.data?.getStringExtra("KEY")
    }
}
// startActivityForResult/onActivityResult are deprecated
```

Always use namespaced extra keys (`"com.example.app.EXTRA_MESSAGE"`) — a bare `"id"` can collide when another app sends you an Intent.

## 10. What is the difference between Explicit and Implicit Intents?
- **Explicit**: Targets a specific component by its exact class name (usually used within the same app).

- **Implicit**: Declares a general action to perform, allowing the OS to find an app that can handle it (e.g., opening a web URL).

```kotlin
// Explicit Intent Example
val intent = Intent(this, SecondActivity::class.java)
intent.putExtra("EXTRA_MESSAGE", "Hello")
startActivity(intent)

// Implicit Intent Example
val intent = Intent(Intent.ACTION_VIEW)
intent.data = Uri.parse("https://google.com")
startActivity(intent)
```

**How implicit resolution works.** The system matches your Intent's **action**, **data** (URI scheme + MIME type) and **category** against every `<intent-filter>` on the device. A filter must match *all three* to be a candidate. If one app matches, it launches; if several do, the user sees a chooser; if none do, `startActivity` throws **`ActivityNotFoundException`** — which is why implicit intents need a guard:

```kotlin
val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://example.com"))
if (intent.resolveActivity(packageManager) != null) {
    startActivity(intent)
} else {
    showMessage("No browser installed")
}
```

```xml
<!-- Receiving side: without this filter, no implicit intent can reach you -->
<activity android:name=".ShareActivity" android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="text/plain" />
    </intent-filter>
</activity>
```

Note `CATEGORY_DEFAULT` — an Activity without it cannot be reached by an implicit intent at all, even if the action matches.

**Three modern constraints** worth mentioning, because they bite in real projects:

- **Package visibility (Android 11+):** `resolveActivity` returns `null` for apps you haven't declared in a `<queries>` element, even when they're installed. Without it, your check wrongly concludes "no app can handle this."
- **`android:exported` (Android 12+):** must be declared explicitly on any component with an intent filter. Set it `false` unless you intend other apps to reach it — an exported component is an attack surface.
- **Security:** never send sensitive data in an implicit intent; you don't control which app receives it. Use `Intent.createChooser()` to at least guarantee the user picks.

## 11. What is a Service?
A Service is an application component that can perform long-running operations in the background. It does not provide a user interface.

```kotlin
class AudioService : Service() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Play audio in background
        return START_STICKY
    }
    override fun onBind(intent: Intent?): IBinder? = null
}
```

**The misconception to clear up first: a Service does not run on a background thread.** It runs on the **main thread** of its process, exactly like an Activity. "Background" means "no UI," not "off the main thread." Doing network or disk work directly in `onStartCommand` will ANR your app. If you need concurrency, you create it yourself:

```kotlin
class SyncService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        scope.launch {
            doSync()
            stopSelf(startId)        // stop once the work is actually done
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        scope.cancel()               // or you leak the coroutines
        super.onDestroy()
    }
    override fun onBind(intent: Intent?): IBinder? = null
}
```

**The `onStartCommand` return value** tells the system what to do if it kills the service:

- `START_STICKY` — recreate it, with a `null` intent. For services that run until stopped, like music playback.
- `START_NOT_STICKY` — don't recreate. Correct for finite work.
- `START_REDELIVER_INTENT` — recreate *and* redeliver the last intent. For work that must complete.

**Most importantly, Services are the wrong tool for most background work today.** Since Android 8 (Oreo), background execution limits stop background services within minutes of your app leaving the foreground. The modern answers are:

- **`WorkManager`** — deferrable, guaranteed work that survives reboots and process death. The default choice for syncing, uploads, and periodic jobs.
- **Foreground Service** — only for work the user is actively aware of (music, navigation, an in-progress workout).
- **Coroutines in a `ViewModel`** — for work tied to a visible screen.

`IntentService`, the old answer for "service with a background thread," is deprecated; `WorkManager` or a `JobIntentService` replacement is the way now.

## 12. What is the difference between Started and Bound Services?
- **Started**: Launched via `startService()`. Runs indefinitely until it stops itself (`stopSelf()`) or is stopped by another component. 


- **Bound**: Bound to a component via `bindService()`. Allows client-server interaction. Destroyed when all clients unbind.


```kotlin
// Started Service Example
val serviceIntent = Intent(this, MyService::class.java)
startService(serviceIntent)

// Binding to a service
val intent = Intent(this, LocalService::class.java)
bindService(intent, connection, Context.BIND_AUTO_CREATE)
```

**The distinction is lifetime and communication**, and the two are linked:

- A **started** service is *fire-and-forget*. The caller has no channel back to it and no handle on it; the service outlives the component that started it, and only `stopSelf()` or `stopService()` ends it.
- A **bound** service is a *client-server connection*. You get an `IBinder` to call methods on, and the service is reference-counted — it dies when the last client unbinds.

**Binding gives you an object to talk to:**

```kotlin
private val connection = object : ServiceConnection {
    override fun onServiceConnected(name: ComponentName, binder: IBinder) {
        val service = (binder as LocalService.LocalBinder).getService()
        service.getProgress()        // direct method call — same process
    }
    override fun onServiceDisconnected(name: ComponentName) { /* crashed */ }
}
// Always unbind, or you leak the connection
override fun onStop() { super.onStop(); unbindService(connection) }
```

Note that `bindService` is **asynchronous** — the service is not usable until `onServiceConnected` fires.

**They are not exclusive, and this is the usual follow-up.** A music player is typically both: `startService()` so playback survives the Activity being destroyed, *plus* binding so the UI can query position and send commands. Such a service lives until it is both stopped **and** has no bound clients — satisfying only one condition is not enough, a frequent source of "my service won't die" bugs.

**`BIND_AUTO_CREATE`** means "create the service if it isn't running." Without it, binding to a non-running service simply does nothing.

Binding is also the foundation of cross-process IPC — for a remote service you return an AIDL-generated `Stub` from `onBind` instead of a simple local binder.

## 13. What is a Foreground Service?
A service that performs operations noticeable to the user (like playing music or tracking location). It must display an ongoing Notification in the status bar to keep the OS from killing it.

```kotlin
val notification = NotificationCompat.Builder(this, CHANNEL_ID)
    .setContentTitle("Playing Music")
    .build()
startForeground(1, notification)
```

**The bargain:** you tell the user you're running, and in exchange the system treats you as near-untouchable — a foreground service has roughly the same OOM priority as a visible Activity, and is exempt from background execution limits.

**The rules, which have tightened with nearly every release:**

- **You must call `startForeground()` within ~5 seconds** of the service starting, or the system raises `ForegroundServiceDidNotStartInTimeException` and kills you. Call it at the top of `onStartCommand`, before any work.
- **The notification ID cannot be 0**, and the notification cannot be dismissed while the service runs.
- **Android 8+:** start it with `startForegroundService()` (not `startService()`) from the background — that's the call that grants the 5-second window.
- **Android 9+:** requires the `FOREGROUND_SERVICE` permission (normal, auto-granted).
- **Android 10+:** foreground service **types** must be declared (`location`, `camera`, `microphone`, `mediaPlayback`, …).
- **Android 12+:** you generally **cannot start one from the background** at all — `ForegroundServiceStartNotAllowedException`. There are exemptions (a visible Activity, a high-priority FCM message, an exact alarm, a Bluetooth/companion-device trigger), but the default is denial.
- **Android 14+:** the type is mandatory in the manifest *and* in the `startForeground()` call, and each type has its own required permission and policy justification.

```kotlin
override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForeground(NOTIF_ID, buildNotification())   // first thing, always
    scope.launch { trackLocation() }
    return START_STICKY
}
```

```xml
<service
    android:name=".LocationService"
    android:foregroundServiceType="location" />
```

**The judgement call interviewers want:** a foreground service is for work the **user is actively aware of and would be upset to see interrupted** — music, navigation, a fitness recording, an in-progress call. For anything deferrable (uploading a photo, syncing overnight) use `WorkManager`; shipping a permanent notification for invisible background work is both a policy violation and a good way to get uninstalled.

## 14. What is a Broadcast Receiver?
A component that listens for system-wide or app-specific broadcast announcements (e.g., battery low, screen turned off, custom events).

```kotlin
class MyReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BATTERY_LOW) {
            println("Battery is low!")
        }
    }
}
```

**Two ways to register, with very different behaviour:**

- **Manifest-declared (static)** — the system can start your app *just* to deliver the broadcast, even if it isn't running.
- **Context-registered (dynamic)** — only receives while your component is alive; registered in code and unregistered symmetrically.

```kotlin
// Dynamic — pair these with onStart/onStop
override fun onStart() {
    super.onStart()
    registerReceiver(myReceiver, IntentFilter(Intent.ACTION_BATTERY_LOW))
}
override fun onStop() {
    super.onStop()
    unregisterReceiver(myReceiver)      // skip this and you leak
}
```

**The big restriction (Android 8+):** manifest-declared receivers **no longer work for most implicit system broadcasts**. This was done to stop a single broadcast like `CONNECTIVITY_CHANGE` waking dozens of apps at once. A handful of exempt broadcasts remain — `BOOT_COMPLETED`, `ACTION_LOCKED_BOOT_COMPLETED`, SMS, and a few others — but for the rest you must register dynamically while running, or use `WorkManager` constraints instead.

**`onReceive` runs on the main thread and must return in ~10 seconds** or you get an ANR. The process is also considered killable the moment it returns, so you cannot start a thread and expect it to finish. Two correct patterns:

```kotlin
override fun onReceive(context: Context, intent: Intent) {
    // Hand off to WorkManager — the right answer in almost all cases
    WorkManager.getInstance(context).enqueue(
        OneTimeWorkRequestBuilder<SyncWorker>().build()
    )
}
```

`goAsync()` buys you a short extension (~10s) by returning a `PendingResult` you must `finish()`, but it is a stopgap, not a substitute for `WorkManager`.

**Security:** on Android 13+ you must pass `RECEIVER_EXPORTED` or `RECEIVER_NOT_EXPORTED` when registering. Default to `NOT_EXPORTED`. For in-app events, don't use broadcasts at all — a `SharedFlow` or `LiveData` in a shared `ViewModel` is simpler, type-safe, and has no IPC cost. (`LocalBroadcastManager` is deprecated for this reason.)

## 15. What is a Content Provider?
A component that manages access to a structured set of data. It is the standard way to share data securely between different Android applications (e.g., accessing the Contacts app).

```kotlin
// Querying the Contacts Content Provider
val cursor = contentResolver.query(
    ContactsContract.Contacts.CONTENT_URI,
    null, null, null, null
)
```

The addressing scheme is `content://<authority>/<path>/<id>`, where the authority uniquely identifies the provider (conventionally your package name). The client goes through `contentResolver`, which routes over Binder to whichever app owns that authority — so the caller never has a direct dependency on the other app, and the provider sees the caller's verified UID.

**Why it's secure rather than merely abstract:** because the identity is verified by the kernel, permission checks are trustworthy. You declare `android:readPermission`/`android:writePermission`, and for narrow access you grant a **temporary per-URI permission** with `FLAG_GRANT_READ_URI_PERMISSION` — that's how sharing one photo works without exposing your whole gallery.

**Remember to close the cursor** — a leaked `Cursor` is a real leak that `StrictMode` will flag:

```kotlin
contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
    while (cursor.moveToNext()) {
        val name = cursor.getString(cursor.getColumnIndexOrThrow(DISPLAY_NAME))
    }
}   // use { } closes it even on exception
```

**You consume providers far more often than you write them** — `MediaStore`, `ContactsContract`, `CalendarContract`, and the Storage Access Framework's `DocumentsProvider`. You'd only *write* one to share data with other apps, to feed a system component (a home-screen widget, a sync adapter, search suggestions), or as a **`FileProvider`** — which is mandatory since Android 7, where passing a raw `file://` URI to another app throws `FileUriExposedException`.

**Don't use a ContentProvider as your app's internal data layer**; Room is the right tool there. Also note `android:exported` must be set explicitly on Android 12+, and reading most providers requires a runtime permission (`READ_CONTACTS` and friends).

One genuinely useful quirk: a provider's `onCreate()` runs **before** `Application.onCreate()`, which is how AndroidX App Startup and several SDKs self-initialise with no code from you.

## 16. What is a Context in Android?
`Context` is an abstract class providing global information about an application environment. It allows access to application-specific resources and classes, as well as up-calls for application-level operations (launching activities, broadcasting intents).

```kotlin
val sharedPrefs = context.getSharedPreferences("prefs", Context.MODE_PRIVATE)
val color = ContextCompat.getColor(context, R.color.black)
```

**The useful mental model: `Context` is your handle to the Android system.** Nearly anything requiring the framework needs one — resources and assets, `SharedPreferences`, databases and internal files, system services (`getSystemService`), starting Activities and Services, sending broadcasts, checking permissions, and inflating layouts.

**The class hierarchy explains the behavioural differences:**

```
Context (abstract)
├── ContextWrapper          — delegates to a wrapped base Context
│   ├── Application
│   ├── Service
│   └── ContextThemeWrapper — adds a theme
│       └── Activity        ← the only one that is themed
└── ContextImpl             — the real implementation
```

`Activity` is the only common `Context` that extends `ContextThemeWrapper`, which is why **only an Activity context carries your theme**. Inflate a layout or create a dialog with `applicationContext` and you get unthemed, visually wrong results — or a crash, since a `Dialog` requires an Activity context and will throw `WindowManager$BadTokenException` otherwise.

**The three you'll encounter:**

- **Application context** — lives for the whole process. For singletons, DI graphs, and anything outliving a screen.
- **Activity context** — themed, UI-capable, dies with the Activity. For views, dialogs, and layout inflation.
- **Service context** — process-lifetime but not themed.

**Context is the number-one source of memory leaks**, because holding the wrong one holds an entire Activity and its view tree. The rule: *use the shortest-lived context that can do the job, and never store an Activity context anywhere that outlives the Activity.*

In a Fragment, prefer `requireContext()` over `context` — it throws a clear error when the Fragment isn't attached, instead of handing you a null that fails later.

## 17. What is the difference between Application Context and Activity Context?
- **Application Context**: Tied to the lifecycle of the entire application. Use it for singletons or long-living objects to prevent memory leaks.
- **Activity Context**: Tied to the lifecycle of the specific activity. Contains theme and UI context. Used for displaying dialogs or inflating layouts.

```kotlin
// Memory Leak: Passing Activity context to a Singleton
MySingleton.init(this) // BAD

// Correct: Pass Application context
MySingleton.init(applicationContext) // GOOD
```

**Two axes distinguish them: lifetime and theming.**

- **Lifetime** — the application context lives as long as the process; an Activity context dies with its Activity (and is recreated on every rotation). Hold the latter in anything longer-lived and you leak the Activity, its views, and its bitmaps — once per rotation, until `OutOfMemoryError`.
- **Theming** — only `Activity` extends `ContextThemeWrapper`, so only it knows your theme, your `windowBackground`, and the current configuration.

**Use the application context for:** singletons and DI modules, `WorkManager`, Room and `SharedPreferences`, registering long-lived receivers, and most `getSystemService` calls.

**Use the Activity context for:** inflating layouts, constructing views, showing `Dialog`s and `PopupWindow`s, `startActivity` from a UI flow, and anything that must be theme-aware.

**The symmetric mistake is worth knowing too** — using `applicationContext` where an Activity context is required:

```kotlin
AlertDialog.Builder(applicationContext).show()
// → WindowManager$BadTokenException: a dialog needs an Activity's window token

LayoutInflater.from(applicationContext).inflate(...)
// → inflates, but silently drops your theme: wrong colours, wrong fonts
```

**And a nuance that elevates the answer:** "never hold an Activity context" is a simplification. The real rule is **never hold it longer than the Activity lives**. A view holding its Activity context is fine — they die together. The danger is only a reference from something with a *longer* lifetime: a static field, a singleton, a thread, or a queued `Handler` message.

In a `ViewModel`, never store any `Context`. If you genuinely need one, use `AndroidViewModel`, which gives you the `Application` safely.

## 18. What is `SavedInstanceState` used for?
It is a `Bundle` used to save and restore dynamic UI state (like scroll position or user input) during configuration changes (like screen rotations) or process death.

```kotlin
override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    outState.putString("USER_TEXT", editText.text.toString())
}

override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val savedText = savedInstanceState?.getString("USER_TEXT")
}
```

**The two scenarios it covers** — and the one it doesn't:

1. **Configuration change** (rotation, dark mode, locale, window resize) — the Activity is destroyed and recreated immediately.
2. **Process death** — the system kills your backgrounded app for memory, then the user returns from Recents and expects to find the screen as they left it. This is the case developers forget, because it rarely happens while debugging. (You can force it: background the app, then *Terminate Application* in Android Studio, or `adb shell am kill <package>`.)
3. **Not covered: the user pressing Back or calling `finish()`.** That's an intentional dismissal, so `onSaveInstanceState` is not called at all.

**Views save themselves — if they have an ID.** `super.onSaveInstanceState()` walks the hierarchy and lets each view persist its own state, which is why an `EditText`'s text and a `RecyclerView`'s scroll position survive rotation for free. A view with **no `android:id`** is skipped entirely — a surprisingly common cause of "my input vanishes on rotation."

**It is strictly for small, transient UI state.** The `Bundle` is parcelled through the system server and counts against the Binder transaction limit — oversized state throws `TransactionTooLargeException`. Anything large or important belongs in Room, DataStore, or on the network.

**How this fits with `ViewModel`**, which is the expected comparison:

- **`ViewModel`** survives configuration changes and holds large objects cheaply (no serialisation), but is **destroyed by process death**.
- **`SavedInstanceState`** survives *both*, but only for small parcelable values.

So they're complementary, and `SavedStateHandle` is the bridge — it gives a `ViewModel` access to the saved-state bundle, covering both cases in one place:

```kotlin
class MyViewModel(private val state: SavedStateHandle) : ViewModel() {
    var query: String
        get() = state["query"] ?: ""
        set(value) { state["query"] = value }   // survives process death
}
```

**Timing note:** `onSaveInstanceState` is called before `onStop` on Android 9+ (it was before `onPause` on older versions), and committing a Fragment transaction after it throws `IllegalStateException` — the source of the familiar "Can not perform this action after onSaveInstanceState" crash.

## 19. What is a PendingIntent?
It is a wrapper around an Intent that grants another application (like the Notification Manager or AlarmManager) the right to execute the contained Intent as if it were executed by your own app.

```kotlin
val intent = Intent(this, MainActivity::class.java)
val pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)
// Pass pendingIntent to a Notification Builder
```

**It is a token, not an intent.** The actual Intent is stored by the system; you hand out a reference. When the holder fires it, the system executes it **with your app's identity and permissions**, even if your process is dead. That's the whole point — the notification shade is a different app and has none of your permissions, yet tapping your notification can open your Activity.

**Three factory methods, matching what you want started:** `getActivity()`, `getService()` / `getForegroundService()`, and `getBroadcast()`.

**The mutability flag is mandatory since Android 12** — omitting it throws:

- **`FLAG_IMMUTABLE`** — the receiver cannot alter the Intent. **Use this by default.** A mutable PendingIntent handed to another app lets it rewrite the component and make your app perform actions on its behalf, a real privilege-escalation class of bug.
- **`FLAG_MUTABLE`** — only when something must fill in fields, e.g. direct-reply notifications or `Bubble`s.

**The equality trap, which is the classic interview point.** Two PendingIntents are "the same" if their requestCode, action, data, categories, and component match — **extras are ignored**. So this creates one PendingIntent, not three:

```kotlin
// BUG: all three notifications open item 1
for (id in listOf(1, 2, 3)) {
    val i = Intent(ctx, DetailActivity::class.java).putExtra("id", id)
    PendingIntent.getActivity(ctx, 0, i, FLAG_IMMUTABLE)   // same requestCode!
}

// FIX: distinct requestCode, plus UPDATE_CURRENT to refresh the extras
PendingIntent.getActivity(ctx, id, i, FLAG_IMMUTABLE or FLAG_UPDATE_CURRENT)
```

**The update flags:** `FLAG_UPDATE_CURRENT` (reuse the token, replace the extras — usually what you want), `FLAG_CANCEL_CURRENT` (cancel then recreate), `FLAG_NO_CREATE` (return `null` if it doesn't exist — handy for checking whether an alarm is already scheduled), `FLAG_ONE_SHOT` (usable once).

You'll meet PendingIntents in notifications, `AlarmManager`, app widgets, geofences, and `MediaSession` — anywhere the system acts on your behalf later.

## 20. How do you communicate between an Activity and a Fragment?
Historically, using interface callbacks. Today, the recommended approach is using a shared `ViewModel` scoped to the Activity, which both the Activity and Fragment can observe.

```kotlin
// Shared ViewModel approach
val viewModel: SharedViewModel by activityViewModels()
viewModel.selectedItem.observe(viewLifecycleOwner) { item ->
    // Update UI
}
```

**Why the shared ViewModel won.** `by activityViewModels()` resolves the `ViewModel` from the *Activity's* `ViewModelStore`, so the Activity and every Fragment inside it get the **same instance**. Nobody holds a reference to anybody: the Fragment doesn't know the Activity's type, and sibling Fragments can talk to each other without ever meeting. It also survives configuration changes for free, and the observers are lifecycle-aware, so there's nothing to unregister.

This replaces the old interface-callback pattern, where the Fragment cast its host (`context as OnItemSelectedListener`) — tight coupling that broke the moment you reused the Fragment in a different Activity, and a `ClassCastException` waiting to happen.

**Direction matters when choosing:**

- **Fragment → Activity, and Fragment ↔ Fragment:** shared `ViewModel`. The default.
- **Activity → Fragment, for a direct call:** `supportFragmentManager.findFragmentById(...)` works, but prefer putting the state in the shared `ViewModel` and letting the Fragment observe it.
- **One-off results between Fragments** (a picker returning a choice): the **Fragment Result API**, which works even when only one Fragment exists at a time:

```kotlin
// Receiver
setFragmentResultListener("requestKey") { _, bundle ->
    val value = bundle.getString("result")
}
// Sender
setFragmentResult("requestKey", bundleOf("result" to "picked"))
```

- **Initial data into a Fragment:** `arguments` (a `Bundle`), set via `newInstance()` or Safe Args. Never a custom constructor — the system recreates Fragments reflectively.

**One caveat on the shared ViewModel:** `LiveData` replays its last value to every new observer, so a one-time event (showing a snackbar, navigating) fires again after rotation. Use a `Channel`/`SharedFlow` for events, and reserve `LiveData`/`StateFlow` for state.

Always observe with **`viewLifecycleOwner`**, not `this` — see question 6 for why.

## 21. How do you handle permissions in Android?
At runtime, you must check if the user has granted a permission using `checkSelfPermission()`. If not, request it using `requestPermissions()`.

```kotlin
private fun checkCameraPermission() {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), CAMERA_PERMISSION_CODE)
    } else {
        // Permission already granted
        openCamera()
    }
}
```

**The model since Android 6 (API 23):** permissions are classified by risk.

- **Normal** (`INTERNET`, `VIBRATE`) — granted at install, nothing to do but declare them.
- **Dangerous** (`CAMERA`, `LOCATION`, `CONTACTS`, `RECORD_AUDIO`) — grouped, requested at runtime, revocable by the user at any time.
- **Signature** — granted only to apps signed with the same key as the declarer.

**Always declare in the manifest** regardless; the runtime request only works for a permission you've declared.

**The modern API is `registerForActivityResult`**, which replaces `requestPermissions`/`onRequestPermissionsResult` and avoids request-code bookkeeping:

```kotlin
private val requestPermission = registerForActivityResult(
    ActivityResultContracts.RequestPermission()
) { granted ->
    if (granted) openCamera() else showRationaleOrSettings()
}

private fun onCameraClicked() {
    when {
        ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED -> openCamera()

        shouldShowRequestPermissionRationale(Manifest.permission.CAMERA) ->
            showWhyWeNeedItDialog()          // user denied once; explain first

        else -> requestPermission.launch(Manifest.permission.CAMERA)
    }
}
```

Note this must be registered at **field-initialisation time**, not inside a click handler — the Activity re-registers on recreation, and a late registration throws.

**Three rules that separate a working implementation from a fragile one:**

1. **Check every single time**, never cache the result. The user can revoke a permission from Settings while your app is backgrounded, which also restarts your process.
2. **Request in context, not at launch.** Ask for the camera when the user taps the camera button — grant rates are dramatically higher, and a wall of dialogs at startup is the most common reason users bounce.
3. **Always handle denial gracefully.** Permanent denial ("Don't ask again", or two denials on Android 11+) makes future requests return immediately as denied without any dialog. Detect it — `shouldShowRequestPermissionRationale` returns `false` *and* the permission isn't granted — and offer a link to app settings rather than silently doing nothing.

**Newer behaviours to be aware of:** location is now three-tiered (coarse, fine, and `ACCESS_BACKGROUND_LOCATION`, which must be requested *separately and afterwards*, and sends the user to Settings on Android 11+); one-time grants ("Only this time") expire; unused permissions are auto-revoked for dormant apps; and Android 13 split storage into `READ_MEDIA_IMAGES`/`VIDEO`/`AUDIO` and added `POST_NOTIFICATIONS`, which must now be requested at runtime.

## 22. What is the difference between `checkSelfPermission()` and `requestPermissions()`?
`checkSelfPermission()` checks if the user has granted a permission. 
`requestPermissions()` requests the user to grant the permission.
`shouldShowRequestPermissionRationale()` returns `true` if the user has denied the permission previously and has not chosen to "Don't ask again" for it.

**The three form one decision flow**, and the point is that each answers a different question:

- **`checkSelfPermission()`** — *"Do I have it right now?"* Synchronous, cheap, returns `PERMISSION_GRANTED` or `PERMISSION_DENIED`. Call it every time before using the protected capability.
- **`requestPermissions()`** — *"Ask the user."* Asynchronous; shows the system dialog and delivers the answer to a callback. Never assume it succeeded on the next line.
- **`shouldShowRequestPermissionRationale()`** — *"Should I explain myself first?"* Returns `true` only in the middle state: previously denied, but not permanently.

**Reading the three states**, which is the real content of this question. There is no direct "is it permanently denied?" API — you infer it:

- Granted → `checkSelfPermission` returns `PERMISSION_GRANTED`.
- Never asked → not granted, and `shouldShowRequestPermissionRationale` is `false`.
- Denied once → not granted, and `shouldShowRequestPermissionRationale` is `true`. **Show your rationale, then ask again.**
- Permanently denied → not granted, and `shouldShowRequestPermissionRationale` is `false`. A request here does nothing visible; send the user to Settings instead.

The ambiguity is that "never asked" and "permanently denied" look identical. The usual fix is a flag in `SharedPreferences` recording that you have asked at least once.

```kotlin
private fun openAppSettings() {
    startActivity(Intent(
        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        Uri.fromParts("package", packageName, null)
    ))
}
```

**On rationale:** it's a UX obligation, not a technical one — explain the *benefit to the user* ("so you can scan receipts"), not the mechanism. Show it before the system dialog, inline where possible.

**On Android 11+**, two denials count as permanent: the "Don't ask again" checkbox is gone, and a second denial locks it. You effectively get two chances, which is another argument for asking in context rather than at launch.

Both `checkSelfPermission` and `requestPermissions` have `ContextCompat`/`ActivityCompat` versions that handle pre-API-23 devices safely — use those rather than the raw framework methods. And in new code, prefer the `ActivityResultContracts.RequestPermission` / `RequestMultiplePermissions` contracts over `requestPermissions()` directly.

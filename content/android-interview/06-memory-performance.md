---
title: "Memory Management & Performance Optimization"
description: "Techniques for building smooth, crash-free, and high-performance Android apps."
---

## 1. What is an Application Not Responding (ANR) error, and how do you diagnose/fix it?
An ANR occurs when the Main (UI) thread is blocked for more than 5 seconds, causing the system to show a dialog prompting the user to kill the app.
- **Diagnosis**: Analyze the `/data/anr/traces.txt` file (or Google Play Console ANR logs) to find the exact stack trace blocking the main thread.
- **Fix**: Move long-running operations (Network I/O, heavy database queries, bitmap processing) off the main thread using Kotlin Coroutines (`Dispatchers.IO` or `Dispatchers.Default`).

**The 5-second figure is only one of four thresholds**, and knowing the others signals real experience:

- **Input event** (touch or key) not handled — 5 seconds.
- **`BroadcastReceiver.onReceive`** not finished — 10 seconds foreground, 60 seconds background.
- **`Service` lifecycle method** not finished — 20 seconds foreground, 200 seconds background.
- **`ContentProvider`** remote call — 10 seconds.

The underlying condition is always the same: the main thread's `Looper` has stopped draining its message queue.

**Causes beyond "slow code on the main thread"**, which is the part people miss. It doesn't have to be *your* slow work:

- **Lock contention** — the main thread waiting on a mutex held by a background thread doing I/O.
- **Binder calls** into a busy system service, which block until the other side responds.
- **Deadlock** between two threads.
- **`SharedPreferences.apply()` flushes**, which are drained synchronously during `onPause`/`onStop`.
- **Synchronous work in `onReceive`**, which runs on the main thread.
- **Over-eager initialisation** in `Application.onCreate` — several SDKs each doing disk I/O at startup.

```kotlin
// ANR waiting to happen
val users = database.getAllUsers()      // blocking call on the main thread

// Fixed — suspends rather than blocks
lifecycleScope.launch {
    val users = withContext(Dispatchers.IO) { database.getAllUsers() }
    adapter.submitList(users)
}
```

**Diagnosing in practice**, in increasing order of realism:

1. **`StrictMode`** in debug builds catches most causes before they ship.
2. **`adb pull /data/anr/traces.txt`** after a local ANR — find the `main` thread's stack and read what it was blocked on.
3. **Play Console → Android vitals** aggregates production ANRs with stack traces, and the **ANR rate** is a Play policy threshold: exceeding it affects your store ranking.
4. **`ApplicationExitInfo`** (API 30+) lets you read the reason for your own last exit programmatically and report it to your analytics.

**One nuance worth stating:** an ANR dialog appears after the threshold, but the user perceives the app as broken long before — anything over ~200 ms feels sluggish. Treating 5 seconds as the target is the wrong frame; ANRs are the extreme tail of a responsiveness problem.

## 2. What causes Memory Leaks in Android, and what are common memory leak scenarios?
A memory leak occurs when an object is no longer needed but cannot be Garbage Collected because a reference to it is still held by a longer-lived object.
Common scenarios:
- A singleton or static variable holding a reference to an `Activity` or `View` context.
- Unregistered listeners/callbacks (e.g., forgetting to unregister a `BroadcastReceiver` or LiveData observer).
- Inner classes (like legacy `AsyncTask` or `Handler`) retaining an implicit reference to the outer Activity.

**Why Android leaks hurt more than ordinary JVM leaks.** An `Activity` transitively holds its entire view hierarchy, its bitmaps, and its `Context` — often several megabytes. Worse, configuration changes destroy and recreate Activities, so a single leak path accumulates **a new leaked Activity on every rotation** until you hit `OutOfMemoryError`.

**The full catalogue**, with what they have in common — something long-lived holding something short-lived:

- **Non-static inner classes and lambdas.** An inner class holds an implicit `this$0` reference to its outer Activity. Harmless if short-lived; a leak if it's a long-running callback.
- **`Handler.postDelayed`.** A queued `Message` holds its `Handler`, which holds the Activity. A 60-second delayed message pins the Activity for 60 seconds. Clear it with `handler.removeCallbacksAndMessages(null)` in `onDestroy`.
- **Static fields.** `companion object { var activity: Activity? }` — a static reference lives as long as the class loader, i.e. the whole process.
- **Unregistered listeners.** `BroadcastReceiver`s, `SensorManager`, `LocationManager`, `EventBus`, and third-party SDK callbacks registered in `onCreate`/`onStart` and never removed.
- **Singletons holding an Activity `Context`.** Pass `applicationContext` to anything process-scoped.
- **Threads and unscoped coroutines.** A raw `Thread` or `GlobalScope.launch` capturing a view keeps it alive. Use `lifecycleScope`/`viewModelScope`.
- **Fragment view bindings** not nulled in `onDestroyView` — the Fragment instance outlives its view.
- **`LiveData` observed with `this` instead of `viewLifecycleOwner`** in a Fragment.
- **A `ViewModel` holding a `Context`, `View`, or `NavController`** — it outlives all of them.

```kotlin
// Leaky: the lambda captures the Activity, and the message is queued for 60s
handler.postDelayed({ textView.text = "done" }, 60_000)

// Safe: cancelled automatically when the lifecycle ends
lifecycleScope.launch {
    delay(60_000)
    textView.text = "done"
}
```

**The single rule that covers all of these:** *never let an object with a longer lifetime hold a reference to one with a shorter lifetime.* Every item above is an instance of violating it.

**Note the symptom, too:** leaks rarely crash immediately. They show up as rising memory over a session, more frequent GC (and therefore jank), and an eventual OOM that looks random. That's why you hunt them with tooling rather than waiting for crashes.

## 3. How do you use LeakCanary to detect memory leaks?
LeakCanary is a powerful third-party library by Square. Once added to your debug dependencies, it automatically hooks into the Android lifecycle.
When an Activity or Fragment is destroyed, LeakCanary expects it to be garbage collected within a few seconds. If it isn't, it dumps the Java Heap into an `.hprof` file, analyzes it, and sends a notification showing the exact chain of references (the "leak trace") preventing the garbage collection.

**Setup is a single dependency** — no initialisation code, because it self-installs through a `ContentProvider` (which runs before `Application.onCreate`):

```groovy
debugImplementation 'com.squareup.leakcanary:leakcanary-android:2.14'
```

**`debugImplementation` matters.** Never ship it in release: it dumps the heap, which freezes the app for seconds and writes large files.

**How the detection works**, which is the real content of the question:

1. **Watch.** It holds a `WeakReference` to each destroyed Activity, Fragment, Fragment view, `ViewModel`, and `Service`.
2. **Wait and force GC.** After a delay (~5 seconds) it triggers garbage collection.
3. **Check.** If the `WeakReference` has not been cleared, the object is still strongly reachable — a leak candidate.
4. **Dump and analyse.** It writes an `.hprof` heap dump and uses **Shark** to compute the **shortest strong reference path** from a GC root to the leaked object.
5. **Report.** A notification shows the leak trace, with the suspicious references highlighted.

**Reading a leak trace** is the skill worth demonstrating. It reads top-down from a GC root to the leaked object, and LeakCanary marks each link as `UNKNOWN`, `NO` (definitely not the cause), or `YES` (definitely leaking):

```
┬─── GC Root: static field
├─ com.example.MySingleton class
│    ↓ static MySingleton.instance
├─ com.example.MySingleton instance
│    ↓ MySingleton.context                    ← the culprit
╰→ com.example.MainActivity instance
     Leaking: YES (Activity#mDestroyed is true)
```

The fix is always at the **last link marked `UNKNOWN` before the first `YES`** — that's where a long-lived object grabbed a short-lived one. Here, `MySingleton.context`.

**Watching your own objects** extends it beyond the built-in types:

```kotlin
AppWatcher.objectWatcher.expectWeaklyReachable(myObject, "MyPresenter was dismissed")
```

**Its limits**, worth acknowledging: it only finds leaks of *watched* objects, it's a debug-only tool so it won't catch what only happens on user devices, and it reports reachability — deciding whether a retained object is a genuine bug is still your call. For heap analysis beyond leaks (what's using memory, not just what's leaked), Android Studio's Memory Profiler is the complement.

## 4. What is Garbage Collection in ART, and how can excessive allocations cause UI jank?
Garbage Collection (GC) automatically frees up memory by destroying unreferenced objects. While ART's GC is highly optimized and concurrent, creating thousands of temporary objects in a short time (e.g., inside an `onDraw` method or a tight loop) triggers frequent GC events. These events pause the application threads momentarily, causing dropped frames and a stuttering UI ("jank").

**ART versus the old Dalvik GC** is useful context. Dalvik used a stop-the-world mark-and-sweep that could pause the app for 50–100 ms — easily several dropped frames. ART introduced a **concurrent, mostly-copying generational collector** whose pauses are typically well under a millisecond. So the modern problem is not one long pause; it's **many short pauses plus the allocation cost itself**.

**Why allocation in `onDraw` is specifically bad.** `onDraw` can run 60–120 times a second, per view. Allocating there means:

1. **Allocation cost** on every frame, which is not free even without GC.
2. **Rapid young-generation filling**, triggering frequent minor GCs.
3. **Cache pressure** — new objects evict useful data from CPU caches.

Together these turn a 10 ms frame into a 20 ms frame, and the user sees stutter.

```kotlin
// Bad: three allocations per frame, 60+ times a second
override fun onDraw(canvas: Canvas) {
    val paint = Paint().apply { color = Color.RED }
    val rect = RectF(0f, 0f, width.toFloat(), height.toFloat())
    canvas.drawRoundRect(rect, 8f, 8f, paint)
}

// Good: allocate once, reuse forever
private val paint = Paint().apply { color = Color.RED }
private val rect = RectF()

override fun onSizeChanged(w: Int, h: Int, oldW: Int, oldH: Int) {
    rect.set(0f, 0f, w.toFloat(), h.toFloat())      // geometry when size changes
}

override fun onDraw(canvas: Canvas) {
    canvas.drawRoundRect(rect, 8f, 8f, paint)       // zero allocations
}
```

**Hidden allocations are the ones that catch people out:** autoboxing (`Map<String, Int>` boxes every value), string concatenation in a loop, `List.map`/`filter` chains creating intermediate lists, varargs, iterator objects from `for (x in list)` on an interface type, and lambdas that capture variables (a capturing lambda allocates; a non-capturing one does not).

**How to find it:** the **Memory Profiler's allocation tracking** shows allocations per call site while you scroll or animate — the fastest way to find the hot allocator. `Debug.startAllocCounting()` and the "GC" column in the profiler timeline also help.

**The judgement to voice:** this is a *hot-path* concern, not a general one. Micro-optimising allocation in a one-off setup function is wasted effort and worse code. Optimise `onDraw`, `onBindViewHolder`, animation callbacks, and tight loops — and leave the rest readable.

## 5. What are `WeakReference` and `SoftReference`, and when should you use them?
- **WeakReference**: An object wrapped in a WeakReference will be aggressively garbage collected as soon as the GC runs if there are no strong references to it. Useful for caching views or contexts in helper classes to prevent strict memory leaks.
- **SoftReference**: Similar, but the GC will only clear these if the system is absolutely desperate for memory (getting close to an OutOfMemoryError). Rarely used today, as modern LRU caches are preferred.

**The four reference strengths**, in order:

- **Strong** — the normal case. Never collected while reachable.
- **Soft** — collected only when memory is tight, just before OOM.
- **Weak** — collected at the next GC, if nothing strong points to it.
- **Phantom** — already finalizable; used for post-mortem cleanup. Rare in app code.

```kotlin
class MyHandler(activity: Activity) : Handler(Looper.getMainLooper()) {
    private val ref = WeakReference(activity)

    override fun handleMessage(msg: Message) {
        val activity = ref.get() ?: return      // may legitimately be null
        activity.updateUi()
    }
}
```

**The mandatory discipline: always null-check `get()`.** The referent can be collected between two calls, so caching the result of `get()` in a local and then using it is correct; calling `get()` twice and assuming both succeed is not.

**The important caveat, and the thing a strong candidate says:** `WeakReference` is usually **treating the symptom, not the disease**. If you're wrapping an Activity in a `WeakReference` to stop a leak, the real problem is that something long-lived is holding UI state at all. The structural fixes — a lifecycle-scoped coroutine, unregistering the listener, moving state to a `ViewModel` — are better, because they also stop the work from running pointlessly, not just stop it leaking.

**Where weak references are legitimately right:**

- **Listener registries** where the owner shouldn't keep subscribers alive.
- **Caches keyed by an object whose lifetime you don't control** — `WeakHashMap`.
- **Library and framework code** that must hold a callback without dictating its lifetime.

**Why `SoftReference` is discouraged on Android specifically:** Google's own guidance is not to use it for caching. ART's collection behaviour makes clearing unpredictable, soft references can be cleared all at once (destroying the cache you were relying on), and they delay GC work. **`LruCache` is the correct tool** — it gives you an explicit, bounded size you control:

```kotlin
private val cache = object : LruCache<String, Bitmap>(maxKb) {
    override fun sizeOf(key: String, value: Bitmap) = value.byteCount / 1024
}
```

In practice, use `LruCache` for memory caches, `WeakReference` sparingly for genuine listener/registry cases, and fix lifecycles properly for everything else.

## 6. What is Android Profiler (CPU, Memory, Network, Energy), and how do you use it?
The Android Profiler is a suite of tools in Android Studio used to inspect real-time app performance.
- **CPU Profiler**: Tracks method execution times to find bottlenecks causing UI lag.
- **Memory Profiler**: Tracks memory allocation. You can capture a heap dump to analyze object sizes and find leaks.
- **Network Profiler**: Monitors network request times, payload sizes, and connection frequency.

**The CPU Profiler has several recording modes**, and picking the right one matters more than people expect:

- **System Trace** — the most useful for jank. It shows frame-by-frame rendering with the actual Choreographer timeline, so you can see which frames exceeded their budget and what the main thread was doing during them. Low overhead.
- **Sample Java/Kotlin Methods** — periodically samples stacks. Low overhead, good for finding *where* time goes, but it misses short-lived methods.
- **Trace Java/Kotlin Methods** — instruments every method entry and exit. Complete, but the overhead is so high it **distorts the results**, which is a classic trap: you optimise something that was only slow because you were measuring it.
- **Sample/Trace C/C++ Functions** — for NDK code.

**The Memory Profiler** does three distinct jobs:

1. **The timeline** — watch total memory while you use the app. A sawtooth that trends upward across repeated navigations is the signature of a leak.
2. **Allocation tracking** — record while scrolling to find which call sites allocate in hot paths (see question 4).
3. **Heap dump** — a snapshot of every live object, grouped by class, with **shallow** and **retained** size (question 11). This is where you answer "what is actually using my memory?"

**The leak-hunting workflow** worth being able to describe:

```
1. Open the screen you suspect
2. Navigate away (so it should be destroyed)
3. Repeat 3–5 times, or rotate repeatedly
4. Force GC (the bin icon)
5. Capture a heap dump
6. Filter by your Activity's class name
→ More than 1 instance = leak. Click it and read "References" for the path.
```

**The Network Profiler** shows request timing, sizes, and headers — useful for spotting duplicate requests, missing caching, and oversized payloads. Note it only sees traffic through OkHttp/`HttpURLConnection`; native or third-party stacks are invisible.

**Two practical cautions.** First, **profile a release-like build** — debug builds are unoptimised, have debugging enabled, and bypass R8, so timings mislead. Use a `profileable` build or a release build with `debuggable false` and profiling enabled. Second, **profile on a low-end device**, not a flagship: the devices your users actually struggle on are the ones worth measuring.

For production rather than local measurement, the complements are **JankStats**, **Macrobenchmark**, and **Firebase Performance Monitoring**.

## 7. How do you optimize app startup time (Baseline Profiles, App Startup library)?
- **App Startup Library**: Replaces multiple slow `ContentProvider` initializations with a single, highly optimized initialization pipeline on boot.
- **Baseline Profiles**: A list of classes and methods shipped with your APK. During installation, Android pre-compiles these exact paths using Ahead-Of-Time (AOT) compilation, dramatically speeding up the critical startup rendering path on the user's first launch.

**First, know the three kinds of startup**, because the fixes differ:

- **Cold start** — the process doesn't exist. Android forks Zygote, creates the `Application`, then the Activity. The slowest, and the one Play measures.
- **Warm start** — the process is alive but the Activity was destroyed. Skips process creation.
- **Hot start** — the Activity is still in memory; just bring it forward.

Play's vitals thresholds are roughly **5 s cold / 2 s warm / 1.5 s hot** before a startup is flagged as "excessive."

**Baseline Profiles are the single highest-leverage fix.** Android normally compiles your app **JIT** — interpreting bytecode and compiling hot paths as it observes them. That means the *first* launches are the slowest, exactly when users judge your app. A Baseline Profile ships a list of critical classes and methods that are **AOT-compiled at install time**, typically giving **20–30% faster startup** and smoother first-run scrolling. You generate it with the Macrobenchmark library rather than writing it by hand:

```kotlin
@Test
fun generate() = baselineProfileRule.collect(packageName = "com.example.app") {
    startActivityAndWait()
    device.findObject(By.res("feed")).fling(Direction.DOWN)    // exercise key journeys
}
```

**App Startup** fixes a different problem: libraries each adding their own `ContentProvider` to self-initialise. Each provider costs process-creation time, and they can't express ordering. App Startup consolidates them into one provider with declared dependencies:

```kotlin
class AnalyticsInitializer : Initializer<Analytics> {
    override fun create(context: Context): Analytics = Analytics.init(context)
    override fun dependencies() = listOf(LoggerInitializer::class.java)
}
```

**The other levers, roughly in order of impact:**

- **Do less in `Application.onCreate`.** It is on the critical path for every cold start. Defer SDK initialisation until first use, or move it off the main thread.
- **Avoid disk I/O and `SharedPreferences` reads at startup.**
- **Lazy-initialise** anything not needed for the first frame.
- **Simplify the first screen's layout** — fewer views, flatter hierarchy.
- **Use a proper splash screen** via the `SplashScreen` API (`postponeEnterTransition` if you must wait for data) rather than a fake splash Activity, which adds a whole extra Activity launch.
- **Avoid a `windowBackground` that's an expensive drawable.**

**Measure rather than guess:** `adb shell am start -W` gives you `TotalTime`, Macrobenchmark gives reproducible numbers with `StartupMode.COLD`, and Play Console vitals shows what real users experience across the device distribution.

## 8. What is `StrictMode`, and how does it help identify disk/network operations on the main thread?
`StrictMode` is a developer tool that detects things you might be doing by accident, such as disk reads/writes or network requests on the application's main thread. If configured in your `Application.onCreate()`, it can flash the screen, print a logcat warning, or explicitly crash the app during development when it detects these violations, ensuring you catch them before release.

**It has two independent policies**, which is the structure to know:

- **`ThreadPolicy`** (per thread, normally the main one): `detectDiskReads`, `detectDiskWrites`, `detectNetwork`, `detectCustomSlowCalls`, `detectResourceMismatches`, `detectUnbufferedIo`.
- **`VmPolicy`** (whole process): `detectActivityLeaks`, `detectLeakedClosableObjects` (a `Cursor` or stream you forgot to close), `detectLeakedSqlLiteObjects`, `detectLeakedRegistrationObjects` (an unregistered receiver), `detectFileUriExposure`, `detectCleartextNetwork`, `detectNonSdkApiUsage`.

**Penalties** are set per policy: `penaltyLog()`, `penaltyFlashScreen()`, `penaltyDialog()`, `penaltyDeath()`, `penaltyDeathOnNetwork()`.

```kotlin
override fun onCreate() {
    super.onCreate()
    if (BuildConfig.DEBUG) {
        StrictMode.setThreadPolicy(
            StrictMode.ThreadPolicy.Builder().detectAll().penaltyLog().build()
        )
        StrictMode.setVmPolicy(
            StrictMode.VmPolicy.Builder().detectAll().penaltyLog().build()
        )
    }
}
```

**The non-negotiable rule: guard with `BuildConfig.DEBUG`.** `penaltyDeath()` in a release build turns a cosmetic violation into a crash for real users.

**Why it is specifically good at catching ANR causes.** Main-thread disk and network work usually doesn't *look* slow in development: the emulator has a fast SSD, the test device is new, and the file is warm in the page cache. The same code on a three-year-old phone with a full filesystem takes 40× longer. StrictMode flags the *pattern* regardless of how fast it happened to be, which is exactly what you want — it catches the latent ANR, not the one you got lucky on.

**How to adopt it in an existing codebase** — a good practical point, since `detectAll()` on a mature app produces hundreds of violations at once:

1. Start with `penaltyLog()` only, and triage the log.
2. Fix genuine issues; accept some (a small, one-time read at startup may be fine).
3. Suppress the accepted ones with `StrictMode.allowThreadDiskReads { }` around that specific call, which documents the decision in code.
4. Then escalate to `penaltyDeath()` so new violations fail loudly.

**A violation is a warning, not a verdict** — the value is that you see it and decide deliberately, rather than discovering it through a production ANR report.

## 9. How do image loading libraries like Coil or Glide optimize bitmap memory and caching?
Image libraries prevent `OutOfMemoryError`s by:
- **Downsampling**: They never load a 4K image into memory if the target `ImageView` is only 200x200 pixels. They calculate the bounds and load a scaled-down bitmap.
- **Memory Caching**: They maintain a strict LRU (Least Recently Used) cache in RAM to instantly serve recently viewed images.
- **Disk Caching**: They save fetched images to local storage so subsequent app launches don't require network calls.

**How downsampling actually works** is worth being able to explain, because it's the single biggest memory saving. You decode twice:

```kotlin
// Pass 1: read dimensions only — allocates nothing
val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
BitmapFactory.decodeFile(path, opts)

// Compute a power-of-two sample size for the target view
opts.inSampleSize = calculateInSampleSize(opts, targetW, targetH)
opts.inJustDecodeBounds = false

// Pass 2: decode scaled down
val bitmap = BitmapFactory.decodeFile(path, opts)
```

`inSampleSize = 4` means each dimension is divided by 4, so memory drops by **16×**. A 4000×3000 photo at 48 MB becomes 3 MB.

**The other optimisations these libraries do for you:**

- **Bitmap pooling / `inBitmap` reuse** — reusing an existing bitmap's memory instead of allocating a new one, which dramatically reduces GC churn during scrolling.
- **`RGB_565` config** where alpha isn't needed — 2 bytes per pixel instead of 4, halving memory.
- **Request deduplication** — two views asking for the same URL produce one network call.
- **Automatic cancellation** — when the `ImageView` is detached or recycled, the in-flight request is cancelled. This alone fixes the classic "wrong image flashes in a recycled row" bug.
- **Lifecycle awareness** — Coil and Glide both tie requests to the lifecycle, so navigating away stops the work.
- **Transformations** (circle crop, blur, rounded corners) applied during decode rather than at draw time.

```kotlin
// Coil — Kotlin-first, coroutine-based
imageView.load(url) {
    crossfade(true)
    placeholder(R.drawable.placeholder)
    error(R.drawable.error)
    size(200, 200)
}

// Compose
AsyncImage(model = url, contentDescription = null, modifier = Modifier.size(100.dp))
```

**Coil vs. Glide**, if asked: Coil is Kotlin-first, coroutine-based, built on OkHttp, noticeably smaller, and integrates naturally with Compose. Glide is older, Java-based, has broader format support (notably GIF and video frames), and a very mature bitmap pool. Either is fine; Coil is the natural default for a modern Kotlin/Compose app.

**The real argument for using one at all:** everything above is a correctness problem as much as a performance one. Hand-rolled image loading in a `RecyclerView` almost always has the recycled-view race and leaks the `ImageView` through a callback. These libraries have solved those properly.

## 10. What causes frame drops and UI stuttering, and how do you debug rendering performance?
Android attempts to draw a frame every 16.6ms (to achieve 60fps). If the Main Thread takes longer than 16ms to measure, layout, and draw the UI, a frame is dropped.
Causes include complex nested `LinearLayout`s (overdraw), heavy processing in `onDraw`, or blocking the main thread.
You debug this using the **GPU Overdraw** developer option (colors the screen to show how many times a pixel was redrawn) and the **CPU Profiler** (System Trace) to measure exact UI rendering times.

**The budget is tighter on modern devices.** 16.6 ms assumes 60 Hz; a 90 Hz display gives you **11.1 ms** and 120 Hz gives you **8.3 ms**. And the budget covers *everything* on the main thread in that window, not just drawing — a 10 ms JSON parse eats most of a 120 Hz frame on its own.

**The causes, grouped by rendering phase:**

- **Measure/layout** — deeply nested hierarchies; `LinearLayout` with `layout_weight` (measures children twice, and nesting multiplies that); `RelativeLayout` (two passes); calling `requestLayout()` during scroll or animation.
- **Draw** — overdraw (painting the same pixel several times); allocations in `onDraw`; expensive `Canvas` operations; large unclipped shadows; `Bitmap` scaling at draw time.
- **Main-thread work that isn't rendering at all** — I/O, parsing, a slow `onBindViewHolder`, a synchronous `SharedPreferences` read, GC pauses triggered by allocation elsewhere.

**Fixing overdraw** specifically: remove the window background when your layout covers it (`<item name="android:windowBackground">@null</item>`), delete redundant backgrounds on nested containers, and use `canvas.clipRect` in custom views. The developer option colours pixels blue (1×), green (2×), pink (3×), red (4×+) — some blue and green is normal; large red areas are the problem.

**The debugging toolkit, in the order you'd reach for it:**

1. **Developer options → Profile GPU Rendering** — an on-screen bar chart with a green line at the frame budget. Instant, no setup.
2. **GPU Overdraw** — as above.
3. **Layout Inspector** — check hierarchy depth, and in Compose see **recomposition counts** (a component recomposing hundreds of times a second is the Compose equivalent of a layout problem).
4. **CPU Profiler → System Trace** — the definitive tool. Shows each frame, which ones missed the deadline, and exactly what the main thread was doing during them.
5. **Perfetto** — the deeper version of the same, for system-wide traces.
6. **Macrobenchmark + `FrameTimingMetric`** — reproducible, automatable jank measurement in CI.
7. **JankStats** — production measurement on real devices (question 14).

**General fixes:** flatten layouts with `ConstraintLayout`, use `RecyclerView` with stable IDs and `DiffUtil`, move work out of `onBindViewHolder`, avoid nested scrolling containers, use `ViewStub` for rarely-shown views, and profile on a **low-end device** — jank is almost always invisible on a flagship.

## 11. What is the difference between a shallow heap and a retained heap?
- **Shallow Heap**: The amount of memory directly occupied by an object itself (e.g., its primitive fields).
- **Retained Heap**: The total amount of memory that would be freed if this specific object were garbage collected. It includes the shallow heap of the object *plus* the shallow heaps of all other objects that are kept alive strictly by this object.

**The word doing the work is "strictly."** Retained size counts only objects reachable *exclusively* through this one. If another live object also references a child, that child is not retained by you — freeing you wouldn't free it.

```
    A ──▶ B ──▶ C
    │
    └───▶ D ◀─── E (another root)

A's shallow  = just A's own fields
A's retained = A + B + C      (D is excluded: E keeps it alive anyway)
```

**Why this is the number that matters.** An `Activity`'s shallow heap is tiny — a handful of fields, maybe 100 bytes. Its retained heap is its whole view hierarchy, adapters, and bitmaps: several megabytes. Sorting a heap dump by **shallow** size tells you almost nothing useful (you'll see `byte[]` and `String` at the top); sorting by **retained** size tells you which objects are actually holding your memory hostage.

**Using it in practice**, in Android Studio's Memory Profiler heap dump:

```
1. Capture a heap dump
2. Sort by "Retained Size" descending
3. Look at the top entries — these are what you'd gain by fixing
4. Select one → "References" tab → find the path from a GC root
```

An Activity instance appearing with a large retained size *after* it should have been destroyed is a leak, and the reference path tells you who's holding it.

**Related terms that often come in the same question:**

- **Dominator** — object X dominates Y if every path from a GC root to Y passes through X. The dominator tree is how retained sizes are computed, and it's what LeakCanary's "shortest path" is derived from.
- **Deep size** — sometimes used loosely for "everything reachable," which is *not* the same as retained; it double-counts shared objects.
- **GC root** — where reachability starts: static fields, active thread stacks, JNI references, and live threads.

**The practical takeaway:** when hunting a memory problem, ask "what has large retained size that shouldn't exist any more?" rather than "what is the biggest object?" The first finds leaks and over-caching; the second finds your bitmap cache doing exactly its job.

## 12. How do you optimize `RecyclerView` scrolling performance with heavy image loading?
- Use a dedicated library like Glide or Coil to handle asynchronous loading and LRU caching.
- Cancel pending image loads when a `ViewHolder` is recycled using `onViewRecycled`.
- Ensure images are downsampled to the exact dimensions of the `ImageView`.
- Optimize the item layout to avoid complex nested views (use `ConstraintLayout`).

**The governing principle: `onBindViewHolder` runs on the main thread, during scrolling, for every item that scrolls into view.** Everything else follows from keeping it cheap. A rough budget is well under a millisecond.

```kotlin
// Bad: formatting, parsing, and a database call per bind
override fun onBindViewHolder(holder: VH, position: Int) {
    val item = items[position]
    holder.date.text = SimpleDateFormat("dd MMM").format(item.timestamp)   // allocates
    holder.badge.isVisible = db.hasUnread(item.id)                          // I/O!
}

// Good: pre-compute in the ViewModel, bind only
override fun onBindViewHolder(holder: VH, position: Int) {
    val item = items[position]        // already a formatted UI model
    holder.date.text = item.formattedDate
    holder.badge.isVisible = item.hasUnread
}
```

**The full optimisation list, in rough order of impact:**

1. **Use `ListAdapter` with `DiffUtil`** instead of `notifyDataSetChanged()`. The latter rebinds everything and kills animations; `DiffUtil` computes a minimal diff on a background thread.
2. **`setHasStableIds(true)`** plus a real `getItemId()`, so the adapter can track items across updates.
3. **An image library with automatic cancellation.** Coil and Glide cancel on view detach, which fixes both the wasted work and the wrong-image-flash bug.
4. **Flatten the item layout.** One `ConstraintLayout` beats three nested `LinearLayout`s. Item layouts are inflated and measured repeatedly, so depth costs more here than anywhere else.
5. **`setRecycledViewPool`** shared between RecyclerViews showing the same view types (e.g. in a `ViewPager2`).
6. **`setItemViewCacheSize`** raised slightly for smoother short scroll-backs.
7. **Fixed size** — `recyclerView.setHasFixedSize(true)` when item changes don't change the RecyclerView's own size, which skips a layout pass.
8. **Avoid nested RecyclerViews** where you can; if you must, set `setInitialPrefetchItemCount` on the inner `LinearLayoutManager`.
9. **Prefetching** is on by default — don't disable it.

```kotlin
class UserAdapter : ListAdapter<User, VH>(DIFF) {
    override fun onViewRecycled(holder: VH) {
        super.onViewRecycled(holder)
        holder.image.dispose()       // Coil; Glide: Glide.with(holder.image).clear(...)
    }
    companion object {
        val DIFF = object : DiffUtil.ItemCallback<User>() {
            override fun areItemsTheSame(a: User, b: User) = a.id == b.id
            override fun areContentsTheSame(a: User, b: User) = a == b
        }
    }
}
```

**`areItemsTheSame` compares identity, `areContentsTheSame` compares content** — swapping these is a very common bug that produces either no animations or wrong ones.

**For long or infinite lists, use Paging 3**, which handles windowing and memory eviction properly rather than keeping 10,000 items in a list.

## 13. What are `Bitmaps` and why do they cause so many `OutOfMemoryError`s?
Bitmaps are uncompressed arrays of pixels representing an image. An ARGB_8888 bitmap uses 4 bytes per pixel. A seemingly small 4000x3000 photo from a camera takes a massive 48MB of RAM when loaded entirely into memory. If not properly downsampled before loading, they instantly exhaust the application's Java heap space.

**The arithmetic to be able to do on the spot:** `width × height × bytesPerPixel`.

- `ARGB_8888` — 4 bytes/px. The default; full colour plus alpha.
- `RGB_565` — 2 bytes/px. No alpha, slight quality loss. Halves memory.
- `ALPHA_8` — 1 byte/px. Masks only.
- `HARDWARE` (API 26+) — stored in **graphics memory**, not the Java heap. Excellent for display, but you cannot read its pixels.

So a 4000×3000 photo at `ARGB_8888` is 4000 × 3000 × 4 = **48 MB**. A typical app heap limit is 128–512 MB depending on device, and you only need a handful of those to OOM.

**The crucial mismatch:** a 3 MB JPEG on disk is *compressed*. Decoded, it's 48 MB. People reason about the file size and are shocked by the memory. The compression ratio is the trap.

**The fixes, in order:**

1. **Downsample at decode time** with `inJustDecodeBounds` + `inSampleSize` (see question 9). Never decode full-resolution for a thumbnail.
2. **Use `RGB_565`** for opaque images where quality permits — instant 50% saving.
3. **Use an image library.** Coil and Glide do all of this correctly, including bitmap pooling.
4. **Recycle explicitly only on pre-Lollipop**; on modern ART, bitmap memory is on the Java heap and collected normally, so manual `recycle()` is usually unnecessary and risks `Canvas: trying to use a recycled bitmap`.
5. **`BitmapRegionDecoder`** for very large images where you only need part — maps, documents, panoramas.
6. **`android:largeHeap="true"`** exists but is a last resort and often a smell: it increases the limit without fixing the cause, and GC pauses get longer.

**History worth mentioning**, since it explains a lot of old advice: before Android 3.0, bitmap pixel data lived in *native* memory with the object on the Java heap, which made leaks invisible to the heap dump and made `recycle()` essential. From 3.0 the data moved onto the Java heap; from API 26, `HARDWARE` bitmaps moved display bitmaps out again, into graphics memory. So "always call recycle()" is advice from a different era.

**For Compose**, `AsyncImage`/Coil handles all of this; passing a raw full-size `ImageBitmap` has exactly the same cost.

## 14. How do you measure rendering performance using `JankStats`?
`JankStats` is a Jetpack library used to track and analyze UI performance issues in production apps. Unlike the local Android Profiler, `JankStats` hooks into the system's frame rendering callbacks to detect dropped frames (jank). You can log this data to your analytics backend to identify which specific screens are lagging on user devices.

**The gap it fills: local profiling tells you about *your* device.** Your flagship test phone renders everything smoothly; the problem is the three-year-old mid-range device your users actually have, on a screen you never tested, with their data. JankStats measures real frames on real devices in production.

**Setup is per-window**, and the key feature is **state tracking**, which is what makes the data actionable:

```kotlin
val jankStats = JankStats.createAndTrack(window) { frameData ->
    if (frameData.isJank) {
        analytics.log(
            "jank",
            mapOf(
                "duration_ms" to frameData.frameDurationUiNanos / 1_000_000,
                "states" to frameData.states.joinToString { "${it.key}=${it.value}" }
            )
        )
    }
}

// Tell JankStats what the user was doing — this is the valuable part
jankStats.state.putState("screen", "FeedScreen")
jankStats.state.putState("action", "scrolling")
```

Without states, you get "5% of frames janked" — true but useless. With them, you get "frames jank 30% of the time while scrolling the feed with images loading," which points at a fix.

**Pause it when the window isn't visible**, or you record meaningless data:

```kotlin
override fun onResume() { super.onResume(); jankStats.isTrackingEnabled = true }
override fun onPause() { super.onPause(); jankStats.isTrackingEnabled = false }
```

**How it works underneath:** it uses `OnFrameMetricsAvailableListener` on API 24+ and falls back to a draw listener on older versions, comparing each frame's duration against the current refresh rate — so it adapts correctly to 90 Hz and 120 Hz displays rather than assuming 16.6 ms.

**Where it fits among the tools**, which is the comparison worth drawing:

- **Android Profiler** — deep, local, interactive. For diagnosing a problem you can reproduce.
- **Macrobenchmark** — reproducible, automated, in CI. For catching regressions before release.
- **JankStats** — aggregate, in production, across the real device distribution. For *finding* which problems to diagnose.
- **Play Console vitals** — the coarse version Google uses to rank you; frozen frames and slow sessions.

Use JankStats to decide **where** to look, then the profiler to work out **why**. Sample it (not every user) to keep analytics volume reasonable.

## 15. What is `R8`'s impact on app performance besides size reduction?
Beyond shrinking the APK, R8 performs aggressive byte-code optimization:
- **Inlining**: It moves the code of small functions directly into the calling site, saving the overhead of a method call.
- **Dead Code Elimination**: Removes `if/else` blocks that it can prove will never execute.
- **Class Merging**: Merges interfaces with a single implementation directly into the class, reducing the total class count and speeding up class loading in ART.

**Why fewer classes and methods helps beyond disk size** — this is the part worth spelling out:

- **Class loading at startup.** ART loads and verifies each class on first use. Fewer classes means less verification work during cold start, which is directly on the critical path.
- **The 64K method reference limit.** Staying under it avoids multidex entirely; with legacy multidex (pre-API 21) the secondary-dex load was a measurable startup cost.
- **Better locality.** A smaller DEX means fewer pages to fault in and better instruction cache behaviour.

**The optimisations R8 performs, in a bit more detail:**

- **Inlining** — removes call overhead, and more importantly *enables further optimisations* by exposing constants across the call boundary.
- **Dead code elimination** — including whole branches behind a constant, which is how `if (BuildConfig.DEBUG) { ... }` blocks vanish entirely from release builds.
- **Class and method merging** — collapsing single-implementation interfaces and small wrapper classes.
- **Devirtualisation** — converting a virtual call to a direct one when only one implementation exists, which is a real win in Kotlin code full of interfaces.
- **Enum unboxing** — replacing simple enums with integers, removing the object allocation per constant.
- **Constant propagation and value folding.**
- **Kotlin-specific cleanups** — removing null-check intrinsics where nullability is already proven, and stripping unused Kotlin metadata.

```groovy
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true      // resource shrinking — needs minifyEnabled
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                      'proguard-rules.pro'
    }
}
```

Note `proguard-android-optimize.txt` rather than the plain file — the default disables optimisations.

**The cost, which you should raise unprompted:** obfuscated stack traces. Without `mapping.txt` uploaded to Play Console or Crashlytics, production crashes are unreadable. Keep the line-number attributes:

```proguard
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
```

**And the risk:** R8 reasons about static reachability, so anything reached by **reflection** — JSON models, custom views from XML, JNI methods, `Parcelable` CREATORs — can be stripped or renamed, producing bugs that **only appear in release builds**. This is why you must test a release build before shipping, not just debug. Pair R8 with **Baseline Profiles** for the biggest combined startup win.

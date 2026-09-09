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

## 2. Explain the Activity Lifecycle.
The lifecycle consists of standard state transitions: `onCreate()` (UI initialization), `onStart()` (becomes visible), `onResume()` (interacts with user), `onPause()` (partially obscured/losing focus), `onStop()` (no longer visible), and `onDestroy()` (removed from memory).

```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main)
    println("Activity created")
}
```

## 3. What is the difference between `onCreate()` and `onStart()`?
`onCreate()` is called only once during the activity's entire lifetime to initialize the UI and variables. `onStart()` is called every time the activity becomes visible to the user (e.g., when returning to it from another app).

```kotlin
override fun onStart() {
    super.onStart()
    // Register UI broadcast receivers or start animations
}
```

## 4. What happens to the lifecycle when a Dialog appears over an Activity?
The Activity's `onPause()` is called because it loses focus but is still partially visible. `onStop()` is NOT called unless the dialog is another activity that is fully opaque and covers the entire screen.

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

## 7. Explain the Fragment Lifecycle.
It aligns closely with the Activity lifecycle but includes specific UI callbacks: `onAttach()`, `onCreate()`, `onCreateView()` (inflate layout), `onViewCreated()`, `onStart()`, `onResume()`, `onPause()`, `onStop()`, `onDestroyView()` (UI destroyed), `onDestroy()`, `onDetach()`.

```kotlin
override fun onCreateView(
    inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
): View? {
    return inflater.inflate(R.layout.fragment_my, container, false)
}
```

## 8. What is the difference between `add()` and `replace()` in FragmentTransaction?
- `add()` simply stacks the new fragment on top of existing ones (both are active in memory, but the top one is visible).
- `replace()` removes the existing fragment(s) in the container before adding the new one.

```kotlin
supportFragmentManager.commit {
    replace(R.id.fragment_container, newFragment)
    addToBackStack(null) // Allows user to press Back button to reverse
}
```

## 9. What is an Intent?
An Intent is a messaging object used to request an action from another app component (starting an activity, starting a service, or delivering a broadcast).

```kotlin
val intent = Intent(this, SecondActivity::class.java)
intent.putExtra("EXTRA_MESSAGE", "Hello")
startActivity(intent)
```

## 10. What is the difference between Explicit and Implicit Intents?
- **Explicit**: Targets a specific component by its exact class name (usually used within the same app).
- **Implicit**: Declares a general action to perform, allowing the OS to find an app that can handle it (e.g., opening a web URL).

```kotlin
// Implicit Intent Example
val intent = Intent(Intent.ACTION_VIEW)
intent.data = Uri.parse("https://google.com")
startActivity(intent)
```

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

## 12. What is the difference between Started and Bound Services?
- **Started**: Launched via `startService()`. Runs indefinitely until it stops itself (`stopSelf()`) or is stopped by another component.
- **Bound**: Bound to a component via `bindService()`. Allows client-server interaction. Destroyed when all clients unbind.

```kotlin
// Binding to a service
val intent = Intent(this, LocalService::class.java)
bindService(intent, connection, Context.BIND_AUTO_CREATE)
```

## 13. What is a Foreground Service?
A service that performs operations noticeable to the user (like playing music or tracking location). It must display an ongoing Notification in the status bar to keep the OS from killing it.

```kotlin
val notification = NotificationCompat.Builder(this, CHANNEL_ID)
    .setContentTitle("Playing Music")
    .build()
startForeground(1, notification)
```

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

## 15. What is a Content Provider?
A component that manages access to a structured set of data. It is the standard way to share data securely between different Android applications (e.g., accessing the Contacts app).

```kotlin
// Querying the Contacts Content Provider
val cursor = contentResolver.query(
    ContactsContract.Contacts.CONTENT_URI,
    null, null, null, null
)
```

## 16. What is a Context in Android?
`Context` is an abstract class providing global information about an application environment. It allows access to application-specific resources and classes, as well as up-calls for application-level operations (launching activities, broadcasting intents).

```kotlin
val sharedPrefs = context.getSharedPreferences("prefs", Context.MODE_PRIVATE)
val color = ContextCompat.getColor(context, R.color.black)
```

## 17. What is the difference between Application Context and Activity Context?
- **Application Context**: Tied to the lifecycle of the entire application. Use it for singletons or long-living objects to prevent memory leaks.
- **Activity Context**: Tied to the lifecycle of the specific activity. Contains theme and UI context. Used for displaying dialogs or inflating layouts.

```kotlin
// Memory Leak: Passing Activity context to a Singleton
MySingleton.init(this) // BAD

// Correct: Pass Application context
MySingleton.init(applicationContext) // GOOD
```

## 18. What is `SavedInstanceState` used for?
It is a `Bundle` used to save and restore dynamic UI state (like scroll position or user input) during configuration changes (like screen rotations) or process death.

```kotlin
override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    outState.putString("USER_TEXT", editText.text.toString())
}
```

## 19. What is a PendingIntent?
It is a wrapper around an Intent that grants another application (like the Notification Manager or AlarmManager) the right to execute the contained Intent as if it were executed by your own app.

```kotlin
val intent = Intent(this, MainActivity::class.java)
val pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)
// Pass pendingIntent to a Notification Builder
```

## 20. How do you communicate between an Activity and a Fragment?
Historically, using interface callbacks. Today, the recommended approach is using a shared `ViewModel` scoped to the Activity, which both the Activity and Fragment can observe.

```kotlin
// Shared ViewModel approach
val viewModel: SharedViewModel by activityViewModels()
viewModel.selectedItem.observe(viewLifecycleOwner) { item ->
    // Update UI
}
```

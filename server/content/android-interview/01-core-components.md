---
title: "Core Android Components & Basics"
description: "Master the foundational elements of the Android operating system."
---

## 1. What are the four main application components in Android?
The four main components are:
- **Activities**: The entry point for interacting with the user (represents a single screen).
- **Services**: General-purpose entry points for keeping an app running in the background for all kinds of reasons.
- **Broadcast Receivers**: Enable the system to deliver events to the app outside of a regular user flow (e.g., low battery warning).
- **Content Providers**: Manage a shared set of app data that you can store in the file system, an SQLite database, on the web, or any other persistent storage location.

## 2. What is an `Activity`, and what is its lifecycle?
An `Activity` provides the window in which the app draws its UI. Its lifecycle methods dictate how it transitions between states:
- `onCreate()`: Fired when the system creates the activity. You initialize essential components here (like setting the layout).
- `onStart()`: Makes the activity visible to the user.
- `onResume()`: The activity comes to the foreground and starts interacting with the user.
- `onPause()`: The activity is partially obscured or losing focus (e.g., a multi-window mode).
- `onStop()`: The activity is no longer visible.
- `onDestroy()`: The activity is finishing or being destroyed by the system.

## 3. What is a `Fragment`, and how does its lifecycle differ from an `Activity`?
A `Fragment` represents a reusable portion of your app's UI. It must always be hosted in an `Activity`. Its lifecycle is closely tied to its host activity but includes additional methods related to its view:
- `onAttach()`: Fragment is attached to the Activity.
- `onCreateView()`: The system calls this to draw the fragment's UI.
- `onViewCreated()`: Called immediately after `onCreateView()` returns.
- `onDestroyView()`: Called when the view hierarchy associated with the fragment is being removed.

## 4. What is the difference between explicit and implicit Intents?
- **Explicit Intents**: Specify the exact component (by fully qualified class name) to start. Typically used for internal app navigation (e.g., `Intent(context, TargetActivity::class.java)`).
- **Implicit Intents**: Do not specify a specific component. Instead, they declare a general action to perform, allowing any app on the device that can handle the action to fulfill the request (e.g., `ACTION_VIEW` for opening a URL).

## 5. Explain `Context` in Android. What is the difference between Application Context and Activity Context?
`Context` provides access to application-specific resources and classes, as well as up-calls for application-level operations (launching activities, broadcasting intents).
- **Application Context**: Tied to the lifecycle of the application. It is a singleton and should be used for operations that need a context whose lifecycle is separate from the current context (e.g., initializing a database).
- **Activity Context**: Tied to the lifecycle of an Activity. Used for UI operations, starting other activities, or inflating layouts. Using it for long-running background tasks causes memory leaks.

## 6. What is `AndroidManifest.xml`, and why is it essential?
The Android Manifest file describes essential information about your app to the Android build tools, the Android operating system, and Google Play. It must declare:
- The app's package name and components (Activities, Services, etc.).
- Permissions the app requires (e.g., Internet, Camera).
- Hardware and software features the app requires, determining device compatibility.

## 7. What is a `Service`, and how does a Foreground Service differ from a Background Service?
A `Service` is a component that performs long-running operations in the background without a UI.
- **Background Service**: Performs an operation that isn't directly noticed by the user (e.g., compacting storage). Highly restricted by the system in modern Android versions to save battery.
- **Foreground Service**: Performs an operation noticeable to the user (e.g., playing music). It must display an ongoing Notification to keep the user aware that it's running.

## 8. What is a `BroadcastReceiver`? How do static and dynamic receivers differ?
A `BroadcastReceiver` listens for system-wide or app-specific broadcast messages.
- **Static (Manifest-declared)**: Registered in the `AndroidManifest.xml`. Can wake up the app even if it isn't running (highly restricted in modern Android versions).
- **Dynamic (Context-registered)**: Registered programmatically in an Activity or Service using `registerReceiver()`. It only receives broadcasts as long as the registering context is valid.

## 9. What is a `ContentProvider`, and when would you use one?
A `ContentProvider` manages access to a structured set of data. They encapsulate the data and provide mechanisms for defining data security. You use them primarily when you want to share data with *other* applications (e.g., the Contacts app sharing phone numbers).

## 10. What is a `PendingIntent`, and how is it used?
A `PendingIntent` is a token that you give to a foreign application (e.g., NotificationManager, AlarmManager), which allows the foreign application to use your app's permissions to execute a predefined piece of code (an Intent) at a later time.

## 11. How does data passing work between activities using `Intent` extras and `Bundle`?
Data is passed by putting key-value pairs into the `Intent` using `putExtra()`. Under the hood, these extras are stored in a `Bundle`, which is a dictionary mapping string keys to various Parcelable values. The receiving activity extracts the data using `getIntent().getStringExtra()` or similar methods.

## 12. What is the difference between `Serializable` and `Parcelable`? Why is `Parcelable` preferred in Android?
- **Serializable**: A standard Java marker interface. It uses reflection for serialization, making it slow and generating many temporary objects (triggering Garbage Collection).
- **Parcelable**: An Android-specific interface where you explicitly write the code for serializing/deserializing the object. It is much faster and more memory-efficient than Serializable, making it the preferred choice for IPC (Inter-Process Communication) and passing data in Intents.

## 13. What happens during configuration changes (e.g., screen rotation), and how do you handle them?
By default, the system destroys and recreates the current `Activity` (and its fragments) to apply alternative resources (like landscape layouts). 
To handle this:
- Use `ViewModel` to retain UI state data across the recreation.
- Use `onSaveInstanceState()` for simple UI state (like scroll position).
- Alternatively (but rarely recommended), declare `android:configChanges` in the manifest to handle the change manually without recreating the activity.

## 14. What is the Zygote process in Android execution?
The Zygote is a special daemon process launched when Android boots. It preloads all core Java classes and Android framework resources. When a new app is launched, instead of starting a new JVM from scratch, Android "forks" the Zygote process, creating a new process that instantly shares the preloaded resources, drastically reducing app startup time and memory footprint.

## 15. What are the key differences between the Dalvik Virtual Machine (DVM) and Android Runtime (ART)?
- **DVM**: Used Just-In-Time (JIT) compilation (compiling code dynamically while the app is running). Slower execution but faster installation. (Used before Android 5.0).
- **ART**: Uses Ahead-Of-Time (AOT) compilation (compiles bytecode to native machine code during installation) and Profile-Guided JIT. It offers significantly better runtime performance, smoother UI rendering, and more efficient garbage collection, at the cost of slightly larger app sizes on disk.

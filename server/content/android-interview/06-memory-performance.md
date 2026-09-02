---
title: "Memory Management & Performance Optimization"
description: "Techniques for building smooth, crash-free, and high-performance Android apps."
---

## 76. What is an Application Not Responding (ANR) error, and how do you diagnose/fix it?
An ANR occurs when the Main (UI) thread is blocked for more than 5 seconds, causing the system to show a dialog prompting the user to kill the app.
- **Diagnosis**: Analyze the `/data/anr/traces.txt` file (or Google Play Console ANR logs) to find the exact stack trace blocking the main thread.
- **Fix**: Move long-running operations (Network I/O, heavy database queries, bitmap processing) off the main thread using Kotlin Coroutines (`Dispatchers.IO` or `Dispatchers.Default`).

## 77. What causes Memory Leaks in Android, and what are common memory leak scenarios?
A memory leak occurs when an object is no longer needed but cannot be Garbage Collected because a reference to it is still held by a longer-lived object.
Common scenarios:
- A singleton or static variable holding a reference to an `Activity` or `View` context.
- Unregistered listeners/callbacks (e.g., forgetting to unregister a `BroadcastReceiver` or LiveData observer).
- Inner classes (like legacy `AsyncTask` or `Handler`) retaining an implicit reference to the outer Activity.

## 78. How do you use LeakCanary to detect memory leaks?
LeakCanary is a powerful third-party library by Square. Once added to your debug dependencies, it automatically hooks into the Android lifecycle.
When an Activity or Fragment is destroyed, LeakCanary expects it to be garbage collected within a few seconds. If it isn't, it dumps the Java Heap into an `.hprof` file, analyzes it, and sends a notification showing the exact chain of references (the "leak trace") preventing the garbage collection.

## 79. What is Garbage Collection in ART, and how can excessive allocations cause UI jank?
Garbage Collection (GC) automatically frees up memory by destroying unreferenced objects. While ART's GC is highly optimized and concurrent, creating thousands of temporary objects in a short time (e.g., inside an `onDraw` method or a tight loop) triggers frequent GC events. These events pause the application threads momentarily, causing dropped frames and a stuttering UI ("jank").

## 80. What are `WeakReference` and `SoftReference`, and when should you use them?
- **WeakReference**: An object wrapped in a WeakReference will be aggressively garbage collected as soon as the GC runs if there are no strong references to it. Useful for caching views or contexts in helper classes to prevent strict memory leaks.
- **SoftReference**: Similar, but the GC will only clear these if the system is absolutely desperate for memory (getting close to an OutOfMemoryError). Rarely used today, as modern LRU caches are preferred.

## 81. What is Android Profiler (CPU, Memory, Network, Energy), and how do you use it?
The Android Profiler is a suite of tools in Android Studio used to inspect real-time app performance.
- **CPU Profiler**: Tracks method execution times to find bottlenecks causing UI lag.
- **Memory Profiler**: Tracks memory allocation. You can capture a heap dump to analyze object sizes and find leaks.
- **Network Profiler**: Monitors network request times, payload sizes, and connection frequency.

## 82. How do you optimize app startup time (Baseline Profiles, App Startup library)?
- **App Startup Library**: Replaces multiple slow `ContentProvider` initializations with a single, highly optimized initialization pipeline on boot.
- **Baseline Profiles**: A list of classes and methods shipped with your APK. During installation, Android pre-compiles these exact paths using Ahead-Of-Time (AOT) compilation, dramatically speeding up the critical startup rendering path on the user's first launch.

## 83. What is `StrictMode`, and how does it help identify disk/network operations on the main thread?
`StrictMode` is a developer tool that detects things you might be doing by accident, such as disk reads/writes or network requests on the application's main thread. If configured in your `Application.onCreate()`, it can flash the screen, print a logcat warning, or explicitly crash the app during development when it detects these violations, ensuring you catch them before release.

## 84. How do image loading libraries like Coil or Glide optimize bitmap memory and caching?
Image libraries prevent `OutOfMemoryError`s by:
- **Downsampling**: They never load a 4K image into memory if the target `ImageView` is only 200x200 pixels. They calculate the bounds and load a scaled-down bitmap.
- **Memory Caching**: They maintain a strict LRU (Least Recently Used) cache in RAM to instantly serve recently viewed images.
- **Disk Caching**: They save fetched images to local storage so subsequent app launches don't require network calls.

## 85. What causes frame drops and UI stuttering, and how do you debug rendering performance?
Android attempts to draw a frame every 16.6ms (to achieve 60fps). If the Main Thread takes longer than 16ms to measure, layout, and draw the UI, a frame is dropped.
Causes include complex nested `LinearLayout`s (overdraw), heavy processing in `onDraw`, or blocking the main thread.
You debug this using the **GPU Overdraw** developer option (colors the screen to show how many times a pixel was redrawn) and the **CPU Profiler** (System Trace) to measure exact UI rendering times.

## 86. What is the difference between a shallow heap and a retained heap?
- **Shallow Heap**: The amount of memory directly occupied by an object itself (e.g., its primitive fields).
- **Retained Heap**: The total amount of memory that would be freed if this specific object were garbage collected. It includes the shallow heap of the object *plus* the shallow heaps of all other objects that are kept alive strictly by this object.

## 87. How do you optimize `RecyclerView` scrolling performance with heavy image loading?
- Use a dedicated library like Glide or Coil to handle asynchronous loading and LRU caching.
- Cancel pending image loads when a `ViewHolder` is recycled using `onViewRecycled`.
- Ensure images are downsampled to the exact dimensions of the `ImageView`.
- Optimize the item layout to avoid complex nested views (use `ConstraintLayout`).

## 88. What are `Bitmaps` and why do they cause so many `OutOfMemoryError`s?
Bitmaps are uncompressed arrays of pixels representing an image. An ARGB_8888 bitmap uses 4 bytes per pixel. A seemingly small 4000x3000 photo from a camera takes a massive 48MB of RAM when loaded entirely into memory. If not properly downsampled before loading, they instantly exhaust the application's Java heap space.

## 89. How do you measure rendering performance using `JankStats`?
`JankStats` is a Jetpack library used to track and analyze UI performance issues in production apps. Unlike the local Android Profiler, `JankStats` hooks into the system's frame rendering callbacks to detect dropped frames (jank). You can log this data to your analytics backend to identify which specific screens are lagging on user devices.

## 90. What is `R8`'s impact on app performance besides size reduction?
Beyond shrinking the APK, R8 performs aggressive byte-code optimization:
- **Inlining**: It moves the code of small functions directly into the calling site, saving the overhead of a method call.
- **Dead Code Elimination**: Removes `if/else` blocks that it can prove will never execute.
- **Class Merging**: Merges interfaces with a single implementation directly into the class, reducing the total class count and speeding up class loading in ART.

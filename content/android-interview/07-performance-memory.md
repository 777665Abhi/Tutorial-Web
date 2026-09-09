---
title: "Performance & Memory"
description: "Memory leaks, Profiling, ProGuard, and optimizing App Startup."
---

## 1. What is a Memory Leak in Android?
A memory leak occurs when an object is no longer needed by the application, but the Garbage Collector cannot remove it from memory because another long-living object holds a strong reference to it. This eventually leads to an `OutOfMemoryError` (OOM) and an app crash.

## 2. What are the most common causes of Memory Leaks in Android?
1. Passing an Activity context to a Singleton class.
2. Inner classes (like Handlers, AsyncTasks, or Threads) that hold an implicit reference to their outer Activity.
3. Forgetting to unregister listeners (e.g., BroadcastReceivers, EventBus) in `onDestroy()`.
4. Static views or static contexts.

```kotlin
// Example of a leak
class MyActivity : Activity() {
    companion object {
        // Bad! Static reference to a View keeps the whole Activity in memory
        var myTextView: TextView? = null 
    }
}
```

## 3. How do you detect and fix memory leaks?
You can use Android Studio's **Memory Profiler** to take a heap dump and inspect object allocations. The industry standard library is **LeakCanary**, which automatically detects and notifies you of memory leaks during development.

## 4. What is LeakCanary and how does it work?
LeakCanary is an open-source library by Square. It hooks into the Android Lifecycle. When an Activity or Fragment is destroyed, LeakCanary passes a `WeakReference` of it to a background queue. If the reference is not cleared after garbage collection, LeakCanary dumps the heap and analyzes the shortest strong reference path preventing garbage collection.

## 5. What is the Garbage Collector (GC)?
A background process in the Dalvik/ART virtual machine that reclaims memory occupied by objects that are no longer in use (unreachable objects) to make room for new allocations.

## 6. What is the difference between Dalvik and ART?
- **Dalvik**: The older Android VM (pre-Lollipop). It used Just-In-Time (JIT) compilation, compiling bytecode to machine code every time the app ran, making it slower and draining more battery.
- **ART (Android Runtime)**: The modern VM. It originally used Ahead-Of-Time (AOT) compilation (compiling everything upon install), but now uses a hybrid JIT/AOT profile-guided optimization for faster startup and better battery life.

## 7. What is App Startup time and how do you optimize it?
App startup can be Cold (app starting from scratch), Warm (process running but Activity needs recreation), or Hot (bringing the app to foreground).
Optimizations:
- Defer heavy initializations in `Application.onCreate()` to a background thread.
- Use the **App Startup** Jetpack library to manage dependencies.
- Avoid deep/complex View hierarchies on the initial screen.

## 8. What is Overdraw?
Overdraw occurs when the system draws a pixel on the screen multiple times in a single frame (e.g., drawing a background on an Activity, then a background on a ViewGroup, then a background on a TextView on top of each other). It wastes GPU resources.

## 9. How do you detect and fix Overdraw?
You can turn on "Debug GPU Overdraw" in Developer Options. Fix it by removing unnecessary `android:background` attributes from layouts, especially if they are completely covered by child views.

## 10. What is View hierarchy flattening?
Deeply nested view hierarchies (e.g., `LinearLayout` inside `RelativeLayout` inside `ScrollView`) take exponentially longer to measure and lay out. Flattening means replacing them with a single `ConstraintLayout`, which optimizes measurement into a single pass.

## 11. What is the 16ms rule (60 FPS)?
For a fluid user experience, the app must render at 60 frames per second (FPS). This means the system has exactly 16.6 milliseconds (1000ms / 60) to measure, layout, and draw every single frame. If you take longer (e.g., doing heavy work on the UI thread), the app skips frames ("Jank").

## 12. What is `RecyclerView` and why is it efficient?
Unlike `ListView` which creates a new View for every item in a list, `RecyclerView` creates only enough views to fill the screen (plus a few extra). As the user scrolls, views that scroll off-screen are "recycled" and rebound with new data, drastically saving memory and CPU.

## 13. What is a WeakReference?
Unlike a strong reference (which prevents GC), a `WeakReference` does not prevent its referent from being made finalizable, finalized, and then reclaimed by the garbage collector. It is used to prevent memory leaks (e.g., in a custom Handler).

```kotlin
class MyHandler(activity: Activity) : Handler(Looper.getMainLooper()) {
    private val weakActivity = WeakReference(activity)
    
    override fun handleMessage(msg: Message) {
        val activity = weakActivity.get()
        if (activity != null) {
            // Safe to use
        }
    }
}
```

## 14. What is a Bitmap in Android and why is it problematic?
A Bitmap represents an image in memory. They are problematic because they consume massive amounts of RAM. A single 1080p image in ARGB_8888 format consumes ~8MB of RAM. Loading large bitmaps can instantly cause an OOM exception.

## 15. How do you efficiently load Bitmaps?
1. Never load the full image if the target `ImageView` is small.
2. Use `BitmapFactory.Options.inSampleSize` to downsample (shrink) the image during the decoding phase.
3. In production, always use an image loading library like **Glide** or **Coil**, which handles downsampling, memory caching, and disk caching automatically.

```kotlin
// Using Coil (Modern Kotlin image loader)
imageView.load("https://example.com/image.jpg") {
    crossfade(true)
    transformations(CircleCropTransformation())
}
```

## 16. What is ProGuard / R8?
R8 (the modern successor to ProGuard) shrinks and obfuscates the code during the release build.
- **Shrinking**: Removes unused classes and methods, reducing APK size.
- **Obfuscation**: Renames classes and variables to `a.b.c`, making reverse engineering difficult.

## 17. What are ProGuard Rules (Keep rules)?
Sometimes R8 aggressively removes code it thinks is unused (especially if accessed via Reflection, like Gson models). You write `keep` rules in `proguard-rules.pro` to tell R8 not to touch specific classes.

```pro
# Example ProGuard rule
-keep class com.example.models.** { *; }
```

## 18. What is strict mode?
A developer tool (`StrictMode`) that detects accidental disk or network access on the application's main thread, throwing logs or crashing the app intentionally to force the developer to fix the bottleneck.

## 19. What is a Memory Churn?
Occurs when you allocate a large number of temporary objects in a very short amount of time (e.g., inside an `onDraw()` loop). The Garbage Collector is forced to run repeatedly to clean them up, causing the app to freeze momentarily (Jank).

## 20. How do you optimize Network Performance?
1. Batch requests where possible.
2. Only request the data you actually need (GraphQL or partial endpoints).
3. Use GZIP compression (handled automatically by OkHttp).
4. Implement local caching (Room) to avoid unnecessary network calls.

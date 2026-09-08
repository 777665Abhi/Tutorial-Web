---
title: "Advanced Android"
description: "Custom Views, IPC, NDK, and advanced architecture patterns."
---

## 1. What is the Android NDK?
The Native Development Kit (NDK) allows you to implement parts of your app using native-code languages such as C and C++. It is useful for CPU-intensive operations (game engines, signal processing, physics simulations).

## 2. How does Java/Kotlin communicate with C/C++ in Android?
Through JNI (Java Native Interface). You declare methods with the `external` keyword in Kotlin, and implement them in C++ following specific naming conventions.

```kotlin
// Kotlin side
external fun stringFromJNI(): String

companion object {
    init {
        System.loadLibrary("native-lib")
    }
}
```

## 3. What is IPC (Inter-Process Communication)?
Android runs apps in isolated sandboxes (processes). IPC is the mechanism that allows data and signals to be shared securely between different processes (e.g., your app talking to the Camera app or a background service in another process).

## 4. What is AIDL?
Android Interface Definition Language. It allows you to define the programming interface that both the client and service agree upon in order to communicate with each other using IPC. It generates the necessary Java stub code.

## 5. What is a Custom View?
When standard widgets (`TextView`, `Button`) don't meet your needs, you can subclass `View` (or a `ViewGroup`) to draw completely custom UI components using the Canvas API and overriding the measurement/layout phases.

```kotlin
class PieChartView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {
    // Custom drawing logic
}
```

## 6. What are the key methods to override in a Custom View?
- `onMeasure()`: Determines the size of the view based on parent constraints.
- `onLayout()`: Assigns sizes and positions to children (if extending ViewGroup).
- `onDraw()`: Renders the view content using a `Canvas` and `Paint`.

```kotlin
override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    canvas.drawCircle(x, y, radius, paint)
}
```

## 7. What is the difference between `invalidate()` and `requestLayout()`?
- `invalidate()`: Tells the system that the view's appearance has changed and it needs to be redrawn (calls `onDraw`).
- `requestLayout()`: Tells the system that the view's bounds/size have changed. The entire view hierarchy must be measured and laid out again (calls `onMeasure` and `onLayout`, then `onDraw`).

## 8. What is a Window in Android?
A `Window` is an abstract class that manages the top-level drawing surface. The most common implementation is `PhoneWindow`. An Activity provides a Window, and the Window contains the View hierarchy (starting with the DecorView).

## 9. What is the DecorView?
The root View of the view hierarchy in a Window. It holds the title bar (ActionBar/Toolbar) and the content view (the layout you inflate via `setContentView`).

## 10. How does the Android Touch System work?
Touch events (`MotionEvent`s like DOWN, MOVE, UP) start at the Activity level and tunnel down the view hierarchy to the deepest child (Target). If a child consumes it, done. If not, it bubbles back up.

## 11. What is the difference between `dispatchTouchEvent`, `onInterceptTouchEvent`, and `onTouchEvent`?
- `dispatchTouchEvent`: Routes the event down the tree.
- `onInterceptTouchEvent` (ViewGroup only): Allows a parent (like ScrollView) to steal a touch event from its children (e.g., detecting a scroll instead of a click).
- `onTouchEvent`: Actually processes the touch and returns a boolean indicating if it was consumed.

## 12. What is ProGuard / R8?
Tools used during the release build process to Shrink (remove unused code), Optimize (inline functions), and Obfuscate (rename classes/variables to short, meaningless names) the application, making it smaller and harder to reverse-engineer.

```groovy
// In build.gradle
buildTypes {
    release {
        minifyEnabled true // Enables R8
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

## 13. What is a Memory Leak in Android?
Occurs when an object is no longer needed but cannot be garbage collected because another long-living object holds a strong reference to it (e.g., a static variable holding a reference to an Activity).

## 14. What is Dependency Injection (DI)?
A design pattern where an object receives its dependencies from an external source rather than creating them itself. It makes code highly decoupled and easily testable (since dependencies can be mocked). Hilt/Dagger are the standard tools.

## 15. What is the difference between Dagger and Hilt?
Dagger is a highly flexible, complex DI framework. Hilt is built *on top* of Dagger specifically for Android, drastically reducing boilerplate by providing standard pre-defined Android components (like Application and Activity scope).

## 16. What is a Content Provider?
An abstraction layer for sharing data securely between different applications. It uses a URI-based addressing system and CRUD (Create, Read, Update, Delete) operations.

## 17. What is an ANR (Application Not Responding)?
A dialog presented to the user when the main (UI) thread of an Android app is blocked for too long (usually around 5 seconds). It is caused by doing heavy work (network, DB queries, infinite loops) on the main thread.

## 18. What is `StrictMode`?
A developer tool that detects things you might be doing by accident (like disk or network access on the main thread) and brings them to your attention by flashing the screen or crashing the app intentionally during development.

## 19. What is a ThreadLocal variable?
A variable whose value is unique and isolated to the specific thread that accesses it. In Android, the `Looper.prepare()` method uses a ThreadLocal to ensure each thread has exactly one Looper.

## 20. What is an APK vs an AAB (Android App Bundle)?
- **APK**: A fully compiled, runnable Android package containing code and resources for all device configurations.
- **AAB**: A publishing format. Google Play uses the AAB to generate optimized APKs specific to the user's device (stripping out unused screen densities and languages), resulting in smaller download sizes.

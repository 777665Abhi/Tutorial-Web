---
title: "Advanced Android"
description: "Custom Views, IPC, NDK, and advanced architecture patterns."
---

## 1. What is the Android NDK?
The Native Development Kit (NDK) allows you to implement parts of your app using native-code languages such as C and C++. It is useful for CPU-intensive operations (game engines, signal processing, physics simulations).

**Why you would reach for it:** the three legitimate reasons are (1) squeezing out extra performance for tight compute loops where the JIT/ART overhead and GC pauses matter, (2) reusing an existing C/C++ library — OpenCV, FFmpeg, SQLite extensions, a crypto core — instead of rewriting it, and (3) keeping sensitive logic out of easily decompiled DEX bytecode.

**What it costs you:** native code is compiled per-ABI (`armeabi-v7a`, `arm64-v8a`, `x86_64`), so your APK carries a `.so` per architecture unless you ship an AAB and let Play strip the rest. You lose the JVM safety net — a bad pointer is a `SIGSEGV` tombstone, not a catchable exception — and you manage memory by hand. Debugging crosses a language boundary.

A common interview trap: *"Does the NDK make everything faster?"* No. Crossing the JNI boundary has real overhead, so a chatty native API called thousands of times per frame can be **slower** than pure Kotlin. Native wins when you cross the boundary once and do a lot of work on the other side.

```groovy
// build.gradle — the NDK build is wired through CMake
android {
    defaultConfig {
        externalNativeBuild {
            cmake { cppFlags "-std=c++17" }
        }
        ndk { abiFilters "armeabi-v7a", "arm64-v8a" }
    }
    externalNativeBuild {
        cmake { path "src/main/cpp/CMakeLists.txt" }
    }
}
```

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

**How the linking actually works.** JNI resolves native methods by symbol name. The C++ function must be named `Java_<package>_<class>_<method>`, with underscores escaped (`_1` for a literal underscore in the name), and it must be exported with C linkage so the C++ compiler doesn't mangle it:

```cpp
#include <jni.h>

extern "C" JNIEXPORT jstring JNICALL
Java_com_example_app_MainActivity_stringFromJNI(JNIEnv* env, jobject /* this */) {
    return env->NewStringUTF("Hello from C++");
}
```

Every native method receives two implicit arguments: `JNIEnv*` — your handle to the entire JNI API, valid **only on the thread it was given to you on** — and either `jobject` (instance methods) or `jclass` (static methods).

**The three things interviewers probe here:**

- **Local vs. global references.** Objects you get from JNI are *local references*, freed automatically when the native call returns. If you want to keep one across calls, you must promote it with `NewGlobalRef` and later release it with `DeleteGlobalRef` — otherwise you have a dangling reference, or a leak.
- **Threading.** A `JNIEnv*` cannot be shared between threads. A native thread that wants to call back into Kotlin must attach itself via `AttachCurrentThread` on the cached `JavaVM*`, and detach before exiting.
- **Registration alternative.** Instead of name-based lookup you can call `RegisterNatives` in `JNI_OnLoad`. It's faster (no symbol lookup at first call), survives obfuscation, and lets you use arbitrary C++ function names.

## 3. What is IPC (Inter-Process Communication)?
Android runs apps in isolated sandboxes (processes). IPC is the mechanism that allows data and signals to be shared securely between different processes (e.g., your app talking to the Camera app or a background service in another process).

**The isolation model.** Every app gets its own Linux process and, historically, its own Linux UID. One app simply cannot read another's memory or private files — that is enforced by the kernel, not by goodwill. So anything crossing an app boundary needs an explicit, mediated channel.

**Binder is that channel.** Nearly all Android IPC — `Intent`s, `ContentProvider` queries, bound `Service`s, AIDL, and every call you make into a system service like `ActivityManager` or `PackageManager` — runs over the Binder kernel driver. Binder gives you three things a raw socket wouldn't: it hands the receiving side the caller's verified UID/PID (so permission checks are trustworthy), it reference-counts objects across process boundaries, and it uses a single-copy shared-memory transfer instead of copying data twice.

**The constraint that bites in practice:** a Binder transaction buffer is roughly **1 MB per process**, shared across all in-flight transactions. Pushing a large bitmap or a big list through an `Intent` or an AIDL call throws `TransactionTooLargeException`. The fix is to pass a handle rather than the payload — a content URI, a file descriptor, or a `ParcelFileDescriptor` — and let the other side read the bytes directly.

Your options, roughly in order of how often they're the right answer: `Intent`s with extras (simple, fire-and-forget), `ContentProvider` (structured data), `Messenger` (queued, one-way-ish messages, no concurrency to manage), AIDL (full concurrent interface), and `BroadcastReceiver` (one-to-many signalling).

## 4. What is AIDL?
Android Interface Definition Language. It allows you to define the programming interface that both the client and service agree upon in order to communicate with each other using IPC. It generates the necessary Java stub code.

You write a `.aidl` file; the build generates an interface containing a `Stub` class (the server side — you subclass it and implement the methods) and a `Proxy` (the client side — it marshals arguments into a `Parcel`, makes the Binder transaction, and unmarshals the result).

```java
// IRemoteService.aidl
interface IRemoteService {
    int getPid();
    void setValue(in String key, in int value);
}
```

```kotlin
// Service side
private val binder = object : IRemoteService.Stub() {
    override fun getPid(): Int = Process.myPid()
    override fun setValue(key: String, value: Int) { /* ... */ }
}
override fun onBind(intent: Intent): IBinder = binder
```

**Points that separate a confident answer from a memorised one:**

- **Directional tags are mandatory** on non-primitive parameters: `in` (copied to the service), `out` (an empty object is sent, the service fills it, changes come back), `inout` (both). They exist because every argument is physically copied across the process boundary, so the tag tells the generator which direction to marshal. `in` is the cheapest — don't default to `inout`.
- **`Stub` methods run on a Binder thread pool, not the main thread.** Two clients can call in concurrently, so your implementation must be thread-safe. Conversely, a *client's* call into a remote service is **blocking** by default — call it off the main thread, or declare the method `oneway` to make it fire-and-forget.
- **Only use AIDL when you genuinely need concurrent cross-process calls.** For same-process work a plain binder from `onBind` is enough; for serialised cross-process messages a `Messenger` is simpler and has no threading hazards (it funnels everything to a single `Handler`).
- **Custom types must implement `Parcelable`** and be declared in their own `.aidl` file.

## 5. What is a Custom View?
When standard widgets (`TextView`, `Button`) don't meet your needs, you can subclass `View` (or a `ViewGroup`) to draw completely custom UI components using the Canvas API and overriding the measurement/layout phases.

```kotlin
class PieChartView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {
    // Custom drawing logic
}
```

**Why the three constructors.** The one-arg form is for instantiation from code; the two-arg form is what the **XML inflater** calls, passing the parsed `AttributeSet`; the three-arg form adds a default style attribute. `@JvmOverloads` generates all three from a single Kotlin declaration — omit it and your view will crash with an `InflateException` when used in a layout file.

**Extend the closest thing that already works.** Subclassing `AppCompatTextView` to add one behaviour is far less work than drawing text from scratch on a `Canvas` (text layout, RTL, ellipsizing, and accessibility are genuinely hard). Only subclass `View` directly when you are truly drawing something new.

**Custom attributes** make the view reusable:

```xml
<!-- res/values/attrs.xml -->
<declare-styleable name="PieChartView">
    <attr name="sliceColor" format="color" />
</declare-styleable>
```

```kotlin
init {
    context.obtainStyledAttributes(attrs, R.styleable.PieChartView).use { ta ->
        paint.color = ta.getColor(R.styleable.PieChartView_sliceColor, Color.GRAY)
    }   // use { } guarantees recycle()
}
```

Two things reviewers look for: **never allocate inside `onDraw()`** (it runs up to 120 times a second — create your `Paint`, `Path`, and `Rect` objects in `init`), and **handle state saving** via `onSaveInstanceState`/`onRestoreInstanceState` so your view survives rotation.

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

**The three passes in detail.** Rendering a frame is measure → layout → draw, walked recursively over the whole tree.

**`onMeasure(widthMeasureSpec, heightMeasureSpec)`** — each spec packs a *mode* and a *size* into a single int. The mode is the parent's instruction:

- **`EXACTLY`** — "you will be this size." Comes from `match_parent` or a fixed `dp` value.
- **`AT_MOST`** — "be any size up to this." Comes from `wrap_content`.
- **`UNSPECIFIED`** — no constraint at all. Comes from scrolling parents measuring their children.

You **must** finish by calling `setMeasuredDimension(w, h)` — otherwise you get an `IllegalStateException`. `resolveSize()` is the helper that reconciles your desired size against the spec:

```kotlin
override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    val desired = (100 * resources.displayMetrics.density).toInt()
    setMeasuredDimension(
        resolveSize(desired, widthMeasureSpec),
        resolveSize(desired, heightMeasureSpec)
    )
}
```

**`onLayout(changed, l, t, r, b)`** — only meaningful for a `ViewGroup`. You call `child.layout(...)` on each child to position it. For a leaf `View` there is nothing to do.

**`onDraw(canvas)`** — pure rendering. By this point `width` and `height` are final, so this is where you draw. It is called far more often than the other two.

Also worth knowing: **`onSizeChanged(w, h, oldW, oldH)`** is the right place to compute geometry that depends on size (centre point, radius, a `Path`) — it fires after measurement but before drawing, so you compute once instead of every frame. And a child can be measured **more than once** per pass (`LinearLayout` with weights measures twice), so `onMeasure` must be free of side effects.

## 7. What is the difference between `invalidate()` and `requestLayout()`?
- `invalidate()`: Tells the system that the view's appearance has changed and it needs to be redrawn (calls `onDraw`).
- `requestLayout()`: Tells the system that the view's bounds/size have changed. The entire view hierarchy must be measured and laid out again (calls `onMeasure` and `onLayout`, then `onDraw`).

**The cost difference is the whole point.** `invalidate()` marks this view dirty and schedules a draw pass over the dirty region only. `requestLayout()` walks *up* the tree setting a flag on every ancestor to the root, then triggers a full measure + layout + draw on the next frame — which is why a `requestLayout()` in a hot path (say, inside a `RecyclerView` scroll or an animation tick) is a classic jank bug.

- **`invalidate()`** — triggers *draw* only, scoped to this view. Use when colour, text, or progress changed but the size did not.
- **`requestLayout()`** — triggers *measure + layout + draw* from the root down. Use when the size or position changed.

```kotlin
var progress: Float = 0f
    set(value) {
        field = value
        invalidate()        // same size, new appearance — cheap
    }

var labelText: String = ""
    set(value) {
        field = value
        requestLayout()     // text length changes our wrap_content width
        invalidate()
    }
```

**Thread rule:** `invalidate()` must be called from the UI thread; from a background thread use `postInvalidate()`, which posts it to the main looper. Neither method draws synchronously — both just schedule work for the next VSYNC frame.

## 8. What is a Window in Android?
A `Window` is an abstract class that manages the top-level drawing surface. The most common implementation is `PhoneWindow`. An Activity provides a Window, and the Window contains the View hierarchy (starting with the DecorView).

Think of a `Window` as a rectangular container plus its policy: background, title, animations, flags (fullscreen, keep-screen-on), and the insets behaviour for status/navigation bars. It is **not** the thing on screen — it is the app-side description of it.

**The full chain**, which is the actual question being asked:

```
Activity ─ owns ─▶ PhoneWindow ─ holds ─▶ DecorView (root of your views)
                        │
                 WindowManager (app-side proxy)
                        │  Binder IPC
                        ▼
      WindowManagerService (system_server)  ──▶ SurfaceFlinger ──▶ display
```

Each Window gets its own `Surface` — a buffer that `SurfaceFlinger` composites with every other visible window. That is why a Dialog can float above your Activity without being part of its view tree: it is a **separate** Window with its own `DecorView`, added through the same `WindowManager`. Same for Toasts and the status bar.

Window types matter for layering: application windows (`TYPE_APPLICATION`), sub-windows attached to a parent (`TYPE_APPLICATION_PANEL`), and system windows (`TYPE_APPLICATION_OVERLAY`, which requires the `SYSTEM_ALERT_WINDOW` permission). `requestWindowFeature()` must be called **before** `setContentView()` because the DecorView is built at that moment.

## 9. What is the DecorView?
The root View of the view hierarchy in a Window. It holds the title bar (ActionBar/Toolbar) and the content view (the layout you inflate via `setContentView`).

It is a `FrameLayout` subclass created by `PhoneWindow` when it installs a screen layout. The structure is roughly:

```
DecorView (FrameLayout)
└── LinearLayout
    ├── ViewStub / ActionBar or Toolbar
    └── FrameLayout  (android.R.id.content)
        └── your_layout.xml   ← setContentView() inflates here
```

**The two consequences worth stating in an interview:**

1. `setContentView(R.layout.activity_main)` does not set the root view — it **inflates your layout into `android.R.id.content`**, a child of the DecorView. Which is why `findViewById` works on anything in your layout, and why your layout's root `match_parent` is relative to that content frame, not the screen.
2. The DecorView is what gets attached to the `ViewRootImpl`, and `ViewRootImpl` is the actual bridge to `WindowManagerService` — it owns the `Choreographer` callback that drives `performTraversals()` (measure → layout → draw) every frame. The DecorView is the top of the *view* tree; `ViewRootImpl` sits above it but is not itself a `View`.

A practical use: `window.decorView.systemUiVisibility` (now `WindowInsetsController`) is how you drive immersive/fullscreen mode, and `decorView.post { }` is the classic trick for running code after the first layout pass.

## 10. How does the Android Touch System work?
Touch events (`MotionEvent`s like DOWN, MOVE, UP) start at the Activity level and tunnel down the view hierarchy to the deepest child (Target). If a child consumes it, done. If not, it bubbles back up.

**The gesture, not the event, is the unit.** A gesture begins with `ACTION_DOWN`, continues through many `ACTION_MOVE`s, and ends with `ACTION_UP` or `ACTION_CANCEL`. The crucial rule:

> **If a view returns `false` for `ACTION_DOWN`, it receives none of the rest of that gesture.**

The system remembers which view consumed the DOWN and routes every subsequent event in that gesture straight to it. This is the single most common source of "my touch listener only fires sometimes" bugs — the view said no at DOWN, so it was removed from consideration for the whole gesture.

**Full path for one event:** `Activity.dispatchTouchEvent` → `DecorView` → each `ViewGroup.dispatchTouchEvent` (which first asks `onInterceptTouchEvent`) → down to the target `View.onTouchEvent`. If nobody consumes it, it unwinds back up, and finally `Activity.onTouchEvent` gets a chance.

**Other details that come up:** `OnTouchListener.onTouch()` runs *before* the view's own `onTouchEvent()` and can swallow the event (which is why setting a touch listener can silently break a button's click). `ACTION_CANCEL` is delivered to a child when a parent intercepts mid-gesture — handle it, or your pressed state sticks. Multi-touch uses `ACTION_POINTER_DOWN`/`UP` with pointer indices, and you track fingers by **pointer ID**, not index, because indices shift when a finger lifts.

## 11. What is the difference between `dispatchTouchEvent`, `onInterceptTouchEvent`, and `onTouchEvent`?
- `dispatchTouchEvent`: Routes the event down the tree.
- `onInterceptTouchEvent` (ViewGroup only): Allows a parent (like ScrollView) to steal a touch event from its children (e.g., detecting a scroll instead of a click).
- `onTouchEvent`: Actually processes the touch and returns a boolean indicating if it was consumed.

- **`dispatchTouchEvent`** — on both `View` and `ViewGroup`. The entry point that drives the whole algorithm. Returning `true` means the event was handled somewhere in this subtree.
- **`onInterceptTouchEvent`** — `ViewGroup` only. Asks "do I want to steal this?" Returning `true` means stop passing to children and send it to **my own** `onTouchEvent`.
- **`onTouchEvent`** — on both. Actually handles the touch. Returning `true` means "I consume this gesture, keep sending me events."

**The algorithm inside `ViewGroup.dispatchTouchEvent`:**

1. Ask `onInterceptTouchEvent()`. If it returns `true`, the event goes to this group's own `onTouchEvent()` and children get an `ACTION_CANCEL`.
2. Otherwise, find the child under the touch point and call its `dispatchTouchEvent()`.
3. If no child consumes it, fall back to this group's own `onTouchEvent()`.

A scroll container like `RecyclerView` uses exactly this: it returns `false` from `onInterceptTouchEvent` at DOWN (so a child button can get pressed), then starts returning `true` once the finger has moved past the touch slop — at which point the child is cancelled and the scroll takes over. That is the "steal mid-gesture" behaviour.

**The escape hatch** is `requestDisallowInterceptTouchEvent(true)`, which a child calls on its parent to say "do not intercept for the rest of this gesture" — the standard fix for a horizontal `ViewPager` nested inside a vertical `ScrollView`.

```kotlin
override fun onInterceptTouchEvent(ev: MotionEvent): Boolean = when (ev.action) {
    MotionEvent.ACTION_DOWN -> false                       // let children try first
    MotionEvent.ACTION_MOVE -> abs(ev.y - startY) > touchSlop  // now it's a scroll — steal it
    else -> false
}
```

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

**R8 replaced ProGuard** as the default from AGP 3.4 onward. The important difference is architectural: ProGuard was a separate step that processed class files, then D8 dexed them. R8 **merges shrinking, optimisation, obfuscation and dexing into one pass**, which is both faster and produces smaller output. It deliberately reads the same `proguard-rules.pro` syntax, so migration was a no-op for most projects.

**The four jobs**, in the order R8 does them:

1. **Shrinking** — tree-shaking from entry points (your manifest components, and anything matched by a `-keep` rule) to find reachable code; everything else is dropped.
2. **Optimisation** — inlining, dead-branch removal, class merging, devirtualisation, enum unboxing.
3. **Obfuscation** — renaming to `a`, `b`, `c`. Shrinks the string pool as well as hindering reverse-engineering.
4. **Dexing + desugaring** — producing the final DEX, backporting newer Java APIs for older devices.

**What breaks, and why.** R8 reasons about static reachability, so anything reached by **reflection** is invisible to it: Gson/Moshi model classes, custom `View`s referenced only from XML, JNI-called methods, `Parcelable` CREATOR fields, enums used with `valueOf`. These need keep rules:

```proguard
# Keep data models used by reflection-based JSON parsing
-keep class com.example.model.** { *; }

# Keep the names of native methods and the classes that hold them
-keepclasseswithmembernames class * { native <methods>; }

# Keep a line-number table so stack traces can be de-obfuscated
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
```

That last rule matters: with obfuscation on, crash reports are unreadable unless you upload the **`mapping.txt`** produced in `build/outputs/mapping/release/` to Play Console or Crashlytics. Modern libraries ship their own rules via `consumer-rules.pro`, so you rarely hand-write rules for third-party code any more.

Also note `shrinkResources true`, which removes unused resources — but only works in combination with `minifyEnabled true`, since resource usage is determined from the shrunk code.

## 13. What is a Memory Leak in Android?
Occurs when an object is no longer needed but cannot be garbage collected because another long-living object holds a strong reference to it (e.g., a static variable holding a reference to an Activity).

**Why Android makes this worse than plain JVM:** an `Activity` transitively references its entire view hierarchy, its bitmaps, and its `Context`. Leaking one Activity can hold megabytes. And because configuration changes destroy and recreate Activities, a single leak path means you accumulate a new leaked Activity on **every rotation** until you hit `OutOfMemoryError`.

**The recurring culprits — and what they have in common:** in each case something that outlives the Activity holds a strong reference back to it.

- **Non-static inner classes and lambdas.** A non-static inner class holds an implicit `this$0` reference to its outer Activity. If it is a long-running `Handler`, `AsyncTask`, or callback, the Activity can't be collected.
- **`Handler` and `postDelayed`.** A queued `Message` holds its target `Handler`, which holds the Activity. A 60-second delayed message pins the Activity for 60 seconds. Fix: `handler.removeCallbacksAndMessages(null)` in `onDestroy`.
- **Static references.** `companion object { var context: Context? }` — a static field lives as long as the class loader, which is the whole process.
- **Unregistered listeners.** `BroadcastReceiver`s, `SensorManager`, `LocationManager`, and `EventBus` subscriptions registered in `onCreate`/`onResume` and never unregistered.
- **Singletons holding an Activity `Context`.** Pass `applicationContext` to anything process-scoped; pass the Activity context only to things scoped to the UI (inflating views, showing dialogs, theming).
- **Threads and coroutines without a scope.** A raw `Thread` or `GlobalScope.launch` referencing a view keeps it alive; use `lifecycleScope`/`viewModelScope`, which cancel automatically.
- **Fragment view references.** Keeping a `ViewBinding` in a Fragment field without nulling it in `onDestroyView` leaks the view tree, because the Fragment instance outlives its view.

```kotlin
// Leaky: implicit reference to the enclosing Activity
private val handler = Handler(Looper.getMainLooper())
handler.postDelayed({ textView.text = "done" }, 60_000)

// Safe: tied to the lifecycle, cancelled automatically
lifecycleScope.launch {
    delay(60_000)
    textView.text = "done"
}
```

**How you find them:** LeakCanary in debug builds (it watches destroyed Activities/Fragments and dumps the shortest strong reference path when one isn't collected), or Android Studio's Memory Profiler — rotate the screen several times, force a GC, dump the heap, and count instances of your Activity. More than one means a leak.

## 14. What is Dependency Injection (DI)?
A design pattern where an object receives its dependencies from an external source rather than creating them itself. It makes code highly decoupled and easily testable (since dependencies can be mocked). Hilt/Dagger are the standard tools.

**The problem it solves.** A class that constructs its own collaborators is welded to their concrete types:

```kotlin
// Without DI — untestable: you cannot swap the real network call out
class UserRepository {
    private val api = Retrofit.Builder().baseUrl(URL).build().create(Api::class.java)
}

// With DI — the dependency is declared, not created
class UserRepository @Inject constructor(private val api: Api)
```

The second version can be handed a fake `Api` in a unit test, a mock in an instrumentation test, and the real one in production, with no change to the class. It also makes the dependency graph *visible* — the constructor signature is the honest list of what this class needs, which is itself a design pressure against classes that do too much.

**Three forms:** constructor injection (preferred — dependencies are non-null and final, and the object is never in a half-built state), field injection (necessary for Android components like `Activity` and `Fragment`, which the framework instantiates for you), and method injection (rare).

**Inversion of Control** is the general principle; DI is one implementation. The other common one on Android is a **service locator** (`Koin`, or a manual container), where the class *pulls* its dependencies from a registry instead of having them *pushed* in. The tradeoff: service locators resolve at runtime (faster builds, errors appear when you run), Dagger/Hilt resolve at compile time (slower builds, errors appear when you compile). For a large codebase, compile-time verification is usually worth it.

**Scoping** is the other half of DI: `@Singleton` for one instance per app, `@ActivityRetainedScoped` for one that survives rotation, `@ViewModelScoped`, and so on. Getting scope wrong is how you get either a memory leak (too wide) or a surprising loss of state (too narrow).

## 15. What is the difference between Dagger and Hilt?
Dagger is a highly flexible, complex DI framework. Hilt is built *on top* of Dagger specifically for Android, drastically reducing boilerplate by providing standard pre-defined Android components (like Application and Activity scope).

Hilt is **not a different framework** — it generates Dagger code. The difference is opinionation: Dagger lets you define any component hierarchy you want, which means on Android every team reinvented the same one (an app component, an activity subcomponent, custom scopes, and a pile of `@Subcomponent.Factory` wiring). Hilt standardises that hierarchy and generates it for you.

- **Components** — Dagger: you define and instantiate them yourself. Hilt: predefined and generated (`SingletonComponent`, `ActivityComponent`, …).
- **Scopes** — Dagger: you write custom scope annotations. Hilt: built in (`@Singleton`, `@ActivityScoped`, `@ViewModelScoped`).
- **Android entry points** — Dagger: a manual `component.inject(this)` in every class. Hilt: just `@AndroidEntryPoint`.
- **ViewModel support** — Dagger: a hand-written multibinding factory. Hilt: `@HiltViewModel`.
- **Test replacement** — Dagger: build a separate test component. Hilt: `@UninstallModules` + `@BindValue`.
- **Flexibility** — Dagger: total. Hilt: constrained to the Android lifecycle hierarchy.

```kotlin
@HiltAndroidApp
class MyApp : Application()

@Module
@InstallIn(SingletonComponent::class)   // ← this line is what Hilt adds
object NetworkModule {
    @Provides @Singleton
    fun provideApi(): Api = Retrofit.Builder()./* ... */.create(Api::class.java)
}

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    @Inject lateinit var repo: UserRepository   // no manual inject() call
}
```

Hilt's component hierarchy mirrors the Android lifecycle, and bindings are inherited downward: `SingletonComponent` → `ActivityRetainedComponent` → `ActivityComponent` → `FragmentComponent` → `ViewComponent`. A binding in `SingletonComponent` is available everywhere below it.

**When you'd still choose plain Dagger:** a pure-Kotlin or multiplatform module with no Android classes, or a large modular build where you need a component graph that doesn't match the Activity/Fragment shape. For a typical Android app, Hilt is the default and the official recommendation.

## 16. What is a Content Provider?
An abstraction layer for sharing data securely between different applications. It uses a URI-based addressing system and CRUD (Create, Read, Update, Delete) operations.

The URI format is `content://<authority>/<path>/<id>`, where the authority uniquely identifies the provider (conventionally your package name). A client never knows or cares what's behind it — SQLite, files, or a network cache.

```kotlin
class NoteProvider : ContentProvider() {
    override fun query(uri: Uri, projection: Array<String>?, selection: String?,
                       args: Array<String>?, sort: String?): Cursor =
        db.query("notes", projection, selection, args, null, null, sort)
    // insert / update / delete / getType / onCreate
}
```

```kotlin
// Client side — resolved by authority, no direct dependency on the other app
val cursor = contentResolver.query(
    Uri.parse("content://com.example.notes/notes"), null, null, null, null
)
```

**Why it's genuinely secure**, rather than just an abstraction: the call goes over Binder, so the provider knows the caller's verified UID. You declare `android:readPermission`/`android:writePermission`, and for fine-grained access you grant a **temporary per-URI permission** with `FLAG_GRANT_READ_URI_PERMISSION` on an Intent — that's how sharing a single photo with another app works without granting access to your whole gallery.

**Where you meet them in practice:** you consume system providers constantly — `MediaStore`, `ContactsContract`, `CalendarContract`, and `DocumentsProvider` for the Storage Access Framework. You *write* one far more rarely, and only for three reasons: sharing data with other apps, exposing data to a system component like a widget or `SearchManager`/sync adapter, or using `FileProvider` to hand out a `content://` URI for a file (mandatory since Android 7 — passing a raw `file://` URI throws `FileUriExposedException`).

**Don't** use a ContentProvider as the internal data layer of your own app; Room is the right tool there. And note `android:exported` must be set explicitly on Android 12+, and should be `false` unless you really intend other apps to reach it.

One practical trick: a provider's `onCreate()` runs **before** `Application.onCreate()`, which is exactly how AndroidX's `App Startup` and several SDKs auto-initialise themselves without asking you to add a line of code.

## 17. What is an ANR (Application Not Responding)?
A dialog presented to the user when the main (UI) thread of an Android app is blocked for too long (usually around 5 seconds). It is caused by doing heavy work (network, DB queries, infinite loops) on the main thread.

**The actual thresholds** differ by trigger, and knowing them signals real experience:

- **Input event (touch/key) not handled** — 5 seconds.
- **`BroadcastReceiver.onReceive` not finished** — 10 seconds foreground, 60 seconds background.
- **`Service` lifecycle method not finished** — 20 seconds foreground, 200 seconds background.
- **`ContentProvider` remote call** — 10 seconds.

The underlying cause is always the same: the main thread's `Looper` isn't draining its message queue. It doesn't have to be *your* slow code — a lock held by a background thread, a blocking Binder call into a busy system service, or a deadlock all produce the same symptom.

**Common causes**, roughly in order of frequency: network or disk I/O on the main thread; a large or un-indexed database query; synchronous `SharedPreferences.commit()` (use `apply()`); decoding a big bitmap; a lock contended with a background thread; and doing real work inside `onReceive()` (which runs on the main thread — hand off to a `WorkManager` job or use `goAsync()`).

```kotlin
// ANR waiting to happen
val users = database.getAllUsers()      // blocking, on the main thread

// Fixed — suspends instead of blocking
lifecycleScope.launch {
    val users = withContext(Dispatchers.IO) { database.getAllUsers() }
    adapter.submitList(users)
}
```

**How you diagnose one:** the system writes a trace to `/data/anr/traces.txt` (pull it with `adb pull`), which contains a stack dump of every thread — read the `main` thread's stack to see exactly what it was blocked on. In production, Play Console's *Android vitals* aggregates ANRs with stack traces, and `ApplicationExitInfo` (API 30+) lets you read the reason for your own last exit programmatically. `StrictMode` catches most of these in development before they ever ship.

## 18. What is `StrictMode`?
A developer tool that detects things you might be doing by accident (like disk or network access on the main thread) and brings them to your attention by flashing the screen or crashing the app intentionally during development.

It works as two independent policies:

- **`ThreadPolicy`** (per-thread, usually the main thread): `detectDiskReads`, `detectDiskWrites`, `detectNetwork`, `detectCustomSlowCalls`, `detectResourceMismatches`, `detectUnbufferedIo`.
- **`VmPolicy`** (process-wide): `detectActivityLeaks`, `detectLeakedClosableObjects` (a `Cursor` or stream you forgot to close), `detectLeakedSqlLiteObjects`, `detectLeakedRegistrationObjects` (an unregistered `BroadcastReceiver`), `detectFileUriExposure`, `detectCleartextNetwork`, and `detectNonSdkApiUsage`.

Each policy has penalties: `penaltyLog()` (logcat), `penaltyFlashScreen()`, `penaltyDialog()`, `penaltyDeath()` (crash), and `penaltyDeathOnNetwork()`.

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

**The non-negotiable rule: guard it with `BuildConfig.DEBUG`.** `penaltyDeath()` in a release build turns a minor violation into a crash for real users. The value of StrictMode is that it surfaces the *causes* of ANRs and leaks early, while they're still cheap to fix — it is a development tool, not a runtime safety net.

Note that a violation is a warning, not proof of a bug: a single small disk read at startup may be entirely acceptable. The point is that you see it and decide deliberately.

## 19. What is a ThreadLocal variable?
A variable whose value is unique and isolated to the specific thread that accesses it. In Android, the `Looper.prepare()` method uses a ThreadLocal to ensure each thread has exactly one Looper.

Mechanically, the value isn't stored in the `ThreadLocal` object at all — each `Thread` carries a `ThreadLocalMap`, and the `ThreadLocal` instance is the *key* into that per-thread map. So reads and writes need no synchronisation: two threads touching the same `ThreadLocal` are touching different storage.

```kotlin
private val formatter = ThreadLocal.withInitial {
    SimpleDateFormat("yyyy-MM-dd", Locale.US)   // not thread-safe — give each thread its own
}
fun format(d: Date): String = formatter.get()!!.format(d)
```

**The Looper example, which is the one to know.** `Looper` holds `static final ThreadLocal<Looper> sThreadLocal`. `Looper.prepare()` throws if `sThreadLocal.get() != null` — that is literally how "one Looper per thread" is enforced. `Looper.myLooper()` is just `sThreadLocal.get()`, which is why a `Handler` constructed with no arguments on a non-Looper thread fails. The main thread's Looper is prepared by `ActivityThread.main()` before your code ever runs.

**Use it for** per-thread caches of expensive, non-thread-safe objects (date formatters, `Random`, parsers), or for implicit per-thread context like a request ID in logging.

**The Android caveat:** on a **thread pool**, a `ThreadLocal` outlives the task that set it, because the thread is reused. If it holds a `Context` or anything large, that's a leak, and the next task on that thread sees stale data. Always clean up with `remove()`, and prefer coroutine context elements (`CoroutineContext`) over `ThreadLocal` in coroutine code — a coroutine can resume on a *different* thread after a suspension point, so a `ThreadLocal` read after `delay()` may not see what you wrote before it. (`asContextElement()` exists precisely to bridge this.)

## 20. What is an APK vs an AAB (Android App Bundle)?
- **APK**: A fully compiled, runnable Android package containing code and resources for all device configurations.
- **AAB**: A publishing format. Google Play uses the AAB to generate optimized APKs specific to the user's device (stripping out unused screen densities and languages), resulting in smaller download sizes.

**The key distinction:** an APK is what a device *installs and runs*; an AAB is what you *upload*. A device can never install an `.aab` directly. Since August 2021, AAB is **mandatory** for new apps on Google Play.

**What Play does with it.** From one bundle it generates split APKs along three dimensions — ABI, screen density, and language — plus a base APK, and delivers only the slices that device needs. A phone on `arm64` with `xxhdpi` and English downloads none of the x86 native libs, none of the other density buckets, and none of the other languages. Typical saving is 15–50%.

```bash
# Build a bundle
./gradlew bundleRelease

# Test it locally — bundletool builds the same split APKs Play would
bundletool build-apks --bundle=app-release.aab --output=app.apks \
  --connected-device
bundletool install-apks --apks=app.apks
```

**Two things that trip people up:**

1. **App signing moves to Google.** Play Signing holds the real signing key; you sign the bundle with an *upload key*. This is why you can recover from a lost upload key (Google re-keys you) but it also means you no longer control the final binary's signature — fine for Play, but relevant if you also distribute elsewhere.
2. **Testing changes.** Because the installed artifact is now a set of splits rather than one APK, bugs can appear that only reproduce on a real split install (missing resources, `Resources$NotFoundException`). Use `bundletool` or internal app sharing to test the real thing rather than a universal APK.

AAB also unlocks **dynamic feature modules** (`<dist:module dist:onDemand="true">`), letting you ship a large, rarely-used feature as a module installed on demand via `SplitInstallManager`, and **Play Asset Delivery** for large game assets.

You still produce APKs for anything outside Play: sideloading, CI artifacts, F-Droid, Amazon Appstore, and enterprise distribution. `./gradlew assembleRelease` remains the command for that.

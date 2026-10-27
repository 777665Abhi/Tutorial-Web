---
title: "Performance & Memory"
description: "Memory leaks, Profiling, ProGuard, and optimizing App Startup."
---

## 1. What is a Memory Leak in Android?
A memory leak occurs when an object is no longer needed by the application, but the Garbage Collector cannot remove it from memory because another long-living object holds a strong reference to it. This eventually leads to an `OutOfMemoryError` (OOM) and an app crash.

**The precise definition is about *reachability*, not usefulness.** The garbage collector doesn't know what you still need — it only knows what is reachable from a **GC root**. A leak is the gap between those two things: an object you're finished with that is still reachable.

**GC roots** are where reachability starts, and knowing them makes leaks much easier to reason about:

- **Static fields** (and Kotlin `object` singletons and `companion object` properties)
- **Active thread stacks** — local variables in a running thread
- **Live `Thread` objects** themselves
- **JNI global references** from native code

Every leak traces back to one of these. When you read a LeakCanary trace, the top line is always a GC root.

**The symptom profile**, which is what makes leaks hard to catch: they rarely crash immediately. You see memory climbing across a session, increasingly frequent GC (which shows up as **jank**, not as a memory error), and eventually an `OutOfMemoryError` thrown at some unrelated allocation — often a bitmap decode — far from the actual cause. The stack trace of an OOM points at the victim, never the culprit.

**Why Android makes it worse than a typical JVM application:** an `Activity` retains its full view hierarchy and bitmaps, so one leaked Activity is megabytes, not kilobytes. And configuration changes recreate the Activity, so a single leak path accumulates **one leaked instance per rotation**.

**The one rule that prevents nearly all of them:** never let an object with a **longer** lifetime hold a reference to one with a **shorter** lifetime. Static → Activity, singleton → View, process-lifetime thread → Fragment: every common leak is a violation of this.

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

**Why that example leaks so much:** a `TextView` holds `mContext` (the Activity) and `mParent` (its ViewGroup), so a static reference to one small view retains the **entire** Activity and view tree. It's a good illustration that leak severity has nothing to do with the size of the thing you leaked.

**Each cause, with the specific fix:**

**Inner classes** — a non-static inner class holds an implicit `this$0` to its outer instance. Harmless when short-lived; a leak when it outlives the Activity:

```kotlin
// Leaks: the queued Message holds the Handler, which holds the Activity
handler.postDelayed({ textView.text = "done" }, 60_000)

// Fix A: clear the queue
override fun onDestroy() { handler.removeCallbacksAndMessages(null); super.onDestroy() }

// Fix B (better): use a lifecycle-scoped coroutine — cancellation is automatic
lifecycleScope.launch { delay(60_000); textView.text = "done" }
```

**Unregistered listeners** — the fix is **symmetry**. Whatever you register in `onStart`, unregister in `onStop`; in `onCreate`, unregister in `onDestroy`. Mismatched pairs are both a leak and a duplicate-callback bug.

**Singletons with an Activity context** — pass `applicationContext`, or better, inject the dependency so the singleton never receives a UI context at all.

**Beyond the four listed**, the ones that come up most in real code:

- **Fragment view bindings** not nulled in `onDestroyView` — the Fragment instance outlives its view.
- **`LiveData` observed with `this`** instead of `viewLifecycleOwner` in a Fragment.
- **A `ViewModel` holding a `Context`, `View`, or `NavController`.**
- **`GlobalScope.launch`** capturing UI state — it is never cancelled.
- **Custom listener interfaces** on a long-lived service or repository that are set but never cleared.

**A nuance worth raising:** not every retained object is a leak. A deliberate cache is "retained but intentional." The question is always whether the retention is *intended and bounded*.

## 3. How do you detect and fix memory leaks?
You can use Android Studio's **Memory Profiler** to take a heap dump and inspect object allocations. The industry standard library is **LeakCanary**, which automatically detects and notifies you of memory leaks during development.

**A workflow that actually finds them**, rather than hoping a tool tells you:

**1. LeakCanary in debug builds** — the default net. One dependency, no code, and it reports automatically with a reference path. This catches most leaks during normal development.

**2. The Memory Profiler for the ones LeakCanary won't see** — it only watches Activities, Fragments, views, `ViewModel`s, and `Service`s. For anything else (your own presenter, a cache growing unbounded), you need a heap dump:

```
1. Open the suspect screen
2. Navigate away so it should be destroyed
3. Repeat 3–5 times (or rotate repeatedly)
4. Press "Force GC" (the bin icon)
5. Capture a heap dump
6. Filter by the class name
→ More than one live instance = leak
7. Select it → "References" → trace the path back to a GC root
```

**3. Sort by retained size**, not shallow size, when asking "what is using my memory?" — see the shallow/retained distinction, since an Activity's shallow size is trivial while its retained size is the whole screen.

**Fixing** follows a consistent shape once you have the reference path: find the **last link before the leaked object** — that is where something long-lived grabbed something short-lived — and break it by either

- **nulling the reference** at the right lifecycle callback (`onDestroyView`, `onDestroy`),
- **unregistering** the listener symmetrically,
- **scoping the work** (`viewModelScope`, `lifecycleScope`, `repeatOnLifecycle`), or
- **changing what's held** — an `applicationContext` instead of an Activity, an ID instead of an object.

**Verify the fix**, don't assume it: repeat the heap-dump steps and confirm zero retained instances. Leaks are easy to "fix" in a way that moves the reference rather than removing it.

**For production**, LeakCanary is debug-only, so you rely on OOM rates in Crashlytics and memory metrics in Play Console vitals to tell you a leak exists in the wild — then reproduce it locally.

## 4. What is LeakCanary and how does it work?
LeakCanary is an open-source library by Square. It hooks into the Android Lifecycle. When an Activity or Fragment is destroyed, LeakCanary passes a `WeakReference` of it to a background queue. If the reference is not cleared after garbage collection, LeakCanary dumps the heap and analyzes the shortest strong reference path preventing garbage collection.

**Why a `WeakReference` is the right detector.** A weak reference does not prevent collection, so after a GC it should be cleared automatically. If it still holds its referent, something **strong** must be pointing at the object — which is exactly the definition of a leak. It's an elegant test because it requires no heuristics.

**The full sequence:**

1. Register lifecycle callbacks (automatically, via a `ContentProvider` that runs before `Application.onCreate` — which is why there's no setup code).
2. On destruction, wrap the object in a `WeakReference` and add it to a watch queue.
3. Wait ~5 seconds, then trigger GC.
4. If the reference is uncleared, it's a leak candidate.
5. Dump the heap to an `.hprof` file.
6. **Shark** (LeakCanary's own heap analyser, written in Kotlin and running on-device) computes the **shortest strong path from a GC root** to the object.
7. Notify, with the trace.

```groovy
debugImplementation 'com.squareup.leakcanary:leakcanary-android:2.14'
```

**`debugImplementation` is essential** — heap dumping freezes the app for seconds and writes large files, which must never reach users.

**Reading the trace** is the skill being tested. Each link is annotated `UNKNOWN`, `NO` (definitely not leaking) or `YES` (definitely leaking), and the culprit is the **last `UNKNOWN` before the first `YES`**:

```
┬─── GC Root: static field
├─ com.example.MySingleton class
│    ↓ static MySingleton.instance
├─ com.example.MySingleton instance
│    ↓ MySingleton.context                     ← fix here
╰→ com.example.MainActivity instance
     Leaking: YES (Activity#mDestroyed is true)
```

**Extending it to your own objects** is a frequently-missed capability:

```kotlin
AppWatcher.objectWatcher.expectWeaklyReachable(presenter, "Presenter was detached")
```

**Its limits:** debug-only, so it never sees user devices; it watches only objects you've told it about; and it reports *reachability*, so deciding whether a retained object is a bug or an intentional cache is still your judgement.

## 5. What is the Garbage Collector (GC)?
A background process in the Dalvik/ART virtual machine that reclaims memory occupied by objects that are no longer in use (unreachable objects) to make room for new allocations.

**The algorithm is mark-and-sweep over reachability**, not reference counting. Starting from the GC roots (static fields, thread stacks, JNI references), it marks everything reachable; everything unmarked is garbage. This is why **reference cycles are collected correctly** — two objects pointing at each other with nothing else pointing at them are both unreachable.

**ART's collector is generational**, which is the detail that explains most performance advice:

- **Young generation** — where new objects are allocated. Most objects die young (the "generational hypothesis"), so collecting here is cheap and frequent.
- **Old generation** — objects that survived several young collections. Collected rarely and more expensively.

So allocating many short-lived objects is relatively cheap *per object* but fills the young generation fast, triggering frequent minor collections — which is precisely why allocation in `onDraw` causes jank.

**Pause behaviour**, and how it changed:

- **Dalvik** — stop-the-world mark-and-sweep, 50–100 ms pauses. Several dropped frames at a time.
- **ART** — concurrent, mostly-copying collector with pauses typically **under 1 ms**, plus compaction that reduces fragmentation.

So the modern problem is rarely one long pause; it's **allocation cost plus many small pauses**, which is a death-by-a-thousand-cuts pattern.

**What you can and can't control.** You cannot force a GC — `System.gc()` is a *suggestion* and calling it is almost always wrong (it can make things worse by forcing an unnecessary full collection). What you *can* control is allocation rate, which is the real lever:

```kotlin
// Allocates per frame — fills the young gen, triggers GCs
override fun onDraw(canvas: Canvas) { canvas.drawRect(RectF(...), Paint()) }

// Zero allocation in the hot path
private val rect = RectF(); private val paint = Paint()
override fun onDraw(canvas: Canvas) { canvas.drawRect(rect, paint) }
```

**Finalizers are a trap** worth mentioning: objects with `finalize()` require two GC cycles and are queued on a finalizer thread, so they delay collection and can cause `TimeoutException` crashes. Use explicit `close()` and Kotlin's `use { }` instead.

**Heap limits vary by device** — typically 128–512 MB. `Runtime.getRuntime().maxMemory()` tells you yours, and `android:largeHeap="true"` raises it at the cost of longer GC pauses.

## 6. What is the difference between Dalvik and ART?
- **Dalvik**: The older Android VM (pre-Lollipop). It used Just-In-Time (JIT) compilation, compiling bytecode to machine code every time the app ran, making it slower and draining more battery.
- **ART (Android Runtime)**: The modern VM. It originally used Ahead-Of-Time (AOT) compilation (compiling everything upon install), but now uses a hybrid JIT/AOT profile-guided optimization for faster startup and better battery life.

**The three-stage history** is the real answer, and the third stage is the one that matters today:

**1. Dalvik (Android 1.0–4.4) — pure JIT.** Bytecode was interpreted, and hot methods were compiled to machine code at runtime. Compilation work was repeated on **every app launch**, so startup was slow and battery suffered. It was also register-based with its own DEX format, which was a genuine improvement over stack-based JVM bytecode for mobile.

**2. ART in Android 5.0 — pure AOT.** Everything was compiled at **install time** by `dex2oat`. Execution was fast with no runtime compilation cost, but the trade-offs were severe: installs took minutes, the compiled `.odex` files bloated storage substantially, and an OS update meant recompiling every app on the device — the infamous "Optimizing app 47 of 312" boot screen.

**3. ART from Android 7.0 (Nougat) — hybrid, profile-guided.** This is the modern design and the one to describe:

- The app **starts interpreted**, with JIT compiling hot methods.
- The runtime **records a profile** of which methods are actually hot.
- When the device is **idle and charging**, it AOT-compiles just those methods using that profile.
- Subsequent launches use the precompiled code.

The result is fast installs, modest storage use, *and* fast steady-state execution — you only pay AOT cost for code that genuinely matters.

**The practical connection to your job: Baseline Profiles.** The weakness of profile-guided compilation is that the profile doesn't exist yet on **first launch** — exactly when users judge your app. A Baseline Profile is a profile you generate in CI and **ship in the APK**, so ART can AOT-compile your startup and scrolling paths at install time. Typical gains are 20–30% faster startup and less first-run jank. Cloud Profiles extend this by aggregating real user profiles through Play.

**Also worth knowing:** ART brought a far better GC (concurrent, compacting), better debugging and profiling support, and since Android 12 it is a **Mainline module**, updated through Play System Updates independently of OS releases.

## 7. What is App Startup time and how do you optimize it?
App startup can be Cold (app starting from scratch), Warm (process running but Activity needs recreation), or Hot (bringing the app to foreground).
Optimizations:
- Defer heavy initializations in `Application.onCreate()` to a background thread.
- Use the **App Startup** Jetpack library to manage dependencies.
- Avoid deep/complex View hierarchies on the initial screen.

**What a cold start actually consists of** — knowing the sequence tells you where to optimise:

1. Zygote forks a new process.
2. The `Application` object is created; `attachBaseContext` then `onCreate` run.
3. **Every `ContentProvider` in the manifest is initialised** — including the ones SDKs add invisibly.
4. The Activity is created, the layout inflated, measured, laid out, drawn.
5. **First frame drawn** — this is what's measured.

Play's thresholds are roughly **5 s cold / 2 s warm / 1.5 s hot** before a start is flagged as excessive in vitals.

**Baseline Profiles are the highest-leverage single fix** and deserve first mention: shipping a profile lets ART AOT-compile your startup path at install time instead of interpreting it, typically 20–30% faster. Generate it with Macrobenchmark rather than writing it by hand.

**Then, in rough order of impact:**

- **Audit `Application.onCreate`.** It blocks every cold start. Move SDK initialisation to first use, or to a background thread, and measure what each line costs.
- **Audit `ContentProvider` initialisers.** Analytics, crash reporting, and ad SDKs each add one. App Startup consolidates them into a single provider with declared dependency ordering:

```kotlin
class AnalyticsInitializer : Initializer<Analytics> {
    override fun create(context: Context) = Analytics.init(context)
    override fun dependencies() = listOf(LoggerInitializer::class.java)
}
```

- **Remove disk I/O from startup** — `SharedPreferences` reads, file checks, database opens. These are invisible on a fast test device and brutal on a slow one.
- **Use the `SplashScreen` API** rather than a dedicated splash Activity, which adds an entire extra Activity launch to the critical path.
- **Lazy-initialise** everything not needed for the first frame, with `by lazy` or `Provider<T>` injection.
- **Flatten the first screen's layout**, and prefer `ViewStub` for conditional sections.

**Measure, don't guess:**

```bash
adb shell am start -W -n com.example/.MainActivity     # TotalTime
```

Macrobenchmark with `StartupMode.COLD` gives reproducible numbers you can gate in CI; Play Console vitals shows what real users across real devices experience. The common failure here is optimising on a flagship — always verify on a low-end device.

## 8. What is Overdraw?
Overdraw occurs when the system draws a pixel on the screen multiple times in a single frame (e.g., drawing a background on an Activity, then a background on a ViewGroup, then a background on a TextView on top of each other). It wastes GPU resources.

**Why it costs anything at all**, since GPUs are fast: the GPU has finite **fill rate** — pixels it can write per second. Overdraw multiplies the pixels written per frame. On a 1080p screen that's 2 million pixels; at 4× overdraw you're writing 8 million per frame, 60+ times a second. On low-end GPUs this alone can push a frame past budget, and it burns battery even when it doesn't.

**A concrete example of how it accumulates:**

```xml
<!-- Layer 1: the theme's windowBackground paints the whole screen -->
<LinearLayout android:background="@color/white">       <!-- Layer 2 -->
    <CardView android:background="@color/white">        <!-- Layer 3 -->
        <TextView android:background="@color/white" />  <!-- Layer 4 -->
    </CardView>
</LinearLayout>
```

Four full-screen paints where one would do — and the user sees exactly the same white.

**The colour key** in Developer Options → Debug GPU Overdraw:

- **No colour** — drawn once. Ideal.
- **Blue** — 2×. Fine.
- **Green** — 3×. Acceptable in places.
- **Pink** — 4×. Investigate.
- **Red** — 5×+. Fix it.

The realistic target is "mostly blue with some green," not "no colour anywhere" — a little overdraw is unavoidable and harmless.

**An important nuance:** overdraw is only wasteful when the lower layer is **fully covered and opaque**. Transparency and partial coverage require the layers. So the fix is never "remove all backgrounds" — it's "remove backgrounds that are completely hidden."

**Its relevance has decreased somewhat** in Compose, where there's no XML background inheritance chain to accumulate accidentally, and in modern layouts that use a single themed surface. It remains a real issue in older View-based codebases with deeply nested styled containers.

## 9. How do you detect and fix Overdraw?
You can turn on "Debug GPU Overdraw" in Developer Options. Fix it by removing unnecessary `android:background` attributes from layouts, especially if they are completely covered by child views.

**The fixes, in order of how much they typically win:**

**1. Remove the window background when your layout covers it.** This is the biggest single win because it's a *full-screen* layer:

```xml
<style name="AppTheme" parent="Theme.Material3.DayNight">
    <item name="android:windowBackground">@null</item>
</style>
```

Be careful: the window background is also what's shown during the startup transition, so removing it can produce a flash of black. The usual compromise is a `windowBackground` that matches your content, removed only on screens that paint immediately.

**2. Delete redundant backgrounds from nested containers.** If a child fully covers its parent with an opaque background, the parent's is wasted.

**3. Use `canvas.clipRect()` in custom views** so you don't draw outside what's visible:

```kotlin
override fun onDraw(canvas: Canvas) {
    canvas.save()
    canvas.clipRect(visibleBounds)      // skip pixels that will be covered anyway
    drawContent(canvas)
    canvas.restore()
}
```

**4. Avoid stacked translucent layers** — each one forces blending, which cannot be skipped.

**5. Flatten the hierarchy**, which usually removes background layers as a side effect.

**6. `setWillNotDraw(true)`** on a `ViewGroup` that draws nothing itself, so the system skips its draw pass entirely.

**Measuring beyond the colour overlay:**

- **Profile GPU Rendering** (also in Developer Options) shows per-frame bar charts with a budget line — the orange/red segments indicate GPU-side cost.
- **System Trace** in the CPU Profiler gives exact numbers rather than impressions.
- **GPU inspectors** (AGI) for deep GPU analysis, rarely needed in app work.

**The judgement to voice:** overdraw is worth fixing when you can see red over large areas on a low-end device, and worth ignoring when it's a little blue. Chasing zero overdraw by stripping backgrounds can produce visual regressions and theming bugs for no measurable gain. Measure the frame time, not the colours.

## 10. What is View hierarchy flattening?
Deeply nested view hierarchies (e.g., `LinearLayout` inside `RelativeLayout` inside `ScrollView`) take exponentially longer to measure and lay out. Flattening means replacing them with a single `ConstraintLayout`, which optimizes measurement into a single pass.

**Why depth is so expensive:** measure and layout are **recursive**, so each level walks all its children. The genuinely exponential cases are specific:

- **`LinearLayout` with `layout_weight`** measures its children **twice** — once to find their natural sizes, once to distribute the remaining space. Nest three of those and you have 2³ = 8 measure passes for the innermost views.
- **`RelativeLayout`** always does two passes, for the same reason (positions depend on siblings).

Nest weighted `LinearLayout`s inside `RelativeLayout`s and the multiplication is real, not theoretical.

**`ConstraintLayout` solves it by being flat.** It expresses complex relationships — centring, chains, ratios, barriers, guidelines — without nesting, and resolves them in a single measurement pass using a constraint solver:

```xml
<!-- 4 levels deep, weighted → multiple measure passes -->
<RelativeLayout>
  <LinearLayout android:orientation="vertical">
    <LinearLayout android:orientation="horizontal" android:weightSum="2">
      <TextView android:layout_weight="1" />
      <TextView android:layout_weight="1" />
    </LinearLayout>
  </LinearLayout>
</RelativeLayout>

<!-- 1 level, same result -->
<androidx.constraintlayout.widget.ConstraintLayout>
    <TextView app:layout_constraintHorizontal_weight="1" ... />
    <TextView app:layout_constraintHorizontal_weight="1" ... />
</androidx.constraintlayout.widget.ConstraintLayout>
```

**Other flattening tools** worth naming: `<merge>` (eliminates a redundant wrapper when including a layout), `ViewStub` (defers inflation of rarely-shown views entirely), and `ConstraintLayout`'s `Group`/`Barrier`/`Guideline` which replace helper containers.

**Where to care most:** `RecyclerView` item layouts. They're inflated and measured constantly during scrolling, so depth there is multiplied by the number of visible items and by scroll frequency. A flat item layout is one of the highest-value optimisations in a list-heavy app.

**Two honest caveats.** First, `ConstraintLayout` is not automatically faster for *simple* layouts — a flat `LinearLayout` with three children is cheaper than the solver. Flattening pays off when it removes nesting, not as a blanket rule. Second, **Compose changes the calculus entirely**: its single-pass measurement makes nesting cheap by design, so "flatten your hierarchy" is largely a View-system concern.

**Inspect with the Layout Inspector**, which shows depth and lets you see exactly where nesting accumulated.

## 11. What is the 16ms rule (60 FPS)?
For a fluid user experience, the app must render at 60 frames per second (FPS). This means the system has exactly 16.6 milliseconds (1000ms / 60) to measure, layout, and draw every single frame. If you take longer (e.g., doing heavy work on the UI thread), the app skips frames ("Jank").

**The budget is tighter than 16 ms on modern hardware**, and saying so is a good update to a dated rule:

- **60 Hz** → 16.6 ms
- **90 Hz** → 11.1 ms
- **120 Hz** → 8.3 ms

High-refresh displays are now common even mid-range, so "16 ms" understates the constraint. Worse, you don't get the whole window — the system needs part of it, so your realistic budget is smaller still.

**What has to fit in that window** is *everything on the main thread*, not just rendering: measure, layout, draw, plus any click handler, data binding, JSON parsing, `onBindViewHolder`, or GC pause that happens to land in the same frame. A 10 ms parse is nearly a whole frame at 120 Hz.

**How the pipeline works:** `Choreographer` receives a **VSYNC** signal from the display and schedules `performTraversals()` — measure → layout → draw. The resulting display list goes to the **RenderThread**, which issues GPU commands. Missing the deadline means the previous frame is shown again, which the user perceives as stutter.

**Jank is about *consistency*, not average frame rate.** A steady 45 fps feels far better than 60 fps that drops to 20 every second. This is why average FPS is a poor metric and why tools report **percentage of janky frames** and **95th/99th percentile frame time** instead.

**Two definitions Play uses in vitals:**

- **Slow frames** — over 16 ms. Flagged above 25% of frames.
- **Frozen frames** — over **700 ms**. Flagged above 0.5%. These are what users describe as "the app froze."

**The practical implications:**

- Never do I/O, parsing, or heavy computation on the main thread.
- Avoid allocation in `onDraw` and `onBindViewHolder` — GC pauses land inside frames.
- Keep layouts flat; avoid `requestLayout()` during scroll.
- Measure with **System Trace**, **JankStats** (production), or **Macrobenchmark** (CI), all of which account for the actual refresh rate rather than assuming 60 Hz.

## 12. What is `RecyclerView` and why is it efficient?
Unlike `ListView` which creates a new View for every item in a list, `RecyclerView` creates only enough views to fill the screen (plus a few extra). As the user scrolls, views that scroll off-screen are "recycled" and rebound with new data, drastically saving memory and CPU.

**Strictly, `ListView` did recycle too** — via `convertView` in `getView()`. The difference is that `ListView` made recycling **optional and easy to get wrong**, while `RecyclerView` makes it **mandatory and structural**. The `ViewHolder` pattern was a convention you could ignore in `ListView` (and many did, calling `findViewById` on every bind); in `RecyclerView` it's enforced by the API.

**What RecyclerView adds beyond that:**

- **Enforced ViewHolder** — no repeated `findViewById`, which was a major `ListView` cost.
- **Pluggable `LayoutManager`** — linear, grid, staggered, or custom. `ListView` could only do a vertical list.
- **`ItemAnimator`** — insert/remove/move animations for free.
- **`ItemDecoration`** — dividers and spacing without polluting item layouts.
- **Fine-grained notifications** — `notifyItemInserted/Removed/Changed` instead of rebuilding everything.
- **`DiffUtil`** — computes a minimal diff off the main thread.
- **Prefetching** — the `LayoutManager` creates and binds the next item during idle time *before* it's needed, using otherwise-wasted frame time. This is a genuine advantage `ListView` never had.
- **A shareable `RecycledViewPool`** across multiple lists.

**The multi-level cache** is worth knowing, because it explains why views sometimes rebind and sometimes don't:

1. **Scrap/attached cache** — views currently on screen, reused without rebinding.
2. **Cache** (`setItemViewCacheSize`, default 2) — recently detached views, reused **without rebinding** if the same position returns. This is why a small scroll back up is instant.
3. **RecycledViewPool** — views by type, reused **with rebinding**.
4. **Create new** — only when all else fails.

```kotlin
class UserAdapter : ListAdapter<User, VH>(DIFF) {
    override fun onCreateViewHolder(parent: ViewGroup, type: Int) = VH(...)   // rare
    override fun onBindViewHolder(holder: VH, position: Int) {                // frequent
        holder.bind(getItem(position))     // keep this under ~1 ms
    }
}
```

**The performance rule that follows:** `onCreateViewHolder` is called rarely, `onBindViewHolder` constantly. Put expensive setup in the former, and keep the latter to assigning already-prepared values — no formatting, no I/O, no allocation.

**In Compose**, `LazyColumn` is the equivalent, with `key` playing the role of stable IDs.

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

**The reference strengths**, in order: **strong** (never collected while reachable) → **soft** (collected only under memory pressure) → **weak** (collected at the next GC) → **phantom** (post-mortem cleanup only).

**The mandatory discipline is the null check.** `get()` can return `null` at any time, including between two consecutive calls. The pattern above is correct because it stores the result in a local; calling `get()` twice and assuming both succeed is a race:

```kotlin
// Wrong — the referent can be collected between the two calls
if (ref.get() != null) { ref.get()!!.doSomething() }

// Right
val activity = ref.get() ?: return
activity.doSomething()
```

**The important judgement — and what distinguishes a strong answer:** `WeakReference` usually treats the **symptom**, not the cause. If you need one to stop an Activity leaking, the deeper problem is that something long-lived is referencing UI at all. The structural fixes are better because they also stop pointless work from running:

```kotlin
// Weak reference: the leak is gone, but the Handler still fires and does nothing
class MyHandler(activity: Activity) : Handler(...) { private val ref = WeakReference(activity) }

// Better: the work itself is cancelled with the lifecycle
lifecycleScope.launch { delay(60_000); updateUi() }
```

**Where weak references are genuinely the right tool:**

- **Listener registries** in library code, where the registry shouldn't dictate subscriber lifetime.
- **`WeakHashMap`** — caches keyed by objects whose lifetime you don't control.
- **Framework code** that must hold a callback without owning it.

**And where they are not:** as a general caching mechanism. Use `LruCache`, which gives you an explicit bounded size rather than leaving eviction to GC timing. `SoftReference` is specifically discouraged on Android for caching — ART's clearing behaviour is unpredictable and it can wipe the entire cache at once.

## 14. What is a Bitmap in Android and why is it problematic?
A Bitmap represents an image in memory. They are problematic because they consume massive amounts of RAM. A single 1080p image in ARGB_8888 format consumes ~8MB of RAM. Loading large bitmaps can instantly cause an OOM exception.

**The formula is `width × height × bytesPerPixel`**, and the configs are:

- **`ARGB_8888`** — 4 bytes/px. The default; full colour with alpha.
- **`RGB_565`** — 2 bytes/px. No alpha, slight banding on gradients. **Halves memory.**
- **`ALPHA_8`** — 1 byte/px. Masks only.
- **`HARDWARE`** (API 26+) — lives in **graphics memory**, not the Java heap. Best for display; you cannot read its pixels.

So 1920 × 1080 × 4 ≈ **8.3 MB**, and a 12-megapixel camera photo (4000 × 3000) is **48 MB** — enough to OOM on its own against a 128 MB heap.

**The trap is the compression ratio.** A 3 MB JPEG becomes 48 MB decoded. People size their caches and their expectations on the *file* size and are then surprised by the memory. JPEG/PNG compression doesn't exist in RAM — a bitmap is a raw pixel array.

**Why OOM from bitmaps looks random:** the allocation that finally fails is usually not the one at fault. A slow leak or an oversized cache consumes the heap, and then an ordinary bitmap decode throws. The stack trace points at the decode, which is the victim.

**The practical safeguards:**

1. **Always downsample at decode time** — `inJustDecodeBounds` to read dimensions, then `inSampleSize` (see the next question). Powers of two are most efficient.
2. **`RGB_565` for opaque images** where quality allows.
3. **Use Coil or Glide** rather than hand-rolling, because they also pool bitmaps, cancel on recycle, and cache correctly.
4. **`BitmapRegionDecoder`** for very large images where you display only part — maps, documents, panoramas.
5. **Avoid `android:largeHeap="true"`** as a fix. It raises the ceiling without addressing the cause, and lengthens GC pauses.

**On `recycle()`:** it was essential before Android 3.0, when pixel data lived in native memory invisible to the GC. Since then the data is on the Java heap and collected normally, so calling `recycle()` manually is usually unnecessary and risks `Canvas: trying to use a recycled bitmap`. This is one of the most common pieces of outdated advice still repeated.

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

**The two-pass decode** is what "downsample at decode time" means in practice, and it's worth being able to write:

```kotlin
fun decodeSampled(path: String, reqW: Int, reqH: Int): Bitmap {
    // Pass 1: dimensions only — allocates no pixel memory
    val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(path, opts)

    // Compute a power-of-two sample size
    var sample = 1
    while (opts.outHeight / sample > reqH && opts.outWidth / sample > reqW) sample *= 2

    // Pass 2: decode scaled
    opts.inSampleSize = sample
    opts.inJustDecodeBounds = false
    return BitmapFactory.decodeFile(path, opts)!!
}
```

The critical property: `inSampleSize` reduces **each dimension**, so memory falls by the **square**. `inSampleSize = 4` is a 16× saving — 48 MB becomes 3 MB.

**Why to use a library anyway**, even though the above is only 10 lines: the hand-rolled version handles decoding and nothing else. A production image pipeline also needs

- **asynchronous loading** without blocking the main thread,
- **cancellation** when the view is recycled or detached (otherwise a `RecyclerView` shows the wrong image in a reused row — a correctness bug, not just a performance one),
- **memory and disk LRU caching**,
- **request deduplication** for the same URL,
- **bitmap pooling** to reduce GC churn during scrolling,
- **lifecycle awareness** so navigating away stops the work.

Getting all of that right is substantially harder than the decode itself.

```kotlin
// Coil — Kotlin-first, coroutines, OkHttp, small
imageView.load(url) {
    crossfade(true)
    placeholder(R.drawable.ph)
    size(200, 200)                 // decode to exactly what's needed
}

// Compose
AsyncImage(model = url, contentDescription = null, modifier = Modifier.size(100.dp))
```

**Coil vs. Glide:** Coil is Kotlin-first, coroutine-based, noticeably smaller, and integrates naturally with Compose. Glide is older, Java-based, has broader format support (GIF, video frames) and a very mature bitmap pool. Either is a defensible choice; Coil is the natural default for new Kotlin/Compose work.

## 16. What is ProGuard / R8?
R8 (the modern successor to ProGuard) shrinks and obfuscates the code during the release build.
- **Shrinking**: Removes unused classes and methods, reducing APK size.
- **Obfuscation**: Renames classes and variables to `a.b.c`, making reverse engineering difficult.

**R8 replaced ProGuard as the default from AGP 3.4**, and the architectural difference matters: ProGuard was a separate pass over class files, after which D8 produced DEX. R8 **merges shrinking, optimisation, obfuscation and dexing into one pass**, which is both faster and produces smaller output. It intentionally reads the same `proguard-rules.pro` syntax, so migrating was a no-op for most projects.

**The four jobs, in the order R8 does them:**

1. **Shrinking** — tree-shaking from entry points (manifest components and anything matched by `-keep`) to determine reachability; everything unreachable is dropped.
2. **Optimisation** — inlining, dead-branch removal, class merging, devirtualisation, enum unboxing, constant propagation.
3. **Obfuscation** — renaming to `a`, `b`, `c`. This shrinks the string pool as well as hindering reverse-engineering.
4. **Dexing and desugaring** — producing the final DEX and backporting newer Java APIs to older devices.

```groovy
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true     // needs minifyEnabled — usage is derived from shrunk code
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                      'proguard-rules.pro'
    }
}
```

Use the **`-optimize`** variant of the default file; the plain one disables optimisations.

**Be realistic about obfuscation as security.** Renaming raises the effort of reverse-engineering; it does not prevent it. Tools like jadx recover readable structure, and strings, API endpoints, and logic remain visible. **Never treat obfuscation as protection for secrets** — API keys in your APK are extractable regardless. Keep secrets server-side.

**The operational cost is unreadable crash reports.** With obfuscation on, stack traces are meaningless unless you upload **`mapping.txt`** (from `build/outputs/mapping/release/`) to Play Console or Crashlytics, and keep the line-number attributes:

```proguard
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
```

**And the risk:** R8 reasons about *static* reachability, so reflection-based code is invisible to it — which is the subject of the next question, and the reason release builds can break when debug builds work.

## 17. What are ProGuard Rules (Keep rules)?
Sometimes R8 aggressively removes code it thinks is unused (especially if accessed via Reflection, like Gson models). You write `keep` rules in `proguard-rules.pro` to tell R8 not to touch specific classes.

```pro
# Example ProGuard rule
-keep class com.example.models.** { *; }
```

**Why reflection defeats R8:** it builds a reachability graph from static call sites. A class only ever instantiated by `Gson.fromJson(json, User::class.java)` has no static references to its constructor or fields, so R8 concludes they're unused — and removes or renames them. The JSON then parses into an object with null fields, or throws. **This only happens in release builds**, which is what makes it so painful.

**What typically needs rules:**

- Model classes used by reflection-based JSON parsing (Gson especially)
- Classes referenced only from XML — custom `View`s, `Fragment` names, `Preference`s
- Methods called from JNI
- `Parcelable` `CREATOR` fields
- Enums used with `valueOf()`
- Anything loaded by `Class.forName()`

```proguard
# Keep model classes and their fields intact
-keep class com.example.model.** { *; }

# Keep native methods and their enclosing class names
-keepclasseswithmembernames class * { native <methods>; }

# Keep Parcelable CREATORs
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# Keep custom views inflated from XML
-keep public class * extends android.view.View {
    public <init>(android.content.Context, android.util.AttributeSet);
}
```

**Know the difference between the keep variants**, which is a good discriminator:

- **`-keep`** — don't remove *and* don't rename.
- **`-keepnames`** — may remove if unused, but don't rename what survives.
- **`-keepclassmembers`** — keep the listed members *if the class itself is kept*. Usually what you want, and narrower than `-keep`.
- **`-keepclasseswithmembers`** — keep classes that have the specified members.
- **`-dontwarn`** — suppress warnings about missing references, often needed for optional library dependencies.

**Keep rules are a cost, so keep them narrow.** `-keep class com.example.** { *; }` disables shrinking and obfuscation for your whole app — technically "works," and defeats the point. Target the specific classes that need it.

**Modern libraries ship their own rules** via `consumer-rules.pro`, so you rarely hand-write rules for Retrofit, Room, or Moshi any more. **The better fix is to avoid reflection**: kotlinx.serialization and Moshi codegen generate adapters at compile time, so R8 sees ordinary code and no rules are needed at all.

**Always test a release build before shipping** — this entire class of bug is invisible in debug.

## 18. What is strict mode?
A developer tool (`StrictMode`) that detects accidental disk or network access on the application's main thread, throwing logs or crashing the app intentionally to force the developer to fix the bottleneck.

**Two independent policies:**

- **`ThreadPolicy`** (per thread, normally the main one) — `detectDiskReads`, `detectDiskWrites`, `detectNetwork`, `detectCustomSlowCalls`, `detectResourceMismatches`, `detectUnbufferedIo`.
- **`VmPolicy`** (whole process) — `detectActivityLeaks`, `detectLeakedClosableObjects` (an unclosed `Cursor` or stream), `detectLeakedSqlLiteObjects`, `detectLeakedRegistrationObjects`, `detectFileUriExposure`, `detectCleartextNetwork`, `detectNonSdkApiUsage`.

Penalties: `penaltyLog()`, `penaltyFlashScreen()`, `penaltyDialog()`, `penaltyDeath()`, `penaltyDeathOnNetwork()`.

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

**Always guard with `BuildConfig.DEBUG`** — `penaltyDeath()` shipped to users turns a minor violation into a crash.

**Why it finds latent ANRs that testing misses:** main-thread disk and network work usually isn't *slow* in development. The emulator has an SSD, the test device is new, the file is in the page cache. The same code on a three-year-old phone with full storage takes an order of magnitude longer. StrictMode flags the **pattern** regardless of how fast it happened to be — it catches the ANR you haven't had yet.

**Adopting it in an existing codebase**, since `detectAll()` on a mature app produces a wall of violations:

1. Start with `penaltyLog()` and triage.
2. Fix the genuine problems; accept some (a single small startup read may be fine).
3. Wrap the accepted ones in `StrictMode.allowThreadDiskReads { }`, which documents the decision at the call site.
4. Then escalate to `penaltyDeath()` so new violations fail loudly in CI and local runs.

**A violation is information, not a verdict.** The value is that you now decide deliberately instead of discovering it from a production ANR report. Note also that `VmPolicy`'s leak detectors overlap with LeakCanary but catch different things — unclosed `Cursor`s and streams in particular.

## 19. What is a Memory Churn?
Occurs when you allocate a large number of temporary objects in a very short amount of time (e.g., inside an `onDraw()` loop). The Garbage Collector is forced to run repeatedly to clean them up, causing the app to freeze momentarily (Jank).

**Churn is distinct from a leak**, and the contrast is the clearest way to explain it:

- **A leak** — memory that is never freed. Total usage climbs steadily; eventually OOM.
- **Churn** — memory that is freed constantly. Total usage stays flat but the *graph sawtooths rapidly*, and the cost is CPU time and GC pauses, not exhaustion.

Churn never causes OOM. It causes **jank**, which is why it shows up as a rendering complaint rather than a memory one.

**Where it happens:** `onDraw`, `onBindViewHolder`, animation and scroll listeners, `onMeasure`, `onTouchEvent` (which fires on every move event), and any tight loop.

**The hidden allocations** are the hard part, because the obvious `Paint()` is easy to spot and these aren't:

- **Autoboxing** — `Map<String, Int>` boxes every value; `HashMap<Int, X>` boxes every key. Use `SparseArray`/`SparseIntArray` in hot paths.
- **String concatenation** — `"$a$b"` in a loop allocates a `StringBuilder` and a `String` each time.
- **Collection operator chains** — `list.map { }.filter { }` allocates an intermediate list per operator. `asSequence()` avoids it.
- **Capturing lambdas** — a lambda that captures a variable allocates; a non-capturing one is a singleton.
- **Iterators** — iterating an interface-typed collection allocates an `Iterator`; indexed loops over an `ArrayList` don't.
- **Varargs** — each call allocates an array.
- **Kotlin ranges and destructuring** in some positions.

```kotlin
// Churns: allocates on every frame, 60+ times a second
override fun onDraw(canvas: Canvas) {
    val paint = Paint().apply { color = Color.RED }
    canvas.drawRect(RectF(0f, 0f, w, h), paint)
}

// Clean: allocate once in init, mutate in place
private val paint = Paint().apply { color = Color.RED }
private val rect = RectF()
override fun onDraw(canvas: Canvas) { canvas.drawRect(rect, paint) }
```

**Finding it:** the **Memory Profiler's allocation tracking** while you scroll or animate, which attributes allocations to call sites. The timeline's sawtooth pattern plus frequent GC events is the signature.

**The judgement to voice:** this is a **hot-path** concern only. Avoiding allocation in setup code, in a click handler, or in a network callback is premature optimisation that makes code worse for no gain. Optimise where the code runs tens of times per second; leave the rest readable.

## 20. How do you optimize Network Performance?
1. Batch requests where possible.
2. Only request the data you actually need (GraphQL or partial endpoints).
3. Use GZIP compression (handled automatically by OkHttp).
4. Implement local caching (Room) to avoid unnecessary network calls.

**Why network optimisation matters disproportionately on mobile:** the radio is one of the biggest battery consumers, and it doesn't switch off the moment a request finishes — it stays in a high-power state for seconds afterwards (the **radio tail**). So **ten small requests spread over a minute cost far more battery than one larger request**, even for the same bytes. This is the single best justification for batching, and it's the point most answers miss.

**The full toolkit, grouped by what it saves:**

**Fewer requests**

- **Batch** related calls, and let `WorkManager` coalesce deferrable work into shared wake-ups.
- **Deduplicate** in-flight identical requests (image libraries do this; your repository should too).
- **Prefetch** predictable next pages during idle time.
- **FCM push instead of polling** — the single biggest battery win for "is there anything new?"

**Smaller payloads**

- **GZIP** — automatic in OkHttp, but confirm the server honours it.
- **Request only needed fields** — GraphQL, sparse fieldsets, or purpose-built endpoints.
- **Pagination** rather than fetching everything.
- **Efficient formats** — Protobuf over JSON where it's worth the tooling.
- **Right-sized images** — request a thumbnail URL rather than downloading 4K and scaling.

**Avoiding the request entirely**

- **HTTP caching** via OkHttp's `Cache` plus proper `Cache-Control` headers.
- **ETag / If-Modified-Since**, so unchanged resources return a 304 with no body.
- **Room as the single source of truth** — the UI reads the database, which the network updates. This also makes the app work offline.

**Better connections**

- **One shared `OkHttpClient`** so the connection pool and TLS sessions are reused. Creating a client per request is a common and expensive mistake.
- **HTTP/2** multiplexing, which OkHttp uses automatically when the server supports it.
- **Sensible timeouts** — including `callTimeout` for an end-to-end bound.
- **Retry with exponential backoff and jitter**, never a tight retry loop.

```kotlin
// Offline-first: the database is the source of truth, the network just updates it
fun observeUser(id: String): Flow<User> = dao.observe(id).onStart { refresh(id) }
```

**Respect the user's connection:** check `isActiveNetworkMetered` before large downloads, and use `NetworkType.UNMETERED` constraints in `WorkManager` for anything big. Measure with the **Network Profiler** locally and Firebase Performance Monitoring in production.

---
title: "Kotlin & Concurrency"
description: "Coroutines, Flows, Dispatchers, and asynchronous programming."
---

## 1. What are Coroutines in Android?
Coroutines are a concurrency design pattern used on Android to simplify code that executes asynchronously. They help manage long-running tasks that might otherwise block the main thread and cause the app to freeze.

```kotlin
viewModelScope.launch {
    // This coroutine runs asynchronously without blocking the UI thread
    val data = fetchNetworkData()
}
```

**The core idea: a coroutine suspends without blocking.** A blocked thread sits idle holding ~1 MB of stack and can do nothing else. A *suspended* coroutine releases its thread entirely — the thread goes off and runs other work, and the coroutine resumes later, possibly on a different thread. That's why you can run hundreds of thousands of coroutines on a handful of threads:

```kotlin
// 100,000 coroutines, a few threads, finishes in about a second
repeat(100_000) { launch { delay(1000); print(".") } }

// 100,000 threads — OutOfMemoryError
repeat(100_000) { thread { Thread.sleep(1000); print(".") } }
```

**How it works underneath** is worth knowing for a senior interview: the compiler transforms a `suspend` function into a **state machine** via CPS (continuation-passing style). Each suspension point becomes a state, and a hidden `Continuation` object carries the local variables across the pause. There is no magic thread — the coroutine is just a resumable object plus a scheduler.

**What this buys you on Android specifically:** asynchronous code reads top-to-bottom instead of as nested callbacks; cancellation is built in and propagates automatically; and scopes tie work to lifecycles so it stops when the screen goes away. The practical result is that the three classic Android concurrency bugs — callback hell, leaked `AsyncTask`s, and updating a dead UI — largely stop happening by construction.

They're a library (`kotlinx.coroutines`) built on one language feature (`suspend`), so they version independently of the platform and work the same on API 21 and API 35.

## 2. Why are Coroutines better than RxJava or AsyncTasks?
They are much more lightweight, simpler to read (asynchronous code looks sequential), natively integrated into Kotlin, and intrinsically lifecycle-aware when used with structured concurrency (like `viewModelScope`).

**Versus `AsyncTask`** (deprecated since API 30, and for good reason): it leaked constantly because a non-static inner `AsyncTask` holds its Activity, and a rotation mid-task meant updating a destroyed UI. It had no real cancellation (`cancel()` only set a flag), a confusing serial-vs-parallel executor history, and no composition — chaining two tasks meant starting one from the other's `onPostExecute`. Coroutines fix each of these structurally.

**Versus RxJava**, which is a fairer fight, since Rx is genuinely powerful:

- **Learning curve.** Rx has hundreds of operators and the "which of `flatMap`/`concatMap`/`switchMap`/`exhaustMap`?" problem. Coroutines use ordinary control flow — `if`, `for`, `try/catch` — so most of those operators are just code.
- **Readability.** Sequential async logic in Rx becomes nested `flatMap`s; in coroutines it's three consecutive lines.
- **Error handling.** `try/catch` works normally, instead of `onError` callbacks and the Rx rule that a stream terminates on error.
- **Cancellation.** Automatic via scopes, versus manual `CompositeDisposable` bookkeeping that you must remember to clear.
- **Overhead.** Coroutines are lighter in both memory and object allocation.

```kotlin
// RxJava
repository.getUser(id)
    .flatMap { user -> repository.getPosts(user.id) }
    .subscribeOn(Schedulers.io())
    .observeOn(AndroidSchedulers.mainThread())
    .subscribe({ posts -> render(posts) }, { e -> showError(e) })
    .addTo(disposables)                 // forget this → leak

// Coroutines
viewModelScope.launch {
    try {
        val user = repository.getUser(id)
        val posts = repository.getPosts(user.id)
        render(posts)
    } catch (e: Exception) { showError(e) }
}                                        // cancellation is automatic
```

**Be fair about where RxJava still wins**, which is what a good candidate adds: a richer set of battle-tested operators for complex event streams (`debounce`, `throttle`, `window`, `buffer` with elaborate variants), backpressure strategies, and a mature Java interop story. Flow has closed most of this gap, but Rx remains reasonable in a large existing Java codebase. For new Kotlin Android code, coroutines + Flow is the official recommendation and the ecosystem default — Room, Retrofit, WorkManager, DataStore, and Paging all expose suspend/Flow APIs natively.

## 3. What is a `suspend` function?
A function that can be paused (suspended) and resumed later. It can only be called from a coroutine or another `suspend` function.

```kotlin
suspend fun getUserData(): User {
    delay(1000) // Non-blocking delay
    return User("Alice")
}
```

**What the keyword actually compiles to.** `suspend` adds a hidden `Continuation` parameter and turns the body into a state machine:

```kotlin
suspend fun getUser(): User            // what you write
fun getUser(cont: Continuation<User>): Any?   // roughly what the compiler emits
```

The return type becomes `Any?` because the function can return either the real value *or* the marker `COROUTINE_SUSPENDED`, signalling "I've paused; resume me later through the continuation." This is why a suspend function can only be called from another suspend context — the continuation has to come from somewhere.

**The crucial misconception: `suspend` does not mean "runs on a background thread."** It means "can suspend." A suspend function runs on whatever dispatcher the caller is on, so this still freezes the UI:

```kotlin
suspend fun loadFile(): String {
    return File("big.txt").readText()   // BLOCKING call — ANRs on Dispatchers.Main
}
```

**The fix is the "main-safety" convention:** a suspend function should be safe to call from any dispatcher, and it achieves that by switching internally — never by making the caller remember to.

```kotlin
suspend fun loadFile(): String = withContext(Dispatchers.IO) {
    File("big.txt").readText()
}
// Caller can now just: val text = loadFile()
```

**Suspension points are where cancellation happens.** A coroutine can only be cancelled at a suspension point, so a tight CPU loop with no suspension ignores `cancel()` entirely. Use `ensureActive()` or `yield()` in long loops:

```kotlin
suspend fun process(items: List<Item>) = withContext(Dispatchers.Default) {
    items.forEach { item ->
        ensureActive()          // cooperative cancellation check
        heavyWork(item)
    }
}
```

**Converting callback APIs** to suspend functions uses `suspendCancellableCoroutine`, the standard bridge:

```kotlin
suspend fun getLocation(): Location = suspendCancellableCoroutine { cont ->
    val callback = LocationCallback { loc -> cont.resume(loc) }
    manager.request(callback)
    cont.invokeOnCancellation { manager.remove(callback) }   // honour cancellation
}
```

A `suspend` function marks a **potential** suspension — a function that never actually suspends is fine, just slightly wasteful.

## 4. What are Dispatchers in Coroutines?
Dispatchers determine which thread or thread pool the coroutine uses for its execution.
- `Dispatchers.Main`: For UI operations on the main thread.
- `Dispatchers.IO`: For network or disk operations.
- `Dispatchers.Default`: For heavy CPU computation.

```kotlin
launch(Dispatchers.IO) {
    // Network request here
}
```

**Why `IO` and `Default` are different sizes**, which is the real content of this question:

- **`Dispatchers.Default`** — pool size = number of CPU cores (minimum 2). Sized for **CPU-bound** work, because more threads than cores just adds context-switching overhead. Use for sorting, parsing, image processing, JSON serialisation, crypto.
- **`Dispatchers.IO`** — up to **64 threads** (or core count, whichever is larger). Sized for **blocking I/O**, where threads spend their time waiting rather than computing, so you want many of them. Use for network, disk, database, and any third-party blocking API.
- **`Dispatchers.Main`** — the Android main looper. UI updates only.
- **`Dispatchers.Unconfined`** — starts in the caller's thread and resumes in whatever thread the suspending function used. Mostly for library internals and tests; avoid in app code.

`IO` and `Default` **share a thread pool**, so `withContext(Dispatchers.IO)` from `Default` often doesn't involve an actual thread switch — just a change in the permitted concurrency limit. That makes switching cheaper than people assume.

**`Dispatchers.Main.immediate`** is a useful detail: it skips re-dispatching if you're already on the main thread, avoiding an unnecessary post to the message queue. `lifecycleScope` uses it by default.

**Limiting parallelism** is the modern answer to "I need my own dispatcher":

```kotlin
// Serialise access to a non-thread-safe resource — replaces newSingleThreadContext
val dbDispatcher = Dispatchers.IO.limitedParallelism(1)
```

This reuses the shared pool instead of creating dedicated threads, which `newFixedThreadPoolContext` did (and leaked, since you had to close it).

**Two practices that matter for testability:**

1. **Inject dispatchers, never hardcode them.** A class that calls `Dispatchers.IO` directly cannot be tested deterministically.

```kotlin
class Repository(private val io: CoroutineDispatcher = Dispatchers.IO) {
    suspend fun load() = withContext(io) { api.fetch() }
}
// In tests: Repository(StandardTestDispatcher())
```

2. **Don't dispatch what's already main-safe.** Retrofit `suspend` functions and Room `suspend` DAOs handle their own threading — wrapping them in `withContext(Dispatchers.IO)` is redundant.

## 5. How do you switch threads in Coroutines?
Use the `withContext(Dispatcher)` function. It suspends until the block completes on the specified dispatcher, then resumes on the original dispatcher.

```kotlin
suspend fun fetchAndShowData() {
    // Switch to IO thread for DB read
    val data = withContext(Dispatchers.IO) {
        db.readData()
    }
    // Automatically switches back to Main thread
    showOnUI(data) 
}
```

**`withContext` is sequential, not concurrent.** It suspends the current coroutine, runs the block elsewhere, and resumes with the result — the "automatically switches back" part is what makes callback-free async code read linearly. It returns the block's last expression, so it composes like any expression.

**Where to put the switch: push it down, not up.** The call site should not need to know what threading a function requires.

```kotlin
// Bad: every caller must remember the dispatcher
viewModelScope.launch {
    val user = withContext(Dispatchers.IO) { repo.getUser() }
}

// Good: the repository is main-safe, callers just call it
class Repo {
    suspend fun getUser(): User = withContext(Dispatchers.IO) { api.fetch() }
}
viewModelScope.launch { val user = repo.getUser() }
```

**Don't scatter switches inside a loop** — that's a context switch per iteration. Wrap the loop instead:

```kotlin
// Bad: N dispatches
items.forEach { withContext(Dispatchers.Default) { process(it) } }

// Good: one dispatch
withContext(Dispatchers.Default) { items.forEach { process(it) } }
```

**For parallel work, `withContext` is the wrong tool** — it's sequential. Use `async`:

```kotlin
// Sequential: 2 seconds
val user = withContext(io) { getUser() }      // 1s
val posts = withContext(io) { getPosts() }    // 1s

// Parallel: 1 second
coroutineScope {
    val user = async(io) { getUser() }
    val posts = async(io) { getPosts() }
    render(user.await(), posts.await())
}
```

**`withContext` vs. `launch(dispatcher)`:** `withContext` suspends and returns a value, keeping things sequential; `launch` starts a *new* child coroutine that runs concurrently and returns a `Job`. Using `launch` where you meant `withContext` is a common source of "my data isn't there yet" bugs.

**It respects cancellation and propagates exceptions normally** — an exception thrown inside the block surfaces at the `withContext` call site, so ordinary `try/catch` works. Note that `withContext(NonCancellable)` is the escape hatch for cleanup that must finish even after cancellation.

## 6. What is Structured Concurrency in Android?
It ensures that coroutines are not lost and don't leak memory. Every coroutine must be started in a specific `CoroutineScope`. When the scope is canceled (e.g., when a ViewModel is cleared), all coroutines running in that scope are automatically canceled.

**The principle: every coroutine has a parent, and a parent does not complete until all its children do.** This creates a tree in which work cannot escape its scope. Three guarantees follow, and they're the reason the whole model exists:

1. **No leaks** — cancelling a scope cancels every descendant, recursively.
2. **No lost work** — a parent waits for its children, so you can't accidentally return before the work finishes.
3. **No swallowed errors** — a failure propagates up to someone whose job it is to handle it, rather than vanishing into a thread.

```kotlin
// Unstructured: fire-and-forget, nothing cancels it, nothing waits for it
GlobalScope.launch { updateUi() }      // still running after the screen is gone

// Structured: dies with the ViewModel
viewModelScope.launch { updateUi() }
```

**`coroutineScope { }` is how you get structure inside a function.** It suspends until *all* children complete, so the function's contract is honest — when it returns, its work is genuinely done:

```kotlin
suspend fun loadAll(): Dashboard = coroutineScope {
    val user = async { getUser() }
    val feed = async { getFeed() }
    Dashboard(user.await(), feed.await())
}   // cannot return before both finish; if one throws, the other is cancelled
```

**The cancellation rules follow the tree:** cancelling a parent cancels all children; a child failing cancels the parent and therefore its siblings (unless a `SupervisorJob` intervenes — question 10); and `CancellationException` is treated specially, as normal control flow rather than an error.

**The practical rule for Android: never use `GlobalScope`.** It has no parent, so it is never cancelled, holds whatever it captured, and keeps running after the user leaves. Use the lifecycle-aware scopes (`viewModelScope`, `lifecycleScope`), or create one you own and cancel yourself:

```kotlin
class MyService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    override fun onDestroy() { scope.cancel(); super.onDestroy() }
}
```

For work that genuinely must outlive the screen — an upload the user started — the answer is `WorkManager`, not an unscoped coroutine.

## 7. What is `viewModelScope`?
A predefined `CoroutineScope` tied to the lifecycle of a `ViewModel`. It is automatically canceled when the `ViewModel` is cleared, preventing memory leaks and crashes.

```kotlin
class MyViewModel : ViewModel() {
    fun load() {
        viewModelScope.launch {
            // Safely perform work
        }
    }
}
```

**What it's made of:** `SupervisorJob() + Dispatchers.Main.immediate`, cancelled in `ViewModel.onCleared()`. Both halves matter:

- **`SupervisorJob`** — one failing coroutine doesn't take down the others, so a failed analytics call doesn't cancel your data load.
- **`Main.immediate`** — the body starts on the main thread, without an extra dispatch if you're already there. So UI state updates are safe by default, and you switch to `IO`/`Default` only for the work that needs it.

**Why it is the right default for data loading**, and the key contrast with `lifecycleScope`: a `ViewModel` survives configuration changes, so work started in `viewModelScope` **continues across a rotation**. The same work in `lifecycleScope` would be cancelled and restarted every time the user turns the phone — refetching data, resetting progress, and burning battery.

```kotlin
class UserViewModel(private val repo: UserRepo) : ViewModel() {
    private val _state = MutableStateFlow<UiState>(UiState.Loading)
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun load(id: String) {
        viewModelScope.launch {
            _state.value = UiState.Loading
            _state.value = try {
                UiState.Success(repo.getUser(id))     // repo is main-safe
            } catch (e: Exception) {
                UiState.Error(e.message)
            }
        }
    }
}
```

**Two practices worth mentioning:**

1. **Guard against duplicate launches.** A repeated button tap starts a second coroutine. Keep the `Job` and cancel it, or use a `MutableStateFlow` trigger with `flatMapLatest`:

```kotlin
private var loadJob: Job? = null
fun load() {
    loadJob?.cancel()
    loadJob = viewModelScope.launch { /* ... */ }
}
```

2. **Prefer declarative flows** over imperative launches where you can — `stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), initial)` handles subscription and lifetime for you.

**The boundary:** `viewModelScope` dies when the `ViewModel` is cleared — the user leaving the screen for good, or the Activity finishing. Work that must survive that (uploading a photo, syncing) belongs in `WorkManager`. Requires `androidx.lifecycle:lifecycle-viewmodel-ktx`.

## 8. What is `lifecycleScope`?
A predefined `CoroutineScope` tied to the lifecycle of an `Activity` or `Fragment`. It is automatically canceled when the Activity/Fragment is destroyed.

```kotlin
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycleScope.launch {
            // Cancelled when Activity is destroyed
        }
    }
}
```

**It is cancelled at `ON_DESTROY`** — which, for an Activity, includes **every configuration change**. That single fact determines when to use it:

- **Use `lifecycleScope`** for work genuinely tied to this UI instance: collecting a flow to update views, running an animation, waiting for a layout pass.
- **Use `viewModelScope`** for anything that shouldn't restart on rotation: network calls, database writes, business logic.

**In a Fragment, use `viewLifecycleOwner.lifecycleScope`, not `lifecycleScope`.** This is the most common mistake in this area. A Fragment's own lifecycle outlives its view (see the Fragment lifecycle question), so `lifecycleScope` keeps running after `onDestroyView` — and your collector then touches a destroyed view binding:

```kotlin
// Wrong — survives onDestroyView, touches a dead view
lifecycleScope.launch { viewModel.state.collect { binding.text.text = it } }

// Right — cancelled with the view
viewLifecycleOwner.lifecycleScope.launch {
    viewModel.state.collect { binding.text.text = it }
}
```

**Cancellation at destroy is not enough for flow collection**, because a collector keeps running while the app is merely *backgrounded*. Pair it with `repeatOnLifecycle` so collection stops at `ON_STOP` and restarts at `ON_START`:

```kotlin
viewLifecycleOwner.lifecycleScope.launch {
    repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.uiState.collect { render(it) }
    }
}
```

**Convenience builders** exist for one-shot work at a given state — `lifecycleScope.launchWhenStarted { }` and friends — but they are **deprecated** in favour of `repeatOnLifecycle`, because they *suspend* rather than *cancel* the coroutine when the lifecycle drops, which leaves resources held and upstream producers running.

The scope dispatches on `Dispatchers.Main.immediate`, so you're on the UI thread by default. Requires `androidx.lifecycle:lifecycle-runtime-ktx`.

## 9. How do you handle exceptions in Coroutines?
You can use standard `try/catch` blocks inside the coroutine, or attach a `CoroutineExceptionHandler` to the context.

```kotlin
viewModelScope.launch {
    try {
        val data = repo.getData()
    } catch (e: Exception) {
        // Handle network error
    }
}
```

**The first thing to get right: `launch` and `async` fail differently.**

- **`launch`** — an uncaught exception propagates **immediately** up to the parent and then to the `CoroutineExceptionHandler` (or crashes the app).
- **`async`** — the exception is **stored in the `Deferred`** and only rethrown when you call `await()`. An `async` whose result you never await can swallow a failure entirely.

```kotlin
// Exception surfaces here, at await — not where it was thrown
val deferred = async { throw IOException() }
try { deferred.await() } catch (e: IOException) { /* handled */ }
```

**`try/catch` must be inside the coroutine, not around the builder.** This is the classic mistake, because `launch` returns immediately:

```kotlin
// Useless — launch returns before the body runs
try { viewModelScope.launch { risky() } } catch (e: Exception) { }

// Correct
viewModelScope.launch { try { risky() } catch (e: Exception) { } }
```

**`CoroutineExceptionHandler` is a last-resort net**, not a replacement for `try/catch`. It only works when installed on the **scope or the root coroutine** — installing it on a child does nothing, because the exception has already propagated upward by then:

```kotlin
val handler = CoroutineExceptionHandler { _, e -> logger.report(e) }
val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main + handler)
```

**Never catch `CancellationException`.** It's how cancellation works, so swallowing it breaks structured concurrency — a cancelled coroutine keeps running. If you catch broadly, rethrow it:

```kotlin
try { work() }
catch (e: CancellationException) { throw e }     // must rethrow
catch (e: Exception) { handle(e) }
```

A common trap is `catch (e: Exception)` around a `withContext` block, which silently catches cancellation too.

**For Flows, use the `catch` operator**, since a `try/catch` around `collect` breaks the "exception transparency" rule:

```kotlin
repo.dataFlow()
    .catch { e -> emit(fallback) }      // catches upstream failures only
    .collect { render(it) }
```

**The architectural preference:** model expected failures as *values*, not exceptions — a sealed `Result`/`UiState` type — and reserve exceptions for genuinely unexpected conditions. This way the compiler forces the UI to handle the error case.

## 10. What is `SupervisorJob`?
In standard coroutines, if a child coroutine fails, it cancels its parent and all siblings. A `SupervisorJob` isolates failures, so if one child fails, the others continue running. `viewModelScope` uses a `SupervisorJob` under the hood.

```kotlin
val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
scope.launch { throw Exception("Fails") } // Doesn't crash other children
scope.launch { println("Runs fine") }
```

**Failure propagation is one-way under supervision.** With a regular `Job`, failure travels *both* up to the parent and *down* to siblings. With a `SupervisorJob`, it travels **down only** — a child's failure is its own business, while cancelling the parent still cancels every child.

```kotlin
// Regular Job: one failure kills the sibling
val scope = CoroutineScope(Job())
scope.launch { delay(100); throw IOException() }
scope.launch { delay(200); println("never printed") }

// SupervisorJob: the sibling survives
val scope = CoroutineScope(SupervisorJob())
scope.launch { delay(100); throw IOException() }
scope.launch { delay(200); println("printed") }
```

**When you want each behaviour:**

- **Supervision** for independent work sharing a scope — a screen where the user feed, the ad banner, and analytics all load separately. A failed banner shouldn't blank the feed. This is why `viewModelScope` and `lifecycleScope` both use it.
- **Regular `Job`** for all-or-nothing work — three parallel requests that are useless individually. Failing fast and cancelling the rest is correct, and it saves the wasted work.

**The trap that catches nearly everyone:** `SupervisorJob` only works when it is the **direct parent**. Passing it as a parameter to `launch` does nothing, because `launch` creates its own `Job` as the real parent:

```kotlin
// WRONG — the SupervisorJob isn't the parent of these children
scope.launch(SupervisorJob()) {
    launch { throw Exception() }      // still cancels its sibling
    launch { /* dies anyway */ }
}

// RIGHT — supervisorScope establishes supervision for its children
scope.launch {
    supervisorScope {
        launch { throw Exception() }
        launch { /* survives */ }
    }
}
```

**`supervisorScope { }` vs. `coroutineScope { }`** is the same distinction at function level: both wait for all children, but the supervisor version isolates their failures.

**One more subtlety:** under supervision, each child becomes responsible for its own exception, so an uncaught one goes to the `CoroutineExceptionHandler` rather than to the parent. Supervision prevents *cancellation* spreading — it does not make exceptions disappear. You still need `try/catch` per child.

## 11. What is Kotlin Flow?
Flow is an asynchronous data stream that sequentially emits values and completes normally or with an exception. It is the modern Kotlin alternative to RxJava's Observable.

```kotlin
fun getTimerFlow(): Flow<Int> = flow {
    for (i in 1..5) {
        delay(1000)
        emit(i) // Emits value every second
    }
}
```

**Flow is "a suspend function that returns multiple values."** A `suspend fun` gives you one result asynchronously; a `Flow` gives you a sequence of them over time, with the same suspension, cancellation, and structured-concurrency guarantees.

**Three parts to every flow:** a **builder** that produces values, zero or more **intermediate operators** that transform them, and a **terminal operator** that starts everything. Nothing runs until the terminal operator — this is what "cold" means.

```kotlin
flowOf(1, 2, 3)              // builder
    .map { it * 2 }          // intermediate — lazy, returns a Flow
    .filter { it > 2 }       // intermediate
    .collect { println(it) } // terminal — suspends, actually runs the pipeline
```

**Builders:** `flow { emit(...) }` for arbitrary logic, `flowOf(...)` for fixed values, `asFlow()` on collections and ranges, `channelFlow { }` when emissions come from multiple coroutines, and `callbackFlow { }` for bridging listener-based APIs:

```kotlin
fun locationFlow(): Flow<Location> = callbackFlow {
    val cb = LocationCallback { trySend(it) }
    manager.register(cb)
    awaitClose { manager.unregister(cb) }      // mandatory — cleanup on cancel
}
```

**Operators worth knowing cold:** `map`, `filter`, `transform`, `take`, `onEach`, `distinctUntilChanged`, `debounce`, `combine`, `zip`, `flatMapLatest` (cancel the previous inner flow — the right choice for search-as-you-type), `retry`/`retryWhen`, `catch`, `onStart`, `onCompletion`, and `stateIn`/`shareIn` for converting cold to hot.

```kotlin
searchQuery
    .debounce(300)                   // wait for a typing pause
    .filter { it.length > 2 }
    .distinctUntilChanged()
    .flatMapLatest { repo.search(it) }   // cancel the stale request
    .collect { render(it) }
```

**Two structural guarantees** often asked about: **context preservation** (a flow must emit from the context it was collected in — changing it requires `flowOn`, not a bare `withContext`, which throws) and **exception transparency** (upstream exceptions must be handled with the `catch` operator, not a `try/catch` wrapped around `emit`).

Flow is the standard return type across modern Android: Room queries, DataStore, WorkManager progress, and Paging all expose it.

## 12. What is the difference between Hot and Cold Streams?
- **Cold Stream (Flow)**: Starts emitting values *only* when an observer starts collecting it. The stream is created fresh for each collector.
- **Hot Stream (StateFlow, Channel)**: Emits values even if there are no collectors. Multiple collectors share the same stream.

**The analogy that makes it stick:** a cold flow is a *song file* — press play and it starts from the beginning, independently, for each listener. A hot flow is a *live radio broadcast* — it plays whether or not anyone tunes in, and everyone who tunes in hears the same thing from that moment on.

```kotlin
// COLD — the builder body runs once per collector
val cold = flow { println("producing"); emit(1) }
cold.collect { }    // prints "producing"
cold.collect { }    // prints "producing" AGAIN — separate execution

// HOT — one shared producer, independent of collectors
val hot = MutableStateFlow(0)
hot.value = 1       // happens whether or not anyone is collecting
```

**The practical consequences:**

- **Cold** — lazy (no work without a collector), independent per collector, and usually **not shared**. Each collection re-runs the pipeline, so three collectors on a cold network flow means **three network calls**. This is the surprise that catches people.
- **Hot** — active regardless of collectors, shared by all of them, and **stateful or lossy**: a late collector misses earlier emissions (unless there's a replay buffer).

**Converting cold to hot** is the common real-world need — you have a cold repository flow but several UI collectors, and you want one upstream execution shared between them:

```kotlin
val uiState: StateFlow<UiState> = repo.observeUser()   // cold
    .map { it.toUiState() }
    .stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),   // stop 5s after last collector
        initialValue = UiState.Loading
    )
```

`SharingStarted.WhileSubscribed(5000)` is the idiomatic Android choice: it keeps the upstream alive through a rotation (which takes well under 5 seconds) but shuts it down when the user truly leaves — avoiding both a restart storm and a leak. The alternatives are `Eagerly` (starts immediately, never stops) and `Lazily` (starts on first collector, never stops).

**Choosing in practice:** cold flows for data sources (a Room query, a network request, a file read); hot flows for shared state (`StateFlow` for UI state) and for events (`SharedFlow` for one-shot navigation or snackbars).

## 13. What is `StateFlow`?
A state-holder observable flow that emits the current and new state updates to its collectors. It is a Hot stream and always requires an initial value. It is the modern replacement for `LiveData`.

```kotlin
private val _uiState = MutableStateFlow(UiState.Loading)
val uiState: StateFlow<UiState> = _uiState

fun loadData() {
    _uiState.value = UiState.Success("Data loaded")
}
```

**Its defining properties:** always has a value (hence the mandatory initial), replays exactly **one** value to new collectors, and **conflates** — fast successive updates may skip intermediates, so a slow collector always sees the *latest* state rather than a backlog. It's effectively `SharedFlow(replay = 1, onBufferOverflow = DROP_OLDEST)` with a guaranteed value.

**It also deduplicates by equality.** Setting the same value twice emits once:

```kotlin
_state.value = UiState.Loading
_state.value = UiState.Loading     // no emission — equals() the current value
```

This is excellent with `data class` state models (free protection against redundant recomposition) but it **breaks with mutable objects**: mutating a list in place and reassigning the same reference emits nothing. Always use immutable state objects and `copy()`.

**Expose a read-only view** with `asStateFlow()`, or the caller can write to your state:

```kotlin
private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
val uiState: StateFlow<UiState> = _uiState.asStateFlow()   // ← not just the type
```

A bare cast to `StateFlow` can still be cast back; `asStateFlow()` returns a genuine read-only wrapper.

**Use `update {}` rather than `value =` for read-modify-write**, because the latter isn't atomic under concurrency:

```kotlin
_state.update { it.copy(count = it.count + 1) }   // atomic, retries on conflict
```

**Collecting never completes.** A `StateFlow` has no terminal state, so `collect` suspends forever — which is why lifecycle-aware collection (`repeatOnLifecycle` / `collectAsStateWithLifecycle`) is mandatory rather than optional.

**One state object beats several flows.** Exposing `isLoading`, `items`, and `error` as three `StateFlow`s lets the UI observe an inconsistent combination mid-update. A single `UiState` data class (or a sealed interface) makes each emission a coherent snapshot.

Because of conflation, **`StateFlow` is wrong for events** — it replays its last value to every new collector, so a "navigate" or "show snackbar" state fires again after rotation. Use `SharedFlow` or a `Channel` for those.

## 14. What is the difference between `StateFlow` and `LiveData`?
Both hold state, but `StateFlow` requires an initial value, supports full Coroutine/Flow operators (like `map`, `filter`), and is not lifecycle-aware by itself (you must collect it safely using `repeatOnLifecycle`).

**The comparison point by point:**

- **Initial value** — `StateFlow` requires one, so `state.value` is non-null and you never handle an "unset" case. `LiveData` can sit at `null` until something sets it.
- **Lifecycle awareness** — `LiveData` has it built in: `observe(owner)` automatically stops at `STOPPED` and resumes later. `StateFlow` does not; you must add `repeatOnLifecycle(STARTED)` or `collectAsStateWithLifecycle()`. **This is the real trade-off** — `LiveData` is safer by default, `StateFlow` is more flexible but puts the burden on you.
- **Operators** — `StateFlow` has the full Flow operator set (`map`, `filter`, `combine`, `debounce`, `flatMapLatest`). `LiveData`'s `Transformations` are limited to roughly `map`, `switchMap`, and `distinctUntilChanged`.
- **Platform** — `LiveData` is an Android library class; `StateFlow` is pure Kotlin, so it works in shared/multiplatform modules and plain unit tests without Robolectric or `InstantTaskExecutorRule`.
- **Threading** — `LiveData` requires `postValue` from a background thread (which also conflates, surprising people); `StateFlow` accepts `value` from anywhere.
- **Conflation** — both conflate, but `StateFlow` also deduplicates equal values, which `LiveData` does not.

```kotlin
// LiveData — lifecycle handled for you
viewModel.user.observe(viewLifecycleOwner) { render(it) }

// StateFlow — you must add the lifecycle handling
viewLifecycleOwner.lifecycleScope.launch {
    repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.user.collect { render(it) }
    }
}
// In Compose, far simpler:
val user by viewModel.user.collectAsStateWithLifecycle()
```

**The recommendation**, and the nuance that makes a good answer: use `StateFlow` in new code, especially with Compose, where `collectAsStateWithLifecycle()` removes the boilerplate entirely and `LiveData` has no advantage. Keep `LiveData` in existing Java-heavy codebases or where the team hasn't adopted coroutines — it isn't deprecated and it's genuinely harder to misuse.

Interop exists in both directions (`asLiveData()`, `.asFlow()`), so migration can be incremental rather than a rewrite.

## 15. What is `SharedFlow`?
A Hot flow designed to emit events (like a snackbar trigger or navigation event) rather than hold state. It does not require an initial value, and if a collector is not collecting at the moment of emission, the event is lost (unless `replay` is configured).

```kotlin
private val _events = MutableSharedFlow<String>()
val events: SharedFlow<String> = _events

viewModelScope.launch {
    _events.emit("Show Toast")
}
```

**It's the general case; `StateFlow` is a special case of it** (`replay = 1` plus a guaranteed value). Its behaviour is configured by three parameters:

```kotlin
MutableSharedFlow<Event>(
    replay = 0,                                  // values given to new collectors
    extraBufferCapacity = 1,                     // buffer beyond replay
    onBufferOverflow = BufferOverflow.SUSPEND    // SUSPEND | DROP_OLDEST | DROP_LATEST
)
```

- **`replay = 0`** is the right default for events — no replay means no re-firing after rotation, which is exactly the bug `StateFlow` and `LiveData` have for one-shot actions.
- **`extraBufferCapacity`** lets you use `tryEmit` (non-suspending) instead of `emit`. With a zero buffer and `SUSPEND`, `emit` blocks until every collector has taken the value, and `tryEmit` always fails.

**The events-vs-state distinction** this solves is worth stating explicitly:

- **State** is a value that *is* — "loading", "3 items". Replaying it is correct; a new collector needs to know the current state.
- **An event** is something that *happened* — "navigate to detail", "show error snackbar". Replaying it is wrong; the snackbar would show twice.

```kotlin
// ViewModel
private val _events = MutableSharedFlow<UiEvent>()      // replay = 0
val events = _events.asSharedFlow()

fun onSave() = viewModelScope.launch {
    repo.save()
    _events.emit(UiEvent.NavigateBack)
}

// UI
lifecycleScope.launch {
    repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.events.collect { event ->
            when (event) { UiEvent.NavigateBack -> findNavController().popBackStack() }
        }
    }
}
```

**The honest caveat:** with `replay = 0`, an event emitted while the UI is stopped (mid-rotation, say) is **lost entirely**. For events that genuinely must not be dropped, a `Channel` with `receiveAsFlow()` is the better tool — it buffers while nobody is collecting and guarantees exactly one consumer. Many teams standardise on `Channel(Channel.BUFFERED).receiveAsFlow()` for events for exactly this reason.

`shareIn()` converts a cold flow into a `SharedFlow`, which is how you share one upstream execution among several collectors.

## 16. How do you safely collect a Flow in the UI?
Because Flows are not lifecycle-aware, collecting them directly in `onCreate` will keep the flow running even when the app is in the background. Use `repeatOnLifecycle` or `flowWithLifecycle` to pause collection when the UI is hidden.

```kotlin
lifecycleScope.launch {
    repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.uiState.collect { state ->
            // Update UI safely
        }
    }
}
```

**Why `lifecycleScope.launch { collect { } }` alone is not enough.** That scope is only cancelled at `ON_DESTROY`, so while the user is in another app your collector keeps running — consuming battery, keeping an upstream location or network subscription alive, and updating views nobody can see. In the worst case a cold upstream holds a socket open indefinitely.

**`repeatOnLifecycle` genuinely cancels and restarts** the block each time the lifecycle crosses the given state. That's the key word: it **cancels**, which tears down the whole upstream chain, rather than merely pausing it.

```kotlin
// 1. repeatOnLifecycle — best for multiple flows, one lifecycle block
viewLifecycleOwner.lifecycleScope.launch {
    repeatOnLifecycle(Lifecycle.State.STARTED) {
        launch { viewModel.uiState.collect { render(it) } }
        launch { viewModel.events.collect { handle(it) } }
    }
}

// 2. flowWithLifecycle — cleaner for a single flow
viewLifecycleOwner.lifecycleScope.launch {
    viewModel.uiState.flowWithLifecycle(viewLifecycleOwner.lifecycle, STARTED)
        .collect { render(it) }
}

// 3. Compose — the simplest, and what you should use there
val state by viewModel.uiState.collectAsStateWithLifecycle()
```

Note the nested `launch`es in the first example: collecting two flows sequentially in the same coroutine would never reach the second, because `collect` on a hot flow never returns.

**Use `viewLifecycleOwner` in Fragments**, not the Fragment itself — otherwise the collector outlives the view and updates a destroyed binding.

**Why `STARTED` and not `RESUMED`:** `STARTED` means visible, which is when the UI should be up to date. `RESUMED` would cancel collection whenever a dialog appeared.

**The deprecated alternatives** — `launchWhenStarted`, `launchWhenResumed` — only **suspend** the coroutine rather than cancelling it. The upstream producer keeps running and buffering, so the resource is still held. `repeatOnLifecycle` replaced them for this reason.

## 17. What are Channels?
Channels are a communication primitive that allows passing a stream of values between different coroutines concurrently. They are fundamentally Hot streams and buffer items.

```kotlin
val channel = Channel<Int>()
launch { channel.send(1) }
launch { println(channel.receive()) }
```

**A Channel is a coroutine-safe queue** — conceptually a `BlockingQueue` whose operations suspend instead of block. The defining difference from a `SharedFlow`: a channel's elements are **consumed exactly once**. With multiple receivers, each value goes to *one* of them (fan-out), not to all of them. A `SharedFlow` broadcasts; a `Channel` distributes.

**Capacity determines the behaviour**, and this is the main thing to know:

- **`Channel.RENDEZVOUS`** (default, 0) — `send` suspends until a receiver takes the value. Perfect handoff synchronisation.
- **`Channel.BUFFERED`** (64) — `send` suspends only when the buffer fills.
- **`Channel.UNLIMITED`** — `send` never suspends. Watch for unbounded memory growth.
- **`Channel.CONFLATED`** — keeps only the latest value; older ones are dropped.

```kotlin
val channel = Channel<Task>(capacity = Channel.BUFFERED)

// Producer
launch { tasks.forEach { channel.send(it) }; channel.close() }

// Consumers — fan-out: each task handled by exactly one worker
repeat(3) { launch { for (task in channel) process(task) } }
```

**`close()` matters.** It signals completion so `for (x in channel)` terminates. Forgetting it leaves consumers suspended forever. Closing with an exception propagates it to receivers.

**Their main use in Android app code is one-shot UI events**, where they're arguably better than `SharedFlow`:

```kotlin
private val _events = Channel<UiEvent>(Channel.BUFFERED)
val events = _events.receiveAsFlow()        // exposes it as a cold Flow
```

The advantage over `MutableSharedFlow(replay = 0)` is that a `Channel` **buffers while nobody is collecting**, so an event emitted during a rotation is delivered when the UI comes back rather than being dropped. The constraint is that `receiveAsFlow` supports only a single collector — which is exactly right for UI events.

**Prefer Flow for everything else.** Channels are low-level and easy to misuse — leaking them (never closed), losing elements, or accidentally creating a second consumer. The Flow API covers almost all stream needs more safely. Reach for a channel when you specifically need single-consumption semantics, fan-out across workers, or a producer/consumer handoff between coroutines.

## 18. What does `flowOn()` do?
It changes the `CoroutineDispatcher` for the upstream Flow operations (the code *above* `flowOn`), leaving the downstream operations unaffected.

```kotlin
repo.getDataFlow()
    .map { it.toUiModel() }
    .flowOn(Dispatchers.IO) // Everything above runs on IO
    .collect { /* Runs on Main thread */ }
```

**It only affects upstream — this is the whole point, and it's counter-intuitive at first.** Operators *above* the `flowOn` run on the specified dispatcher; everything *below* it, including `collect`, stays on the collector's context. Position matters:

```kotlin
flow { emit(readFile()) }       // IO
    .map { parse(it) }          // IO
    .flowOn(Dispatchers.IO)     // ← boundary
    .map { it.toUiModel() }     // collector's context (Main)
    .collect { render(it) }     // Main
```

**Why `withContext` is not a substitute inside a flow.** Flow enforces **context preservation**: the builder must emit from the context in which it was collected. Emitting from a `withContext` block throws `IllegalStateException: Flow invariant is violated`:

```kotlin
// Throws at runtime
flow { withContext(Dispatchers.IO) { emit(load()) } }

// Correct
flow { emit(load()) }.flowOn(Dispatchers.IO)
```

This rule exists so a flow's threading is declared where the flow is *built*, not hidden inside it — the collector always knows which context it will be called on.

**`flowOn` also introduces a buffer**, which is a performance point worth raising. Because upstream and downstream now run on different dispatchers, `flowOn` inserts a channel between them, so the producer can run ahead of the consumer instead of waiting for each value to be processed. That means it can genuinely speed up a slow-producer/slow-consumer pipeline, not merely move work off the main thread.

**Related operators in the same family:** `buffer()` (concurrency without changing dispatcher), `conflate()` (skip intermediate values when the collector is slow), and `collectLatest` (cancel the in-flight collector block when a new value arrives).

```kotlin
// Producer and consumer run concurrently instead of alternating
flow.buffer().collect { slowRender(it) }

// Only the latest value matters — drop the rest
flow.conflate().collect { render(it) }
```

**Multiple `flowOn` calls** are allowed and each affects only the segment above it up to the previous one. In practice, put `flowOn` once, immediately after the expensive upstream work — and in well-layered code, the repository should apply it so the ViewModel and UI never think about dispatchers at all.

## 19. What is the difference between `launch` and `async`?
- `launch`: Fire-and-forget. Returns a `Job`. Doesn't return a result.
- `async`: Performs a calculation and returns a `Deferred` (which inherits from `Job`). You call `.await()` on the `Deferred` to get the result.

```kotlin
val deferredResult = async { computeValue() }
println(deferredResult.await())
```

**Both start a coroutine concurrently; the difference is the result and the error behaviour.**

**Use `async` for parallel decomposition**, which is its real purpose — start several pieces of work, then await them all:

```kotlin
// Sequential — 3 seconds
suspend fun loadSlow(): Screen {
    val user = getUser()        // 1s
    val posts = getPosts()      // 1s
    val ads = getAds()          // 1s
    return Screen(user, posts, ads)
}

// Parallel — 1 second
suspend fun loadFast(): Screen = coroutineScope {
    val user = async { getUser() }
    val posts = async { getPosts() }
    val ads = async { getAds() }
    Screen(user.await(), posts.await(), ads.await())
}
```

**The mistake that silently destroys the benefit** is awaiting immediately:

```kotlin
val user = async { getUser() }.await()     // pointless — this is just sequential
val posts = async { getPosts() }.await()
```

Start *all* the `async`s first, then await. If you only have one thing to do, use `withContext` — a lone `async { }.await()` is strictly worse.

**Error handling differs in an important way.** `launch` throws immediately into the parent; `async` **stores** the exception in the `Deferred` and only rethrows at `await()`. An `async` you never await can swallow the failure:

```kotlin
coroutineScope {
    val a = async { throw IOException() }
    // no await → under a plain coroutineScope the parent still fails,
    // but under a supervisorScope the exception is silently held
}
```

So wrap `await()` in `try/catch`, not the `async` call.

**Never use `async` at the top level of a ViewModel.** `viewModelScope.async { }` with no `await` is a fire-and-forget whose exception goes nowhere. Use `launch` to start work, and `async` only *inside* an already-running coroutine for parallelism.

**`Deferred` extends `Job`**, so it supports `cancel()`, `join()`, `isActive`, and `invokeOnCompletion` as well as `await()`. And `start = CoroutineStart.LAZY` makes an `async` wait until the first `await()` — occasionally useful, but easy to misuse into accidental sequencing.

## 20. What is `runBlocking` and when should you use it?
It blocks the current thread until the coroutine completes. It is strictly meant for bridging synchronous and asynchronous code, primarily used in **Unit Tests** or `main` functions, but **never** in Android production code (it will block the UI thread).

**It is the one coroutine builder that blocks.** `launch` and `async` return immediately; `runBlocking` holds the calling thread hostage until every child finishes, which is precisely what coroutines exist to avoid. On `Dispatchers.Main` it is a guaranteed ANR.

```kotlin
// Catastrophic — the UI thread is blocked for the whole network call
override fun onCreate(savedInstanceState: Bundle?) {
    val user = runBlocking { repo.getUser() }    // ANR
}
```

The tempting reason people reach for it — "I need a result from a suspend function in a non-suspend method" — is a sign the design is wrong. The right fixes are: make the caller `suspend`, launch into a proper scope and deliver the result via state, or restructure so the UI observes rather than asks.

**Where it is legitimate:**

1. **`main()` functions** in command-line Kotlin, where you must bridge into the coroutine world once.
2. **Unit tests** — though prefer `runTest`, which is strictly better for coroutine code.
3. **Bridging for a framework that demands a blocking call** — a JVM interface you must implement synchronously, on a background thread you already own. Rare, and worth a comment explaining why.

**In tests, prefer `runTest`** from `kotlinx-coroutines-test`. It gives virtual time, so `delay(10_000)` completes instantly rather than making your test suite take ten seconds:

```kotlin
@Test
fun `loads user`() = runTest {
    val vm = UserViewModel(FakeRepo(), testDispatcher)
    vm.load("42")
    advanceUntilIdle()
    assertEquals("Alice", vm.state.value.name)
}
```

**A subtlety worth mentioning:** `runBlocking` doesn't merely block — it runs an event loop on the calling thread, so coroutines dispatched to it can execute there. That's why it can deadlock if the coroutine inside depends on work that needs the same thread, a classic hang when `runBlocking` is called on the main thread with `Dispatchers.Main` work inside.

**The rule for Android: if you're typing `runBlocking` outside a test, stop and reconsider the design.**

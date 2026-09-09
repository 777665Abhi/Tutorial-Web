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

## 2. Why are Coroutines better than RxJava or AsyncTasks?
They are much more lightweight, simpler to read (asynchronous code looks sequential), natively integrated into Kotlin, and intrinsically lifecycle-aware when used with structured concurrency (like `viewModelScope`).

## 3. What is a `suspend` function?
A function that can be paused (suspended) and resumed later. It can only be called from a coroutine or another `suspend` function.

```kotlin
suspend fun getUserData(): User {
    delay(1000) // Non-blocking delay
    return User("Alice")
}
```

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

## 6. What is Structured Concurrency in Android?
It ensures that coroutines are not lost and don't leak memory. Every coroutine must be started in a specific `CoroutineScope`. When the scope is canceled (e.g., when a ViewModel is cleared), all coroutines running in that scope are automatically canceled.

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

## 10. What is `SupervisorJob`?
In standard coroutines, if a child coroutine fails, it cancels its parent and all siblings. A `SupervisorJob` isolates failures, so if one child fails, the others continue running. `viewModelScope` uses a `SupervisorJob` under the hood.

```kotlin
val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
scope.launch { throw Exception("Fails") } // Doesn't crash other children
scope.launch { println("Runs fine") }
```

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

## 12. What is the difference between Hot and Cold Streams?
- **Cold Stream (Flow)**: Starts emitting values *only* when an observer starts collecting it. The stream is created fresh for each collector.
- **Hot Stream (StateFlow, Channel)**: Emits values even if there are no collectors. Multiple collectors share the same stream.

## 13. What is `StateFlow`?
A state-holder observable flow that emits the current and new state updates to its collectors. It is a Hot stream and always requires an initial value. It is the modern replacement for `LiveData`.

```kotlin
private val _uiState = MutableStateFlow(UiState.Loading)
val uiState: StateFlow<UiState> = _uiState

fun loadData() {
    _uiState.value = UiState.Success("Data loaded")
}
```

## 14. What is the difference between `StateFlow` and `LiveData`?
Both hold state, but `StateFlow` requires an initial value, supports full Coroutine/Flow operators (like `map`, `filter`), and is not lifecycle-aware by itself (you must collect it safely using `repeatOnLifecycle`).

## 15. What is `SharedFlow`?
A Hot flow designed to emit events (like a snackbar trigger or navigation event) rather than hold state. It does not require an initial value, and if a collector is not collecting at the moment of emission, the event is lost (unless `replay` is configured).

```kotlin
private val _events = MutableSharedFlow<String>()
val events: SharedFlow<String> = _events

viewModelScope.launch {
    _events.emit("Show Toast")
}
```

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

## 17. What are Channels?
Channels are a communication primitive that allows passing a stream of values between different coroutines concurrently. They are fundamentally Hot streams and buffer items.

```kotlin
val channel = Channel<Int>()
launch { channel.send(1) }
launch { println(channel.receive()) }
```

## 18. What does `flowOn()` do?
It changes the `CoroutineDispatcher` for the upstream Flow operations (the code *above* `flowOn`), leaving the downstream operations unaffected.

```kotlin
repo.getDataFlow()
    .map { it.toUiModel() }
    .flowOn(Dispatchers.IO) // Everything above runs on IO
    .collect { /* Runs on Main thread */ }
```

## 19. What is the difference between `launch` and `async`?
- `launch`: Fire-and-forget. Returns a `Job`. Doesn't return a result.
- `async`: Performs a calculation and returns a `Deferred` (which inherits from `Job`). You call `.await()` on the `Deferred` to get the result.

```kotlin
val deferredResult = async { computeValue() }
println(deferredResult.await())
```

## 20. What is `runBlocking` and when should you use it?
It blocks the current thread until the coroutine completes. It is strictly meant for bridging synchronous and asynchronous code, primarily used in **Unit Tests** or `main` functions, but **never** in Android production code (it will block the UI thread).

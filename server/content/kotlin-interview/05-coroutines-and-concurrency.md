---
title: "Coroutines & Concurrency"
description: "Master suspend functions, dispatchers, and structured concurrency."
---

## 1. What are Coroutines in Kotlin?
Coroutines are lightweight threads. They are non-blocking, meaning they can suspend execution without blocking the underlying thread, allowing that thread to do other work.

```kotlin
// Example: Launching a simple coroutine
GlobalScope.launch {
    delay(1000L) // Non-blocking delay
    println("World!")
}
println("Hello,")
Thread.sleep(2000L)
```

## 2. What is the difference between Coroutines and Threads?
- Threads are heavy, managed by the OS, and context switching is expensive.
- Coroutines are lightweight, managed by the Kotlin runtime, and you can create millions of them without running out of memory.

```kotlin
// Spawning 100,000 coroutines runs fine, doing this with threads would crash
runBlocking {
    repeat(100_000) {
        launch { delay(1000L) }
    }
}
```

## 3. What is a `suspend` function?
A function that can be paused (suspended) and resumed later without blocking the thread. It can only be called from a coroutine or another `suspend` function.

```kotlin
suspend fun fetchNetworkData(): String {
    delay(2000) // Simulates network request
    return "Data"
}
```

## 4. What is `runBlocking`?
A coroutine builder that bridges the non-coroutine world with the coroutine world. It blocks the current thread until all coroutines inside its block finish executing.

```kotlin
fun main() = runBlocking {
    // Current thread is blocked until this finishes
    launch {
        delay(1000L)
        println("Done")
    }
}
```

## 5. What are Coroutine Builders?
Functions that create new coroutines.
- `launch`: Starts a coroutine and doesn't return any result (`Job`). (Fire and forget).
- `async`: Starts a coroutine and returns a `Deferred<T>` which holds the future result.

```kotlin
val job = GlobalScope.launch { ... }
val deferred = GlobalScope.async { return@async 42 }
```

## 6. How do you retrieve the result of an `async` coroutine?
You call the `.await()` method on the `Deferred` object, which suspends the current coroutine until the result is ready.

```kotlin
runBlocking {
    val result: Deferred<Int> = async {
        delay(1000)
        42
    }
    println(result.await()) // Prints 42 after 1 second
}
```

## 7. What is Structured Concurrency?
A paradigm where coroutines are tied to a specific scope (`CoroutineScope`). When the scope is canceled or destroyed, all coroutines inside it are automatically canceled, preventing memory leaks.

```kotlin
runBlocking {
    // Both coroutines belong to the runBlocking scope
    launch { delay(1000) }
    launch { delay(2000) }
} // Will wait for both to finish before exiting
```

## 8. What is a `CoroutineScope`?
It defines the lifecycle and context for new coroutines. Every coroutine builder is an extension on `CoroutineScope`.

```kotlin
class MyViewModel : ViewModel() {
    // Built-in scope in Android Jetpack
    fun fetchData() {
        viewModelScope.launch {
            // Cancelled automatically when ViewModel is cleared
        }
    }
}
```

## 9. What is a `CoroutineDispatcher`?
It determines which thread or thread pool the coroutine will execute on.
- `Dispatchers.Main`: For UI interactions (Android Main Thread).
- `Dispatchers.IO`: For network/disk operations.
- `Dispatchers.Default`: For heavy CPU computation.

```kotlin
launch(Dispatchers.IO) {
    // Safe to read a database here
}
```

## 10. How do you switch threads inside a coroutine?
Using the `withContext(Dispatcher)` function. It suspends until the block completes on the new dispatcher, then resumes on the original dispatcher.

```kotlin
suspend fun loadUI() {
    val data = withContext(Dispatchers.IO) {
        fetchDataFromDb() // Runs on IO thread
    }
    updateUI(data) // Runs on original thread (e.g., Main)
}
```

## 11. What is a `Job` in Coroutines?
A `Job` is a handle to a coroutine. It controls its lifecycle and can be used to explicitly cancel the coroutine using `.cancel()`.

```kotlin
val job = launch {
    while (isActive) { /* work */ }
}
job.cancel() // Stops the coroutine
```

## 12. How does Coroutine Cancellation work?
Cancellation is cooperative. A coroutine must check for cancellation periodically (e.g., checking the `isActive` property) or invoke suspend functions (like `delay`) which check for cancellation automatically and throw `CancellationException`.

```kotlin
launch {
    for (i in 1..100) {
        if (!isActive) return@launch // Cooperating with cancellation
        // do heavy work
    }
}
```

## 13. What is a `SupervisorJob`?
In a regular `Job`, if one child coroutine fails with an exception, the parent and all other children are cancelled. A `SupervisorJob` ignores child failures, allowing other children to continue executing.

```kotlin
val scope = CoroutineScope(SupervisorJob())
scope.launch { throw Exception("Fails") }
scope.launch { println("Still runs") }
```

## 14. What is `coroutineScope { ... }` function?
It creates a nested scope. If any coroutine inside it fails, the entire scope fails. It suspends until all its children finish.

```kotlin
suspend fun doWork() = coroutineScope {
    launch { /* task 1 */ }
    launch { /* task 2 */ }
    // Suspends until both finish
}
```

## 15. What is `supervisorScope { ... }`?
Creates a scope where a child's failure does not propagate to other children, similar to `SupervisorJob`, but structured as a suspend function.

```kotlin
suspend fun safeWork() = supervisorScope {
    launch { throw Exception() } // Fails
    launch { println("Runs fine") }
}
```

## 16. What is the difference between `delay()` and `Thread.sleep()`?
`Thread.sleep()` blocks the actual OS thread, meaning no other coroutines can run on it. `delay()` suspends the coroutine, freeing up the thread to execute other coroutines.

```kotlin
// Thread.sleep(1000) -> Blocks entire thread
// delay(1000) -> Yields thread, waits 1000ms, then resumes
```

## 17. How do you handle exceptions in Coroutines?
You can use standard `try-catch` blocks inside the coroutine, or use a `CoroutineExceptionHandler` attached to the scope or launcher.

```kotlin
val handler = CoroutineExceptionHandler { _, exception ->
    println("Caught $exception")
}
GlobalScope.launch(handler) {
    throw RuntimeException("Crash!")
}
```

## 18. What is `Flow` in Kotlin?
Flow is an asynchronous data stream that sequentially emits values and completes normally or with an exception. It is cold, meaning it doesn't run until you `collect` it.

```kotlin
fun getNumbers(): Flow<Int> = flow {
    for (i in 1..3) {
        delay(100)
        emit(i)
    }
}

runBlocking {
    getNumbers().collect { println(it) } // 1, 2, 3
}
```

## 19. What is the difference between `StateFlow` and `SharedFlow`?
- **StateFlow**: A hot flow that holds a single "state" value. It emits the current state to new collectors and requires an initial value. (Similar to LiveData).
- **SharedFlow**: A hot flow that can emit events to multiple collectors. It does not hold state, and new collectors don't get past events unless you configure a `replay` cache.

```kotlin
val stateFlow = MutableStateFlow(0)
val sharedFlow = MutableSharedFlow<String>()
```

## 20. What is a Channel?
A communication primitive that allows passing streams of data between coroutines concurrently, using `send()` and `receive()`. It is a hot stream.

```kotlin
val channel = Channel<Int>()
launch { channel.send(1) }
launch { println(channel.receive()) }
```

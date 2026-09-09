---
title: "Coroutines & Flow"
description: "Answer practical questions about suspension, cancellation, structured concurrency, and streams."
---

## 1. What is a coroutine?

A coroutine is a lightweight unit of work that can suspend without blocking its thread and resume later. Many coroutines can share a small number of threads, making them suitable for asynchronous work.

## 2. What is a `suspend` function?

A `suspend` function may pause and resume, but it does not automatically run on a background thread. It must be called from another suspend function or a coroutine, and its dispatcher determines where the work executes.

## 3. What is structured concurrency?

Structured concurrency ties child coroutines to a lifecycle-aware scope. The parent waits for its children, and cancellation propagates through the hierarchy. This makes work trackable and prevents abandoned operations.

## 4. What is the difference between `launch` and `async`?

`launch` starts work and returns a `Job`; it is used when no result is needed. `async` returns a `Deferred<T>` and is used with `await()` when a result is needed. Use `async` only when the result will actually be awaited.

## 5. What do coroutine dispatchers do?

- `Dispatchers.Main` is intended for UI work.
- `Dispatchers.IO` is optimized for blocking I/O.
- `Dispatchers.Default` is intended for CPU-intensive work.
- `Dispatchers.Unconfined` starts in the current call frame and should be used only when its unusual behavior is intentional.

Switch context with `withContext`, and keep dispatcher decisions near the code that owns the work.

## 6. How does coroutine cancellation work?

Cancellation is cooperative. Suspending functions such as `delay` check cancellation, while CPU-bound loops should call `ensureActive()` or check `isActive`. Do not swallow `CancellationException` while catching errors.

## 7. What is the difference between `Flow`, `StateFlow`, and `SharedFlow`?

`Flow` is a cold stream: its producer starts for each collector. `StateFlow` is a hot, lifecycle-independent stream that stores the latest state and requires an initial value. `SharedFlow` is a hot broadcast stream suited to events and supports configurable replay and buffering.

## 8. What is a `SupervisorJob`?

With a regular parent job, a child failure cancels the parent and its other children. A `SupervisorJob` isolates child failures so sibling coroutines can continue. Handle the failed child's exception explicitly because supervision does not remove the error.

## 9. What is a `Job`?
A `Job` is a handle to a coroutine that allows you to control its lifecycle, such as cancelling it.

## 10. What is `Deferred`?
It is a specialized `Job` (returned by `async`) that holds a future result, which can be retrieved using `.await()`.

## 11. What does `withContext` do?
It suspends the current coroutine, switches to a different dispatcher to do some work, and then returns to the original dispatcher.

## 12. Why should you avoid `GlobalScope`?
Because its lifecycle is tied to the entire application. It doesn't cancel automatically, easily leading to memory leaks.

## 13. What is a `coroutineScope` builder?
It creates a nested scope. If any child coroutine fails, it cancels the entire scope and all other siblings.

## 14. What does the `yield()` function do?
It explicitly yields the thread, pausing the coroutine so other coroutines can run. It also checks for cancellation.

## 15. How do you handle exceptions in a standard coroutine?
You can wrap the code inside the coroutine with a traditional `try-catch` block, or use a `CoroutineExceptionHandler`.

## 16. What makes `Flow` cold?
A standard `Flow` does not start executing its code or emitting values until a terminal operator (like `collect`) is called on it.

## 17. What is `StateFlow`?
It is a hot flow that holds exactly one latest value. New collectors immediately receive the current state.

## 18. How does `SharedFlow` differ from `StateFlow`?
`SharedFlow` can emit continuous events and does not require an initial value. It is meant for broadcasting events (like toasts or navigation).

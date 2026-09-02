---
title: "Kotlin & Concurrency"
description: "Deep dive into Coroutines, Flows, and Kotlin language features."
---

## 31. What are Kotlin Coroutines, and how do they differ from Java Threads?
Coroutines are a lightweight concurrency framework in Kotlin. Unlike Java threads (which map 1-to-1 to expensive OS threads), coroutines are managed entirely by the Kotlin runtime. You can run thousands of coroutines on a single background thread without crashing due to Out-Of-Memory errors because they suspend their execution rather than blocking the underlying thread.

## 32. What is the difference between `launch` and `async` coroutine builders?
- **`launch`**: Starts a new coroutine that does not return a result. It returns a `Job` object, which can be used to cancel the coroutine. Used for "fire-and-forget" tasks.
- **`async`**: Starts a new coroutine that returns a result in the form of a `Deferred<T>` (which is a subclass of `Job`). You use `.await()` to retrieve the result when it's ready.

## 33. Explain `suspend` functions and how structured concurrency works in Kotlin.
A `suspend` function is a function that can pause the execution of a coroutine without blocking the thread, allowing other coroutines to use that thread. 
**Structured Concurrency** is the principle that coroutines must be launched within a specific `CoroutineScope`. This ensures that all launched coroutines are properly tracked, and if a scope is cancelled, all child coroutines are automatically cancelled, preventing resource leaks.

## 34. What is the difference between `Dispatchers.Main`, `Dispatchers.IO`, and `Dispatchers.Default`?
- **`Main`**: Runs on the Android Main UI thread. Used for interacting with the UI.
- **`IO`**: Optimized for disk and network I/O operations (e.g., reading files, database queries). It uses a dynamically expanding thread pool.
- **`Default`**: Optimized for CPU-intensive work (e.g., parsing JSON, sorting large lists). Its thread pool size is limited to the number of CPU cores.

## 35. What is a `SupervisorJob`, and how does exception propagation work in coroutines?
Normally, if a child coroutine fails with an exception, it cancels its parent and all sibling coroutines.
A `SupervisorJob` changes this behavior: if a child fails, the failure does not propagate upwards. The parent and sibling coroutines continue running undisturbed. This is heavily used in Android's `viewModelScope`.

## 36. What is the difference between `Flow`, `StateFlow`, and `SharedFlow`?
- **`Flow`**: A *cold* asynchronous data stream. It only executes and emits values when someone calls `collect()`. Every collector gets its own independent stream of data.
- **`SharedFlow`**: A *hot* stream. It emits values regardless of whether there are collectors. Multiple collectors share the same stream and receive the same emitted values (like a broadcast).
- **`StateFlow`**: A specialized `SharedFlow` that always holds a single "state" value. It requires an initial value and only emits when the value actually changes.

## 37. Explain backpressure and how `channelFlow` differs from `flow`.
**Backpressure** occurs when a flow produces elements faster than the collector can consume them.
A standard `flow` is strictly sequential (emission waits for the collector). 
`channelFlow` runs the producer and collector in separate coroutines linked by a Channel buffer. This allows the producer to keep emitting values into the buffer concurrently, mitigating backpressure if the collector is temporarily slow.

## 38. What are Kotlin `Sealed Classes` and `Sealed Interfaces`, and how are they used in state management?
Sealed classes restrict class hierarchies: all subclasses must be declared in the same package/module. They allow the compiler to perform exhaustive `when` checks.
They are heavily used in Android to represent UI States (e.g., `Loading`, `Success(data)`, `Error(exception)`), ensuring the UI handles every possible state gracefully.

## 39. What is the `inline` keyword, and what are `reified` type parameters in Kotlin?
- **`inline`**: Tells the compiler to copy the function's bytecode directly into the call site rather than creating a new object and method call (optimizing higher-order functions like `map` or `filter`).
- **`reified`**: Normally, generic types are erased at runtime (Type Erasure). By marking an `inline` function's generic type as `reified`, you can access the actual class type at runtime (e.g., `if (T::class == String::class)`).

## 40. What are `delegated properties` (`by lazy`, `by Delegates.observable()`) in Kotlin?
Property delegation offloads the getter/setter logic of a property to a separate object.
- **`by lazy`**: Defers initialization until the property is accessed for the first time. The result is cached for future calls.
- **`by Delegates.observable()`**: Allows you to execute a callback block every time the property's value changes.

## 41. What is the difference between `var`, `val`, and `const val`?
- **`var`**: A mutable variable that can be reassigned.
- **`val`**: A read-only variable. It cannot be reassigned after initialization, but its internal properties can change if it's an object.
- **`const val`**: A compile-time constant. Its value must be known at compile time, and it is inlined directly into the bytecode where it is used (improving performance).

## 42. How does Kotlin handle Null Safety (`?`, `?.`, `?:`, `!!`) under the hood?
Kotlin distinguishes nullable (`String?`) and non-nullable (`String`) types at compile-time to prevent NullPointerExceptions.
- `?.` (Safe Call): Returns null if the object is null instead of throwing an exception.
- `?:` (Elvis Operator): Provides a default value if the expression on the left is null.
- `!!` (Not-null Assertion): Forces the compiler to treat a value as non-null, throwing an NPE if it actually is null.

## 43. What are Scope Functions (`let`, `run`, `with`, `apply`, `also`), and how do you choose between them?
Scope functions execute a block of code within the context of an object.
- **`let` / `also`**: The object is referenced as `it`. `let` returns the lambda result; `also` returns the object itself (useful for logging).
- **`run` / `apply` / `with`**: The object is referenced as `this`. `run`/`with` return the lambda result; `apply` returns the object itself (useful for configuration).

## 44. What are `Extension Functions`, and how do they work under the hood?
Extension functions allow you to add new functions to existing classes without inheriting from them. 
Under the hood, Kotlin compiles them into standard static Java methods where the receiver object (the class being extended) is passed as the first implicit parameter.

## 45. What is the difference between `data class` and a standard class in Kotlin?
A `data class` is explicitly designed to hold data. The compiler automatically generates useful boilerplate code for it based on the properties declared in the primary constructor:
- `equals()` and `hashCode()` for accurate comparisons.
- `toString()` for readable logging.
- `copy()` for immutability.
- `componentN()` functions for destructuring declarations.

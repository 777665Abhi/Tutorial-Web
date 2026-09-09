---
title: "Multithreading & Concurrency"
description: "Understand Threads, Synchronization, Deadlocks, and the Executor Framework."
---

## 1. What is Multithreading in Java?
It is the process of executing multiple threads simultaneously. A thread is a lightweight sub-process, the smallest unit of processing. Multithreading maximizes CPU utilization.

## 2. What are the two ways to create a thread in Java?
1. **Extending the `Thread` class**: `class MyThread extends Thread` and override `run()`.
2. **Implementing the `Runnable` interface**: `class MyRunnable implements Runnable`, override `run()`, and pass it to a `Thread` constructor. (Preferred, because Java doesn't support multiple inheritance).

## 3. What is the difference between `start()` and `run()`?
- `start()`: Creates a new, separate call stack for the thread, and then the JVM calls `run()` in that new thread.
- `run()`: Executes just like a normal method call on the current thread. It does not spawn a new thread.

## 4. What are the lifecycle states of a Thread?
1. **New**: Created but not yet started.
2. **Runnable**: Ready to run, waiting for CPU time.
3. **Running**: Currently executing.
4. **Waiting/Blocked**: Waiting for a lock or another thread.
5. **Dead/Terminated**: The `run()` method has completed.

## 5. What is Synchronization?
It is a mechanism to ensure that only one thread can access a shared resource (like a block of code or an object) at a time, preventing race conditions and data corruption.

## 6. What is the difference between object-level and class-level locks?
- **Object-level lock**: Acquired using `synchronized` on a non-static method or block. It prevents other threads from accessing synchronized non-static methods of the *same instance*.
- **Class-level lock**: Acquired using `synchronized` on a static method or a `Class` object block. It locks the entire class for all instances.

## 7. What is a Deadlock?
A situation where two or more threads are blocked forever, waiting for each other to release locks. (e.g., Thread A holds Lock 1 and waits for Lock 2, while Thread B holds Lock 2 and waits for Lock 1).

## 8. How can you prevent a Deadlock?
- Avoid nested locks.
- Only lock resources when absolutely necessary.
- Always acquire locks in the same specific order across all threads.
- Use timeout methods like `tryLock(time)` from the `java.util.concurrent.locks` package.

## 9. What is the difference between `wait()` and `sleep()`?
- `wait()`: Defined in `Object` class. Releases the lock on the object. Used for inter-thread communication. Must be called from a synchronized context.
- `sleep()`: Defined in `Thread` class. Pauses thread execution but **does not** release any locks it holds.

## 10. What does `notify()` vs `notifyAll()` do?
Both wake up threads that are waiting on an object monitor (via `wait()`). `notify()` wakes up a single random waiting thread, while `notifyAll()` wakes up all waiting threads.

## 11. What is the `volatile` keyword?
It prevents threads from caching variables locally. Any read or write to a `volatile` variable goes directly to main memory, ensuring all threads see the most up-to-date value. However, it does not guarantee atomicity like `synchronized` does.

## 12. What is `ThreadLocal`?
It is a class that provides thread-local variables. Each thread accessing a `ThreadLocal` gets its own independently initialized copy of the variable, ensuring thread safety without needing synchronization.

## 13. What is the Executor Framework?
A framework in `java.util.concurrent` that abstracts thread creation and management. Instead of manually creating threads, you submit tasks (`Runnable` or `Callable`) to a Thread Pool (`ExecutorService`), which reuses idle threads.

## 14. What is a Thread Pool?
A collection of pre-instantiated, reusable threads. It limits the overhead of constantly creating and destroying threads and throttles the number of concurrent tasks to prevent CPU overload.

## 15. What is the difference between `Runnable` and `Callable`?
Both represent tasks to be executed by a thread.
- `Runnable`: Cannot return a result and cannot throw checked exceptions.
- `Callable`: Returns a result (wrapped in a `Future`) and can throw checked exceptions.

## 16. What is a `Future`?
It is a placeholder object returned by an `ExecutorService` when a `Callable` is submitted. You use it to check if the task is complete, cancel it, or use `.get()` to retrieve the result (which blocks until the result is ready).

## 17. What is the `CountDownLatch`?
A synchronization aid that allows one or more threads to wait until a set of operations being performed in other threads completes. It is initialized with a count, and threads call `await()` until the count reaches zero via `countDown()`.

## 18. What is `CyclicBarrier`?
Similar to `CountDownLatch`, but it allows a set of threads to all wait for each other to reach a common barrier point. Unlike the latch, a `CyclicBarrier` can be reused after the waiting threads are released.

## 19. What are ReentrantLocks?
An alternative to implicit `synchronized` blocks. They offer more flexibility, such as trying to acquire a lock without blocking infinitely (`tryLock`), interrupting a waiting thread, or implementing fairness (giving locks to the longest-waiting thread).

## 20. What is an `AtomicInteger`?
A class from `java.util.concurrent.atomic` that provides thread-safe operations on integers (like `incrementAndGet()`) without using locks. It uses non-blocking CPU instructions (Compare-And-Swap) for extreme performance.

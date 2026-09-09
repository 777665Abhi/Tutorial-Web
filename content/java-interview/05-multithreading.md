---
title: "Multithreading & Concurrency"
description: "Threads, Synchronization, Deadlocks, and the Executor framework."
---

## 1. What is Multithreading?
Multithreading is a Java feature that allows concurrent execution of two or more parts of a program for maximum utilization of CPU. Each part of such a program is called a thread. Threads are lightweight, sharing the same memory space.

## 2. What are the two ways to create a Thread in Java?
1. Extending the `Thread` class.
2. Implementing the `Runnable` interface.

```java
// Method 1
class MyThread extends Thread {
    public void run() { System.out.println("Running"); }
}
new MyThread().start();

// Method 2 (Preferred)
class MyRunnable implements Runnable {
    public void run() { System.out.println("Running"); }
}
new Thread(new MyRunnable()).start();
```

## 3. Why is implementing `Runnable` better than extending `Thread`?
Because Java does not support multiple inheritance of classes. If you extend `Thread`, your class cannot extend any other class. Implementing `Runnable` keeps your options open. Also, `Runnable` separates the task from the runner (Thread).

## 4. What is the difference between `start()` and `run()`?
- `start()`: Creates a new, separate thread and then calls `run()` on that new thread.
- `run()`: Does *not* create a new thread. It executes synchronously on the current thread, just like a normal method call.

## 5. Explain the Lifecycle of a Thread.
1. **New**: Thread instance is created, but `start()` has not been called.
2. **Runnable**: `start()` is called. Thread is ready to run and waiting for CPU time.
3. **Running**: The Thread Scheduler has allocated CPU time and it is executing.
4. **Blocked/Waiting**: The thread is waiting for a lock, or waiting for another thread to finish.
5. **Terminated**: The `run()` method has completed execution.

## 6. What is the `synchronized` keyword?
It is used to prevent Thread Interference (race conditions). When a method or block is declared `synchronized`, only one thread can execute it at a time for a given object instance. Other threads trying to access it are Blocked until the first thread finishes.

```java
class Counter {
    int count = 0;
    // Only one thread at a time can execute this
    public synchronized void increment() { 
        count++; 
    }
}
```

## 7. What is a Monitor (Intrinsic Lock)?
Every object in Java has an intrinsic lock (or monitor) associated with it. When a thread calls a `synchronized` method, it acquires the monitor for that object. When the method finishes, it releases the monitor.

## 8. What is the difference between object-level locking and class-level locking?
- **Object-level**: Acquired when a non-static synchronized method is called. Protects non-static fields of a *single instance*.
- **Class-level**: Acquired when a `static synchronized` method is called. Protects static fields shared across *all instances* of the class.

## 9. What is a Deadlock?
A situation where two or more threads are blocked forever, waiting for each other. For example: Thread A holds Lock 1 and waits for Lock 2. Thread B holds Lock 2 and waits for Lock 1.

## 10. How do you prevent Deadlocks?
1. **Lock Ordering**: Ensure all threads acquire multiple locks in the exact same order.
2. **Lock Timeout**: Use `tryLock(timeout)` from the `java.util.concurrent.locks.Lock` interface instead of intrinsic locks.
3. Avoid holding locks while calling alien methods (methods of other classes).

## 11. What is the `volatile` keyword?
It indicates that a variable's value will be modified by different threads. It guarantees **visibility**: a read of a volatile variable always returns the most recent write by any thread (bypassing the CPU cache and reading directly from main memory). It does *not* guarantee atomicity (use `AtomicInteger` for that).

```java
class SharedObj {
    // Guarantees all threads see the updated flag instantly
    volatile boolean flag = true; 
}
```

## 12. What are `wait()`, `notify()`, and `notifyAll()`?
Methods defined in the `Object` class used for Inter-Thread Communication.
- `wait()`: Causes the current thread to release the lock and wait until another thread calls `notify()`.
- `notify()`: Wakes up a single thread waiting on this object's monitor.
- `notifyAll()`: Wakes up all threads waiting on this object's monitor.
*These must be called from within a synchronized context.*

## 13. What is the difference between `sleep()` and `wait()`?
- `sleep()`: A static method of `Thread`. It pauses execution for a specified time but **does not release any locks** it holds.
- `wait()`: An instance method of `Object`. It pauses execution and **releases the lock** so other threads can enter the synchronized block.

## 14. What is a `Callable` and a `Future`?
- **Callable**: Similar to `Runnable`, but its `call()` method can return a result and throw a checked exception.
- **Future**: Represents the result of an asynchronous computation. You call `.get()` on it to retrieve the result (this blocks until the Callable completes).

```java
Callable<Integer> task = () -> { return 5; };
Future<Integer> future = executorService.submit(task);
System.out.println(future.get()); // Blocks and prints 5
```

## 15. What is the Executor Framework?
Introduced in Java 5 (`java.util.concurrent`), it abstracts away manual thread creation and management. You submit tasks (`Runnable` or `Callable`) to an `ExecutorService`, which manages a Thread Pool to execute them.

```java
ExecutorService pool = Executors.newFixedThreadPool(10);
pool.execute(new MyRunnable());
pool.shutdown();
```

## 16. What is a Thread Pool?
A group of pre-instantiated, idle threads waiting to be given work. Instead of starting a new thread for every task (expensive overhead), a task is assigned to an existing thread in the pool. When the task finishes, the thread returns to the pool.

## 17. What is `CountDownLatch`?
A synchronization aid that allows one or more threads to wait until a set of operations being performed in other threads completes. It uses a counter; `countDown()` decrements it, and `await()` blocks until the counter reaches zero.

## 18. What is `CyclicBarrier`?
A synchronization aid that allows a set of threads to all wait for each other to reach a common barrier point. Unlike `CountDownLatch`, it can be reused after the waiting threads are released.

## 19. What is `ThreadLocal`?
A class that provides thread-local variables. Each thread that accesses one has its own, independently initialized copy of the variable. Used heavily for managing non-thread-safe objects (like `SimpleDateFormat` or database connections) safely in a multithreaded environment.

## 20. What is a Daemon Thread?
A low-priority background thread that provides services to user threads (e.g., the Garbage Collector). Its life depends on user threads. If all user threads finish execution, the JVM terminates itself automatically, instantly killing all Daemon threads.

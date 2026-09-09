---
title: "Memory Management & Garbage Collection"
description: "Understand Heap vs Stack, GC algorithms, and handling memory leaks."
---

## 1. How is memory divided in Java?
The two main areas are the **Stack** and the **Heap**. The JVM also uses the Metaspace (formerly PermGen) for class metadata and the Code Cache for compiled JIT code.

## 2. What is the difference between Heap and Stack memory?
- **Stack**: Stores local primitive variables and method call frames. It is thread-safe (each thread has its own stack) and uses LIFO (Last-In-First-Out) allocation.
- **Heap**: Stores all created objects and their instance variables. It is shared across all threads, making it globally accessible but requiring synchronization.

## 3. What happens when Stack memory is full?
The JVM throws a `StackOverflowError`. This almost exclusively happens due to unbounded recursive method calls.

## 4. What happens when Heap memory is full?
The JVM throws an `OutOfMemoryError: Java heap space`. This happens when the application creates too many objects and the Garbage Collector cannot free up enough space.

## 5. What is Garbage Collection (GC) in Java?
It is a daemon thread running in the background that automatically identifies and deletes objects that are no longer reachable by the application, freeing up memory in the Heap.

## 6. How does GC determine if an object is eligible for garbage collection?
It uses a "Mark and Sweep" approach. It starts from GC Roots (active threads, static variables, local variables in the stack). Any object in the heap that cannot be traced back to a GC root is considered "unreachable" and eligible for deletion.

## 7. Can we force Garbage Collection in Java?
No. You can suggest it by calling `System.gc()` or `Runtime.getRuntime().gc()`, but the JVM has the ultimate authority to ignore the request based on its current load and memory state.

## 8. What is the `finalize()` method?
Before an object is destroyed by the GC, the JVM calls its `finalize()` method exactly once, allowing it to clean up resources (like closing files). However, it is highly unpredictable and deprecated in modern Java (use Try-with-Resources instead).

## 9. Explain the Generational Garbage Collection model.
The Heap is divided into:
- **Young Generation**: Where all new objects are allocated (Eden space). Most objects die young. Minor GCs clean this area quickly.
- **Old (Tenured) Generation**: Objects that survive multiple Minor GCs are moved here. Major GCs clean this area, which takes much longer.

## 10. What is "Stop-the-World" in Garbage Collection?
During certain phases of Garbage Collection, the JVM completely pauses all application threads to safely move objects and update memory references. This pause can cause lag in latency-sensitive applications.

## 11. What are the common Garbage Collectors in Java?
- **Serial GC**: Single-threaded (for small apps).
- **Parallel GC**: Multi-threaded for high throughput.
- **G1 (Garbage First) GC**: The default in Java 9+. Splits the heap into regions and aims to provide predictable pause times.
- **ZGC**: A scalable low-latency GC (sub-millisecond pauses) introduced in recent Java versions.

## 12. What is a Strong Reference?
The default reference type (`User u = new User()`). The Garbage Collector will absolutely never clean up an object that has an active strong reference pointing to it, even if the JVM throws an OOM error.

## 13. What is a Weak Reference?
Created using `WeakReference<T>`. If an object only has weak references pointing to it, the Garbage Collector will delete it eagerly on the very next GC cycle. Useful for caches like `WeakHashMap`.

## 14. What is a Soft Reference?
Created using `SoftReference<T>`. Similar to Weak References, but the Garbage Collector is lenient. It will only delete softly-referenced objects if the JVM is desperately running out of memory.

## 15. What is the Metaspace?
Introduced in Java 8 to replace PermGen. It stores class definitions, method data, and static variables. Unlike PermGen (which lived in the Heap and caused OOMs), Metaspace lives in native OS memory and auto-grows by default.

## 16. What is a Memory Leak in Java?
It occurs when the application unintentionally holds strong references to objects that are no longer needed. Since the references exist, the GC cannot clean them up, causing the heap to slowly fill up and crash.

## 17. How can you detect a Memory Leak?
By monitoring the JVM using tools like VisualVM, JConsole, or Eclipse MAT. You capture a "Heap Dump" (a snapshot of memory) and analyze which objects are occupying the most space and what is keeping them alive.

## 18. What is a common cause of Memory Leaks in Java?
- Storing objects in static Collections (like a static `HashMap`) and never removing them.
- Unclosed I/O streams or database connections.
- Unregistered event listeners or callbacks.
- ThreadLocal variables that are not explicitly `.remove()`d in application servers.

## 19. What is Escape Analysis?
A JVM compiler optimization technique. If the compiler determines that a newly created object will never "escape" the method it was created in, it may allocate the object on the Stack instead of the Heap, eliminating GC overhead.

## 20. What JVM flags dictate initial and maximum heap size?
`-Xms` sets the initial starting heap size (e.g., `-Xms512m`), and `-Xmx` sets the absolute maximum heap size (e.g., `-Xmx2g`). Setting them to the same value prevents the JVM from constantly resizing the heap.

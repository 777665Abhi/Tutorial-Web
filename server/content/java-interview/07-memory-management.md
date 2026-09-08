---
title: "Memory Management"
description: "Heap, Stack, Garbage Collection, and Memory Leaks."
---

## 1. How is memory divided in Java?
Java memory is primarily divided into two parts:
1. **Heap Space**: Used for dynamic memory allocation for Java objects and JRE classes at runtime. Shared across all threads.
2. **Stack Memory**: Used for execution of a thread. It contains method-specific values (local variables) and references to objects in the Heap. Each thread has its own Stack.

## 2. What is the difference between Heap and Stack memory?
- **Heap**: Stores Objects. Global access. Managed by Garbage Collection. Slower allocation. Throws `OutOfMemoryError` if full.
- **Stack**: Stores primitives and object references. Local access (thread-safe). Automatically cleared when a method returns. Faster allocation. Throws `StackOverflowError` if full.

```java
public void test() {
    int local = 5; // Stored in Stack
    User u = new User(); // 'u' reference is in Stack, but User object is in Heap
}
```

## 3. What is Garbage Collection (GC) in Java?
Garbage Collection is a process managed by the JVM to automatically reclaim runtime memory by destroying objects that are no longer reachable or in use by the application, preventing memory leaks.

## 4. How does the Garbage Collector know which objects to destroy?
The JVM uses a "Mark and Sweep" algorithm.
1. **Mark**: It starts at the GC Roots (active threads, static variables, local variables in stack) and traverses the object graph, marking every object it can reach as "alive".
2. **Sweep**: Any object in the heap that is NOT marked as "alive" is considered unreachable and its memory is reclaimed.

## 5. What are GC Roots?
GC Roots are special objects that are always reachable and never garbage collected. They include:
- Local variables in the currently executing methods of active threads.
- Active Java threads.
- Static variables of loaded classes.
- JNI (Java Native Interface) references.

## 6. What is the Generational Garbage Collection model?
The Heap is divided into generations because empirical analysis shows that most objects die young.
1. **Young Generation**: Newly created objects go here (Eden Space). Minor GC runs frequently here and cleans up quickly.
2. **Old (Tenured) Generation**: Objects that survive multiple Minor GCs are moved here. Major GC runs here, which is slower.
3. **Metaspace (formerly PermGen)**: Stores class metadata and static variables.

## 7. What is a "Stop-the-World" event?
When a Garbage Collection runs (especially Major GC), it completely halts the execution of all application threads until the GC is finished. This causes the application to pause (latency), which is why optimizing GC is critical for high-performance apps.

## 8. Can you force Garbage Collection in Java?
No. You can *request* Garbage Collection by calling `System.gc()` or `Runtime.getRuntime().gc()`, but there is absolutely no guarantee that the JVM will actually execute it at that moment.

## 9. What is a Memory Leak in Java?
A memory leak occurs when objects that are no longer needed by the application are still being referenced by some other active object (a GC Root). Because a strong reference exists, the Garbage Collector cannot remove them, eventually leading to an `OutOfMemoryError`.

## 10. What are common causes of Memory Leaks in Java?
1. **Static Collections**: A static `HashMap` or `List` that continuously grows and never drops elements.
2. **Unclosed Resources**: Forgetting to close Database connections, Network streams, or File streams.
3. **Inner Classes**: Non-static inner classes hold an implicit reference to their outer class.
4. **ThreadLocals**: If threads are pooled (e.g., in Tomcat) and ThreadLocal variables are not cleaned up.

## 11. How do you find and fix a Memory Leak?
1. Obtain a **Heap Dump** (a snapshot of memory) when the app crashes or memory is high using tools like `jmap`.
2. Analyze the heap dump using tools like **Eclipse MAT (Memory Analyzer Tool)** or VisualVM.
3. Look for the "Dominator Tree" or "Leak Suspects" to find which objects are consuming the most memory and trace their GC Roots.

## 12. What is `OutOfMemoryError` (OOM)?
An error thrown by the JVM when it cannot allocate an object because it is out of memory, and no more memory could be made available by the Garbage Collector.

## 13. What is `StackOverflowError`?
An error thrown when the application recurses too deeply, exhausting the Stack memory allocated to that thread. Usually caused by infinite recursion.

```java
public void infiniteRecursion() {
    infiniteRecursion(); // Will cause StackOverflowError
}
```

## 14. What are the different Types of References in Java?
Provided in `java.lang.ref`:
1. **Strong Reference**: Default (e.g., `Object obj = new Object()`). Prevents GC.
2. **Soft Reference**: Collected only if the JVM absolutely needs memory (running out). Used for caching.
3. **Weak Reference**: Collected eagerly on the very next GC cycle, even if memory is plentiful.
4. **Phantom Reference**: Used to determine exactly when an object is removed from memory.

## 15. What is a `WeakHashMap`?
A special Map implementation where the keys are stored as Weak References. If a key is no longer referenced anywhere else in the application, the entire entry (key-value pair) is automatically removed from the map during the next Garbage Collection.

## 16. What is the `finalize()` method?
A method in the `Object` class that is called by the Garbage Collector right before the object is destroyed. It was intended for cleanup operations, but it is **deprecated** since Java 9 because it is unpredictable, dangerous, and causes severe performance penalties.

## 17. If `finalize()` is deprecated, how should we clean up resources?
Use the **Try-with-Resources** statement (which relies on the `AutoCloseable` interface) for guaranteed, deterministic cleanup, or use the `Cleaner` API introduced in Java 9.

## 18. What is PermGen and Metaspace?
- **PermGen (Permanent Generation)**: Used prior to Java 8 to store class metadata. It had a fixed maximum size, frequently causing `OutOfMemoryError: PermGen space`.
- **Metaspace**: Introduced in Java 8 to replace PermGen. It stores metadata in native OS memory rather than the JVM heap, meaning it can auto-scale up to the available system memory.

## 19. Name some Garbage Collector implementations in Java.
- **Serial GC**: Single-threaded. For small apps.
- **Parallel GC**: Default prior to Java 9. Uses multiple threads for GC.
- **G1 GC (Garbage First)**: Default since Java 9. Divides heap into regions and targets regions with the most garbage first. Great for large heaps.
- **ZGC / Shenandoah**: Modern, ultra-low latency GCs designed to pause for less than 1ms even on multi-terabyte heaps.

## 20. How do you configure JVM memory sizes?
Using JVM arguments when launching the application:
- `-Xms`: Initial heap size (e.g., `-Xms512m`).
- `-Xmx`: Maximum heap size (e.g., `-Xmx2g`).
- `-Xss`: Thread stack size.

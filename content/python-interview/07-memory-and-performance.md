---
title: "Memory & Performance"
description: "Reference counting, GC, profiling, and optimization techniques."
---

## 1. How does Python manage memory?
Python handles memory management automatically through two mechanisms:
1. **Reference Counting**: The primary mechanism. Every object keeps a count of how many references point to it. When the count hits zero, the object is immediately destroyed.
2. **Generational Garbage Collector**: Runs periodically to detect and clean up **Cyclic References** (e.g., Object A points to B, and B points to A), which reference counting cannot resolve.

## 2. What is a Reference Cycle?
A reference cycle occurs when two or more objects reference each other, preventing their reference counts from ever reaching zero, even if they are no longer accessible from the main program. The Garbage Collector (`gc` module) handles these.

```python
a = []
b = []
a.append(b)
b.append(a) # Cyclic reference
```

## 3. What is the `sys.getrefcount()` function?
It returns the number of references pointing to a specific object. (Note: The count returned is usually 1 higher than expected because passing the object to `sys.getrefcount()` creates a temporary reference).

```python
import sys
a = []
print(sys.getrefcount(a)) # 2
```

## 4. How does the Generational Garbage Collector work?
It divides objects into three "generations" (0, 1, 2). Newly created objects go to Generation 0. If they survive a GC sweep, they are promoted to Generation 1, and eventually Generation 2. Python collects Generation 0 most frequently, assuming that "most objects die young."

## 5. What is the `gc` module?
An interface to the garbage collector. You can use it to manually trigger collection (`gc.collect()`), disable it (`gc.disable()`), or inspect objects tracked by the collector.

## 6. What is the Global Interpreter Lock (GIL) and why does it exist?
The GIL is a mutex that protects access to Python objects, preventing multiple threads from executing Python bytecodes at once. It exists because CPython's memory management (reference counting) is **not thread-safe**. Without the GIL, two threads could decrement a reference count simultaneously, causing memory corruption.

## 7. How do you bypass the GIL for CPU-bound tasks?
Instead of using the `threading` module, use the `multiprocessing` module. This spawns entirely separate OS processes, each with its own Python interpreter, memory space, and GIL, allowing true parallel execution across multiple CPU cores.

## 8. What is CPython?
CPython is the default, most widely used implementation of the Python language. It is written in C. When you download Python from python.org, you are downloading CPython. Other implementations include Jython (Java), IronPython (.NET), and PyPy.

## 9. What is PyPy?
An alternative implementation of Python written in RPython. It features a Just-In-Time (JIT) compiler, which can execute Python code significantly faster than CPython, especially for long-running, CPU-intensive programs.

## 10. How do you profile Python code?
You can use the built-in `cProfile` module. It provides deterministic profiling, telling you how often and for how long various parts of the program executed.

```bash
python -m cProfile my_script.py
```

## 11. What is the `timeit` module?
A built-in module designed to accurately measure the execution time of small bits of Python code. It avoids common traps (like background processes) by running the code multiple times and taking the average.

```python
import timeit
print(timeit.timeit('"-".join(str(n) for n in range(100))', number=10000))
```

## 12. What are "slots" (`__slots__`) in Python?
By default, Python objects store their instance variables in a dynamic dictionary (`__dict__`). Dictionaries consume a lot of memory. By defining `__slots__` in a class, you tell Python exactly which variables exist, preventing the creation of `__dict__` and saving massive amounts of RAM for millions of objects.

```python
class Point:
    __slots__ = ['x', 'y']
```

## 13. What is String Interning?
An optimization technique where Python caches small or frequently used strings (like variable names or short strings containing only letters/numbers) in memory. If two variables are assigned the same string, they point to the exact same memory address (saving memory).

```python
a = "hello"
b = "hello"
print(a is b) # True (because of interning)
```

## 14. Why is list appending O(1) but inserting at the beginning O(N)?
Lists in Python are dynamic arrays. Appending to the end is fast O(1). However, inserting at index 0 requires shifting every single existing element in the array one position to the right, which takes O(N) time. Use `collections.deque` if you need fast front insertions.

## 15. How do you optimize memory for reading large files?
Do not use `file.read()` or `file.readlines()`, which load the entire file into RAM at once. Instead, iterate over the file object directly, which reads it line-by-line using a generator.

```python
with open("massive_file.csv") as f:
    for line in f:
        process(line) # Only one line in RAM at a time
```

## 16. What is Vectorization?
A technique used primarily in NumPy/Pandas where operations are applied to entire arrays of data at once, rather than iterating through elements with a Python `for` loop. The operations are pushed down to highly optimized C code, making them orders of magnitude faster.

## 17. What is `memoryview`?
A built-in class that allows Python code to access the internal data of an object (like a byte array) without copying it. It is heavily used in high-performance networking or file I/O to avoid unnecessary memory duplication.

## 18. What is the `weakref` module?
It allows you to create "weak references" to objects. A weak reference does not increase the object's reference count. If the object is only reachable via weak references, the garbage collector will destroy it. Useful for building caches.

## 19. Why are List Comprehensions faster than `for` loops?
List comprehensions are generally faster because they don't need to look up the `append` attribute on the list object for every single iteration, and the underlying C code is optimized for this specific pattern.

## 20. What is Cython?
A programming language that acts as a bridge between Python and C. It allows you to add static type declarations to Python code, which is then compiled into highly optimized C extensions. This can speed up mathematical operations by 100x while retaining Python's syntax.

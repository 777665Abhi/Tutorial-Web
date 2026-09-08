---
title: "Advanced Python"
description: "Iterators, Context Managers, Metaclasses, the GIL, and asyncio."
---

## 1. What is the Global Interpreter Lock (GIL)?
The GIL is a mutex in CPython that ensures only **one thread executes Python bytecode at a time**. This makes CPython thread-safe regarding its internal memory management (reference counting), but it means multithreading cannot achieve true parallelism for CPU-bound tasks in Python.

## 2. When should you use Multithreading vs Multiprocessing in Python?
- **Multithreading**: Good for **I/O-bound tasks** (network requests, reading files) because the GIL is released while waiting for I/O.
- **Multiprocessing**: Good for **CPU-bound tasks** (heavy math, image processing). It bypasses the GIL by creating entirely separate OS processes, each with its own Python interpreter and memory space, enabling true parallelism across multiple CPU cores.

## 3. What is the `asyncio` module?
`asyncio` is a library used to write concurrent code using the `async` / `await` syntax. It operates entirely on a single thread using an **Event Loop**. It is highly efficient for handling thousands of simultaneous I/O-bound connections (like web servers or web scrapers).

```python
import asyncio

async def fetch_data():
    await asyncio.sleep(1) # Simulates non-blocking network call
    return "Data"

async def main():
    print(await fetch_data())

asyncio.run(main())
```

## 4. What is a Metaclass?
If an object is an instance of a class, a class is an instance of a Metaclass. A Metaclass defines the behavior of classes. The default metaclass in Python is `type`. You can write custom metaclasses to automatically modify or inject methods into classes when they are created.

## 5. What is the `@contextmanager` decorator?
Found in the `contextlib` module, it allows you to create a context manager (for the `with` statement) using a simple generator function and `yield`, rather than writing a full class with `__enter__` and `__exit__`.

```python
from contextlib import contextmanager

@contextmanager
def open_file(name):
    f = open(name, 'w')
    try:
        yield f
    finally:
        f.close()

with open_file('test.txt') as f:
    f.write('hello')
```

## 6. What is the difference between `__getattr__` and `__getattribute__`?
Both are dunder methods for intercepting attribute access (`obj.attr`).
- `__getattribute__`: Called unconditionally for *every* attribute access. Very dangerous to override (easy to cause infinite recursion).
- `__getattr__`: Called *only as a fallback*, meaning it is only invoked if the attribute is NOT found in the object's dictionary.

## 7. What is a Descriptor?
A Descriptor is an object attribute with "binding behavior", meaning its access is overridden by methods in the descriptor protocol: `__get__()`, `__set__()`, and `__delete__()`. Properties, methods, and `staticmethod` are all implemented via descriptors.

## 8. What is the `dataclasses` module?
Introduced in Python 3.7, the `@dataclass` decorator automatically generates boilerplate code for classes that primarily store data, such as `__init__`, `__repr__`, and `__eq__`.

```python
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

p = Point(1.5, 2.5) # __init__ generated automatically
```

## 9. How does Garbage Collection work in Python?
Python uses two mechanisms:
1. **Reference Counting**: The primary method. Every object keeps a count of references pointing to it. When the count drops to zero, the object is immediately deallocated.
2. **Generational Garbage Collector**: A background process that specifically looks for and cleans up **Reference Cycles** (e.g., Object A points to Object B, and Object B points to Object A) which reference counting cannot handle.

## 10. What is monkey patching?
Monkey patching refers to dynamically modifying or replacing a class or module's behavior at runtime. It is often used in testing (to mock database calls) but is considered a bad practice in production code.

```python
import math
# Monkey patching the math module
math.pi = 3
```

## 11. What is the `collections.deque`?
A double-ended queue implemented as a doubly-linked list. It provides O(1) time complexity for appending and popping from both ends, whereas a standard Python list takes O(n) to pop from the front.

```python
from collections import deque
dq = deque([1, 2, 3])
dq.appendleft(0) # O(1)
```

## 12. What are Python's "slots"?
By default, Python stores instance attributes in a dynamic dictionary (`__dict__`). This consumes a lot of memory. By defining `__slots__` in a class, you tell Python exactly which attributes exist, bypassing the dictionary and saving significant memory for millions of objects.

```python
class Point:
    __slots__ = ['x', 'y']
```

## 13. What is Cython?
Cython is a superset of the Python language that allows you to write C extensions for Python. It compiles Python-like code into highly optimized C code, bypassing the GIL for certain operations and providing massive speedups for CPU-bound tasks.

## 14. Explain the difference between Deep and Shallow Copying.
- **Shallow Copy** (`copy.copy(obj)`): Creates a new object but populates it with *references* to the child objects found in the original.
- **Deep Copy** (`copy.deepcopy(obj)`): Creates a new object and recursively creates copies of all child objects. Fully independent.

## 15. What are Coroutines in Python?
Coroutines are generalized subroutines. While subroutines (functions) are entered at one point and exited at another, coroutines can be entered, exited, and resumed at many different points. In modern Python, they are defined using `async def` and `await`.

## 16. What is the difference between `eval()` and `exec()`?
- `eval(string)`: Evaluates a string as a single Python **expression** and returns the result (e.g., `eval("5 + 5")` returns `10`).
- `exec(string)`: Executes a string containing a block of Python **statements** (e.g., class definitions, loops). It returns `None`.

## 17. Why is `eval()` considered dangerous?
If you pass user input into `eval()`, a malicious user can execute arbitrary code on your server (e.g., `eval("os.system('rm -rf /')")`). Never use `eval()` with untrusted data. Use `ast.literal_eval()` for safe evaluation of strings containing Python literals.

## 18. What is Method Resolution Order (MRO)?
When a class uses multiple inheritance, MRO is the order in which Python searches for base classes to execute a method. Python uses the **C3 Linearization algorithm**. You can check the order by accessing the `__mro__` attribute on the class.

## 19. What is the `typing` module?
It provides runtime support for type hints. While Python is dynamically typed, the `typing` module allows you to specify complex types (like `List[int]`, `Dict[str, Any]`, `Optional[str]`) for use by static type checkers like `mypy`.

## 20. What is an Abstract Syntax Tree (AST)?
When Python compiles source code, it first parses the text into an Abstract Syntax Tree—a tree representation of the syntactic structure of the code. The `ast` module allows developers to inspect, modify, and execute Python code programmatically.

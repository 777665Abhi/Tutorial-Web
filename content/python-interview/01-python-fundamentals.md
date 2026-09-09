---
title: "Python Fundamentals"
description: "Data types, mutability, duck typing, and PEP 8 standards."
---

## 1. What is Python?
Python is a high-level, interpreted, dynamically typed, and garbage-collected programming language. It emphasizes code readability with its significant indentation.

```python
def greet(name):
    print(f"Hello, {name}!")
```

## 2. What does it mean that Python is dynamically typed?
You do not need to declare the type of a variable when you create one, and the type can change during execution. The type is determined at runtime based on the assigned value.

```python
x = 10      # x is an int
x = "Hello" # x is now a string (allowed)
```

## 3. What is PEP 8?
PEP 8 is the official style guide for Python code. It provides conventions on how to format code for maximum readability (e.g., using 4 spaces for indentation, `snake_case` for variables/functions, `CamelCase` for classes).

## 4. What is the difference between Python 2 and Python 3?
- **Python 2**: Legacy. `print` is a statement (`print "Hello"`). Strings are ASCII by default. Integer division truncates (`5/2 = 2`).
- **Python 3**: Modern. `print` is a function (`print("Hello")`). Strings are Unicode by default. True division (`5/2 = 2.5`).

## 5. Is Python compiled or interpreted?
Both. Python source code (`.py`) is first compiled into intermediate bytecode (`.pyc`). This bytecode is then executed (interpreted) by the Python Virtual Machine (PVM).

## 6. What is mutability in Python?
Mutability refers to whether an object's state can be modified after it is created.
- **Mutable**: `list`, `dict`, `set`. You can change their contents without creating a new object.
- **Immutable**: `int`, `float`, `str`, `tuple`. Any operation that modifies them actually creates a brand new object in memory.

## 7. How are arguments passed in Python (Pass by Value or Pass by Reference)?
Python uses **"Pass by Object Reference"** (or Pass by Assignment). 
- If you pass an immutable object (like a string), it acts like pass-by-value. 
- If you pass a mutable object (like a list), changes made inside the function affect the original object.

```python
def modify(lst):
    lst.append(4) # Affects the original list

my_list = [1, 2, 3]
modify(my_list)
print(my_list) # [1, 2, 3, 4]
```

## 8. What is the difference between `==` and `is`?
- `==` checks for **value equality**: Do these two objects have the same content?
- `is` checks for **identity equality**: Do these two variables point to the exact same memory address?

```python
a = [1, 2, 3]
b = [1, 2, 3]
print(a == b) # True
print(a is b) # False
```

## 9. What is Duck Typing?
"If it walks like a duck and quacks like a duck, then it must be a duck." Python does not care about the specific type of an object, only whether it has the required methods or attributes at runtime.

```python
def invoke_quack(animal):
    animal.quack() # Works as long as the object has a quack() method
```

## 10. How does String Formatting work in Python?
There are three main ways:
1. Old style: `"%s %s" % ("Hello", "World")`
2. `format()` method: `"{} {}".format("Hello", "World")`
3. **f-strings** (Python 3.6+): `f"{greeting} {name}"` (Most readable and fastest).

## 11. What is the difference between `/` and `//`?
- `/` performs float division (true division). `5 / 2` returns `2.5`.
- `//` performs integer division (floor division). `5 // 2` returns `2`.

## 12. What are `*args` and `**kwargs`?
They allow a function to accept a variable number of arguments.
- `*args`: Collects extra positional arguments into a **tuple**.
- `**kwargs`: Collects extra keyword arguments into a **dictionary**.

```python
def my_func(*args, **kwargs):
    print(args)   # (1, 2)
    print(kwargs) # {'name': 'Alice'}

my_func(1, 2, name="Alice")
```

## 13. What is the `None` type?
`None` is a special constant in Python that represents the absence of a value or a null value. It is an object of its own datatype, the `NoneType`.

## 14. How do you swap two variables without a temporary variable?
Python supports tuple packing and unpacking, allowing you to swap variables in a single line.

```python
a, b = 5, 10
a, b = b, a # Swapped!
```

## 15. What are docstrings?
A docstring (documentation string) is a string literal that occurs as the first statement in a module, function, class, or method definition. It is used to explain what the code does and is accessible via the `__doc__` attribute.

```python
def add(a, b):
    """Returns the sum of a and b."""
    return a + b
```

## 16. What is type hinting?
Introduced in Python 3.5, type hints allow you to specify the expected types of variables, arguments, and return values. They do not enforce types at runtime but are used by IDEs and linters (like `mypy`) to catch errors.

```python
def greet(name: str) -> str:
    return f"Hello {name}"
```

## 17. Explain the `zip()` function.
It takes iterables (can be zero or more), aggregates them in a tuple, and returns an iterator of tuples. It stops when the shortest input iterable is exhausted.

```python
names = ["Alice", "Bob"]
ages = [25, 30]
print(list(zip(names, ages))) # [('Alice', 25), ('Bob', 30)]
```

## 18. What is the `id()` function?
It returns the unique "identity" of an object. In CPython, this is the memory address of the object. It is the value compared when using the `is` operator.

## 19. What is the difference between a local and global variable?
Local variables are defined inside a function and only accessible there. Global variables are defined outside all functions. To modify a global variable inside a function, you must explicitly declare it using the `global` keyword.

```python
count = 0
def increment():
    global count
    count += 1
```

## 20. How do you take user input in Python?
Using the `input()` function. It pauses execution, waits for the user to type something, and always returns the input as a string.

```python
name = input("Enter your name: ")
```

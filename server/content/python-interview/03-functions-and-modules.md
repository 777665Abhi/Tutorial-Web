---
title: "Functions & Modules"
description: "args, kwargs, lambdas, decorators, and generators."
---

## 1. What is a lambda function?
A lambda function is a small, anonymous function defined using the `lambda` keyword. It can take any number of arguments but can only have one expression (no statements like `return` or `if`).

```python
# Regular function
def add(x, y): return x + y

# Lambda function
add_lambda = lambda x, y: x + y
print(add_lambda(2, 3)) # 5
```

## 2. What is the `map()` function?
`map(function, iterable)` applies a given function to every item of an iterable (list, tuple) and returns a map object (which is an iterator).

```python
nums = [1, 2, 3]
squared = list(map(lambda x: x**2, nums)) # [1, 4, 9]
```

## 3. What is the `filter()` function?
`filter(function, iterable)` constructs an iterator from elements of an iterable for which the function returns `True`.

```python
nums = [1, 2, 3, 4]
evens = list(filter(lambda x: x % 2 == 0, nums)) # [2, 4]
```

## 4. What is the `reduce()` function?
Located in the `functools` module, `reduce(function, iterable)` applies a rolling computation to sequential pairs of values in a list to reduce it to a single value.

```python
from functools import reduce
nums = [1, 2, 3, 4]
product = reduce(lambda x, y: x * y, nums) # 24
```

## 5. What are Closures in Python?
A closure occurs when a nested function captures and remembers the variables from its enclosing function's scope, even after the outer function has finished executing.

```python
def outer(msg):
    def inner():
        print(msg) # Remembers 'msg'
    return inner

my_closure = outer("Hello")
my_closure() # "Hello"
```

## 6. What is a Decorator?
A decorator is a function that takes another function and extends its behavior without explicitly modifying it. It makes heavy use of closures. They are denoted using the `@` symbol.

```python
def uppercase_decorator(func):
    def wrapper():
        result = func()
        return result.upper()
    return wrapper

@uppercase_decorator
def greet():
    return "hello"

print(greet()) # "HELLO"
```

## 7. How do you apply multiple decorators to a single function?
You stack them above the function. They are executed "bottom-up" (the one closest to the function definition is applied first).

```python
@decorator1
@decorator2
def my_func():
    pass
# Equivalent to: my_func = decorator1(decorator2(my_func))
```

## 8. What is a Generator?
A generator is a special type of function that returns a lazy iterator. Instead of returning all values at once and storing them in memory (like a list), it generates values one by one using the `yield` keyword.

```python
def my_generator():
    yield 1
    yield 2

gen = my_generator()
print(next(gen)) # 1
```

## 9. What is the difference between `yield` and `return`?
- `return`: Exits the function completely and destroys its local state.
- `yield`: Pauses the function, saves its local state, and returns a value to the caller. When called again via `next()`, it resumes right where it left off.

## 10. What are Generator Expressions?
Similar to list comprehensions, but they use parentheses `()` instead of brackets `[]`. They return a generator object instead of a list, making them highly memory efficient for large datasets.

```python
gen_expr = (x**2 for x in range(1000000)) # Takes almost zero memory
```

## 11. What is the difference between an Iterable and an Iterator?
- **Iterable**: An object that can be iterated over (List, String, Tuple). It implements `__iter__()` which returns an iterator.
- **Iterator**: An object that produces the next value when `next()` is called. It implements `__next__()`. All iterators are iterables, but not all iterables are iterators.

## 12. What is a Module in Python?
A module is simply a file containing Python code (variables, functions, classes) with a `.py` extension. You use `import` to bring its contents into another script.

## 13. What is a Package?
A package is a directory that contains multiple modules and a special file named `__init__.py`. This file tells Python to treat the directory as a package.

## 14. What does `if __name__ == "__main__":` do?
It prevents code from being executed when the module is imported into another script. The code inside this block only runs if the script is executed directly from the terminal.

## 15. What is the `sys.path` variable?
A list of strings that specifies the search path for modules. When you `import` a module, Python looks through the directories in `sys.path` in order until it finds it.

## 16. What is the difference between `import module` and `from module import func`?
- `import math`: Imports the entire module. You must access functions via the namespace (e.g., `math.sqrt()`).
- `from math import sqrt`: Imports only the specific function directly into your current namespace. You can call `sqrt()` without the prefix.

## 17. How do you reload a previously imported module?
Python caches modules after the first import for performance. To force a reload (e.g., if the file changed during an interactive session), use `importlib.reload(module)`.

## 18. What is the `functools.wraps` decorator used for?
When you write a decorator, the wrapper function replaces the original function, overriding its metadata (like `__name__` and docstrings). `@wraps` copies the metadata from the original function to the wrapper.

## 19. What is a Recursive Function?
A function that calls itself during its execution. It must have a "base case" to terminate; otherwise, it will result in a `RecursionError` (stack overflow).

## 20. What is Tail Call Optimization? Does Python support it?
Tail call optimization is a compiler trick where if a function's last action is a recursive call, it reuses the current stack frame instead of creating a new one. **Python does NOT support this**, preferring to keep full stack traces for debugging.

---
title: "Exception Handling"
description: "Try, except, finally, raise, and custom exceptions."
---

## 1. What is an Exception in Python?
An exception is an error that occurs during the execution of a program (at runtime) which disrupts the normal flow of instructions. Examples include `ZeroDivisionError`, `TypeError`, or `KeyError`.

## 2. How do you handle exceptions in Python?
Using the `try`, `except`, `else`, and `finally` blocks.

```python
try:
    x = 10 / 0
except ZeroDivisionError:
    print("Cannot divide by zero")
```

## 3. What is the `finally` block?
A block of code that **always** executes, regardless of whether an exception was raised or not, and regardless of whether the exception was caught. It is strictly used for cleaning up resources (closing files, releasing locks).

```python
try:
    f = open("file.txt", "r")
    # read file
finally:
    f.close() # Guaranteed to execute
```

## 4. What is the `else` block in exception handling?
The `else` block executes *only* if the `try` block completes successfully without raising any exceptions. It is better to put code here than in the `try` block to avoid accidentally catching exceptions you didn't mean to.

```python
try:
    result = 10 / 2
except ZeroDivisionError:
    print("Error")
else:
    print(f"Success: {result}")
```

## 5. Can you catch multiple exceptions in one block?
Yes, by grouping them in a tuple.

```python
try:
    # risky code
    pass
except (TypeError, ValueError) as e:
    print(f"Caught an error: {e}")
```

## 6. What is the difference between `except Exception:` and `except:`?
- `except Exception:` catches all standard runtime exceptions (which inherit from `Exception`). This is usually acceptable.
- `except:` (a bare except) catches *absolutely everything*, including system-exiting exceptions like `KeyboardInterrupt` (Ctrl+C) and `SystemExit`. **This is highly discouraged** as it makes the program impossible to kill gracefully.

## 7. How do you manually trigger an exception?
Using the `raise` keyword.

```python
def check_age(age):
    if age < 0:
        raise ValueError("Age cannot be negative")
```

## 8. What does `raise` do without arguments?
If used inside an `except` block, a bare `raise` re-raises the exact same exception that was just caught, preserving its original stack trace.

```python
try:
    1 / 0
except ZeroDivisionError:
    print("Logging error...")
    raise # Passes the ZeroDivisionError up the stack
```

## 9. How do you create a Custom Exception?
You create a new class that inherits from Python's built-in `Exception` class (or one of its subclasses).

```python
class InsufficientFundsError(Exception):
    pass

# raise InsufficientFundsError("Balance is too low")
```

## 10. What is an AssertionError?
An exception raised by the `assert` statement when the condition being evaluated evaluates to `False`. It is used primarily for debugging to verify that internal conditions hold true.

```python
x = -5
assert x >= 0, "x must be positive" # Raises AssertionError
```

## 11. Can assertions be disabled?
Yes. If you run Python with the `-O` (optimize) flag (`python -O script.py`), all `assert` statements are completely ignored and stripped from the compiled bytecode. Therefore, **never use assertions for data validation or business logic**.

## 12. What is `SyntaxError`?
Unlike other exceptions that occur at runtime, a `SyntaxError` occurs at compile-time when the Python parser encounters invalid syntax (e.g., missing a colon, mismatched parentheses). It cannot be caught by a standard `try/except` block running in the same file.

## 13. How do you get the full Stack Trace of an exception?
You can use the `traceback` module to print or format the exact lines of code that led to the crash.

```python
import traceback
try:
    1 / 0
except Exception:
    traceback.print_exc()
```

## 14. What is Exception Chaining?
In Python 3, if you catch an exception and raise a completely new one, you can link them together using the `from` keyword so the original context isn't lost.

```python
try:
    1 / 0
except ZeroDivisionError as e:
    raise ValueError("Invalid math operation") from e
```

## 15. What are the Context Manager methods?
Context managers (used with the `with` statement) replace `try/finally` for resource management. A class must implement two dunder methods to act as a context manager:
- `__enter__(self)`: Setup logic (returns the resource).
- `__exit__(self, exc_type, exc_val, traceback)`: Teardown logic (executed even if an exception occurs inside the `with` block).

## 16. How do you suppress an exception silently?
You can use a `try/except` block with `pass`, or more cleanly, use `contextlib.suppress`.

```python
from contextlib import suppress

with suppress(FileNotFoundError):
    os.remove("somefile.tmp") # Fails silently if file doesn't exist
```

## 17. What is `StopIteration`?
An exception raised implicitly by the `next()` function (or loops) to signal that an Iterator has exhausted all of its values.

## 18. Why should you avoid catching `BaseException`?
`BaseException` is the very top of the exception hierarchy. Catching it will catch `SystemExit` and `KeyboardInterrupt`, preventing the script from being easily shut down by the OS or the user.

## 19. If a `return` statement is in both `try` and `finally`, which one executes?
The `return` statement in the `finally` block will override the `return` statement in the `try` block, because `finally` is guaranteed to be the last thing executed before the function yields control back to the caller.

## 20. What is `LBYL` vs `EAFP`?
Two different programming philosophies:
- **LBYL (Look Before You Leap)**: Check conditions explicitly before acting (e.g., `if key in dict: val = dict[key]`).
- **EAFP (Easier to Ask for Forgiveness than Permission)**: Just attempt the operation and catch the exception if it fails (e.g., `try: val = dict[key] except KeyError: ...`). Python heavily favors the EAFP style as it is faster and cleaner.

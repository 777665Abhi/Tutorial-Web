---
title: "Exception Handling"
description: "Master try-catch, checked/unchecked exceptions, and custom errors."
---

## 1. What is the difference between `Error` and `Exception`?
Both extend `Throwable`. An `Error` represents a severe problem (like `OutOfMemoryError`) that a reasonable application should not try to catch. An `Exception` represents conditions a program can and should catch.

## 2. What are Checked vs Unchecked Exceptions?
- **Checked (Compile-time)**: Extend `Exception` (except `RuntimeException`). Must be caught or declared in the method signature (e.g., `IOException`).
- **Unchecked (Runtime)**: Extend `RuntimeException`. Not checked at compile time (e.g., `NullPointerException`). Indicates programming flaws.

## 3. What is the `finally` block?
A block of code placed after `try-catch` that will **always** execute, whether an exception is thrown or not. It is used to close resources like database connections or file streams.

## 4. Can a `finally` block not execute?
Yes, but only in extreme cases: if `System.exit()` is called, if the JVM crashes, or if the thread executing the try/catch is killed/interrupted.

## 5. What is the difference between `throw` and `throws`?
- **`throw`**: Used explicitly inside a method to throw a specific exception instance (`throw new Exception()`).
- **`throws`**: Used in a method signature to declare that the method *might* throw an exception, forcing the caller to handle it.

## 6. Can we have a `try` block without a `catch` block?
Yes, but it must be followed by a `finally` block. A `try` cannot exist on its own.

## 7. What is Multi-catch in Java 7?
It allows catching multiple exception types in a single catch block to prevent code duplication: `catch (IOException | SQLException e) { ... }`.

## 8. What is Try-with-Resources?
Introduced in Java 7, it automatically closes resources (like files or DB connections) that implement `AutoCloseable` when the try block exits, eliminating the need for a explicit `finally` block.

## 9. How do you create a Custom Exception?
Create a class that extends `Exception` (for a checked exception) or `RuntimeException` (for unchecked), and provide a constructor that takes a String message and calls `super(message)`.

## 10. Can you catch a `NullPointerException`?
Yes, because it extends `RuntimeException`. However, it is bad practice. You should instead add null-checks (`if (obj == null)`) to prevent it from happening in the first place.

## 11. What is Exception Propagation?
When an exception occurs, it is thrown to the top of the call stack. If not caught, it drops down to the previous method, continuing down the stack until caught or until it terminates the program.

## 12. Are exceptions expensive in Java?
Yes. Creating an exception is slow because the JVM must capture the entire thread stack trace when the exception is instantiated. Avoid using exceptions for normal control flow.

## 13. What happens if both `try` and `finally` blocks return a value?
The value returned by the `finally` block overrides the value returned by the `try` (or `catch`) block. This is often considered bad practice.

## 14. What is `Chained Exceptions`?
It is the process of throwing a new exception but preserving the original exception as its cause (e.g., `throw new CustomException("DB Error", originalSqlException)`), ensuring stack traces show the root cause.

## 15. What is `StackOverflowError`?
It is a runtime error thrown when the application recurses too deeply, exhausting the fixed stack memory allocated to the thread.

## 16. What is the output of throwing an exception in a static block?
Since static blocks run during class loading, throwing an exception there causes an `ExceptionInInitializerError`, and the class will fail to load into the JVM.

## 17. Can an overriding method throw checked exceptions?
An overriding method in a subclass can only throw the same checked exceptions as the parent method, or subclasses of those exceptions. It cannot throw *new* or *broader* checked exceptions. It can throw any unchecked exception.

## 18. What is the difference between `ClassNotFoundException` and `NoClassDefFoundError`?
- `ClassNotFoundException`: Thrown when trying to dynamically load a class (via `Class.forName()`) that isn't on the classpath.
- `NoClassDefFoundError`: Thrown when a class was present during compile-time, but is missing at runtime.

## 19. What is `ConcurrentModificationException`?
Thrown usually by collections when you try to modify (add/remove) elements from a collection while simultaneously iterating over it using a standard `for-each` loop or basic iterator.

## 20. How do you resolve `ConcurrentModificationException`?
Instead of a `for-each` loop, use an explicit `Iterator` and call `iterator.remove()`, or use concurrent collections like `ConcurrentHashMap` or `CopyOnWriteArrayList`.

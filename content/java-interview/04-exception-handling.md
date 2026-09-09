---
title: "Exception Handling"
description: "Checked vs Unchecked, Try-Catch, Finally, and custom exceptions."
---

## 1. What is an Exception in Java?
An Exception is an unwanted or unexpected event occurring during the execution of a program (runtime) that disrupts the normal flow of instructions. Examples include `NullPointerException` or `ArithmeticException` (divide by zero).

## 2. Explain the Exception Hierarchy in Java.
- **`Throwable`**: The root class.
  - **`Error`**: Irrecoverable conditions (e.g., `OutOfMemoryError`, `StackOverflowError`). Programs should not try to catch these.
  - **`Exception`**: Recoverable conditions.
    - **`RuntimeException`** (and subclasses): Unchecked exceptions.
    - **Other Exceptions** (e.g., `IOException`): Checked exceptions.

## 3. What is the difference between Checked and Unchecked Exceptions?
- **Checked Exceptions**: Checked by the compiler at compile-time. The programmer *must* handle them using a `try-catch` block or declare them using the `throws` keyword. (e.g., `IOException`, `SQLException`).
- **Unchecked Exceptions**: Not checked at compile-time. They extend `RuntimeException` and usually indicate programming logic errors. (e.g., `NullPointerException`, `IndexOutOfBoundsException`).

```java
// Checked: Compiler forces you to handle this
File file = new File("test.txt");
FileInputStream fis = new FileInputStream(file); // Error if not in try-catch

// Unchecked: Compiler doesn't force you
int a = 10 / 0; // ArithmeticException at runtime
```

## 4. What is the `try-catch` block?
Used to handle exceptions. The code that might throw an exception is placed in the `try` block. If an exception occurs, execution immediately jumps to the corresponding `catch` block where the error is handled.

```java
try {
    int data = 50 / 0;
} catch (ArithmeticException e) {
    System.out.println("Cannot divide by zero");
}
```

## 5. What is the `finally` block?
A block of code that is executed *always*, whether an exception is thrown or not, and whether it is caught or not. It is typically used to close resources like database connections or file streams.

```java
try {
    // Open DB connection
} finally {
    // Close DB connection (Guaranteed to execute)
}
```

## 6. Under what circumstances will the `finally` block NOT execute?
The `finally` block will not execute if:
1. `System.exit()` is called in the try or catch block (the JVM shuts down).
2. The JVM crashes or the host system loses power.
3. An infinite loop occurs in the try/catch block.

## 7. What is the difference between `throw` and `throws`?
- **`throw`**: Used explicitly inside a method body to throw a specific exception object.
- **`throws`**: Used in the method signature to declare that the method might throw certain exceptions, delegating the responsibility of handling them to the caller.

```java
// 'throws' in signature
void checkAge(int age) throws Exception {
    if (age < 18) {
        // 'throw' actual object
        throw new Exception("Too young");
    }
}
```

## 8. Can you have multiple `catch` blocks?
Yes. You can have multiple `catch` blocks to handle different types of exceptions differently. However, you must order them from most specific (subclass) to most general (superclass), otherwise, it results in a compile-time error.

```java
try {
    // code
} catch (NullPointerException e) { // Specific
    // handle
} catch (Exception e) { // General fallback
    // handle
}
```

## 9. What is a Multi-catch block (Java 7)?
Introduced in Java 7, it allows catching multiple unrelated exceptions in a single `catch` block using the pipe `|` operator, reducing code duplication.

```java
try {
    // risk code
} catch (IOException | SQLException e) {
    logger.error(e.getMessage());
}
```

## 10. What is Try-with-Resources (Java 7)?
An enhancement that automatically closes resources (like files, sockets, DB connections) at the end of the `try` block, removing the need for a bulky `finally` block. The resource must implement the `AutoCloseable` interface.

```java
// 'br' will be automatically closed!
try (BufferedReader br = new BufferedReader(new FileReader("test.txt"))) {
    System.out.println(br.readLine());
} catch (IOException e) {
    e.printStackTrace();
}
```

## 11. What is a Custom Exception?
A user-defined exception created by extending the `Exception` class (for a checked exception) or the `RuntimeException` class (for an unchecked exception). It allows developers to create domain-specific error types.

```java
class InvalidUserException extends RuntimeException {
    public InvalidUserException(String message) {
        super(message);
    }
}
// throw new InvalidUserException("User not found");
```

## 12. What happens if an exception is thrown inside a `finally` block?
If an exception is thrown in the `finally` block, it overwrites the original exception thrown in the `try` block. The original exception is lost (swallowed) unless it is explicitly handled.

## 13. What is Exception Propagation?
If an exception is not caught in the method where it occurred, it propagates up the Call Stack to the method that called it, and so on, until it is caught. Unchecked exceptions propagate automatically. Checked exceptions must be explicitly declared with `throws` to propagate.

## 14. What are the rules for Exception Handling in Method Overriding?
1. If the parent's method does *not* declare an exception, the overriding child method cannot declare a Checked exception (but can declare Unchecked).
2. If the parent's method declares an exception, the child method can declare the same exception, a subclass of it, or no exception at all, but it CANNOT declare a broader superclass exception.

## 15. What is `ClassNotFoundException` vs `NoClassDefFoundError`?
- **`ClassNotFoundException`**: A checked exception thrown when an application tries to load a class at runtime using `Class.forName()`, but the class is not found in the classpath.
- **`NoClassDefFoundError`**: An Error thrown when the JVM successfully compiled against the class, but cannot find the `.class` file at runtime (usually due to a missing JAR or broken classpath).

## 16. What is a StackTrace?
An array of stack trace elements representing the execution stack. It shows exactly which classes and line numbers were executing when the exception occurred, printed via `e.printStackTrace()`.

## 17. Is it good practice to catch the generic `Exception` class?
No. Catching the generic `Exception` class (a "catch-all") hides programming errors and makes debugging difficult. You should always catch specific exceptions you expect and know how to recover from.

## 18. What happens if you return a value from a `finally` block?
If you place a `return` statement in a `finally` block, it will silently override any `return` statement or exception thrown in the `try` or `catch` blocks. This is considered an anti-pattern.

## 19. What is `Suppressed Exceptions`?
In Try-with-Resources, if an exception is thrown in the `try` block, and another exception is thrown while automatically closing the resource, the close exception is "suppressed" and attached to the primary exception. You can access it via `e.getSuppressed()`.

## 20. Can we throw an Error manually?
Yes, using `throw new OutOfMemoryError()`, but it is highly discouraged. Errors indicate serious problems that a reasonable application should not try to catch or simulate.

---
title: "Functions, Lambdas & Extensions"
description: "Use Kotlin's functional features clearly and understand how they compile."
---

## 1. What are higher-order functions?

A higher-order function accepts another function as an argument, returns a function, or both. Kotlin uses function types such as `(Int) -> Boolean` to describe them.

```kotlin
fun filterPositive(values: List<Int>, predicate: (Int) -> Boolean) =
    values.filter(predicate)
```

## 2. What are lambda expressions and anonymous functions?

A lambda is an unnamed function expression whose last expression is its result. An anonymous function has explicit `fun` syntax and can be useful when return behavior needs to be clearer.

```kotlin
val doubled = listOf(1, 2, 3).map { it * 2 }
```

## 3. What are inline functions and `noinline`/`crossinline`?

`inline` asks the compiler to substitute a function and its lambda arguments at the call site, reducing allocation overhead for small higher-order functions. `noinline` prevents a particular lambda from being inlined. `crossinline` prevents a non-local return from an inlined lambda.

Inlining should be used for small, frequently called abstractions, not as a general optimization rule.

## 4. What are extension functions?

An extension function adds callable syntax to an existing type without modifying or inheriting from it.

```kotlin
fun String.initials(): String =
    trim().split(" ").mapNotNull { it.firstOrNull()?.uppercase() }.joinToString("")
```

Extensions are statically resolved. If a class already has a member with the same signature, the member takes precedence.

## 5. Explain Kotlin scope functions.

- `let` uses `it` and returns the lambda result; it is useful for null-safe transformations.
- `run` uses `this` and returns the lambda result.
- `with` uses `this` and returns the lambda result for a supplied object.
- `apply` uses `this` and returns the receiver; it is useful for configuration.
- `also` uses `it` and returns the receiver; it is useful for side effects such as logging.

Choose the function based on the desired receiver style and return value rather than chaining them automatically.

## 6. What is a non-local return?

In an inline lambda, an unqualified `return` can return from the surrounding function, not just the lambda. This is called a non-local return. Marking a lambda `crossinline` disallows that behavior.

## 7. What are default arguments?
They allow you to assign a default value to a function parameter, so the caller can omit it.

## 8. What are named arguments?
They allow you to specify the names of parameters when calling a function, improving readability and allowing arbitrary parameter order.

## 9. What is the `vararg` keyword?
It allows a function to accept a variable number of arguments (like `String...` in Java).

## 10. What is an `infix` function?
A function marked with `infix` can be called without dots and parentheses (e.g., `5 add 10`).

## 11. What are the requirements for an `infix` function?
It must be a member function or an extension function, must have exactly one parameter, and that parameter cannot have a default value.

## 12. What is an operator overloading function?
By using the `operator` keyword, you can redefine standard operators (like `+`, `-`, `*`) for your custom classes.

## 13. What is a `tailrec` function?
It optimizes recursive functions into iterative loops to prevent StackOverflow errors. The recursive call must be the very last operation.

## 14. What does the `let` scope function do?
It executes a block of code within the context of an object (accessible via `it`) and returns the result of the block. Often used for null checks.

## 15. What does the `apply` scope function do?
It executes a block of code on an object (accessible via `this`) and returns the object itself. Commonly used for initialization.

## 16. What does the `run` scope function do?
It is like a combination of `with` and `let`. It takes the object as `this` and returns the lambda result.

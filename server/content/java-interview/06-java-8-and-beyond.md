---
title: "Java 8+ & Functional Programming"
description: "Master Lambdas, Streams, Optional, and modern Java features up to Java 21."
---

## 1. What are Lambda Expressions?
Introduced in Java 8, a lambda expression is an anonymous function (no name, no return type declared). It provides a clear and concise way to represent a method interface using an expression. Syntax: `(parameters) -> expression`.

## 2. What is a Functional Interface?
An interface that contains exactly one abstract method. They can have multiple `default` or `static` methods. They are used as the target type for lambda expressions. Marked with `@FunctionalInterface`.

## 3. Name some built-in Functional Interfaces in Java.
- `Predicate<T>`: Takes an argument, returns a boolean.
- `Consumer<T>`: Takes an argument, returns nothing (`void`).
- `Supplier<T>`: Takes no arguments, returns a result.
- `Function<T, R>`: Takes an argument of type T, returns a result of type R.

## 4. What is the Streams API?
A new abstraction introduced in Java 8 that lets you process collections of data in a declarative way (like SQL). Streams are not data structures; they take input from Collections, Arrays, etc., and pipeline them.

## 5. What is the difference between Intermediate and Terminal operations?
- **Intermediate**: Operations that return another Stream (e.g., `map`, `filter`, `sorted`). They are lazy and don't execute until a terminal operation is invoked.
- **Terminal**: Operations that return a non-stream result (e.g., `collect`, `forEach`, `count`). They trigger the actual processing of the stream.

## 6. What does `map()` do in a Stream?
It transforms each element in a stream into a different object. For example, extracting just the names from a list of `User` objects into a stream of `String`s.

## 7. What does `filter()` do in a Stream?
It evaluates a `Predicate` against every element in the stream. If the predicate returns true, the element is kept; otherwise, it is discarded.

## 8. What does `flatMap()` do?
It is a combination of `map()` and flattening. It transforms each element into a stream of other objects, and then "flattens" all those individual streams into one single large stream.

## 9. What is the `Optional` class?
A container object used to contain not-null objects. It was introduced to prevent `NullPointerException`s and provide a clean API for cases where a value may or may not be present (e.g., `Optional.ofNullable()`, `ifPresent()`).

## 10. What are Method References?
A shorthand syntax for a lambda expression that simply calls an existing method. Syntax: `ClassName::methodName`. E.g., `System.out::println` instead of `x -> System.out.println(x)`.

## 11. What are Default Methods in Interfaces?
Introduced in Java 8, they allow interfaces to have concrete methods with implementation bodies using the `default` keyword. This allowed adding new methods to interfaces without breaking old code that implemented them.

## 12. How does Java handle multiple inheritance of Default Methods?
If a class implements two interfaces that have the exact same default method signature, the compiler throws an error. The class *must* override the method to resolve the ambiguity.

## 13. What is the `var` keyword (Java 10)?
It enables Local Variable Type Inference. You can declare local variables without specifying their explicit type; the compiler infers it from the assigned value. `var x = 10; // infers int`.

## 14. What are Java Records (Java 14)?
A `record` is a special type of class designed to hold immutable data. It automatically generates the constructor, getters, `equals()`, `hashCode()`, and `toString()`, eliminating immense boilerplate for DTOs.

## 15. What are Sealed Classes (Java 15)?
A `sealed` class restricts which other classes can extend it. You define the allowed subclasses using the `permits` clause, providing exhaustive control over class hierarchies for better domain modeling.

## 16. What are Text Blocks (Java 15)?
They allow you to declare multi-line strings without needing endless concatenation (`+`) or escape characters for quotes, using triple quotes `"""`.

## 17. What is Pattern Matching for `instanceof` (Java 16)?
It removes the need to explicitly cast an object after checking its type. 
Old: `if(obj instanceof String) { String s = (String)obj; ... }`
New: `if(obj instanceof String s) { ...use s directly... }`

## 18. What are Switch Expressions (Java 14)?
Switch statements were upgraded to expressions that can yield a value. They use an arrow syntax `case ->` which eliminates the need for `break` statements and prevents fall-through bugs.

## 19. What is a Parallel Stream?
A stream that leverages the multi-core CPU by splitting the work into multiple threads (using the ForkJoinPool) automatically. Simply call `.parallelStream()` instead of `.stream()`.

## 20. When should you NOT use a Parallel Stream?
Do not use them for small datasets, or when the operations involve stateful variables, heavy blocking I/O, or thread synchronization, as the overhead of splitting and merging threads will make it much slower than a sequential stream.

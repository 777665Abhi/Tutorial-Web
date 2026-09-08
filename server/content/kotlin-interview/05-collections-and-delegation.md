---
title: "Collections & Delegated Properties"
description: "Compare Kotlin collection types and use delegation without hidden surprises."
---

## 1. What is the difference between `List`, `MutableList`, `Set`, and `Map`?

`List` preserves order and allows duplicate values. `MutableList` additionally supports updates. `Set` stores unique values, while `Map` stores key-value pairs with unique keys. Prefer read-only interfaces at API boundaries and keep mutation private.

## 2. What is the difference between `map`, `flatMap`, and `mapNotNull`?

`map` transforms each item into one result. `flatMap` transforms each item into an iterable and flattens all results. `mapNotNull` transforms items and removes null results.

```kotlin
val words = listOf("one two", "three")
val lengths = words.flatMap { it.split(" ") }.map(String::length)
```

## 3. What is the difference between `Sequence` and a collection?

Collection operations are generally eager: each intermediate operation creates a result. A `Sequence` evaluates operations lazily and can avoid intermediate allocations, especially in long chains or large data sets. For small collections, the overhead of a sequence may not be worthwhile.

## 4. How do `fold` and `reduce` differ?

Both combine values into one result. `fold` requires an initial accumulator and works with an empty collection. `reduce` uses the first element as the initial accumulator and therefore fails on an empty collection.

## 5. What is property delegation?

Delegation moves property getter and setter behavior to another object using the `by` syntax.

```kotlin
val config by lazy { loadConfig() }
```

`lazy` initializes a value on first access and caches it. `Delegates.observable` runs a callback after a property changes.

## 6. What is class delegation?

Class delegation forwards an interface implementation to another object, reducing boilerplate while allowing the delegating class to add or override behavior.

```kotlin
class LoggingList<T>(private val delegate: List<T>) : List<T> by delegate
```

## 7. What is the difference between `Array` and `IntArray`?
`Array<Int>` uses boxed integers (like Java's `Integer[]`), which use more memory. `IntArray` uses unboxed primitives (like Java's `int[]`).

## 8. What does the `zip` function do?
It takes two collections and pairs their elements together into a list of `Pair` objects.

## 9. What does `partition` do?
It splits a collection into a `Pair` of two lists based on a condition: one list where the condition is true, and one where it is false.

## 10. What is `chunked`?
It breaks a collection into a list of smaller lists of a specified size.

## 11. What is `windowed`?
It returns a list of "sliding window" views over the collection. For example, window size 3 on `[1,2,3,4]` gives `[[1,2,3], [2,3,4]]`.

## 12. What does `associate` do?
It builds a `Map` from a list. You provide a lambda that returns a key-value pair for each element.

## 13. What is `by lazy`?
It is a built-in delegate that computes its value only upon first access, and caches the result for all subsequent accesses.

## 14. What is `Delegates.observable`?
It is a property delegate that triggers a callback every time the property's value is modified.

## 15. What is `Delegates.vetoable`?
It is a delegate that allows you to intercept an assignment and either accept or reject the new value based on a condition.

## 16. What does the `distinct` operator do?
It returns a new list containing only unique elements from the original collection.

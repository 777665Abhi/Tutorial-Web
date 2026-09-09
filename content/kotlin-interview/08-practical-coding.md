---
title: "Practical Kotlin Coding Questions"
description: "Work through idiomatic coding patterns, performance tradeoffs, and common interview exercises."
---

## 1. How would you find duplicate values in a list?

Use a set to track values already seen. The operation is typically $O(n)$ time and $O(n)$ additional space.

```kotlin
fun <T> duplicates(values: List<T>): Set<T> {
    val seen = mutableSetOf<T>()
    return values.filterNot(seen::add).toSet()
}
```

## 2. How would you group objects by a property?

Use `groupBy` when you want a map from a key to all matching values.

```kotlin
data class Employee(val name: String, val team: String)

val byTeam: Map<String, List<Employee>> = employees.groupBy(Employee::team)
```

For only one aggregate per key, `groupingBy` with `eachCount`, `fold`, or `reduce` can avoid storing all grouped values.

## 3. How would you make a function return a cached result?

Use a map keyed by the function input. Decide whether the cache needs a size limit, expiration, synchronization, or invalidation; a plain map is not automatically thread-safe.

```kotlin
fun cachedLength(): (String) -> Int {
    val cache = mutableMapOf<String, Int>()
    return { value -> cache.getOrPut(value) { value.length } }
}
```

## 4. What is the difference between `first`, `firstOrNull`, and `single`?

`first` returns the first matching element or throws if none exists. `firstOrNull` returns null when there is no match. `single` requires exactly one matching element and throws when there are zero or multiple matches. Choose the function that expresses the expected cardinality.

## 5. How do you make a Kotlin API readable and testable?

Keep side effects at boundaries, pass dependencies explicitly, return immutable interfaces, use domain types instead of ambiguous primitives, and keep functions small enough to test independently. Prefer named arguments and sealed result types when they make invalid states harder to represent.

## 6. What should you consider when optimizing Kotlin code?

Measure first. Consider algorithmic complexity before micro-optimizations, avoid unnecessary collection allocations in hot paths, use sequences only when laziness helps, and inspect boxing or synchronization costs when working with primitives and concurrency.

## 7. How do you measure the execution time of a block of code?
You can use the built-in `measureTimeMillis { }` or `measureNanoTime { }` blocks.

## 8. How do you destructure a `Map` in a `for` loop?
You can loop through it using `for ((key, value) in map) { }`.

## 9. How do you execute a block of code only if a value is not null?
Use the `let` scope function combined with the safe call operator: `name?.let { print(it) }`.

## 10. How do you repeat an action a specific number of times?
You can use the built-in `repeat(times) { }` function.

## 11. What does the `requireNotNull()` function do?
It checks if a value is null. If it is, it throws an `IllegalArgumentException`; otherwise, it returns the non-null value.

## 12. How do you flatten a list of lists?
Use the `flatten()` method. To map and then flatten, use `flatMap()`.

## 13. How do you gracefully handle multiple `if-else` checks in Kotlin?
Use the `when` expression, which is much cleaner and forces exhaustiveness when used with sealed classes or enums.

## 14. How can you remove all nulls from a collection?
You can use the `filterNotNull()` standard library function.

## 15. How do you return early from a lambda?
You use a labeled return, such as `return@forEach` or `return@map`.

## 16. What is the standard way to create an empty List?
Use `emptyList<T>()`. It is memory efficient because it reuses a single instance of an empty list across your app.

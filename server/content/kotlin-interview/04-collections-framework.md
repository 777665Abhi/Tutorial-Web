---
title: "Collections Framework"
description: "Lists, Maps, Sets, and powerful functional operators."
---

## 1. What is the difference between Mutable and Immutable collections?
Kotlin heavily separates read-only and mutable collections.
- `List<T>`, `Set<T>`, `Map<K,V>` are read-only interfaces.
- `MutableList<T>`, `MutableSet<T>`, `MutableMap<K,V>` are interfaces that allow modification (add, remove, clear).

```kotlin
val list = listOf(1, 2, 3) // Read-only
val mList = mutableListOf(1, 2, 3) // Mutable
mList.add(4)
```

## 2. How are Kotlin collections related to Java collections?
Under the hood, Kotlin uses standard Java collections (`ArrayList`, `HashMap`, `HashSet`). Kotlin does not reinvent them; it just wraps them in smarter interfaces.

```kotlin
val map = hashMapOf("A" to 1) // Uses java.util.HashMap
```

## 3. What does the `map` function do on a collection?
It applies a transformation function to every element in the collection and returns a new list containing the results.

```kotlin
val numbers = listOf(1, 2, 3)
val doubled = numbers.map { it * 2 } // [2, 4, 6]
```

## 4. What does the `filter` function do?
It returns a new list containing only the elements that match the given predicate condition (where the lambda returns true).

```kotlin
val numbers = listOf(1, 2, 3, 4, 5)
val evens = numbers.filter { it % 2 == 0 } // [2, 4]
```

## 5. What does `flatMap` do?
It transforms each element into a collection, and then "flattens" all these collections into a single, merged list.

```kotlin
val lists = listOf(listOf(1, 2), listOf(3, 4))
val flat = lists.flatMap { it } // [1, 2, 3, 4]
```

## 6. What is the difference between `fold` and `reduce`?
Both accumulate a value starting from the first element.
- `reduce` uses the first element as the initial accumulator.
- `fold` takes an explicit initial value, allowing the accumulated result to be a different type than the collection elements.

```kotlin
val nums = listOf(1, 2, 3)
val sum = nums.reduce { acc, i -> acc + i } // 6
val stringSum = nums.fold("Start:") { acc, i -> "$acc $i" } // "Start: 1 2 3"
```

## 7. What does `groupBy` do?
It groups elements of the original collection by the key returned by the given function, returning a `Map<K, List<V>>`.

```kotlin
val words = listOf("a", "abc", "ab", "def", "abcd")
val byLength = words.groupBy { it.length }
// {1=[a], 3=[abc, def], 2=[ab], 4=[abcd]}
```

## 8. What is the difference between `Sequence` and `Iterable`?
- **Iterable** operations evaluate eagerly. Every step (`map`, `filter`) creates an intermediate collection in memory.
- **Sequence** operations evaluate lazily. Elements are processed one-by-one through the entire chain of operations. Best for large collections.

```kotlin
val result = listOf(1, 2, 3, 4).asSequence()
    .map { it * 2 }
    .filter { it > 5 }
    .toList()
```

## 9. How do you create an array of primitives efficiently?
Using specific factory methods like `intArrayOf()`, `doubleArrayOf()`, which prevent the memory overhead of boxing primitives into objects (unlike `arrayOf(1, 2)`).

```kotlin
val efficient = intArrayOf(1, 2, 3) // int[]
val inefficient = arrayOf(1, 2, 3) // Integer[]
```

## 10. What does `associateBy` do?
It creates a Map from a list, using the list elements as values and the result of the lambda as keys.

```kotlin
data class User(val id: Int, val name: String)
val users = listOf(User(1, "Alice"), User(2, "Bob"))
val map = users.associateBy { it.id } 
// {1=User(1, "Alice"), 2=User(2, "Bob")}
```

## 11. What does `partition` do?
It splits the original collection into a `Pair` of lists. The first list contains elements for which the predicate yielded true, and the second contains those for which it yielded false.

```kotlin
val nums = listOf(1, 2, 3, 4)
val (evens, odds) = nums.partition { it % 2 == 0 }
// evens = [2, 4], odds = [1, 3]
```

## 12. How do you sort a collection?
You can use `sorted()` for natural sorting, or `sortedBy()` / `sortedWith()` for custom sorting criteria.

```kotlin
val words = listOf("banana", "apple", "cherry")
val sorted = words.sortedBy { it.length } 
// [apple, banana, cherry]
```

## 13. What is the `zip` function?
It takes two collections and returns a list of `Pair`s built from the elements of both collections with the same index. The result list's length is equal to the shortest collection.

```kotlin
val chars = listOf('A', 'B', 'C')
val nums = listOf(1, 2)
val zipped = chars.zip(nums) 
// [(A, 1), (B, 2)]
```

## 14. What does `any`, `all`, and `none` do?
They evaluate a predicate against the collection and return a boolean.
- `any`: True if at least one element matches.
- `all`: True if all elements match.
- `none`: True if zero elements match.

```kotlin
val nums = listOf(1, 2, 3)
println(nums.any { it > 2 }) // true
```

## 15. What does `distinct` do?
Returns a list containing only unique elements from the given collection, removing duplicates.

```kotlin
val nums = listOf(1, 1, 2, 2, 3)
val unique = nums.distinct() // [1, 2, 3]
```

## 16. How do you find an element in a list?
You can use `find` (returns the first matching element or null) or `first` (throws exception if not found).

```kotlin
val nums = listOf(1, 2, 3, 4)
val found = nums.find { it > 5 } // null
```

## 17. What is `windowed`?
Returns a list of snapshots of a given size moving along the collection with the given step.

```kotlin
val nums = listOf(1, 2, 3, 4, 5)
val windows = nums.windowed(size = 3, step = 1)
// [[1, 2, 3], [2, 3, 4], [3, 4, 5]]
```

## 18. What does `chunked` do?
Breaks a collection into chunks of the given size.

```kotlin
val nums = listOf(1, 2, 3, 4, 5)
val chunks = nums.chunked(2)
// [[1, 2], [3, 4], [5]]
```

## 19. How do you concatenate collections?
You can simply use the `+` operator.

```kotlin
val a = listOf(1, 2)
val b = listOf(3, 4)
val combined = a + b // [1, 2, 3, 4]
```

## 20. What is `drop` and `take`?
- `drop(n)`: Returns a list containing all elements except first `n` elements.
- `take(n)`: Returns a list containing first `n` elements.

```kotlin
val chars = listOf('a', 'b', 'c', 'd')
println(chars.take(2)) // [a, b]
println(chars.drop(2)) // [c, d]
```

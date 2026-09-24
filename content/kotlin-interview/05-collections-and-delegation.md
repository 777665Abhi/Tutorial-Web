---
title: "Collections & Delegated Properties"
description: "Compare Kotlin collection types and use delegation without hidden surprises."
---

## 1. What is the difference between `List`, `MutableList`, `Set`, and `Map`?

`List` preserves order and allows duplicate values. 
`MutableList` additionally supports updates. 
`Set` stores unique values, while `Map` stores key-value pairs with unique keys. Prefer read-only interfaces at API boundaries and keep mutation private.

```kotlin
// Immutable List (read-only)
val immutableList: List<String> = listOf("apple", "banana", "cherry")
// immutableList.add("date") // Error: add is not defined on List

// Mutable List
val mutableList: MutableList<String> = mutableListOf("apple", "banana", "cherry")
mutableList.add("date") // Allowed
mutableList.remove("banana") // Allowed

// Immutable Set (unique elements)
val immutableSet: Set<String> = setOf("apple", "banana", "apple")
// Contains only 2 elements due to uniqueness

// Mutable Set
val mutableSet: MutableSet<String> = mutableSetOf("apple", "banana")
mutableSet.add("cherry") // Allowed
mutableSet.add("apple") // Ignored (duplicate)

// Immutable Map (key-value pairs)
val immutableMap: Map<String, Int> = mapOf("apple" to 1, "banana" to 2)
// immutableMap["orange"] = 3 // Error: map is read-only

// Mutable Map
val mutableMap: MutableMap<String, Int> = mutableMapOf("apple" to 1, "banana" to 2)
mutableMap["orange"] = 3 // Allowed
mutableMap.remove("banana") // Allowed
```

## 2. What is the difference between `map`, `flatMap`, and `mapNotNull`?

`map` transforms each item into one result. 
`flatMap` transforms each item into an iterable and flattens all results. 
`mapNotNull` transforms items and removes null results.

```kotlin
val words = listOf("one two", "three")

// map: Transforms each element into one result
val lengths = words.map { it.length } // [10, 5]

// flatMap: Transforms each element into an iterable and flattens all results
val allWords = words.flatMap { it.split(" ") } // ["one", "two", "three"]

// mapNotNull: Transforms elements and removes null results
val mixedList = listOf("one", null, "three", "four", null)
val nonNullStrings = mixedList.mapNotNull { it } // ["one", "three", "four"]
```


## 3. What is the difference between `Sequence` and a collection?

Collection operations are generally eager: each intermediate operation creates a result. A `Sequence` evaluates operations lazily and can avoid intermediate allocations, especially in long chains or large data sets. For small collections, the overhead of a sequence may not be worthwhile.

```kotlin
val numbers = 1..1_000_000

// List: Eager evaluation - creates intermediate lists
val listResult = numbers.map { it * 2 }.filter { it % 10 == 0 }.take(5)
// Creates a list of 1,000,000 elements, then filters it, then takes 5

// Sequence: Lazy evaluation - processes one element at a time
val sequenceResult = numbers.asSequence()
    .map { it * 2 }        // Computes only when needed
    .filter { it % 10 == 0 } // Computes only when needed
    .take(5)               // Stops processing after 5 results
    .toList()              // Triggers the actual computation
// Processes numbers one by one: 1*2=2 (not divisible by 10), 2*2=4, ..., 5*2=10 (keep), 6*2=12, ...
// Much more memory-efficient for large collections
```

## 4. How do `fold` and `reduce` differ?

Both combine values into one result. 
- `fold` requires an initial accumulator and works with an empty collection. 
- `reduce` uses the first element as the initial accumulator and therefore fails on an empty collection.

```kotlin
val numbers = listOf(1, 2, 3, 4, 5)

// fold: Requires initial accumulator, works with empty collections
val foldSum = numbers.fold(10) { acc, element -> acc + element }
// Starts with accumulator = 10
// 10 + 1 = 11
// 11 + 2 = 13
// 13 + 3 = 16
// 16 + 4 = 20
// 20 + 5 = 25
// Result: 25

val emptyList = listOf<Int>()
val foldEmpty = emptyList.fold(0) { acc, element -> acc + element }
// Result: 0 (works with empty list)

// reduce: Uses first element as initial accumulator, fails on empty collections
val reduceSum = numbers.reduce { acc, element -> acc + element }
// Starts with accumulator = 1 (first element)
// 1 + 2 = 3
// 3 + 3 = 6
// 6 + 4 = 10
// 10 + 5 = 15
// Result: 15

// val reduceEmpty = emptyList.reduce { acc, element -> acc + element } 
// Throws NoSuchElementException: Collection is empty
```

## 5. What is property delegation?

Delegation moves property getter and setter behavior to another object using the `by` syntax.

```kotlin
// Using lazy delegation
val config: Config by lazy { loadConfig() }
// 'loadConfig()' is only called the first time 'config' is accessed

// Using observable delegation
import kotlin.properties.Delegates

var maxAttempts: Int by Delegates.observable(3) { 
    property, oldValue, newValue -> 
    println("Attempts changed from $oldValue to $newValue")
}
```

- `lazy` initializes a value on first access and caches it. 
- `Delegates.observable` runs a callback after a property changes.

## 6. What is class delegation?

Class delegation forwards an interface implementation to another object, reducing boilerplate while allowing the delegating class to add or override behavior.

```kotlin
// Simple class delegation - List<T> by delegate
class LoggingList<T>(private val delegate: List<T>) : List<T> by delegate {
    fun logAccess() {
        println("Accessing the list")
    }
}

// Example usage
val names = listOf("Alice", "Bob", "Charlie")
val loggingList = LoggingList(names)

// Standard List operations work automatically
println(loggingList.size) // Output: 3
println(loggingList[0])   // Output: Alice

// Can add custom behavior
loggingList.logAccess()   // Output: Accessing the list

// Can also override specific methods if needed
override fun get(index: Int): T {
    println("Getting element at $index")
    return delegate[index]
}
```

## 7. What is the difference between `Array` and `IntArray`?
`Array<Int>` uses boxed integers (like Java's `Integer[]`), which use more memory. 
`IntArray` uses unboxed primitives (like Java's `int[]`).

```kotlin
// Array<Int> uses boxed integers (objects) - more memory overhead
val boxedArray: Array<Int> = arrayOf(1, 2, 3)
// Internally: [Integer(1), Integer(2), Integer(3)]

// IntArray uses unboxed primitives - more memory-efficient
val primitiveArray: IntArray = intArrayOf(1, 2, 3)
// Internally: [int 1, int 2, int 3]
```

## 8. What does the `zip` function do?
It takes two collections and pairs their elements together into a list of `Pair` objects.

```kotlin
val names = listOf("Alice", "Bob", "Charlie")
val ages = listOf(30, 25, 35)

// zip combines corresponding elements into pairs
val zipped = names.zip(ages) 
// Result: [("Alice", 30), ("Bob", 25), ("Charlie", 35)]

// You can also transform the pairs directly
val zippedWithTransform = names.zip(ages) { name, age -> "$name is $age years old" }
// Result: ["Alice is 30 years old", "Bob is 25 years old", "Charlie is 35 years old"]
```

## 9. What does `partition` do?
It splits a collection into a `Pair` of two lists based on a condition: one list where the condition is true, and one where it is false.

## 10. What is `chunked`?
It breaks a collection into a list of smaller lists of a specified size.

```kotlin
val numbers = listOf(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

// Chunk into lists of size 3
val chunks = numbers.chunked(3)
// Result: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]

// Chunk into lists of size 4
val chunksOf4 = numbers.chunked(4)
// Result: [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10]]
```

## 11. What is `windowed`?
It returns a list of "sliding window" views over the collection. For example, window size 3 on `[1,2,3,4]` gives `[[1,2,3], [2,3,4]]`.

```kotlin
val numbers = listOf(1, 2, 3, 4, 5)

// Window of size 3, sliding one element at a time
val windows = numbers.windowed(3)
// Result: [[1, 2, 3], [2, 3, 4], [3, 4, 5]]

// Window of size 3 with a step of 2 (skips one element between windows)
val windowsWithStep = numbers.windowed(3, step = 2)
// Result: [[1, 2, 3], [3, 4, 5]]

// Window of size 4 with sliding step of 2
val largeWindows = numbers.windowed(4, step = 2)
// Result: [[1, 2, 3, 4], [3, 4, 5]]
```

## 12. What does `associate` do?
It builds a `Map` from a list. You provide a lambda that returns a key-value pair for each element.

```kotlin
val words = listOf("one", "two", "three", "four")

// Associate into a map of word -> length
val wordLengths = words.associate { it to it.length }
// Result: { "one"=3, "two"=3, "three"=5, "four"=4 }

// Example with transform
val numbers = listOf(1, 2, 3, 4)
val numberSquares = numbers.associate { it to it * it }
// Result: { 1=1, 2=4, 3=9, 4=16 }
```

## 13. What is `by lazy`?
It is a built-in delegate that computes its value only upon first access, and caches the result for all subsequent accesses.

```kotlin
val config: Config by lazy { loadConfig() }

fun main() {
    // loadConfig() is NOT called yet
    println("Before accessing config")
    
    // First access: loadConfig() is called here
    println(config.databaseUrl) 
    
    // Second access: uses cached value, loadConfig() is NOT called again
    println(config.databaseUrl) 
}
```

## 14. What is `Delegates.observable`?
It is a property delegate that triggers a callback every time the property's value is modified.

```kotlin
import kotlin.properties.Delegates

class User {
    var age: Int by Delegates.observable(0) { 
        property, oldValue, newValue ->
        println("Age changed from $oldValue to $newValue")
    }
}

fun main() {
    val user = User()
    
    // First access
    user.age = 25 
    // Output: Age changed from 0 to 25
    
    // Second access
    user.age = 30 
    // Output: Age changed from 25 to 30
}
```

## 15. What is `Delegates.vetoable`?
It is a delegate that allows you to intercept an assignment and either accept or reject the new value based on a condition.

```kotlin
import kotlin.properties.Delegates

class User {
    var age: Int by Delegates.vetoable(0) { 
        property, oldValue, newValue ->
        newValue > 0  // Only allow positive values
    }
}

fun main() {
    val user = User()
    
    // First access
    user.age = 25 
    // Accepted: age is now 25
    
    // Second access - will be rejected
    user.age = -10 
    // Rejected: age remains 25
    // Output: (no output, value not changed)
    
    println(user.age) // Output: 25
}
```


## 16. What does the `distinct` operator do?
It returns a new list containing only unique elements from the original collection.

```kotlin
val numbers = listOf(1, 2, 2, 3, 4, 4, 4, 5, 1)

// Get unique elements in order of first appearance
val distinctNumbers = numbers.distinct()
// Result: [1, 2, 3, 4, 5]
```

## 17. What does `groupBy` do?
It groups elements based on a classification function, returning a map where keys are the classification values and values are lists of elements belonging to that group.

```kotlin
val words = listOf("apple", "banana", "kiwi", "orange", "pear")

// Group by length
val groupedByLength = words.groupBy { it.length }
// Result: { 5=[apple, kiwi, orange, pear], 6=[banana] }

// Group by first letter
val groupedByFirstLetter = words.groupBy { it.first() }
// Result: { a=[apple], b=[banana], k=[kiwi], o=[orange], p=[pear] }
```

## 18. What is `flatMap`?
It transform each element in the original collection into a new list, and then flattens all the resulting lists into a single list.

```kotlin
val listOfLists = listOf(listOf(1, 2), listOf(3, 4), listOf(5, 6))

// flatMap combines all lists into a single list
val flatList = listOfLists.flatMap { it }
// Result: [1, 2, 3, 4, 5, 6]
```

## 19. What is `sortedBy`?
it is used to sort a collection based on a specific property of its elements. 

```kotlin
val users = listOf(User("Alice", 30), User("Bob", 25), User("Charlie", 35))

// Sort by age
val sortedByAge = users.sortedBy { it.age }
// Result: [User("Bob", 25), User("Alice", 30), User("Charlie", 35)]
```

## 20. What is `sortedByDescending`?
It is used to sort a collection in descending order based on a specific property of its elements. 

```kotlin
val users = listOf(User("Alice", 30), User("Bob", 25), User("Charlie", 35))

// Sort by age in descending order
val sortedByAgeDesc = users.sortedByDescending { it.age }
// Result: [User("Charlie", 35), User("Alice", 30), User("Bob", 25)]
```






---
title: "Functions, Lambdas & Extensions"
description: "Use Kotlin's functional features clearly and understand how they compile."
---

## 1. What are higher-order functions?

A higher-order function accepts another function as an argument, returns a function, or both. Kotlin uses function types such as `(Int) -> Boolean` to describe them.

```kotlin
// Higher-order function:
fun filterPositive(values: List<Int>, predicate: (Int) -> Boolean) =
    values.filter(predicate)

// Usage:
fun main() {
    val numbers = listOf(-1, 0, 1, 2, -3)
    val positiveNumbers = filterPositive(numbers) { it > 0 } 
    // { it > 0 } is a lambda expression passed as the 'predicate' argument
    // It acts as a filter: only numbers greater than 0 are kept
    // The lambda is executed for each element in 'numbers' by the 'filter' function
    println(positiveNumbers) // Output: [1, 2]
}
```

## 2. What are lambda expressions and anonymous functions?

A lambda is an unnamed function expression whose last expression is its result. 


An anonymous function has explicit `fun` syntax and can be useful when return behavior needs to be clearer.

```kotlin
// Lambda expression (concise, no 'fun' keyword):
val sum = { x: Int, y: Int -> x + y }
val result = sum(2, 3) // 5

// Anonymous function (explicit 'fun' keyword, more traditional syntax):
val subtract = fun(x: Int, y: Int): Int {
    return x - y
}
val result2 = subtract(5, 2) // 3

// Usage in higher-order functions:
val doubled = listOf(1, 2, 3).map { it * 2 }
```

## 3. What are inline functions and `noinline`/`crossinline`?

`inline` asks the compiler to substitute a function and its lambda arguments at the call site, reducing allocation overhead for small higher-order functions. `noinline` prevents a particular lambda from being inlined. `crossinline` prevents a non-local return from an inlined lambda.

Inlining should be used for small, frequently called abstractions, not as a general optimization rule.

```kotlin
inline fun calculate(operation: (Int, Int) -> Int): Int {
    val x = 10
    val y = 20
    return operation(x, y)
}

fun main() {
    val result = calculate { a, b -> a + b }
    println(result) // Output: 30
}
```

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

```kotlin
val numbers = listOf(1, 2, 3, 4, 5)

// let: null-safe operations
numbers.firstOrNull()?.let { println("First element: $it") }

// run: multiple operations with return value
val sumAndProduct = run {
    val sum = numbers.sum()
    val product = numbers.reduce { acc, i -> acc * i }
    Pair(sum, product) // return value
}

// with: operate on an object, return lambda result
with(numbers) {
    println("Size: $size")
    println("Max: ${maxOrNull()}")
}

// apply: configure an object, return the object
val person = java.util.Person().apply {
    firstName = "John"
    lastName = "Doe"
    age = 30
}

// also: side effects, return the object
numbers.also { println("Processing: $it") }
```

## 6. What is a non-local return?

In an inline lambda, an unqualified `return` can return from the surrounding function, not just the lambda. This is called a non-local return. Marking a lambda `crossinline` disallows that behavior.

```kotlin
inline fun executeInTransaction(action: () -> Unit) {
    println("Starting transaction...")
    try {
        action() // If action contains 'return', it returns from executeInTransaction
    } finally {
        println("Closing transaction...")
    }
}

fun main() {
    executeInTransaction {
        println("Doing work...")
        return // This returns from executeInTransaction, NOT just the lambda
    }
}
```

## 7. What are default arguments?
They allow you to assign a default value to a function parameter, so the caller can omit it.

```kotlin
fun printMessage(message: String = "Hello") {
    println(message)
}

fun main() {
    printMessage() // Uses default value: "Hello"
    printMessage("Hi") // Uses provided value
}
```

## 8. What are named arguments?
They allow you to specify the names of parameters when calling a function, improving readability and allowing arbitrary parameter order.

```kotlin
fun printUserDetails(name: String, age: Int, city: String) {
    println("Name: $name, Age: $age, City: $city")
}

fun main() {
    // Using named arguments (order doesn't matter)
    printUserDetails(age = 30, city = "New York", name = "John")
}
```

## 9. What is the `vararg` keyword?
It allows a function to accept a variable number of arguments (like `String...` in Java).

```kotlin
fun printNumbers(vararg numbers: Int) {
    for (number in numbers) {
        println(number)
    }
}

fun main() {
    printNumbers(1, 2, 3, 4, 5) // Can pass any number of arguments
}
```

## 10. What is an `infix` function?
A function marked with `infix` can be called without dots and parentheses (e.g., `5 add 10`).

```kotlin
infix fun Int.add(other: Int): Int {
    return this + other
}

fun main() {
    val result = 5 add 10 // Infix notation
    println(result) // Output: 15
}
```

## 11. What are the requirements for an `infix` function?
It must be a member function or an extension function, must have exactly one parameter, and that parameter cannot have a default value.

```kotlin
class Person(var name: String, var age: Int)

// Infix extension function for creating a person
infix fun String.toPerson(age: Int) = Person(this, age)

fun main() {
    val person = "Alice" toPerson 30
    println("Name: ${person.name}, Age: ${person.age}")
}
```


## 12. What is an operator overloading function?
By using the `operator` keyword, you can redefine standard operators (like `+`, `-`, `*`) for your custom classes.

```kotlin
data class Point(val x: Int, val y: Int)

// Operator overloading for vector addition
operator fun Point.plus(other: Point): Point {
    return Point(x + other.x, y + other.y)
}

fun main() {
    val p1 = Point(1, 2)
    val p2 = Point(3, 4)
    val sum = p1 + p2 // Uses the overloaded + operator
    println("Sum: $sum") // Output: Sum: Point(x=4, y=6)
}
```


## 13. What is a `tailrec` function?
It optimizes recursive functions into iterative loops to prevent StackOverflow errors. The recursive call must be the very last operation.

```kotlin
tailrec fun factorial(n: Long, accumulator: Long = 1): Long {
    return if (n <= 1) {
        accumulator
    } else {
        factorial(n - 1, accumulator * n) // Recursive call is the last operation
    }
}

fun main() {
    val result = factorial(5)
    println("Factorial: $result") // Output: Factorial: 120
}
```

## 14. What does the `let` scope function do?
It executes a block of code within the context of an object (accessible via `it`) and returns the result of the block. Often used for null checks.

```kotlin
val name: String? = null

name?.let { 
    println("Length of name: ${it.length}") // Only executes if name is not null
} ?: println("Name is null")
```

## 15. What does the `apply` scope function do?
It executes a block of code on an object (accessible via `this`) and returns the object itself. Commonly used for initialization.

```kotlin
val person = Person(name = "John", age = 30).apply {
    // 'this' refers to the person object
    email = "[EMAIL_ADDRESS]" // Can modify properties directly
    println("Configuring person: $this") // Returns the person object
}
```


## 16. What does the `run` scope function do?
It is like a combination of `with` and `let`. It takes the object as `this` and returns the lambda result.

```kotlin
val person = Person("John", 30)

// 'this' refers to the person object, returns the result of the block
val description = person.run { 
    "Name: $name, Age: $age" // Last expression is the return value
}

println(description) // Output: Name: John, Age: 30
```



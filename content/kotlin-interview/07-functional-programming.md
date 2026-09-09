---
title: "Functional Programming"
description: "Higher-order functions, Lambdas, and collections processing."
---

## 1. Does Kotlin support Functional Programming?
Yes, Kotlin supports both OOP and Functional Programming paradigms. Functions are first-class citizens, meaning they can be passed as arguments, returned from other functions, and stored in variables.

```kotlin
val multiply: (Int, Int) -> Int = { a, b -> a * b }
println(multiply(2, 4)) // 8
```

## 2. What is a Higher-Order Function?
A function that takes another function as a parameter or returns a function.

```kotlin
fun operate(x: Int, y: Int, op: (Int, Int) -> Int): Int {
    return op(x, y)
}
val result = operate(10, 5) { a, b -> a - b } // Result: 5
```

## 3. What is trailing lambda syntax?
If the last parameter of a higher-order function is a function, you can place the lambda expression outside the parentheses when calling it.

```kotlin
// Instead of this:
// items.fold(0, { acc, i -> acc + i })

// You can do this:
items.fold(0) { acc, i -> acc + i }
```

## 4. What is the `it` keyword?
If a lambda expression has exactly one parameter, you do not need to explicitly declare it. Kotlin implicitly names it `it`.

```kotlin
val nums = listOf(1, 2, 3)
val doubled = nums.map { it * 2 } // Equivalent to { x -> x * 2 }
```

## 5. How do you return from a lambda?
Lambdas implicitly return the value of their last expression. If you need to exit early, you must use a qualified return (returning to the label).

```kotlin
fun foo() {
    listOf(1, 2, 3).forEach {
        if (it == 2) return@forEach // Continues loop
        println(it)
    }
}
```

## 6. What happens if you use a naked `return` inside a lambda?
If the lambda is passed to an `inline` function (like `forEach`), a naked `return` will return out of the *enclosing function* completely (non-local return).

```kotlin
fun foo() {
    listOf(1, 2, 3).forEach {
        if (it == 2) return // Exits foo() entirely!
        println(it)
    }
    println("This is never printed")
}
```

## 7. What is an Anonymous Function?
Unlike a lambda, an anonymous function uses the `fun` keyword and allows specifying the return type explicitly. A naked `return` inside it only returns from the anonymous function itself.

```kotlin
val isEven = fun(x: Int): Boolean {
    return x % 2 == 0
}
```

## 8. What are Function Types?
Types that declare the signature of a function, e.g., `(Int, String) -> Boolean`. 

```kotlin
val check: (Int, String) -> Boolean = { id, name -> id > 0 && name.isNotBlank() }
```

## 9. What is a Receiver Type in function types?
You can define a function type with a receiver `A.(B) -> C`. Inside the lambda, `this` refers to the receiver object of type `A`.

```kotlin
val buildString: StringBuilder.() -> Unit = {
    this.append("Hello") // 'this' is the StringBuilder
}
```

## 10. How is `apply` implemented?
`apply` is a higher-order inline function that takes a receiver function. It calls the block and then returns `this`.

```kotlin
inline fun <T> T.apply(block: T.() -> Unit): T {
    block()
    return this
}
```

## 11. What is Function Reference?
You can pass an existing named function as a parameter instead of writing a new lambda, using the `::` operator.

```kotlin
fun isEven(x: Int) = x % 2 == 0
val evens = listOf(1, 2, 3, 4).filter(::isEven)
```

## 12. Can you return a function from a function?
Yes. 

```kotlin
fun getMultiplier(factor: Int): (Int) -> Int {
    return { number -> number * factor }
}
val timesTwo = getMultiplier(2)
println(timesTwo(5)) // 10
```

## 13. What is a Closure in Kotlin?
A lambda or anonymous function can access and modify variables declared in its outer scope. This combination of a function and its captured variables is a closure.

```kotlin
var sum = 0
listOf(1, 2, 3).forEach { sum += it } // Modifies 'sum' from outer scope
```

## 14. Are pure functions enforced in Kotlin?
No. Kotlin does not enforce pure functions (functions with no side effects that always return the same output for the same input). It is up to the developer to adopt functional purity.

```kotlin
// Impure: Relies on outer state
var counter = 0
fun increment() = ++counter 

// Pure: Only relies on input
fun add(a: Int, b: Int) = a + b
```

## 15. What is Currying?
Currying transforms a function that takes multiple arguments into a sequence of functions that each take a single argument. (Not built into Kotlin, but can be implemented).

```kotlin
val add: (Int) -> (Int) -> Int = { a -> { b -> a + b } }
println(add(5)(3)) // 8
```

## 16. What is the difference between map and flatMap?
- `map`: Transforms `[1, 2]` into `[[1, 1], [2, 2]]`.
- `flatMap`: Transforms and flattens `[1, 2]` into `[1, 1, 2, 2]`.

```kotlin
val list = listOf(1, 2)
println(list.map { listOf(it, it) })     // [[1, 1], [2, 2]]
println(list.flatMap { listOf(it, it) }) // [1, 1, 2, 2]
```

## 17. How do you compose functions?
You can create an extension function to chain functions logically.

```kotlin
infix fun <A, B, C> ((A) -> B).compose(other: (B) -> C): (A) -> C {
    return { x -> other(this(x)) }
}
```

## 18. What is Lazy Evaluation?
Using `Sequence` instead of `Iterable`. A `Sequence` defers the computation until a terminal operation (like `toList()`) is called, preventing unnecessary memory allocation for intermediate steps.

```kotlin
val lazySeq = sequenceOf(1, 2, 3, 4).filter { 
    println("Filtering $it"); it > 2 
}
// Nothing printed until we call .toList()
```

## 19. What is a type-safe builder?
A DSL (Domain Specific Language) created using higher-order functions with receivers, allowing you to write structured, declarative code.

```kotlin
html {
    head { title("Page") }
    body { p("Hello") }
}
```

## 20. What does `require` and `check` do?
They are functional ways to enforce invariants.
- `require(condition)` throws `IllegalArgumentException` if false.
- `check(condition)` throws `IllegalStateException` if false.

```kotlin
fun process(age: Int) {
    require(age >= 0) { "Age must be positive" }
}
```

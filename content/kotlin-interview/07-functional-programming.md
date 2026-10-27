---
title: "Functional Programming"
description: "Higher-order functions, Lambdas, and collections processing."
---

## 1. Does Kotlin support Functional Programming?
Yes. Kotlin supports both Object-Oriented Programming (OOP) and Functional Programming (FP). In FP style, functions are treated as first-class citizens, meaning they can be stored in variables, passed as arguments to other functions, and returned from functions.

```kotlin
// Defining a function that takes two Integers and returns an Integer
val multiply: (Int, Int) -> Int = { a, b -> a * b }

println(multiply(2, 4)) // Output: 8
```

## 2. What is a Higher-Order Function?
A higher-order function is a function that accepts another function as an argument or returns a function as its result.

```kotlin
// Function that accepts another function as an argument
fun operate(x: Int, y: Int, op: (Int, Int) -> Int): Int {
    return op(x, y)
}
val result = operate(10, 5) { a, b -> a - b } // Result: 5
```

## 3. What is trailing lambda syntax?
When the last argument of a function is itself a lambda, Kotlin lets you move it outside the round brackets. It's purely a shortcut to make the code cleaner to read.

```kotlin
// Instead of this:
// items.fold(0, { acc, i -> acc + i })

// You can do this:
items.fold(0) { acc, i -> acc + i }
```

## 4. What is the `it` keyword?
If a lambda takes only one input, you don't need to name that input yourself — Kotlin automatically calls it `it`.

```kotlin
val nums = listOf(1, 2, 3)
val doubled = nums.map { it * 2 } // Equivalent to { x -> x * 2 }
```

## 5. How do you return from a lambda?
A lambda automatically gives back the value of its last line — you don't need a `return` for that. But if you want to stop early (like skipping to the next loop item), you write `return@label`.

```kotlin
fun foo() {
    listOf(1, 2, 3).forEach {
        if (it == 2) return@forEach //  loop
        println(it)
    }
}
```

## 6. What happens if you use a naked `return` inside a lambda?
Be careful here: if the lambda belongs to an `inline` function (like `forEach`), a plain `return` (without `@label`) doesn't just skip the loop — it exits the whole outer function immediately.

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
It's basically a lambda's more formal sibling — written using the `fun` keyword, and you can state its return type explicitly. The key difference: a plain `return` inside it only exits that anonymous function, nothing more.

```kotlin
val isEven = fun(x: Int): Boolean {
    return x % 2 == 0
}
```

## 8. What are Function Types?
A "function type" is just a way of describing what a function's inputs and output look like — for example, `(Int, String) -> Boolean` reads as "takes an Int and a String, gives back a Boolean."

```kotlin
val check: (Int, String) -> Boolean = { id, name -> id > 0 && name.isNotBlank() }
```

## 9. What is a Receiver Type in function types?
Written as `A.(B) -> C`. It means: inside this lambda, `this` automatically refers to an object of type `A` — so you can call that object's methods directly, without typing its name.

```kotlin
val buildString: StringBuilder.() -> Unit = {
    this.append("Hello") // 'this' is the StringBuilder
}
```

## 10. How is `apply` implemented?
`apply` simply runs the block of code you give it (where `this` is the object), and then hands the same object back to you. That's why you can keep chaining calls after it.

```kotlin
inline fun <T> T.apply(block: T.() -> Unit): T {
    block()
    return this
}
```

## 11. What is Function Reference?
Instead of writing a fresh lambda, you can reuse a function that already exists by referring to it with `::`.

```kotlin
fun isEven(x: Int) = x % 2 == 0
val evens = listOf(1, 2, 3, 4).filter(::isEven)
```

## 12. Can you return a function from a function?
Yes, no problem at all — a function can build and return another function.

```kotlin
fun getMultiplier(factor: Int): (Int) -> Int {
    return { number -> number * factor }
}
val timesTwo = getMultiplier(2)
println(timesTwo(5)) // 10
```

## 13. What is a Closure in Kotlin?
A closure is what you get when a lambda "remembers" and can even change a variable from outside its own scope. In short: the lambda plus the outside variables it reaches into.

```kotlin
var sum = 0
listOf(1, 2, 3).forEach { sum += it } // Modifies 'sum' from outer scope
```

## 14. Are pure functions enforced in Kotlin?
No. A "pure function" is one that never causes side effects and always gives the same output for the same input. Kotlin doesn't force this on you — writing pure functions is just a good habit developers choose to follow.

```kotlin
// Impure: Relies on outer state
var counter = 0
fun increment() = ++counter 

// Pure: Only relies on input
fun add(a: Int, b: Int) = a + b
```

## 15. What is Currying?
Currying means breaking a function that takes multiple arguments into a chain of functions that each take just one argument at a time. Kotlin doesn't have this built in, but you can write it yourself.

```kotlin
val add: (Int) -> (Int) -> Int = { a -> { b -> a + b } }
println(add(5)(3)) // 8
```

## 16. What is the difference between map and flatMap?
- `map`: transforms each item, but keeps the results nested — `[1, 2]` becomes `[[1, 1], [2, 2]]`.
- `flatMap`: transforms each item *and* flattens the nested lists into one single list — `[1, 2]` becomes `[1, 1, 2, 2]`.

```kotlin
val list = listOf(1, 2)
println(list.map { listOf(it, it) })     // [[1, 1], [2, 2]]
println(list.flatMap { listOf(it, it) }) // [1, 1, 2, 2]
```

## 17. How do you compose functions?
"Composing" means chaining two functions so the output of the first feeds straight into the second. You can write a small helper extension function to do this.

```kotlin
infix fun <A, B, C> ((A) -> B).compose(other: (B) -> C): (A) -> C {
    return { x -> other(this(x)) }
}
```

## 18. What is Lazy Evaluation?
This happens when you use `Sequence` instead of a regular `Iterable`/`List`. A `Sequence` doesn't do any work right away — it waits until you ask for a final result (like calling `.toList()`), which avoids creating unnecessary intermediate lists in memory.

```kotlin
val lazySeq = sequenceOf(1, 2, 3, 4).filter { 
    println("Filtering $it"); it > 2 
}
// Nothing printed until we call .toList()
```

## 19. What is a type-safe builder?
This is how Kotlin builds DSLs (mini, purpose-built languages) using higher-order functions with receivers. It lets you write code that reads like structured markup, while still being plain, type-checked Kotlin underneath.

```kotlin
html {
    head { title("Page") }
    body { p("Hello") }
}
```

## 20. What does `require` and `check` do?
Both are quick, functional-style ways to validate conditions and fail fast if something's wrong:
- `require(condition)` — throws `IllegalArgumentException` if false. Use it to validate inputs/arguments.
- `check(condition)` — throws `IllegalStateException` if false. Use it to validate internal state.

```kotlin
fun process(age: Int) {
    require(age >= 0) { "Age must be positive" }
}
```

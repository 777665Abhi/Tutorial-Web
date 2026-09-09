---
title: "Advanced Kotlin"
description: "Delegates, Generics, Inline functions, and Reflection."
---

## 1. What is Property Delegation?
Passing the responsibility of getting or setting a property to another object (the delegate). Kotlin uses the `by` keyword.

```kotlin
class Example {
    var p: String by Delegate()
}
```

## 2. What are the built-in delegates in Kotlin?
- `lazy()`: Computes the value on first access and caches it.
- `Delegates.observable()`: Allows listening to changes to the property.
- `Delegates.vetoable()`: Allows intercepting and rejecting assignments to a property.

```kotlin
var name: String by Delegates.observable("Init") { prop, old, new ->
    println("$old -> $new")
}
name = "Alice" // Prints "Init -> Alice"
```

## 3. What is Class Delegation?
The Delegation pattern is natively supported using the `by` keyword. A class can implement an interface by delegating all of its public members to a specified object.

```kotlin
interface Base { fun print() }
class BaseImpl(val x: Int) : Base { override fun print() = println(x) }

class Derived(b: Base) : Base by b
// Derived automatically has print() which delegates to b
```

## 4. What is the `inline` modifier?
It instructs the compiler to copy the function's bytecode directly into the call site, rather than creating a new function call and allocating a lambda object. It vastly improves performance for higher-order functions.

```kotlin
inline fun time(block: () -> Unit) {
    val start = System.currentTimeMillis()
    block()
    println(System.currentTimeMillis() - start)
}
// Using time {} creates ZERO lambda allocation overhead
```

## 5. What is `noinline`?
If you have an `inline` function with multiple lambda parameters, but you only want to inline *some* of them (perhaps you need to store one lambda in a variable), you mark the other lambda as `noinline`.

```kotlin
inline fun doWork(inlined: () -> Unit, noinline notInlined: () -> Unit) {
    // ...
}
```

## 6. What is `crossinline`?
It prevents a lambda passed to an inline function from returning locally (using a naked `return`) out of the enclosing function, enforcing safe execution boundaries.

```kotlin
inline fun execute(crossinline body: () -> Unit) {
    Runnable { body() }.run()
}
```

## 7. What is Variance in Kotlin Generics?
Variance dictates how subtyping between more complex types relates to subtyping between their component types. Kotlin uses Declaration-Site Variance (`in` and `out`).

## 8. What is Covariance (`out`)?
Using the `out` keyword makes a generic type Covariant. It means you can only *produce/return* (get) elements of type T, you cannot consume them. `List<out T>` in Kotlin is covariant.

```kotlin
interface Producer<out T> {
    fun produce(): T
    // fun consume(t: T) // Error!
}
val p: Producer<Any> = Producer<String>() // Valid because of `out`
```

## 9. What is Contravariance (`in`)?
Using the `in` keyword makes it Contravariant. It means you can only *consume* (take) elements of type T, you cannot return them.

```kotlin
interface Consumer<in T> {
    fun consume(item: T)
    // fun produce(): T // Error!
}
val c: Consumer<String> = Consumer<Any>() // Valid because of `in`
```

## 10. What is Star Projection `*`?
Used when you don't know the exact type argument, but you still want to use it safely. `List<*>` is equivalent to `List<out Any?>`.

```kotlin
fun printList(list: List<*>) {
    for (item in list) {
        println(item) // Treated as Any?
    }
}
```

## 11. What are Type Projections?
Also known as Use-Site variance (like Java's `? extends T` and `? super T`). You use `out` and `in` at the point of variable declaration rather than class definition.

```kotlin
fun copy(from: Array<out Any>, to: Array<in Any>) { ... }
```

## 12. What is an Infix function?
A function marked with `infix` can be called without using the dot notation and parentheses. It must be a member function or extension function and take exactly one parameter.

```kotlin
infix fun Int.add(x: Int): Int = this + x
val sum = 5 add 3 // Result: 8
```

## 13. What is a Tailrec function?
Marking a recursive function with `tailrec` tells the compiler to optimize the recursion into a fast, iterative `while` loop, preventing `StackOverflowError`. The recursive call must be the very last operation.

```kotlin
tailrec fun factorial(n: Int, run: Int = 1): Int {
    return if (n == 1) run else factorial(n - 1, run * n)
}
```

## 14. What are Destructuring Declarations?
Allowing you to unpack a single object into multiple variables. It uses the `componentN()` functions under the hood.

```kotlin
data class Point(val x: Int, val y: Int)
val (x, y) = Point(10, 20)
// x is 10, y is 20
```

## 15. What are Scope Functions?
Functions whose sole purpose is to execute a block of code within the context of an object. The five scope functions are `let`, `run`, `with`, `apply`, and `also`.

## 16. What is the difference between `apply` and `also`?
Both return the *context object* itself.
- `apply`: Context is `this`. Great for configuring objects.
- `also`: Context is `it`. Great for side-effects like logging.

```kotlin
val person = Person().apply {
    name = "Alice"
    age = 25
}
person.also { println("Created ${it.name}") }
```

## 17. What is the difference between `let` and `run`?
Both return the *lambda result*.
- `let`: Context is `it`. Great for null checks (`?.let`).
- `run`: Context is `this`. Great for executing a block that initializes a variable.

```kotlin
val length = "hello".let { it.length }
val result = "hello".run { length * 2 }
```

## 18. How do you implement the Builder Pattern in Kotlin?
Using Type-Safe Builders and the `apply` scope function, you usually don't need a formal Builder class in Kotlin. Alternatively, define named and default arguments.

```kotlin
// Using apply makes builders obsolete in simple cases:
val dialog = AlertDialog.Builder(context).apply {
    setTitle("Warning")
    setMessage("Delete file?")
}.create()
```

## 19. What is Reflection in Kotlin?
Reflection allows introspecting code at runtime (finding properties, classes, annotations). Kotlin has its own reflection API (`kotlin-reflect` library) using `KClass` (e.g., `String::class`).

```kotlin
val c = MyClass::class
println(c.simpleName)
```

## 20. What is `@JvmOverloads`?
A Kotlin annotation that instructs the compiler to automatically generate Java overloads for a function that has default parameter values, ensuring interoperability.

```kotlin
@JvmOverloads
fun greet(name: String = "Guest") {}
// Generates greet() and greet(String) for Java callers
```

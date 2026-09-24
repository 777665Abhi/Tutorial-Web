---
title: "Advanced Kotlin"
description: "Delegates, Generics, Inline functions, and Reflection."
---

## 1. What is Property Delegation?
Instead of writing the logic to get or set a variable yourself, you hand that job (delegate it) to another piece of code. It's like hiring an accountant to manage your money instead of doing the math yourself. Kotlin uses the `by` keyword.

```kotlin
class Example {
    var p: String by Delegate()
}


```

## 2. What are the built-in delegates in Kotlin?
- `lazy()`: You only create the object at the exact moment it's first needed, saving memory. Like waiting to cook dinner until someone actually says they are hungry.
- `Delegates.observable()`: It alerts you every time a variable's value changes. Like a doorbell camera notifying you when a package arrives.
- `Delegates.vetoable()`: Like a bouncer at a club; it checks the new value you are trying to assign and decides whether to let it in (accept it) or reject it.

```kotlin
var name: String by Delegates.observable("Init") { prop, old, new ->
    println("$old -> $new")
}
name = "Alice" // Prints "Init -> Alice"
```

## 3. What is Class Delegation?
A class can pass all its interface responsibilities to another object. It's like a manager taking credit for a project, but secretly forwarding all the actual tasks to their assistant.

```kotlin
interface Base { fun print() }
class BaseImpl(val x: Int) : Base { override fun print() = println(x) }

class Derived(b: Base) : Base by b
// Derived automatically has print() which delegates to b
```

## 4. What is the `inline` modifier?
Normally, passing a function (lambda) as a parameter slows things down because the system has to create objects in memory to hold it. `inline` fixes this by literally **copying and pasting** the function's code exactly where you called it. It makes your code run much faster.

```kotlin
inline fun time(block: () -> Unit) {
    val start = System.currentTimeMillis()
    block()
    println(System.currentTimeMillis() - start)
}
// Using time {} creates ZERO lambda allocation overhead

```

## 5. What is `noinline`?
Used inside an `inline` function. If your function takes *two* lambdas, but you need to save one of them for later (e.g., storing it in a variable), you can't copy-and-paste it. You mark it `noinline` to tell the compiler to leave that specific one alone.

```kotlin
inline fun doWork(inlined: () -> Unit, noinline notInlined: () -> Unit) {
    // ...
}
```

## 6. What is `crossinline`?
Prevents a lambda from accidentally stopping (returning from) the main function that called it. It keeps the "return" safely contained inside the lambda, preventing bugs.

```kotlin
inline fun execute(crossinline body: () -> Unit) {
    Runnable { body() }.run()
}
```

## 7. What is Variance in Kotlin Generics?
A set of rules that define how different types relate to each other if they are inside a generic box. For example, variance answers the question: *"If a Cat is an Animal, is a `List<Cat>` also a `List<Animal>`?"*

## 8. What is Covariance (`out`)?
You can only take things **out** of the box (produce). Because you are only taking things out, it's completely safe to treat a `List<Cat>` as a `List<Animal>` (since every cat you pull out is definitely an animal).

```kotlin
interface Producer<out T> {
    fun produce(): T
    // fun consume(t: T) // Error!
}
val p: Producer<Any> = Producer<String>() // Valid because of `out`
```

## 9. What is Contravariance (`in`)?
You can only put things **in** the box (consume). You can treat a `Box<Animal>` as a `Box<Cat>` because if a box is designed to accept *any* animal, it will safely accept your cat.

```kotlin
interface Consumer<in T> {
    fun consume(item: T)
    // fun produce(): T // Error!
}
val c: Consumer<String> = Consumer<Any>() // Valid because of `in`
```

## 10. What is Star Projection `*`?
It means *"I don't care what type is inside this box, just let me look at it."* It's a safe way to say "any type."

```kotlin
fun printList(list: List<*>) {
    for (item in list) {
        println(item) // Treated as Any?
    }
}
```

## 11. What are Type Projections?
Instead of setting the `in` or `out` rules when you create the class itself, you set those rules right at the moment you declare a variable.

```kotlin
fun copy(from: Array<out Any>, to: Array<in Any>) { ... }
```

## 12. What is an Infix function?
Lets you write code that reads like plain English by removing dots and parentheses. Instead of writing `5.add(3)`, you can just write `5 add 3`.

```kotlin
infix fun Int.add(x: Int): Int = this + x
val sum = 5 add 3 // Result: 8
```

## 13. What is a Tailrec function?
A smart trick for recursive functions (functions that call themselves over and over). It stops your app from crashing with a `StackOverflowError` by quietly turning the recursion into a normal `while` loop behind the scenes.

```kotlin
tailrec fun factorial(n: Int, run: Int = 1): Int {
    return if (n == 1) run else factorial(n - 1, run * n)
}
```

## 14. What are Destructuring Declarations?
Unpacking a single object into multiple separate variables all at once. It's like opening a gift box and immediately handing the shirt to Alice and the pants to Bob in one line of code.

```kotlin
data class Point(val x: Int, val y: Int)
val (x, y) = Point(10, 20)
// x is 10, y is 20
```

## 15. What are Scope Functions?
Handy helper functions (`let`, `run`, `with`, `apply`, `also`) that let you run a block of code directly on an object, making your code shorter and cleaner.

## 16. What is the difference between `apply` and `also`?
Both of these return the **original object** you are working on.
- **`apply`**: Uses `this`. You use it to configure or set up an object (e.g., setting a person's name and age).
- **`also`**: Uses `it`. You use it to do something extra on the side, like printing a log message (*"I also did this"*).

```kotlin
val person = Person().apply {
    name = "Alice"
    age = 25
}
person.also { println("Created ${it.name}") }
```

## 17. What is the difference between `let` and `run`?
Both of these return whatever the **last line of the block** is (a new result).
- **`let`**: Uses `it`. Great for checking if something is not null before doing math on it.
- **`run`**: Uses `this`. Great for running a block of logic to calculate a final result.

```kotlin
val length = "hello".let { it.length }
val result = "hello".run { length * 2 }
```

## 18. How do you implement the Builder Pattern in Kotlin?
In Java, you have to write massive "Builder" classes to create objects with many optional settings. In Kotlin, you just use the `apply` function to set all the options cleanly, meaning you don't have to write that extra Builder code at all.

```kotlin
// Using apply makes builders obsolete in simple cases:
val dialog = AlertDialog.Builder(context).apply {
    setTitle("Warning")
    setMessage("Delete file?")
}.create()
```

## 19. What is Reflection in Kotlin?
A way for code to "look at itself" while the app is running. It can inspect what classes, variables, or functions exist in the app dynamically, which is often used by libraries to figure out how to parse data.

```kotlin
val c = MyClass::class
println(c.simpleName)
```

## 20. What is `@JvmOverloads`?
A tool to make Kotlin play nicely with Java. Kotlin allows functions to have default values (e.g., `fun greet(name: String = "Guest")`), but Java doesn't understand that. This annotation auto-generates multiple versions of the function so Java code can use it easily.

```kotlin
@JvmOverloads
fun greet(name: String = "Guest") {}
// Generates greet() and greet(String) for Java callers
```

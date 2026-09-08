---
title: "Kotlin Fundamentals"
description: "Master Kotlin basics, syntax, variables, and control flow."
---

## 1. What is Kotlin?
Kotlin is a modern, statically typed programming language developed by JetBrains. It is fully interoperable with Java and officially supported by Google for Android development.

```kotlin
fun main() {
    println("Hello, Kotlin!")
}
```
Statically typed means the type of a variable is checked at compile time and cannot be changed at runtime.

```kotlin
val name = "Alice" // Inferred as String
val age = 25       // Inferred as Int
``` 

## 2. What are the key advantages of using Kotlin over Java?
Kotlin is more concise (less boilerplate)
, null-safe by default (no more NullPointerException)
, supports coroutines for asynchronous programming (lightweight threads)
, has extension functions (add new functions to existing classes)
, and features smart casting. (the compiler tracks `is` checks and explicit casts. If a variable is checked for a type, the compiler automatically casts it to that type in the corresponding block.)

```kotlin
// Concise data class in Kotlin vs dozens of lines in Java
data class User(val name: String, val age: Int)
```


## 3. What is the difference between `val` and `var`?
- `val` (value) declares a read-only, immutable reference (like `final` in Java).
- `var` (variable) declares a mutable reference that can be reassigned.

```kotlin
val pi = 3.14 // Cannot be changed in future
var counter = 0
counter++ // Allowed
```

## 4. Is `val` truly immutable?
No. While the reference itself cannot be reassigned, the object it points to can be mutable. 
For example, a `val` pointing to a `MutableList` allows modifying the list's contents.

```kotlin
val list = mutableListOf("A")
list.add("B") // This is allowed!
// list = mutableListOf("C") // This is a compilation error
```

## 5. What is Type Inference?
The Kotlin compiler automatically deduces the type of a variable from its initializer, so explicit type declaration is usually optional.

```kotlin
val name = "Alice" // Inferred as String
val age = 25       // Inferred as Int

var name = "Bob"
name = 25 // Error: Type mismatch
```

## 6. What is String Interpolation?
Kotlin allows embedding variables and expressions directly into string templates using the `$` symbol, making string concatenation much cleaner.

```kotlin
val name = "Bob"
val score = 95
println("User $name scored ${score + 5} points.")
```

## 7. What is a Data Class?
A class whose primary purpose is to hold data. The compiler automatically generates `equals()`, `hashCode()`, `toString()`, `copy()`, and `componentN()` functions.

```kotlin
data class Book(val title: String, val author: String)
val myBook = Book("1984", "George Orwell")
val exactCopy = myBook.copy()
```

## 8. What is the Elvis Operator `?:` ?
It provides a default value to return if an expression resolves to null.

```kotlin
val nullableName: String? = null
val nameToUse = nullableName ?: "Guest" 
println(nameToUse) // Prints "Guest"
```

## 9. How does `when` differ from Java's `switch`?
`when` is much more powerful. It can be used as an expression (returning a value), doesn't require `break` statements, and allows complex condition checks (ranges, types, etc.).

```kotlin
val status = 200
val message = when (status) {
    200 -> "OK"
    404 -> "Not Found"
    in 500..599 -> "Server Error"
    else -> "Unknown"
}
```

## 10. What is Smart Casting?
The Kotlin compiler tracks `is` checks and explicit casts. If a variable is checked for a type, the compiler automatically casts it to that type in the corresponding block.

```kotlin
fun printLength(obj: Any) {
    if (obj is String) {
        // obj is automatically cast to String here
        println(obj.length)
    }
}


```

## 11. What is the difference between `==` and `===`?
- `==` checks for structural equality <Value same>  (calls `.equals()` under the hood).
- `===` checks for referential equality <Memory same> (do both variables point to the exact same object in memory?).

```kotlin
val a = String("hello".toCharArray())
val b = String("hello".toCharArray())
println(a == b)  // true
println(a === b) // false
```

## 12. What are Extension Functions?
They allow you to add new functions to existing classes (even those you don't own, like `String` or `View`) without inheriting from them.

```kotlin
fun String.removeSpaces(): String {
    return this.replace(" ", "")
}
println("Hello World".removeSpaces()) // Prints "HelloWorld"
```

## 13. What is the `Unit` type?
`Unit` is the equivalent of `void` in Java. It signifies that a function does not return any meaningful value. Unlike `void`, `Unit` is an actual singleton object.

```kotlin
fun printMessage(msg: String): Unit {
    println(msg)
}
```

## 14. What is the `Nothing` type?
`Nothing` represents a value that never exists. It is used as the return type for functions that never return (e.g., they always throw an exception or enter an infinite loop).

```kotlin
fun crashApp(message: String): Nothing {
    throw RuntimeException(message)
}
```

## 15. What are Default Arguments?
Function parameters can have default values, which are used when the corresponding argument is omitted. This reduces the need for method overloading.

```kotlin
fun greet(name: String, msg: String = "Hello") {
    println("$msg, $name!")
}
greet("Alice") // Prints "Hello, Alice!"
greet("Bob", "Welcome") // Prints "Welcome, Bob!"
```

## 16. What are Named Arguments?
When calling a function, you can explicitly name one or more arguments. This is especially useful for functions with many parameters or when skipping default arguments.

```kotlin
fun configure(width: Int, height: Int, color: String = "Red") {}
// Using named arguments allows changing the order
configure(color = "Blue", width = 100, height = 200)
```

## 17. How do you create an array in Kotlin?
You can use factory functions like `arrayOf()`, `intArrayOf()`, or the `Array` constructor.

```kotlin
val numbers = arrayOf(1, 2, 3)
val primitives = intArrayOf(4, 5, 6)
val squares = Array(5) { i -> (i * i).toString() }
```

## 18. What is the difference between a List and an Array?
- `Array`: Fixed size, mutable, represented as native arrays under the hood.
- `List`: A collection interface. `listOf()` creates an immutable list, while `mutableListOf()` creates a resizable, mutable list (backed by an ArrayList).

```kotlin
val array = arrayOf(1, 2)
array[0] = 5 // Allowed

val list = listOf(1, 2)
// list[0] = 5 // Error: Unresolved reference: set
```

## 19. What is a Higher-Order Function?
A function that takes another function as a parameter, returns a function, or both. They are heavily used in Kotlin collections (like `map`, `filter`).

```kotlin
fun calculate(a: Int, b: Int, operation: (Int, Int) -> Int): Int {
    return operation(a, b)
}
val sum = calculate(5, 3) { x, y -> x + y } // Result: 8
```

## 20. What is a lambda expression?
An anonymous function that can be passed as an expression. The syntax uses curly braces `{}`. If a lambda has only one parameter, it can be implicitly referenced using `it`.

```kotlin
val list = listOf(1, 2, 3)
val doubled = list.map { it * 2 }
println(doubled) // [2, 4, 6]
```

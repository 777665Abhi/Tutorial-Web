---
title: "Null Safety & Types"
description: "Master Kotlin's type system, nullability, and safe calls."
---

## 1. How does Kotlin handle Null Safety?
By default, all types in Kotlin are non-nullable. You cannot assign `null` to them. To allow nulls, you must explicitly declare the type as nullable by appending a `?` to it.

```kotlin
var name: String = "Alice"
// name = null // Compilation Error

var nullableName: String? = "Bob"
nullableName = null // Allowed
```

## 2. What is the Safe Call operator `?.` ?
It executes an action only if the object is not null. If it is null, the entire expression evaluates to null instead of throwing a `NullPointerException`.

```kotlin
val length = nullableName?.length
// If nullableName is null, length becomes null (Int?)
```

## 3. What is the Elvis Operator `?:` ?
It provides a fallback value when a nullable expression evaluates to null.

```kotlin
val name = nullableName ?: "Unknown"
```

## 4. What is the Not-Null Assertion operator `!!` ?
It converts any value to a non-null type and throws a `NullPointerException` if the value is actually null. Use it only when you are 100% sure it is not null.

```kotlin
val length = nullableName!!.length // Throws NPE if null
```

## 5. What is `let` scoping function used for regarding nulls?
It is often used with the safe call operator `?.` to execute a block of code only if the variable is non-null.

```kotlin
nullableName?.let {
    // This block only runs if nullableName is NOT null
    println("Name is $it")
}
```

## 6. What is a Type Alias?
It provides alternative, shorter names for existing complex types. It does not introduce a new type, just a synonym.

### Key Points
- Type aliases are created using the `typealias` keyword.
- They can be used to simplify complex type declarations.
- They can be used to provide alternative names for existing types.


```kotlin
typealias UserMap = HashMap<String, MutableList<User>>

fun processUsers(users: UserMap) { ... }

// instead of this
fun processUsers(users: HashMap<String, MutableList<User>>) { ... }
```

## 7. What is the `Any` type?
`Any` is the root of the Kotlin class hierarchy. Every Kotlin class has `Any` as a superclass. It is equivalent to `Object` in Java, but it doesn't have `wait()` or `notify()`.

### Key Points
- `Any` is the root of the Kotlin class hierarchy.
- Every Kotlin class has `Any` as a superclass.
- It is equivalent to `Object` in Java, but it doesn't have `wait()` or `notify()`.

```kotlin
val x: Any = "Hello"
val y: Any = 100
```

## 8. What is the difference between `Any` and `Any?`?
- `Any` is the root of all non-nullable types.
- `Any?` is the root of ALL types, including nullable ones.

```kotlin
var a: Any = "Test"
// a = null // Error

var b: Any? = "Test"
b = null // Allowed
```

## 9. How do you check the type of an object at runtime?
Use the `is` operator (or `!is`).

```kotlin
fun checkType(obj: Any) {
    if (obj is String) {
        println("It's a string of length ${obj.length}") // Smart cast
    }
}
```

## 10. How do you cast types explicitly?
Using the `as` operator. If the cast is not possible, it throws a `ClassCastException`.

```kotlin
val x: Any = "Hello"
val str: String = x as String // excplicit casting - if x is not String, it will throw ClassCastException
val str: String = x // Smart cast - if x is String, it will automatically cast it to String
val str:Int = x as Int // Error - x is String, not Int
val str:Int = x as? Int // Returns null - if x is not Int, it will return null
val str:Int = x as? Int ?: 0 // Returns 0 if null - if x is not Int, it will return 0
```

## 11. What is a Safe Cast `as?` ?
It attempts to cast the object to a type. If the cast is invalid, it returns `null` instead of throwing an exception.

```kotlin
val x: Any = 123
val str: String? = x as? String // Returns null
```

## 12. Does Kotlin have primitive types?
At the source code level, no. You use classes like `Int`, `Double`, `Boolean`. However, under the hood, the Kotlin compiler optimizes these to Java primitives (like `int`, `double`) whenever possible to avoid object allocation overhead.

## 13. What happens when you make a number nullable (e.g., `Int?`)?
If you declare an `Int?`, the Kotlin compiler cannot optimize it to a Java primitive `int`. It must box it into a Java `Integer` object, which consumes more memory.

```kotlin
val a: Int = 100 // Java primitive int
val b: Int? = 100 // Java boxed Integer
```

## 14. What are Reified Type Parameters?
Due to Type Erasure, generic types are lost at runtime. However, if an inline function uses a generic parameter, you can mark it as `reified`. This allows you to check the type at runtime.

```kotlin
inline fun <reified T> isType(value: Any): Boolean {
    return value is T // This works!
}
println(isType<String>("Hello")) // true
```

## 15. What is the `Unit` vs `Nothing`?
- `Unit`: The function completes successfully but returns no meaningful value.
- `Nothing`: The function never completes successfully (it throws an exception or infinite loops).

```kotlin
fun fail(): Nothing {
    throw Exception("Failure")
}
```

## 16. Can a function returning `Nothing` be assigned to any variable?
Yes. Because `Nothing` is a subtype of every other type in Kotlin, you can use a function returning `Nothing` in Elvis operators.

```kotlin
val name = nullableName ?: fail() // Valid!
```

## 17. How do you declare a constant in Kotlin?
Using `const val`. It must be at the top level or inside an `object` / `companion object`. It is resolved at compile time.

```kotlin
const val MAX_USERS = 100
```

## 18. What is the difference between `val` and `const val`?
- `const val` is a compile-time constant. Its value must be known at compile time.
- `val` is a runtime constant. Its value can be assigned dynamically at runtime, but cannot be changed afterwards.

```kotlin
val currentTime = System.currentTimeMillis() // Valid
// const val time = System.currentTimeMillis() // Error!
```

## 19. What is late initialization for primitive types?
You cannot use `lateinit` on primitive types (like `Int` or `Double`). Instead, you can use `Delegates.notNull()`.

```kotlin
var count: Int by Delegates.notNull()
```

## 20. What is type erasure in Kotlin?
Just like in Java, generic type parameters are removed (erased) at runtime. A `List<String>` and `List<Int>` both become just `List` at runtime, which is why you can't normally do `if (list is List<String>)`.

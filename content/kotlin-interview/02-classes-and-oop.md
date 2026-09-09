---
title: "Classes & Object-Oriented Programming"
description: "Constructors, inheritance, interfaces, and sealed classes."
---

## 1. How do you declare a class in Kotlin?
Using the `class` keyword. By default, classes are final (cannot be inherited).
Make it open class  to inherit any class

```kotlin
open class Car {
    var brand = "Toyota"
    fun drive() = println("Driving $brand")
}
```

## 2. What is a Primary Constructor?
The primary constructor is part of the class header. It goes after the class name. If you use `val` or `var` in the primary constructor, properties are automatically created and initialized.

```kotlin
class Person(val name: String, var age: Int) {
    // name and age are accessible as properties
}
val p = Person("Alice", 25)
```

## 3. What is an `init` block?
Since the primary constructor cannot contain code, the `init` block is used to write initialization logic that runs immediately after the object is created.

```kotlin
class Person(val name: String) {
    init {
        require(name.isNotBlank()) { "Name cannot be empty!" }
        println("Created person: $name")
    }
}
```

## 4. What is a Secondary Constructor?
Defined using the `constructor` keyword inside the class body. Every secondary constructor must ultimately delegate to the primary constructor (using `this()`) if one exists.
why we need secondary constructor ?
In case you want to have multiple ways to create a class object. add default params in primary construtor or add secondary constructor. 
in primary constructor we cannot add logic but in secondary constructor we can add logic 
add default params in primary construtor
class Person(val name: String, val age: Int = 25)  // create object in two ways -> Person("Alice"), Person("Alice", 25)

In case you want to add logic
class Person(val name: String, val age: Int = 25) {
    init {
        println("Person created: $name, $age")
    }
}

```kotlin
class User(val name: String) {
    var age: Int = 0
    
    constructor(name: String, age: Int) : this(name) {
        this.age = age
    }
}
```
what is difference between init and Secondary Constructor?
- Init block is always executed when object is created.
- Secondary constructor is only executed when object is created using that constructor.
- Init block can use the parameters of the primary constructor directly but Secondary constructor cannot use the parameters of the primary constructor directly . instead it can use them via delegation to the primary constructor.
- Init block is executed before the secondary constructor.

## 5. How does Inheritance work in Kotlin?
All classes in Kotlin are `final` by default. To allow a class to be inherited, you must mark it with the `open` keyword. You inherit using the `:` symbol instead of `extends`.

```kotlin
open class Animal {
    open fun sound() = println("Some sound")
}

class Dog : Animal() {
    override fun sound() = println("Bark")
}
```

## 6. How do you override methods?
The method in the parent class must be marked `open`, and the method in the child class must be marked with `override`.

```kotlin
open class Base {
    open fun display() {}
}
class Derived : Base() {
    override fun display() {}
}
```

## 7. What is the difference between an Interface and an Abstract Class?
- **Interface**: Cannot hold state (no backing fields for properties). Can have default method implementations. A class can implement multiple interfaces.
- **Abstract Class**: Can hold state and constructors. A class can only inherit from one abstract class.

```kotlin
interface Clickable {
    fun click() // Abstract by default
    fun showOff() = println("I'm clickable!") // Default implementation
}

abstract class Shape {
    abstract fun area(): Double // Must be implemented
    val color = "Red" // State is allowed
}
```
### Key Differences

**Trait (Interface)**
- **Purpose:** To define contracts and shared behavior
- **Stateful:** No (cannot have fields/properties with backing storage)
- **Multiple Inheritance:** Yes (a class can implement multiple interfaces)
- **Constructor:** Yes (via default parameters in properties)
- **Binary Compatibility:** Stable (easy to add new methods)
- **Implementation in Java:** Interoperable with Java (can be implemented by Java classes)

**Abstract Class**
- **Purpose:** To create base classes with shared code and state
- **Stateful:** Yes (can have fields/properties with backing storage)
- **Multiple Inheritance:** No (a class can inherit from only one abstract class)
- **Constructor:** Yes (can have full constructors)
- **Binary Compatibility:** Unstable (adding new methods can break existing implementations)
- **Implementation in Java:** Interoperable with Java (abstract classes in Java map to abstract classes in Kotlin)

```

## 8. Can interfaces have properties?
Yes, but they cannot store state (no backing field). You must provide a custom getter or override them in the implementing class.

```kotlin
interface User {
    val email: String // Abstract property
    val domain: String
        get() = email.substringAfter('@') // Property without backing field
}
```

## 9. What is a Companion Object?
Kotlin does not have the `static` keyword. To create class-level members (static methods/variables), you define them inside a `companion object` block within the class.

```kotlin
class Factory {
    companion object {
        const val VERSION = 1
        fun create() = Factory()
    }
}
val f = Factory.create()

// when you call it
val f1 = Factory.create()
val f2 = Factory.create()

// both f1 and f2 are same instance 
```

## 10. What is an Object Declaration?
It is Kotlin's native way to create a Singleton. Using the `object` keyword creates a class and a single instance of it at the same time.

```kotlin
object DatabaseManager {
    fun connect() = println("Connecting to DB...")
}
DatabaseManager.connect()

// when you call it
val db1 = DatabaseManager
val db2 = DatabaseManager

// both db1 and db2 are same instance 
```

## 11. What is an Object Expression?
An anonymous class instance, heavily used for inline implementations of interfaces or abstract classes (like listeners).

```kotlin
val listener = object : View.OnClickListener {
    override fun onClick(v: View) {
        println("Clicked!")
    }
}


```

## 12. What is a Sealed Class?
A class that restricts class hierarchies. All direct subclasses of a sealed class must be declared in the same package (or file). It is heavily used in `when` expressions because the compiler knows all possible subclasses, removing the need for an `else` branch.

### key Points
- Sealed classes allow you to define a restricted class hierarchy.
- All direct subclasses of a sealed class must be declared in the same package (or file).
- They are heavily used in `when` expressions because the compiler knows all possible subclasses.
- They are immutable by nature, which makes them thread-safe.
- They can have properties and methods just like regular classes.

```kotlin
sealed class Result
data class Success(val data: String) : Result()
data class Error(val code: Int) : Result()

fun handle(result: Result) = when(result) {
    is Success -> println("Got data: ${result.data}")
    is Error -> println("Failed with code: ${result.code}")
    // No else required!
}
```

## 13. What is a Sealed Interface?
Similar to sealed classes, but they can be implemented by enums or other classes. Introduced in Kotlin 1.5, they provide exhaustive `when` checks for interface hierarchies.

```kotlin
sealed interface UIState
object Loading : UIState
data class Content(val data: String) : UIState
```

## 14. What is a Data Class?
A class designed specifically to hold data. The compiler automatically generates boilerplate methods.

```kotlin
data class Point(val x: Int, val y: Int)
// Generates:
// - equals() / hashCode()
// - toString() like "Point(x=1, y=2)"
// - componentN() functions
// - copy() function
```

## 15. Can a data class inherit from another class?
Yes, a data class can inherit from another class (like a sealed class or abstract class) and implement interfaces. However, it cannot be inherited *from* (it is implicitly final).

```kotlin
abstract class Shape
data class Circle(val radius: Double) : Shape()
```

## 16. What is a nested class vs an inner class?
- **Nested class** (default): A class inside a class. It is static and *cannot* access the outer class's members.
- **Inner class**: Declared with the `inner` keyword. It holds a reference to the outer class and *can* access its members.

```kotlin
class Outer {
    val x = 10
    class Nested { /* Cannot access x */ }
    inner class Inner { fun getX() = x /* Can access x */ }
}
```

## 17. What are Enum classes?
Classes that represent a group of constants. They can have properties and methods.

### Key Points
- Enum classes are similar to Java enums but more powerful.
- They can have properties and methods just like regular classes.
- They are immutable by nature, which makes them thread-safe.


```kotlin
enum class Direction(val angle: Int) {
    NORTH(0), EAST(90), SOUTH(180), WEST(270);
    
    fun printAngle() = println("Angle is $angle")
}
```

## 18. What is the `lateinit` modifier?
It promises the compiler that a non-null `var` property will be initialized later, before it is accessed (e.g., in Android's `onCreate`). It can only be used on `var` properties of non-primitive types.

```kotlin
class Presenter {
    lateinit var view: View
    
    fun setup(v: View) {
        view = v
    }
}
```

## 19. What is `lazy` initialization?
A function that takes a lambda and returns a delegate. The first time `get()` is called, it executes the lambda and caches the result. Subsequent calls simply return the cached result. It is only used with `val`.

```kotlin
val heavyResource: String by lazy {
    println("Initializing heavy resource...")
    "Resource Data"
}
// "Initializing..." prints only once
```

## 20. What is an Inline Class (Value Class)?
A class that wraps a single value without allocating a real object on the heap at runtime (for performance optimization), while providing type safety at compile time.

```kotlin
@JvmInline
value class Password(val s: String)

// No allocation overhead, compiled as a regular String
val myPass = Password("12345")
```

---
title: "Java Fundamentals"
description: "Master Java basics, JVM architecture, data types, and core concepts."
---

## 1. What is Java?
Java is a high-level, class-based, object-oriented programming language designed to have as few implementation dependencies as possible. It follows the "Write Once, Run Anywhere" (WORA) principle.

```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```

## 2. What are the main features of Java?
- **Object-Oriented**: Everything revolves around objects and classes.
- **Platform Independent**: Compiles to bytecode, running on any JVM.
- **Simple & Secure**: Removes explicit pointers and features a robust security manager.
- **Robust**: Strong memory management and automatic garbage collection.
- **Multithreaded**: Built-in support for concurrent programming.

## 3. Explain the difference between JDK, JRE, and JVM.
- **JDK (Java Development Kit)**: Contains tools for developing Java programs (compiler `javac`, debugger, etc.) plus the JRE.
- **JRE (Java Runtime Environment)**: Provides libraries, Java APIs, and the JVM to *run* Java applications. It cannot compile them.
- **JVM (Java Virtual Machine)**: The engine that actually executes the Java bytecode line by line.

## 4. How does the "Write Once, Run Anywhere" (WORA) principle work?
When Java code is compiled, it is not compiled into platform-specific machine code. Instead, it is compiled into platform-independent **bytecode** (`.class` files). The JVM, which is platform-specific, translates this bytecode into machine code for the host OS.

## 5. Is Java a 100% Object-Oriented Programming language?
No. Java is not purely object-oriented because it uses **primitive data types** (like `int`, `char`, `boolean`, `double`) which are not objects, for performance reasons.

```java
int a = 5; // Primitive (not an object)
Integer b = 5; // Wrapper class (object)
```

## 6. What are Wrapper Classes?
Classes that encapsulate primitive data types into objects. For example, `Integer` for `int`, `Double` for `double`. They are necessary when working with Collections (like `ArrayList`) which can only store objects.

## 7. What is Autoboxing and Unboxing?
- **Autoboxing**: Automatic conversion by the Java compiler of a primitive type to its corresponding wrapper class (e.g., `int` to `Integer`).
- **Unboxing**: The reverse process of converting a wrapper class back to its primitive type.

```java
List<Integer> list = new ArrayList<>();
list.add(10); // Autoboxing: int 10 is converted to Integer object
int num = list.get(0); // Unboxing: Integer object converted back to int
```

## 8. What is the difference between `==` and `.equals()`?
- `==` is an operator that compares **memory addresses** (reference equality) for objects, or literal values for primitives.
- `.equals()` is a method in the `Object` class used to compare the **actual content** (value equality) of objects.

```java
String s1 = new String("Java");
String s2 = new String("Java");
System.out.println(s1 == s2); // false (different memory addresses)
System.out.println(s1.equals(s2)); // true (same content)
```

## 9. What is the String Pool in Java?
A special storage area in the Java heap memory used to store string literals. If a string is created using double quotes (e.g., `String s = "Hello"`), the JVM checks the pool. If "Hello" already exists, it returns a reference to the pooled instance instead of creating a new object, saving memory.

```java
String s1 = "Hello";
String s2 = "Hello";
System.out.println(s1 == s2); // true (both point to the same String Pool instance)
```

## 10. Why is String immutable in Java?
Strings are immutable (cannot be changed after creation) for several reasons:
1. **Security**: Strings are used for database URLs, usernames, etc. Immutability prevents tampering.
2. **Synchronization**: Immutable objects are inherently thread-safe.
3. **String Pool**: Caching strings wouldn't work if they could be modified, as changing one reference would affect all others.

## 11. What is the difference between `String`, `StringBuilder`, and `StringBuffer`?
- **String**: Immutable. Any modification creates a new object.
- **StringBuilder**: Mutable. Not thread-safe. Faster performance for string concatenations in a single thread.
- **StringBuffer**: Mutable. Thread-safe (methods are synchronized). Slower performance compared to StringBuilder.

```java
StringBuilder sb = new StringBuilder("Hello");
sb.append(" World"); // Modifies the same object
```

## 12. What are the access modifiers in Java?
- **private**: Accessible only within the same class.
- **default (no modifier)**: Accessible within the same package.
- **protected**: Accessible within the same package, and in subclasses located in different packages.
- **public**: Accessible from everywhere.

## 13. What is the `static` keyword?
The `static` keyword belongs to the class rather than an instance of the class. It can be applied to variables, methods, blocks, and nested classes. Static members are shared among all instances of a class and can be accessed without creating an object.

```java
class Counter {
    static int count = 0; // Shared across all instances
}
```

## 14. What is a static block?
A block of code declared with the `static` keyword. It is executed exactly once when the class is loaded into memory by the ClassLoader, before the `main` method or any constructor is called. Used to initialize static variables.

```java
static {
    System.out.println("Static block executed");
}
```

## 15. Can you override a static method?
No. Static methods belong to the class, not the instance. If a subclass defines a static method with the same signature, it **hides** the superclass method, but it does not override it (this is called Method Hiding). Late binding (polymorphism) does not apply.

## 16. What is the `final` keyword?
It restricts modification.
- **final variable**: A constant; its value cannot be changed.
- **final method**: Cannot be overridden by subclasses.
- **final class**: Cannot be inherited (e.g., `String` is a final class).

```java
final double PI = 3.14159;
// PI = 3.14; // Compilation error
```

## 17. What is the `main` method signature and why?
`public static void main(String[] args)`
- **public**: So the JVM can access it from outside the class.
- **static**: So the JVM can invoke it without instantiating the class.
- **void**: The method does not return a value to the JVM.
- **String[] args**: Used to pass command-line arguments.

## 18. What is the `this` keyword?
A reference variable that points to the current object. It is used to distinguish instance variables from local variables with the same name, or to invoke another constructor within the same class (`this()`).

```java
class Employee {
    String name;
    Employee(String name) {
        this.name = name; // Resolves ambiguity
    }
}
```

## 19. What is the `super` keyword?
A reference variable that points to the immediate parent class object. It is used to access hidden fields, invoke overridden parent methods, or call the parent class's constructor (`super()`).

```java
class Child extends Parent {
    void display() {
        super.display(); // Calls Parent's display()
    }
}
```

## 20. Does Java support default parameter values?
No, Java does not natively support default parameter values (unlike C++ or Python). To achieve similar functionality, Java developers use **Method Overloading**.

```java
// Simulating default parameters via overloading
void printMessage(String msg) {
    System.out.println(msg);
}
void printMessage() {
    printMessage("Default message");
}
```

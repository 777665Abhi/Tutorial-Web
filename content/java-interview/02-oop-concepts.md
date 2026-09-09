---
title: "Object-Oriented Programming"
description: "Inheritance, Polymorphism, Abstraction, Encapsulation, and Interfaces."
---

## 1. What are the four main principles of OOP?
1. **Encapsulation**: Hiding internal state and requiring all interaction to be performed through an object's methods.
2. **Inheritance**: A mechanism where a new class acquires the properties and behaviors of an existing class.
3. **Polymorphism**: The ability of an object to take on many forms (e.g., method overloading and overriding).
4. **Abstraction**: Hiding complex implementation details and showing only the essential features of an object.

## 2. What is Encapsulation and how is it implemented?
Encapsulation binds data (variables) and code (methods) together into a single unit (a class). It is implemented by declaring class variables as `private` and providing `public` getter and setter methods to access and modify the data safely.

```java
class User {
    private String password;
    
    public void setPassword(String p) {
        if (p.length() >= 8) this.password = p;
    }
}
```

## 3. What is Inheritance?
A process where one class (child/subclass) inherits the fields and methods of another class (parent/superclass) using the `extends` keyword. It promotes code reusability.

```java
class Animal {
    void eat() { System.out.println("Eating..."); }
}
class Dog extends Animal {
    void bark() { System.out.println("Barking..."); }
}
```

## 4. Does Java support Multiple Inheritance?
Java supports multiple inheritance through **Interfaces**, but it does NOT support multiple inheritance through **Classes** (a class cannot `extend` more than one class). This is to prevent the "Diamond Problem" (ambiguity if two parent classes have methods with the same exact signature).

## 5. What is Polymorphism?
Polymorphism allows objects of different types to be treated as objects of a common super type. It comes in two forms: Compile-time polymorphism (Method Overloading) and Runtime polymorphism (Method Overriding).

## 6. What is the difference between Method Overloading and Method Overriding?
- **Method Overloading (Compile-time)**: Multiple methods in the same class have the same name but different parameters (type or number).
- **Method Overriding (Runtime)**: A subclass provides a specific implementation for a method already defined in its superclass. The method signature must be exactly the same.

```java
// Overloading
int add(int a, int b) { return a + b; }
double add(double a, double b) { return a + b; }

// Overriding
@Override
public String toString() { return "Custom Object"; }
```

## 7. What is Covariant Return Type?
In method overriding, the return type in the subclass method can be a subclass of the return type declared in the parent's overridden method. (e.g., Parent returns `Animal`, Child overrides and returns `Dog`).

```java
class Parent {
    Animal getPet() { return new Animal(); }
}
class Child extends Parent {
    @Override
    Dog getPet() { return new Dog(); } // Valid covariant return type
}
```

## 8. Can we override a private method?
No. Private methods are not visible outside the class they are defined in, so a subclass cannot see them to override them.

## 9. What is Abstraction?
Abstraction is the process of hiding implementation details and exposing only functionality to the user. In Java, it is achieved using `abstract` classes and `interfaces`.

## 10. What is an Abstract Class?
A class declared with the `abstract` keyword. It cannot be instantiated (you cannot use `new`). It can contain both abstract methods (without a body) and concrete methods (with a body).

```java
abstract class Shape {
    abstract void draw(); // Abstract method
    void move() { /* Concrete implementation */ }
}
```

## 11. What is an Interface?
A blueprint of a class. Before Java 8, an interface could only contain abstract methods and `public static final` variables. A class implements an interface using the `implements` keyword and must provide bodies for all its abstract methods.

```java
interface Drawable {
    void draw(); // implicitly public abstract
}
```

## 12. What are the differences between an Abstract Class and an Interface?
1. **Inheritance**: A class can implement multiple interfaces, but can extend only one abstract class.
2. **State**: Abstract classes can have instance variables and state; interfaces cannot (only constants).
3. **Constructors**: Abstract classes have constructors; interfaces do not.
4. **Access Modifiers**: Abstract classes can have private/protected methods; interface methods are implicitly public.

## 13. What are Default Methods in Interfaces (Java 8)?
Java 8 introduced `default` methods, allowing interfaces to have methods with a concrete implementation. This was introduced to allow adding new methods to existing interfaces without breaking the classes that already implemented them (e.g., adding `forEach` to `Iterable`).

```java
interface Vehicle {
    void start();
    default void honk() {
        System.out.println("Beep beep!");
    }
}
```

## 14. What happens if a class implements two interfaces with the same default method?
The compiler throws an error due to the Diamond Problem. The implementing class must explicitly override the conflicting method to resolve the ambiguity.

```java
class Car implements InterfaceA, InterfaceB {
    @Override
    public void conflictingMethod() {
        InterfaceA.super.conflictingMethod(); // Explicitly choose one
    }
}
```

## 15. What is a Constructor?
A special block of code that initializes a newly created object. It has the same name as the class and no return type (not even `void`).

```java
class Car {
    Car() { // Constructor
        System.out.println("Car created");
    }
}
```

## 16. What is the difference between a Constructor and a Method?
- **Name**: Constructor must match the class name; a method can be any valid identifier.
- **Return Type**: Constructor has no return type; a method must have a return type.
- **Invocation**: Constructor is called implicitly during object creation (`new`); a method is called explicitly.

## 17. Can a Constructor be inherited or overridden?
No. Constructors are not members of a class, so they are not inherited by subclasses. Therefore, they cannot be overridden. (They can, however, be overloaded).

## 18. What is the purpose of a Private Constructor?
A private constructor prevents other classes from instantiating the class. It is strictly used in the **Singleton Design Pattern**, Factory methods, or Utility classes (like `Math`) that only contain static methods.

```java
class Singleton {
    private static Singleton instance;
    private Singleton() {} // Private constructor
    public static Singleton getInstance() {
        if (instance == null) instance = new Singleton();
        return instance;
    }
}
```

## 19. What is an Object in Java?
An object is an instance of a class. It is a real-world entity that has state (represented by variables/fields) and behavior (represented by methods). It consumes physical memory on the Heap when created.

## 20. What is Constructor Chaining?
The process of calling one constructor from another constructor within the same class (using `this()`) or from a subclass to a superclass (using `super()`). This promotes code reuse in initialization logic.

```java
class User {
    User(String name, int age) { /* Init */ }
    User(String name) {
        this(name, 18); // Chains to main constructor
    }
}
```

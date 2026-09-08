---
title: "Object-Oriented Programming (OOP)"
description: "Classes, Magic Methods, MRO, Inheritance, and Encapsulation in Python."
---

## 1. What is the `__init__` method?
It is the constructor method in Python. It is automatically called when a new instance of a class is created, used to initialize the object's attributes.

## 2. What is the purpose of `self`?
`self` represents the specific instance of the class calling the method. Unlike C++ or Java where `this` is hidden, Python requires `self` to be explicitly passed as the first parameter to every instance method.

## 3. Does Python support Multiple Inheritance?
Yes. A class can inherit from multiple parent classes (e.g., `class Child(Father, Mother):`). This allows combining functionalities but can lead to complexity.

## 4. What is MRO (Method Resolution Order)?
Because Python supports multiple inheritance, MRO defines the exact order in which Python searches for a method or attribute in a class hierarchy. It uses the C3 Linearization algorithm. You can view it using `ClassName.__mro__`.

## 5. What is the `super()` function?
It returns a temporary object of the superclass, allowing you to call its methods. It is heavily used in the `__init__` method of a child class to ensure the parent's initialization logic executes properly.

## 6. How does Python implement Encapsulation?
Python does not have strict access modifiers (like `public` or `private`). Instead, it uses naming conventions. Prefixing an attribute with an underscore `_name` means it is "protected" (internal use only). Prefixing with double underscores `__name` makes it "private".

## 7. What is Name Mangling?
When you define an attribute with double underscores (e.g., `__secret`), Python changes its internal name to `_ClassName__secret`. This prevents accidental overriding in subclasses, but it is not true security (it can still be accessed).

## 8. What are Dunder (Magic) Methods?
Methods surrounded by double underscores (like `__str__`, `__len__`, `__add__`). They allow you to define how your custom objects interact with Python's built-in syntax (like overriding the `+` operator or the `len()` function).

## 9. What is the difference between `__str__` and `__repr__`?
- `__str__`: Returns a readable, user-friendly string representation of the object (used by `print()`).
- `__repr__`: Returns an unambiguous, detailed string representation meant for developers, ideally code that could recreate the object (used in the interactive console).

## 10. What is a `@classmethod`?
A method bound to the class, not the instance. It takes `cls` as its first parameter instead of `self`. It can modify class state that applies across all instances. Commonly used to create alternative factory constructors.

## 11. What is a `@staticmethod`?
A method that belongs to a class but does not have access to `cls` or `self`. It behaves like a plain function that is just logically housed inside the class namespace.

## 12. What is the `@property` decorator?
It allows you to define a method but access it like an attribute (without parentheses). It is Python's pythonic way of creating Getters and Setters for encapsulation.

## 13. How do you create an abstract class in Python?
Python doesn't have a native abstract keyword. You must import the `abc` (Abstract Base Classes) module, inherit from `ABC`, and use the `@abstractmethod` decorator on methods that subclasses must implement.

## 14. What is Polymorphism in Python?
Duck Typing! "If it walks like a duck and quacks like a duck, it's a duck." Python doesn't care about the specific class of an object, only that it has the required method when called. 

## 15. What is Class variable vs Instance variable?
- **Class variable**: Defined directly inside the class. Shared by all instances of the class. Modifying it affects all objects.
- **Instance variable**: Defined inside `__init__` using `self.name`. Unique to each specific object instance.

## 16. What is the `__new__` method?
`__new__` is responsible for actually *creating* and returning the new object instance in memory, before `__init__` is called to initialize it. It is rarely overridden, except in advanced cases like creating a Singleton.

## 17. What is Composition?
A design principle where a class contains objects of other classes as its attributes (HAS-A relationship), rather than inheriting from them. It is generally preferred over deep inheritance trees.

## 18. What does `__del__` do?
It is the destructor method, called when an object is about to be destroyed by the Garbage Collector. It's notoriously unreliable in Python and should be avoided in favor of Context Managers for cleanup.

## 19. Can a child class override a class method?
Yes. Because a class method receives `cls` as its first argument, if a child class overrides it, `cls` will point to the child class, not the parent class.

## 20. What is a Data Class?
Introduced in Python 3.7 using the `@dataclass` decorator. It automatically generates boilerplate methods like `__init__`, `__repr__`, and `__eq__` for classes that primarily just store data.

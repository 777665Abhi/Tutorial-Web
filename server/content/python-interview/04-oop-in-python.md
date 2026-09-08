---
title: "Object-Oriented Programming"
description: "Classes, Inheritance, Dunder methods, and multiple inheritance."
---

## 1. What is a Class in Python?
A class is a blueprint for creating objects. It defines the initial state (attributes) and behavior (methods) of the objects created from it.

```python
class Car:
    def __init__(self, color):
        self.color = color
```

## 2. What is the `self` keyword?
`self` represents the instance of the class itself. It is explicitly passed as the first parameter to all instance methods, allowing access to the attributes and methods of that specific object.

## 3. What is `__init__`?
The `__init__` method is the constructor in Python. It is automatically called when a new instance of a class is created, and it is used to initialize the object's attributes.

## 4. What are Dunder (Magic) Methods?
Dunder stands for "Double Underscore". They are special, built-in methods flanked by double underscores (e.g., `__str__`, `__len__`, `__add__`). They allow you to define custom behavior for built-in operations (like operator overloading).

```python
class Point:
    def __init__(self, x): self.x = x
    def __add__(self, other): return Point(self.x + other.x) # Overloads '+'
```

## 5. What is the difference between `__str__` and `__repr__`?
- `__str__`: Intended to return a readable, user-friendly string representation of the object (used by `print()`).
- `__repr__`: Intended to return an unambiguous, developer-friendly representation of the object, ideally one that could be used to recreate the object (used in debugging).

## 6. How is Encapsulation implemented in Python?
Python does not have strict access modifiers like `public` or `private`. Instead, it uses naming conventions:
- `_variable`: A single underscore indicates a "protected" variable (internal use only, but not enforced).
- `__variable`: A double underscore triggers **Name Mangling**, making it harder (but not impossible) to access from outside the class.

## 7. What is Name Mangling?
When a class attribute starts with double underscores, Python rewrites the attribute name internally to `_ClassName__attribute` to prevent accidental overriding in subclasses.

```python
class MyClass:
    def __init__(self):
        self.__hidden = 10

obj = MyClass()
# print(obj.__hidden) # AttributeError
print(obj._MyClass__hidden) # 10 (Still accessible!)
```

## 8. Does Python support Multiple Inheritance?
Yes. A class can inherit from multiple parent classes.

```python
class Child(Father, Mother):
    pass
```

## 9. What is MRO (Method Resolution Order)?
Because Python supports multiple inheritance, it needs a rule to decide which parent class to search first when a method is called. This rule is the MRO. Python uses the **C3 Linearization** algorithm. You can view the order by calling `Class.mro()`.

## 10. What does the `super()` function do?
`super()` returns a proxy object that allows you to refer to parent classes. It is primarily used to call the parent's `__init__` method or overridden methods, following the MRO.

```python
class Child(Parent):
    def __init__(self):
        super().__init__() # Calls Parent's init
```

## 11. What is Polymorphism in Python?
The ability of different objects to respond to the same method call in their own way. Because of Duck Typing, Python doesn't require inheritance for polymorphism; objects just need to implement the same method names.

## 12. What is the difference between Class Variables and Instance Variables?
- **Class Variables**: Defined outside `__init__`. Shared by all instances of the class. Modifying it changes it for all objects.
- **Instance Variables**: Defined inside `__init__` using `self`. Unique to each specific instance.

## 13. What is a `@classmethod`?
A method bound to the class and not the instance. It takes `cls` as its first parameter instead of `self`. It can modify class state that applies across all instances. Commonly used to create alternative constructors (Factory methods).

```python
class Date:
    @classmethod
    def from_string(cls, date_str):
        # parse string and return new cls()
        pass
```

## 14. What is a `@staticmethod`?
A method bound to the class, but it takes neither `self` nor `cls`. It behaves like a normal function but is placed inside a class for logical grouping. It cannot modify object or class state.

## 15. What is the `@property` decorator?
It allows you to define a method that can be accessed like an attribute (without parentheses). It provides a Pythonic way to implement getter and setter logic for Encapsulation without breaking existing code.

```python
class Circle:
    @property
    def radius(self): return self._radius
    
    @radius.setter
    def radius(self, value):
        if value < 0: raise ValueError
        self._radius = value
```

## 16. What is Abstract Base Class (ABC)?
An abstract class is a class that cannot be instantiated and is meant to be subclassed. In Python, you create them by inheriting from `ABC` in the `abc` module and using the `@abstractmethod` decorator. Subclasses *must* override the abstract methods.

```python
from abc import ABC, abstractmethod
class Animal(ABC):
    @abstractmethod
    def speak(self): pass
```

## 17. How do you check if an object is an instance of a class?
Use `isinstance(object, class)`. It returns True if the object is an instance of the class or a subclass of it. (Do not use `type(obj) == class` because it ignores inheritance).

## 18. What is the difference between `__new__` and `__init__`?
- `__new__`: A class method responsible for actually **creating and returning** the new object instance in memory.
- `__init__`: An instance method responsible for **initializing** the object after it has been created by `__new__`.
Usually, you only override `__new__` when subclassing immutable types or creating a Singleton.

## 19. What is a Singleton pattern and how do you implement it in Python?
A pattern ensuring only one instance of a class exists. You can implement it by overriding `__new__`.

```python
class Singleton:
    _instance = None
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(Singleton, cls).__new__(cls)
        return cls._instance
```

## 20. What is Method Overloading? Does Python support it?
Method overloading is having multiple methods with the same name but different parameters. **Python does NOT support this natively.** If you define the same method twice, the second one simply overwrites the first. You achieve similar behavior using default arguments (`def f(a=None)`) or `*args`.

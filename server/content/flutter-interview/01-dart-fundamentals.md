---
title: "Dart Fundamentals"
description: "Master Dart basics, null safety, async/await, and OOP concepts."
---

## 1. What is Dart?
Dart is an object-oriented, strongly typed programming language developed by Google. It is the language used by the Flutter framework to build multi-platform applications.

```dart
void main() {
  print('Hello, Dart!');
}
```

## 2. What is Sound Null Safety in Dart?
Introduced in Dart 2.12, sound null safety ensures that variables cannot contain `null` unless you explicitly declare them as nullable using a `?`. This prevents null reference exceptions at runtime.

```dart
String name = "Alice";
// name = null; // Compilation error

String? nullableName = null; // Allowed
```

## 3. What is the difference between `final` and `const`?
- `final`: A variable whose value can only be set once. It is initialized at runtime.
- `const`: A variable whose value is an absolute compile-time constant.

```dart
final timeNow = DateTime.now(); // Works (runtime)
// const constTime = DateTime.now(); // Error (not known at compile time)
const pi = 3.14159;
```

## 4. What is the `late` keyword?
It tells the compiler that a non-nullable variable will be initialized later, but definitely before it is used. If you use it before initialization, a runtime error is thrown.

```dart
late String name;
void initialize() {
  name = "Bob"; // Must happen before reading 'name'
}
```

## 5. How does `async` and `await` work in Dart?
They allow you to write asynchronous code that looks synchronous. An `async` function returns a `Future`. `await` pauses the execution of the function until the `Future` completes.

```dart
Future<String> fetchUser() async {
  await Future.delayed(Duration(seconds: 2));
  return "Alice";
}
```

## 6. What is a `Future`?
A `Future` represents a potential value (or error) that will be available at some time in the future. It is the Dart equivalent of a Promise in JavaScript.

```dart
Future<int> calculate() {
  return Future.value(42);
}
```

## 7. What is a `Stream`?
A `Stream` is an asynchronous sequence of events. While a `Future` returns exactly one value, a `Stream` can yield zero or more values over time (e.g., listening to user clicks or WebSocket data).

```dart
Stream<int> countStream(int to) async* {
  for (int i = 1; i <= to; i++) {
    yield i; // Emits value to the stream
  }
}
```

## 8. What is the difference between `async*` and `sync*`?
- `async*`: Returns a `Stream` (asynchronous sequence of values). Uses `yield`.
- `sync*`: Returns an `Iterable` (synchronous sequence of values). Uses `yield`.

```dart
Iterable<int> getNumbers() sync* {
  yield 1;
  yield 2;
}
```

## 9. How do you implement named parameters in functions?
You wrap the parameters in curly braces `{}`. Named parameters are optional by default unless marked with the `required` keyword.

```dart
void configure({required int width, int height = 100}) {
  print("W: $width, H: $height");
}
configure(width: 50); // height defaults to 100
```

## 10. What are Factory Constructors?
A constructor defined using the `factory` keyword. Unlike standard constructors, it does not necessarily create a new instance of the class; it can return an existing instance from a cache or return an instance of a subtype.

```dart
class Logger {
  static final Logger _cache = Logger._internal();
  factory Logger() {
    return _cache; // Always returns the same instance
  }
  Logger._internal();
}
```

## 11. Does Dart support Multiple Inheritance?
No. A Dart class can only inherit (extend) from one single superclass.

## 12. What are Mixins?
Mixins are a way of reusing a class's code in multiple class hierarchies without using inheritance. You use the `with` keyword to apply a mixin.

```dart
mixin Swimmer {
  void swim() => print("Swimming");
}
class Duck extends Bird with Swimmer { }
```

## 13. What is the difference between `extends`, `implements`, and `with`?
- `extends`: Classical inheritance (max 1 class). Inherits both API and implementation.
- `implements`: Interface implementation (can be multiple). You must rewrite all method bodies.
- `with`: Applies a Mixin. Brings in concrete implementations without inheritance hierarchies.

## 14. What is the cascade notation `..` ?
It allows you to perform a sequence of operations on the same object without repeatedly typing the object's name.

```dart
var paint = Paint()
  ..color = Colors.black
  ..strokeCap = StrokeCap.round
  ..strokeWidth = 5.0;
```

## 15. What is the null-aware spread operator `...?` ?
The spread operator `...` inserts multiple values into a collection. `...?` does the same but only if the collection being spread is not null.

```dart
List<int>? extras = null;
var list = [1, 2, ...?extras]; // Safely evaluates to [1, 2]
```

## 16. What is the null-coalescing operator `??` ?
It returns the expression on its left if it is not null; otherwise, it returns the expression on its right.

```dart
String? name;
String displayName = name ?? "Guest";
```

## 17. How do Extension Methods work in Dart?
They allow you to add new functionality to existing libraries (even those you don't own, like `String` or `int`).

```dart
extension StringCasing on String {
  String toTitleCase() => "${this[0].toUpperCase()}${substring(1)}";
}
print("hello".toTitleCase()); // "Hello"
```

## 18. What is the difference between `dynamic` and `Object`?
- `Object`: The base class of all non-null Dart classes. You can only call methods defined on `Object` (like `.toString()`).
- `dynamic`: Tells the compiler to disable all type-checking for this variable. You can call *any* method on it, but it might crash at runtime.

```dart
Object a = "Hello";
// a.length; // Compile error

dynamic b = "Hello";
print(b.length); // Works fine at runtime
```

## 19. What is an Isolate?
Dart is single-threaded. Isolates are independent Dart execution contexts, each with its own memory heap and event loop. They do not share memory and communicate only by passing messages.

```dart
void heavyTask(SendPort port) { /* compute */ }
// Spawned in background:
Isolate.spawn(heavyTask, receivePort.sendPort);
```

## 20. What is the difference between `==` and `identical()`?
- `==`: Checks for value equality (can be overridden).
- `identical()`: Checks for reference equality (do they point to the exact same memory address?).

```dart
var a = [1, 2];
var b = [1, 2];
print(a == b); // false (List does not override == in Dart)
print(identical(a, b)); // false
```

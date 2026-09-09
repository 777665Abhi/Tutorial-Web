---
title: "Java 8 Features"
description: "Lambdas, Streams API, Optional, and Functional Interfaces."
---

## 1. What were the major features introduced in Java 8?
1. Lambda Expressions
2. Streams API
3. Functional Interfaces
4. Default and Static methods in Interfaces
5. Optional class
6. New Date and Time API (`java.time`)

## 2. What is a Lambda Expression?
A short block of code that takes in parameters and returns a value. It provides a clear and concise way to represent a method interface using an expression. It eliminates the need for bulky anonymous inner classes.

```java
// Before Java 8
Runnable r = new Runnable() {
    public void run() { System.out.println("Running"); }
};

// Java 8 Lambda
Runnable r = () -> System.out.println("Running");
```

## 3. What is a Functional Interface?
An interface that contains exactly **one abstract method** (SAM - Single Abstract Method). They can have any number of default or static methods. Lambdas are strongly typed against Functional Interfaces. You can denote them using the `@FunctionalInterface` annotation.

```java
@FunctionalInterface
interface Calculator {
    int calculate(int a, int b); // Only one abstract method
}
```

## 4. Name some built-in Functional Interfaces provided by Java 8.
Found in `java.util.function`:
- **Predicate<T>**: Takes an argument, returns a `boolean`.
- **Function<T, R>**: Takes an argument, returns a result.
- **Consumer<T>**: Takes an argument, returns nothing (`void`).
- **Supplier<T>**: Takes no arguments, returns a result.

## 5. What is the Streams API?
A new abstraction introduced to process collections of objects in a declarative way (similar to SQL queries). It allows for functional-style operations on streams of elements, such as map-reduce transformations.

```java
List<String> names = Arrays.asList("Alice", "Bob", "Charlie");
names.stream()
     .filter(name -> name.startsWith("A"))
     .forEach(System.out::println);
```

## 6. What is the difference between a Collection and a Stream?
- **Collection**: In-memory data structure holding elements. You iterate over it externally (loops).
- **Stream**: Does not store data. It processes data on the fly from a source (like a collection). Iteration is internal, and data is consumed only once.

## 7. What are Intermediate and Terminal operations in Streams?
- **Intermediate**: Returns a new Stream so operations can be chained (e.g., `filter`, `map`, `sorted`). They are lazy (not executed until a terminal operation is invoked).
- **Terminal**: Produces a non-stream result (e.g., a List, an Integer, or void) and closes the stream (e.g., `collect`, `forEach`, `reduce`, `count`).

## 8. What is `map()` vs `flatMap()` in Streams?
- **`map()`**: Transforms each element in a stream into exactly one other element.
- **`flatMap()`**: Transforms each element into a Stream of elements, and then "flattens" the multiple streams into a single stream. (Used to flatten nested lists).

```java
// flatMap example: List of Lists to a single List
List<List<Integer>> nested = Arrays.asList(Arrays.asList(1, 2), Arrays.asList(3, 4));
List<Integer> flat = nested.stream()
                           .flatMap(List::stream)
                           .collect(Collectors.toList()); // [1, 2, 3, 4]
```

## 9. What is a Method Reference?
A shorthand syntax for a lambda expression that simply calls an existing method. Uses the double colon `::` operator.

```java
// Lambda
list.forEach(s -> System.out.println(s));

// Method Reference
list.forEach(System.out::println);
```

## 10. What is the `Optional` class?
A container object which may or may not contain a non-null value. It was introduced to prevent `NullPointerException`s and provide a clear API for dealing with missing values without relying on explicit `null` checks.

```java
Optional<String> opt = Optional.ofNullable(getName());
// Execute only if value is present
opt.ifPresent(name -> System.out.println("Hello " + name));
// Provide default if null
String result = opt.orElse("Guest");
```

## 11. What is the difference between `Optional.of()` and `Optional.ofNullable()`?
- `Optional.of(value)`: Throws a `NullPointerException` immediately if the value passed is null.
- `Optional.ofNullable(value)`: Returns an empty Optional if the value passed is null, avoiding exceptions.

## 12. Why was the new Date/Time API (`java.time`) introduced in Java 8?
The old `java.util.Date` and `Calendar` classes were flawed:
1. They were not thread-safe (mutable).
2. Poor design (months were 0-indexed).
3. Difficult to format and parse.
The new API (`LocalDate`, `LocalTime`, `ZonedDateTime`) is entirely immutable, thread-safe, and uses logical 1-indexed months.

## 13. What is `StringJoiner`?
A new utility class introduced to construct a sequence of characters separated by a delimiter, optionally starting with a prefix and ending with a suffix.

```java
StringJoiner sj = new StringJoiner(", ", "[", "]");
sj.add("Alice").add("Bob");
System.out.println(sj.toString()); // Prints: [Alice, Bob]
```

## 14. What are Default Methods in Interfaces?
Methods in an interface that have a body (implementation), marked with the `default` keyword. They were introduced for backward compatibility, allowing new methods to be added to existing interfaces (like `List` and `Collection`) without breaking all existing implementations.

## 15. What happens if a class implements two interfaces containing the same Default Method?
The compiler throws an error (Diamond Problem). The implementing class is forced to override the method and provide its own implementation, or explicitly call one of the interface implementations using `InterfaceName.super.methodName()`.

## 16. What is a Parallel Stream?
A stream that leverages the multi-core processors by dividing the elements into multiple chunks and processing them concurrently in different threads using the ForkJoin pool.

```java
list.parallelStream().forEach(System.out::println); // Order is not guaranteed!
```

## 17. When should you avoid using Parallel Streams?
1. When the dataset is small (the overhead of managing threads outweighs the speedup).
2. When the operation depends on the order of elements.
3. When the operations are stateful or use blocking I/O (network/disk calls).

## 18. What is `Collectors.groupingBy()`?
A collector used to group elements of a stream based on a classification function, returning a `Map`.

```java
// Groups employees by Department
Map<String, List<Employee>> byDept = employees.stream()
    .collect(Collectors.groupingBy(Employee::getDepartment));
```

## 19. Can a functional interface extend another interface?
Yes. A functional interface can extend another interface, as long as the total number of abstract methods inherited and declared equals exactly one. If it inherits an abstract method and adds another, it ceases to be a functional interface.

## 20. What is effectively final?
Prior to Java 8, if you wanted to use a local variable inside an anonymous inner class, you had to explicitly declare it `final`. In Java 8, if a variable is assigned only once, it is considered "effectively final" by the compiler, allowing it to be used inside lambdas without the `final` keyword.

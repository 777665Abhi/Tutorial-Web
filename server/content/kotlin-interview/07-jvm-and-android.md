---
title: "Kotlin on the JVM & Android"
description: "Connect Kotlin language features to JVM bytecode, Java interoperability, and Android code."
---

## 1. How does Kotlin interoperate with Java?

Kotlin can call Java classes and Java can call Kotlin-generated JVM code. Kotlin supports platform types, Java getters and setters as properties, and annotations such as `@JvmStatic`, `@JvmOverloads`, and `@JvmField` to shape the generated API.

## 2. What are checked exceptions in Kotlin?

Kotlin does not distinguish checked and unchecked exceptions. A function does not need to declare or catch a Java checked exception, although handling recoverable errors is still a design responsibility.

## 3. What is the difference between `lateinit` and `by lazy`?

`lateinit` is for a non-null mutable property initialized later. Accessing it before initialization throws `UninitializedPropertyAccessException`, and it cannot be used with primitive types.

`by lazy` is for a read-only property whose value is computed on first access and then cached. It supports a thread-safety mode by default.

## 4. What are Kotlin `object` declarations and companion objects?

An `object` declaration creates a singleton. A companion object is a singleton associated with a class and can expose factory methods or constants. Companion members are not technically Java static members unless annotations such as `@JvmStatic` are used.

## 5. What are value classes?

A value class wraps a single value to provide type safety without necessarily allocating a separate object at runtime. The compiler may box it when it is used as a nullable value, generic type, or interface type.

```kotlin
@JvmInline
value class UserId(val value: String)
```

## 6. What causes memory leaks in Android Kotlin code?

Common causes include a long-lived object holding an `Activity` or `View`, callbacks that are never unregistered, and coroutines or flows collected outside the correct lifecycle. Use lifecycle-aware scopes, clear view references, and unregister listeners when ownership ends.

## 7. How should Kotlin code expose mutable state?

Expose a read-only view and keep the mutable implementation private. For example, a `MutableStateFlow` can be held privately while callers receive it as `StateFlow`. This protects invariants and prevents consumers from changing state directly.

## 8. What does `@JvmStatic` do?
It tells the compiler to generate an additional static method in Java bytecode for functions defined in a companion object.

## 9. What does `@JvmField` do?
It exposes a Kotlin property as a direct public field to Java, avoiding the generation of getters and setters.

## 10. What does `@JvmOverloads` do?
It generates multiple overloaded methods for Java consumers when a Kotlin function has default parameter values.

## 11. What is the `@Parcelize` annotation?
In Android, it automatically generates the `Parcelable` implementation for a data class, avoiding boilerplate code.

## 12. Why use `ViewModel` in Android Kotlin?
It stores UI-related data in a lifecycle-conscious way, surviving configuration changes like screen rotations.

## 13. What is the difference between `LiveData` and `StateFlow`?
`LiveData` is Android-specific and lifecycle-aware. `StateFlow` is pure Kotlin, requiring explicit collection inside lifecycle scopes but better suited for clean architecture.

## 14. How does ViewBinding improve safety?
It replaces `findViewById` by generating binding classes, providing compile-time null safety and type safety for UI components.

## 15. What is `viewModelScope`?
It is a built-in coroutine scope tied to the ViewModel. It automatically cancels all its coroutines when the ViewModel is cleared.

## 16. What is `lifecycleScope`?
A coroutine scope tied to the lifecycle of an Activity or Fragment. Coroutines in it are cancelled when the lifecycle is destroyed.

## 17. How do you prevent callback hell in modern Android Kotlin?
By wrapping legacy callback-based APIs with `suspendCancellableCoroutine`, allowing you to use them sequentially as suspend functions.

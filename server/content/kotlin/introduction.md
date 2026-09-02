---
title: "Kotlin Crash Course"
description: "Learn the modern, concise, and safe programming language for Android and backend development."
---

## Introduction

Kotlin is a modern, statically typed programming language that targets the JVM, Android, JavaScript, and Native. Developed by JetBrains, it's designed to be fully interoperable with Java while fixing many of its historical pain points.

> "Kotlin is 100% interoperable with Java and Android. You can use any existing Java framework or library."

## Setup & Installation

To get started with Kotlin, you can use IntelliJ IDEA which comes with bundled Kotlin support.

1. Download and install **IntelliJ IDEA** (Community Edition is free).
2. Create a new Project and select Kotlin.
3. You're ready to write your first program!

## Core Concepts

### Variables

In Kotlin, you use `val` for read-only (immutable) variables and `var` for mutable variables.

```kotlin
val name = "Kotlin" // Immutable
var age = 10        // Mutable

age += 1 // This works
// name = "Java" // Error: Val cannot be reassigned
```

### Null Safety

One of Kotlin's biggest features is its null safety system, designed to eliminate the dreaded `NullPointerException`.

```kotlin
var nonNullable: String = "Hello"
// nonNullable = null // Compilation error!

var nullable: String? = "Hello"
nullable = null // This is perfectly fine
```

To access properties of a nullable type, use the safe call operator `?.`:

```kotlin
val length = nullable?.length // Returns null if nullable is null
```

## Advanced Topics

Kotlin supports advanced features like Coroutines for asynchronous programming, extension functions, and robust functional programming capabilities. Explore these in the next chapter!

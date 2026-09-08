---
title: "Testing & Ecosystem"
description: "JUnit, MockK, build tools, and the Kotlin standard library."
---

## 1. What is MockK?
MockK is a mocking library specifically designed for Kotlin. Unlike Mockito, it fully supports Kotlin features like coroutines, extension functions, object declarations, and default parameters.

```kotlin
val car = mockk<Car>()
every { car.drive() } returns "Driving"
```

## 2. How do you mock a suspend function in MockK?
Use `coEvery` and `coVerify` instead of `every` and `verify`.

```kotlin
coEvery { networkRepo.fetchData() } returns "MockData"
```

## 3. How do you test Coroutines?
Use `runTest` from the `kotlinx-coroutines-test` library. It automatically skips delays in `delay()` calls, running tests instantly.

```kotlin
@Test
fun testCoroutine() = runTest {
    val result = fetchDataWithDelay() // Skips the delay instantly
    assertEquals("Success", result)
}
```

## 4. What is a `TestDispatcher`?
A special dispatcher used in tests (`StandardTestDispatcher` or `UnconfinedTestDispatcher`) that gives you full control over the execution order of coroutines in your tests.

```kotlin
val testDispatcher = StandardTestDispatcher()
Dispatchers.setMain(testDispatcher)
```

## 5. How do you test LiveData or StateFlow?
For `StateFlow`, you can use `.value` or `turbine` library (`test {}`). For `LiveData`, you need the `InstantTaskExecutorRule` to run arch components synchronously.

```kotlin
viewModel.state.test {
    assertEquals(Loading, awaitItem())
    assertEquals(Success("Data"), awaitItem())
}
```

## 6. What is Kotlin Multiplatform (KMP)?
A feature that allows sharing Kotlin code (like business logic and networking) across multiple platforms: Android, iOS, Web, and Desktop.

```kotlin
// Shared code in commonMain
expect fun getPlatformName(): String

// Android specific in androidMain
actual fun getPlatformName() = "Android"
```

## 7. What is Ktor?
An asynchronous framework for creating microservices, web applications, and HTTP clients, built entirely in Kotlin and Coroutines.

```kotlin
val client = HttpClient(CIO)
val response: HttpResponse = client.get("https://ktor.io/")
```

## 8. What is KSP (Kotlin Symbol Processing)?
An API for writing compiler plugins. It is the successor to KAPT (Kotlin Annotation Processing Tool). KSP runs directly on the Kotlin AST and is significantly faster than KAPT.

```kotlin
// Build.gradle
plugins {
    id("com.google.devtools.ksp") version "1.9.0"
}
```

## 9. What is Serialization in Kotlin?
`kotlinx.serialization` is a compiler plugin and library that converts Kotlin objects to and from JSON (or Protobuf/CBOR) without relying on reflection (unlike Gson), making it fast and multiplatform.

```kotlin
@Serializable
data class User(val name: String)

val jsonStr = Json.encodeToString(User("Alice"))
```

## 10. How do you write a standard JUnit test in Kotlin?
Just like Java, you annotate methods with `@Test`. You can use backticks for readable test names.

```kotlin
@Test
fun `login with invalid credentials should return error`() {
    val result = login("user", "wrong_pass")
    assertFalse(result.isSuccess)
}
```

## 11. What is Kotest?
A flexible, multiplatform testing framework for Kotlin that offers various testing styles (StringSpec, BehaviorSpec) and powerful assertions (`shouldBe`).

```kotlin
class MyTests : StringSpec({
    "length should return size of string" {
        "hello".length shouldBe 5
    }
})
```

## 12. How do you capture arguments in MockK?
Using a `slot`.

```kotlin
val slot = slot<String>()
every { printer.print(capture(slot)) } just Runs
printer.print("Document")
assertEquals("Document", slot.captured)
```

## 13. What does `just Runs` mean in MockK?
It instructs a mocked function that returns `Unit` to simply do nothing when called.

```kotlin
every { view.showLoading() } just Runs
```

## 14. How do you mock a Singleton `object` in MockK?
Use `mockkObject`.

```kotlin
mockkObject(DatabaseManager)
every { DatabaseManager.connect() } returns true
```

## 15. How do you verify interaction order in MockK?
Use a `verifyOrder` or `verifySequence` block.

```kotlin
verifyOrder {
    view.showLoading()
    view.showData(any())
    view.hideLoading()
}
```

## 16. What is the standard build tool for Kotlin?
Gradle is the de facto standard, using the Kotlin DSL (`build.gradle.kts`) which provides excellent IDE autocomplete and type safety compared to Groovy.

```kotlin
plugins {
    kotlin("jvm") version "1.9.0"
}
```

## 17. What is Detekt?
A static code analysis tool for Kotlin. It analyzes code for code smells, formatting issues, and complexity, helping enforce clean code architecture.

```kotlin
// detekt config example
Complexity:
  TooManyFunctions:
    active: true
    thresholdInClass: 15
```

## 18. What is Dokka?
The official documentation engine for Kotlin. It performs the same function as JavaDoc but handles Kotlin-specific features like extension functions and data classes, outputting to HTML or Markdown.

## 19. How do you read a file in Kotlin?
The standard library provides powerful extensions on `java.io.File`.

```kotlin
val content = File("data.txt").readText()
val lines = File("data.txt").readLines()
```

## 20. What is an `expect` / `actual` declaration?
Used in Kotlin Multiplatform. The `common` module declares an `expect` function or class, and each platform-specific module (Android, iOS) must provide the `actual` implementation.

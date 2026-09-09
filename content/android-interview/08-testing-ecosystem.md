---
title: "Testing & Ecosystem"
description: "Unit testing, UI testing, CI/CD, Gradle, and Android Studio tools."
---

## 1. What is the difference between Local Unit Tests and Instrumented Tests?
- **Local Unit Tests**: Run on the local JVM on your development machine (fast). Located in `src/test`. They cannot use real Android framework APIs unless mocked.
- **Instrumented Tests**: Run on a physical Android device or emulator (slow). Located in `src/androidTest`. They have access to the actual Android Context and UI.

## 2. What is JUnit?
The most popular unit testing framework for Java and Kotlin. It provides annotations like `@Test`, `@Before`, `@After` to structure test cases and assertion methods like `assertEquals()`.

```kotlin
@Test
fun testAddition() {
    val result = 2 + 2
    assertEquals(4, result)
}
```

## 3. What is Mockito / MockK?
Mocking frameworks used in Local Unit Tests. Since local tests don't have access to real Android components or external services (like databases), you create "mock" objects that simulate their behavior. MockK is preferred for Kotlin as it handles coroutines easily.

```kotlin
val repo = mockk<UserRepository>()
every { repo.getUserName() } returns "Alice"
```

## 4. What is Espresso?
An Android testing framework provided by Google for writing UI (Instrumented) tests. It simulates user interactions (clicks, swipes) and verifies that the UI responds correctly.

```kotlin
@Test
fun testButtonClick() {
    // Find view, perform click, check text
    onView(withId(R.id.my_button)).perform(click())
    onView(withId(R.id.result_text)).check(matches(withText("Success")))
}
```

## 5. What are the key synchronization features of Espresso?
Espresso automatically synchronizes with the UI thread. It waits until the main thread is idle (no animations running, no messages in the queue, no AsyncTask running) before executing the next test command, eliminating the need for brittle `Thread.sleep()` calls.

## 6. How do you test Jetpack Compose UI?
Compose uses its own testing framework via `createComposeRule()`. Instead of finding views by ID (since Compose doesn't use IDs), you find nodes by text or content description.

```kotlin
@get:Rule
val composeTestRule = createComposeRule()

@Test
fun testComposeButton() {
    composeTestRule.setContent { MyButton() }
    composeTestRule.onNodeWithText("Click Me").performClick()
}
```

## 7. What is UI Automator?
While Espresso tests only the UI within your specific app, UI Automator allows you to write cross-app UI tests (e.g., opening your app, pressing the home button, opening settings, changing a setting, and returning to your app).

## 8. How do you test a ViewModel?
ViewModels should not contain Android framework dependencies, making them perfect for Local Unit Tests. You test them by calling their functions and asserting that their exposing `StateFlow` or `LiveData` holds the correct values.

## 9. What is the `InstantTaskExecutorRule`?
A JUnit rule used when testing Architecture Components (like LiveData). It forces background tasks (like updating LiveData) to execute synchronously on the same thread, preventing test failures due to asynchronous background execution.

## 10. How do you test Coroutines?
Using the `kotlinx-coroutines-test` library. You wrap your test in `runTest`, which provides a virtual time controller, allowing `delay()` calls to skip forward instantly rather than actually waiting.

```kotlin
@Test
fun testDelay() = runTest {
    // This executes instantly, even if function has a 10-second delay
    val data = fetchNetworkData() 
}
```

## 11. What is Gradle?
An advanced build automation tool used by Android Studio. It takes all your code, XML, resources, and dependencies, compiles them, and packages them into an APK or AAB.

## 12. What is `build.gradle.kts` vs `build.gradle`?
- `build.gradle`: Written in Groovy (the older standard).
- `build.gradle.kts`: Written in Kotlin DSL (the modern standard). It provides type safety, better IDE autocomplete, and allows using Kotlin for build logic.

## 13. What is the difference between `compileSdk`, `minSdk`, and `targetSdk`?
- **minSdk**: The lowest Android version your app can run on.
- **compileSdk**: The Android API version used to compile your code (usually the latest).
- **targetSdk**: The Android version you have explicitly tested your app against. It tells the OS which backward-compatibility behaviors to enable.

## 14. What are Build Types and Product Flavors?
- **Build Types**: Used for the development lifecycle (e.g., `debug`, `release`).
- **Product Flavors**: Used to create different versions of the app from the same codebase (e.g., `free`, `premium`). Combining them creates Build Variants (e.g., `freeDebug`).

## 15. What is CI/CD?
Continuous Integration / Continuous Deployment. An automated pipeline (using tools like GitHub Actions, Jenkins, or Bitrise) that automatically runs all your tests, builds the APK, and uploads it to the Play Store every time you push code.

## 16. What is Fastlane?
An open-source platform aimed at simplifying Android and iOS deployment. It automates tedious tasks like generating screenshots, dealing with provisioning profiles, and releasing the application.

## 17. What is Firebase Crashlytics?
A lightweight, real-time crash reporter. It tracks, prioritizes, and fixes stability issues that erode your app quality in production by providing highly detailed crash stack traces directly from users' devices.

## 18. What is the Android Profiler?
A set of tools integrated into Android Studio that provide real-time data about how your app utilizes CPU, Memory, Network, and Battery, helping you find bottlenecks and leaks.

## 19. What is the Layout Inspector?
An Android Studio tool that allows you to inspect the View hierarchy (or Compose tree) of your app in real-time as it runs on the device. It shows bounds, margins, padding, and attributes in 3D.

## 20. What is a Memory Heap Dump?
A snapshot of all the objects in the app's memory at a specific point in time. Developers trigger this when investigating memory leaks to see exactly which objects are refusing to die and what references are keeping them alive.

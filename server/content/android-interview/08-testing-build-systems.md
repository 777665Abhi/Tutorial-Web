---
title: "Testing, Build Systems & Tooling"
description: "Ensuring code quality with testing frameworks, Gradle, and ADB."
---

## 1. What is the difference between Unit Tests and Instrumented UI Tests?
- **Unit Tests (`src/test`)**: Run locally on your computer's Java Virtual Machine (JVM). They are blazing fast because they don't require an Android device. Used to test pure business logic, ViewModels, and algorithms.
- **Instrumented Tests (`src/androidTest`)**: Must run on a physical Android device or Emulator. They are slower but have access to real Android APIs (like `Context`). Used primarily for testing UI flows (via Espresso) and database integrations (Room).

## 2. How do you test ViewModels and Coroutines using `TestDispatcher` and `runTest`?
Because tests run synchronously, normal coroutine delays (like `delay(1000)`) would make tests incredibly slow.
The `kotlinx-coroutines-test` library provides `runTest`, which automatically skips delays, running time-based coroutines instantly. You must also inject a `StandardTestDispatcher` into your ViewModels to replace `Dispatchers.Main` (since the Main thread doesn't exist in local JVM tests), giving you precise control over coroutine execution order.

## 3. What are Test Doubles (Mocks, Stubs, Fakes, Spies)?
Test Doubles are replacement objects used in testing.
- **Fake**: A lightweight, working implementation of an interface (e.g., an In-Memory Database Fake replacing a real Room database). Highly recommended.
- **Stub**: Provides hardcoded, predefined answers to function calls.
- **Mock**: An object (usually created by libraries like MockK or Mockito) that strictly verifies *if* a method was called and with what parameters.
- **Spy**: Wraps a real object, allowing you to observe and verify its behavior while executing its real code.

## 4. How do you test Jetpack Compose UI components using `ComposeTestRule`?
Compose UI tests do not use Espresso. Instead, they use `createComposeRule()`.
You set the UI content within the test (`composeTestRule.setContent { MyButton() }`), then you use semantic matchers to find nodes and perform actions. 
For example: `composeTestRule.onNodeWithText("Submit").performClick()`. Finally, you assert the state: `.assertIsDisplayed()`.

## 5. What tools do you use for mocking API network responses (e.g., `MockWebServer`)?
While you can mock the Retrofit interface, the best practice is to test the entire networking stack (including OkHttp interceptors and JSON parsing) using Square's `MockWebServer`. 
It spins up a real, lightweight local HTTP server during the test. You configure it to enqueue predefined JSON responses, and you point your Retrofit client to `localhost` instead of the production URL.

## 6. What is Gradle configuration cache, and how does it improve build speeds?
The Gradle build process has three phases: Initialization, Configuration, and Execution. The Configuration phase (where Gradle evaluates all `build.gradle` scripts) can take several seconds.
The Configuration Cache saves the output of this phase to disk. On subsequent builds, if your build scripts haven't changed, Gradle skips the configuration phase entirely, drastically reducing build times.

## 7. Explain the difference between `implementation`, `api`, and `compileOnly` dependencies in Gradle.
- **`implementation`**: The dependency is hidden inside the module. If Module A depends on Library X via `implementation`, and Module B depends on A, Module B *cannot* access Library X's classes. This speeds up compilation because changing Library X doesn't force Module B to recompile.
- **`api`**: The dependency is exposed. Module B *can* access Library X.
- **`compileOnly`**: The dependency is available during compilation but is not packaged into the final APK. Used for annotations or when the environment guarantees the library is already present at runtime.

## 8. What is `buildSrc` vs Gradle Version Catalogs (`libs.versions.toml`) for dependency management?
Both are ways to manage dependencies centrally across a multi-module project.
- **`buildSrc`**: An older Kotlin-based approach. Modifying a version string in `buildSrc` invalidates the entire build cache, forcing a massive, slow recompilation of the whole project.
- **Version Catalogs (`.toml`)**: The modern standard. It defines dependencies centrally in a simple TOML file. Updating a version number here is fast and does not invalidate the Gradle configuration cache.

## 9. How do you set up a Continuous Integration / Continuous Deployment (CI/CD) pipeline for Android apps?
A standard CI/CD pipeline (using GitHub Actions, Bitrise, or GitLab CI) executes automatically when code is pushed.
1. **Linting/Formatting**: Runs `ktlint` or `detekt` to enforce code style.
2. **Testing**: Runs JVM Unit Tests (`./gradlew testDebugUnitTest`).
3. **Building**: Compiles the project and generates the APK/AAB (`./gradlew assembleDebug`).
4. **Deployment**: Uploads the artifact to Firebase App Distribution for QA testers, or directly to the Google Play Console internal testing track via the Google Play Developer API.

## 10. What is Android Debug Bridge (ADB), and what are some essential ADB commands?
ADB is a versatile command-line tool that lets you communicate with an Android device.
Essential commands:
- `adb devices`: Lists connected devices.
- `adb install app.apk`: Installs an app.
- `adb logcat`: Dumps the system log (useful for viewing crashes).
- `adb shell am start -n com.example/.MainActivity`: Launches an activity via the Activity Manager (am).
- `adb shell input text "hello"`: Simulates typing text into the device.

## 11. What is Jacoco and how do you measure code coverage?
Jacoco (Java Code Coverage) is a library that analyzes your test execution to determine which lines of your application code were actually run during the tests. By integrating the Jacoco plugin into your `build.gradle`, it generates a detailed HTML report showing the percentage of lines, branches, and methods covered by your tests, helping identify untested logic.

## 12. What is the difference between `mockk` and `mockito`?
- **Mockito**: The classic Java mocking framework. Originally, it struggled heavily with Kotlin-specific features like `final` classes (default in Kotlin) and `suspend` functions.
- **MockK**: A mocking library built specifically from the ground up for Kotlin. It natively supports mocking `final` classes, `object` singletons, extension functions, and provides first-class support for `coroutines` and `suspend` functions.

## 13. How do you perform snapshot testing in Jetpack Compose (e.g., Paparazzi or Roborazzi)?
Snapshot testing libraries like Paparazzi (by Square) or Roborazzi take a picture of your Composable and save it as a PNG reference file in your repository. 
During subsequent test runs, the library renders the Composable again and compares it pixel-by-pixel to the reference image. If the UI changed (even slightly), the test fails, preventing unintended visual regressions. They run purely on the local JVM, making them much faster than UI tests on an emulator.

## 14. What is a Build Variant, and how do product flavors differ from build types?
A **Build Variant** is the cross product of a Build Type and a Product Flavor.
- **Build Types**: Define *how* the app is built (e.g., `debug`, `release`). They handle obfuscation, signing keys, and debuggability.
- **Product Flavors**: Define *what* app is built (e.g., `free`, `paid`, `staging`, `production`). They handle custom application IDs, string resources, and specific API URLs.
Combining `debug` with `free` generates the `freeDebug` Build Variant.

## 15. How do you troubleshoot slow Gradle builds (Build Scan)?
When Gradle builds take too long, you can append the `--scan` flag to your command (e.g., `./gradlew assembleDebug --scan`). 
This uploads telemetry data to Gradle's servers and provides a web-based dashboard detailing exactly where the time was spent: which tasks took the longest, if the configuration cache was missed, and if any specific third-party plugins are acting as bottlenecks.

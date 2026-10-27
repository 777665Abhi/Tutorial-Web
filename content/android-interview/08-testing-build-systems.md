---
title: "Testing, Build Systems & Tooling"
description: "Ensuring code quality with testing frameworks, Gradle, and ADB."
---

## 1. What is the difference between Unit Tests and Instrumented UI Tests?
- **Unit Tests (`src/test`)**: Run locally on your computer's Java Virtual Machine (JVM). They are blazing fast because they don't require an Android device. Used to test pure business logic, ViewModels, and algorithms.
- **Instrumented Tests (`src/androidTest`)**: Must run on a physical Android device or Emulator. They are slower but have access to real Android APIs (like `Context`). Used primarily for testing UI flows (via Espresso) and database integrations (Room).

**The underlying reason for the split:** the `android.jar` on your JVM classpath is a **stub** — every method throws `RuntimeException("Stub!")`. So a unit test touching real Android classes fails immediately. Instrumented tests run inside a real app process on a device, where those classes are real.

**The speed difference is the whole design pressure:** a JVM unit test runs in **milliseconds**; an instrumented test costs **seconds** plus emulator startup. A suite of 2,000 unit tests finishes in under a minute; 2,000 instrumented tests take hours. This is why architecture that keeps logic out of Android classes pays off directly in feedback speed.

**Where each belongs:**

- **Unit (`src/test`)** — ViewModels, use cases, repositories with fake data sources, mappers, validators, formatters, anything pure Kotlin.
- **Instrumented (`src/androidTest`)** — Room DAOs against real SQLite (an in-memory database still needs the real engine), UI flows with Espresso or Compose, `WorkManager` with `WorkManagerTestInitHelper`, navigation, permissions.

**Robolectric is the third option** people forget: it runs Android framework code on the JVM by providing real (shadow) implementations instead of stubs. You get `Context`, resources, and even view inflation at JVM speed. It's slower than a pure unit test and less faithful than a device, so it occupies a useful middle ground — testing something that needs `Context` without paying for an emulator.

**The testing pyramid** is the framing to offer: many fast unit tests at the base, fewer integration tests, and a thin layer of end-to-end UI tests at the top. The common anti-pattern is the "ice cream cone" — lots of slow, flaky UI tests and few unit tests — which produces a suite nobody trusts and everybody skips.

```kotlin
// A pure unit test: no Android, no emulator, milliseconds
@Test
fun `email validator rejects missing at sign`() {
    assertFalse(EmailValidator.isValid("not-an-email"))
}
```

## 2. How do you test ViewModels and Coroutines using `TestDispatcher` and `runTest`?
Because tests run synchronously, normal coroutine delays (like `delay(1000)`) would make tests incredibly slow.
The `kotlinx-coroutines-test` library provides `runTest`, which automatically skips delays, running time-based coroutines instantly. You must also inject a `StandardTestDispatcher` into your ViewModels to replace `Dispatchers.Main` (since the Main thread doesn't exist in local JVM tests), giving you precise control over coroutine execution order.

**`runTest` gives you virtual time.** It uses a `TestCoroutineScheduler` where `delay(10_000)` advances a *virtual* clock instantly rather than actually waiting. A test of a 30-second timeout runs in milliseconds.

**`Dispatchers.Main` doesn't exist on the JVM**, so `viewModelScope` (which uses `Main.immediate`) throws without a rule to replace it:

```kotlin
class MainDispatcherRule(
    private val dispatcher: TestDispatcher = UnconfinedTestDispatcher()
) : TestWatcher() {
    override fun starting(d: Description) { Dispatchers.setMain(dispatcher) }
    override fun finished(d: Description) { Dispatchers.resetMain() }
}

class UserViewModelTest {
    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `loads user successfully`() = runTest {
        val vm = UserViewModel(FakeUserRepository())
        vm.load("42")
        advanceUntilIdle()                       // run all pending coroutines
        assertEquals("Alice", vm.uiState.value.name)
    }
}
```

**The two dispatchers behave differently, and choosing wrongly is the usual source of confusion:**

- **`StandardTestDispatcher`** — queues coroutines; nothing runs until you call `advanceUntilIdle()`, `advanceTimeBy()`, or `runCurrent()`. **Gives you precise control**, which is what you want when asserting on intermediate states (e.g. that `Loading` was emitted before `Success`).
- **`UnconfinedTestDispatcher`** — starts coroutines **eagerly**, running them until their first real suspension. Simpler for tests where you only care about the final state, because you don't need `advanceUntilIdle()` everywhere.

**Dispatchers must be injected, not hardcoded** — a class calling `Dispatchers.IO` directly can't be controlled from a test:

```kotlin
class Repository(private val io: CoroutineDispatcher = Dispatchers.IO) {
    suspend fun load() = withContext(io) { api.fetch() }
}
// Test: Repository(StandardTestDispatcher(testScheduler))
```

Passing `testScheduler` keeps everything on one virtual clock, which matters when multiple dispatchers are involved.

**Testing flows** uses either Turbine (the standard choice) or manual collection:

```kotlin
@Test fun `emits loading then success`() = runTest {
    viewModel.uiState.test {                       // Turbine
        assertEquals(UiState.Loading, awaitItem())
        assertTrue(awaitItem() is UiState.Success)
        cancelAndIgnoreRemainingEvents()
    }
}
```

**A note on the old API:** `runBlockingTest`, `TestCoroutineDispatcher` and `TestCoroutineScope` are deprecated. `runTest` plus `TestDispatcher` is the current, better-behaved replacement.

## 3. What are Test Doubles (Mocks, Stubs, Fakes, Spies)?
Test Doubles are replacement objects used in testing.
- **Fake**: A lightweight, working implementation of an interface (e.g., an In-Memory Database Fake replacing a real Room database). Highly recommended.
- **Stub**: Provides hardcoded, predefined answers to function calls.
- **Mock**: An object (usually created by libraries like MockK or Mockito) that strictly verifies *if* a method was called and with what parameters.
- **Spy**: Wraps a real object, allowing you to observe and verify its behavior while executing its real code.

**The distinction that actually matters is *state* versus *interaction* verification.** Fakes and stubs let you assert on **outcomes** ("the repository now contains the user"). Mocks let you assert on **interactions** ("`save()` was called once with this argument"). The second couples your test to the implementation — change how the code achieves the result and the test breaks even though the behaviour is identical.

That's why fakes are preferred: they test what the code *does*, not how it does it.

```kotlin
// Fake — a real, simple implementation. Reusable across many tests.
class FakeUserRepository : UserRepository {
    private val users = mutableMapOf<String, User>()
    var shouldThrow = false

    override suspend fun getUser(id: String): User {
        if (shouldThrow) throw IOException("network down")
        return users[id] ?: throw NoSuchElementException()
    }
    override suspend fun save(user: User) { users[user.id] = user }
}

// Test asserts on observable state, not on calls
@Test fun `saving a user makes it retrievable`() = runTest {
    val repo = FakeUserRepository()
    repo.save(User("1", "Alice"))
    assertEquals("Alice", repo.getUser("1").name)
}
```

```kotlin
// Mock — appropriate when the interaction IS the behaviour
@Test fun `logout clears the session exactly once`() = runTest {
    val session = mockk<SessionManager>(relaxed = true)
    AuthViewModel(session).logout()
    verify(exactly = 1) { session.clear() }
}
```

**Where mocks are genuinely the right tool:** when the *call itself* is the observable effect — sending an analytics event, clearing a session, firing a notification — or when the real collaborator is impossible to construct in a test.

**Where they go wrong:** mocking every dependency produces tests that pass while the app is broken, because every collaborator returns whatever you told it to. A classic failure is a test suite that's green after a refactor that silently broke integration between two classes.

**Practical guidance:** write fakes for your own interfaces (repositories, data sources) and keep them in a shared test module so they're reused rather than reinvented. Use mocks sparingly for third-party interfaces and genuine interaction assertions. Avoid spies almost entirely — a partially-real object is hard to reason about, and needing one usually signals a class that should be split.

## 4. How do you test Jetpack Compose UI components using `ComposeTestRule`?
Compose UI tests do not use Espresso. Instead, they use `createComposeRule()`.
You set the UI content within the test (`composeTestRule.setContent { MyButton() }`), then you use semantic matchers to find nodes and perform actions. 
For example: `composeTestRule.onNodeWithText("Submit").performClick()`. Finally, you assert the state: `.assertIsDisplayed()`.

**Tests operate on the semantics tree, not the view hierarchy** — because there is no view hierarchy. Compose maintains a parallel tree describing *meaning* (text, role, state, actions), which is the same tree accessibility services use. So writing testable Compose and writing accessible Compose are the same activity, which is a genuinely nice property.

```kotlin
class LoginScreenTest {
    @get:Rule val composeTestRule = createComposeRule()

    @Test
    fun `submit is disabled until both fields are filled`() {
        composeTestRule.setContent { LoginScreen(onSubmit = {}) }

        composeTestRule.onNodeWithText("Submit").assertIsNotEnabled()

        composeTestRule.onNodeWithTag("email").performTextInput("a@b.com")
        composeTestRule.onNodeWithTag("password").performTextInput("secret")

        composeTestRule.onNodeWithText("Submit").assertIsEnabled().performClick()
    }
}
```

**Three rule variants, and when each applies:**

- **`createComposeRule()`** — no Activity needed. The fastest, and the default for testing a composable in isolation.
- **`createAndroidComposeRule<MyActivity>()`** — launches a real Activity; needed when testing navigation or anything requiring Activity context.
- **`createEmptyComposeRule()`** — when you launch the Activity yourself.

**Finders, actions and assertions** are the three verbs: `onNodeWithText` / `onNodeWithTag` / `onNodeWithContentDescription` / `onAllNodes…` to find; `performClick` / `performTextInput` / `performScrollTo` / `performTouchInput` to act; `assertIsDisplayed` / `assertIsEnabled` / `assertTextEquals` / `assertCountEquals` to verify.

**Use `Modifier.testTag("...")` for stable identification.** Matching on visible text ties your test to copy, so a wording change or a localised build breaks tests that have nothing to do with the change.

**Synchronisation is automatic — and that's the big advantage over Espresso.** The test framework knows when Compose is idle (no pending recompositions or animations) and waits automatically, so there's no `IdlingResource` plumbing. When you do need to wait on something external:

```kotlin
composeTestRule.waitUntil(timeoutMillis = 5_000) {
    composeTestRule.onAllNodesWithTag("item").fetchSemanticsNodes().isNotEmpty()
}
```

**Infinite animations are the exception** that breaks auto-sync: a looping animation means Compose is never idle, and the test hangs. Disable it via `composeTestRule.mainClock.autoAdvance = false` and advance manually.

**Debugging:** `composeTestRule.onRoot().printToLog("TAG")` dumps the entire semantics tree, which is the fastest way to find out why a matcher didn't match.

## 5. What tools do you use for mocking API network responses (e.g., `MockWebServer`)?
While you can mock the Retrofit interface, the best practice is to test the entire networking stack (including OkHttp interceptors and JSON parsing) using Square's `MockWebServer`. 
It spins up a real, lightweight local HTTP server during the test. You configure it to enqueue predefined JSON responses, and you point your Retrofit client to `localhost` instead of the production URL.

**Why it beats mocking the Retrofit interface** — this is the key insight. `mockk<ApiService>()` returning a `User` object tests nothing about your networking: not the JSON deserialisation, not your auth interceptor, not error-code handling, not the URL construction. `MockWebServer` exercises the whole stack, so a renamed JSON field or a broken `@SerialName` actually fails a test.

```kotlin
class UserApiTest {
    private lateinit var server: MockWebServer
    private lateinit var api: UserApi

    @Before fun setUp() {
        server = MockWebServer().apply { start() }
        api = Retrofit.Builder()
            .baseUrl(server.url("/"))               // point at the mock
            .addConverterFactory(MoshiConverterFactory.create())
            .build().create(UserApi::class.java)
    }

    @After fun tearDown() = server.shutdown()

    @Test fun `parses user response`() = runTest {
        server.enqueue(MockResponse()
            .setResponseCode(200)
            .setBody("""{"id":"1","full_name":"Alice"}"""))

        val user = api.getUser("1")

        assertEquals("Alice", user.name)
        val request = server.takeRequest()          // assert on what was SENT
        assertEquals("/users/1", request.path)
        assertEquals("Bearer token", request.getHeader("Authorization"))
    }
}
```

**`takeRequest()` is the under-used half** — it lets you verify the request your code built, which catches wrong paths, missing headers, and malformed bodies.

**Simulating failure is where it really earns its place**, because error paths are what break in production:

```kotlin
server.enqueue(MockResponse().setResponseCode(500))                    // server error
server.enqueue(MockResponse().setResponseCode(401))                    // auth expiry
server.enqueue(MockResponse().setBody("not json"))                     // malformed
server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.NO_RESPONSE)) // timeout
server.enqueue(MockResponse().setBodyDelay(5, TimeUnit.SECONDS))       // slow network
```

A `Dispatcher` lets you route by path instead of relying on a strict enqueue order, which makes tests less brittle when the code makes several calls.

**Where it fits among the options:**

- **Fake repository** — fastest; for testing ViewModels, where the network is irrelevant.
- **MockWebServer** — for testing the API layer end to end: parsing, interceptors, error mapping.
- **Mocked Retrofit interface** — rarely the right choice; it tests almost nothing.
- **Contract testing / Pact, or committed JSON fixtures** — for catching backend drift.

**For UI tests**, the same server can back the whole app, giving deterministic, offline-capable end-to-end tests — far more reliable than hitting a staging environment that changes under you.

## 6. What is Gradle configuration cache, and how does it improve build speeds?
The Gradle build process has three phases: Initialization, Configuration, and Execution. The Configuration phase (where Gradle evaluates all `build.gradle` scripts) can take several seconds.
The Configuration Cache saves the output of this phase to disk. On subsequent builds, if your build scripts haven't changed, Gradle skips the configuration phase entirely, drastically reducing build times.

**Why configuration is slow in the first place:** Gradle must evaluate every `build.gradle` in every module, apply every plugin, and construct the full task graph — *before any work happens*. In a 100-module project that's routinely 10–30 seconds, paid on every build, even one that compiles a single file.

The configuration cache serialises the resulting task graph, so a cache hit skips straight to execution. On large projects this is frequently the single biggest build-speed improvement available.

```properties
# gradle.properties
org.gradle.configuration-cache=true
org.gradle.caching=true          # build cache — a different thing (see below)
org.gradle.parallel=true
```

**Three caches, commonly confused** — being able to distinguish them is the real test here:

- **Configuration cache** — caches the **task graph**. Skips the configuration phase.
- **Build cache** — caches **task outputs**. A task with unchanged inputs reuses previous output, and this can be shared across machines and CI via a remote cache.
- **Incremental builds / up-to-date checks** — within one project, skipping tasks whose inputs haven't changed.

**The cost of adoption is real:** configuration cache requires build scripts to avoid accessing mutable state at execution time. The common violations are reading `System.getenv()` or project properties inside a task action, referencing `project` from a task, and plugins that aren't yet compatible. Gradle reports each violation with a link to the offending line.

```kotlin
// Violation: captures `project` at execution time
tasks.register("bad") { doLast { println(project.name) } }

// Compatible: capture the value at configuration time
val name = project.name
tasks.register("good") { doLast { println(name) } }
```

**Other high-impact build-speed levers** worth listing alongside it: enough heap for the Gradle daemon (`org.gradle.jvmargs=-Xmx4g`), **KSP instead of kapt** (often 2× faster annotation processing), modularisation so changes recompile less, avoiding dynamic versions (`1.+`) which defeat caching, and `nonTransitiveRClass=true`.

**Diagnose before optimising** with `--scan` (question 15), rather than guessing which of these matters for your project.

## 7. Explain the difference between `implementation`, `api`, and `compileOnly` dependencies in Gradle.
- **`implementation`**: The dependency is hidden inside the module. If Module A depends on Library X via `implementation`, and Module B depends on A, Module B *cannot* access Library X's classes. This speeds up compilation because changing Library X doesn't force Module B to recompile.
- **`api`**: The dependency is exposed. Module B *can* access Library X.
- **`compileOnly`**: The dependency is available during compilation but is not packaged into the final APK. Used for annotations or when the environment guarantees the library is already present at runtime.

**The build-speed mechanism is the main point.** With `implementation`, changing library X only recompiles module A. With `api`, it recompiles A **and everything that depends on A**, transitively. In a large modular project this is the difference between a 10-second build and a 3-minute one — which is why `implementation` is the default you should reach for, and `api` the exception you justify.

```
         implementation                        api
B ──▶ A ──✗── X    (B can't see X)    B ──▶ A ──▶ X   (B can see X)
Change X → recompile A only           Change X → recompile A and B
```

**When `api` is actually correct:** when the dependency appears in your module's **public API surface** — a return type, a parameter type, or a supertype that consumers must handle:

```kotlin
// This module's API exposes Retrofit's Response type → consumers need it → api
interface ApiClient { suspend fun get(): Response<User> }     // needs `api`

// Retrofit is purely internal here → implementation
class ApiClientImpl : ApiClient { private val retrofit = Retrofit.Builder()... }
```

If a consumer would have to add the dependency themselves to use your module, it belongs in `api`.

**The rest of the configurations**, since this question often expands:

- **`compileOnly`** — on the compile classpath, not packaged. For annotations with `CLASS`/`SOURCE` retention, and for APIs guaranteed present at runtime.
- **`runtimeOnly`** — packaged but not on the compile classpath. For runtime-swappable implementations (a logging backend, a JDBC driver).
- **`ksp` / `kapt` / `annotationProcessor`** — annotation processors.
- **`testImplementation` / `androidTestImplementation` / `debugImplementation`** — scoped to a source set or variant. `debugImplementation` is how LeakCanary stays out of release builds.

**The historical note:** `compile` is removed (it behaved like `api`). Migrating a legacy project from `compile` to `implementation` is often the cheapest large build-speed win available, because it cuts the recompilation graph dramatically.

## 8. What is `buildSrc` vs Gradle Version Catalogs (`libs.versions.toml`) for dependency management?
Both are ways to manage dependencies centrally across a multi-module project.
- **`buildSrc`**: An older Kotlin-based approach. Modifying a version string in `buildSrc` invalidates the entire build cache, forcing a massive, slow recompilation of the whole project.
- **Version Catalogs (`.toml`)**: The modern standard. It defines dependencies centrally in a simple TOML file. Updating a version number here is fast and does not invalidate the Gradle configuration cache.

**Why `buildSrc` invalidates everything:** it's compiled as a real Gradle project, and its output is on the classpath of **every** build script. Change one character and Gradle must recompile `buildSrc` and then re-evaluate every module's build script. Bumping a single version number triggers a full project rebuild — the exact opposite of what a dependency-management tool should cost.

Version catalogs are **declarative data**, not code. Gradle parses the TOML, and a version change invalidates only what genuinely depends on that dependency.

```toml
# gradle/libs.versions.toml
[versions]
kotlin = "2.0.21"
retrofit = "2.11.0"
compose-bom = "2024.10.00"

[libraries]
retrofit = { module = "com.squareup.retrofit2:retrofit", version.ref = "retrofit" }
retrofit-moshi = { module = "com.squareup.retrofit2:converter-moshi", version.ref = "retrofit" }
compose-bom = { module = "androidx.compose:compose-bom", version.ref = "compose-bom" }
compose-ui = { module = "androidx.compose.ui:ui" }        # version from the BOM

[bundles]
retrofit = ["retrofit", "retrofit-moshi"]

[plugins]
android-app = { id = "com.android.application", version = "8.7.0" }
```

```kotlin
// Any module's build.gradle.kts — type-safe accessors, with IDE completion
dependencies {
    implementation(libs.bundles.retrofit)
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
}
```

**The practical advantages beyond build speed:** type-safe accessors with autocompletion and clickable navigation, **bundles** for grouping related dependencies, `version.ref` so related artefacts stay in lockstep, a single file for dependency-update tooling (Renovate/Dependabot understand it natively), and a catalog that can be shared across repositories.

**`buildSrc` still has a legitimate role** — for genuine build *logic*: custom tasks, and convention plugins that share configuration across modules. The modern recommendation is to use a **composite build** (`includeBuild("build-logic")`) rather than `buildSrc` even for that, because it avoids the same invalidation problem.

**The division to state clearly:** version catalogs for **what** you depend on; convention plugins in `build-logic` for **how** modules are configured. Using `buildSrc` for dependency versions in 2026 is a legacy pattern worth migrating away from.

## 9. How do you set up a Continuous Integration / Continuous Deployment (CI/CD) pipeline for Android apps?
A standard CI/CD pipeline (using GitHub Actions, Bitrise, or GitLab CI) executes automatically when code is pushed.
1. **Linting/Formatting**: Runs `ktlint` or `detekt` to enforce code style.
2. **Testing**: Runs JVM Unit Tests (`./gradlew testDebugUnitTest`).
3. **Building**: Compiles the project and generates the APK/AAB (`./gradlew assembleDebug`).
4. **Deployment**: Uploads the artifact to Firebase App Distribution for QA testers, or directly to the Google Play Console internal testing track via the Google Play Developer API.

**Order the stages by speed, so failures surface fast.** Lint in seconds, unit tests in a minute, instrumented tests in ten. Running the slow stage first wastes everyone's time on a failure a linter would have caught.

```yaml
# .github/workflows/ci.yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '17' }
      - uses: gradle/actions/setup-gradle@v4     # caches Gradle + build cache
      - run: ./gradlew detekt lintDebug
      - run: ./gradlew testDebugUnitTest
      - run: ./gradlew assembleDebug
      - uses: actions/upload-artifact@v4
        with: { name: apk, path: app/build/outputs/apk/debug/*.apk }
```

**Secrets handling is the Android-specific hard part**, and the thing interviewers probe. Your keystore and signing passwords cannot be in the repository:

```yaml
- name: Decode keystore
  run: echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > app/release.jks
- run: ./gradlew bundleRelease
  env:
    KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
    KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
```

Base64-encode the keystore into a secret, decode it at build time, and never log the values. The same applies to `google-services.json` and the Play publishing service-account JSON.

**Instrumented tests in CI** need a device. The options are the emulator with hardware acceleration (`reactivecircus/android-emulator-runner`, which is slow and flaky on shared runners) or **Firebase Test Lab / Gradle Managed Devices**, which are more reliable and give real-device coverage. Many teams run unit tests on every PR and instrumented tests nightly, to keep PR feedback fast.

**Deployment** is usually automated with **Fastlane** (`supply` for Play uploads, `gym` for builds) or the `gradle-play-publisher` plugin, promoting to the **internal** track automatically and leaving production promotion as a manual gate with a **staged rollout**.

**What separates a good pipeline:** build caching (local and remote) so CI isn't rebuilding from scratch; `--no-daemon` on ephemeral runners; **required status checks** so a red build blocks merge; and automated version-code increments from the build number.

## 10. What is Android Debug Bridge (ADB), and what are some essential ADB commands?
ADB is a versatile command-line tool that lets you communicate with an Android device.
Essential commands:
- `adb devices`: Lists connected devices.
- `adb install app.apk`: Installs an app.
- `adb logcat`: Dumps the system log (useful for viewing crashes).
- `adb shell am start -n com.example/.MainActivity`: Launches an activity via the Activity Manager (am).
- `adb shell input text "hello"`: Simulates typing text into the device.

**How it's structured**, which explains the occasional "device unauthorized" and "offline" problems: ADB has three parts — a **client** (the command you type), a **server** (a background process on your machine, port 5037, that multiplexes connections), and a **daemon (adbd)** running on each device. `adb kill-server && adb start-server` resolves a surprising share of connection issues.

**Commands worth knowing beyond the basics**, grouped by what they're for:

```bash
# Logs — filtered, which is the only way logcat is usable
adb logcat *:E                              # errors only
adb logcat --pid=$(adb shell pidof -s com.example)   # just your app
adb logcat -c                               # clear the buffer first

# App lifecycle and state
adb shell pm clear com.example              # wipe app data — reset to first-run
adb shell pm grant com.example android.permission.CAMERA
adb shell pm revoke com.example android.permission.CAMERA
adb shell am force-stop com.example

# Simulating the conditions that break apps
adb shell am kill com.example               # simulate process death (NOT force-stop)
adb shell dumpsys deviceidle force-idle     # test Doze behaviour
adb shell cmd appops set com.example RUN_IN_BACKGROUND deny

# Deep links and intents
adb shell am start -a android.intent.action.VIEW -d "myapp://item/42"

# Diagnostics
adb shell dumpsys activity activities       # the current back stack
adb shell dumpsys meminfo com.example       # memory breakdown
adb shell am start -W -n com.example/.MainActivity   # startup timing

# Files and screen
adb pull /data/anr/traces.txt               # ANR traces
adb exec-out screencap -p > screen.png
adb shell screenrecord /sdcard/demo.mp4
```

**`adb shell am kill` is the one worth highlighting** — it's how you test **process death**, the scenario that breaks `ViewModel`-only state and that almost never happens during normal development. Background the app, run it, then return from Recents: if your screen comes back empty, you have a `SavedStateHandle` bug. This is a standard interview follow-up.

**For wireless debugging** (Android 11+), `adb pair <host:port>` then `adb connect`, which is genuinely useful for testing things that need the USB port free.

## 11. What is Jacoco and how do you measure code coverage?
Jacoco (Java Code Coverage) is a library that analyzes your test execution to determine which lines of your application code were actually run during the tests. By integrating the Jacoco plugin into your `build.gradle`, it generates a detailed HTML report showing the percentage of lines, branches, and methods covered by your tests, helping identify untested logic.

**How it works:** Jacoco instruments bytecode — either on the fly via a JVM agent or at build time — inserting probes that record which instructions executed. The report then maps that back to your source lines.

```groovy
apply plugin: 'jacoco'

android { buildTypes { debug { testCoverageEnabled true } } }

task jacocoTestReport(type: JacocoReport, dependsOn: 'testDebugUnitTest') {
    reports { html.required = true; xml.required = true }   // xml for CI tools
    def filter = ['**/R.class', '**/R$*.class', '**/BuildConfig.*',
                  '**/*_Hilt*', '**/Dagger*', '**/databinding/**']
    classDirectories.setFrom(fileTree(dir: "$buildDir/tmp/kotlin-classes/debug",
                                      excludes: filter))
    sourceDirectories.setFrom(files("$projectDir/src/main/java"))
    executionData.setFrom(fileTree(dir: buildDir, includes: ['**/*.exec']))
}
```

**Excluding generated code matters** — without the filter, Hilt, Dagger, data binding and `R` classes dominate the report and make the number meaningless.

**The metrics, in increasing usefulness:**

- **Line coverage** — which lines ran. The headline number, and the weakest.
- **Branch coverage** — whether *both* sides of each conditional ran. Much more informative: a line with `if (a && b)` can be 100% line-covered with one test and still have untested paths.
- **Method/class coverage** — coarse, mostly useful for spotting entire untested files.

**The critical caveat, and what an interviewer wants to hear: coverage measures execution, not verification.** This test gives 100% coverage and asserts nothing:

```kotlin
@Test fun `covers everything, verifies nothing`() {
    calculator.add(2, 2)        // line executed ✓  behaviour checked ✗
}
```

So a high percentage proves only that code *ran* during tests. It cannot tell you the assertions were meaningful, that edge cases were considered, or that the behaviour is correct.

**How to use it well:** treat it as a **gap finder**, not a target. Low coverage in a critical module is a real signal worth acting on; chasing 100% produces tests written for the metric — assertion-free tests on getters and generated code — which add maintenance cost and no confidence. Many teams set a modest floor (say 60–70%) on *new* code only, via a CI check, and look at the diff rather than the absolute number.

For Android specifically, combine unit and instrumented coverage with `jacocoTestReport` merging both `.exec` and `.ec` files, or use a plugin that handles it.

## 12. What is the difference between `mockk` and `mockito`?
- **Mockito**: The classic Java mocking framework. Originally, it struggled heavily with Kotlin-specific features like `final` classes (default in Kotlin) and `suspend` functions.
- **MockK**: A mocking library built specifically from the ground up for Kotlin. It natively supports mocking `final` classes, `object` singletons, extension functions, and provides first-class support for `coroutines` and `suspend` functions.

**The root of the friction: Kotlin classes are `final` by default.** Mockito's classic approach creates a subclass at runtime, which is impossible for a final class — so every Kotlin class needed `open`, or the `all-open` plugin, or `mockito-inline`. That last option (now the default in Mockito 5, using the inline mock maker and bytecode instrumentation) largely closed the gap, which is worth saying rather than presenting Mockito as broken.

**What MockK still does more naturally:**

```kotlin
// suspend functions — coEvery/coVerify, no wrapper needed
coEvery { repository.getUser("1") } returns User("1", "Alice")
coVerify(exactly = 1) { repository.getUser("1") }

// Kotlin object singletons
mockkObject(AnalyticsTracker)
every { AnalyticsTracker.track(any()) } just Runs

// Extension functions
mockkStatic("com.example.StringExtensionsKt")
every { "input".toSlug() } returns "input"

// Relaxed mocks — unstubbed calls return sensible defaults instead of throwing
val service = mockk<Service>(relaxed = true)
```

**MockK's syntax is Kotlin-idiomatic** (`every { } returns`, infix style, lambda blocks) versus Mockito's `when(...).thenReturn(...)` — and note `when` is a Kotlin keyword, so Mockito users need `Mockito.`when`` with backticks or the `mockito-kotlin` wrapper.

**The honest comparison:**

- **MockK** — better Kotlin ergonomics, native coroutine and `object`/extension support, no plugins needed. Downside: noticeably **slower** in large suites (it does more bytecode work), and the error messages can be cryptic.
- **Mockito (5.x) + mockito-kotlin** — faster, enormous ecosystem and documentation, and the final-class problem is resolved. Reasonable in a mixed Java/Kotlin codebase.

**For a pure Kotlin Android project, MockK is the usual recommendation.** For a mixed codebase or one with an existing Mockito investment, there's no strong reason to migrate.

**The point worth adding unprompted:** this is a tooling preference, and the more important question is **how much you mock at all**. Hand-written fakes for your own interfaces are faster, more readable, and less brittle than either library — the mocking framework should be reserved for third-party interfaces and genuine interaction assertions.

## 13. How do you perform snapshot testing in Jetpack Compose (e.g., Paparazzi or Roborazzi)?
Snapshot testing libraries like Paparazzi (by Square) or Roborazzi take a picture of your Composable and save it as a PNG reference file in your repository. 
During subsequent test runs, the library renders the Composable again and compares it pixel-by-pixel to the reference image. If the UI changed (even slightly), the test fails, preventing unintended visual regressions. They run purely on the local JVM, making them much faster than UI tests on an emulator.

**What they catch that nothing else does:** functional UI tests assert that a button exists and is clickable. They say nothing about whether it's the right colour, whether text is truncated at a larger font scale, whether the layout breaks in dark mode, or whether a padding change pushed content off screen. Snapshot tests catch exactly that class of regression.

```kotlin
class ButtonSnapshotTest {
    @get:Rule val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_5,
        theme = "android:Theme.Material.Light.NoActionBar"
    )

    @Test fun primaryButton() {
        paparazzi.snapshot { AppTheme { PrimaryButton("Submit", onClick = {}) } }
    }

    @Test fun primaryButtonDarkMode() {
        paparazzi.snapshot { AppTheme(darkTheme = true) { PrimaryButton("Submit", {}) } }
    }
}
```

```bash
./gradlew recordPaparazziDebug    # write/update reference images
./gradlew verifyPaparazziDebug    # compare against them — fails on diff
```

**Paparazzi vs. Roborazzi:**

- **Paparazzi** — renders using LayoutLib (the same engine as Android Studio previews) directly on the JVM, with **no emulator and no Robolectric**. Very fast. The constraint: it renders, so interaction and anything requiring a real framework runtime is out of scope.
- **Roborazzi** — built on **Robolectric**, so it can capture screenshots *during* a normal Robolectric test, including after interactions (`performClick()` then snapshot). More flexible, slightly slower.

A third option now exists: **Compose Preview Screenshot Testing**, the official AGP plugin that generates snapshots directly from your existing `@Preview` functions — which means the previews you already write become your test corpus.

**Where it works best: a design system.** Buttons, cards, inputs, badges — components with many states, tested across light/dark, font scales, and locales. Combinatorially generating those snapshots gives very high value per line of test code.

**The real costs, which you should raise:**

- **Reference images live in git**, so the repo grows. Git LFS is common.
- **Rendering differs across machines and JDK versions**, producing false failures. Pin everything, and run verification in a consistent CI environment (often a container).
- **Legitimate changes require re-recording**, and reviewers must actually look at the image diffs rather than rubber-stamping them — otherwise the whole mechanism silently stops catching anything.
- **Not suitable for dynamic content** — timestamps, animations, randomised data must be fixed or excluded.

## 14. What is a Build Variant, and how do product flavors differ from build types?
A **Build Variant** is the cross product of a Build Type and a Product Flavor.
- **Build Types**: Define *how* the app is built (e.g., `debug`, `release`). They handle obfuscation, signing keys, and debuggability.
- **Product Flavors**: Define *what* app is built (e.g., `free`, `paid`, `staging`, `production`). They handle custom application IDs, string resources, and specific API URLs.
Combining `debug` with `free` generates the `freeDebug` Build Variant.

**Flavor dimensions** multiply this further, and that's where the count can get out of hand:

```groovy
android {
    buildTypes {
        debug   { applicationIdSuffix ".debug"; debuggable true }
        release { minifyEnabled true; signingConfig signingConfigs.release }
    }

    flavorDimensions "tier", "environment"
    productFlavors {
        free  { dimension "tier"; applicationIdSuffix ".free" }
        paid  { dimension "tier" }
        dev   { dimension "environment"; buildConfigField "String", "API_URL", '"https://dev.api/"' }
        prod  { dimension "environment"; buildConfigField "String", "API_URL", '"https://api/"' }
    }
}
// Variants: freeDevDebug, freeDevRelease, freeProdDebug, paidProdRelease, … = 2 × 2 × 2 = 8
```

**Source-set merging is the powerful part**, and the thing that makes flavors more than a config switch. Each variant gets its own source set, merged with `main`:

```
src/main/java/...            — shared
src/free/java/...            — free-only implementations
src/paid/java/...            — paid-only implementations
src/debug/res/values/        — debug-only resources
src/freeDebug/java/...       — most specific wins
```

So you can provide an entirely different implementation of a class per flavor, with no `if (BuildConfig.FLAVOR == ...)` at runtime. A common use: a real analytics implementation in `prod` and a no-op in `dev`.

**`buildConfigField` and `resValue`** generate per-variant constants and resources, which is the clean way to vary API URLs, feature flags, and app names:

```groovy
debug { resValue "string", "app_name", "MyApp DEBUG" }
```

**`applicationIdSuffix` lets variants coexist on one device**, which is genuinely useful — a tester can have production and staging installed side by side.

**The caution worth voicing:** variant count multiplies, and so does build time and the testing matrix. Eight variants means eight things that can break and that CI might need to build. Keep dimensions to the minimum that genuinely needs to differ, use `variantFilter` to exclude nonsensical combinations, and prefer **runtime feature flags** over build-time flavors when the difference is just a toggle — flavors are for things that must differ at compile time, like a different billing implementation or a white-labelled brand.

## 15. How do you troubleshoot slow Gradle builds (Build Scan)?
When Gradle builds take too long, you can append the `--scan` flag to your command (e.g., `./gradlew assembleDebug --scan`). 
This uploads telemetry data to Gradle's servers and provides a web-based dashboard detailing exactly where the time was spent: which tasks took the longest, if the configuration cache was missed, and if any specific third-party plugins are acting as bottlenecks.

**What a build scan tells you**, which is more than a task list:

- **Timeline** — every task, its duration, and whether it ran in parallel.
- **Performance breakdown** — time split between configuration and execution, so you know which phase to attack.
- **Cache hit/miss per task**, with the **reason** for a miss — usually an input that changed unexpectedly, which is the single most actionable piece of information in the whole report.
- **Dependency resolution** time, which can be surprisingly large with many repositories.
- **Plugin attribution** — which plugin contributed what time.
- **Deprecations** that will break on the next Gradle version.

Note the privacy consideration: `--scan` uploads build metadata to `scans.gradle.com` by default. Organisations with policy constraints run **Develocity** (formerly Gradle Enterprise) on their own infrastructure, which also provides build history and trends rather than one-off snapshots.

**Diagnose in this order**, because the fixes differ:

1. **Is configuration or execution slow?** Configuration time scales with module count and plugin count; execution scales with how much actually compiles.
2. **If configuration** → enable the configuration cache, cut unnecessary plugins, remove work done at configuration time in build scripts.
3. **If execution** → look for cache misses, and for the biggest single tasks.

**The usual culprits, and their fixes:**

- **kapt** — frequently the largest single task. Migrating to **KSP** is often a 2× improvement on annotation processing.
- **Insufficient daemon memory** — `org.gradle.jvmargs=-Xmx4g -XX:+UseParallelGC`.
- **Caching disabled** — `org.gradle.caching=true`, plus a remote cache for CI and the team.
- **Dynamic versions** (`1.+`, `latest.release`) — these defeat caching and make builds non-reproducible.
- **`api` where `implementation` would do** — recompiles the dependency graph transitively (question 7).
- **Everything in one module** — modularisation lets Gradle skip and parallelise.
- **`nonTransitiveRClass=false`** — bloats R classes across modules.

```properties
org.gradle.jvmargs=-Xmx4g
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.configuration-cache=true
android.nonTransitiveRClass=true
```

**Measure before and after.** `--profile` gives a local HTML report if you'd rather not upload, and `gradle-profiler` runs reproducible benchmarks of a specific scenario (e.g. "incremental build after changing one file"), which is the honest way to prove an optimisation worked rather than trusting a one-off timing.

---
title: "Testing & Ecosystem"
description: "Unit testing, UI testing, CI/CD, Gradle, and Android Studio tools."
---

## 1. What is the difference between Local Unit Tests and Instrumented Tests?
- **Local Unit Tests**: Run on the local JVM on your development machine (fast). Located in `src/test`. They cannot use real Android framework APIs unless mocked.
- **Instrumented Tests**: Run on a physical Android device or emulator (slow). Located in `src/androidTest`. They have access to the actual Android Context and UI.

**The technical reason they can't use Android APIs:** the `android.jar` on the JVM test classpath is a **stub** — every method body is `throw new RuntimeException("Stub!")`. So touching a real framework class fails immediately, which is why you mock or avoid them.

**The speed gap drives everything else.** A JVM test runs in **milliseconds**; an instrumented test costs **seconds** plus emulator boot. Two thousand unit tests finish in under a minute; two thousand instrumented tests take hours. That difference is why architecture that keeps logic in plain Kotlin classes pays off directly in developer feedback speed — it's not an aesthetic preference.

**What belongs where:**

- **`src/test`** — ViewModels, use cases, repositories backed by fakes, mappers, validators, formatters. Anything that is or can be made pure Kotlin.
- **`src/androidTest`** — Room DAOs (an in-memory database still needs real SQLite), Espresso/Compose UI flows, `WorkManager`, navigation, permission handling, anything genuinely integrating with the framework.

**Robolectric is the middle option** often missed: it runs framework code on the JVM by substituting real shadow implementations for the stubs, so you get `Context`, resources, and even inflation without an emulator. Slower than a pure unit test, less faithful than a device — but ideal for the large class of tests that need `Context` and nothing more.

```kotlin
// src/test — pure, fast, no Android
@Test fun `discount caps at 50 percent`() {
    assertEquals(50, PriceCalculator.discountFor(tier = GOLD, basePercent = 80))
}
```

**The framing to offer:** a testing pyramid — many unit tests, fewer integration tests, a thin layer of UI tests. The anti-pattern is the inverted "ice cream cone", where a slow, flaky UI suite is the main safety net; teams stop trusting it, then stop running it.

## 2. What is JUnit?
The most popular unit testing framework for Java and Kotlin. It provides annotations like `@Test`, `@Before`, `@After` to structure test cases and assertion methods like `assertEquals()`.

```kotlin
@Test
fun testAddition() {
    val result = 2 + 2
    assertEquals(4, result)
}
```

**JUnit 4 is still the Android default**, which is worth knowing because most tutorials and most Android tooling (`AndroidJUnitRunner`, Espresso, `createComposeRule`) assume it. JUnit 5 is excellent on the JVM but has limited Android instrumentation support, so Android projects typically run JUnit 4, sometimes with JUnit 5 for pure-Kotlin modules.

**The lifecycle annotations and when each runs:**

- **`@Before`** — before **each** test. Fresh setup, so tests don't share state.
- **`@After`** — after each test. Cleanup.
- **`@BeforeClass` / `@AfterClass`** — once per class, for expensive shared setup. Must be static (`@JvmStatic` in a `companion object`).
- **`@Test(expected = X::class)`** — expects an exception, though `assertThrows` is clearer because it also lets you assert on the exception.
- **`@Ignore`** — skip, with a reason.
- **`@Rule`** — reusable per-test behaviour, which is how `MainDispatcherRule`, `InstantTaskExecutorRule`, and `createComposeRule` all work.

```kotlin
class CartTest {
    private lateinit var cart: Cart

    @Before fun setUp() { cart = Cart() }     // fresh instance per test

    @Test fun `total sums item prices`() {
        cart.add(Item("a", 100)); cart.add(Item("b", 250))
        assertEquals(350, cart.total)
    }

    @Test fun `removing a missing item throws`() {
        assertThrows(NoSuchElementException::class.java) { cart.remove("ghost") }
    }
}
```

**Kotlin lets you use backtick names**, and you should — `` `total sums item prices` `` reads far better in a failure report than `testTotal2`.

**Three practices that matter more than the API:**

- **Arrange–Act–Assert** structure, so each test has one obvious subject.
- **One logical assertion per test.** A test asserting five things stops at the first failure and tells you less.
- **Tests must be independent and order-independent.** Shared mutable state between tests produces failures that only appear in CI, which is the worst kind.

**Assertion libraries** like **Truth** (Google) or AssertJ give much better failure messages than bare JUnit: `assertThat(list).containsExactly("a", "b")` tells you what the list actually contained, where `assertTrue(list == expected)` just says `false`.

## 3. What is Mockito / MockK?
Mocking frameworks used in Local Unit Tests. Since local tests don't have access to real Android components or external services (like databases), you create "mock" objects that simulate their behavior. MockK is preferred for Kotlin as it handles coroutines easily.

```kotlin
val repo = mockk<UserRepository>()
every { repo.getUserName() } returns "Alice"
```

**What mocking gives you:** a stand-in for a dependency that is slow, non-deterministic, or impossible to construct in a test — a network client, a database, a system service, a clock.

**Why MockK fits Kotlin better.** Kotlin classes are **`final` by default**, and Mockito's classic approach generates a subclass — impossible for a final class. That meant `open` everywhere, the `all-open` plugin, or the inline mock maker. Mockito 5 made the inline mock maker the default and largely closed this gap, so it's fairer to say MockK is *more ergonomic* than that Mockito is broken.

```kotlin
// Coroutines — first-class in MockK
coEvery { repo.getUser("1") } returns User("1", "Alice")
coVerify(exactly = 1) { repo.getUser("1") }

// Kotlin object singletons
mockkObject(Analytics)
every { Analytics.track(any()) } just Runs

// Relaxed: unstubbed calls return defaults instead of throwing
val logger = mockk<Logger>(relaxed = true)

// Argument capture
val slot = slot<User>()
verify { repo.save(capture(slot)) }
assertEquals("Alice", slot.captured.name)
```

**The caution worth raising unprompted — over-mocking produces tests that pass while the app is broken.** If every collaborator is a mock returning exactly what you specified, you've tested that your code calls methods in an order you already decided, not that it works. A test suite can be green through a refactor that silently broke the integration between two classes.

**Prefer hand-written fakes for your own interfaces:**

```kotlin
class FakeUserRepository : UserRepository {
    private val users = mutableMapOf<String, User>()
    var failNext = false
    override suspend fun getUser(id: String): User {
        if (failNext) throw IOException()
        return users.getValue(id)
    }
    override suspend fun save(u: User) { users[u.id] = u }
}
```

A fake is reusable across dozens of tests, tests **state** rather than **interactions**, and doesn't break when you refactor. Reserve mocks for third-party interfaces and for cases where the *call itself* is the behaviour you're asserting — an analytics event fired, a session cleared.

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

**The API is three verbs, and the structure never varies:** `onView(matcher)` to find, `.perform(action)` to act, `.check(assertion)` to verify.

```kotlin
// ViewMatchers — finding
onView(withId(R.id.email))
onView(withText("Submit"))
onView(allOf(withId(R.id.button), isDisplayed()))      // combine when ambiguous
onView(withContentDescription("Close"))

// ViewActions — acting
.perform(click(), typeText("hello"), closeSoftKeyboard(), swipeLeft(), scrollTo())

// ViewAssertions — verifying
.check(matches(isDisplayed()))
.check(matches(withText("Success")))
.check(doesNotExist())
```

**RecyclerView needs its own API**, which is a frequent stumbling block because items off screen don't exist as views:

```kotlin
onView(withId(R.id.list)).perform(
    RecyclerViewActions.actionOnItemAtPosition<VH>(5, click())
)
```

**`ActivityScenario` is the modern launcher**, replacing the deprecated `ActivityTestRule`:

```kotlin
@Test fun loginFlow() {
    ActivityScenario.launch(LoginActivity::class.java).use { scenario ->
        onView(withId(R.id.email)).perform(typeText("a@b.com"))
        onView(withId(R.id.submit)).perform(click())
        onView(withId(R.id.welcome)).check(matches(isDisplayed()))
    }
}
```

It also gives you lifecycle control — `scenario.moveToState(Lifecycle.State.CREATED)` and `scenario.recreate()`, which is how you test configuration-change behaviour properly.

**Espresso-Intents and Espresso-Web** extend it to verify outgoing intents and to drive `WebView` content.

**The honest limitations:** Espresso tests only **your** app's UI (cross-app flows need UI Automator), it's slow because it needs a device, and despite its synchronisation it remains the most flake-prone part of most test suites — animations, network calls, and background work all cause intermittent failures. Disable animations on test devices (`adb shell settings put global window_animation_scale 0`), and use a `MockWebServer` or fake backend rather than a live one.

For Compose UI, Espresso does not apply at all — use the Compose test rule (question 6).

## 5. What are the key synchronization features of Espresso?
Espresso automatically synchronizes with the UI thread. It waits until the main thread is idle (no animations running, no messages in the queue, no AsyncTask running) before executing the next test command, eliminating the need for brittle `Thread.sleep()` calls.

**Why this was a big deal.** Before Espresso, UI tests were littered with `Thread.sleep(2000)` — slow when the app was fast, and still flaky when it wasn't. Espresso instead waits for an actual *condition*: it checks that the main `Looper`'s message queue is empty, no view animations are running, and (historically) no `AsyncTask`s are pending. Only then does it run the next instruction.

**The gap: Espresso cannot see work it doesn't know about.** Your network call, your coroutine on `Dispatchers.IO`, your `RxJava` scheduler, and your `WorkManager` job are all invisible to it. The main thread is idle while the request is in flight, so Espresso proceeds and the assertion fails against a still-loading screen.

**`IdlingResource` is the bridge** — you tell Espresso when your app is busy:

```kotlin
object NetworkIdlingResource : IdlingResource {
    private val counter = AtomicInteger(0)
    @Volatile private var callback: IdlingResource.ResourceCallback? = null

    override fun getName() = "network"
    override fun isIdleNow() = counter.get() == 0
    override fun registerIdleTransitionCallback(cb: IdlingResource.ResourceCallback) {
        callback = cb
    }

    fun increment() = counter.incrementAndGet()
    fun decrement() { if (counter.decrementAndGet() == 0) callback?.onTransitionToIdle() }
}

// In the test
IdlingRegistry.getInstance().register(NetworkIdlingResource)
```

**The design objection to raise:** this requires **production code to know it is being tested** — your repository has to increment and decrement a test object. That's a real smell, and it's why better options exist:

- **`IdlingThreadPoolExecutor` / `IdlingScheduler`** — wrap the executor rather than instrumenting your business logic.
- **Inject a test dispatcher** so coroutine work is deterministic and no waiting is needed at all.
- **`MockWebServer`** so responses are instant and local.
- **`CountingIdlingResource`** — a ready-made counter, if you must do it manually.

**Compose solves this properly.** The Compose test framework knows its own internal state, so it waits for recomposition and animations automatically with **no** `IdlingResource` plumbing. The exception is an **infinite animation**, which means Compose is never idle and the test hangs — handle that with `mainClock.autoAdvance = false`.

**Never reach for `Thread.sleep`.** If you genuinely need to wait on an external condition, use a polling helper with a timeout, which fails fast and clearly rather than passing by luck.

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

**Tests operate on the semantics tree** — a parallel tree describing *meaning* (text, role, state, available actions) rather than views. It's the same tree accessibility services consume, which produces a nice property: making a composable testable and making it accessible are the same work.

**Use `Modifier.testTag` for stable identification**, rather than matching on visible text:

```kotlin
TextField(value = email, onValueChange = {}, modifier = Modifier.testTag("email"))
```

```kotlin
composeTestRule.onNodeWithTag("email").performTextInput("a@b.com")
```

Matching on text couples the test to copy, so a wording tweak or a localised build breaks tests unrelated to the change.

**A realistic test:**

```kotlin
class LoginScreenTest {
    @get:Rule val rule = createComposeRule()

    @Test fun `submit enabled only when both fields filled`() {
        rule.setContent { AppTheme { LoginScreen(onSubmit = {}) } }

        rule.onNodeWithText("Submit").assertIsNotEnabled()
        rule.onNodeWithTag("email").performTextInput("a@b.com")
        rule.onNodeWithTag("password").performTextInput("secret")
        rule.onNodeWithText("Submit").assertIsEnabled().performClick()
    }
}
```

**Three rule variants:** `createComposeRule()` (no Activity — fastest, for isolated composables), `createAndroidComposeRule<MyActivity>()` (real Activity, needed for navigation), and `createEmptyComposeRule()` (you launch it yourself).

**Synchronisation is automatic**, which is the significant advantage over Espresso — no `IdlingResource` is needed because the framework knows when recomposition and animations have settled. When waiting on something external:

```kotlin
rule.waitUntil(timeoutMillis = 5_000) {
    rule.onAllNodesWithTag("row").fetchSemanticsNodes().isNotEmpty()
}
```

**Debugging:** `rule.onRoot().printToLog("TAG")` dumps the whole semantics tree, which is by far the quickest way to discover why a matcher found nothing.

**Note these are still instrumented tests** by default (`src/androidTest`). Running them on **Robolectric** moves them to the JVM for a large speed win, and **screenshot tests** (Paparazzi, Roborazzi, or the official Compose Preview Screenshot Testing) cover the visual correctness that functional assertions can't.

## 7. What is UI Automator?
While Espresso tests only the UI within your specific app, UI Automator allows you to write cross-app UI tests (e.g., opening your app, pressing the home button, opening settings, changing a setting, and returning to your app).

**The difference in scope comes from how they work.** Espresso runs **inside your app's process** and accesses your view hierarchy directly — fast and precise, but it stops at your app's boundary. UI Automator uses the **accessibility APIs** to drive the whole device from outside, so it can touch any app, the system UI, and the launcher — but it's slower and more brittle, because it only sees what accessibility exposes.

```kotlin
val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())

device.pressHome()
device.findObject(By.text("Settings")).click()
device.wait(Until.hasObject(By.pkg("com.android.settings")), 5_000)

// Back to your app
device.pressRecentApps()
device.findObject(By.desc("MyApp")).click()
```

**Where it's genuinely necessary:**

- **System permission dialogs** — the dialog belongs to the system package, so Espresso cannot touch it. This is the most common reason to reach for UI Automator.
- **Notifications** — opening the shade and tapping your notification.
- **Camera, gallery, share sheets, and file pickers** — flows that hand off to another app and come back.
- **Deep links from a browser.**
- **Testing behaviour after process death**, by killing and relaunching.

```kotlin
// Granting a runtime permission in a test
device.findObject(UiSelector().textContains("Allow")).click()
```

Note that for permissions specifically, `GrantPermissionRule` is simpler when you just want the permission granted rather than to test the dialog flow itself.

**You can combine both in one test** — Espresso for the parts inside your app, UI Automator for the excursions outside it — which is the usual approach for a realistic end-to-end scenario.

**The practical caveats:** tests are **device- and OS-version-dependent**, because system UI text and layout differ across versions and OEM skins (`"Allow"` vs `"While using the app"` vs a translated string). That makes UI Automator tests the most fragile in a suite. Use `By`/`UiSelector` matchers that tolerate variation, use `Until.hasObject` with timeouts rather than assuming immediacy, and keep this category of test small and focused on flows that genuinely cross the app boundary.

`uiautomatorviewer` (and the Layout Inspector) help you discover the selectors available on a given screen.

## 8. How do you test a ViewModel?
ViewModels should not contain Android framework dependencies, making them perfect for Local Unit Tests. You test them by calling their functions and asserting that their exposing `StateFlow` or `LiveData` holds the correct values.

**Two pieces of setup are required**, and missing either is the usual reason a first attempt fails:

1. **Replace `Dispatchers.Main`** — it doesn't exist on the JVM, and `viewModelScope` uses it.
2. **Inject fakes** for repositories and dispatchers, so results are deterministic.

```kotlin
class UserViewModelTest {
    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    private lateinit var repo: FakeUserRepository
    private lateinit var viewModel: UserViewModel

    @Before fun setUp() {
        repo = FakeUserRepository()
        viewModel = UserViewModel(repo)
    }

    @Test fun `emits Success when the repository returns a user`() = runTest {
        repo.users["1"] = User("1", "Alice")

        viewModel.load("1")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state is UiState.Success)
        assertEquals("Alice", (state as UiState.Success).user.name)
    }

    @Test fun `emits Error when the repository throws`() = runTest {
        repo.shouldThrow = true

        viewModel.load("1")
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is UiState.Error)
    }
}
```

**Testing intermediate states** requires `StandardTestDispatcher` (so nothing runs until you advance) plus **Turbine**, which is the standard way to assert on a sequence of emissions:

```kotlin
@Test fun `emits Loading before Success`() = runTest {
    viewModel.uiState.test {
        assertEquals(UiState.Loading, awaitItem())
        viewModel.load("1")
        assertTrue(awaitItem() is UiState.Success)
        cancelAndIgnoreRemainingEvents()
    }
}
```

**Writing a testable ViewModel in the first place** is most of the work, and worth stating as the real answer:

- **No `Context`, `View`, or Android imports.** If you need a string, expose a resource ID or a typed state and let the UI resolve it.
- **Inject every dependency** through the constructor, including dispatchers.
- **Expose one immutable state object** rather than several mutable flags — one assertion per behaviour instead of three.
- **Don't construct repositories inside the ViewModel.**

**For `LiveData` instead of `StateFlow`**, add `InstantTaskExecutorRule` (question 9) and observe with a test observer, since `LiveData` only emits to active observers.

**What *not* to test:** the framework. Don't assert that `viewModelScope` is cancelled in `onCleared` — that's Google's code. Test your logic: state transitions, error handling, and the mapping from domain data to UI state.

## 9. What is the `InstantTaskExecutorRule`?
A JUnit rule used when testing Architecture Components (like LiveData). It forces background tasks (like updating LiveData) to execute synchronously on the same thread, preventing test failures due to asynchronous background execution.

**What it actually replaces:** `LiveData` and other Architecture Components route work through an `ArchTaskExecutor`, which normally posts to the Android main thread. On the JVM there is no main thread, so `setValue` throws `IllegalStateException: Cannot invoke setValue on a background thread` or `postValue` silently never delivers. The rule swaps that executor for one that runs everything **synchronously on the calling thread**.

```kotlin
class UserViewModelTest {
    @get:Rule val instantExecutorRule = InstantTaskExecutorRule()

    @Test fun `user name updates`() {
        val vm = UserViewModel(FakeRepo())
        vm.load("1")
        assertEquals("Alice", vm.user.value?.name)      // works synchronously now
    }
}
```

```groovy
testImplementation "androidx.arch.core:core-testing:2.2.0"
```

**You still need an observer for transformations.** `LiveData` only emits to **active** observers, so `map`/`switchMap` chains produce nothing until something is observing. The standard helper is `observeForever`:

```kotlin
fun <T> LiveData<T>.getOrAwaitValue(timeout: Long = 2): T {
    var value: T? = null
    val latch = CountDownLatch(1)
    val observer = Observer<T> { value = it; latch.countDown() }
    observeForever(observer)
    try {
        if (!latch.await(timeout, TimeUnit.SECONDS)) error("LiveData never emitted")
    } finally { removeObserver(observer) }
    @Suppress("UNCHECKED_CAST") return value as T
}
```

**The distinction from coroutine test setup**, which is a common confusion: `InstantTaskExecutorRule` handles the **Architecture Components executor**; `Dispatchers.setMain` handles the **coroutine main dispatcher**. They're different mechanisms, and a ViewModel using `viewModelScope` *and* `LiveData` needs **both** rules.

**`CountingTaskExecutorRule`** is the related rule for instrumented tests, where you want to wait for background tasks rather than force them synchronous.

**The modern note worth adding:** this rule exists because of `LiveData`. With `StateFlow`, none of it is needed — a `MainDispatcherRule` and Turbine cover everything, and the tests run without any Android dependency at all. So in new Kotlin code, choosing `StateFlow` removes this entire category of test setup.

## 10. How do you test Coroutines?
Using the `kotlinx-coroutines-test` library. You wrap your test in `runTest`, which provides a virtual time controller, allowing `delay()` calls to skip forward instantly rather than actually waiting.

```kotlin
@Test
fun testDelay() = runTest {
    // This executes instantly, even if function has a 10-second delay
    val data = fetchNetworkData() 
}
```

**Virtual time is the central feature.** `runTest` installs a `TestCoroutineScheduler` whose clock advances on demand, so `delay(30_000)` completes immediately. A retry-with-backoff policy that would take two minutes in real time is tested in milliseconds — which makes it realistic to test timeout and retry logic at all.

**The two test dispatchers behave differently**, and picking the wrong one is the usual source of confusion:

- **`StandardTestDispatcher`** — queues coroutines; nothing runs until you call `advanceUntilIdle()`, `advanceTimeBy(n)` or `runCurrent()`. **Use it when you need to observe intermediate states.**
- **`UnconfinedTestDispatcher`** — starts coroutines eagerly, running until the first real suspension. **Use it when you only care about the final result**, since it removes the need to advance manually.

```kotlin
@Test fun `retries three times then fails`() = runTest {
    val api = FakeApi(failCount = 3)
    val result = RetryingClient(api).fetch()      // backoff: 1s, 2s, 4s

    advanceUntilIdle()                             // virtual time — instant
    assertEquals(4, api.callCount)
}
```

**Dispatchers must be injectable**, or you cannot control them:

```kotlin
class Repository(private val io: CoroutineDispatcher = Dispatchers.IO) {
    suspend fun load() = withContext(io) { api.fetch() }
}
// Test: Repository(StandardTestDispatcher(testScheduler))
```

Passing `testScheduler` keeps every dispatcher on one shared virtual clock — important when several are in play, or `advanceUntilIdle()` won't advance them together.

**For `viewModelScope`**, replace the main dispatcher with a rule:

```kotlin
class MainDispatcherRule(private val d: TestDispatcher = UnconfinedTestDispatcher()) : TestWatcher() {
    override fun starting(desc: Description) = Dispatchers.setMain(d)
    override fun finished(desc: Description) = Dispatchers.resetMain()
}
```

**Testing flows** is best done with **Turbine**, which makes assertions on emission sequences readable:

```kotlin
@Test fun `emits loading then success`() = runTest {
    viewModel.state.test {
        assertEquals(Loading, awaitItem())
        assertTrue(awaitItem() is Success)
        cancelAndIgnoreRemainingEvents()
    }
}
```

**A note on the old API:** `runBlockingTest`, `TestCoroutineDispatcher` and `TestCoroutineScope` are **deprecated** — they had surprising eager-execution semantics and poor failure reporting. `runTest` plus `TestDispatcher` is the current replacement, and mentioning the migration signals you've worked with both.

## 11. What is Gradle?
An advanced build automation tool used by Android Studio. It takes all your code, XML, resources, and dependencies, compiles them, and packages them into an APK or AAB.

**It's a general build system; the Android Gradle Plugin (AGP) is what makes it Android-aware.** Gradle itself knows about tasks, dependencies and incremental builds. AGP adds everything Android-specific — build types and flavours, resource merging, manifest merging, DEX compilation, R8, signing, and packaging into an APK/AAB.

**The three phases** are worth knowing because build-speed work targets a specific one:

1. **Initialisation** — determines which projects are in the build (`settings.gradle`).
2. **Configuration** — evaluates **every** `build.gradle`, applies plugins, and constructs the task graph. Runs even if you're building one module, which is why it's the target of the configuration cache.
3. **Execution** — runs the tasks that are actually needed, skipping any that are up to date.

**What an Android build actually does**, roughly in order: merge manifests → merge and compile resources (AAPT2) → generate `R` and `BuildConfig` → run annotation processors (KSP/kapt) → compile Kotlin/Java → run R8 (shrink, optimise, obfuscate, dex) → package → sign → zipalign.

```bash
./gradlew tasks                  # what can I run?
./gradlew assembleDebug          # build the debug APK
./gradlew bundleRelease          # build the release AAB
./gradlew testDebugUnitTest      # JVM tests
./gradlew :app:dependencies      # dependency tree — invaluable for conflicts
./gradlew --scan                 # where did the time go?
```

**Use the Gradle wrapper (`./gradlew`), never a locally-installed `gradle`.** The wrapper pins the exact version in `gradle-wrapper.properties`, so every developer and CI machine builds identically. This is the single most important reproducibility practice in a Gradle project.

**The things people complain about** — slow builds, opaque errors, a steep DSL — are real, and the modern answers are: the configuration cache and build cache for speed, KSP instead of kapt, version catalogs for dependency management, convention plugins instead of copy-pasted config, and `--scan` for diagnosis rather than guesswork.

## 12. What is `build.gradle.kts` vs `build.gradle`?
- `build.gradle`: Written in Groovy (the older standard).
- `build.gradle.kts`: Written in Kotlin DSL (the modern standard). It provides type safety, better IDE autocomplete, and allows using Kotlin for build logic.

**The concrete difference is that Kotlin DSL is compiled and typed**, so the IDE can actually help:

- **Autocompletion** that works, including for plugin extensions.
- **Compile-time errors** — a typo fails the build immediately with a clear message, rather than silently doing nothing. In Groovy, `minifyEnabled true` misspelled as `minifiyEnabled true` is just an unknown dynamic property.
- **Click-through navigation** into plugin source.
- **Safe refactoring**, since the IDE understands the references.

```kotlin
// build.gradle.kts
plugins {
    id("com.android.application")
    kotlin("android")
}

android {
    namespace = "com.example.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.app"
        minSdk = 24
        targetSdk = 35
    }

    buildTypes {
        release {
            isMinifyEnabled = true          // note: `is` prefix for booleans
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
}
```

**Syntax differences that trip people up when converting:** `=` for assignment (Groovy allows space-separated), quotes must be double, boolean properties often take an `is` prefix (`isMinifyEnabled`), and methods need parentheses.

**The trade-off to state honestly:** Kotlin DSL has **slower first/clean builds**, because the scripts must be compiled. Incremental builds are comparable, and the gap has narrowed considerably, but it's a real cost on a large multi-module project and the main argument people make for staying on Groovy.

**Migration is incremental** — Gradle accepts both in the same project, so you can convert module by module rather than in one risky change.

**The recommendation:** Kotlin DSL for new projects (it's the Android Studio default now, and the documentation has largely followed), and for existing projects migrate when there's a reason rather than as a goal in itself. Pair it with **version catalogs**, which give the same type-safe treatment to dependencies and are where most of the day-to-day ergonomic benefit actually comes from.

## 13. What is the difference between `compileSdk`, `minSdk`, and `targetSdk`?
- **minSdk**: The lowest Android version your app can run on.
- **compileSdk**: The Android API version used to compile your code (usually the latest).
- **targetSdk**: The Android version you have explicitly tested your app against. It tells the OS which backward-compatibility behaviors to enable.

**`targetSdk` is the subtle one, and it's what this question is really testing.** It is the platform's **compatibility switch**. Android keeps old behaviour for apps that haven't declared readiness for a new version: if your `targetSdk` is 29, scoped storage enforcement, notification permission requirements, and exported-component rules behave as they did on API 29 even when running on Android 14. Raise `targetSdk` and you opt into *all* the new behaviours at once.

So raising `targetSdk` is never a trivial bump — it's a statement that you've tested against every behaviour change in between, and it's a common source of production incidents when done carelessly.

**Google Play enforces a floor.** New apps and updates must target a recent API level (currently within about a year of the latest release), or they cannot be published. So you cannot simply stay on an old target indefinitely.

```groovy
android {
    compileSdk = 35        // compile against the newest APIs
    defaultConfig {
        minSdk = 24        // oldest supported device
        targetSdk = 35     // behaviours you've tested and opted into
    }
}
```

**The relationships:** `minSdk ≤ targetSdk ≤ compileSdk`. `compileSdk` should essentially always be the latest stable — it affects only compilation, not runtime behaviour, and it's what lets you *reference* new APIs at all.

**Using a new API above `minSdk`** requires a version guard, which lint enforces:

```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    requestPermission(POST_NOTIFICATIONS)
}
// or annotate: @RequiresApi(Build.VERSION_CODES.TIRAMISU)
```

**Choosing `minSdk` is a business trade-off**, not a technical one: every version you drop support for removes users but also removes compatibility code, workarounds, and testing surface. Android Studio's New Project dialog shows the cumulative device percentage for each level, and `minSdk = 24` now covers roughly 97%+ of active devices — which is why it's a common default.

**Also relevant:** AndroidX and desugaring reduce the pain of a low `minSdk` considerably, by backporting APIs and `java.time` to older releases.

## 14. What are Build Types and Product Flavors?
- **Build Types**: Used for the development lifecycle (e.g., `debug`, `release`).
- **Product Flavors**: Used to create different versions of the app from the same codebase (e.g., `free`, `premium`). Combining them creates Build Variants (e.g., `freeDebug`).

**The clean distinction: build types control *how* you build; flavours control *what* you build.** A build type changes debuggability, shrinking and signing — the same app, built differently. A flavour changes the app itself — different features, branding, or backend.

```groovy
android {
    buildTypes {
        debug   { applicationIdSuffix ".debug"; debuggable true }
        release { minifyEnabled true; signingConfig signingConfigs.release }
        staging { initWith release; matchingFallbacks = ['release'] }   // a third type
    }

    flavorDimensions "tier", "env"
    productFlavors {
        free    { dimension "tier"; applicationIdSuffix ".free" }
        premium { dimension "tier" }
        dev     { dimension "env"; buildConfigField "String", "API", '"https://dev/"' }
        prod    { dimension "env"; buildConfigField "String", "API", '"https://api/"' }
    }
}
// 2 tiers × 2 envs × 3 types = 12 variants
```

**Source-set merging is what makes flavours genuinely powerful**, and it's the part most answers omit. Each variant has its own source set, merged with `main`:

```
src/main/java/        — shared
src/free/java/        — free-only implementation of a shared interface
src/premium/java/     — premium-only implementation
src/debug/res/        — debug-only resources
src/freeDebug/java/   — most specific wins
```

That lets you supply a completely different class per flavour with **no runtime branching** — a real analytics implementation in `prod` and a no-op in `dev`, or a stub billing client in `free`. Files with the same path in `main` and a flavour conflict; the flavour must be the only one providing it.

**`buildConfigField` and `resValue`** generate per-variant constants and resources:

```groovy
debug { resValue "string", "app_name", "MyApp DEBUG" }
```

**`applicationIdSuffix` lets variants coexist on one device**, so a tester can have production and staging installed side by side — practically very useful.

**The caution:** variant count multiplies, and each is something CI may need to build and someone may need to test. Keep dimensions minimal, use `variantFilter` to exclude impossible combinations, and prefer **runtime feature flags** when the difference is only a toggle. Flavours earn their complexity when code must genuinely differ at compile time — white-labelling, a different billing provider, region-specific builds.

## 15. What is CI/CD?
Continuous Integration / Continuous Deployment. An automated pipeline (using tools like GitHub Actions, Jenkins, or Bitrise) that automatically runs all your tests, builds the APK, and uploads it to the Play Store every time you push code.

**The two halves are separate ideas**, and conflating them is common:

- **Continuous Integration** — every commit is merged into the shared branch frequently and automatically verified (build + tests + lint). The purpose is to catch integration problems within minutes rather than at the end of a sprint.
- **Continuous Delivery** — every passing build is *releasable*, with the final push being a manual decision. **Continuous Deployment** goes further and ships automatically. For mobile, Delivery is the realistic goal: store review and staged rollouts mean you rarely want fully automatic production deploys.

**A typical Android pipeline, ordered fastest-first** so failures surface early:

```yaml
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '17' }
      - uses: gradle/actions/setup-gradle@v4      # dependency + build cache
      - run: ./gradlew detekt lintDebug           # seconds
      - run: ./gradlew testDebugUnitTest          # ~1 minute
      - run: ./gradlew assembleDebug
```

**The Android-specific hard part is secrets.** Keystores, signing passwords, `google-services.json` and the Play service-account JSON cannot live in the repo:

```yaml
- run: echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > app/release.jks
- run: ./gradlew bundleRelease
  env:
    KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
```

Base64-encode the keystore into a secret, decode at build time, never echo the values.

**Instrumented tests in CI** need a device: an emulator with KVM (slow, flake-prone on shared runners) or **Firebase Test Lab** / Gradle Managed Devices (more reliable, real hardware coverage). Many teams run unit tests on every PR and instrumented tests nightly, to keep PR feedback under five minutes.

**Deployment** usually goes through **Fastlane** or `gradle-play-publisher` to the **internal** track automatically, with promotion to production as a manual gate plus a **staged rollout** (1% → 5% → 20% → 100%) watched against Android vitals and Crashlytics.

**What makes a pipeline good rather than merely present:** build caching so CI isn't rebuilding from scratch, **required status checks** so a red build blocks merge, automatic version-code increments, and fast feedback — a pipeline that takes 40 minutes is one developers learn to ignore.

## 16. What is Fastlane?
An open-source platform aimed at simplifying Android and iOS deployment. It automates tedious tasks like generating screenshots, dealing with provisioning profiles, and releasing the application.

**It's a Ruby-based task runner with pre-built "actions"** for the fiddly parts of mobile release. You describe a release process once in a `Fastfile`, and everyone — and CI — runs the same thing.

```ruby
# fastlane/Fastfile
default_platform(:android)

platform :android do
  desc "Build and ship to the internal track"
  lane :internal do
    gradle(task: "clean bundleRelease")
    upload_to_play_store(
      track: "internal",
      aab: "app/build/outputs/bundle/release/app-release.aab",
      skip_upload_metadata: true
    )
    slack(message: "New internal build is up 🎉")
  end

  lane :promote do
    upload_to_play_store(
      track: "internal",
      track_promote_to: "production",
      rollout: "0.1"                      # 10% staged rollout
    )
  end
end
```

**The Android actions that do the most work:**

- **`supply`** (`upload_to_play_store`) — uploads AABs, metadata, screenshots and changelogs to any track, and promotes between tracks with staged rollout percentages. Doing this by hand through the Console is slow and error-prone.
- **`gradle`** — runs Gradle tasks.
- **`screengrab`** — captures localised screenshots across devices and locales automatically, which is otherwise a genuinely painful manual job for a store listing in twelve languages.
- **`firebase_app_distribution`** — distributes builds to QA testers.
- **`match`** — iOS-only (certificate management), so not relevant to Android despite often being mentioned.

**Setup requires a Google Play service account** with release permissions, whose JSON key you store as a CI secret — `fastlane run validate_play_store_json_key` verifies it.

**The honest assessment:** Fastlane's value is highest when you release often, support many locales, or build both iOS and Android (one tool, one mental model). For a small Android-only app with occasional releases, the `gradle-play-publisher` plugin does the publishing part with no Ruby toolchain, and some teams prefer calling the Play Developer API directly.

The real argument for it, though, is **repeatability**: a release process encoded in a file is reviewable, versioned, and identical whether it runs on CI or on a developer's machine — which is exactly what you want from the step with the highest cost of mistakes.

## 17. What is Firebase Crashlytics?
A lightweight, real-time crash reporter. It tracks, prioritizes, and fixes stability issues that erode your app quality in production by providing highly detailed crash stack traces directly from users' devices.

**What it adds over Play Console's built-in crash reporting:** near-real-time delivery (minutes, not hours), intelligent **grouping** of crashes into issues, the ability to attach **custom keys and logs** for context, non-fatal exception reporting, alerting, and **velocity alerts** when a new crash spikes after a release.

**Grouping is the feature that matters most at scale.** Ten thousand raw crash reports are unusable; grouped into forty issues ranked by user impact, they're a work queue.

```kotlin
// Context that makes a crash diagnosable
FirebaseCrashlytics.getInstance().apply {
    setUserId(user.anonymousId)            // never PII
    setCustomKey("screen", "checkout")
    setCustomKey("cart_items", cart.size)
    log("Started payment flow")            // breadcrumbs, included in the report
}

// Report a handled exception — the error paths you recovered from
try { riskyOperation() }
catch (e: IOException) {
    FirebaseCrashlytics.getInstance().recordException(e)
    showOfflineUi()
}
```

**Non-fatal reporting is under-used** — tracking caught exceptions reveals the errors users hit that never crash the app, which is often where the real experience problems are.

**You must upload the mapping file**, or every release stack trace is unreadable. The Gradle plugin does it automatically, but confirm it's enabled:

```groovy
firebaseCrashlytics {
    mappingFileUploadEnabled true
    nativeSymbolUploadEnabled true     // if you ship NDK code
}
```

**Key metrics it reports:** **crash-free users** (the headline, usually targeted above 99.5%) and **crash-free sessions**. Both matter because one user crashing repeatedly skews raw counts.

**Practical caveats:**

- **Disable collection in debug builds**, or your own development crashes pollute production data.
- **Never log PII** in custom keys or breadcrumbs — it's a privacy and compliance issue, and user IDs should be pseudonymous.
- **ANRs are reported too** on recent versions, but Play Console's vitals remain the authoritative ANR source since Google measures them system-side.
- **It's a Google/Firebase dependency** — Sentry and Bugsnag are the usual alternatives, with Sentry notable for supporting self-hosting.

**The release workflow** this enables: ship to a staged rollout, watch crash-free users at each step, and halt the rollout if the new version regresses. That feedback loop is what makes staged rollouts worth doing at all.

## 18. What is the Android Profiler?
A set of tools integrated into Android Studio that provide real-time data about how your app utilizes CPU, Memory, Network, and Battery, helping you find bottlenecks and leaks.

**The four profilers, and the question each answers:**

- **CPU** — "what is the main thread spending time on?" Its **System Trace** mode is the most useful for jank, showing frame-by-frame rendering against the budget. Other modes: *Sample Java/Kotlin* (low overhead, finds hot paths) and *Trace Java/Kotlin* (complete but so high-overhead it **distorts the result** — a classic trap).
- **Memory** — "what's using memory, and what's leaking?" Three jobs: a live timeline, **allocation tracking** (which call sites allocate during a scroll), and a **heap dump** showing every live object with shallow and retained size.
- **Network** — request timing, sizes and headers. Useful for spotting duplicate requests and missing caching. Note it only sees OkHttp/`HttpURLConnection` traffic.
- **Energy** — wake locks, alarms, jobs and location requests, for battery investigation.

**The leak-hunting recipe** worth knowing by heart:

```
1. Open the suspect screen
2. Navigate away (it should be destroyed)
3. Repeat 3–5 times, or rotate repeatedly
4. Force GC (the bin icon)
5. Capture a heap dump
6. Filter by the Activity's class name
→ More than one instance = leak; "References" shows the path to the GC root
```

**Sort heap dumps by *retained* size, not shallow size.** An Activity's shallow size is a few hundred bytes; its retained size is the whole view tree. The retained number is the one that tells you what you'd actually get back.

**Two cautions that separate useful profiling from misleading profiling:**

1. **Profile a release-like build.** Debug builds are unoptimised, skip R8, and have debugging overhead — timings from them do not reflect what users experience. Use a `profileable` build.
2. **Profile on a low-end device.** The devices your users struggle on are the ones worth measuring; everything is smooth on a flagship.

**For production rather than local measurement**, the complements are **JankStats** (real-device frame data), **Macrobenchmark** (reproducible, CI-gated startup and scroll metrics), **Firebase Performance Monitoring**, and Play Console **Android vitals**. The profiler tells you *why*; those tell you *where* and *how often*.

## 19. What is the Layout Inspector?
An Android Studio tool that allows you to inspect the View hierarchy (or Compose tree) of your app in real-time as it runs on the device. It shows bounds, margins, padding, and attributes in 3D.

**What it gives you**, which is more than a tree view:

- **The live hierarchy**, updating as the app runs — no screenshot/export cycle.
- **A 3D exploded view**, which makes overlapping views and unexpected nesting instantly obvious.
- **Per-node attributes** with their *resolved* values and the source that set them, so you can see which style or theme actually won.
- **Overlay comparison** against a design mockup image, for pixel-checking against a spec.

**For Compose it does something different and more valuable: recomposition counts.** It shows, per composable, how many times it has recomposed and how many times it was skipped. A component recomposing hundreds of times a second is the Compose equivalent of a layout problem, and this is the fastest way to find it:

```
UserList          recompositions: 2    skips: 148
  UserRow         recompositions: 312  skips: 0      ← unstable parameter
    Avatar        recompositions: 312  skips: 0
```

A high count with zero skips almost always means an **unstable parameter** — a `List` rather than an `ImmutableList`, a lambda recreated on each call, or a non-`@Stable` data class. That diagnostic chain is a strong thing to be able to describe.

**Common uses:** working out why a view isn't visible (zero height, clipped by a parent, behind something else), finding unnecessary nesting before flattening a layout, debugging constraint behaviour, and checking which theme attribute produced a colour.

**Related tools worth naming alongside it:**

- **Layout Validation** — previews a layout across screen sizes, densities, locales and font scales at once.
- **`dumpsys activity top`** — the command-line equivalent, useful when Studio isn't available.
- **`adb shell uiautomator dump`** — the accessibility view of the tree, which is what UI Automator and screen readers see.
- **Live Edit / Compose Preview** — faster for iterating on appearance; the inspector is for diagnosing a running app.

**A practical note:** the Layout Inspector has overhead, especially with Compose recomposition counts enabled, so use it for diagnosis and turn it off before measuring performance — otherwise you're profiling the inspector.

## 20. What is a Memory Heap Dump?
A snapshot of all the objects in the app's memory at a specific point in time. Developers trigger this when investigating memory leaks to see exactly which objects are refusing to die and what references are keeping them alive.

**What's in it:** every live object, its class, its field values, the references between objects, and the GC roots. It's effectively a complete graph of your heap at that instant — which is why it answers both "what is using memory?" and "why is this object still alive?"

**Capturing one:**

```kotlin
Debug.dumpHprofData("/sdcard/dump.hprof")     // programmatically
```

```bash
adb shell am dumpheap com.example /data/local/tmp/dump.hprof
adb pull /data/local/tmp/dump.hprof
```

Or, most often, the Memory Profiler's "Dump Java heap" button.

**The two numbers to read**, and getting this right is what makes a dump useful:

- **Shallow size** — the object's own fields only.
- **Retained size** — everything that would be freed if this object were collected: itself plus everything reachable **exclusively** through it.

Sort by **retained**. An `Activity`'s shallow size is trivial; its retained size is the entire view hierarchy and its bitmaps. Sorting by shallow size just shows you `byte[]` and `String`, which tells you nothing actionable.

**The leak workflow:**

```
1. Exercise the screen, then leave it (repeat 3–5 times)
2. Force GC
3. Capture the dump
4. Filter by your Activity/Fragment class
5. Count instances — more than one (or any, after destruction) = leak
6. Open "References" → find the shortest path from a GC root
7. The last link before the leaked object is where to fix
```

**A comparison dump is the sharper technique:** take one dump, perform the suspect action, take a second, and diff them. The profiler can show objects allocated between the two, which isolates the specific action responsible far faster than reading one dump in isolation.

**Related concepts** that often come up together: a **GC root** (static field, thread stack, JNI reference) is where reachability begins; a **dominator** is an object through which all paths to another must pass, which is how retained size is computed; and **LeakCanary** automates exactly this analysis on-device using its own Shark analyser.

**Practical caveats:** dumping **freezes the app** for several seconds and produces a large file; always **force GC first**, or the dump is full of garbage not yet collected and the picture is misleading; and dumps from debug builds include objects that R8 would have removed in release.

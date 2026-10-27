---
title: "Modern UI & Jetpack Compose"
description: "Declarative UI, State management, Modifiers, and Recomposition."
---

## 1. What is Jetpack Compose?
Jetpack Compose is Android's modern toolkit for building native UI. It simplifies and accelerates UI development using a declarative, functional approach rather than the traditional XML imperative approach.

```kotlin
@Composable
fun Greeting(name: String) {
    Text(text = "Hello $name!")
}
```

**What it actually replaces.** Compose is not a wrapper over the View system — it is a complete replacement for it. There is no `View`, no `findViewById`, no XML layout, and no inflation. A `Composable` emits into a tree of lightweight nodes that Compose measures, lays out, and draws onto a single `AndroidComposeView` host. That's why it can be shipped as a library and still get new features on old Android versions: it's unbundled from the platform.

**Why it exists.** The View system is 15+ years old and carries the costs of its age: deep inheritance hierarchies where customising means subclassing, state duplicated between your data and the widgets holding it, and view inflation that must be done on the main thread. Compose replaces inheritance with **composition** (small functions calling smaller functions) and makes the UI a pure function of state, so the two can't drift apart.

**The practical wins:** far less code for the same screen, no more synchronisation bugs between model and widget, previews and live edit without deploying, trivially reusable components, and powerful animation APIs.

**What to be honest about in an interview:** it has a learning curve around recomposition and stability; build-time cost from the compiler plugin; and some ecosystem gaps (maps, camera, video) still require interop. That interop runs both directions — `AndroidView` embeds a View inside Compose, and `ComposeView` embeds Compose inside an XML layout, which is how incremental migration works.

Compose is also multiplatform in spirit — the same model underpins Compose for Desktop, Web, and iOS via Compose Multiplatform.

## 2. What is Declarative UI vs Imperative UI?
- **Imperative (XML)**: You manually mutate the UI state (e.g., `textView.setText("Hello")`, `button.setVisibility(GONE)`).
- **Declarative (Compose)**: You describe what the UI should look like for a given state. When the state changes, the UI automatically regenerates (recomposes) to reflect it.

**The difference is who is responsible for transitions.** Imperatively, *you* must write the code for every possible change — and crucially, for every *undo* of a change. Declaratively, you describe only the destination; the framework works out the difference.

```kotlin
// Imperative: you must handle every transition, in both directions
fun render(state: UiState) {
    if (state.isLoading) {
        progressBar.visibility = View.VISIBLE
        errorText.visibility = View.GONE          // forget this line → stale error
        recyclerView.visibility = View.GONE
    } else if (state.error != null) {
        progressBar.visibility = View.GONE
        errorText.visibility = View.VISIBLE
        errorText.text = state.error              // forget this → stale message
        recyclerView.visibility = View.GONE
    }
    // ...and every other combination, every time
}

// Declarative: describe the result, not the steps
@Composable
fun Screen(state: UiState) {
    when {
        state.isLoading -> CircularProgressIndicator()
        state.error != null -> ErrorMessage(state.error)
        else -> ItemList(state.items)
    }
}
```

**The class of bug this eliminates** is the most valuable thing to say here: in the imperative version the UI holds its *own* copy of the state (the `VISIBLE` flag, the text in the `TextView`), which can disagree with your model. Every "why is the old error still showing?" bug is that divergence. In the declarative version there is only one source of truth, so divergence is structurally impossible.

**The cost** is a different mental model. You can no longer "reach into" the UI and change one thing; you change state and let the UI follow. And since a composable can re-execute at any time, it must be **idempotent and side-effect-free** — which is the root of most Compose mistakes by newcomers.

The same shift happened across the industry: React, SwiftUI, and Flutter are all the same idea, which is why these concepts transfer.

## 3. What is a `@Composable` function?
A function annotated with `@Composable` tells the Compose compiler that this function is meant to convert data into UI. They can only be called from other composable functions.

```kotlin
@Composable
fun UserProfile(user: User) {
    Column {
        Text(user.name)
        Text(user.bio)
    }
}
```

**What the annotation really does.** It isn't metadata — it changes the function's *type and calling convention*. The Compose compiler plugin rewrites every composable to take a hidden `Composer` parameter and inserts "group" markers around the body. Those groups give the runtime positional identity: they're how it knows that *this* `Text` on *this* pass is the same `Text` as last time, so it can update it rather than recreate it.

That hidden parameter is also why composables can only be called from other composables — the `Composer` has to come from somewhere.

**The rules that follow, and the reasoning behind each:**

- **Must be idempotent.** Calling it twice with the same inputs must produce the same UI. The runtime re-executes freely, in any order, and may skip calls entirely.
- **No side effects in the body.** No network calls, no writing to a database, no mutating external variables. Recomposition can happen many times a second — a `viewModel.loadData()` sitting in a composable body becomes an accidental DDoS on your own backend. Use the effect APIs (questions 13–16).
- **Returns `Unit`, emits UI.** Composables don't build and return widgets; they *emit* into the tree. (Functions returning a value, like `rememberScrollState()`, are a separate convention.)
- **Execution order is not guaranteed**, and composables may run **in parallel** on multiple threads. Never rely on sibling A running before sibling B.
- **Name with a capital letter** when it emits UI — a convention the tooling and lint rules depend on.

**A composable can be fast because of skipping.** If all its parameters are *stable* and unchanged, Compose skips the call entirely. This is why parameter types matter so much:

```kotlin
// Unstable: a List could be a mutable ArrayList, so Compose can't prove equality
@Composable fun Items(items: List<Item>) { /* never skipped */ }

// Stable: immutable collection → skippable
@Composable fun Items(items: ImmutableList<Item>) { /* skipped when unchanged */ }
```

Marking your data classes `@Immutable`/`@Stable`, or using `kotlinx.collections.immutable`, is the usual fix when the layout inspector shows constant recomposition.

## 4. What is Recomposition?
When the state (data) that a Composable function reads changes, Compose re-executes that function with the new data. Compose intelligently skips recomposing functions whose inputs have not changed (Smart Recomposition).

```kotlin
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) } // State triggers recomposition
    Button(onClick = { count++ }) {
        Text("Count: $count") // Only this Button recomposes when count changes
    }
}
```

**How Compose knows what to re-run.** During composition, every read of a `State` object is *recorded* against the enclosing restartable scope — this is the snapshot system's automatic dependency tracking. When that state is written, Compose invalidates exactly the scopes that read it and re-executes only those on the next frame. You never declare dependencies; reading is subscribing.

**This leads to the single most useful optimisation technique: defer the read.** Push state reads as far down the tree as you can, so the invalidated scope is as small as possible.

```kotlin
// Whole layout recomposes on every scroll pixel
@Composable
fun Header(scroll: ScrollState) {
    Box(Modifier.alpha(scroll.value / 100f)) { ExpensiveContent() }
}

// Only the draw phase re-runs — the lambda defers the read
@Composable
fun Header(scroll: ScrollState) {
    Box(Modifier.graphicsLayer { alpha = scroll.value / 100f }) { ExpensiveContent() }
}
```

**The three phases** are worth knowing, because the goal is often to skip the earlier ones: **composition** (what to show) → **layout** (where it goes) → **drawing** (rendering). A `Modifier.offset { }` with a lambda skips composition and only redoes layout; `graphicsLayer` skips to drawing alone.

**What recomposition is *not*:** it's not a full redraw of your screen, and it's not guaranteed to run your function. Compose may **skip** a call (all parameters stable and equal), **cancel** a recomposition mid-flight if state changes again, or run composables **out of order and in parallel**.

**The practical consequences — the classic bugs:**

- **Never mutate external state from a composable body.** `var count = 0; count++` inside a composable produces nonsense, because the function runs an unpredictable number of times.
- **Never do expensive work unguarded.** Wrap derived computation in `remember(key)` so it recalculates only when the key changes:

```kotlin
val sorted = remember(items) { items.sortedBy { it.name } }    // not every frame
```

- Use **`derivedStateOf`** when a frequently-changing state maps to a rarely-changing result — e.g. `scroll.value > 0` changes value on every pixel but the boolean flips only once:

```kotlin
val showButton by remember { derivedStateOf { listState.firstVisibleItemIndex > 0 } }
```

You can see all of this live with the **Layout Inspector's recomposition counts**, which is how you find the component re-running 200 times a second.

## 5. What is `remember` in Compose?
`remember` caches the value produced by a calculation during initial composition. During recomposition, it returns the cached value, preventing the value from being reset on every recomposition.

```kotlin
@Composable
fun RandomNumber() {
    // Generates once, survives recomposition
    val num = remember { (0..100).random() } 
    Text("Number: $num")
}
```

**It stores values in the composition itself**, keyed by the call site's position in the tree (the "slot table"). On first composition the lambda runs and the result is stored; on every later recomposition the lambda is skipped and the stored value returned. When the composable leaves the composition, the value is discarded.

**Keys control invalidation.** `remember(key1, key2) { }` re-runs the calculation whenever any key changes — which is how you cache derived values correctly:

```kotlin
// Recomputed on every recomposition — wasteful for a large list
val sorted = items.sortedBy { it.name }

// Recomputed only when `items` actually changes
val sorted = remember(items) { items.sortedBy { it.name } }
```

**`remember` and `mutableStateOf` do different jobs** and are constantly confused. This is the pairing to internalise:

- `mutableStateOf(0)` alone — observable, but **recreated on every recomposition**, so it resets to 0 forever and the UI never updates.
- `remember { 0 }` alone — persists, but **not observable**, so changing it triggers no recomposition.
- `remember { mutableStateOf(0) }` — persists *and* notifies. This is why you almost always see them together.

**What it does not survive:** configuration changes, process death, or the composable being removed from the composition (including a `LazyColumn` item scrolling far off screen). For those, use `rememberSaveable` or a `ViewModel`.

**A caution on position-based identity.** Because the key is the call site, moving a `remember` between branches of an `if` can lose the value. In a loop, give items explicit identity with the `key()` composable so state follows the right item when the list reorders:

```kotlin
items.forEach { item ->
    key(item.id) { ItemRow(item) }     // state follows the item, not the index
}
```

The ecosystem follows this convention widely: `rememberCoroutineScope()`, `rememberNavController()`, `rememberScrollState()`, `rememberLazyListState()` are all `remember` underneath.

## 6. What is `mutableStateOf`?
It creates an observable `MutableState<T>`. When the value changes, Compose automatically schedules a recomposition for any Composable function that reads this state.

```kotlin
// Idiomatic usage combining remember and mutableStateOf
var text by remember { mutableStateOf("") }
TextField(value = text, onValueChange = { text = it })
```

**The mechanism is the snapshot system**, Compose's MVCC-style state container. `MutableState` has an observable `value` property: every **read** registers the current scope as a dependency, and every **write** notifies those dependents. That's the whole subscription model — there's no `observe()` call anywhere.

**The `by` delegate** is pure syntax sugar: `var text by remember { mutableStateOf("") }` lets you write `text` instead of `text.value`. It requires importing `getValue`/`setValue`. The alternatives are equivalent:

```kotlin
val state = remember { mutableStateOf("") }   // state.value
var text by remember { mutableStateOf("") }   // text
val (text, setText) = remember { mutableStateOf("") }   // destructured
```

**The trap that catches everyone: mutating a collection in place doesn't work.**

```kotlin
// BROKEN — same list instance, so the setter never fires
var items by remember { mutableStateOf(mutableListOf<String>()) }
items.add("new")                  // no recomposition

// Fix 1: replace the instance (equality changes → notification)
var items by remember { mutableStateOf(listOf<String>()) }
items = items + "new"

// Fix 2: use an observable collection
val items = remember { mutableStateListOf<String>() }
items.add("new")                  // works — the list itself is observable
```

`mutableStateListOf` and `mutableStateMapOf` exist precisely for this.

**Structural equality controls the notification.** By default, writing a value `equals` to the current one triggers *nothing* — a free optimisation, and the reason `data class` models work well here. You can change the policy with `mutableStateOf(v, referentialEqualityPolicy())` or `neverEqualPolicy()` for the rare cases where you need every write to notify.

**Snapshots also make state thread-safe.** Each recomposition reads from a consistent snapshot, so you never see a half-updated object. Writes from a background thread are visible once the snapshot is applied — which is how Compose can safely recompose in parallel.

**Where to put state:** transient UI state (expanded/collapsed, text being typed) can live in the composable. Anything that must survive rotation belongs in `rememberSaveable` or a `ViewModel` — see questions 7 and 17.

## 7. What is the difference between `remember` and `rememberSaveable`?
- `remember`: Survives recomposition, but is destroyed across configuration changes (like screen rotation).
- `rememberSaveable`: Survives recomposition AND configuration changes by saving the data in a `Bundle`.

```kotlin
// Survives screen rotation
var text by rememberSaveable { mutableStateOf("") }
```

**Three tiers of survival** is the clearest way to hold this:

- **`remember`** — survives recomposition only. Lost on rotation and on process death.
- **`rememberSaveable`** — survives recomposition, configuration changes, **and process death**. Backed by the same saved-instance-state `Bundle` as the View system.
- **`ViewModel`** — survives configuration changes and holds large objects cheaply, but is **destroyed by process death** (unless paired with `SavedStateHandle`).

**The constraint on `rememberSaveable`:** the value must go into a `Bundle`, so it must be `Parcelable`, `Serializable`, or a primitive. Anything else needs a custom saver, and the bundle counts against the Binder transaction limit — so keep it small.

```kotlin
data class City(val name: String, val country: String)

val CitySaver = listSaver<City, Any>(
    save = { listOf(it.name, it.country) },
    restore = { City(it[0] as String, it[1] as String) }
)

var city by rememberSaveable(stateSaver = autoSaverOrCustom) { mutableStateOf(City("Paris", "FR")) }
// or: rememberSaveable(saver = CitySaver) { mutableStateOf(...) }
```

`@Parcelize` on a data class is usually the shortest path and avoids writing a saver at all.

**How to choose**, which is the real question being asked:

- **`remember`** for state that is cheap to recreate or genuinely transient — an animation value, a derived calculation, a scroll state that doesn't matter.
- **`rememberSaveable`** for small UI state the user would be annoyed to lose: typed text, which tab is selected, an expanded section, a form's progress.
- **`ViewModel`** for screen-level state and anything involving business logic, network results, or data large enough that parcelling it would be wasteful.

The common mistake is reaching for `rememberSaveable` to store a whole screen's data. That belongs in a `ViewModel` with `SavedStateHandle` — keep only the small, user-visible bits in the bundle.

## 8. What are Modifiers in Compose?
Modifiers allow you to decorate or augment a composable (e.g., change size, add padding, background, or click listeners). Order matters! Modifiers are applied sequentially.

```kotlin
Text(
    text = "Hello",
    modifier = Modifier
        .background(Color.Blue) // Applied first
        .padding(16.dp)         // Applied second (padding inside blue background)
        .clickable { /* click */ }
)
```

**A `Modifier` is an ordered, immutable linked list of elements.** Each `.something()` call returns a *new* chain rather than mutating one, and the order is preserved through measurement, drawing, and input handling — which is why it behaves so differently from XML attributes, where order is meaningless.

**The canonical demonstration of order**, worth being able to produce on demand:

```kotlin
// Blue area includes the padding — padding is INSIDE the background
Modifier.background(Color.Blue).padding(16.dp)

// Blue area excludes the padding — padding pushes the background inward
Modifier.padding(16.dp).background(Color.Blue)
```

The rule: **modifiers wrap left-to-right from the outside in.** The first one in the chain is the outermost. The same logic explains clickable ripple bounds — `.clickable().padding()` makes the whole padded area tappable, while `.padding().clickable()` restricts the touch target to the content.

**Three conventions that come up in review:**

1. **Always accept a `modifier: Modifier = Modifier` parameter**, place it first among optional parameters, and apply it to your root element. Without it, callers cannot size or position your component — this is the single most important API-design rule for reusable composables.
2. **Never apply a caller-provided modifier to a child**; it belongs on the root, or sizing from the outside behaves unpredictably.
3. **Hoist expensive chains with `remember`** if they're built conditionally in a hot path.

```kotlin
@Composable
fun UserCard(user: User, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth().padding(8.dp)) { /* ... */ }
    //  ^ caller's modifier first, then our defaults
}
```

**Useful categories to know:** size (`size`, `fillMaxWidth`, `weight`, `aspectRatio`), spacing (`padding`, `offset`), drawing (`background`, `border`, `clip`, `alpha`, `graphicsLayer`), interaction (`clickable`, `draggable`, `scrollable`), and semantics (`semantics`, `testTag`, `contentDescription`) — which is how accessibility and UI tests find your nodes.

**Performance note:** prefer the lambda-taking variants (`Modifier.offset { }`, `graphicsLayer { }`) for values that change every frame. They defer the state read to the layout or draw phase, skipping recomposition entirely.

## 9. How does Layout work in Compose?
The core layout components are `Column` (vertical), `Row` (horizontal), and `Box` (stacking elements on top of each other, like FrameLayout).

```kotlin
Row(
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.CenterVertically
) {
    Text("Left")
    Text("Right")
}
```

**The underlying model: single-pass measurement.** Each parent passes `Constraints` (min/max width and height) down; each child measures itself once and reports a size back; the parent then places the children. Unlike the View system, a child **cannot be measured twice** — this is enforced, and it's why Compose layout is O(n) rather than potentially exponential for deep nested-weight hierarchies.

That constraint has a practical consequence: there is no `RelativeLayout`-style "measure, then re-measure based on a sibling." When you genuinely need to know a child's size before deciding, you use `SubcomposeLayout` (what `BoxWithConstraints` and `LazyColumn` are built on), and you pay for it.

**Arrangement vs. Alignment**, the pair people mix up:

- **Arrangement** — along the *main* axis (vertical for `Column`, horizontal for `Row`): `SpaceBetween`, `SpaceAround`, `SpaceEvenly`, `spacedBy(8.dp)`.
- **Alignment** — along the *cross* axis: `CenterVertically` in a `Row`, `CenterHorizontally` in a `Column`.

`Arrangement.spacedBy()` is strictly better than putting padding on each child — it doesn't add trailing space after the last item.

**`weight` distributes leftover space**, exactly like `layout_weight`, and children with a weight are measured *after* the unweighted ones:

```kotlin
Row {
    Text("Fixed")
    Spacer(Modifier.weight(1f))       // pushes the next item to the end
    Text("End")
}
```

**Beyond the big three:**

- **`Box`** — stacks children; `Modifier.align()` positions each one, and the last child draws on top.
- **`ConstraintLayout`** — for flat, complex layouts with interdependent positioning. In Compose, nesting is cheap, so you need it far less often than in XML.
- **`BoxWithConstraints`** — gives you `maxWidth`/`maxHeight` to make responsive decisions, at the cost of subcomposition.
- **`Spacer`** — explicit empty space.
- **Custom `Layout`** — when none of the above fits, the `Layout` composable gives you the raw measure/place API in about ten lines.

**Intrinsic measurements** (`IntrinsicSize.Min/Max`) are the escape hatch for "make all children as tall as the tallest" — they cost an extra measurement pass, so use them sparingly.

## 10. What is State Hoisting?
A pattern of moving state out of a composable to its caller to make the composable stateless. This makes the composable easier to test, highly reusable, and strictly unidirectional.

```kotlin
// Stateless Composable
@Composable
fun CustomTextField(value: String, onValueChange: (String) -> Unit) {
    TextField(value = value, onValueChange = onValueChange)
}
```

**The pattern is mechanical:** replace an internal `var x by remember { mutableStateOf(...) }` with two parameters — `value: T` (state down) and `onValueChange: (T) -> Unit` (events up).

```kotlin
// Stateful: self-contained but unusable from outside
@Composable
fun SearchBar() {
    var query by remember { mutableStateOf("") }
    TextField(query, onValueChange = { query = it })
    // The caller can't read, set, or clear the query. Can't test it either.
}

// Hoisted: the caller owns the state and can do anything with it
@Composable
fun SearchBar(query: String, onQueryChange: (String) -> Unit) {
    TextField(query, onValueChange = onQueryChange)
}
```

**What hoisting buys you**, concretely: a **single source of truth** (no duplicate state to desync), the ability for the parent to **intercept or transform** the event (debounce, validate, uppercase), **shareability** (two composables can read the same state), **testability** (pass values in, assert on the lambda), and **previewability** (any state is one parameter away).

**Where to hoist to:** the **lowest common ancestor** of everything that reads or writes the state. Hoisting too far creates needless parameter-passing through intermediate layers; hoisting too little recreates the problem.

**The best-of-both pattern** is to offer two overloads — a stateless one for control, and a stateful convenience wrapper with a default:

```kotlin
@Composable
fun Counter(count: Int, onIncrement: () -> Unit) { /* stateless */ }

@Composable
fun Counter() {                                   // convenience overload
    var count by rememberSaveable { mutableStateOf(0) }
    Counter(count) { count++ }
}
```

This is exactly how the Material components are built, and why `Switch`, `TextField` and friends all take `value` + `onValueChange`.

**What *not* to hoist:** purely internal state nobody outside cares about — animation progress, ripple state, whether a tooltip is showing. Hoisting those just adds noise. The test is simple: *does anyone else need to read or change this?* If not, leave it inside.

A related idiom is the **state holder class** — for complex components, bundle the hoisted state into a `rememberFooState()` object rather than exposing a dozen parameters. `LazyListState` and `ScaffoldState` are built this way.

## 11. What is Unidirectional Data Flow (UDF)?
A design pattern where state flows down (from parent to child) and events flow up (from child to parent). State hoisting is the practical application of UDF in Compose.

**The shape, end to end:**

```
  ViewModel ──── state (StateFlow<UiState>) ────▶ Composable
      ▲                                               │
      └──────────── events (onClick, onType) ─────────┘
```

State moves in exactly one direction, events in the other, and they never cross. The composable **never mutates** the state it receives; it only reports that something happened, and the owner decides what the new state should be.

**Why this matters more than it sounds.** In a bidirectional system (two-way data binding, or a view that mutates the model it renders), a change can enter the loop from anywhere, so reproducing a bug means reconstructing an unknown sequence of mutations. Under UDF there is exactly one path to any state change, which makes behaviour replayable and bugs localisable: every state is the result of a known event applied to a known previous state.

```kotlin
// ViewModel owns the state; nothing else can write to it
class SearchViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()   // read-only outward

    fun onQueryChange(q: String) {                 // the only way state changes
        _uiState.update { it.copy(query = q) }
    }
}

@Composable
fun SearchScreen(viewModel: SearchViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    SearchBar(
        query = state.query,                        // state down
        onQueryChange = viewModel::onQueryChange    // events up
    )
}
```

Note `asStateFlow()` — exposing the `MutableStateFlow` directly would let any caller write to it and break the invariant.

**Two practices that make UDF work in real screens:**

1. **One state object, not many flags.** `UiState(isLoading, items, error)` as a single immutable `data class` makes impossible combinations (loading *and* error) representable only if you allow them — and lets you model them as a sealed hierarchy if you'd rather not.
2. **Separate events from state.** A navigation trigger or a snackbar is a one-shot *event*; putting it in `StateFlow` means it replays after rotation. Use a `Channel` or `SharedFlow` for those.

UDF is the same principle as Redux, MVI, and React's props/callbacks — and it's why Compose and `ViewModel` fit together so naturally.

## 12. How do you handle lists in Compose?
Use `LazyColumn` or `LazyRow`. They are the Compose equivalent of `RecyclerView`. They only compose and lay out items that are currently visible on the screen.

```kotlin
LazyColumn {
    items(userList) { user ->
        UserCard(user) // Only instantiated if visible
    }
}
```

**`LazyColumn` vs. `Column` is the first thing to get right.** A `Column` with `verticalScroll()` composes and measures **every** child immediately, however long the list. For 20 items that's fine; for 2,000 it freezes the app. `LazyColumn` composes only what's visible plus a small buffer.

**The `key` parameter is the most important optimisation**, and it's omitted far too often:

```kotlin
LazyColumn {
    items(users, key = { it.id }) { user ->      // ← stable identity
        UserCard(user)
    }
}
```

Without a key, items are identified by index. Insert at the top and every item shifts index, so Compose thinks they all changed: state is lost, animations are wrong, and everything recomposes. With a key, state and animations follow the item. It's the direct analogue of `RecyclerView`'s stable IDs, and it's also what makes `Modifier.animateItem()` work.

**The DSL is a scope, not a composable body** — a point that confuses newcomers. Inside `LazyColumn { }` you're in `LazyListScope`, where you call `item { }` and `items() { }`, not arbitrary composables:

```kotlin
LazyColumn {
    item { Header() }                               // single item
    items(users, key = { it.id }) { UserCard(it) }  // list
    itemsIndexed(users) { index, user -> /* ... */ }
    stickyHeader { SectionTitle() }                 // sticks while scrolling
    item { Footer() }
}
```

**Other members of the family:** `LazyRow`, `LazyVerticalGrid` / `LazyHorizontalGrid` (with `GridCells.Fixed` or `Adaptive`), and `LazyVerticalStaggeredGrid`.

**Controlling and observing scroll** goes through `rememberLazyListState()`:

```kotlin
val listState = rememberLazyListState()
LazyColumn(state = listState) { /* ... */ }

// Scroll to top — must be in a coroutine
scope.launch { listState.animateScrollToItem(0) }

// Derive cheaply: this boolean flips once, not on every pixel
val showFab by remember { derivedStateOf { listState.firstVisibleItemIndex > 0 } }
```

**Two common mistakes:** nesting a `LazyColumn` inside a vertically scrolling `Column` (infinite-height constraints — it throws; use one `LazyColumn` with multiple `item` blocks instead), and giving a `LazyColumn` a fixed height that doesn't match its container. Also avoid putting heavy work in the item lambda; it runs during scroll.

For paging, `Paging 3` integrates directly via `collectAsLazyPagingItems()`.

## 13. What is a `SideEffect` in Compose?
A side effect is a change to the state of the app that happens outside the scope of a composable function. Compose provides specific effect APIs to execute side effects safely.

**Why they need special APIs.** A composable body may run many times per second, in any order, in parallel, and may be cancelled halfway. Anything with an observable consequence outside the function — a network call, a database write, a log, a listener registration, an analytics event — must therefore not live in the body. The effect APIs give you a controlled place to do it, with defined timing and cleanup.

```kotlin
@Composable
fun Screen(viewModel: VM) {
    viewModel.loadData()        // BUG: fires on every recomposition
    Text(...)
}
```

**The toolkit, with the question each answers:**

- **`LaunchedEffect(key)`** — *"run a coroutine while this composable is in the composition."* The workhorse. See question 14.
- **`DisposableEffect(key)`** — *"set something up, and tear it down when I leave."* Listeners, observers, callbacks. See question 15.
- **`SideEffect`** — *"publish Compose state to a non-Compose object, after every successful composition."* No coroutine, no cleanup, runs every time:

```kotlin
SideEffect {
    analytics.setUserProperty("theme", if (isDark) "dark" else "light")
}
```

- **`rememberCoroutineScope()`** — *"I need a scope to launch from an event handler,"* i.e. outside composition, in response to a click. The scope is cancelled when the composable leaves.

```kotlin
val scope = rememberCoroutineScope()
Button(onClick = { scope.launch { listState.animateScrollToItem(0) } }) { Text("Top") }
```

- **`rememberUpdatedState(value)`** — *"capture the latest value inside a long-lived effect without restarting it."* The fix for a `LaunchedEffect(Unit)` that would otherwise capture a stale lambda.
- **`produceState`** — converts non-Compose sources into Compose `State`. See question 16.
- **`derivedStateOf`** — not strictly an effect, but the tool for deriving a rarely-changing value from a rapidly-changing one.

**The rule that ties it together:** `LaunchedEffect` and `rememberCoroutineScope` are complements — the first runs work triggered by *composition*, the second runs work triggered by a *user event*. Launching from a click inside a `LaunchedEffect` is the wrong tool, and launching composition-triggered work from a `rememberCoroutineScope` leaks.

## 14. What is `LaunchedEffect`?
A side effect API used to run suspend functions (Coroutines) inside a composable. It is launched when the composable enters the composition and cancelled when it leaves.

```kotlin
@Composable
fun ProfileScreen(userId: String) {
    // Re-runs the coroutine only if userId changes
    LaunchedEffect(userId) {
        viewModel.fetchUserData(userId)
    }
}
```

**The keys are the entire API.** They decide when the coroutine restarts:

- `LaunchedEffect(Unit)` or `LaunchedEffect(true)` — runs **once**, when the composable enters, and never restarts. For one-time initialisation.
- `LaunchedEffect(userId)` — cancels the running coroutine and starts a fresh one **whenever `userId` changes**. This cancellation is the valuable part: navigate quickly between three profiles and you get one in-flight request, not three racing to write the same state.
- `LaunchedEffect(a, b)` — restarts when either changes.

**The lifecycle:** enters composition → coroutine starts in a scope tied to the composition; leaves composition → coroutine is **cancelled**. You get automatic cleanup for free, which is why you should never launch with `GlobalScope` here.

**The stale-capture trap, and its fix.** With `LaunchedEffect(Unit)`, the lambda captures values from the *first* composition forever:

```kotlin
// BUG: always calls the original onTimeout, even after the caller passes a new one
@Composable
fun Timer(onTimeout: () -> Unit) {
    LaunchedEffect(Unit) {
        delay(5000)
        onTimeout()            // stale
    }
}

// FIX: rememberUpdatedState keeps the reference fresh without restarting the timer
@Composable
fun Timer(onTimeout: () -> Unit) {
    val currentOnTimeout by rememberUpdatedState(onTimeout)
    LaunchedEffect(Unit) {
        delay(5000)
        currentOnTimeout()     // always the latest
    }
}
```

Adding `onTimeout` as a key would "fix" it differently — and wrongly, since a new lambda instance on each recomposition would restart the 5-second timer forever.

**Where it belongs, and where it doesn't.** Use it for work triggered by *composition*: starting an animation, observing a flow, showing a snackbar when state changes, or firing a one-time load. Do **not** use it for user events — a click handler needs `rememberCoroutineScope()`. And in a well-structured app, data loading usually belongs in the `ViewModel`'s `init` or an explicit event, not in a `LaunchedEffect`, so it survives configuration changes rather than re-firing on each one.

A frequent correct use is consuming one-shot events:

```kotlin
LaunchedEffect(Unit) {
    viewModel.events.collect { event ->
        when (event) { is ShowSnackbar -> snackbarHostState.showSnackbar(event.msg) }
    }
}
```

## 15. What is `DisposableEffect`?
Used for side effects that require cleanup when the composable leaves the composition (e.g., registering and unregistering a listener).

```kotlin
DisposableEffect(lifecycleOwner) {
    val observer = LifecycleEventObserver { _, event -> /* handle */ }
    lifecycleOwner.lifecycle.addObserver(observer)
    onDispose {
        lifecycleOwner.lifecycle.removeObserver(observer) // Cleanup
    }
}
```

**It is the symmetric-cleanup effect.** `onDispose` is **mandatory** — the block won't compile without it, which is a deliberate design choice: the API makes it impossible to register something and forget to unregister it.

**When `onDispose` runs:** when the composable leaves the composition, **and** before the effect re-runs because a key changed. That second case is easy to miss and is what keeps key changes correct — old listener removed, then new one added, never both attached at once.

**`DisposableEffect` vs. `LaunchedEffect`:** choose by whether the work is *suspending* or *callback-based*.

- **`LaunchedEffect`** — a coroutine; cleanup is automatic cancellation. For suspend functions and flows.
- **`DisposableEffect`** — not a coroutine (the block is not `suspend`); cleanup is explicit. For registering with any callback-based API.

**Typical uses** — all of them "some non-Compose system needs to know about us while we're on screen": lifecycle observers, `SensorManager` and `LocationManager` listeners, broadcast receivers, `MediaPlayer`/`ExoPlayer` setup and release, `SystemUiController` and window flags (keep-screen-on), analytics screen-view tracking, and third-party SDK callbacks.

```kotlin
// Keep the screen on only while this screen is visible
val view = LocalView.current
DisposableEffect(Unit) {
    val window = (view.context as Activity).window
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    onDispose { window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
}
```

```kotlin
// Release a player properly — the classic leak if you forget
DisposableEffect(mediaUrl) {
    val player = ExoPlayer.Builder(context).build().apply { setMediaItem(...); prepare() }
    onDispose { player.release() }
}
```

**Key choice matters as much as in `LaunchedEffect`:** `DisposableEffect(Unit)` sets up once for the composable's lifetime. Keying it on something that changes identity every recomposition (an unstable lambda or a fresh object) causes constant teardown/setup churn — a real performance bug and sometimes a visible flicker.

## 16. What is `produceState`?
It converts non-Compose state (like LiveData or RxJava) into Compose state. Under the hood, it is a `LaunchedEffect` that pushes values into a `MutableState`.

```kotlin
val uiState by produceState(initialValue = "Loading") {
    value = networkRepo.fetchData() // Suspending call
}
```

**It is exactly `remember { mutableStateOf(initial) }` + `LaunchedEffect` fused into one call.** The lambda is a coroutine scope; you push results by assigning to `value`. It follows the same rules: keys restart it, leaving the composition cancels it, and `awaitDispose` gives you cleanup for callback-based sources.

```kotlin
// Keyed, with a proper loading/success/error model
@Composable
fun userState(userId: String): State<Result<User>> =
    produceState<Result<User>>(initialValue = Result.Loading, userId) {
        value = try { Result.Success(repo.fetchUser(userId)) }
        catch (e: Exception) { Result.Error(e) }
    }
```

```kotlin
// Bridging a callback API — awaitDispose handles unregistration
val location by produceState<Location?>(initialValue = null) {
    val listener = LocationListener { value = it }
    locationManager.requestLocationUpdates(provider, 1000L, 0f, listener)
    awaitDispose { locationManager.removeUpdates(listener) }
}
```

**When to use it rather than the alternatives**, which is the real question:

- **Reach for a dedicated converter first** when one exists: `collectAsStateWithLifecycle()` for a `StateFlow` (the recommended default — it stops collecting when the app is backgrounded), `collectAsState()` for a plain `Flow`, `observeAsState()` for `LiveData`, `subscribeAsState()` for RxJava. These exist precisely so you don't hand-roll `produceState`.
- **Use `produceState`** when there's no converter: a one-shot suspend call, a callback-based API, or combining several sources into one piece of state.

**A caveat worth stating in an interview:** `produceState` lives in the composition, so its result is **lost on configuration change** and it re-fetches on rotation. For screen-level data loading, a `ViewModel` exposing a `StateFlow` is the better architecture — `produceState` is best for small, local, composable-scoped derivations rather than as your app's data-loading strategy.

Note also that the lambda is **not** restarted by recomposition alone, only by key changes — the same semantics as `LaunchedEffect`, and the same stale-capture caution applies.

## 17. How do you use ViewModels in Compose?
Using the `viewModel()` or `hiltViewModel()` functions. They retain the ViewModel across recompositions and configuration changes.

```kotlin
@Composable
fun MyScreen(viewModel: MyViewModel = viewModel()) {
    // collectAsState converts StateFlow to Compose State
    val state by viewModel.uiState.collectAsState() 
    Text(state.title)
}
```

**Scoping is the thing to understand.** `viewModel()` resolves the instance from the nearest `ViewModelStoreOwner` in the composition — by default the host Activity or Fragment. Inside a `NavHost`, the owner is the **`NavBackStackEntry`**, so each navigation destination gets its own `ViewModel` that is cleared when that destination is popped. That's usually what you want, and it's worth knowing because it explains why two screens don't accidentally share a `ViewModel`.

To deliberately share one across destinations, scope it to the parent entry:

```kotlin
val parentEntry = remember(backStackEntry) { navController.getBackStackEntry("graph_route") }
val sharedVm: SharedViewModel = hiltViewModel(parentEntry)
```

**`collectAsStateWithLifecycle()` is the one to prefer** over `collectAsState()`. The plain version keeps collecting while the app is in the background, wasting work and occasionally updating UI nobody can see; the lifecycle-aware version stops at `STOPPED` and resumes later. It lives in `androidx.lifecycle:lifecycle-runtime-compose`.

```kotlin
val state by viewModel.uiState.collectAsStateWithLifecycle()
```

**Design conventions that matter more in Compose than they did with Views:**

1. **Default parameter, not internal call.** `viewModel: MyViewModel = viewModel()` keeps the composable previewable and testable — a test or `@Preview` just passes a fake.
2. **Don't pass the `ViewModel` down the tree.** Hoist state at the screen level and pass plain values and lambdas to children. Child composables stay reusable and preview-friendly; only the screen-level composable knows the `ViewModel` exists.
3. **Never put a `Context`, a `View`, or anything Compose-related inside a `ViewModel`.** It outlives them.

```kotlin
@Composable
fun ProfileRoute(viewModel: ProfileViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    ProfileScreen(state = state, onRefresh = viewModel::refresh)   // stateless, testable
}
```

**Use `hiltViewModel()`** when using Hilt — it supplies the factory for constructor-injected `ViewModel`s automatically. And remember the division of labour with saved state: a `ViewModel` survives rotation but **not** process death, so small user-visible state still needs `SavedStateHandle` or `rememberSaveable`.

## 18. What is `CompositionLocal`?
A tool for passing data down through the composition implicitly without explicitly passing it through composable parameters. Used for themes, context, or window size.

```kotlin
// Accessing context implicitly
val context = LocalContext.current
Toast.makeText(context, "Hello", Toast.LENGTH_SHORT).show()
```

**It is scoped implicit dependency injection for the composition tree.** A value is provided at some node and is readable by every descendant without being threaded through intermediate parameters — solving the "prop drilling" problem where a value must pass through ten layers that don't care about it.

**Built-ins you'll use constantly:** `LocalContext`, `LocalConfiguration`, `LocalDensity`, `LocalLifecycleOwner`, `LocalFocusManager`, `LocalSoftwareKeyboardController`, `LocalClipboardManager`, `LocalLayoutDirection`, and the `MaterialTheme` values (`colorScheme`, `typography`, `shapes`) which are themselves CompositionLocals.

**Creating your own:**

```kotlin
// staticCompositionLocalOf: changes rarely → cheaper reads, but re-composes
// the ENTIRE Providers subtree when it does change
val LocalAnalytics = staticCompositionLocalOf<Analytics> {
    error("No Analytics provided")       // fail loudly rather than return a dud
}

// compositionLocalOf: changes often → only readers recompose
val LocalElevation = compositionLocalOf { 0.dp }

// Providing
CompositionLocalProvider(LocalAnalytics provides analyticsImpl) {
    App()
}

// Reading, anywhere below
val analytics = LocalAnalytics.current
```

**The two factories, and when to use each** — a real interview discriminator:

- **`staticCompositionLocalOf`** — the value is not tracked as a read. Reads are cheaper, but a change recomposes the whole content of the `CompositionLocalProvider`. Correct for values that essentially never change (a theme at app launch, a DI entry point).
- **`compositionLocalOf`** — reads are tracked, so a change recomposes only actual readers. Correct for values that change during normal use.

**Use it sparingly, and here's the test:** a `CompositionLocal` makes a dependency *invisible* at the call site, which hurts readability and testability. It earns its place when the value is (a) needed by many composables at many depths, (b) cross-cutting rather than specific to one feature, and (c) rarely changing — themes, density, locale, platform services.

For ordinary data — a user object, a list of items, a callback — **pass parameters instead**. Explicit is better. A good rule: if you'd struggle to write a `@Preview` for a composable because of what it implicitly reads, you've over-used `CompositionLocal`. Always provide a sensible default, or `error()` loudly, so a missing provider fails fast rather than silently rendering wrong.

## 19. How do you implement Navigation in Compose?
Using the Navigation Compose library. You define a `NavHost` and map string routes to composable screens.

```kotlin
val navController = rememberNavController()
NavHost(navController, startDestination = "home") {
    composable("home") { HomeScreen(navController) }
    composable("details/{id}") { backStackEntry -> 
        DetailsScreen(backStackEntry.arguments?.getString("id")) 
    }
}
```

**The model:** a single Activity hosts a `NavHost`, which swaps composable destinations in and out and owns the back stack. Each destination gets its own `NavBackStackEntry`, which is a `LifecycleOwner`, a `ViewModelStoreOwner`, and a `SavedStateRegistryOwner` — which is why `viewModel()` inside a destination is scoped to that destination and cleared when it's popped.

**Declare argument types rather than parsing strings by hand:**

```kotlin
composable(
    route = "details/{id}?filter={filter}",
    arguments = listOf(
        navArgument("id") { type = NavType.IntType },
        navArgument("filter") { type = NavType.StringType; defaultValue = "all" }
    )
) { entry ->
    DetailsScreen(id = entry.arguments!!.getInt("id"))
}

navController.navigate("details/42?filter=recent")
```

**The design rule that matters most: don't pass the `NavController` into screens.** Hoist navigation into lambdas. The screen then has no dependency on navigation at all, so it is previewable, testable, and reusable:

```kotlin
// Avoid
composable("home") { HomeScreen(navController) }

// Prefer
composable("home") {
    HomeScreen(onItemClick = { id -> navController.navigate("details/$id") })
}
```

**Controlling the back stack** via the options block:

```kotlin
navController.navigate("home") {
    popUpTo("login") { inclusive = true }   // clear login from the stack
    launchSingleTop = true                  // don't stack duplicates
}
```

`popUpTo` + `inclusive` is the standard post-login and logout move. `launchSingleTop` prevents the duplicate-destination bug from a double tap.

**Returning a result** is done through the previous entry's saved-state handle, since there's no `startActivityForResult` equivalent:

```kotlin
navController.previousBackStackEntry?.savedStateHandle?.set("result", value)
navController.popBackStack()
```

**Other pieces worth naming:** nested graphs via `navigation(startDestination, route)` for feature modularisation; `dialog("route") { }` and `bottomSheet("route") { }` destinations; deep links via `deepLinks = listOf(navDeepLink { uriPattern = "..." })`; and `NavigationBar` integration using `currentBackStackEntryAsState()` to highlight the selected tab.

**Pass IDs, not objects.** Routes are strings, so complex arguments must be serialised — a sign you should be passing a key and letting the destination's `ViewModel` load the data. Newer versions support type-safe routes with `@Serializable` classes, which removes the string-building entirely and is worth preferring in new code.

## 20. How is theming handled in Compose?
Theming is strictly programmatic (no `styles.xml`). You define a `MaterialTheme` wrapper composable that provides a custom configuration of Colors, Typography, and Shapes to all its children via `CompositionLocal`.

```kotlin
@Composable
fun MyAppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colors = lightColors(primary = Color.Blue),
        typography = Typography(),
        content = content
    )
}
```

**The three pillars** — `colorScheme`, `typography`, `shapes` — are supplied through `CompositionLocal`, so any descendant reads them with `MaterialTheme.colorScheme.primary`, `MaterialTheme.typography.bodyLarge`, `MaterialTheme.shapes.medium`. Because it's just composition, you can nest themes: wrap one section in a different `MaterialTheme` and only that subtree changes.

**Material 3 differs from Material 2** in naming, and mixing them is a common error: `colorScheme` not `colors`, `lightColorScheme()` not `lightColors()`, and semantic roles (`primary`/`onPrimary`, `surface`/`onSurface`, `surfaceVariant`) rather than M2's `primaryVariant`/`onBackground` set. The `on*` convention is the useful part — always pair a background role with its matching content role and contrast is handled for you.

**A realistic theme**, including dark mode and dynamic colour:

```kotlin
@Composable
fun MyAppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val ctx = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(ctx) else dynamicLightColorScheme(ctx)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
```

`isSystemInDarkTheme()` makes dark mode a one-line concern, and **dynamic colour** (Android 12+) derives the palette from the user's wallpaper.

**The practice that separates a maintainable app from an unmaintainable one: never hardcode values in components.**

```kotlin
Text("Hi", color = Color(0xFF6200EE))                 // breaks in dark mode
Text("Hi", color = MaterialTheme.colorScheme.primary) // adapts automatically
```

**Extending the theme** with values Material doesn't define (brand colours, custom spacing) is done with your own `CompositionLocal`:

```kotlin
data class Spacing(val small: Dp = 4.dp, val medium: Dp = 8.dp)
val LocalSpacing = staticCompositionLocalOf { Spacing() }
// provide it inside MyAppTheme, read it as LocalSpacing.current.medium
```

**Compared to XML themes**, the advantages are real: themes are type-safe and refactorable, you can compute values rather than enumerate them, and nested/partial theming is trivial instead of requiring `ContextThemeWrapper`. The main thing you give up is runtime theme switching via configuration — but that's replaced by simply recomposing with a different scheme, which is faster and doesn't recreate the Activity.

For interop, `MdcTheme`/`AppCompatTheme` (Accompanist) bridges an existing XML theme into Compose during migration.

---
title: "Modern UI Development (Jetpack Compose & Views)"
description: "Transitioning from XML to declarative UI with Jetpack Compose."
---

## 16. What is Jetpack Compose, and how does it differ from the traditional XML View system?
Jetpack Compose is Android’s modern toolkit for building native UI. 
- **XML System**: Uses an imperative approach (mutating state using `findViewById` and setters like `setText`). UI is defined in XML files separate from the logic.
- **Compose**: Uses a declarative approach. UI is defined purely in Kotlin using `@Composable` functions. The UI automatically updates (recomposes) when the underlying state changes.

## 17. What is dynamic recomposition in Jetpack Compose, and how does Compose optimize it?
Recomposition is the process of calling your composable functions again when inputs/state change to update the UI.
Compose optimizes this by:
- **Skipping**: It skips recomposing functions if their parameters haven't changed.
- **Positional Memoization**: It tracks composables based on their call location in the source code.
- **Parallelization**: Recomposition can happen in parallel in the background.

## 18. Explain the difference between `remember` and `rememberSaveable` in Compose.
- **`remember`**: Stores an object in the composition and returns the stored value. It survives recompositions but is lost if the activity is recreated (e.g., screen rotation).
- **`rememberSaveable`**: Similar to `remember`, but it automatically saves the state into a `Bundle`. It survives activity recreation (configuration changes) and system-initiated process death.

## 19. What are `SideEffect`, `LaunchedEffect`, and `DisposableEffect` in Jetpack Compose?
Because composables should be side-effect free, Compose provides specialized effect handlers:
- **`LaunchedEffect`**: Runs a suspend function in the scope of the composable. Cancels the coroutine if the composable leaves the composition.
- **`SideEffect`**: Publishes Compose state to non-Compose code. Runs after every successful recomposition.
- **`DisposableEffect`**: Used for side effects that require cleanup (e.g., registering a callback). Provides an `onDispose` block that runs when the composable leaves the composition.

## 20. What is `CompositionLocal`, and when should you use it?
`CompositionLocal` is a tool for passing data down through the Composition implicitly without having to pass it explicitly as parameters to every composable function.
It is ideal for cross-cutting concerns like Themes, Colors, Typography, or a generic context (like `LocalContext.current`).

## 21. What is the `ViewHolder` pattern, and why is `RecyclerView` preferred over `ListView`?
The `ViewHolder` pattern stores references to child views (like `TextView`s) inside a list item layout, preventing costly `findViewById()` calls during scrolling.
`RecyclerView` forces the use of this pattern and provides a highly flexible architecture (LayoutManagers, ItemAnimators) compared to the rigid, legacy `ListView`.

## 22. How do `DiffUtil` and `ListAdapter` improve `RecyclerView` performance?
`DiffUtil` is a utility class that calculates the difference between two lists and outputs a list of update operations that convert the first list into the second. 
Used via `ListAdapter`, it calculates these diffs on a background thread and automatically dispatches granular updates (`notifyItemInserted`, `notifyItemChanged`), resulting in smooth animations and avoiding the expensive `notifyDataSetChanged()`.

## 23. What are `dp`, `sp`, and `px` in Android layout design?
- **px (Pixels)**: Actual screen pixels. Highly discouraged because absolute size varies drastically across devices with different pixel densities.
- **dp (Density-independent Pixels)**: A virtual pixel unit that scales proportionally based on the screen's physical density. 1dp = 1px on a 160 dpi screen.
- **sp (Scale-independent Pixels)**: Similar to `dp`, but also scales based on the user's system-wide font size preferences. Used exclusively for text.

## 24. What is `ConstraintLayout`, and what performance advantages does it offer over nested layouts?
`ConstraintLayout` allows you to create large and complex layouts with a flat view hierarchy. 
Nested layouts (e.g., `LinearLayout` inside `RelativeLayout`) require multiple measure and layout passes by the system, degrading performance. `ConstraintLayout` solves this by calculating all positions mathematically in a single flat hierarchy.

## 25. How do you create custom views and handle custom drawing (`onMeasure`, `onLayout`, `onDraw`)?
To create a custom view in the legacy system:
1. Extend `View` or `ViewGroup`.
2. Override `onMeasure()` to determine the size requirements of the view based on `MeasureSpec` constraints.
3. Override `onLayout()` (only for ViewGroups) to assign sizes and positions to child views.
4. Override `onDraw()` using a `Canvas` and `Paint` to draw custom graphics directly onto the screen.

## 26. What are `StateFlow` and `SharedFlow`, and how do you collect them safely in Compose UI?
They are hot Kotlin flows. `StateFlow` holds state (requires an initial value and emits the latest to new collectors), while `SharedFlow` is used for events (emits to all active subscribers).
In Compose, you safely collect them using `collectAsStateWithLifecycle()`, which automatically pauses collection when the UI is in the background, saving battery and preventing crashes.

## 27. How does lazy loading work in Compose (`LazyColumn` vs `LazyRow`)?
`LazyColumn` (vertical) and `LazyRow` (horizontal) are the Compose equivalents to `RecyclerView`. They only compose and lay out items that are currently visible on the screen. As the user scrolls, items leaving the screen are discarded, and new items are composed, keeping memory usage minimal.

## 28. What is `ViewBinding`, and how does it differ from `DataBinding`?
- **ViewBinding**: Generates a binding class for each XML layout, allowing type-safe and null-safe access to views without `findViewById`. It only binds views to code.
- **DataBinding**: An older, heavier library that includes ViewBinding features but also allows binding data directly inside the XML layout (e.g., `android:text="@{user.name}"`).

## 29. What is the purpose of `Modifier` in Jetpack Compose?
`Modifier`s are used to decorate or add behavior to UI elements. They allow you to change a composable's size, layout, appearance (padding, background), or add high-level interactions like making it clickable, scrollable, or draggable. Order matters heavily when applying modifiers.

## 30. How do you handle deep linking and navigation in Jetpack Compose?
Using the Navigation Compose library:
1. Define a `NavHost` and `rememberNavController()`.
2. Map string routes to composable screens.
3. For deep links, add a `deepLinks` argument to a `composable` destination defining the URI pattern (e.g., `uriPattern = "https://example.com/details/{id}"`). The system automatically handles parsing arguments and routing the user to the correct screen.

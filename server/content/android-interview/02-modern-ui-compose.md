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

## 2. What is Declarative UI vs Imperative UI?
- **Imperative (XML)**: You manually mutate the UI state (e.g., `textView.setText("Hello")`, `button.setVisibility(GONE)`).
- **Declarative (Compose)**: You describe what the UI should look like for a given state. When the state changes, the UI automatically regenerates (recomposes) to reflect it.

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

## 6. What is `mutableStateOf`?
It creates an observable `MutableState<T>`. When the value changes, Compose automatically schedules a recomposition for any Composable function that reads this state.

```kotlin
// Idiomatic usage combining remember and mutableStateOf
var text by remember { mutableStateOf("") }
TextField(value = text, onValueChange = { text = it })
```

## 7. What is the difference between `remember` and `rememberSaveable`?
- `remember`: Survives recomposition, but is destroyed across configuration changes (like screen rotation).
- `rememberSaveable`: Survives recomposition AND configuration changes by saving the data in a `Bundle`.

```kotlin
// Survives screen rotation
var text by rememberSaveable { mutableStateOf("") }
```

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

## 10. What is State Hoisting?
A pattern of moving state out of a composable to its caller to make the composable stateless. This makes the composable easier to test, highly reusable, and strictly unidirectional.

```kotlin
// Stateless Composable
@Composable
fun CustomTextField(value: String, onValueChange: (String) -> Unit) {
    TextField(value = value, onValueChange = onValueChange)
}
```

## 11. What is Unidirectional Data Flow (UDF)?
A design pattern where state flows down (from parent to child) and events flow up (from child to parent). State hoisting is the practical application of UDF in Compose.

## 12. How do you handle lists in Compose?
Use `LazyColumn` or `LazyRow`. They are the Compose equivalent of `RecyclerView`. They only compose and lay out items that are currently visible on the screen.

```kotlin
LazyColumn {
    items(userList) { user ->
        UserCard(user) // Only instantiated if visible
    }
}
```

## 13. What is a `SideEffect` in Compose?
A side effect is a change to the state of the app that happens outside the scope of a composable function. Compose provides specific effect APIs to execute side effects safely.

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

## 16. What is `produceState`?
It converts non-Compose state (like LiveData or RxJava) into Compose state. Under the hood, it is a `LaunchedEffect` that pushes values into a `MutableState`.

```kotlin
val uiState by produceState(initialValue = "Loading") {
    value = networkRepo.fetchData() // Suspending call
}
```

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

## 18. What is `CompositionLocal`?
A tool for passing data down through the composition implicitly without explicitly passing it through composable parameters. Used for themes, context, or window size.

```kotlin
// Accessing context implicitly
val context = LocalContext.current
Toast.makeText(context, "Hello", Toast.LENGTH_SHORT).show()
```

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

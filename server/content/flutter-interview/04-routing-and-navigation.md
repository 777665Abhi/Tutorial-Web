---
title: "Routing & Navigation"
description: "Navigator 1.0 vs 2.0, GoRouter, deep linking, and passing data."
---

## 1. What is the Navigator in Flutter?
The `Navigator` is a widget that manages a stack of Route objects. It allows you to push new screens onto the stack and pop them off to go back.

```dart
Navigator.push(
  context,
  MaterialPageRoute(builder: (context) => SecondScreen()),
);
```

## 2. What is `Navigator.push` vs `Navigator.pop`?
- `push`: Adds a new route to the top of the navigation stack.
- `pop`: Removes the current route from the top of the stack, returning to the previous screen.

```dart
// Going back to the previous screen
Navigator.pop(context);
```

## 3. How do you pass data to a new screen?
By passing the data through the constructor of the destination widget when using `MaterialPageRoute`.

```dart
Navigator.push(
  context,
  MaterialPageRoute(builder: (context) => DetailsScreen(userId: 123)),
);
```

## 4. How do you return data from a screen?
You can pass data back to the previous screen by passing it as an argument to `Navigator.pop()`. The `push` method returns a `Future` that completes with that data.

```dart
// On Screen 1
final result = await Navigator.push(context, route);

// On Screen 2
Navigator.pop(context, "SuccessData");
```

## 5. What are Named Routes?
Instead of creating `MaterialPageRoute` objects everywhere, you define a map of string keys (routes) to widget builders in your `MaterialApp`.

```dart
MaterialApp(
  initialRoute: '/',
  routes: {
    '/': (context) => HomeScreen(),
    '/details': (context) => DetailsScreen(),
  },
)
```

## 6. How do you navigate using Named Routes?
Use `Navigator.pushNamed()`.

```dart
Navigator.pushNamed(context, '/details');
```

## 7. How do you pass arguments to Named Routes?
Pass them in the `arguments` parameter of `pushNamed`.

```dart
Navigator.pushNamed(context, '/details', arguments: {'id': 123});
```

## 8. How do you retrieve arguments in a Named Route?
Using `ModalRoute.of(context)`.

```dart
final args = ModalRoute.of(context)!.settings.arguments as Map;
print(args['id']);
```

## 9. What is `pushReplacement`?
It replaces the current route with a new one. The user cannot go back to the original route using the back button. Useful for login screens (once logged in, you shouldn't go back to the login screen).

```dart
Navigator.pushReplacementNamed(context, '/home');
```

## 10. What is `pushAndRemoveUntil`?
It pushes a new route and removes all the previous routes from the stack until a specific condition is met (often used to clear the entire stack and set a new root).

```dart
// Clears the whole stack and pushes /home
Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
```

## 11. What is Navigator 2.0 (Router API)?
Introduced to solve the limitations of Navigator 1.0 (which was strictly imperative). Navigator 2.0 is a declarative routing API that syncs the app's state with the navigation stack, making it much easier to handle web URLs and deep linking.

## 12. Why is Navigator 2.0 considered difficult?
It requires managing complex state objects (`RouterDelegate`, `RouteInformationParser`) to manually synchronize the OS-level URL/back-button with the internal Flutter widget state, which introduces immense boilerplate.

## 13. What is `go_router`?
A declarative routing package officially maintained by the Flutter team. It wraps the complex Navigator 2.0 API into a simple, easy-to-use interface, and is currently the recommended way to handle routing.

```dart
final router = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => HomeScreen(),
    ),
    GoRoute(
      path: '/details/:id',
      builder: (context, state) => DetailsScreen(id: state.pathParameters['id']),
    ),
  ],
);
```

## 14. How do you navigate with `go_router`?
Use `context.go()` (replaces the URL stack) or `context.push()` (adds to the stack).

```dart
context.go('/details/123'); // Declarative URL-based navigation
```

## 15. What is Deep Linking?
Deep linking allows a user to click a URL (like `https://myapp.com/products/123`) in an email or web browser and have it directly open the app to that specific screen, instead of the home screen.

## 16. How does Flutter handle Deep Links?
On iOS/Android, you must configure Universal Links / App Links in the native OS manifests. Once the OS passes the URL to Flutter, Navigator 2.0 (or `go_router`) automatically parses the URL and pushes the corresponding route.

## 17. What is a Hero Animation?
A visual transition where a widget (like an image) appears to "fly" from one screen to another during navigation.

```dart
// Screen 1
Hero(tag: 'avatar_1', child: Image.asset('avatar.png'))

// Screen 2
Hero(tag: 'avatar_1', child: Image.asset('avatar.png'))
```

## 18. What is `WillPopScope`?
A widget that allows you to intercept the back button press (e.g., to show a "Are you sure you want to exit?" dialog). *Note: Deprecated in newer Flutter versions in favor of `PopScope`.*

```dart
PopScope(
  canPop: false, // Prevents popping
  onPopInvoked: (didPop) {
    // Show confirmation dialog
  },
  child: Scaffold(...),
)
```

## 19. How do you implement Bottom Navigation?
Use a `BottomNavigationBar` in the `Scaffold`'s `bottomNavigationBar` property. You maintain an integer state (`_currentIndex`) and update it when a tab is tapped, displaying the corresponding widget in the `body`.

## 20. How do you maintain state in Bottom Navigation tabs?
By default, switching tabs destroys the state of the previous tab. To keep them alive, wrap the bodies in an `IndexedStack` (which keeps all widgets in the tree but only shows one) or use `AutomaticKeepAliveClientMixin`.

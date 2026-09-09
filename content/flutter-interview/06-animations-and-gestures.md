---
title: "Animations & Gestures"
description: "Implicit/Explicit animations, Hero, Lottie, and gesture detection."
---

## 1. What are the two types of Animations in Flutter?
1. **Implicit Animations**: Simple, easy to use, "fire-and-forget". You change a value, and Flutter animates from the old value to the new value automatically.
2. **Explicit Animations**: Complex, highly customizable. You manually control the animation (start, stop, reverse) using an `AnimationController`.

## 2. Name some Implicit Animation Widgets.
`AnimatedContainer`, `AnimatedOpacity`, `AnimatedPadding`, `AnimatedPositioned`, `AnimatedAlign`.

```dart
// Automatically animates when 'isVisible' changes
AnimatedOpacity(
  opacity: isVisible ? 1.0 : 0.0,
  duration: Duration(seconds: 1),
  child: Text("Fades in and out"),
)
```

## 3. What is an `AnimationController`?
A class that generates values (usually between 0.0 and 1.0) over a given duration. It is the heart of explicit animations, providing methods like `forward()`, `reverse()`, and `stop()`.

```dart
final controller = AnimationController(
  duration: Duration(seconds: 2),
  vsync: this, // Prevents off-screen rendering
);
controller.forward(); // Starts animation
```

## 4. What is the `TickerProvider` / `vsync`?
An interface that generates a "tick" for every frame rendered by the screen (usually 60 times a second). Passing `this` as `vsync` (using `SingleTickerProviderStateMixin`) ensures the animation controller only ticks when the widget is visible, saving battery.

## 5. What is a `Tween`?
An `AnimationController` outputs values from 0.0 to 1.0. A `Tween` (Between) maps that range to a different range (e.g., mapping 0.0->1.0 to Colors: Red->Blue, or Sizes: 10.0->100.0).

```dart
final sizeAnimation = Tween<double>(begin: 10.0, end: 100.0).animate(controller);
```

## 6. What is a `CurvedAnimation`?
By default, animations are linear (constant speed). `CurvedAnimation` applies a non-linear curve (like `Curves.bounceIn` or `Curves.easeOut`) to make the movement look more natural.

```dart
final curved = CurvedAnimation(
  parent: controller,
  curve: Curves.easeIn,
);
```

## 7. What is `AnimatedBuilder`?
A widget used with explicit animations. It listens to an `AnimationController` and rebuilds only its child when the animation value changes, keeping the rest of the widget tree untouched for performance.

```dart
AnimatedBuilder(
  animation: controller,
  builder: (context, child) {
    return Transform.scale(
      scale: controller.value,
      child: child, // The child is NOT rebuilt
    );
  },
  child: FlutterLogo(),
)
```

## 8. What is a Hero Animation?
A visual transition where a widget from one screen seamlessly animates (flies) to a new position and size on the next screen.

```dart
// Wrap the widget in a Hero on BOTH screens with the exact same tag
Hero(
  tag: 'profile_pic_123',
  child: Image.asset('profile.png'),
)
```

## 9. How do you implement drag and drop?
Using the `Draggable` widget (for the item you drag) and the `DragTarget` widget (for the drop zone).

```dart
Draggable<String>(
  data: "Apple",
  child: Text("Apple"), // Normal state
  feedback: Text("Apple", style: TextStyle(color: Colors.grey)), // Dragging state
)

DragTarget<String>(
  onAccept: (data) => print("Dropped: $data"),
  builder: (context, candidateData, rejectedData) => Container(),
)
```

## 10. What is `GestureDetector`?
A non-visual widget that detects gestures (taps, double taps, long presses, pans, scales) on its child and fires callbacks.

```dart
GestureDetector(
  onTap: () => print("Tapped"),
  onDoubleTap: () => print("Double Tapped"),
  child: Container(color: Colors.blue, width: 50, height: 50),
)
```

## 11. What is the difference between `GestureDetector` and `InkWell`?
- `GestureDetector`: Catches gestures. No visual feedback.
- `InkWell`: Catches gestures AND provides a material design ripple effect (ink splash) when touched. It must be inside a `Material` widget.

## 12. What is `Dismissible`?
A widget that allows the user to swipe its child horizontally or vertically to dismiss it (often used for "Swipe to Delete" in list views).

```dart
Dismissible(
  key: Key(item.id),
  onDismissed: (direction) => deleteItem(item),
  background: Container(color: Colors.red), // Shown while swiping
  child: ListTile(title: Text(item.name)),
)
```

## 13. How does Flutter handle scrolling?
Using `Scrollable` widgets (like `ListView`, `SingleChildScrollView`). It uses a `ScrollController` to track and control the scroll position programmatically.

## 14. What is a `Sliver`?
A portion of a scrollable area. Standard widgets (like `Column`) render everything at once. Slivers (used inside a `CustomScrollView`) render lazily and allow for complex scroll effects like collapsing AppBars (`SliverAppBar`).

## 15. What is `Lottie`?
A wildly popular third-party library that parses Adobe After Effects animations exported as JSON and renders them natively on mobile and web.

```dart
Lottie.asset('assets/animation.json')
```

## 16. What is `Rive` (formerly Flare)?
A real-time interactive design and animation tool specifically optimized for Flutter. Unlike Lottie, Rive animations can have "State Machines" that react directly to user input (like a character following the user's cursor).

## 17. How do you create Staggered Animations?
You use a single `AnimationController`, but define multiple `Tween`s with `Interval` curves. Each interval maps to a specific fraction of the controller's duration (e.g., 0.0 to 0.5 for opacity, 0.5 to 1.0 for movement).

## 18. What is `AnimatedList`?
A special `ListView` that animates items when they are inserted or removed, instead of instantly snapping them into place.

## 19. How do you capture a screenshot of a Widget programmatically?
Wrap the widget in a `RepaintBoundary` and assign it a `GlobalKey`. You can then use the key to extract the `RenderRepaintBoundary`, convert it to an image, and save it as a PNG file.

## 20. What is `Transform`?
A widget that applies a 2D or 3D transformation (rotation, scaling, translation) to its child before painting it.

```dart
Transform.rotate(
  angle: 3.14 / 4, // 45 degrees
  child: Icon(Icons.arrow_upward),
)
```

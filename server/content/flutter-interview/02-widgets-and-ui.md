---
title: "Widgets & UI"
description: "Stateless vs Stateful, BuildContext, Layouts, and the Widget tree."
---

## 1. What is a Widget in Flutter?
In Flutter, almost everything is a Widget. A widget is an immutable description of part of the user interface. Widgets form a tree structure to compose the UI.

## 2. What is the difference between `StatelessWidget` and `StatefulWidget`?
- **StatelessWidget**: Immutable. Its properties cannot change once built. Useful for static UI (e.g., an icon or a label).
- **StatefulWidget**: Has mutable state. It can rebuild multiple times over its lifetime when data changes (e.g., a checkbox or a text field).

```dart
class MyStaticText extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Text("Hello");
}
```

## 3. Explain the Lifecycle of a StatefulWidget.
1. `createState()`
2. `initState()`: Called exactly once. Initialize variables here.
3. `didChangeDependencies()`: Called when a dependency (like InheritedWidget) changes.
4. `build()`: Called repeatedly to render the UI.
5. `didUpdateWidget()`: Called if the parent rebuilds and provides a new widget instance.
6. `dispose()`: Called when the widget is permanently removed. Clean up controllers here.

## 4. What does `setState()` do?
It notifies the framework that the internal state of a `StatefulWidget` has changed, scheduling a call to the `build()` method to update the UI.

```dart
setState(() {
  _counter++; // Framework schedules a rebuild
});
```

## 5. What is `BuildContext`?
A handle to the location of a widget in the widget tree. It is used to look up themes, media queries, or ancestors (like Providers or InheritedWidgets) up the tree.

```dart
final color = Theme.of(context).primaryColor;
```

## 6. What is the difference between `mainAxisAlignment` and `crossAxisAlignment`?
In a `Row` or `Column`:
- **Main Axis**: The primary direction (Horizontal for Row, Vertical for Column).
- **Cross Axis**: The perpendicular direction (Vertical for Row, Horizontal for Column).

```dart
Row(
  mainAxisAlignment: MainAxisAlignment.spaceBetween,
  crossAxisAlignment: CrossAxisAlignment.center,
  children: [ /* widgets */ ],
)
```

## 7. What is an `InheritedWidget`?
A special type of widget used to efficiently propagate information down the widget tree. When its data changes, it automatically triggers a rebuild for only the descendants that depend on it.

## 8. What is a `Scaffold`?
A high-level structural widget that implements the basic material design visual layout structure (app bar, drawers, floating action button, bottom navigation).

```dart
Scaffold(
  appBar: AppBar(title: Text("Home")),
  body: Center(child: Text("Content")),
  floatingActionButton: FloatingActionButton(onPressed: () {}),
)
```

## 9. How do you create lists in Flutter?
For a small number of items, use a `Column` or `ListView`. For a large or infinite number of items, use `ListView.builder()` which only builds the widgets that are currently visible on the screen.

```dart
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ListTile(title: Text(items[index]));
  },
)
```

## 10. What is the `Expanded` widget?
A widget that expands a child of a `Row`, `Column`, or `Flex` to fill the available space along the main axis.

```dart
Row(
  children: [
    Icon(Icons.home),
    Expanded(child: Text("This fills remaining space")),
  ],
)
```

## 11. What is the `Flexible` widget?
Similar to `Expanded`, but `Expanded` *forces* the child to fill the space (`fit: FlexFit.tight`), whereas `Flexible` allows the child to be smaller than the available space if it wants to (`fit: FlexFit.loose`).

## 12. What is a `Stack`?
A layout widget that positions its children relative to the edges of its box, stacking them on top of one another (like a FrameLayout in Android).

```dart
Stack(
  alignment: Alignment.center,
  children: [
    Image.asset('background.png'),
    Text("Centered text on image"),
  ],
)
```

## 13. What is a `SafeArea` widget?
A widget that insets its child by sufficient padding to avoid intrusions from the operating system, like the notch on iPhones or the status bar on Android.

## 14. What are Keys in Flutter?
Keys control which widgets the framework matches up with other widgets when a widget rebuilds. They are essential when preserving state in a dynamic collection of identical StatefulWidgets (like reordering a list).

```dart
// Using a ValueKey to identify a specific item
ListView(
  children: items.map((item) => MyWidget(key: ValueKey(item.id))).toList(),
)
```

## 15. What is the difference between `Container` and `SizedBox`?
- `SizedBox`: A lightweight widget used purely for forcing a specific width/height or adding empty spacing.
- `Container`: A heavier, versatile widget that combines padding, margins, sizing, background colors, and borders (decoration).

```dart
SizedBox(height: 16); // Better for just empty space
```

## 16. What is `MediaQuery`?
An InheritedWidget that provides information about the current media (e.g., window size, orientation, system insets) to its descendants.

```dart
final screenWidth = MediaQuery.of(context).size.width;
```

## 17. How do you implement forms and validation?
Use a `Form` widget coupled with a `GlobalKey<FormState>`. Inside the form, use `TextFormField` widgets which have built-in `validator` callbacks.

```dart
final _formKey = GlobalKey<FormState>();
// Later: _formKey.currentState!.validate()
```

## 18. What is the Widget Tree vs Element Tree vs Render Tree?
1. **Widget Tree**: The blueprint (configuration) written by the developer. It is immutable and cheap to rebuild.
2. **Element Tree**: The logical structure that manages the lifecycle and state. It holds references to widgets and render objects.
3. **Render Tree**: The actual objects that do the math for layout (size/position) and painting pixels to the screen.

## 19. What does the `Spacer` widget do?
It creates an adjustable, empty space that can be used to tune the spacing between widgets in a Flex container, like Row or Column.

## 20. How do you hide a widget in Flutter?
Flutter doesn't have a `visibility` property like XML. You either:
1. Don't include it in the tree at all using an `if` statement.
2. Wrap it in a `Visibility` widget (maintains state/space if configured to).
3. Wrap it in an `Offstage` widget (keeps it in the tree but hides it).

```dart
if (showButton) ElevatedButton(onPressed: (){}, child: Text("Click")),
```

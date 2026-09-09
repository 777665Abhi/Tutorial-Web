---
title: "State Management"
description: "Provider, Riverpod, BLoC, GetX, and managing application state."
---

## 1. What is Ephemeral State vs App State?
- **Ephemeral State (Local State)**: State that only matters to a single widget (e.g., current tab, animation progress, text field input). Best managed using `StatefulWidget` and `setState`.
- **App State (Global State)**: State that is shared across multiple parts of the app (e.g., user login info, shopping cart). Requires a state management solution (Provider, Riverpod, BLoC).

## 2. What is `InheritedWidget`?
A base class that allows widgets to propagate data down the tree efficiently. When its data changes, it notifies only the dependent widgets to rebuild, avoiding `setState` at the top of the tree. It is the underlying technology for most state management libraries.

## 3. What is the `Provider` package?
Provider is a wrapper around `InheritedWidget` that makes it much easier to use and highly reusable. It was the officially recommended state management library by Google for years.

```dart
// Providing the state
ChangeNotifierProvider(
  create: (context) => CounterModel(),
  child: MyApp(),
)
```

## 4. How do you consume a Provider?
Using `context.watch<T>()` to rebuild when the state changes, or `context.read<T>()` to access methods without rebuilding.

```dart
// Consuming the state
final counter = context.watch<CounterModel>();
Text('${counter.count}')
```

## 5. What is `ChangeNotifier`?
A class in the Flutter SDK that provides change notification to its listeners. You extend it and call `notifyListeners()` whenever your data changes. Provider listens to these notifications.

```dart
class CounterModel extends ChangeNotifier {
  int count = 0;
  void increment() {
    count++;
    notifyListeners(); // Triggers UI rebuild
  }
}
```

## 6. What is Riverpod?
Riverpod is the modern evolution of Provider (created by the same author). It catches programming errors at compile-time instead of runtime, doesn't depend on the widget tree (BuildContext) to read state, and supports multiple providers of the same type.

```dart
// Declaring a global provider
final counterProvider = StateProvider<int>((ref) => 0);
```

## 7. How do you read state in Riverpod?
You extend `ConsumerWidget` (instead of `StatelessWidget`) which gives you a `WidgetRef`.

```dart
class CounterUI extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);
    return Text('$count');
  }
}
```

## 8. What is the BLoC pattern?
BLoC (Business Logic Component) separates presentation from business logic using Streams. UI sends **Events** to the BLoC, and the BLoC outputs **States** back to the UI. It forces a strict unidirectional data flow.

## 9. How do you implement BLoC using the `flutter_bloc` package?
You define Events, States, and a Bloc class that registers handlers for the events.

```dart
class CounterBloc extends Bloc<CounterEvent, int> {
  CounterBloc() : super(0) {
    on<IncrementEvent>((event, emit) => emit(state + 1));
  }
}
```

## 10. What is a `BlocBuilder`?
A widget that listens to a BLoC and rebuilds its UI in response to new states.

```dart
BlocBuilder<CounterBloc, int>(
  builder: (context, count) {
    return Text('$count');
  },
)
```

## 11. What is the difference between BLoC and Cubit?
A Cubit is a simplified version of a BLoC. Instead of sending Events through a stream, you simply call functions directly on the Cubit, which then emits new states. It reduces boilerplate.

```dart
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);
  void increment() => emit(state + 1);
}
```

## 12. What is GetX?
GetX is a microframework that provides state management, dependency injection, and route management in a very concise, boilerplate-free way. It relies heavily on Dart's extension methods rather than `InheritedWidget`.

```dart
// GetX Controller
class CounterController extends GetxController {
  var count = 0.obs; // Observable variable
  void increment() => count++;
}
```

## 13. How do you use GetX in the UI?
Using `Obx` (Observer) widget, which automatically rebuilds when any observable (`.obs`) inside it changes.

```dart
final c = Get.put(CounterController());
Obx(() => Text('${c.count}'))
```

## 14. What is Redux?
A state management pattern (originally from React) that uses a single global `Store` holding the entire app state. State is immutable and can only be changed by dispatching `Actions` to pure functions called `Reducers`.

## 15. What is MobX?
A state management library that uses transparent functional reactive programming (TFRP). You define `Observables`, `Actions`, and the UI automatically reacts using `Observer` widgets. It relies heavily on code generation (`build_runner`).

## 16. What is `ValueNotifier`?
A simple class built into Flutter that holds a single value. When the value is replaced, it notifies its listeners. Used with `ValueListenableBuilder` to update UI without third-party packages.

```dart
final counter = ValueNotifier<int>(0);
// Later: counter.value++;
```

## 17. How does `ValueListenableBuilder` work?
It listens to a `ValueNotifier` and rebuilds only the widgets within its builder function when the value changes.

```dart
ValueListenableBuilder<int>(
  valueListenable: counter,
  builder: (context, value, child) {
    return Text('$value');
  },
)
```

## 18. Why should you avoid `setState` for Global State?
`setState` only updates the widget it belongs to (and its children). If you need to update a widget in a completely different part of the tree, passing callbacks up and state down through every widget is messy and unmaintainable (Prop Drilling).

## 19. What is Prop Drilling?
The anti-pattern of passing data down through multiple layers of the widget tree via constructors just to reach a deeply nested child that actually needs the data. State management tools solve this.

## 20. How do you choose a State Management solution?
- **Small apps/Local state**: `setState` or `ValueNotifier`.
- **Medium apps**: `Provider` or `Riverpod`.
- **Large/Enterprise apps**: `BLoC` (forces strict architecture and is highly testable).
- **Rapid Prototyping**: `GetX`.

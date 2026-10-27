---
title: "State Management"
description: "Provider, Riverpod, BLoC, GetX, and managing application state."
---

## 1. What is Ephemeral State vs App State?
- **Ephemeral State (Local State)**: State that only matters to a single widget (e.g., current tab, animation progress, text field input). Best managed using `StatefulWidget` and `setState`.
- **App State (Global State)**: State that is shared across multiple parts of the app (e.g., user login info, shopping cart). Requires a state management solution (Provider, Riverpod, BLoC).

**The test is simple: does any other part of the app need to read or change this?** If no, it's ephemeral and belongs in a `StatefulWidget`. If yes, it's app state and needs to live outside the widget tree.

**Ephemeral examples** — and notice how unremarkable they are: which tab is selected, whether a password field is obscured, the current page of a `PageView`, animation progress, whether a card is expanded, the text currently in a search box before submission.

**App state examples:** the logged-in user, the shopping cart, a cached feed, user preferences, offline sync status, the theme mode.

**The boundary genuinely is fuzzy, and good answers say so.** A search query starts as ephemeral — it's just text in a field. The moment you want to preserve it across navigation, share it with an analytics service, or restore it after the app restarts, it's become app state. "It depends on your app" is the honest answer, and the Flutter documentation says exactly that.

**The cost of getting it wrong, in both directions:**

- **Ephemeral state promoted to global** — a BLoC for whether a dropdown is open. This adds ceremony, makes the widget non-reusable (it now depends on a global provider), and creates coupling where none was needed.
- **App state left local** — the cart stored in a `StatefulWidget`. It's lost on navigation, can't be read from the app bar badge, and leads to prop drilling (question 19) or duplicated copies that drift apart.

**The practical default** is to start ephemeral and promote when a second consumer appears. Promotion is a small refactor; demotion from a global store rarely happens because nobody dares.

**One nuance worth adding:** "ephemeral" doesn't mean "unimportant" — it means *scoped*. Text being typed into a form is important, but it belongs to that form. If it must survive the screen being destroyed, that's a different requirement (state restoration), solved with `RestorationMixin` or by lifting the state, not necessarily by making it global.

## 2. What is `InheritedWidget`?
A base class that allows widgets to propagate data down the tree efficiently. When its data changes, it notifies only the dependent widgets to rebuild, avoiding `setState` at the top of the tree. It is the underlying technology for most state management libraries.

**The efficiency is O(1) lookup, and that's the key mechanism.** Each `Element` keeps a map of the inherited widgets available at its position, built as the tree is constructed. So `Theme.of(context)` is a hash-map lookup, not a walk up the tree — which is why it's cheap enough to call in every `build`.

```dart
class UserScope extends InheritedWidget {
  const UserScope({super.key, required this.user, required super.child});
  final User user;

  static User of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<UserScope>()!.user;

  @override
  bool updateShouldNotify(UserScope old) => user != old.user;
}
```

**`updateShouldNotify` is where the selective rebuilding lives.** Return `false` and no dependent rebuilds even though the widget was recreated. This is also why your state classes need a proper `==` — without it, every rebuild notifies everyone.

**Two lookup methods with an important difference:**

- **`dependOnInheritedWidgetOfExactType<T>()`** — reads *and subscribes*, so this widget rebuilds on change.
- **`getInheritedWidgetOfExactType<T>()`** — reads without subscribing. Correct in callbacks and `initState`, where you want the value but not a rebuild dependency.

This distinction is exactly what Provider exposes as `context.watch` versus `context.read`.

**Its limitation explains why packages exist.** An `InheritedWidget` is immutable, so changing the data means rebuilding it — which requires a `StatefulWidget` above it. The canonical pattern is:

```
StatefulWidget (holds mutable state, calls setState)
  └── InheritedWidget (exposes it, decides who rebuilds)
      └── your app
```

Writing that by hand for every piece of state is tedious and error-prone. **`Provider` is essentially a well-tested, generic implementation of this pattern**, and Riverpod's scopes, `flutter_bloc`'s `BlocProvider`, and `GetIt`'s scoped lookups all sit on the same foundation.

**Flutter itself is built on it:** `Theme`, `MediaQuery`, `Navigator`, `Directionality`, `DefaultTextStyle`, `Localizations`, `Form`, `ScaffoldMessenger`.

**Related framework classes:** `InheritedNotifier` (rebuilds dependents when a `Listenable` fires) and `InheritedModel` (lets dependents subscribe to specific *aspects* of the data, for even finer-grained rebuilds).

## 3. What is the `Provider` package?
Provider is a wrapper around `InheritedWidget` that makes it much easier to use and highly reusable. It was the officially recommended state management library by Google for years.

```dart
// Providing the state
ChangeNotifierProvider(
  create: (context) => CounterModel(),
  child: MyApp(),
)
```

**What it adds over raw `InheritedWidget`:** automatic disposal of the provided object, lazy creation (the `create` callback runs on first access, not immediately), `Consumer` and `Selector` for granular rebuilds, clear runtime errors when a provider is missing, and no boilerplate `of()` method to write.

**The provider types, each for a different kind of value:**

```dart
Provider<T>(create: ...)                  // plain immutable value, no listening
ChangeNotifierProvider<T>(create: ...)    // listens to notifyListeners()
FutureProvider<T>(create: ...)            // exposes a Future's result
StreamProvider<T>(create: ...)            // exposes a Stream's latest value
ProxyProvider<A, B>(update: ...)          // a provider that depends on another
ValueListenableProvider<T>(value: ...)    // wraps a ValueNotifier
```

**`MultiProvider` keeps nesting flat** — otherwise five providers means five levels of indentation:

```dart
MultiProvider(
  providers: [
    Provider<ApiClient>(create: (_) => ApiClient()),
    ChangeNotifierProvider(create: (c) => CartModel(c.read<ApiClient>())),
    ProxyProvider<AuthModel, UserRepo>(update: (_, auth, __) => UserRepo(auth.token)),
  ],
  child: const MyApp(),
)
```

**`create` vs. `value` is a real trap.** Use `create:` when the provider should own and dispose the object. Use `.value` when passing an object that already exists and is owned elsewhere — passing an existing object to `create:` means it gets disposed when the provider unmounts, which will break the other owner:

```dart
ChangeNotifierProvider.value(value: existingModel, child: ...)   // not disposed
ChangeNotifierProvider(create: (_) => Model(), child: ...)       // disposed for you
```

**Its known weaknesses**, which is what motivated Riverpod:

- **Runtime errors, not compile-time.** A missing provider throws `ProviderNotFoundException` when that code path runs, not when you build.
- **Type-based lookup** means you can't have two providers of the same type in scope.
- **Requires `BuildContext`**, so reading state outside the widget tree is awkward.
- **Combining providers** via `ProxyProvider` gets unwieldy quickly.

**Its status today:** still widely used, still maintained, and perfectly reasonable — especially in existing codebases. But its author now recommends Riverpod for new projects, and the official Flutter documentation no longer singles Provider out as *the* recommendation.

## 4. How do you consume a Provider?
Using `context.watch<T>()` to rebuild when the state changes, or `context.read<T>()` to access methods without rebuilding.

```dart
// Consuming the state
final counter = context.watch<CounterModel>();
Text('${counter.count}')
```

**The three access methods, and when each is correct:**

- **`context.watch<T>()`** — reads **and subscribes**. The widget rebuilds when `T` notifies. Use in `build`.
- **`context.read<T>()`** — reads **without** subscribing. Use in callbacks (`onPressed`, `initState`) where you want to *call a method*, not react to changes.
- **`context.select<T, R>((t) => t.field)`** — subscribes to **one field only**. The widget rebuilds only when that specific value changes.

```dart
@override
Widget build(BuildContext context) {
  // Rebuilds only when `count` changes, not on every notifyListeners()
  final count = context.select<CounterModel, int>((m) => m.count);

  return ElevatedButton(
    // read: we only want to call a method, not subscribe
    onPressed: () => context.read<CounterModel>().increment(),
    child: Text('$count'),
  );
}
```

**The classic error — `read` vs. `watch` in the wrong place:**

- **`watch` in a callback** throws, because callbacks run outside the build phase and can't register a dependency.
- **`read` in `build`** compiles and runs, but the UI silently never updates. This is the more dangerous one, because there's no error — just a screen that doesn't change.

**`Consumer` limits the rebuild scope**, which is the main performance tool:

```dart
Column(
  children: [
    const ExpensiveHeader(),              // never rebuilds
    Consumer<CounterModel>(
      builder: (context, model, child) => Text('${model.count}'),
    ),                                     // ONLY this rebuilds
  ],
)
```

Using `context.watch` at the top of a big `build` method rebuilds the entire subtree; `Consumer` confines it.

**The `child` parameter is an under-used optimisation** — it's built once and passed into every rebuild, so expensive subtrees inside a `Consumer` aren't recreated:

```dart
Consumer<CartModel>(
  child: const ExpensiveIcon(),                 // built once
  builder: (context, cart, child) => Row(children: [child!, Text('${cart.count}')]),
)
```

**`Selector` is the more explicit version of `select`**, with an optional `shouldRebuild` for custom comparison.

**A note on `listen: false`:** `Provider.of<T>(context, listen: false)` is the older syntax for `context.read<T>()`. They're equivalent; the extension methods are clearer and preferred.

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

**It's in the Flutter SDK, not a package** — `ChangeNotifier` implements `Listenable`, the same interface `Animation` and `ValueNotifier` use. So it works with `AnimatedBuilder` and `ListenableBuilder` directly, with or without Provider.

**A more realistic model** with loading and error states:

```dart
class UserModel extends ChangeNotifier {
  UserModel(this._repo);
  final UserRepository _repo;

  User? _user;
  bool _loading = false;
  String? _error;

  User? get user => _user;              // expose read-only getters
  bool get isLoading => _loading;
  String? get error => _error;

  Future<void> load(String id) async {
    _loading = true;
    _error = null;
    notifyListeners();                  // show the spinner

    try {
      _user = await _repo.fetch(id);
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();                // show the result
    }
  }
}
```

**Expose getters, keep fields private.** A public mutable field lets the UI change state without notifying, which produces a view that silently disagrees with the model.

**The mistakes that actually bite:**

- **Forgetting `notifyListeners()`** — the state changes and the UI doesn't. The most common `ChangeNotifier` bug, and there's no error to tell you.
- **Mutating a list in place.** `_items.add(x); notifyListeners();` works for `ChangeNotifier` (since it notifies unconditionally), but breaks `Selector`/`select`, which compare old and new — and the list is the same object. Replace the list instead: `_items = [..._items, x]`.
- **Calling `notifyListeners()` after `dispose()`** — throws. Guard async callbacks, or cancel subscriptions in `dispose`.
- **Notifying too often** — once per field change in a loop causes a rebuild per iteration. Batch the changes and notify once.

**Always `dispose()`** — `ChangeNotifierProvider` does this for you when created with `create:`, which is one of its main benefits. Standalone notifiers you create yourself must be disposed manually.

**Its limitation as an architecture:** `ChangeNotifier` is **mutable state with imperative updates**. There's no record of *what* changed, no way to replay state transitions, and it's easy to end up with a 500-line "god notifier." That's the trade — it's simple and low-ceremony, which is exactly right for small to medium state, and exactly what BLoC's event/state discipline is designed to replace at scale.

## 6. What is Riverpod?
Riverpod is the modern evolution of Provider (created by the same author). It catches programming errors at compile-time instead of runtime, doesn't depend on the widget tree (BuildContext) to read state, and supports multiple providers of the same type.

```dart
// Declaring a global provider
final counterProvider = StateProvider<int>((ref) => 0);
```

**The name is an anagram of "Provider"** — and the rewrite exists to fix four specific problems:

1. **Compile-time safety.** Providers are top-level variables, so a typo is a compile error. There is no `ProviderNotFoundException`, because the provider is a Dart object you reference directly.
2. **No `BuildContext` needed.** You can read providers from anywhere — other providers, services, tests — not only from inside the widget tree.
3. **Multiple providers of the same type.** Provider looks up by *type*, so two `Provider<String>`s conflict. Riverpod looks up by *identity*, so you can have as many as you like.
4. **Composition is natural.** A provider reads others via `ref.watch`, with automatic dependency tracking and recomputation.

**The provider types:**

```dart
// Immutable value / dependency injection
final repoProvider = Provider<UserRepo>((ref) => UserRepo(ref.watch(apiProvider)));

// Async — gives you AsyncValue (loading/data/error) for free
final userProvider = FutureProvider<User>((ref) => ref.watch(repoProvider).fetch());

// Stream
final messagesProvider = StreamProvider<List<Msg>>((ref) => ref.watch(dbProvider).watchAll());

// Mutable state with logic — the main workhorse
final cartProvider = NotifierProvider<CartNotifier, Cart>(CartNotifier.new);
```

**`AsyncValue` is one of the best parts**, because it makes handling loading and error states exhaustive rather than optional:

```dart
ref.watch(userProvider).when(
  data: (user) => Text(user.name),
  loading: () => const CircularProgressIndicator(),
  error: (e, st) => Text('Error: $e'),
);
```

**Modifiers solve real problems concisely:**

- **`.family`** — a parameterised provider: `userProvider(userId)`.
- **`.autoDispose`** — destroys state when nothing is listening, which prevents the "every provider lives forever" memory growth that plagues global stores.

```dart
final userProvider = FutureProvider.autoDispose.family<User, String>(
  (ref, id) => ref.watch(repoProvider).fetch(id),
);
```

**Code generation** (`riverpod_generator`) is now the recommended style — you annotate a function with `@riverpod` and the provider is generated, which removes the need to pick the right provider type by hand.

**Testing is a genuine strength:** `ProviderContainer` with `overrides` lets you swap any provider for a fake with no widget tree at all.

**The honest downside:** more concepts to learn than Provider, and the API has changed significantly across major versions, so older tutorials are often misleading.

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

**`ref` has four methods, and choosing correctly is most of the skill:**

- **`ref.watch(p)`** — read and **subscribe**. Rebuilds on change. Use in `build`.
- **`ref.read(p)`** — read **once**, no subscription. Use in callbacks.
- **`ref.listen(p, cb)`** — run a **side effect** on change without rebuilding. Use for navigation, snackbars, dialogs.
- **`ref.refresh(p)` / `ref.invalidate(p)`** — force recomputation.

```dart
class UserPage extends ConsumerWidget {
  const UserPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Side effects belong in listen, never in build
    ref.listen<AsyncValue<User>>(userProvider, (prev, next) {
      next.whenOrNull(
        error: (e, _) => ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e'))),
      );
    });

    final user = ref.watch(userProvider);

    return Scaffold(
      body: user.when(
        data: (u) => Text(u.name),
        loading: () => const CircularProgressIndicator(),
        error: (e, _) => Text('$e'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => ref.read(userProvider.notifier).refresh(),  // read in callback
      ),
    );
  }
}
```

**`ref.listen` is the right tool for one-shot reactions.** Showing a snackbar inside `build` fires again on every rebuild; `listen` fires only on an actual state change.

**The widget variants:**

- **`ConsumerWidget`** — stateless with a `ref`.
- **`ConsumerStatefulWidget`** + `ConsumerState` — stateful with a `ref` (and `ref` is available in `initState` here).
- **`Consumer`** — a builder you drop into an existing tree to limit the rebuild scope, exactly like Provider's `Consumer`.

```dart
Column(children: [
  const ExpensiveHeader(),
  Consumer(builder: (context, ref, _) => Text('${ref.watch(countProvider)}')),
])
```

**`select` narrows the subscription** so you rebuild only on the field you care about:

```dart
final name = ref.watch(userProvider.select((u) => u.name));
```

**Notifier access:** `ref.watch(p)` gives the **state**; `ref.read(p.notifier)` gives the **notifier** to call methods on. Mixing these up is the most common Riverpod mistake — watching the notifier gives you an object that doesn't change, so nothing rebuilds.

## 8. What is the BLoC pattern?
BLoC (Business Logic Component) separates presentation from business logic using Streams. UI sends **Events** to the BLoC, and the BLoC outputs **States** back to the UI. It forces a strict unidirectional data flow.

**The flow, which is the whole idea:**

```
  UI ──── Event ────▶ BLoC ──── State ────▶ UI
  ▲                    │                     │
  └────────────────────┴─────────────────────┘
       (the only path a change can take)
```

The UI never mutates state. It *announces* that something happened (`LoginButtonPressed`), and the BLoC decides what the new state should be. That single constraint gives you reproducibility: any state is the result of a known sequence of events applied to a known initial state.

```dart
// Events — what happened
sealed class AuthEvent {}
class LoginRequested extends AuthEvent {
  LoginRequested(this.email, this.password);
  final String email, password;
}
class LogoutRequested extends AuthEvent {}

// States — what the UI should show
sealed class AuthState {}
class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthSuccess extends AuthState {
  AuthSuccess(this.user);
  final User user;
}
class AuthFailure extends AuthState {
  AuthFailure(this.message);
  final String message;
}
```

**Using `sealed` classes (Dart 3) makes the `switch` exhaustive**, so adding a new state causes a compile error anywhere you forgot to handle it. That's a significant safety improvement over the old `abstract class` approach.

**What BLoC buys you**, which is what justifies the ceremony:

- **Testability** — a BLoC is pure Dart with no Flutter dependency. `bloc_test` lets you assert on exact state sequences.
- **Traceability** — `BlocObserver` logs every event and transition globally, which is excellent for debugging and analytics.
- **Predictability** — the same event sequence always produces the same states.
- **Team scalability** — the structure is uniform, so any developer can read any feature.

**The honest cost:** boilerplate. A simple counter needs an event class, a state class, a BLoC, and a builder — where `setState` needs one line. This is why Cubit exists (question 11) and why BLoC is a poor fit for small apps.

**It came from Google** (a 2018 Google I/O talk about sharing logic between Flutter and AngularDart) and was popularised by Felix Angelov's `flutter_bloc` package, which is what everyone actually uses.

## 9. How do you implement BLoC using the `flutter_bloc` package?
You define Events, States, and a Bloc class that registers handlers for the events.

```dart
class CounterBloc extends Bloc<CounterEvent, int> {
  CounterBloc() : super(0) {
    on<IncrementEvent>((event, emit) => emit(state + 1));
  }
}
```

**A realistic BLoC** with async work, dependencies, and error handling:

```dart
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc(this._repo) : super(AuthInitial()) {
    on<LoginRequested>(_onLogin);
    on<LogoutRequested>(_onLogout);
  }

  final AuthRepository _repo;

  Future<void> _onLogin(LoginRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final user = await _repo.login(event.email, event.password);
      emit(AuthSuccess(user));
    } on AuthException catch (e) {
      emit(AuthFailure(e.message));
    }
  }

  Future<void> _onLogout(LogoutRequested event, Emitter<AuthState> emit) async {
    await _repo.logout();
    emit(AuthInitial());
  }
}
```

**Providing and dispatching:**

```dart
BlocProvider(
  create: (context) => AuthBloc(context.read<AuthRepository>()),
  child: const LoginPage(),
)

// From the UI
context.read<AuthBloc>().add(LoginRequested(email, password));
```

**Event transformers** are a genuinely useful feature people often don't know about. By default events are processed concurrently; `bloc_concurrency` lets you change that per handler:

```dart
on<SearchChanged>(
  _onSearch,
  transformer: debounce(const Duration(milliseconds: 300)),   // debounce typing
);

on<SubmitPressed>(_onSubmit, transformer: droppable());       // ignore double-taps
on<LoadPage>(_onLoad, transformer: sequential());             // process in order
```

`restartable()` (cancel the previous) is the right choice for search-as-you-type.

**`BlocObserver` gives you global instrumentation** in a few lines:

```dart
class AppObserver extends BlocObserver {
  @override
  void onTransition(Bloc bloc, Transition transition) {
    super.onTransition(bloc, transition);
    log('${bloc.runtimeType}: ${transition.event} → ${transition.nextState}');
  }
}
Bloc.observer = AppObserver();
```

**Two rules to follow:** `emit` only from inside a handler (emitting after the handler returns throws), and never emit the same state twice expecting a rebuild — `BlocBuilder` compares with `==`, so an identical state is skipped. Use `freezed` or `Equatable` on your state classes so equality is meaningful.

**`HydratedBloc`** persists state across restarts automatically, which is a common follow-on requirement.

## 10. What is a `BlocBuilder`?
A widget that listens to a BLoC and rebuilds its UI in response to new states.

```dart
BlocBuilder<CounterBloc, int>(
  builder: (context, count) {
    return Text('$count');
  },
)
```

**There are four widgets in this family**, and knowing which to use is the real content:

- **`BlocBuilder`** — rebuilds UI on state change. **No side effects.**
- **`BlocListener`** — runs side effects, **no rebuild**. For navigation, snackbars, dialogs.
- **`BlocConsumer`** — both, when you need them together.
- **`BlocSelector`** — rebuilds only when a selected slice of state changes.

```dart
BlocConsumer<AuthBloc, AuthState>(
  listener: (context, state) {
    // Side effects — fires ONCE per state change
    if (state is AuthFailure) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.message)));
    }
    if (state is AuthSuccess) Navigator.pushReplacementNamed(context, '/home');
  },
  builder: (context, state) => switch (state) {
    AuthLoading() => const CircularProgressIndicator(),
    AuthFailure(:final message) => ErrorView(message),
    _ => const LoginForm(),
  },
)
```

**Why side effects must go in `listener`, not `builder`:** `builder` can be called multiple times for the same state (a parent rebuild, a hot reload, a media query change). Navigating or showing a snackbar from `builder` fires repeatedly — the classic "two snackbars appeared" bug. `listener` fires exactly once per state *transition*.

**`buildWhen` and `listenWhen`** give you fine control:

```dart
BlocBuilder<CounterBloc, int>(
  buildWhen: (previous, current) => current.isEven,   // only rebuild on even numbers
  builder: (context, count) => Text('$count'),
)
```

**`BlocSelector` is the targeted version**, and better than `buildWhen` when you only care about one field:

```dart
BlocSelector<ProfileBloc, ProfileState, String>(
  selector: (state) => state.username,
  builder: (context, username) => Text(username),   // rebuilds only on username change
)
```

**Dart 3 switch expressions with sealed states** are the modern idiom in `builder` — exhaustive, so adding a new state produces a compile error rather than a silently missing branch.

**Scope the builders tightly.** Wrapping your whole screen in one `BlocBuilder` rebuilds everything on any state change; placing several small builders around the specific widgets that depend on specific fields is both faster and clearer.

## 11. What is the difference between BLoC and Cubit?
A Cubit is a simplified version of a BLoC. Instead of sending Events through a stream, you simply call functions directly on the Cubit, which then emits new states. It reduces boilerplate.

```dart
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);
  void increment() => emit(state + 1);
}
```

**`Bloc` actually extends `Cubit`.** A Cubit is the base: state in, `emit` out. A Bloc adds the event layer on top. So they interoperate completely — `BlocBuilder`, `BlocProvider` and `BlocListener` all work with either, and you can mix them in one app.

**Side by side, the same feature:**

```dart
// Cubit — direct method calls
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);
  void increment() => emit(state + 1);
}
context.read<CounterCubit>().increment();

// Bloc — events, handlers, and two extra classes
sealed class CounterEvent {}
class Increment extends CounterEvent {}

class CounterBloc extends Bloc<CounterEvent, int> {
  CounterBloc() : super(0) {
    on<Increment>((event, emit) => emit(state + 1));
  }
}
context.read<CounterBloc>().add(Increment());
```

**What you gain by paying the Bloc tax:**

- **Traceability** — events are first-class objects, so `BlocObserver` logs *what the user did*, not just that the state changed. Invaluable for debugging production issues and for analytics.
- **Event transformers** — debounce, throttle, droppable, restartable, sequential. There is no Cubit equivalent; you'd hand-roll it.
- **Event sourcing** — the event stream can be recorded and replayed.
- **A clearer audit trail** in a large team, because the set of possible actions is enumerated in one place.

**What you gain with Cubit:** far less code, a more obvious call site (`increment()` reads better than `add(Increment())`), and an easier path for developers new to the pattern.

**The pragmatic recommendation**, which is what a good answer gives: **start with Cubit and promote to Bloc when you need what it offers.** The migration is mechanical. Many production apps use Cubit for simple features (a settings toggle, a theme switcher) and Bloc for the complex ones (search with debouncing, a multi-step checkout, anything needing an audit trail).

The `flutter_bloc` documentation makes the same recommendation — Cubit is not a lesser tool, it's the right tool when you don't need events.

## 12. What is GetX?
GetX is a microframework that provides state management, dependency injection, and route management in a very concise, boilerplate-free way. It relies heavily on Dart's extension methods rather than `InheritedWidget`.

```dart
// GetX Controller
class CounterController extends GetxController {
  var count = 0.obs; // Observable variable
  void increment() => count++;
}
```

**Its selling point is doing three jobs in one package with minimal code:**

```dart
// State
class CartController extends GetxController {
  final items = <Item>[].obs;
  int get total => items.fold(0, (s, i) => s + i.price);
  void add(Item i) => items.add(i);          // UI updates automatically
}

// Dependency injection — no BuildContext
Get.put(CartController());
final cart = Get.find<CartController>();

// Navigation — no BuildContext
Get.to(() => const DetailPage());
Get.snackbar('Done', 'Item added');
Get.dialog(const MyDialog());
```

**The "no BuildContext" property is both its biggest selling point and its biggest criticism.** Being able to navigate and show dialogs from anywhere is genuinely convenient; it's also a global service locator, which hides dependencies and makes code harder to test and reason about.

**Be prepared to give a balanced assessment**, because interviewers often ask about GetX specifically to see whether you evaluate tools critically.

**The case for it:** extremely fast to write, minimal boilerplate, one dependency instead of four, a gentle learning curve, and genuinely productive for prototypes, small apps and solo projects.

**The case against it**, which is the mainstream view in the Flutter community:

- **It does too much.** State, DI, routing, i18n, validation, storage and HTTP in one package — the opposite of separation of concerns, and hard to replace piecemeal.
- **Magic over explicitness.** `Get.find<T>()` anywhere makes the dependency graph invisible.
- **It fights the framework** rather than building on `InheritedWidget`, which means it sometimes diverges from Flutter's own lifecycle behaviour.
- **Testing is harder** because of the global state and implicit lookups.
- **Maintenance and governance concerns** have been raised repeatedly in the community.

**The nuance:** GetX is not "wrong" — plenty of shipped apps use it successfully. But most teams building something they'll maintain for years choose Riverpod or BLoC, and you should be able to say why: explicit dependencies, compile-time safety, and testability matter more at scale than lines saved.

## 13. How do you use GetX in the UI?
Using `Obx` (Observer) widget, which automatically rebuilds when any observable (`.obs`) inside it changes.

```dart
final c = Get.put(CounterController());
Obx(() => Text('${c.count}'))
```

**How `.obs` works:** it wraps a value in an `Rx<T>` type. Reading `.value` **inside an `Obx` builder** registers that `Obx` as a listener; writing to it notifies them. The dependency tracking is automatic — you never declare what to listen to.

```dart
final count = 0.obs;            // RxInt
final name = ''.obs;            // RxString
final items = <Item>[].obs;     // RxList
final user = Rx<User?>(null);   // Rx with an explicit type

count.value++;
count++;                        // operator shortcut for ints
items.add(x);                   // RxList notifies on mutation
```

**The three reactive widgets:**

- **`Obx(() => ...)`** — the simplest; tracks whatever observables you read inside.
- **`GetX<Controller>(builder: ...)`** — gives you the controller, and can create it.
- **`GetBuilder<Controller>(builder: ...)`** — **not** reactive; rebuilds only when you call `update()` manually. More efficient when you don't need automatic tracking.

**The trap everyone hits: "Obx improper use" / the builder has no observables.** `Obx` must *read* an observable **inside** its builder. Reading it outside and passing the value in means nothing is tracked:

```dart
// BROKEN — the value is read outside, so Obx tracks nothing
final value = c.count.value;
Obx(() => Text('$value'));

// CORRECT — read inside the builder
Obx(() => Text('${c.count.value}'));
```

**Dependency lifecycle:**

```dart
Get.put(Controller());              // create immediately, keep alive
Get.lazyPut(() => Controller());    // create on first Get.find
Get.put(Controller(), permanent: true);   // survive route changes
Get.delete<Controller>();           // dispose manually
```

Controllers are auto-disposed when their route is popped, unless `permanent: true` — which is a common source of "my controller was disposed" errors when a controller is used across routes.

**`GetxController` has lifecycle hooks** — `onInit()`, `onReady()` (after the first frame, safe for dialogs and navigation) and `onClose()` (dispose your resources here).

**Keep `Obx` scopes small**, exactly as with any other builder — wrapping a whole page in one `Obx` rebuilds the page on every observable change.

## 14. What is Redux?
A state management pattern (originally from React) that uses a single global `Store` holding the entire app state. State is immutable and can only be changed by dispatching `Actions` to pure functions called `Reducers`.

**The three principles**, which are what make Redux Redux:

1. **Single source of truth** — one store holds the entire application state as one object tree.
2. **State is read-only** — the only way to change it is to dispatch an action describing what happened.
3. **Changes are made by pure functions** — reducers take `(state, action)` and return a *new* state. No mutation, no side effects, no async.

```dart
// State — immutable
class AppState {
  const AppState({required this.count, required this.user});
  final int count;
  final User? user;

  AppState copyWith({int? count, User? user}) =>
      AppState(count: count ?? this.count, user: user ?? this.user);
}

// Actions — plain descriptions of what happened
class IncrementAction {}
class SetUserAction {
  SetUserAction(this.user);
  final User user;
}

// Reducer — pure: same inputs always give the same output
AppState reducer(AppState state, dynamic action) {
  if (action is IncrementAction) return state.copyWith(count: state.count + 1);
  if (action is SetUserAction) return state.copyWith(user: action.user);
  return state;
}
```

**Async needs middleware**, because reducers must stay pure. `redux_thunk` or `redux_epics` handle API calls, then dispatch a plain action with the result.

**What purity buys you** — and these are genuinely valuable properties:

- **Time-travel debugging.** Because every state is derived from a sequence of actions, you can step backwards and forwards through them.
- **Perfect reproducibility.** A bug report can include the action log, and you can replay it exactly.
- **Trivially testable reducers** — pure functions with no mocking required.
- **A single place to inspect all state.**

**Why it never caught on in Flutter**, which is the useful comparison:

- **Heavy boilerplate** — action classes, reducers, middleware, and `copyWith` for every change.
- **One global state tree** doesn't fit Flutter's composable, tree-scoped model as naturally as it fits React.
- **BLoC offers most of the same benefits** (unidirectional flow, immutable state, traceability via `BlocObserver`) while scoping state per feature rather than globally.
- **Dart lacks the ergonomics** React has — no JSX-adjacent tooling, no mature devtools equivalent.

**Where you might still meet it:** teams migrating from React Native who already think in Redux, or very large apps that specifically want a single auditable state tree. `flutter_redux` is the package. For most new Flutter work, BLoC is the idiomatic way to get the same discipline.

## 15. What is MobX?
A state management library that uses transparent functional reactive programming (TFRP). You define `Observables`, `Actions`, and the UI automatically reacts using `Observer` widgets. It relies heavily on code generation (`build_runner`).

**"Transparent" means the dependency tracking is automatic.** You never declare what a widget depends on — MobX records which observables were *read* during a build and subscribes to exactly those. Change one and only the widgets that actually read it rebuild.

**The three core concepts:**

- **Observables** — state that can be watched.
- **Actions** — the only things that should mutate observables (batched, so one action means one notification).
- **Reactions** — things that respond: `Observer` widgets, `autorun`, `reaction`, and **computed** values that derive from observables and cache automatically.

```dart
part 'counter_store.g.dart';

class CounterStore = _CounterStore with _$CounterStore;

abstract class _CounterStore with Store {
  @observable
  int count = 0;

  @observable
  ObservableList<Item> items = ObservableList<Item>();

  @computed
  bool get isEven => count % 2 == 0;      // cached; recomputed only when count changes

  @action
  void increment() => count++;
}
```

```dart
Observer(builder: (_) => Text('${store.count}'))   // rebuilds only on count change
```

**Computed values are a genuine strength.** They're memoised and recomputed lazily only when their dependencies change — so a derived total, filtered list, or validation flag costs nothing when nothing relevant changed. Getting the same behaviour in Provider or BLoC takes manual effort.

**The code generation is the main friction.** Every store needs `part 'x.g.dart'`, the odd `class X = _X with _$X` syntax, and a `build_runner watch` process running during development. Forgetting to regenerate produces confusing errors.

**Where it sits versus the alternatives:**

- **vs. BLoC** — MobX is far less boilerplate but gives up the explicit event log and the enforced unidirectional flow. State can be mutated from anywhere an action is callable.
- **vs. Riverpod** — similar granular reactivity and similar computed-value support, but Riverpod achieves it without the `build_runner` ceremony (unless you opt into its generator) and with better compile-time safety.

**Its popularity has declined** as Riverpod matured, because Riverpod offers comparable ergonomics with less tooling. MobX remains a solid choice, particularly for teams with JavaScript MobX experience, and `mobx_triple` and similar patterns are used in production. But it's rarely the default recommendation for a new Flutter project today.

## 16. What is `ValueNotifier`?
A simple class built into Flutter that holds a single value. When the value is replaced, it notifies its listeners. Used with `ValueListenableBuilder` to update UI without third-party packages.

```dart
final counter = ValueNotifier<int>(0);
// Later: counter.value++;
```

**It's `ChangeNotifier` specialised to a single value** — `ValueNotifier<T> extends ChangeNotifier implements ValueListenable<T>`. Setting `.value` notifies automatically, so there's no `notifyListeners()` to forget.

**It's in the SDK**, which is the main appeal: zero dependencies, nothing to learn, and it composes with `ValueListenableBuilder`, `AnimatedBuilder` and `ListenableBuilder`.

**The critical gotcha: it compares with `==` before notifying.** Mutating an object in place and reassigning the same reference notifies **nothing**:

```dart
final items = ValueNotifier<List<String>>([]);

items.value.add('x');          // ✗ NOTHING HAPPENS — same list instance
items.value = [...items.value, 'x'];   // ✓ new instance → notifies
```

This catches people constantly with lists, maps, and mutable model objects. The rule is **always assign a new instance**, which also means your state objects want a proper `==` (via `freezed` or `Equatable`) so the comparison is meaningful rather than referential.

**Always dispose it** when it's owned by a `State`:

```dart
final _expanded = ValueNotifier<bool>(false);

@override
void dispose() {
  _expanded.dispose();
  super.dispose();
}
```

**Where it's genuinely the right tool:**

- **Localised state inside a widget** that would otherwise force a whole-subtree `setState` — a toggle, a slider value, a hover state.
- **Passing a small piece of mutable state down** to a child without a package.
- **Inside custom widgets and packages**, where adding a state management dependency would be inappropriate.
- **Flutter's own APIs** — `TextEditingController`, `ScrollController`'s position, and `AnimationController` are all `Listenable`s you consume the same way.

**Its limit:** it holds one value with no logic, no async handling, no dependency injection, and no scoping. Several related values mean several notifiers, which quickly becomes worse than a proper solution. `ValueNotifier` is for *small* state — reach for Provider, Riverpod or BLoC when the state has structure or lifecycle.

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

**Its value is precision.** `setState` rebuilds the entire `State`'s subtree; `ValueListenableBuilder` rebuilds only what's inside its `builder`. That makes it the cheapest way to do a targeted rebuild without any package:

```dart
Column(children: [
  const ExpensiveHeader(),               // never rebuilds
  ExpensiveChart(data: data),            // never rebuilds
  ValueListenableBuilder<int>(
    valueListenable: _counter,
    builder: (context, value, _) => Text('$value'),   // ONLY this rebuilds
  ),
])
```

With `setState`, all three rebuild.

**The `child` parameter is the under-used optimisation.** It's built **once**, outside the builder, and passed in on every rebuild — so expensive widgets that don't depend on the value aren't recreated:

```dart
ValueListenableBuilder<bool>(
  valueListenable: _isFavourite,
  child: const ExpensiveAvatar(),            // built once, reused
  builder: (context, isFav, child) => Row(
    children: [
      child!,                                 // the same instance every time
      Icon(isFav ? Icons.star : Icons.star_border),
    ],
  ),
)
```

The same `child` pattern exists on `AnimatedBuilder`, `Consumer` (Provider) and `BlocBuilder`, and it's worth knowing generally.

**Related builders in the family:**

- **`ListenableBuilder`** — the general version; works with any `Listenable`, including `ChangeNotifier`, `AnimationController`, `TextEditingController` and `ScrollController`.
- **`AnimatedBuilder`** — functionally the same thing, historically used for animations (and still the common idiom there).
- **`ValueListenableBuilder` with `Listenable.merge([a, b])`** — react to several notifiers at once.

```dart
ListenableBuilder(
  listenable: _textController,
  builder: (context, _) => Text('${_textController.text.length} chars'),
)
```

**When to use it rather than a package:** for local UI state inside one widget, where introducing Provider or Riverpod would be heavier than the problem. For shared or app-level state, a proper solution gives you scoping, DI and testability that this doesn't.

## 18. Why should you avoid `setState` for Global State?
`setState` only updates the widget it belongs to (and its children). If you need to update a widget in a completely different part of the tree, passing callbacks up and state down through every widget is messy and unmaintainable (Prop Drilling).

**Four concrete problems**, beyond the prop drilling the answer names:

**1. The rebuild scope is wrong.** `setState` rebuilds the whole `State` subtree. Hoist state high enough to be shared, and you're rebuilding most of your app for a small change:

```dart
// State at the root → the entire app rebuilds when the cart count changes
class _AppState extends State<App> {
  int cartCount = 0;
  @override
  Widget build(context) => MaterialApp(home: HomePage(cart: cartCount, ...));
}
```

**2. State dies with the widget.** Navigate away and the `State` is disposed — the cart is gone. Working around this means hoisting even higher, which worsens problem 1.

**3. The logic isn't testable in isolation.** Business logic inside a `State` requires a widget test and a pumped widget tree to exercise. The same logic in a BLoC or notifier is a plain Dart unit test.

**4. Sibling communication is impossible without a common ancestor.** Two widgets in different branches can only talk through their nearest shared parent, which may be ten levels up and has no business knowing about either of them.

**What a state management solution gives you instead:**

- State lives **outside** the widget tree, so it survives navigation and rebuilds.
- **Any** widget can read it directly, at any depth, with no intermediate plumbing.
- **Only the widgets that actually read it** rebuild.
- Logic is **plain Dart**, so it's unit-testable without Flutter.

**But be clear about what `setState` is still right for**, because the answer shouldn't be "never use it." `setState` is the correct, idiomatic choice for **ephemeral state** — a dropdown's open/closed flag, a slider's live value, an animation's progress, a form field's focus. Reaching for a BLoC for those adds ceremony and makes the widget less reusable.

**The practical signal to promote:** you're passing a callback down more than one or two levels, or a second widget needs the same data. That's the moment state should move out of the tree — not before.

## 19. What is Prop Drilling?
The anti-pattern of passing data down through multiple layers of the widget tree via constructors just to reach a deeply nested child that actually needs the data. State management tools solve this.

**What it looks like, and why it's corrosive:**

```dart
// The user object is needed only by the Avatar, five levels down
HomePage(user: user)
  → Dashboard(user: user)        // doesn't use it
    → ContentArea(user: user)    // doesn't use it
      → Sidebar(user: user)      // doesn't use it
        → ProfileCard(user: user)
          → Avatar(user: user)   // finally, the one that needs it
```

**The real costs** are maintenance, not performance:

- **Every intermediate widget is coupled** to a type it doesn't use. `Dashboard` can't be reused anywhere without a `User`.
- **Adding one field means editing six files**, which makes small changes expensive and reviews noisy.
- **Rebuild amplification** — the user changes, so every widget in the chain rebuilds, not just the `Avatar`.
- **The signature lies** about what the widget does. A reader sees `Dashboard(user: ...)` and reasonably assumes it uses the user.

**The solutions, in increasing order of power:**

**1. Composition** — often overlooked, and frequently the best fix. Pass the *built widget* down instead of the data:

```dart
// Instead of threading `user` through, build the Avatar at the top
Dashboard(child: ProfileCard(avatar: Avatar(user: user)))
```

The intermediate widgets take a `Widget child` and know nothing about `User`. This requires no package at all.

**2. `InheritedWidget`** — make the value available to any descendant at O(1). This is the framework's own answer, and what `Theme.of(context)` does.

**3. A state management package** — Provider, Riverpod and BLoC all remove the drilling entirely:

```dart
// Any descendant, at any depth, with no intermediate plumbing
final user = ref.watch(userProvider);          // Riverpod
final user = context.watch<UserModel>().user;  // Provider
```

**The nuance worth voicing:** passing data one or two levels is **not** prop drilling — it's just normal parameter passing, and it's clearer and more testable than an implicit lookup. The anti-pattern is specifically *many* layers of widgets that don't use the value. Reaching for a global solution to avoid a two-level pass trades explicitness for indirection and makes widgets harder to preview and test.

## 20. How do you choose a State Management solution?
- **Small apps/Local state**: `setState` or `ValueNotifier`.
- **Medium apps/Large apps**: `Provider` or `Riverpod`.
- **Large/Enterprise apps**: `BLoC` (forces strict architecture and is highly testable).
- **Rapid Prototyping**: `GetX`.

**App size is the usual framing, but it's the weakest criterion.** Better questions to ask:

- **How much of your state is ephemeral versus shared?** An app with lots of local UI state and a little shared state needs very little machinery.
- **How large is the team?** More people means more value in an enforced structure that everyone follows — which is BLoC's main argument.
- **Do you need traceability?** If you need to know *what the user did* to reach a broken state, BLoC's event log is worth its boilerplate.
- **How much async state is there?** Heavy API work favours Riverpod's `AsyncValue`, which makes loading and error states exhaustive.
- **What does the team already know?** A pattern the team understands beats a theoretically superior one they don't.

**The 2026 practical landscape:**

- **`setState` / `ValueNotifier`** — always right for ephemeral state. Never stop using these.
- **Riverpod** — the strongest default for new projects. Compile-time safety, no `BuildContext` requirement, excellent async handling, and great testability.
- **BLoC** — the choice when you want enforced structure, an auditable event stream, and uniformity across a large team. More boilerplate, and Cubit takes most of it away when you don't need events.
- **Provider** — fine in existing codebases, well understood, and still maintained. Its author recommends Riverpod for new work.
- **GetX** — productive for prototypes and solo projects; generally avoided for long-lived codebases because of its global, implicit design.
- **signals / flutter_hooks** — newer approaches gaining traction, worth knowing about.

**The answer an interviewer actually wants** is reasoning, not a ranking. Something like: *"I'd default to Riverpod for a new app — it handles async state well and is testable without a widget tree. I'd choose BLoC if the team is large or we need an audit trail of user actions. And I'd keep `setState` for local UI state regardless, because promoting ephemeral state to a global store adds coupling for no benefit."*

**And the point worth making unprompted: you can mix them.** Using `setState` for a dropdown inside an app built on Riverpod isn't inconsistency — it's using the right tool at the right scope. The common failure is dogmatism in either direction: putting everything in a global store, or avoiding one until the prop drilling is unmanageable.

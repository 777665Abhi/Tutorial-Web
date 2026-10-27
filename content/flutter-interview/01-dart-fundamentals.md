---
title: "Dart Fundamentals"
description: "Master Dart basics, null safety, async/await, and OOP concepts."
---

## 1. What is Dart?
Dart is an object-oriented, strongly typed programming language developed by Google. It is the language used by the Flutter framework to build multi-platform applications.

```dart
void main() {
  print('Hello, Dart!');
}
```

**Why Flutter chose Dart** is the real question here, and it comes down to one unusual property: **Dart compiles both JIT and AOT**.

- **JIT (Just-In-Time)** during development, which is what makes **hot reload** possible — you change a line, and the running app updates in under a second while keeping its state.
- **AOT (Ahead-Of-Time)** for release, compiling straight to native ARM/x64 machine code. No interpreter, no bridge, no JavaScript — which is why Flutter can hold 60/120 fps.

Most languages give you one or the other. Having both means Flutter gets a fast development loop *and* native release performance, rather than trading one for the other.

**The other properties that matter for UI work:**

- **Single-threaded with an event loop** — no shared-memory concurrency, so no locks, no race conditions on UI state. Parallelism comes from **isolates** (question 19), which don't share memory.
- **Sound null safety** — nullability is checked at compile time and the compiler can rely on it for optimisation (question 2).
- **Fast allocation and generational GC** — tuned for the "allocate many short-lived objects" pattern, which is exactly what rebuilding a widget tree does.
- **Familiar syntax** — C-family, so Java, Kotlin, Swift, JavaScript and C# developers are productive quickly.

**Beyond Flutter**, Dart compiles to JavaScript for the web, runs on servers, and produces standalone native executables for CLI tools. In practice, though, the overwhelming majority of Dart code written today is Flutter code.

## 2. What is Sound Null Safety in Dart?
Introduced in Dart 2.12, sound null safety ensures that variables cannot contain `null` unless you explicitly declare them as nullable using a `?`. This prevents null reference exceptions at runtime.

```dart
String name = "Alice";
// name = null; // Compilation error

String? nullableName = null; // Allowed
```

**The word "sound" is doing real work.** It means the guarantee is *complete*: if the type system says a variable is non-nullable, it genuinely cannot be null at runtime — there's no escape hatch that quietly breaks the promise. Compare TypeScript's `strictNullChecks`, which is unsound because `any` and unchecked casts can smuggle nulls past the checker.

**Soundness buys a performance win too**, which is the less obvious benefit: because the compiler *knows* a value can't be null, it removes null checks from the generated code entirely. Null safety made Dart faster, not just safer.

**Flow analysis means you rarely need explicit casts.** The compiler tracks what it has learned:

```dart
void greet(String? name) {
  if (name == null) return;
  print(name.toUpperCase());   // promoted to String — no ! needed
}
```

**The operators you'll use constantly:**

```dart
String? name;

name?.length;        // null-aware access — null if name is null
name ?? 'Guest';     // null-coalescing — fallback value
name ??= 'Guest';    // assign only if currently null
name!.length;        // null assertion — THROWS if null
```

**`!` is the one to be careful with.** It tells the compiler "trust me," and if you're wrong you get the exact runtime crash null safety exists to prevent. Treat every `!` as a claim you must be able to justify; most can be replaced with `??`, an early return, or a local variable that promotes.

**A gotcha worth knowing:** flow promotion doesn't work on class fields, because another thread — or a getter — could theoretically change them between the check and the use:

```dart
class Foo {
  String? name;
  void show() {
    if (name != null) print(name.length);   // ERROR — field isn't promoted
    final n = name;
    if (n != null) print(n.length);         // works — local IS promoted
  }
}
```

Copying to a local is the standard idiom.

## 3. What is the difference between `final` and `const`?
- `final`: A variable whose value can only be set once. It is initialized at runtime.
- `const`: A variable whose value is an absolute compile-time constant.

```dart
final timeNow = DateTime.now(); // Works (runtime)
// const constTime = DateTime.now(); // Error (not known at compile time)
const pi = 3.14159;
```

**The distinction is *when* the value is determined**, and the consequence is deeper than it first appears.

**`const` is deeply immutable and canonicalised.** Two identical `const` values are literally the same object in memory:

```dart
const a = [1, 2, 3];
const b = [1, 2, 3];
print(identical(a, b));   // true — canonicalised to one instance

final c = [1, 2, 3];
final d = [1, 2, 3];
print(identical(c, d));   // false — two separate lists
```

**`final` only means the *reference* can't be reassigned** — the object itself can still mutate:

```dart
final list = [1, 2];
list.add(3);          // fine — the list is mutable
// list = [4];        // error — can't reassign the reference

const constList = [1, 2];
// constList.add(3);  // runtime error — deeply immutable
```

**Why this matters enormously in Flutter: `const` widgets are not rebuilt.** When Flutter diffs the widget tree, a `const` widget is the identical object as last frame, so the framework skips it entirely:

```dart
// Rebuilt on every parent rebuild
Padding(padding: EdgeInsets.all(8), child: Text('Hello'))

// Created once, reused forever — skipped during rebuild
const Padding(padding: EdgeInsets.all(8), child: Text('Hello'))
```

This is the single cheapest performance optimisation in Flutter, which is why the `prefer_const_constructors` lint exists and why you should enable it.

**`const` constructors** let your own widgets participate:

```dart
class MyBadge extends StatelessWidget {
  const MyBadge({super.key, required this.label});   // const constructor
  final String label;
  ...
}
```

All fields must be `final` for a constructor to be `const`.

**The rule of thumb:** use `const` wherever the analyser allows it, `final` everywhere else, and `var` only when you genuinely reassign.

## 4. What is the `late` keyword?
It tells the compiler that a non-nullable variable will be initialized later, but definitely before it is used. If you use it before initialization, a runtime error is thrown.

```dart
late String name;
void initialize() {
  name = "Bob"; // Must happen before reading 'name'
}
```

**It's a deliberate trade: you move a compile-time guarantee to a runtime one.** You're promising the compiler something it can't verify, and `LateInitializationError` is what you get when the promise is broken.

**The three legitimate uses:**

**1. Fields initialised in `initState`**, the most common case in Flutter. The value needs `context` or widget properties, which don't exist at construction time:

```dart
class _MyState extends State<MyWidget> {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);
  }
}
```

The alternative — making it `AnimationController?` — forces a `!` or a null check at every single use site, which is worse.

**2. Lazy initialisation.** `late` with an initialiser doesn't run it until first read:

```dart
late final expensive = _computeExpensiveThing();   // runs on first access only
```

This is genuinely useful for costly values that may never be needed.

**3. Circular references** between two objects that must know about each other.

**`late final` is the combination worth knowing**: assignable exactly once, at any point, and the compiler enforces the single assignment. It gives you immutability without requiring the value at construction.

**Where it goes wrong:** using `late` to dodge a nullability problem you haven't thought through. If a value genuinely may not exist, it should be nullable — `late` converts a handled case into a crash.

```dart
late User user;   // if the fetch fails, every read throws
User? user;       // honest: the UI must handle "not loaded yet"
```

A `LateInitializationError` in production almost always means `late` was used where `?` was correct. In Flutter specifically, watch for `late` fields read during the first `build()` before `initState` has set them — a common source of this error.

## 5. How does `async` and `await` work in Dart?
They allow you to write asynchronous code that looks synchronous. An `async` function returns a `Future`. `await` pauses the execution of the function until the `Future` completes.

```dart
Future<String> fetchUser() async {
  await Future.delayed(Duration(seconds: 2));
  return "Alice";
}
```

**"Pauses" means *suspends*, not *blocks*.** The thread isn't stopped — Dart is single-threaded, so blocking it would freeze the entire UI. Instead, `await` registers a continuation and returns control to the **event loop**, which runs other work (animations, gestures, other futures) until the result arrives.

**The event loop is the key mental model**, and it explains most async behaviour:

```
┌──────────────┐
│  Microtasks  │  ← scheduled by completed Futures; drained COMPLETELY first
└──────┬───────┘
       ↓ (only when empty)
┌──────────────┐
│    Events    │  ← I/O, timers, gestures; ONE per turn
└──────────────┘
```

Microtasks always win. A microtask that schedules another microtask can **starve the event queue entirely**, freezing the UI — a real way to hang a Flutter app.

**Three practical rules:**

**1. `await` runs calls sequentially.** For independent work, that's wasted time:

```dart
// 3 seconds — each waits for the previous
final user = await fetchUser();     // 1s
final posts = await fetchPosts();   // 1s
final ads = await fetchAds();       // 1s

// 1 second — all three run concurrently
final results = await Future.wait([fetchUser(), fetchPosts(), fetchAds()]);
```

**2. `try/catch` works normally**, which is the main readability win over `.then()` chains:

```dart
try {
  final user = await fetchUser();
} on SocketException {
  showOffline();
} catch (e) {
  showError(e);
}
```

**3. Don't forget the `await`.** An un-awaited `Future` runs, but errors become unhandled and you can't know when it finished. The `unawaited_futures` lint catches this; use `unawaited(f)` when the fire-and-forget is intentional.

**The Flutter-specific trap: `async` does not move work off the main thread.** A heavy synchronous computation inside an `async` function still blocks the UI, because there's only one thread. For CPU work, use `compute()` or an isolate (question 19). `await` helps with *waiting*, not with *computing*.

**And always guard `context` after an await** — the widget may have been disposed:

```dart
await fetchData();
if (!mounted) return;        // essential
Navigator.pop(context);
```

## 6. What is a `Future`?
A `Future` represents a potential value (or error) that will be available at some time in the future. It is the Dart equivalent of a Promise in JavaScript.

```dart
Future<int> calculate() {
  return Future.value(42);
}
```

**A `Future` has exactly three states:** *uncompleted*, *completed with a value*, or *completed with an error*. It completes **once** and never changes afterwards — which is the fundamental difference from a `Stream` (question 7).

**Creating them:**

```dart
Future.value(42);                                   // already complete
Future.error(Exception('boom'));                    // already failed
Future.delayed(Duration(seconds: 1), () => 42);     // completes later
Future(() => expensiveSync());                      // runs in the event queue
Future.microtask(() => 42);                         // runs in the microtask queue
```

**Consuming them** — `async`/`await` is preferred, but the callback API still appears in older code and in places where you can't `await`:

```dart
fetchUser()
  .then((user) => print(user))
  .catchError((e) => print('failed: $e'))
  .whenComplete(() => print('done'));   // runs either way — like finally
```

**The combinators are what you should reach for with multiple futures:**

```dart
// All of them, concurrently — fails fast if ANY fails
final results = await Future.wait([f1, f2, f3]);

// Keep going even if one fails
await Future.wait([f1, f2], eagerError: false);

// First to complete wins
final fastest = await Future.any([primary, fallback]);
```

`Future.wait` returning a `List` in the **same order** as the input is the property that makes it useful — you can destructure the results positionally.

**Timeouts** are easy to forget and important for network work:

```dart
final data = await fetchData().timeout(
  const Duration(seconds: 10),
  onTimeout: () => throw TimeoutException('too slow'),
);
```

**`Completer` is the bridge** from callback-based APIs into futures — the standard way to wrap a platform SDK that uses listeners:

```dart
Future<Location> getLocation() {
  final completer = Completer<Location>();
  locationApi.onResult = (loc) => completer.complete(loc);
  locationApi.onError = (e) => completer.completeError(e);
  return completer.future;
}
```

Complete a `Completer` twice and it throws, so guard with `if (!completer.isCompleted)`.

**A `Future` cannot be cancelled** — this is a genuine limitation and a frequent interview follow-up. You can ignore the result, but the work continues. If you need cancellation, use a `StreamSubscription` (which can be cancelled) or a package like `cancellation_token`.

## 7. What is a `Stream`?
A `Stream` is an asynchronous sequence of events. While a `Future` returns exactly one value, a `Stream` can yield zero or more values over time (e.g., listening to user clicks or WebSocket data).

```dart
Stream<int> countStream(int to) async* {
  for (int i = 1; i <= to; i++) {
    yield i; // Emits value to the stream
  }
}
```

**A stream emits three kinds of event:** data, error, and done. Importantly, **an error doesn't necessarily end the stream** — unlike a `Future`, which is finished either way.

**The single/broadcast distinction is the thing most people get wrong:**

- **Single-subscription** (the default) — exactly **one** listener, ever. Listening twice throws `Bad state: Stream has already been listened to`. Events are buffered until someone listens. Correct for a sequence that belongs to one consumer: reading a file, an HTTP response body.
- **Broadcast** — many listeners, but events are **not buffered**; a listener that joins late misses everything before it. Correct for ongoing events: button taps, websocket messages, a BLoC's state.

```dart
final controller = StreamController<int>();            // single-subscription
final broadcast = StreamController<int>.broadcast();   // multiple listeners
final asBroadcast = someStream.asBroadcastStream();    // convert
```

**Listening and controlling:**

```dart
final sub = stream.listen(
  (data) => print(data),
  onError: (e) => print('error: $e'),
  onDone: () => print('closed'),
  cancelOnError: false,
);

sub.pause();
sub.resume();
await sub.cancel();    // ALWAYS cancel in dispose()
```

**Forgetting to cancel is the number-one Flutter memory leak.** A live subscription keeps the closure — and therefore your `State` object and its context — alive after the widget is gone:

```dart
@override
void dispose() {
  _subscription.cancel();
  _controller.close();
  super.dispose();
}
```

**Transformers compose naturally**, and this is where streams beat manual callbacks:

```dart
searchInput.stream
  .debounce(const Duration(milliseconds: 300))
  .where((q) => q.length > 2)
  .distinct()
  .asyncMap((q) => api.search(q))
  .listen(showResults);
```

(`debounce` comes from `rxdart` or `stream_transform`; the rest are built in.)

**In Flutter**, `StreamBuilder` consumes a stream directly in the widget tree, and streams underpin BLoC, `Firestore.snapshots()`, and most reactive packages. Prefer `await for` over `listen` inside an `async` function, since it respects back-pressure automatically.

## 8. What is the difference between `async*` and `sync*`?
- `async*`: Returns a `Stream` (asynchronous sequence of values). Uses `yield`.
- `sync*`: Returns an `Iterable` (synchronous sequence of values). Uses `yield`.

```dart
Iterable<int> getNumbers() sync* {
  yield 1;
  yield 2;
}
```

**Both are *generators* — they produce values lazily, on demand**, rather than building the whole collection up front. The difference is synchronous versus asynchronous.

**`sync*` returns a lazy `Iterable`.** Nothing runs until you iterate, and it computes one value per step:

```dart
Iterable<int> naturals() sync* {
  int i = 0;
  while (true) yield i++;        // infinite — and that's fine
}

print(naturals().take(5).toList());   // [0, 1, 2, 3, 4] — only 5 computed
```

An infinite sequence is perfectly safe because laziness means you only pay for what you take. The function body pauses at each `yield` and resumes on the next `moveNext()`.

**`async*` returns a `Stream`**, and can `await` between emissions:

```dart
Stream<int> ticker() async* {
  int i = 0;
  while (true) {
    await Future.delayed(const Duration(seconds: 1));   // can await
    yield i++;
  }
}
```

**`yield*` delegates to another sequence**, which is how you compose generators — particularly useful for recursion:

```dart
Iterable<Node> walk(Node node) sync* {
  yield node;
  for (final child in node.children) {
    yield* walk(child);         // flattens the whole subtree
  }
}
```

**The four-way comparison**, which is the cleanest way to hold all of this:

- **`sync`** (ordinary function) → one value, now.
- **`async`** → one value, later (`Future`).
- **`sync*`** → many values, now, lazily (`Iterable`).
- **`async*`** → many values, later (`Stream`).

**Where you'll use them in Flutter:** `async*` constantly, because **BLoC's `mapEventToState` was an `async*` function** — yielding each new state as it's computed. `sync*` is rarer in app code but excellent for tree traversal, pagination logic, and any lazily-generated sequence.

**The gotcha:** a `sync*` function's body doesn't execute at all until iteration starts, so side effects or validation you put at the top don't run when you call it. If you need eager validation, split it into a normal function that validates and then returns the generator's result.

## 9. How do you implement named parameters in functions?
You wrap the parameters in curly braces `{}`. Named parameters are optional by default unless marked with the `required` keyword.

```dart
void configure({required int width, int height = 100}) {
  print("W: $width, H: $height");
}
configure(width: 50); // height defaults to 100
```

**Dart has three parameter kinds**, and knowing all three matters because Flutter uses named parameters everywhere:

```dart
void a(int x, String y);                    // positional, required
void b(int x, [String? y, int z = 0]);      // positional, optional — square brackets
void c({required int x, String y = 'hi'});  // named — curly braces
```

Positional-optional (`[]`) and named (`{}`) **cannot be mixed** in the same signature.

**Why Flutter leans so heavily on named parameters:** widget constructors routinely take ten or more arguments, and positional ones would be unreadable and dangerously easy to transpose:

```dart
// Unreadable and error-prone
Container(8.0, Colors.red, 100, 200, true);

// Self-documenting, order-independent, safe to extend
Container(
  padding: const EdgeInsets.all(8),
  color: Colors.red,
  width: 100,
  height: 200,
);
```

Named parameters are also **order-independent** and **additive**: adding a new optional named parameter never breaks existing callers, which is why Flutter's API can evolve without constant churn.

**`required` replaced `@required`** — it's a real language keyword under null safety, enforced by the compiler rather than an analyser hint.

**A non-nullable named parameter needs either `required` or a default:**

```dart
void f({required int a});        // caller must pass it
void f({int a = 0});             // defaults
void f({int? a});                // nullable — may be omitted
// void f({int a});              // ERROR — could be null with no way to set it
```

**Defaults must be compile-time constants**, which is a common stumbling block:

```dart
void f({List<int> items = const []});                 // ok — const literal
// void f({DateTime t = DateTime.now()});             // ERROR — runtime value
void f({DateTime? t}) { t ??= DateTime.now(); }       // the workaround
```

**In widget constructors**, the modern idiom uses `super.key` and initialising formals to cut boilerplate:

```dart
class Badge extends StatelessWidget {
  const Badge({super.key, required this.label, this.color = Colors.blue});
  final String label;
  final Color color;
}
```

`this.label` as a parameter assigns the field directly — no constructor body needed.

## 10. What are Factory Constructors?
A constructor defined using the `factory` keyword. Unlike standard constructors, it does not necessarily create a new instance of the class; it can return an existing instance from a cache or return an instance of a subtype.

```dart
class Logger {
  static final Logger _cache = Logger._internal();
  factory Logger() {
    return _cache; // Always returns the same instance
  }
  Logger._internal();
}
```

**The defining difference: a factory constructor has a `return` statement.** A generative constructor creates `this` implicitly and can't return anything; a factory is really a static method that happens to look like a constructor, which is what lets it decide *what* to return.

**The three things only a factory can do:**

**1. Return a cached instance** — the singleton pattern shown above, or a per-key cache:

```dart
class Symbol {
  static final _cache = <String, Symbol>{};
  factory Symbol(String name) =>
      _cache.putIfAbsent(name, () => Symbol._internal(name));
  Symbol._internal(this.name);
  final String name;
}
```

**2. Return a subtype**, which is the classic factory pattern:

```dart
abstract class Shape {
  factory Shape(String type) {
    switch (type) {
      case 'circle': return Circle();
      case 'square': return Square();
      default: throw ArgumentError('Unknown: $type');
    }
  }
}
```

Note an abstract class can have a factory constructor even though it can't be instantiated directly — a neat trick for hiding implementations behind an interface.

**3. Run logic before deciding**, which is why **`fromJson` is almost always a factory**:

```dart
class User {
  const User({required this.id, required this.name});
  final String id;
  final String name;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Unknown',
    );
  }
}
```

A generative constructor's initialiser list can't contain statements, so any parsing, validation or defaulting pushes you to a factory.

**Two restrictions to remember:** a factory **cannot access `this`** (there's no instance yet), and it **cannot be used as a `const` constructor** unless it returns an existing const value — which means a factory-constructed widget can't be `const`, costing you the const-widget optimisation.

**The naming convention** uses named constructors (`User.fromJson`, `Shape.circle`), and the `_internal` private constructor is the standard way to keep direct construction out of callers' hands.

## 11. Does Dart support Multiple Inheritance?
No. A Dart class can only inherit (extend) from one single superclass.

**The reason is the "diamond problem."** If `A` and `B` both define `greet()`, and `C` extends both, which implementation does `C.greet()` use? Languages that allow it need complex resolution rules (C++'s virtual inheritance, Python's MRO), and the complexity rarely pays for itself. Dart, like Java, Kotlin and C#, declines.

**But Dart gives you three ways to reuse code across hierarchies**, so the restriction costs much less than it sounds:

```dart
class Duck extends Bird with Swimmer, Walker implements Trackable {
  // extends: one superclass — inherits API AND implementation
  // with:    many mixins   — inherits implementation, no hierarchy
  // implements: many interfaces — inherits API only, you write the bodies
}
```

**Mixins are the real answer to multiple inheritance** (question 12). They give you concrete, reusable implementation from several sources without the ambiguity, because Dart **linearises** them: with `with A, B`, later mixins override earlier ones in a defined order. The diamond is flattened into a chain, so there's never a question of which method wins.

```dart
mixin A { String greet() => 'A'; }
mixin B { String greet() => 'B'; }

class C with A, B {}
print(C().greet());   // 'B' — the last mixin wins, deterministically
```

**Every class is implicitly an interface.** This is a distinctive Dart feature: you can `implements` any class, not just an `abstract class` or a declared interface — you simply take on the obligation to provide every member:

```dart
class Logger { void log(String m) => print(m); }

class FakeLogger implements Logger {    // no 'interface' keyword needed
  @override void log(String m) {}       // must rewrite every member
}
```

That makes testing easy — any class can be faked without the author designing for it.

**The modern note:** Dart 3 added class modifiers (`interface`, `base`, `final`, `sealed`, `mixin`) that let library authors *restrict* these capabilities — `final class` prevents extension and implementation, `sealed class` enables exhaustive `switch`. So the defaults are permissive, but authors can now tighten them deliberately.

## 12. What are Mixins?
Mixins are a way of reusing a class's code in multiple class hierarchies without using inheritance. You use the `with` keyword to apply a mixin.

```dart
mixin Swimmer {
  void swim() => print("Swimming");
}
class Duck extends Bird with Swimmer { }
```

**They answer "is-a" versus "can-do."** Inheritance says a `Duck` *is a* `Bird`. A mixin says a `Duck` *can* swim — a capability shared across unrelated hierarchies. A `Fish` and a `Submarine` can also be `Swimmer`s without any of them being related.

**Linearisation resolves conflicts deterministically.** Mixins are applied left to right, each stacking on the previous, so the **last one wins**:

```dart
mixin A { String who() => 'A'; }
mixin B { String who() => 'B'; }

class C with A, B {}
print(C().who());   // 'B'
```

`super` inside a mixin refers to the mixin applied *before* it, which lets mixins chain behaviour rather than just replace it.

**`on` constrains where a mixin can be applied** — crucial for mixins that depend on the host's members:

```dart
mixin Flyer on Bird {          // can only be mixed into Bird or its subclasses
  void fly() => print('$name is flying');   // safe: Bird declares `name`
}
```

Without `on`, the mixin can't reference anything about its host.

**Mixins can have state**, which distinguishes them from plain interfaces:

```dart
mixin Counter {
  int _count = 0;
  void increment() => _count++;
  int get count => _count;
}
```

**Flutter uses them pervasively**, and recognising these is the practical payoff:

- **`SingleTickerProviderStateMixin`** — supplies `vsync` for one `AnimationController`. (`TickerProviderStateMixin` for several.)
- **`WidgetsBindingObserver`** — app lifecycle callbacks.
- **`AutomaticKeepAliveClientMixin`** — keeps a list item alive when scrolled off screen.
- **`RestorationMixin`** — state restoration.

```dart
class _MyState extends State<MyWidget> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(seconds: 1));
}
```

`vsync: this` works precisely because the mixin made your `State` a `TickerProvider`.

**Modern Dart distinguishes `mixin` from `mixin class`:** a declaration marked `mixin` can *only* be mixed in, not instantiated or extended. Use `mixin class` if it should work both ways. And since Dart 3, mixing in a plain `class` is no longer allowed — declare it as a `mixin`.

## 13. What is the difference between `extends`, `implements`, and `with`?
- `extends`: Classical inheritance (max 1 class). Inherits both API and implementation.
- `implements`: Interface implementation (can be multiple). You must rewrite all method bodies.
- `with`: Applies a Mixin. Brings in concrete implementations without inheritance hierarchies.

**The clearest way to hold it: what do you inherit, and how many?**

- **`extends`** — inherits the **API and the implementation**. Maximum **one**. You can call `super`.
- **`implements`** — inherits **only the API (the contract)**. **Many** allowed. You must write every member yourself, and there is no `super`.
- **`with`** — inherits the **implementation without the hierarchy**. **Many** allowed, resolved by linearisation.

```dart
class Animal {
  String name = 'generic';
  void speak() => print('...');
}

class Dog extends Animal {
  @override void speak() => print('Woof');   // can call super.speak()
}

class Robot implements Animal {
  @override String name = 'R2';              // MUST provide everything
  @override void speak() => print('Beep');   // no super available
}
```

**The thing that surprises people: `implements` requires you to reimplement *fields* too**, not just methods — because a field is really a getter/setter pair in the interface. `Robot` above must declare `name` even though `Animal` gave it a value.

**Why `implements` is so useful in Dart:** every class is implicitly an interface, so you can `implements` a concrete third-party class to create a test double without the author designing for it:

```dart
class FakeApiClient implements ApiClient {
  @override Future<User> getUser(String id) async => User.mock();
}
```

That's the basis of most hand-written fakes in Dart testing.

**Choosing between them:**

- **`extends`** when there's a genuine "is-a" relationship and you want the parent's behaviour. In Flutter, this is `extends StatelessWidget` / `extends State<T>`.
- **`implements`** when you need a contract, multiple "interfaces," or a test double.
- **`with`** when you want to share concrete behaviour across unrelated classes — a capability, not an identity.

**They combine, in a fixed order:**

```dart
class Duck extends Bird with Swimmer, Walker implements Trackable {}
//          ^extends     ^with                 ^implements
```

**The Dart 3 addition** worth mentioning: class modifiers let authors control which of these are permitted — `final class` forbids both extending and implementing, `interface class` allows only `implements`, `base class` allows only `extends`. The defaults remain permissive.

## 14. What is the cascade notation `..` ?
It allows you to perform a sequence of operations on the same object without repeatedly typing the object's name.

```dart
var paint = Paint()
  ..color = Colors.black
  ..strokeCap = StrokeCap.round
  ..strokeWidth = 5.0;
```

**The mechanism: a cascade discards the expression's result and returns the original object instead.** So `..color = Colors.black` evaluates the assignment but hands back the `Paint`, letting you chain another operation onto the same object.

Compare the alternatives:

```dart
// Without cascades — repetitive, and needs a variable
final paint = Paint();
paint.color = Colors.black;
paint.strokeCap = StrokeCap.round;

// With cascades — a single expression, so it can be passed inline or made final
final paint = Paint()
  ..color = Colors.black
  ..strokeCap = StrokeCap.round;
```

The real benefit is that it's **one expression**, so you can use it where a statement wouldn't fit — as an argument, in a `const` list, or as a `final` initialiser.

**It works with method calls too**, not just assignments:

```dart
final list = <int>[]
  ..add(1)
  ..add(2)
  ..addAll([3, 4])
  ..sort();
```

This matters because `add()` returns `void` — normal chaining would be impossible.

**`?..` is the null-aware cascade**, which short-circuits the entire chain if the target is null:

```dart
controller?..forward()..repeat();   // does nothing at all if controller is null
```

**Nested cascades** are possible but rarely readable:

```dart
final chart = Chart()
  ..title = 'Sales'
  ..axis = (Axis()..label = 'Q1'..max = 100);
```

**The classic mistake** is adding a semicolon mid-chain, which silently breaks it into separate statements and usually produces a confusing type error. The chain ends with exactly one semicolon.

**Where you'll meet it in Flutter:** `Paint` configuration in `CustomPainter`, building `TextSpan` trees, configuring `AnimationController`s, and — very commonly — in `copyWith`-free mutation of builders. It's also idiomatic in `flutter_bloc` and similar packages for configuring objects fluently.

## 15. What is the null-aware spread operator `...?` ?
The spread operator `...` inserts multiple values into a collection. `...?` does the same but only if the collection being spread is not null.

```dart
List<int>? extras = null;
var list = [1, 2, ...?extras]; // Safely evaluates to [1, 2]
```

**Without `...?` this would throw**, because `...` can't iterate null. The `?` makes the whole spread a no-op when the collection is null — far cleaner than a conditional:

```dart
// Before
final items = [1, 2];
if (extras != null) items.addAll(extras);

// After
final items = [1, 2, ...?extras];
```

**Spreads belong to a family of collection features** that together make Flutter widget lists remarkably clean. All three — spread, `if`, and `for` — work inside list, set, and map literals:

```dart
Column(
  children: [
    const Header(),

    if (isLoggedIn) const ProfileTile(),              // collection-if

    if (isAdmin) ...[                                 // if + spread for a group
      const Divider(),
      const AdminPanel(),
    ],

    for (final item in items) ItemTile(item),         // collection-for

    ...?optionalWidgets,                              // null-aware spread

    const Footer(),
  ],
)
```

**This is genuinely important in Flutter**, because the alternative is building a list imperatively before the `build` returns, or littering the tree with `Visibility` widgets and `SizedBox.shrink()` placeholders. Collection-if produces a list that simply *doesn't contain* the widget, rather than containing a hidden one — which is both cleaner and cheaper.

**`if/else` works too:**

```dart
children: [
  if (isLoading) const CircularProgressIndicator()
  else if (hasError) const ErrorView()
  else const ContentView(),
]
```

**Spreads also flatten nested structures** and work for combining collections of any type:

```dart
final merged = {...defaults, ...overrides};   // map merge — later keys win
final all = {...setA, ...setB};               // set union
```

The map case is particularly handy for merging configuration or building `copyWith`-style updates.

## 16. What is the null-coalescing operator `??` ?
It returns the expression on its left if it is not null; otherwise, it returns the expression on its right.

```dart
String? name;
String displayName = name ?? "Guest";
```

**It short-circuits** — the right side is only evaluated if the left is null, which matters when the fallback is expensive:

```dart
final config = cachedConfig ?? loadConfigFromDisk();   // disk read only if needed
```

**`??=` assigns only if currently null**, which is the compact lazy-initialisation idiom:

```dart
String? cache;
String get value => cache ??= computeExpensive();   // computed once
```

**The full null-aware family**, since these are usually asked together:

```dart
user?.name              // null-aware access — null if user is null
user?.name ?? 'Guest'   // ...with a fallback
list?.first             // chains stop at the first null
user!.name              // assertion — THROWS if null
user?..save()           // null-aware cascade
items ...?              // null-aware spread
```

**Chaining `?.` short-circuits the whole chain**, which is a common point of confusion:

```dart
a?.b.c.d    // if a is null, the ENTIRE expression is null — b, c, d never evaluated
```

**`??` versus a falsy check** is worth stating explicitly, because developers coming from JavaScript expect `||` behaviour:

```dart
final count = maybeZero ?? 10;   // 0 is NOT null → result is 0, not 10
```

`??` tests **only for null**, never for emptiness, zero or false. That's a feature — it means `0`, `''` and `false` are preserved rather than silently replaced.

**In Flutter widget code** this shows up constantly for optional styling and defaults:

```dart
Text(
  widget.label ?? 'Untitled',
  style: widget.style ?? Theme.of(context).textTheme.bodyMedium,
)
```

**A readability note:** deep chains of `??` and `?.` become hard to follow. When you find yourself writing three fallbacks, an early return or a local variable usually reads better — and remember that promoting to a local is also what lets the compiler narrow a nullable field (question 2).

## 17. How do Extension Methods work in Dart?
They allow you to add new functionality to existing libraries (even those you don't own, like `String` or `int`).

```dart
extension StringCasing on String {
  String toTitleCase() => "${this[0].toUpperCase()}${substring(1)}";
}
print("hello".toTitleCase()); // "Hello"
```

**Resolution is static, not dynamic** — and this is the key technical point. The compiler decides which extension applies based on the **declared type** at the call site, so extensions have zero runtime cost but don't work through `dynamic`:

```dart
dynamic d = "hello";
// d.toTitleCase();   // RUNTIME ERROR — extensions don't resolve on dynamic
```

**They can add getters, setters, operators and static members**, not just methods:

```dart
extension NumberParsing on String {
  int get asInt => int.parse(this);
  bool get isEmail => RegExp(r'^[^@]+@[^@]+\.[^@]+$').hasMatch(this);
}

extension ListExtras<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
  List<T> get unique => toSet().toList();
}
```

The generic form (`on List<T>`) is how you write extensions that preserve type information.

**You can extend nullable types**, which is often more useful than extending the base type:

```dart
extension StringOrNull on String? {
  bool get isNullOrBlank => this == null || this!.trim().isEmpty;
}

String? name;
if (name.isNullOrBlank) { }   // no null check needed at the call site
```

**In Flutter, the `BuildContext` extension is the most valuable pattern** — it removes an enormous amount of repetition:

```dart
extension ContextX on BuildContext {
  ThemeData get theme => Theme.of(this);
  TextTheme get textTheme => Theme.of(this).textTheme;
  ColorScheme get colors => Theme.of(this).colorScheme;
  Size get screenSize => MediaQuery.sizeOf(this);
  NavigatorState get nav => Navigator.of(this);
}

// Before: Theme.of(context).textTheme.titleLarge
// After:  context.textTheme.titleLarge
```

Many popular packages (`go_router`, `provider`) ship exactly this kind of extension.

**Resolving conflicts** when two extensions define the same member — use explicit application or hide one on import:

```dart
StringCasing("hello").toTitleCase();          // explicit
import 'other.dart' hide OtherExtension;      // or exclude it
```

**The limits:** extensions **cannot add fields** (no state) and **cannot override existing members** — a real method always wins over an extension of the same name. They're syntactic convenience, not a way to modify a class's behaviour.

## 18. What is the difference between `dynamic` and `Object`?
- `Object`: The base class of all non-null Dart classes. You can only call methods defined on `Object` (like `.toString()`).
- `dynamic`: Tells the compiler to disable all type-checking for this variable. You can call *any* method on it, but it might crash at runtime.

```dart
Object a = "Hello";
// a.length; // Compile error

dynamic b = "Hello";
print(b.length); // Works fine at runtime
```

**`Object` is a type; `dynamic` is the absence of type checking.** That's the cleanest framing. `Object` says "this is *some* value, and I'll only promise what every value supports." `dynamic` says "stop checking — I'll take responsibility at runtime."

**The type hierarchy** under null safety, which clarifies where each sits:

```
       Object?          ← top type: anything, including null
       /     \
   Object    Null       ← Object excludes null
      |
   (all other types)
      |
    Never               ← bottom type: no values at all
```

`dynamic` isn't in this hierarchy — it's a *mode*, not a position. It's roughly `Object?` with all checks suppressed.

**Prefer `Object?` and narrow with pattern matching**, which gives you safety without losing flexibility:

```dart
void handle(Object? value) {
  if (value is String) {
    print(value.length);     // promoted to String — fully checked
  } else if (value is int) {
    print(value.isEven);
  }
}
```

Type promotion via `is` is the idiomatic Dart answer, and Dart 3's `switch` patterns make it even cleaner.

**Where `dynamic` is genuinely unavoidable:** JSON. `jsonDecode` returns `dynamic`, and maps come back as `Map<String, dynamic>`:

```dart
final json = jsonDecode(body) as Map<String, dynamic>;
final name = json['name'] as String;          // cast at the boundary
```

**The practice that matters: cast once, at the boundary.** Convert `dynamic` into typed model objects immediately in a `fromJson` factory, and let nothing dynamic leak further into your app. A `dynamic` that propagates through three layers turns every downstream typo into a runtime crash with a confusing stack trace.

**Other dynamic sources** to be aware of: platform channel results (`MethodChannel.invokeMethod` returns `dynamic`), `noSuchMethod`-based mocks, and untyped collection literals.

**Enable the lints** — `avoid_dynamic_calls`, `strict-casts` and `strict-raw-types` in `analysis_options.yaml` — to catch accidental `dynamic` usage. An omitted type annotation infers `dynamic` in some positions, which is how it sneaks in unnoticed.

## 19. What is an Isolate?
Dart is single-threaded. Isolates are independent Dart execution contexts, each with its own memory heap and event loop. They do not share memory and communicate only by passing messages.

```dart
void heavyTask(SendPort port) { /* compute */ }
// Spawned in background:
Isolate.spawn(heavyTask, receivePort.sendPort);
```

**No shared memory is the whole design.** Threads in Java or C++ share a heap, which is why they need locks, and why race conditions and deadlocks exist. Isolates each own their heap and communicate only by **copying messages** over ports — so data races are structurally impossible, and no synchronisation primitives are needed.

**The trade-off is copying cost.** Sending a large list between isolates serialises and copies it, which can outweigh the benefit for small workloads. (`TransferableTypedData` avoids the copy for byte buffers, and Dart 3 added shared immutable objects, but the general rule stands.)

**The crucial distinction from `async`:** `async`/`await` gives **concurrency on one thread** — useful for *waiting* (I/O, network, timers). An isolate gives **true parallelism on another thread** — necessary for *computing*. A heavy synchronous loop inside an `async` function still freezes the UI, because there's only one thread.

```dart
// Still janks — async doesn't move CPU work off the main thread
Future<int> bad() async => hugeComputation();

// Runs on another thread — UI stays smooth
Future<int> good() => compute(hugeComputation, input);
```

**`compute()` is what you should use 90% of the time** — it spawns an isolate, runs a top-level (or static) function, returns the result, and tears the isolate down:

```dart
Future<List<Photo>> parsePhotos(String json) =>
    compute(_parse, json);

List<Photo> _parse(String json) {              // must be top-level or static
  final list = jsonDecode(json) as List;
  return list.map((e) => Photo.fromJson(e)).toList();
}
```

The function must be top-level or static because a closure capturing state can't be sent to another isolate.

**For long-lived or bidirectional work**, use `Isolate.spawn` with explicit ports, or `Isolate.run` (Dart 2.19+) which is a cleaner one-shot API:

```dart
final result = await Isolate.run(() => expensiveComputation(data));
```

**What you cannot do in an isolate:** touch the UI, call most Flutter plugin methods (they need the platform thread), or access `BuildContext`. Background isolates need `BackgroundIsolateBinaryMessenger` to use plugins at all.

**When to reach for one:** JSON parsing of large payloads, image processing, encryption, file compression, complex computation. **When not to:** anything I/O-bound, where `async` already keeps the UI responsive at no cost.

## 20. What is the difference between `==` and `identical()`?
- `==`: Checks for value equality (can be overridden).
- `identical()`: Checks for reference equality (do they point to the exact same memory address?).

```dart
var a = [1, 2];
var b = [1, 2];
print(a == b); // false (List does not override == in Dart)
print(identical(a, b)); // false
```

**The default `==` *is* `identical()`.** Unless a class overrides it, value equality falls back to reference equality — which is exactly why the `List` example returns `false` and surprises people coming from Python or Kotlin.

**Overriding `==` requires overriding `hashCode` too** — this is the contract, and breaking it silently corrupts `Set` and `Map` behaviour:

```dart
class Point {
  const Point(this.x, this.y);
  final int x, y;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Point && x == other.x && y == other.y;

  @override
  int get hashCode => Object.hash(x, y);
}
```

Two objects that are `==` **must** have the same `hashCode`. If they don't, a `Set` will happily contain duplicates and a `Map` lookup will miss keys that are equal — a genuinely nasty class of bug. `Object.hash()` is the correct modern helper.

**In practice, don't write this by hand.** Use `package:equatable` or — better — `freezed`, which generates `==`, `hashCode`, `copyWith`, and `toString` from a single declaration:

```dart
@freezed
class User with _$User {
  const factory User({required String id, required String name}) = _User;
  factory User.fromJson(Map<String, dynamic> j) => _$UserFromJson(j);
}
```

**Why this matters so much in Flutter**, which is the real reason this question is asked: equality drives rebuild decisions.

- **`BlocBuilder` and `Riverpod` skip rebuilds when the new state `==` the old one.** A state class without a proper `==` override is never equal to its predecessor, so **every emission rebuilds the UI** even when nothing changed.
- **`didUpdateWidget`** and `AnimatedWidget` comparisons rely on it.
- **`const` widgets are canonicalised**, so `identical()` returns true for them — which is precisely how Flutter skips rebuilding const subtrees.

```dart
const a = Text('hi');
const b = Text('hi');
print(identical(a, b));   // true — same canonical instance
```

**`identical()` is also the fastest possible check**, which is why performance-sensitive framework code (and well-written `==` overrides, as above) starts with it as a short-circuit.

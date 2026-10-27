---
title: "Widgets & UI"
description: "Stateless vs Stateful, BuildContext, Layouts, and the Widget tree."
---

## 1. What is a Widget in Flutter?
In Flutter, almost everything is a Widget. A widget is an immutable description of part of the user interface. Widgets form a tree structure to compose the UI.

**The crucial point is that a widget is *not* what you see on screen.** It's a lightweight, immutable **configuration object** — a recipe, not the cake. Flutter reads it, compares it to the previous one, and updates the actual rendering objects accordingly. The widget itself is thrown away and recreated constantly.

This is why "rebuilding is expensive" is a misconception. Creating a widget is just allocating a small object with a few fields — Dart's generational garbage collector is specifically tuned for exactly this pattern of many short-lived allocations. What's expensive is *layout and paint*, and Flutter avoids those when the widget hasn't meaningfully changed.

**Composition over inheritance** is the design philosophy. Rather than a `Button` class with 40 properties and subclasses for each variation, Flutter gives you small single-purpose widgets you nest:

```dart
// Not: a Container with padding, alignment, decoration and constraint properties
// But: small widgets composed together
Padding(
  padding: const EdgeInsets.all(16),
  child: Center(
    child: DecoratedBox(
      decoration: BoxDecoration(color: Colors.blue),
      child: const Text('Hello'),
    ),
  ),
)
```

Each widget does one thing. `Container` exists as a convenience that composes several of these for you.

**The categories of widget** are worth distinguishing:

- **Structural** — `Row`, `Column`, `Stack`, `Scaffold`.
- **Styling** — `Padding`, `DecoratedBox`, `Opacity`, `Theme`.
- **Layout-affecting** — `Expanded`, `Flexible`, `Align`, `SizedBox`.
- **Rendering** — `Text`, `Image`, `Icon`, `CustomPaint`.
- **Invisible/behavioural** — `GestureDetector`, `InheritedWidget`, `FutureBuilder`.

**Why Flutter draws everything itself** is the deeper answer: unlike React Native, Flutter doesn't wrap platform widgets. It ships its own rendering engine (Skia/Impeller) and paints every pixel, which is why the UI looks identical across platforms and versions, and why there's no "bridge" overhead between your code and the UI.

## 2. What is the difference between `StatelessWidget` and `StatefulWidget`?
- **StatelessWidget**: Immutable. Its properties cannot change once built. Useful for static UI (e.g., an icon or a label).
- **StatefulWidget**: Has mutable state. It can rebuild multiple times over its lifetime when data changes (e.g., a checkbox or a text field).

```dart
class MyStaticText extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Text("Hello");
}
```

**Both widgets are immutable.** That's the subtlety people miss — a `StatefulWidget` is just as immutable as a `StatelessWidget`. The difference is that it has a **companion `State` object** that *isn't*, and which survives across rebuilds:

```dart
class Counter extends StatefulWidget {
  const Counter({super.key, required this.step});
  final int step;                          // immutable, like any widget
  @override State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0;                          // mutable, and it PERSISTS

  @override
  Widget build(BuildContext context) => TextButton(
    onPressed: () => setState(() => _count += widget.step),   // widget.step
    child: Text('$_count'),
  );
}
```

Note `widget.step` — the `State` reaches the current widget's configuration through the `widget` property, which Flutter swaps in whenever the parent rebuilds.

**Why the split exists:** the `State` object is attached to the **Element**, not the widget. Widgets are destroyed and recreated on every rebuild; elements persist. So state lives somewhere stable while the configuration flows through.

**Choosing between them:**

Use **Stateless** when everything the widget needs comes from its constructor parameters or from inherited widgets (`Theme.of`, `MediaQuery.of`). Use **Stateful** when the widget itself owns data that changes over time, or when you need lifecycle hooks — an `AnimationController`, a `TextEditingController`, a `StreamSubscription`, a scroll listener.

**The modern caveat worth raising:** with a state management solution (Riverpod, BLoC, Provider), most screens become `StatelessWidget`s, because the state lives outside the widget tree entirely. `StatefulWidget` then narrows to its genuine purpose — **ephemeral, local UI state** (is this dropdown open, what's in this text field) and **resource lifecycle** (controllers that need disposing).

`ConsumerWidget` (Riverpod) and `HookWidget` (flutter_hooks) are stateless widgets that get state another way, which is why you see far fewer `StatefulWidget`s in modern codebases than in older tutorials.

## 3. Explain the Lifecycle of a StatefulWidget.
1. `createState()`
2. `initState()`: Called exactly once. Initialize variables here.
3. `didChangeDependencies()`: Called when a dependency (like InheritedWidget) changes.
4. `build()`: Called repeatedly to render the UI.
5. `didUpdateWidget()`: Called if the parent rebuilds and provides a new widget instance.
6. `dispose()`: Called when the widget is permanently removed. Clean up controllers here.

**The order on first insertion is:** `createState` → `initState` → `didChangeDependencies` → `build`. On every later rebuild: `didUpdateWidget` (if the parent rebuilt) → `build`. On removal: `deactivate` → `dispose`.

**What belongs in each, and the trap in each:**

**`initState`** — one-time setup: controllers, subscriptions, initial data fetch. **You cannot use `InheritedWidget`s here** — `Theme.of(context)` and `MediaQuery.of(context)` will throw or misbehave, because dependencies aren't registered yet. Always call `super.initState()` first.

```dart
@override
void initState() {
  super.initState();
  _controller = AnimationController(vsync: this, duration: widget.duration);
  _sub = stream.listen(_onData);
  // Theme.of(context) ← NOT HERE
}
```

**`didChangeDependencies`** — called after `initState` and again whenever an inherited dependency changes. **This is where `Theme.of` / `MediaQuery.of` work safely**, and where you react to an inherited value changing.

**`didUpdateWidget(oldWidget)`** — the parent rebuilt with new configuration. Compare old and new and react:

```dart
@override
void didUpdateWidget(MyWidget oldWidget) {
  super.didUpdateWidget(oldWidget);
  if (widget.url != oldWidget.url) {
    _subscription.cancel();
    _subscribe(widget.url);          // re-fetch for the new URL
  }
}
```

Forgetting this is a classic bug: the parent passes a new `userId` but your widget keeps showing the old user, because `initState` only ran once.

**`build`** — must be **pure and fast**. No side effects, no `setState`, no network calls. It can be called many times per second.

**`dispose`** — release everything. **This is where leaks happen if you skip it:**

```dart
@override
void dispose() {
  _controller.dispose();
  _subscription.cancel();
  _textController.dispose();
  _focusNode.dispose();
  super.dispose();                   // super LAST in dispose
}
```

Note the asymmetry: `super` **first** in `initState`, **last** in `dispose`.

**Two more callbacks** worth knowing: `deactivate()` (removed from the tree, but may be reinserted elsewhere — relevant with `GlobalKey` moves) and `reassemble()` (hot reload only, for re-running debug setup).

**The `mounted` guard** is essential after any `await`, because the widget may be gone by the time the future completes:

```dart
final data = await fetch();
if (!mounted) return;              // or setState throws
setState(() => _data = data);
```

## 4. What does `setState()` do?
It notifies the framework that the internal state of a `StatefulWidget` has changed, scheduling a call to the `build()` method to update the UI.

```dart
setState(() {
  _counter++; // Framework schedules a rebuild
});
```

**It does not rebuild immediately.** It marks the element **dirty** and schedules a rebuild for the **next frame**. Calling `setState` five times in a row produces one rebuild, not five — the framework coalesces them.

**The callback is synchronous and its purpose is a convention, not a mechanism.** `setState` doesn't inspect what you changed; the state is already mutated by the time the framework looks. Putting the mutation inside the callback is a discipline that makes the change obvious and guarantees it happens before the rebuild is scheduled:

```dart
// Works, but misleading — don't do this
_counter++;
setState(() {});

// Idiomatic
setState(() => _counter++);
```

**Keep the callback tiny and synchronous.** An `async` callback is a bug — `setState` returns before the await completes, so the rebuild happens with the old value:

```dart
// WRONG — setState returns immediately; the rebuild uses stale data
setState(() async { _data = await fetch(); });

// RIGHT — await first, then setState synchronously
final data = await fetch();
if (!mounted) return;
setState(() => _data = data);
```

**The errors you'll actually hit:**

- **`setState() called after dispose()`** — a late async callback. Guard with `if (!mounted) return;`.
- **`setState() called during build`** — calling it from inside `build`, or synchronously from a builder callback. Defer with `WidgetsBinding.instance.addPostFrameCallback((_) => setState(...))`.
- **`setState() called in constructor`** — the element doesn't exist yet.

**The performance consideration that matters most: `setState` rebuilds the *entire* `State`'s subtree.** If one small counter sits inside a heavy widget tree, everything rebuilds:

```dart
// Everything below rebuilds when _count changes
Column(children: [
  const ExpensiveHeader(),       // const saves this one
  ExpensiveChart(data: data),    // this rebuilds unnecessarily
  Text('$_count'),
])
```

The fixes, in order of preference: mark unchanging subtrees `const`, **push `setState` into the smallest possible widget** (extract the counter into its own `StatefulWidget`), or use a targeted rebuild mechanism (`ValueListenableBuilder`, `AnimatedBuilder`, or a state management package).

**`setState` is fine for local, ephemeral state.** It becomes a problem when it's used for app-wide state, because the rebuild scope grows with the widget — which is the motivation for every state management solution in the ecosystem.

## 5. What is `BuildContext`?
A handle to the location of a widget in the widget tree. It is used to look up themes, media queries, or ancestors (like Providers or InheritedWidgets) up the tree.

```dart
final color = Theme.of(context).primaryColor;
```

**A `BuildContext` *is* the `Element`.** That's the single most clarifying fact — `BuildContext` is just an interface that `Element` implements, exposing the safe subset. So "the location in the tree" is literal: the context is the node itself.

**This explains how `.of(context)` works.** It walks **up** from that node looking for the nearest matching ancestor:

```dart
Theme.of(context)        // nearest Theme ancestor
MediaQuery.of(context)   // nearest MediaQuery
Navigator.of(context)    // nearest Navigator
Provider.of<T>(context)  // nearest Provider<T>
```

It also **registers a dependency**, so when that ancestor's data changes, this element is rebuilt automatically. That's the whole `InheritedWidget` mechanism in one call.

**The classic error — "No Scaffold/Provider found" — is a context-position problem**, not a missing widget:

```dart
// FAILS: this context is ABOVE the Scaffold, so the lookup can't find it
Widget build(BuildContext context) {
  return Scaffold(
    body: ElevatedButton(
      onPressed: () => ScaffoldMessenger.of(context).showSnackBar(...),  // ✗
      child: const Text('Show'),
    ),
  );
}

// FIXED: Builder introduces a new context BELOW the Scaffold
body: Builder(
  builder: (innerContext) => ElevatedButton(
    onPressed: () => ScaffoldMessenger.of(innerContext).showSnackBar(...),  // ✓
  ),
),
```

Extracting the child into its own widget achieves the same thing more cleanly, and is usually the better fix.

**The `mounted` / async gap rule** is the other thing to know. A context can become invalid while you await:

```dart
await Future.delayed(const Duration(seconds: 2));
if (!context.mounted) return;        // required — the lint enforces it
Navigator.of(context).pop();
```

The `use_build_context_synchronously` lint flags this, and it should be enabled.

**Performance note:** `Theme.of(context)` subscribes the whole widget to theme changes. For things that change frequently, prefer the narrower modern accessors — `MediaQuery.sizeOf(context)` instead of `MediaQuery.of(context).size` — which only rebuild when that specific property changes rather than on every `MediaQuery` update (keyboard appearing, rotation, etc.).

**Other uses:** `context.findRenderObject()` for size and position, `context.findAncestorWidgetOfExactType<T>()` (expensive — avoid in `build`), and `Navigator.of(context)` for routing.

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

**The memory aid: the main axis is the direction the children are laid out *in*.** A `Row` lays children out horizontally, so horizontal is its main axis. A `Column` stacks vertically, so vertical is its main axis. Everything else follows.

**`MainAxisAlignment` values** — how children are distributed along that direction:

- `start` (default), `end`, `center`
- `spaceBetween` — first and last at the edges, equal gaps between
- `spaceAround` — equal space around each child (half-size gaps at the ends)
- `spaceEvenly` — truly equal gaps everywhere, including the ends

**`CrossAxisAlignment` values** — how children align perpendicular to it:

- `center` (default), `start`, `end`
- `stretch` — children fill the cross axis entirely
- `baseline` — aligns text baselines; **requires `textBaseline`** to be set, which is a common runtime error

**`mainAxisSize` is the overlooked third property**, and it causes a lot of confusion:

```dart
Row(
  mainAxisSize: MainAxisSize.min,   // only as wide as the children
  // default is MainAxisSize.max — takes ALL available width
)
```

With `max` (the default), `MainAxisAlignment.center` centres within the full width. With `min`, there's no extra space, so the alignment appears to do nothing — which is exactly the "why isn't my alignment working?" question.

**The unbounded-constraint error** is the single most common Flutter layout exception, and it comes from this family:

```
RenderFlex children have non-zero flex but incoming height constraints are unbounded
```

It means you put an `Expanded`/`Flexible` inside a `Column` that has infinite height — typically a `Column` inside a `SingleChildScrollView` or another `Column`. A scrollable gives its child unbounded space in the scroll direction, so "fill the available space" is meaningless. The fixes are to give it a bounded height (`SizedBox`, `Expanded` on the outer widget) or to use `shrinkWrap: true` on a nested list.

**Note also that `Row`/`Column` do not scroll and do not wrap.** Overflow produces the yellow-and-black stripes. For scrolling use `ListView`; for wrapping use `Wrap`.

## 7. What is an `InheritedWidget`?
A special type of widget used to efficiently propagate information down the widget tree. When its data changes, it automatically triggers a rebuild for only the descendants that depend on it.

**It solves prop drilling** — passing a value through ten widgets that don't care about it just to reach the one that does. An `InheritedWidget` makes data available to any descendant at **O(1)** lookup cost, regardless of depth.

**The O(1) part is the clever bit.** Each `Element` maintains a map of inherited widget types available at its position, built as the tree is constructed. So `Theme.of(context)` is a hash lookup, not a tree walk — which is why it's cheap enough to call in every `build`.

```dart
class ThemeConfig extends InheritedWidget {
  const ThemeConfig({super.key, required this.color, required super.child});
  final Color color;

  static ThemeConfig of(BuildContext context) {
    final result = context.dependOnInheritedWidgetOfExactType<ThemeConfig>();
    assert(result != null, 'No ThemeConfig found in context');
    return result!;
  }

  @override
  bool updateShouldNotify(ThemeConfig old) => color != old.color;
}
```

**`updateShouldNotify` is where the efficiency lives.** Return `false` and no dependent rebuilds, even if the widget itself was recreated. Returning `true` unconditionally — or omitting a proper `==` on your data class — means every rebuild of the inherited widget rebuilds every dependent, which defeats the purpose.

**Two lookup methods, and the difference matters:**

- **`dependOnInheritedWidgetOfExactType<T>()`** — reads the value **and registers a dependency**, so this widget rebuilds when the data changes. This is what `.of(context)` normally does.
- **`getInheritedWidgetOfExactType<T>()`** — reads without subscribing. Use it in callbacks and `initState` where you want the current value but no rebuild.

**Flutter is built on it:** `Theme`, `MediaQuery`, `Navigator`, `Directionality`, `DefaultTextStyle`, `Localizations`, `ScaffoldMessenger` — all `InheritedWidget`s. So are `Provider` and Riverpod's scopes, which are essentially ergonomic wrappers around this mechanism.

**Its limitation**, and why packages exist: an `InheritedWidget` is immutable, so changing the data means rebuilding it with new values — which means something above it must be stateful. The standard pattern is a `StatefulWidget` wrapping an `InheritedWidget`, which is exactly what `Provider` generates for you. `InheritedNotifier` and `InheritedModel` (which allows depending on *aspects* of the data for finer-grained rebuilds) cover some of this in the framework itself.

## 8. What is a `Scaffold`?
A high-level structural widget that implements the basic material design visual layout structure (app bar, drawers, floating action button, bottom navigation).

```dart
Scaffold(
  appBar: AppBar(title: Text("Home")),
  body: Center(child: Text("Content")),
  floatingActionButton: FloatingActionButton(onPressed: () {}),
)
```

**It's a layout coordinator, not just a container.** It positions the app bar, body, FAB, bottom bar and drawers relative to one another, handles system insets, and — importantly — manages the interactions between them: the FAB moving when a snackbar appears, the body resizing when the keyboard opens, the drawer's swipe gesture.

**The main slots:**

```dart
Scaffold(
  appBar: AppBar(title: const Text('Home')),
  body: const Content(),
  floatingActionButton: FloatingActionButton(onPressed: () {}),
  floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
  drawer: const AppDrawer(),              // left — hamburger added automatically
  endDrawer: const FilterDrawer(),        // right
  bottomNavigationBar: const NavBar(),
  bottomSheet: const PersistentSheet(),
  backgroundColor: Colors.white,
  resizeToAvoidBottomInset: true,         // default: body shrinks for the keyboard
)
```

**`resizeToAvoidBottomInset` is worth knowing** — with the default `true`, the body resizes when the keyboard appears, which is usually right but causes overflow errors in fixed-height layouts. Set it `false` and wrap the body in a scrollable instead.

**`ScaffoldMessenger` is the modern way to show snackbars**, and the reason is practical: it lives *above* the `Scaffold`, so a snackbar survives navigation and doesn't vanish when the screen it was shown from is replaced:

```dart
ScaffoldMessenger.of(context).showSnackBar(
  const SnackBar(content: Text('Saved')),
);
```

**The "no Scaffold found" error** is the context problem from question 5 — `Scaffold.of(context)` called with the context of the widget that *created* the Scaffold, which is above it. Use a `Builder` or extract a child widget.

**One Scaffold per screen.** Nesting them is a common beginner mistake that produces duplicated app bars and broken drawer behaviour. If you need per-tab app bars, give each tab's content its own Scaffold *inside* the tab view, not nested around the outer one.

**`CupertinoPageScaffold`** is the iOS equivalent, and `Scaffold` itself is Material — for a fully custom design, you can skip it entirely and build the structure yourself, though you then handle insets and keyboard behaviour manually.

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

**The distinction is eager versus lazy construction**, and it's a correctness issue at scale, not just performance:

- **`ListView(children: [...])`** builds **every** child immediately, even those far off screen. For 10,000 items that's 10,000 widget trees constructed before the first frame — seconds of jank, or an out-of-memory crash.
- **`ListView.builder`** calls `itemBuilder` lazily, only for items near the viewport, and disposes those that scroll far away.

**Use `.builder` by default.** The eager constructor is only appropriate for a genuinely small, fixed set of heterogeneous children.

**The full family:**

```dart
// Separators between items — no manual Divider in the builder
ListView.separated(
  itemCount: items.length,
  itemBuilder: (c, i) => ListTile(title: Text(items[i])),
  separatorBuilder: (c, i) => const Divider(),
)

// Grids
GridView.builder(
  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2),
  itemBuilder: (c, i) => Card(child: Text('$i')),
)

// Mixed scrollable content — headers, grids and lists in one scroll view
CustomScrollView(
  slivers: [
    const SliverAppBar(floating: true, title: Text('Feed')),
    SliverList.builder(itemBuilder: (c, i) => Tile(i), itemCount: n),
    const SliverToBoxAdapter(child: Footer()),
  ],
)
```

**`CustomScrollView` with slivers is the answer** whenever you'd otherwise nest scrollables — a header that scrolls away above a list, or a grid and list in one scroll view.

**Performance practices that matter:**

- **Give items a `key`** (`ValueKey(item.id)`) so state and animations follow the right item through reordering.
- **Set `itemExtent` or `prototypeItem`** when items are a uniform height — it lets Flutter skip measuring each one, which noticeably improves scroll performance and makes scrollbar dragging accurate.
- **Keep `itemBuilder` cheap** — it runs during scrolling. No parsing, no formatting; pre-compute in your view model.
- **Avoid `shrinkWrap: true`** where you can. It forces the list to measure **all** children to determine its own size, destroying the laziness. The usual reason people reach for it — a list inside a `Column` — is better solved with `Expanded` or slivers.

**For very large or paginated data**, `infinite_scroll_pagination` or a manual `ScrollController` listener handles loading the next page as the user approaches the end.

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

**How the two-pass layout works** — this is what makes `Expanded` make sense:

1. The `Row`/`Column` first measures all **non-flexible** children at their natural size.
2. It subtracts that from the available space.
3. It divides the **remainder** among the flexible children according to their `flex` values.

So `Expanded` doesn't mean "be big" — it means "take a share of whatever is left after everyone else."

**The `flex` property distributes proportionally:**

```dart
Row(
  children: [
    Expanded(flex: 2, child: Container(color: Colors.red)),    // 2/3 of leftover
    Expanded(flex: 1, child: Container(color: Colors.blue)),   // 1/3
  ],
)
```

The default `flex` is 1, so several bare `Expanded`s split the space equally.

**The error you will hit**, and why:

```
RenderFlex children have non-zero flex but incoming height constraints are unbounded
```

`Expanded` requires a **bounded** main axis — it needs to know what "available space" means. Inside a `SingleChildScrollView` or a nested `Column`, the main axis is infinite, so the question is unanswerable. The fixes:

- Give the parent a bounded size (`SizedBox(height: 200, child: Column(...))`).
- Use `Flexible` with `FlexFit.loose` instead, if the child can size itself.
- Restructure with slivers for genuinely scrollable content.

**`Expanded` must be a *direct* child of a `Flex` widget.** Wrapping it in a `Container` or `Padding` breaks it with an assertion — the `Row` needs to see the `Expanded` itself to know the child is flexible. Put the padding *inside* the `Expanded`, not around it.

```dart
// Wrong
Row(children: [Padding(padding: ..., child: Expanded(child: Text('x')))])

// Right
Row(children: [Expanded(child: Padding(padding: ..., child: Text('x')))])
```

**`Expanded` is literally `Flexible(fit: FlexFit.tight)`** — see the next question for why that matters.

## 11. What is the `Flexible` widget?
Similar to `Expanded`, but `Expanded` *forces* the child to fill the space (`fit: FlexFit.tight`), whereas `Flexible` allows the child to be smaller than the available space if it wants to (`fit: FlexFit.loose`).

**The difference is the constraint passed to the child:**

- **`FlexFit.tight`** (`Expanded`) — the child is given an **exact** size and must fill it. Its own preferred size is ignored.
- **`FlexFit.loose`** (`Flexible` default) — the child is given a **maximum** and may be smaller. It sizes itself naturally up to that limit.

```dart
Row(
  children: [
    Flexible(child: Container(width: 50, color: Colors.red)),   // stays 50 wide
    Expanded(child: Container(width: 50, color: Colors.blue)),  // forced to fill
  ],
)
```

The red box stays 50px because `Flexible` lets it keep its preferred width; the blue box ignores its `width: 50` entirely because `Expanded` imposes a tight constraint.

**The practical distinction: use `Flexible` when the child should shrink but not grow.** The canonical case is text that must not overflow but shouldn't be padded out:

```dart
Row(
  children: [
    Flexible(                       // shrinks to fit, but no wider than needed
      child: Text(longTitle, overflow: TextOverflow.ellipsis),
    ),
    const Icon(Icons.verified),     // always visible, never pushed off screen
  ],
)
```

With `Expanded` the text would occupy all remaining width even when short, pushing the icon to the far edge. With `Flexible`, the icon sits right beside the text, and the text ellipsises only when it genuinely runs out of room.

**Both can carry a `flex` value**, and both must be direct children of a `Flex` widget, and both require a bounded main axis.

**Related widgets in the same family:**

- **`Spacer`** — `Expanded` with an empty child. `Spacer()` is exactly `Expanded(child: SizedBox.shrink())`.
- **`Wrap`** — when children should flow onto a new line instead of being squeezed. Often the right answer when you're reaching for `Flexible` to prevent overflow of many chips or tags.
- **`FittedBox`** — scales a child down to fit, rather than constraining it.
- **`IntrinsicWidth`/`IntrinsicHeight`** — size to the natural size of children, but **expensive** (an extra layout pass); avoid in lists.

**Rule of thumb:** `Expanded` to divide space, `Flexible` to prevent overflow while keeping natural sizing.

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

**Children are painted in order — later children appear on top.** The first child is the bottom layer.

**Two kinds of children, with different sizing rules:**

- **Non-positioned** — laid out according to `alignment`, and these determine the Stack's size (it sizes to the largest one by default).
- **Positioned** — wrapped in `Positioned`, placed relative to the Stack's edges, and they **do not** contribute to the Stack's size.

```dart
Stack(
  children: [
    Image.network(url),                           // non-positioned: sets the size
    Positioned(
      bottom: 16, right: 16,                      // relative to Stack edges
      child: FloatingActionButton(onPressed: () {}),
    ),
    Positioned.fill(                              // all four edges = 0
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [Colors.black54, Colors.transparent]),
        ),
      ),
    ),
  ],
)
```

**`Positioned.fill` is the idiom for overlays** — gradients, scrims, tap-catchers covering the whole stack.

**The `fit` property** controls how non-positioned children are constrained:

- **`StackFit.loose`** (default) — children size themselves.
- **`StackFit.expand`** — children are forced to fill the Stack.
- **`StackFit.passthrough`** — constraints pass through unchanged from the Stack's parent.

**`clipBehavior`** decides whether children can paint outside the bounds — `Clip.hardEdge` by default, `Clip.none` to allow overflow (a badge hanging off the corner of an avatar).

**The error to recognise:** "Stack has no non-positioned children and unbounded constraints." If every child is `Positioned`, the Stack has nothing to size itself from. Wrap it in a `SizedBox`, use `StackFit.expand`, or include at least one non-positioned child.

**Common uses:** image with text or gradient overlay, badges on icons, a loading spinner over content, custom bottom sheets, drag-and-drop interfaces, and anything with floating controls.

**Note `IndexedStack`** — a sibling that keeps all children in the tree but shows only one. It's the standard way to preserve state across bottom-navigation tabs, since the inactive tabs aren't disposed.

## 13. What is a `SafeArea` widget?
A widget that insets its child by sufficient padding to avoid intrusions from the operating system, like the notch on iPhones or the status bar on Android.

**What it actually does:** reads `MediaQuery.paddingOf(context)` — the system-reported intrusions — and applies that as padding, then **consumes** it so nested `SafeArea`s don't double up.

**The intrusions it handles:** the status bar, the iPhone notch and Dynamic Island, the home indicator at the bottom, rounded display corners, Android gesture navigation bars, and camera cutouts.

```dart
Scaffold(
  body: SafeArea(
    top: true,        // all default to true
    bottom: true,
    left: true,
    right: true,
    minimum: EdgeInsets.all(8),      // floor, applied even with no intrusion
    child: const Content(),
  ),
)
```

**Where to place it** is the part worth getting right:

- **Not around the whole `Scaffold`** — the `AppBar` already handles the status bar itself, so wrapping outside gives you a double gap.
- **Around the `body`**, or better, around the *content* that must avoid intrusions.
- **Selectively disable edges** when you want content to bleed: a full-bleed hero image wants `top: false` so it extends under the status bar, while the text below it still needs protection.

```dart
Scaffold(
  body: Column(
    children: [
      HeroImage(),                                    // bleeds under the status bar
      Expanded(child: SafeArea(top: false, child: Content())),
    ],
  ),
)
```

**`SafeArea` vs. `MediaQuery.padding` vs. `viewInsets`** — a distinction that comes up:

- **`padding`** — system intrusions (notch, home indicator). What `SafeArea` uses.
- **`viewInsets`** — things covering the UI, chiefly **the keyboard**. `SafeArea` does *not* handle the keyboard; `resizeToAvoidBottomInset` on the Scaffold does.
- **`viewPadding`** — padding ignoring whether something is currently covering it.

**For edge-to-edge designs** (the modern Android and iOS default), you deliberately draw under the system bars and apply insets only where needed:

```dart
SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
```

Then use `SafeArea` on interactive elements only, letting backgrounds extend fully. `MediaQuery.viewPaddingOf(context)` gives you the values to position things manually.

**Also note `SafeArea` only pads — it doesn't change colours.** Setting the status bar icon brightness is `SystemChrome.setSystemUIOverlayStyle` or the `AppBar`'s `systemOverlayStyle`.

## 14. What are Keys in Flutter?
Keys control which widgets the framework matches up with other widgets when a widget rebuilds. They are essential when preserving state in a dynamic collection of identical StatefulWidgets (like reordering a list).

```dart
// Using a ValueKey to identify a specific item
ListView(
  children: items.map((item) => MyWidget(key: ValueKey(item.id))).toList(),
)
```

**Why keys exist: Flutter's reconciliation matches widgets to elements by *type and position*.** Two widgets of the same type at the same position are assumed to be "the same" widget, so the existing element and its `State` are reused with the new configuration. That's usually what you want — and occasionally badly wrong.

**The canonical demonstration:** two stateful colour tiles with internal state. Swap them in the list, and nothing appears to change — because position matched first, so each `State` stayed where it was and only the configuration moved. Add `key: ValueKey(color)` and the elements follow their widgets, so the swap works.

**Where you actually need them:**

1. **Reordering or filtering a list of stateful children** — without keys, state attaches to the wrong item.
2. **Dismissible / ReorderableListView items** — these require keys.
3. **Preserving scroll position or form state** across a list change.
4. **Animating between widgets of the same type** (`AnimatedSwitcher` needs a key to know the child changed).
5. **Forcing a widget to rebuild from scratch** — changing the key destroys the old element and its state entirely.

**The key types:**

- **`ValueKey(value)`** — identity from a value. `ValueKey(item.id)` is the normal choice.
- **`ObjectKey(object)`** — identity from the object's own identity, for when a value isn't unique.
- **`UniqueKey()`** — a fresh identity every build. Useful to *force* recreation, but note it guarantees the state is destroyed every rebuild, which is usually a bug if used carelessly.
- **`GlobalKey`** — unique across the entire app; gives access to the widget's `State`, `BuildContext`, and `RenderObject`.

```dart
final _formKey = GlobalKey<FormState>();
_formKey.currentState!.validate();     // the main legitimate GlobalKey use
```

**`GlobalKey` costs more** — it allows moving an element anywhere in the tree, which forces extra bookkeeping. Use it for forms, for measuring a specific widget, and for imperative control of `Scaffold`/`Navigator` state — not as a general way to reach into other widgets, which usually indicates state should be hoisted instead.

**The simple rule:** keys matter when **stateful** widgets of the **same type** can **change position**. Stateless widgets in a static layout don't need them.

## 15. What is the difference between `Container` and `SizedBox`?
- `SizedBox`: A lightweight widget used purely for forcing a specific width/height or adding empty spacing.
- `Container`: A heavier, versatile widget that combines padding, margins, sizing, background colors, and borders (decoration).

```dart
SizedBox(height: 16); // Better for just empty space
```

**`Container` is a convenience composition.** It isn't a primitive — it builds a tree of other widgets based on which properties you set:

```
Container(padding:, color:, width:, alignment:, margin:)
  → Padding (margin)
    → ConstrainedBox / SizedBox (width/height)
      → DecoratedBox (color/decoration)
        → Padding (padding)
          → Align (alignment)
            → child
```

Unset properties are skipped, so `Container(color: x, child: y)` is genuinely lightweight. But a fully-configured `Container` is six widgets.

**`SizedBox` can be `const`; `Container` usually can't** be when it has a colour or decoration — and `const` widgets are skipped during rebuild entirely. For pure spacing, this makes `SizedBox` strictly better:

```dart
const SizedBox(height: 16)          // const, 1 widget, skipped on rebuild
Container(height: 16)               // not const, more machinery
```

**The specialised alternatives** are worth preferring when you only need one thing:

- Spacing → `const SizedBox(height: 16)`
- Padding only → `Padding(padding: ...)`
- Background only → `ColoredBox` or `DecoratedBox`
- Centring → `Center`
- Alignment → `Align`
- Constraints → `ConstrainedBox`

Each is a single widget rather than a composition, and each can often be `const`.

**Useful `SizedBox` idioms:**

```dart
const SizedBox.shrink()                       // zero size — the "render nothing" widget
const SizedBox.expand()                       // fill available space
SizedBox(width: double.infinity, child: x)    // full width, natural height
```

`SizedBox.shrink()` is the idiomatic "nothing here" return value, better than `Container()`.

**When `Container` genuinely earns its place:** when you need several of its features at once — padding *and* a decoration *and* a constraint. Then it's more readable than four nested widgets, and the composition cost is the same either way.

**A gotcha:** `Container` throws if you set both `color` and `decoration` — `color` is shorthand for a `BoxDecoration(color:)`, so put the colour inside the decoration instead.

## 16. What is `MediaQuery`?
An InheritedWidget that provides information about the current media (e.g., window size, orientation, system insets) to its descendants.

```dart
final screenWidth = MediaQuery.of(context).size.width;
```

**What it exposes**, beyond size:

```dart
final mq = MediaQuery.of(context);
mq.size;               // logical screen size
mq.orientation;        // portrait / landscape
mq.devicePixelRatio;   // physical pixels per logical pixel
mq.padding;            // system intrusions (notch, home indicator)
mq.viewInsets;         // things covering the UI — chiefly the KEYBOARD
mq.textScaler;         // user's font size preference
mq.platformBrightness; // system light/dark mode
mq.accessibleNavigation; // screen reader active
```

**The most important modern practice: use the specific `.xOf(context)` accessors**, not `MediaQuery.of(context)`:

```dart
MediaQuery.sizeOf(context)          // rebuilds only when size changes
MediaQuery.orientationOf(context)
MediaQuery.viewInsetsOf(context)
MediaQuery.textScalerOf(context)
```

`MediaQuery.of(context)` subscribes to the **whole** `MediaQueryData`, so your widget rebuilds when *anything* changes — including `viewInsets` animating on every frame as the keyboard slides up. In a list, that's a lot of needless rebuilds. The granular accessors were added precisely to fix this, and using them is a meaningful performance improvement.

**`viewInsets` is how you handle the keyboard:**

```dart
Padding(
  padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
  child: const TextField(),
)
```

**For responsive layouts, prefer `LayoutBuilder` over `MediaQuery` when you care about the *parent's* size** rather than the screen's. `MediaQuery` always reports the window; `LayoutBuilder` reports the constraints your widget actually received — which is what matters inside a split view, a side panel, or a dialog:

```dart
LayoutBuilder(
  builder: (context, constraints) => constraints.maxWidth > 600
      ? const WideLayout()
      : const NarrowLayout(),
)
```

**Respect `textScaler`.** Users can set very large system fonts, and hardcoded heights break. Test at 200% text scale — it's an accessibility requirement and a common source of overflow bugs. Avoid the old anti-pattern of disabling text scaling entirely.

**A common error:** calling `MediaQuery.of(context)` in `initState`. Do it in `didChangeDependencies` or in `build` instead.

## 17. How do you implement forms and validation?
Use a `Form` widget coupled with a `GlobalKey<FormState>`. Inside the form, use `TextFormField` widgets which have built-in `validator` callbacks.

```dart
final _formKey = GlobalKey<FormState>();
// Later: _formKey.currentState!.validate()
```

**The full pattern:**

```dart
class _LoginFormState extends State<LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();        // ALWAYS dispose controllers
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Form(
    key: _formKey,
    autovalidateMode: AutovalidateMode.onUserInteraction,
    child: Column(children: [
      TextFormField(
        controller: _emailController,
        keyboardType: TextInputType.emailAddress,
        textInputAction: TextInputAction.next,
        decoration: const InputDecoration(labelText: 'Email'),
        validator: (value) {
          if (value == null || value.isEmpty) return 'Email is required';
          if (!value.contains('@')) return 'Enter a valid email';
          return null;                  // null means VALID
        },
      ),
      ElevatedButton(
        onPressed: () {
          if (_formKey.currentState!.validate()) {
            _formKey.currentState!.save();     // triggers onSaved callbacks
            _submit();
          }
        },
        child: const Text('Submit'),
      ),
    ]),
  );
}
```

**`validator` returns `null` for valid** and an error string otherwise — inverted from what people expect, and a frequent source of "validation always fails."

**`autovalidateMode: AutovalidateMode.onUserInteraction`** is the right default. `always` shows errors on an untouched form, which is hostile; `disabled` means nothing shows until submit. `onUserInteraction` validates each field once the user has touched it.

**The `FormState` API:**

- `validate()` — runs all validators, returns whether all passed, and displays errors.
- `save()` — calls every field's `onSaved`.
- `reset()` — returns fields to their initial values and clears errors.

**Controllers vs. `onSaved`** are two approaches: a `TextEditingController` gives you live access to the value (needed for things like a password-match check or a character counter), while `onSaved` collects values only at submit time. Controllers **must be disposed**.

**Focus management** matters for a good form experience — `textInputAction: TextInputAction.next` plus `FocusScope.of(context).nextFocus()` moves between fields, and `autofillHints` enables password-manager and OS autofill integration.

**For complex forms**, the manual approach becomes unwieldy. `flutter_form_builder` (declarative fields and composable validators) and `reactive_forms` (a model-driven approach closer to Angular's) are the established packages. For form state in a larger architecture, validation often moves into the ViewModel/BLoC so it's unit-testable without the widget tree.

## 18. What is the Widget Tree vs Element Tree vs Render Tree?
1. **Widget Tree**: The blueprint (configuration) written by the developer. It is immutable and cheap to rebuild.
2. **Element Tree**: The logical structure that manages the lifecycle and state. It holds references to widgets and render objects.
3. **Render Tree**: The actual objects that do the math for layout (size/position) and painting pixels to the screen.

**This is the most important architectural question in Flutter**, because almost every performance and state behaviour follows from it.

```
  Widget Tree          Element Tree              Render Tree
  (immutable,          (mutable, persistent,     (expensive: layout,
   recreated often)     holds State)              paint, hit-testing)

  Container       ←→   SingleChildElement   ←→   RenderDecoratedBox
     │                      │                         │
   Text           ←→   StatelessElement     ←→   RenderParagraph
```

**The Element tree is the bridge, and it's where the value is.** Widgets are cheap and disposable; render objects are expensive. The element tree persists between frames and decides, for each position, whether the new widget can **update** the existing render object or whether a new one must be created.

**The update rule** — `Widget.canUpdate(old, new)` — is simply: **same `runtimeType` and same `key`**. If true, the element is reused and the render object is merely reconfigured. If false, the element is deactivated, its `State` is destroyed, and a new subtree is built.

This single rule explains:

- **Why rebuilds are cheap** — a rebuild creates widgets, compares them, and usually just updates a few render object properties. No new render objects, no state loss.
- **Why keys matter** (question 14) — they change the matching outcome.
- **Why `State` survives rebuilds** — it belongs to the element, not the widget.
- **Why changing a widget's type resets its state** — different `runtimeType` means a new element.

**The render tree does the actual work:** layout (constraints go down, sizes come back up), painting, compositing into layers, and hit-testing. It's the only expensive tree, which is why Flutter works so hard to avoid touching it.

**A practical consequence:** when you worry about "too many rebuilds," what you should actually measure is whether those rebuilds cause **relayout and repaint**. A rebuild that produces identical widgets costs almost nothing. `RepaintBoundary` isolates a subtree so its repaints don't propagate, and `const` widgets short-circuit the comparison entirely.

**There's a fourth tree in practice** — the **layer tree** that the compositor rasterises, which is what `RepaintBoundary` creates boundaries in.

## 19. What does the `Spacer` widget do?
It creates an adjustable, empty space that can be used to tune the spacing between widgets in a Flex container, like Row or Column.

**It's literally `Expanded` with an empty child:**

```dart
// These are equivalent
const Spacer()
Expanded(child: Container())
```

So everything true of `Expanded` is true of `Spacer` — it takes a share of the *remaining* space after fixed-size children are measured, it must be a direct child of a `Flex`, and it requires a bounded main axis.

**The `flex` property gives you proportional gaps:**

```dart
Row(
  children: [
    const Text('Left'),
    const Spacer(flex: 2),      // twice as much space
    const Text('Middle'),
    const Spacer(flex: 1),
    const Text('Right'),
  ],
)
```

**`Spacer` vs. `SizedBox` vs. `MainAxisAlignment`** — choosing between them is the real content here:

- **`SizedBox(width: 16)`** — a **fixed** gap. Use when the spacing should be consistent regardless of available width, which is most of the time in a design system.
- **`Spacer()`** — a **flexible** gap that absorbs leftover space. Use to push things apart or to the edges.
- **`MainAxisAlignment.spaceBetween`** — achieves the same as a single `Spacer` between two children, and is clearer when all gaps should be equal.

```dart
// Equivalent, and spaceBetween is more idiomatic for this case
Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [a, b])
Row(children: [a, const Spacer(), b])
```

Reach for `Spacer` when the distribution is **uneven** — pushing one item to the end while others stay grouped, or weighting gaps differently. Use `spaceBetween`/`spaceEvenly` when the pattern is uniform.

**Gotchas:**

- **`Spacer` fails in a scrollable.** Inside a `SingleChildScrollView`, the main axis is unbounded, so there is no "remaining space." You'll get the unbounded-constraints error. Use a `SizedBox` instead.
- **It doesn't work with `MainAxisSize.min`**, for the same reason — there's no leftover space to take.
- **It's always `const`**-constructible, so it costs essentially nothing.

**Modern alternative:** `Row`/`Column` now accept a `spacing` parameter in recent Flutter versions, which applies a uniform gap between children without interleaving `SizedBox`es — cleaner than either approach for even spacing.

## 20. How do you hide a widget in Flutter?
Flutter doesn't have a `visibility` property like XML. You either:
1. Don't include it in the tree at all using an `if` statement.
2. Wrap it in a `Visibility` widget (maintains state/space if configured to).
3. Wrap it in an `Offstage` widget (keeps it in the tree but hides it).

```dart
if (showButton) ElevatedButton(onPressed: (){}, child: Text("Click")),
```

**The options differ in what they preserve**, and choosing wrongly causes either lost state or wasted work:

**1. Collection-`if` — not in the tree at all.** Cheapest. The widget isn't built, takes no space, and **its state is destroyed**. This is the right default:

```dart
Column(children: [
  const Header(),
  if (isLoggedIn) const ProfileTile(),     // simply absent when false
])
```

**2. `Visibility`** — flexible, with explicit control over what's retained:

```dart
Visibility(
  visible: showIt,
  maintainState: true,      // keep State alive (and its controllers/subscriptions)
  maintainAnimation: true,  // keep animations ticking
  maintainSize: true,       // still occupies layout space
  replacement: const SizedBox.shrink(),   // what to show instead
  child: const ExpensiveWidget(),
)
```

Note `maintainSize` requires `maintainAnimation`, which requires `maintainState` — they stack.

**3. `Offstage`** — built and laid out (so you can measure it) but not painted and not hit-testable:

```dart
Offstage(offstage: true, child: const Chart())    // measurable but invisible
```

Its genuine use is measuring a widget before showing it. Otherwise it's wasteful — you pay for layout you don't display.

**4. `Opacity(opacity: 0)`** — **avoid this.** The widget is still painted, still laid out, and still receives touches, *and* `Opacity` forces an offscreen compositing layer, making it the most expensive option. It looks hidden and behaves like it isn't.

```dart
// Bad: still takes space, still tappable, and costs a saveLayer
Opacity(opacity: 0, child: Button())
```

**How to choose:**

- **Default** → collection-`if`. Cheapest, and state loss is usually correct.
- **Must preserve state** (a form being filled, a video's playback position, a scroll offset) → `Visibility` with `maintainState: true`.
- **Must preserve layout space** (so other widgets don't shift) → `Visibility` with `maintainSize: true`, or a `SizedBox` placeholder of the same size.
- **Need to measure first** → `Offstage`.
- **Animating in and out** → `AnimatedOpacity`, `AnimatedSwitcher` or `AnimatedCrossFade`, which handle the transition properly.

**For tab-like state preservation**, `IndexedStack` is the standard answer — all children stay in the tree with their state intact, and only the selected one is shown.

---
title: "Performance & Testing"
description: "Optimize Flutter apps and ensure quality through robust testing."
---

## 1. What are the three types of testing in Flutter?
1. **Unit Testing**: Tests a single function, method, or class in isolation.
2. **Widget Testing**: Tests a single widget to ensure it renders and interacts correctly (similar to component testing).
3. **Integration Testing**: Tests a complete app or large part of an app on a real device or emulator.

## 2. How do you mock dependencies in tests?
You use the `mockito` or `mocktail` packages. They allow you to create fake versions of classes (like an API client) and define what they should return when called, ensuring tests run quickly and offline.

## 3. What is the purpose of `pumpWidget` and `pump` in Widget Testing?
- `pumpWidget`: Renders the provided widget into the test environment.
- `pump`: Triggers a new frame. If a button click triggers a state change, you must call `pump()` so the UI reflects the change before making assertions.

## 4. How can you identify performance issues in Flutter?
Use the **Flutter DevTools**. The Performance overlay helps identify jank (slow frames), the CPU Profiler finds slow functions, and the Memory profiler identifies memory leaks.

## 5. Why should you use `const` constructors in Flutter?
Declaring a widget with `const` tells Flutter that the widget will never change. Flutter caches it and skips rebuilding it entirely during the build process, which drastically improves performance.

## 6. What causes "Jank" (stuttering) in a Flutter app?
Jank occurs when a frame takes longer than 16ms (for 60fps) to render. Common causes include running heavy computations on the UI thread, loading huge uncompressed images, or deeply nested rebuilding widget trees.

## 7. How do you move heavy computation off the main thread?
Dart is single-threaded. To avoid blocking the UI, use the `compute()` function or `Isolates` to run heavy CPU tasks (like parsing massive JSON files or image processing) on a separate background thread.

## 8. What is the difference between Profile mode and Release mode?
- **Profile Mode**: Compiled via AOT, runs on a real device, but retains debugging symbols so you can trace performance using DevTools.
- **Release Mode**: Fully optimized AOT compilation with no debugging info. Always measure final performance in Release/Profile mode, never in Debug mode.

## 9. What is the `RepaintBoundary` widget?
Flutter attempts to only repaint what changed, but sometimes changes force the entire screen to repaint. Wrapping a constantly changing widget (like a ticking clock) in a `RepaintBoundary` isolates it so the rest of the screen doesn't repaint.

## 10. How do you optimize image loading in a list?
Ensure images are properly resized on the server before downloading. You can also specify the `cacheWidth` and `cacheHeight` properties in `Image.network` to force Flutter to decode the image at a smaller resolution, saving massive amounts of RAM.

## 11. What are Golden Tests?
Golden tests capture an image (a snapshot) of a widget and compare it pixel-by-pixel against a master "golden" image file. If the UI changes unexpectedly, the test fails, ensuring pixel-perfect UI regression testing.

## 12. How do you mock Streams in Dart?
You can use the `StreamController` to manually emit events during a test, or use packages like `mockito` to return a `Stream.fromIterable([])` when a BLoC or UseCase expects a stream.

## 13. What is `testWidgets`?
A function provided by `flutter_test` that sets up a headless Flutter environment. It allows you to build widgets, interact with them (tapping, dragging), and assert their state without needing a physical device.

## 14. What is Tree Shaking?
When Flutter compiles for release (AOT), the compiler aggressively analyzes the code and permanently deletes any classes, functions, or assets that are never actually used, drastically reducing the final app size.

## 15. What is Code Obfuscation?
A security feature that renames your classes, methods, and variables to meaningless symbols (like `a`, `b`, `c`) during the release build. This makes it incredibly difficult for attackers to reverse-engineer your app.

## 16. How do you detect Memory Leaks in Flutter?
Use the Flutter DevTools Memory tab. Take a memory snapshot, navigate to a screen, navigate back, force Garbage Collection, and take another snapshot. If objects from that screen (like a large image or an active timer) are still in memory, you have a leak.

## 17. Why is deeply nested widget code considered bad?
Besides readability (the "Pyramid of Doom"), deeply nested widgets inside a single `build()` method mean that if the top-level state changes, Flutter has to evaluate the entire massive tree, hurting performance.

## 18. What does the `rethrow` keyword do?
Inside a `catch` block, `rethrow` preserves the exact original stack trace of the error when passing it up the chain. Using `throw e;` instead would erase the original error origin, making debugging a nightmare.

## 19. How do you profile an app's startup time?
Run the app in profile mode using `flutter run --profile --trace-startup`. This generates a trace file that can be inspected in DevTools to see exactly which initialization functions are slowing down the splash screen.

## 20. What are Integration Tests (using `integration_test` package)?
They are end-to-end tests that run on a physical device or emulator. They drive the app automatically (clicking buttons, entering text) to verify the entire flow (UI + Database + API) works together correctly.

---
title: "Testing & Deployment"
description: "Unit, Widget, and Integration testing, CI/CD, and publishing."
---

## 1. What are the three types of tests in Flutter?
1. **Unit Tests**: Test a single function, method, or class in isolation. Fast execution.
2. **Widget Tests**: Test a single widget. Ensures the UI looks and interacts correctly without running a full emulator.
3. **Integration Tests**: Test a complete app or a large part of it running on a real device or emulator. Slowest execution.

## 2. How do you write a Unit Test in Flutter?
Use the `test` package. Write a `test()` function containing setup, execution, and verification steps (Arrange, Act, Assert).

```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Counter value should be incremented', () {
    final counter = Counter();
    counter.increment();
    expect(counter.value, 1);
  });
}
```

## 3. What is Mockito / Mocktail?
Packages used in Unit Tests to create "mock" versions of complex dependencies (like web servers or databases) so you can test classes in complete isolation.

```dart
class MockClient extends Mock implements http.Client {}

void main() {
  final client = MockClient();
  when(() => client.get(any())).thenAnswer((_) async => http.Response('OK', 200));
}
```

## 4. How do you write a Widget Test?
Use the `testWidgets` function. It provides a `WidgetTester` which allows you to build the widget and interact with it programmatically.

```dart
testWidgets('MyWidget has a title', (WidgetTester tester) async {
  await tester.pumpWidget(MaterialApp(home: MyWidget()));
  
  final titleFinder = find.text('Title');
  expect(titleFinder, findsOneWidget); // Assertion
});
```

## 5. What does `tester.pump()` do?
In a Widget Test, `pump()` triggers a new frame. If a widget calls `setState()`, you must call `tester.pump()` for the UI to actually rebuild before you assert the new state.

```dart
await tester.tap(find.byType(FloatingActionButton));
await tester.pump(); // Triggers rebuild to show updated counter
```

## 6. What is `tester.pumpAndSettle()`?
It repeatedly calls `pump()` until there are no more frames scheduled (i.e., it waits for all animations to finish).

## 7. How do you write an Integration Test?
Use the `integration_test` package. The code looks similar to a Widget Test, but it runs on a physical device or emulator, allowing you to test end-to-end user flows.

```dart
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  
  testWidgets('End to end test', (tester) async {
    app.main(); // Start the app
    await tester.pumpAndSettle();
    // Test logic here
  });
}
```

## 8. What is CI/CD?
Continuous Integration / Continuous Deployment. Automating the process of running tests, building the application (APK, IPA, Web build), and deploying it to stores or testing groups (TestFlight/Firebase App Distribution) every time code is pushed.

## 9. Name some CI/CD tools used for Flutter.
GitHub Actions, Codemagic, Bitrise, GitLab CI, Fastlane. (Codemagic and Bitrise are specifically highly optimized for Flutter out of the box).

## 10. What is Fastlane?
An open-source tool suite to automate beta deployments and store releases for iOS and Android. It can automatically generate screenshots, increment version numbers, and upload binaries to Google Play and Apple App Store.

## 11. How do you manage app versions in Flutter?
Via the `pubspec.yaml` file. The `version` field looks like `1.0.0+1`. 
- `1.0.0` is the version name (shown to the user).
- `+1` is the build number (internal to the app store, must increment every time you upload a new binary).

## 12. What are the primary build commands for release?
- Android: `flutter build apk --release` or `flutter build appbundle` (preferred for Google Play).
- iOS: `flutter build ios --release` (Generates an Xcode archive).
- Web: `flutter build web`.

## 13. What is code shrinking and obfuscation?
A process during the release build that removes unused code and renames classes/variables to random letters to reduce the app size and make reverse-engineering difficult. In Flutter, Dart code is inherently obfuscated when compiled AOT, but you can add `--obfuscate --split-debug-info=/<dir>` for maximum security.

## 14. How do you handle different environments (Dev, Staging, Prod)?
Using Flutter Flavors (which map to Android Product Flavors and iOS Schemes). They allow you to generate different apps (with different app icons, names, and bundle IDs) from the same codebase. You run them using `flutter run --flavor dev`.

## 15. What is Firebase App Distribution?
A service that allows you to easily distribute pre-release (beta) versions of your app to trusted testers for QA before submitting to the official app stores.

## 16. What is the significance of the `ios/Runner.xcworkspace` file?
When building for iOS in a Flutter project that uses CocoaPods (almost all of them do, due to plugins), you MUST open `Runner.xcworkspace` in Xcode, NOT `Runner.xcodeproj`, otherwise the plugins will not link correctly.

## 17. How do you handle app signing?
- **Android**: Generate a Keystore (`.jks` file), configure `key.properties`, and link it in `build.gradle`.
- **iOS**: Generate Certificates and Provisioning Profiles in the Apple Developer Portal and configure them in Xcode.

## 18. What is `golden` testing?
A specific type of widget test where you render a widget and compare the output pixel-by-pixel against a master "golden" image file. Useful to ensure UI doesn't accidentally change visually.

```dart
await expectLater(find.byType(MyWidget), matchesGoldenFile('my_widget.png'));
```

## 19. What is Firebase Crashlytics?
A real-time crash reporter. You integrate the Flutter plugin, and if your app crashes in production on a user's device, the stack trace is uploaded to the Firebase console so you can fix it.

## 20. What is AOT vs JIT compilation?
- **JIT (Just-In-Time)**: Used during development (`flutter run`). Compiles code on the fly. Enables "Hot Reload" but results in slower execution and larger file sizes.
- **AOT (Ahead-Of-Time)**: Used for release (`flutter build`). Compiles Dart entirely into native ARM machine code before installation. Results in lightning-fast startup and smooth animations.

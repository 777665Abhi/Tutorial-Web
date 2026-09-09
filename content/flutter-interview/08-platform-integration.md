---
title: "Platform Integration"
description: "Connect Flutter with native Android/iOS code, Firebase, and device APIs."
---

## 1. What are Method Channels?
Method Channels allow Flutter to communicate with native Android (Kotlin/Java) and iOS (Swift/Obj-C) code. Flutter sends a message over the channel, the native side executes its code, and sends a result back to Flutter.

## 2. How do you write platform-specific code in Flutter without Method Channels?
Since Dart 2.12, you can use **FFI** (Foreign Function Interface) to call C/C++ or Rust libraries directly from Dart. More recently, Dart introduced interop packages like `jnigen` (for Java/Kotlin) and `ffigen` (for Objective-C/Swift) to call native code directly.

## 3. How do you handle different UI behaviors between Android and iOS?
Flutter provides `Material` widgets (Android style) and `Cupertino` widgets (iOS style). You can use `Platform.isIOS` from `dart:io` to conditionally render a `CupertinoButton` instead of an `ElevatedButton`, or use packages like `flutter_platform_widgets`.

## 4. What is Firebase, and why is it popular with Flutter?
Firebase is Google's Backend-as-a-Service platform. It is highly popular because Google maintains the official `FlutterFire` plugins, providing seamless integration for Authentication, Firestore databases, Push Notifications, and Analytics.

## 5. How do you handle Push Notifications in Flutter?
You use the `firebase_messaging` package. It requires configuring APNs on iOS and the `google-services.json` on Android. You must handle three states: when the app is in the Foreground, Background, and Terminated.

## 6. What is a Flutter Plugin vs a Flutter Package?
- **Package**: Contains only Dart code (e.g., `provider`, `http`).
- **Plugin**: Contains Dart code along with native Android/iOS code (e.g., `camera`, `shared_preferences`).

## 7. How do you access device features like the camera or GPS?
You must use plugins (like `camera` or `geolocator`). Crucially, you must also update the native configuration files (`AndroidManifest.xml` for Android, `Info.plist` for iOS) to request the appropriate permissions from the user.

## 8. What is the role of `Info.plist` and `AndroidManifest.xml`?
These are the native configuration files for iOS and Android. They define app metadata, declare permissions needed (like location or internet), and register background services or custom URL schemes.

## 9. How do you implement Deep Linking in Flutter?
Deep links allow URLs (like `myapp://details/5`) to open specific screens in your app. You configure the native manifests to intercept the URLs, and then use the `Router` API (Navigator 2.0) or `go_router` to parse the URL and push the correct screen.

## 10. How can you deploy a Flutter app to the Web?
Flutter Web renders the UI using CanvasKit (WebAssembly+WebGL) or the HTML DOM. You simply run `flutter build web`. However, you must ensure that none of your packages rely on mobile-only native code (like SQLite), as they will crash in the browser.

## 11. What is the `pigeon` package?
Instead of writing manual, error-prone Method Channels (which use loose strings and dynamic types), `pigeon` generates type-safe Dart and native (Kotlin/Swift) code based on an interface, making native communication robust.

## 12. What is the difference between App Links (Android) / Universal Links (iOS) and Deep Links?
- **Deep Links**: Use custom schemes (e.g., `myapp://`). Insecure, because any app can register the same scheme.
- **App Links / Universal Links**: Use standard HTTP URLs (`https://myapp.com`). Highly secure because they require placing a cryptographic verification file on your actual web server.

## 13. How do you run code in the background when the app is closed?
You must use a package like `workmanager` or `flutter_background_service`. These packages interface with Android's `WorkManager` and iOS's `BGTaskScheduler` to wake up the app and run a Dart isolate in the background periodically.

## 14. What are Flavors (Environments) in Flutter?
Flavors allow you to build different versions of your app (e.g., Development, Staging, Production) from the same codebase. Each flavor can have a different App Icon, Package Name, and API Base URL.

## 15. How do you embed Native UI components in Flutter?
You use Platform Views (`AndroidView` for Android, `UiKitView` for iOS). This allows you to embed complex native SDKs (like Google Maps or a native video player) directly inside the Flutter widget tree.

## 16. What is CI/CD, and how is it used in Flutter?
Continuous Integration / Continuous Deployment automates testing and building. Services like GitHub Actions, Codemagic, or Bitrise automatically run your unit tests on every commit, build the APK/IPA, and upload it to the App/Play Store.

## 17. What is Fastlane?
Fastlane is an open-source tool heavily used alongside Flutter to automate tedious deployment tasks, such as generating screenshots, managing iOS provisioning profiles, and releasing app updates to the stores.

## 18. How do you handle App Permissions?
Use the `permission_handler` package. You must request permissions (Camera, Location, Storage) at runtime in Dart, AND declare those specific permissions in the `AndroidManifest.xml` and `Info.plist`.

## 19. How does Flutter integrate with Google Analytics?
Through the `firebase_analytics` package. You can log custom events (`logEvent`), track which screens the user visits by tying a `FirebaseAnalyticsObserver` to your Navigator, and analyze user behavior in the Firebase Console.

## 20. What is the `flutter_dotenv` package used for?
It securely loads environment variables from a `.env` file (like API keys or secrets). This ensures sensitive keys are not hardcoded into the source code and accidentally uploaded to a public GitHub repository.

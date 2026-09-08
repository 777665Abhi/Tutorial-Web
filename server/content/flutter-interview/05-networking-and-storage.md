---
title: "Networking & Storage"
description: "Handle APIs, JSON parsing, SQLite, and local caching in Flutter."
---

## 1. How do you make HTTP requests in Flutter?
You can use the built-in `http` package for simple requests, or the popular `dio` package for advanced features like interceptors, global configuration, and file downloading.

## 2. What is `Dio` and what features does it offer over `http`?
`Dio` is a powerful HTTP client for Dart. It offers Interceptors (for injecting tokens), `FormData` support, request cancellation, connection timeouts, and easy file downloading/uploading.

## 3. How do you parse JSON in Dart?
Dart provides `dart:convert` which includes `jsonDecode()`. Since Dart is strongly typed, you must map the resulting `Map<String, dynamic>` into a Dart class using a `fromJson()` factory method.

## 4. What is `json_serializable`?
It is a code-generation package that automatically generates the boilerplate `fromJson` and `toJson` methods for your data models, preventing manual parsing typos.

## 5. Explain local storage options in Flutter.
- **SharedPreferences**: For small key-value data (e.g., settings, auth tokens).
- **Sqflite**: For relational SQL databases.
- **Hive**: A fast, lightweight, NoSQL key-value database written in pure Dart.

## 6. What is the difference between Hive and Sqflite?
`Sqflite` uses platform-specific SQLite engines, requiring asynchronous SQL queries. `Hive` is a NoSQL, pure Dart database that loads data into memory, making read operations synchronous and incredibly fast.

## 7. How do you handle offline capability?
Implement a caching strategy in the Repository. Fetch from the local database (Hive/Sqflite) first to show instant data, then fetch from the API, update the local DB, and stream the new data to the UI.

## 8. What are Interceptors used for in API calls?
Interceptors sit between your app and the network. They are used to automatically attach authentication headers (like Bearer tokens) to every request, log API responses, or handle global errors (like token expiration).

## 9. How do you cancel a network request in Dio?
You pass a `CancelToken` to the Dio request. When you call `cancelToken.cancel()`, the request is immediately aborted, preventing memory leaks if the user leaves the screen.

## 10. How do you securely store sensitive data (like passwords)?
Do not use SharedPreferences or Hive for sensitive data. Use the `flutter_secure_storage` package, which encrypts data using the Android Keystore and iOS Keychain.

## 11. How do you implement WebSockets in Flutter?
You use the `web_socket_channel` package. It provides a persistent connection to the server, allowing real-time two-way communication. You consume the data using a `StreamBuilder`.

## 12. What are Server-Sent Events (SSE)?
Unlike WebSockets (two-way), SSE is a one-way connection where the server pushes updates to the client continuously. It's often used for live feeds or ChatGPT-style streaming text responses.

## 13. What is Retrofit for Dart?
Inspired by Android's Retrofit, it is a code-generator for Dio. You define an abstract class with annotations (like `@GET('/users')`), and it automatically generates all the HTTP request boilerplate for you.

## 14. What is Isar Database?
Isar is the modern, highly-optimized successor to Hive. It is a NoSQL database that offers extremely fast asynchronous queries, full-text search, and multi-entry indexes, making it ideal for large offline-first apps.

## 15. How does `shared_preferences` work under the hood?
On Android, it wraps the native `SharedPreferences` API (saved as an XML file). On iOS, it wraps `NSUserDefaults`. It is not encrypted, so it should never hold passwords.

## 16. How do you securely store API tokens?
Use the `flutter_secure_storage` package. Under the hood, it uses the Android `EncryptedSharedPreferences` (or Keystore) and the iOS `Keychain` to encrypt data securely.

## 17. How do you cache images in Flutter?
Use the `cached_network_image` package. It downloads the image, saves it in the local device cache directory, and loads it from memory the next time, saving bandwidth and improving performance.

## 18. How do you implement Pull-to-Refresh?
You wrap a scrollable view (like `ListView` or `CustomScrollView`) with the `RefreshIndicator` widget. You pass an `onRefresh` callback that returns a `Future` (like an API call). The spinner disappears when the Future completes.

## 19. What is a Pagination strategy?
You fetch data in small chunks (e.g., 20 items per page). When the user scrolls near the bottom of a `ListView` (using a `ScrollController`), you fire an API call for the next page (`offset = 20`) and append the results to the list.

## 20. What is JWT (JSON Web Token), and how do you handle expiration?
JWT is used for secure authentication. If a request returns a 401 Unauthorized because the token expired, you use a Dio Interceptor to catch the error, pause the request, call the `/refresh-token` API to get a new JWT, and seamlessly retry the original request.

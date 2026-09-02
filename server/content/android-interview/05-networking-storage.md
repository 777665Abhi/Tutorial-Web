---
title: "Networking & Data Storage"
description: "Understanding REST APIs, Retrofit, OkHttp, and Android storage mechanisms."
---

## 61. How does `Retrofit` work internally with `OkHttp`?
Retrofit is a type-safe HTTP client that acts as a wrapper around OkHttp. When you define an interface with Retrofit annotations (`@GET`, `@POST`), Retrofit uses a Java dynamic proxy to generate the network request implementation at runtime. It then delegates the actual TCP/IP connection, connection pooling, and payload transmission to the underlying `OkHttp` client.

## 62. What is an `Interceptor` in OkHttp, and what are common use cases (e.g., auth tokens)?
An `Interceptor` is a powerful OkHttp mechanism that can monitor, rewrite, and retry network calls. 
Common use cases include:
- **Application Interceptor**: Adding a global `Authorization: Bearer <token>` header to every outgoing request.
- **Network Interceptor**: Logging raw network responses (e.g., via `HttpLoggingInterceptor`) or transparently managing GZIP compression.

## 63. How do you handle token refresh mechanisms using OkHttp `Authenticator`?
While you could use an Interceptor to check for 401 Unauthorized errors, OkHttp provides an `Authenticator` interface specifically for this. 
When a request fails with a 401, the `Authenticator`'s `authenticate()` method is called automatically. Inside, you can make a synchronous network call to fetch a new token, attach the new token to the original request, and return it. OkHttp will automatically retry the original request.

## 64. What is `DataStore` (Preferences & Proto), and why does it replace `SharedPreferences`?
Jetpack DataStore is a modern data storage solution.
- **Preferences DataStore**: Stores key-value pairs (like SharedPreferences) but runs asynchronously using Kotlin Coroutines and Flows, preventing UI thread blocking.
- **Proto DataStore**: Stores typed objects backed by Protocol Buffers, providing type safety.
It replaces `SharedPreferences` because the latter is fully synchronous (causing ANRs), lacks type safety, and is highly prone to runtime parsing errors.

## 65. What are the security risks associated with `SharedPreferences`?
Standard `SharedPreferences` stores data as plain XML files in the app's internal directory. If a device is rooted, malicious apps can easily read this file, exposing sensitive data like authentication tokens or PII. For sensitive data, `EncryptedSharedPreferences` (from the security-crypto library) must be used.

## 66. How does certificate pinning work in Android networking, and why is it used?
Certificate Pinning hardcodes the hash (pin) of the server's public key certificate directly into the Android app (often using OkHttp's `CertificatePinner`).
It is used to prevent Man-in-the-Middle (MITM) attacks. Even if a user installs a malicious root certificate on their device, the app will reject the connection because the server's certificate doesn't match the hardcoded pin.

## 67. What is Scoped Storage in Android, and how does media storage access work?
Introduced in Android 10, Scoped Storage restricts an app's access to the device's file system. Apps can no longer freely read/write anywhere. 
- Apps get unrestricted access to their own app-specific directories.
- To access shared media (Photos, Videos, Audio), apps must use the `MediaStore` API and request specific read permissions.

## 68. How do you optimize network payload sizes and implement API response caching?
Optimization strategies include:
- **GZIP Compression**: Enabling GZIP on the server and OkHttp (enabled by default) to compress JSON text.
- **Protobuf**: Using Protocol Buffers instead of JSON for smaller binary payloads.
- **OkHttp Cache**: Configuring a `Cache` size on the OkHttpClient. If the server sends `Cache-Control` headers, OkHttp will automatically serve cached responses when offline or within the valid max-age limit.

## 69. What is WebSocket, and how do you manage persistent real-time connections in Android?
WebSocket is a protocol that provides full-duplex, persistent communication over a single TCP connection, ideal for chat apps or live trading.
In Android, you typically use OkHttp's `newWebSocket()` method. You must manage the connection lifecycle manually, responding to `onMessage`, reconnecting on failures (`onClosed`/`onFailure`), and keeping the connection alive using ping/pong frames.

## 70. How do Firebase Cloud Messaging (FCM) push notification flows work?
1. The app requests an FCM token from Google Play Services and sends it to your backend server.
2. The backend sends a message payload targeted to that token via the FCM API.
3. Google routes the message to the specific device.
4. If it's a **Notification message**, the Android system automatically displays it in the system tray.
5. If it's a **Data message**, it triggers your app's `FirebaseMessagingService.onMessageReceived()`, allowing you to execute background code and build a custom notification manually.

## 71. What is GraphQL and how do you use it in Android (Apollo)?
GraphQL is a query language for APIs that allows clients to request exactly the data they need, no more and no less, preventing over-fetching. 
In Android, this is implemented using the **Apollo Kotlin** library. Apollo generates type-safe models from your GraphQL queries at compile time and executes them asynchronously, supporting caching and real-time subscriptions over WebSockets.

## 72. How do you handle file uploads in Retrofit (Multipart)?
To upload a file, you annotate the Retrofit interface method with `@Multipart` and pass the file as an `@Part MultipartBody.Part`.
```kotlin
@Multipart
@POST("upload")
suspend fun uploadFile(@Part file: MultipartBody.Part): Response<UploadResult>
```
You convert a local `File` to a `RequestBody` (specifying the media type), and then create the `MultipartBody.Part` using `FormData` to send it over the network.

## 73. What is the difference between Cache-Control and ETag headers?
- **Cache-Control**: Tells OkHttp how long a response is valid (e.g., `max-age=3600`). OkHttp serves from the cache directly without hitting the network until the age expires.
- **ETag**: A unique identifier for a specific version of a resource. OkHttp sends the ETag to the server. If the data hasn't changed, the server replies with a lightweight `304 Not Modified`, telling OkHttp it's safe to use its cached version.

## 74. How does `EncryptedFile` work in the Jetpack Security library?
`EncryptedFile` provides a transparent layer of encryption over standard `File` I/O. It streams the data through a cipher using keys backed by the Android Keystore. This ensures that even if an attacker gains root access to the device's internal storage, any files saved by your app (e.g., downloaded PDFs, cached images) remain unreadable.

## 75. What is the DownloadManager and when should it be used instead of Retrofit?
`DownloadManager` is a system service that handles long-running HTTP downloads in the background. 
While Retrofit is perfect for REST API calls, it requires your app process to stay alive. `DownloadManager` handles network failures, device reboots, and background execution completely independently of your app. It should be used for downloading large files (like PDFs, video files, or OTA updates).

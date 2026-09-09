---
title: "Networking & Storage"
description: "Retrofit, OkHttp, File storage, and the Android permissions model."
---

## 1. What is Retrofit?
Retrofit is a type-safe HTTP client for Android and Java developed by Square. It makes it incredibly easy to consume RESTful APIs by turning a Java/Kotlin interface into an executable HTTP API call.

```kotlin
interface ApiService {
    @GET("users/{user}/repos")
    suspend fun listRepos(@Path("user") user: String): List<Repo>
}
```

## 2. How does Retrofit work under the hood?
Retrofit uses **Dynamic Proxies** (Reflection) to intercept calls to the interface methods. It parses the annotations on the method to construct an HTTP request, delegates the actual network call to **OkHttp**, and then uses a **Converter** (like Moshi or Gson) to deserialize the JSON response into Kotlin objects.

## 3. What is OkHttp?
OkHttp is the underlying HTTP/2 client used by Retrofit. It handles connection pooling, transparent GZIP compression, response caching, and recovery from network problems.

```kotlin
val client = OkHttpClient.Builder()
    .connectTimeout(10, TimeUnit.SECONDS)
    .build()
```

## 4. What is an OkHttp Interceptor?
A mechanism in OkHttp that allows you to observe, modify, and potentially short-circuit requests going out and the corresponding responses coming back. Heavily used for adding authorization headers or logging.

```kotlin
class AuthInterceptor(val token: String) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
            .addHeader("Authorization", "Bearer $token")
            .build()
        return chain.proceed(request)
    }
}
```

## 5. How do you handle file uploads in Retrofit?
Use the `@Multipart` annotation and pass a `MultipartBody.Part` parameter containing the file data and mime type.

```kotlin
@Multipart
@POST("upload")
suspend fun uploadFile(
    @Part file: MultipartBody.Part
): ResponseBody
```

## 6. What is the difference between `@Path`, `@Query`, and `@Body` in Retrofit?
- `@Path`: Replaces a placeholder in the URL path (e.g., `users/{id}`).
- `@Query`: Appends a query parameter to the URL (e.g., `?sort=desc`).
- `@Body`: Attaches a serialized Kotlin object as the payload of a POST/PUT request.

## 7. What is Scoped Storage in Android?
Introduced in Android 10, Scoped Storage restricts app access to external storage. Apps can only access their own app-specific directory and specific types of media (photos, videos, audio) via the MediaStore API, without needing broad read/write storage permissions.

## 8. What is the MediaStore API?
An optimized index into media collections (audio, video, images) provided by the Android OS. It allows apps to query and retrieve media files created by other apps without requiring raw file path access.

```kotlin
// Querying MediaStore for images
val cursor = contentResolver.query(
    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
    projection, null, null, null
)
```

## 9. How do you read/write files in the App-Specific Directory?
Use `context.filesDir` for internal storage or `context.getExternalFilesDir()` for external storage. Files here are private to your app and are deleted when the app is uninstalled.

```kotlin
val file = File(context.filesDir, "my_file.txt")
file.writeText("Hello World")
```

## 10. What is the Storage Access Framework (SAF)?
A system UI that allows users to browse and pick documents or files across all of their preferred document storage providers (like Google Drive or local storage) without the app needing broad storage permissions.

```kotlin
// Launching SAF picker
val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
    addCategory(Intent.CATEGORY_OPENABLE)
    type = "application/pdf"
}
startActivityForResult(intent, REQUEST_CODE)
```

## 11. What is the difference between Internal and External Storage?
- **Internal**: Always available, entirely private to the app. Cleared on uninstall.
- **External**: Can be removable (SD card), historically public (though restricted by Scoped Storage now). Cleared on uninstall if stored in app-specific directories.

## 12. How do you handle Runtime Permissions in Android?
Since Android 6.0 (API 23), dangerous permissions (like Camera or Location) must be requested at runtime, rather than just declared in the manifest.

```kotlin
// Requesting permission using Activity Result API
val requestPermissionLauncher = registerForActivityResult(RequestPermission()) { isGranted ->
    if (isGranted) { /* use camera */ }
}
requestPermissionLauncher.launch(Manifest.permission.CAMERA)
```

## 13. What is `SharedPreferences`?
A legacy, synchronous API for storing small amounts of primitive data as key-value pairs in an XML file on the device.

```kotlin
val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)
prefs.edit().putString("username", "Alice").apply() // apply() is async, commit() is sync
```

## 14. Why is DataStore replacing SharedPreferences?
SharedPreferences parses the XML file on the UI thread, which can cause ANRs (Application Not Responding). DataStore uses Coroutines/Flow, runs completely asynchronously on background threads, and is safe from runtime exceptions.

## 15. How do you check if a device is connected to the internet?
Use `ConnectivityManager` and `NetworkCapabilities` to check if an active network exists and has the `NET_CAPABILITY_INTERNET` transport.

```kotlin
val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
val network = manager.activeNetwork
val capabilities = manager.getNetworkCapabilities(network)
val isConnected = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
```

## 16. What is the difference between `apply()` and `commit()` in SharedPreferences?
- `apply()`: Saves the data to memory immediately, then writes it to disk asynchronously in the background. Does not return a boolean.
- `commit()`: Writes the data to disk synchronously. Returns a boolean indicating success. Can block the UI thread.

## 17. How do you serialize an object in Kotlin?
Use Kotlinx Serialization (`@Serializable`), Gson, or Moshi. They convert Kotlin data classes into JSON strings for network transmission or local storage.

```kotlin
@Serializable
data class User(val name: String)
val json = Json.encodeToString(User("Alice"))
```

## 18. What is the difference between Serializable and Parcelable in Android?
- **Serializable**: A standard Java interface. Uses Reflection, which makes it very slow and creates a lot of garbage collection overhead.
- **Parcelable**: An Android-specific interface. Requires writing boilerplate to explicitly state how to pack and unpack the object. It is much faster and highly optimized for IPC (Inter-Process Communication).

## 19. How do you easily implement Parcelable in Kotlin?
Use the `@Parcelize` annotation from the `kotlin-parcelize` plugin. The compiler automatically generates the packing/unpacking boilerplate.

```kotlin
@Parcelize
data class User(val id: Int, val name: String) : Parcelable
```

## 20. What is WebSocket?
A communication protocol providing full-duplex, real-time communication channels over a single TCP connection. Often used in Android for chat applications or live data feeds. OkHttp has built-in support for WebSockets.

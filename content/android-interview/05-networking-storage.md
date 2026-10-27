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

**"Type-safe" means the compiler checks your API calls.** You declare the endpoint once as an annotated interface, and the return type is your model class — so a wrong parameter name or a mismatched type is a compile error rather than a runtime surprise. Compare that to building a `URL`, opening a `HttpURLConnection`, reading an `InputStream`, and parsing JSON by hand, where every step is stringly-typed.

**Setting it up:**

```kotlin
val retrofit = Retrofit.Builder()
    .baseUrl("https://api.example.com/")        // must end with /
    .client(okHttpClient)                        // your configured OkHttp
    .addConverterFactory(MoshiConverterFactory.create())
    .build()

val api: ApiService = retrofit.create(ApiService::class.java)
```

Two small things that bite people: the `baseUrl` **must end with a slash**, and a leading slash on an endpoint path (`@GET("/users")`) discards the base URL's path segment.

**Coroutine support is first-class.** Marking a method `suspend` makes it main-safe — Retrofit runs the call on OkHttp's background dispatcher and resumes your coroutine with the result. Wrapping it in `withContext(Dispatchers.IO)` is redundant.

```kotlin
// Three valid return styles
suspend fun getUser(id: String): User               // throws on HTTP error
suspend fun getUser(id: String): Response<User>     // gives you code/headers
fun getUser(id: String): Call<User>                 // legacy callback style
```

The distinction between the first two matters: a plain `User` return throws `HttpException` for any non-2xx status, while `Response<User>` lets you inspect `isSuccessful`, `code()`, and `errorBody()` — necessary when the API encodes meaning in status codes.

**It's an HTTP client, not a networking stack.** Retrofit builds requests and parses responses; OkHttp does the actual work of connections, pooling, caching, retries, and TLS. Timeouts, interceptors, and caching are therefore configured on OkHttp, not Retrofit — a frequent source of confusion.

## 2. How does Retrofit work under the hood?
Retrofit uses **Dynamic Proxies** (Reflection) to intercept calls to the interface methods. It parses the annotations on the method to construct an HTTP request, delegates the actual network call to **OkHttp**, and then uses a **Converter** (like Moshi or Gson) to deserialize the JSON response into Kotlin objects.

**Step by step, what happens at `retrofit.create(ApiService::class.java)`:**

1. **A dynamic proxy is created.** `java.lang.reflect.Proxy.newProxyInstance` produces an object implementing your interface at runtime, where every method call is funnelled into a single `InvocationHandler`.
2. **The method is parsed, once.** On first call, Retrofit reflects over the method's annotations (`@GET`, `@Path`, `@Query`, `@Body`) and parameter types to build a `ServiceMethod` — a reusable plan for turning arguments into an HTTP request. This is **cached**, so reflection happens once per method, not per call.
3. **A `Request` is built** by substituting your arguments into that plan.
4. **OkHttp executes it** — connection pooling, TLS, redirects, caching, retries all happen here.
5. **A `Converter` deserialises** the response body into your return type.
6. **A `CallAdapter` adapts** OkHttp's `Call` into whatever your method returns — a `suspend` function, a `Flow`, an RxJava `Single`, or a raw `Call`.

**The two extension points are worth naming**, because they're the usual follow-up:

- **`ConverterFactory`** — body ↔ object. Moshi, Gson, kotlinx.serialization, Jackson, Scalars, Protobuf.
- **`CallAdapterFactory`** — adapts the return type. Suspend support is built in; RxJava and custom `Result`-wrapping adapters are added here.

**The performance point this question is really testing:** reflection happens **once per method**, at first invocation, not on every request. So the cost is a small, one-time startup penalty rather than per-call overhead. If you're minimising startup time you can warm this up, but in practice it's negligible.

**A consequence for R8/ProGuard:** because models are deserialised reflectively, your data classes are invisible to the shrinker. Without keep rules they get renamed or removed and JSON parsing fails in release builds only — a classic "works in debug, broken in production" bug. Modern Retrofit and Moshi ship `consumer-rules.pro`, but your own model classes may still need `-keep`, or a codegen-based parser (Moshi codegen, kotlinx.serialization) that avoids reflection entirely.

## 3. What is OkHttp?
OkHttp is the underlying HTTP/2 client used by Retrofit. It handles connection pooling, transparent GZIP compression, response caching, and recovery from network problems.

```kotlin
val client = OkHttpClient.Builder()
    .connectTimeout(10, TimeUnit.SECONDS)
    .build()
```

**What it does that you'd otherwise write yourself:**

- **Connection pooling** — reuses TCP/TLS connections across requests, avoiding a fresh handshake every time. On mobile, where handshakes are expensive, this is a large real-world win.
- **HTTP/2 and connection coalescing** — multiplexes many requests over one connection, and shares a connection between hosts resolving to the same IP.
- **Transparent GZIP** — adds the header and decompresses for you, shrinking payloads.
- **Response caching** — a proper HTTP cache honouring `Cache-Control`, if you give it a directory.
- **Silent recovery** — retries on a different route when a connection fails, handles redirects and IPv4/IPv6 fallback.

**Configure timeouts explicitly.** The defaults (10s) are often wrong for mobile, and the three cover different phases:

```kotlin
val client = OkHttpClient.Builder()
    .connectTimeout(15, TimeUnit.SECONDS)   // establishing the TCP/TLS connection
    .readTimeout(30, TimeUnit.SECONDS)      // gap between bytes arriving
    .writeTimeout(30, TimeUnit.SECONDS)     // gap between bytes being sent
    .callTimeout(60, TimeUnit.SECONDS)      // total, end to end — often the one you want
    .retryOnConnectionFailure(true)
    .build()
```

**Caching requires a directory** — OkHttp does not cache by default:

```kotlin
.cache(Cache(File(context.cacheDir, "http"), 10L * 1024 * 1024))   // 10 MB
```

The cache obeys server `Cache-Control` headers. If your API doesn't send useful ones, a network interceptor that rewrites them is the usual (slightly impolite) workaround.

**The single most important practical rule: share one `OkHttpClient` instance.** It owns the connection pool and thread pool, so creating one per request destroys the pooling benefit and leaks threads. Create one, inject it everywhere, and derive variants with `client.newBuilder()` so they share the same pool.

**Also worth knowing:** `CertificatePinner` for certificate pinning, `ConnectionSpec` for restricting TLS versions, `EventListener` for fine-grained timing metrics (DNS, connect, TLS, first byte), and built-in WebSocket support. OkHttp is also the engine behind `HttpURLConnection` on modern Android, so you're using it whether you declare it or not.

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

**Interceptors form a chain**, each wrapping the next, with OkHttp's own engine at the centre. Your code runs before `chain.proceed()` (modifying the request) and after it returns (inspecting the response).

**There are two kinds, and knowing the difference is the usual discriminator:**

- **Application interceptors** (`.addInterceptor`) — called **once per call**, even if OkHttp retries or follows redirects. They don't see the cached-vs-network distinction and won't run at all if the response is served from cache. Use for headers, auth, and app-level logging.
- **Network interceptors** (`.addNetworkInterceptor`) — called **once per actual network request**, so they run again on each redirect and retry. They see the real wire traffic, including the `Content-Encoding: gzip` header before OkHttp strips it. Use for rewriting cache headers and detailed network debugging.

```kotlin
OkHttpClient.Builder()
    .addInterceptor(AuthInterceptor(tokenStore))
    .addInterceptor(HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) Level.BODY else Level.NONE   // never BODY in release
    })
    .addNetworkInterceptor(CacheControlInterceptor())
    .build()
```

**Guard the logging interceptor with `BuildConfig.DEBUG`.** Logging at `Level.BODY` in a release build writes auth tokens and personal data into logcat, which other diagnostics tools can read. It's a genuine security finding, not a style nit.

**Token refresh** is the classic real-world use, and `Authenticator` is the better tool for it than an interceptor — OkHttp calls it automatically on a 401:

```kotlin
class TokenAuthenticator(private val store: TokenStore) : Authenticator {
    override fun authenticate(route: Route?, response: Response): Request? {
        if (response.request.header("Authorization") != null) return null  // already retried
        val fresh = store.refreshBlocking() ?: return null                 // give up → 401 to caller
        return response.request.newBuilder()
            .header("Authorization", "Bearer $fresh").build()
    }
}
```

The `return null` guard prevents an infinite retry loop, which is the mistake this pattern invites.

**Short-circuiting** is possible — return a synthetic `Response` without calling `proceed()`, which is how offline stubs and mock interceptors work. And interceptors run on a background thread, so blocking work inside them is fine.

## 5. How do you handle file uploads in Retrofit?
Use the `@Multipart` annotation and pass a `MultipartBody.Part` parameter containing the file data and mime type.

```kotlin
@Multipart
@POST("upload")
suspend fun uploadFile(
    @Part file: MultipartBody.Part
): ResponseBody
```

**Building the part** is where the real work is — you need a `RequestBody` with the right MIME type, then wrap it with a form field name and filename:

```kotlin
@Multipart
@POST("upload")
suspend fun upload(
    @Part file: MultipartBody.Part,
    @Part("description") description: RequestBody   // extra form fields
): UploadResponse

// Caller
val requestFile = file.asRequestBody("image/jpeg".toMediaTypeOrNull())
val part = MultipartBody.Part.createFormData(
    name = "file",              // the form field name the server expects
    filename = file.name,
    body = requestFile
)
api.upload(part, "Profile photo".toRequestBody("text/plain".toMediaType()))
```

The `name` must match what the server expects, and a mismatch is the most common cause of a confusing 400.

**With scoped storage you usually have a `Uri`, not a `File`.** Reading it through `ContentResolver` is the correct modern approach — copying to a temp file works but doubles the disk I/O:

```kotlin
val stream = contentResolver.openInputStream(uri)!!
val body = stream.readBytes().toRequestBody(contentResolver.getType(uri)?.toMediaType())
```

For large files, reading everything into a `ByteArray` risks `OutOfMemoryError`; a custom `RequestBody` that streams from the `InputStream` via Okio's `source().use { sink.writeAll(it) }` avoids holding it all in memory.

**Progress reporting** requires wrapping the `RequestBody` and counting bytes as they're written to the sink — there's no built-in callback. This is a frequent follow-up question, and the shape to describe is: subclass `RequestBody`, delegate `writeTo` through a `ForwardingSink` that reports `bytesWritten / contentLength`.

**Two practical notes:** set generous `writeTimeout` and `callTimeout` values, since the defaults will kill a large upload mid-flight; and for uploads that must survive the user leaving the app, do the work in a **`WorkManager`** worker rather than a `viewModelScope` coroutine — otherwise navigating away cancels it.

**For downloads**, the mirror image: return `ResponseBody` with `@Streaming` so Retrofit doesn't buffer the whole file into memory before handing it to you.

## 6. What is the difference between `@Path`, `@Query`, and `@Body` in Retrofit?
- `@Path`: Replaces a placeholder in the URL path (e.g., `users/{id}`).
- `@Query`: Appends a query parameter to the URL (e.g., `?sort=desc`).
- `@Body`: Attaches a serialized Kotlin object as the payload of a POST/PUT request.

**Where each one lands in the request:**

```kotlin
@GET("users/{id}/repos")
suspend fun repos(
    @Path("id") id: String,          // → /users/octocat/repos
    @Query("sort") sort: String,     // → ?sort=desc
    @Query("page") page: Int
): List<Repo>
// GET /users/octocat/repos?sort=desc&page=2

@POST("users")
suspend fun create(@Body user: NewUser): User    // serialised into the request body
```

**The semantic distinction**, which is what a good answer adds: `@Path` identifies *which resource*, `@Query` modifies *how you want it* (filtering, sorting, pagination), and `@Body` carries *the data you're sending*. Getting this right is REST design, not just Retrofit syntax.

**Encoding is a real difference between `@Path` and `@Query`.** `@Path` URL-encodes its value by default and will encode slashes, breaking a path that's meant to contain segments. `encoded = true` opts out:

```kotlin
@GET("files/{path}")
suspend fun file(@Path(value = "path", encoded = true) path: String)   // allows a/b/c
```

**The rest of the family**, since interviewers often extend the question:

- **`@QueryMap`** — a `Map<String, String>` of dynamic query parameters.
- **`@Header` / `@HeaderMap`** — per-request headers; `@Headers("...")` for static ones.
- **`@Field` + `@FormUrlEncoded`** — form-encoded POST bodies (`application/x-www-form-urlencoded`), as opposed to JSON.
- **`@Part` + `@Multipart`** — file uploads.
- **`@Url`** — a full URL replacing the base, useful for following pagination links returned by the server.

```kotlin
@FormUrlEncoded
@POST("login")
suspend fun login(@Field("username") user: String, @Field("password") pass: String): Token
```

**Mistakes worth knowing:** `@Body` on a `@GET` throws (GET has no body); mixing `@Field` and `@Body` in one method throws; and a `null` `@Query` parameter is simply omitted from the URL, which is a convenient way to express optional filters but surprises people who expect `?sort=null`.

## 7. What is Scoped Storage in Android?
Introduced in Android 10, Scoped Storage restricts app access to external storage. Apps can only access their own app-specific directory and specific types of media (photos, videos, audio) via the MediaStore API, without needing broad read/write storage permissions.

**Why it happened.** Before Android 10, `READ_EXTERNAL_STORAGE` gave an app the entire shared storage volume — every photo, document, and every other app's files. Apps also littered the root directory with folders that survived uninstall. Scoped storage is a privacy and hygiene fix: each app gets a sandbox, and access to anything else is narrowed and mediated.

**What an app can access without any permission:**

- **Its own app-specific directories** — `context.filesDir`, `context.cacheDir`, `context.getExternalFilesDir()`. These are deleted on uninstall.
- **Media it created itself**, through `MediaStore`.
- **Anything the user explicitly picks** via the photo picker or the Storage Access Framework.

**What requires permission or isn't possible:**

- Reading *other apps'* media → `READ_MEDIA_IMAGES`/`VIDEO`/`AUDIO` (Android 13+) or `READ_EXTERNAL_STORAGE` (older).
- Reading other apps' non-media files → **not possible** without the user picking them through SAF.
- Arbitrary file paths anywhere on the volume → gone. `Environment.getExternalStorageDirectory()` is effectively unusable.

**The timeline matters because real apps straddle versions:**

- **Android 10 (29)** — scoped storage introduced, with `requestLegacyExternalStorage="true"` as a temporary opt-out.
- **Android 11 (30)** — **mandatory**; the opt-out no longer works. `MANAGE_EXTERNAL_STORAGE` ("All files access") exists but requires Play Store justification and is rejected for most apps.
- **Android 13 (33)** — storage permission split into `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`.
- **Android 14 (34)** — partial media access ("Select photos"), so a granted permission may still expose only some items.

**The practical migration advice**, which is what this question is really asking for: stop thinking in **file paths** and start thinking in **URIs**. A `content://` URI from the photo picker or SAF works regardless of where the file physically lives, needs no permission, and survives these policy changes.

**Best of all, prefer the Photo Picker** (`ActivityResultContracts.PickVisualMedia`), which requires **no permission at all** and is backported via Google Play services. If all you need is "let the user choose a photo," asking for a storage permission in 2026 is the wrong design.

## 8. What is the MediaStore API?
An optimized index into media collections (audio, video, images) provided by the Android OS. It allows apps to query and retrieve media files created by other apps without requiring raw file path access.

```kotlin
// Querying MediaStore for images
val cursor = contentResolver.query(
    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
    projection, null, null, null
)
```

**It is a `ContentProvider` over a database index of the device's media**, maintained by the system. You query it like any provider — projection, selection, sort order — and get back URIs plus metadata without ever touching a file path.

**A realistic query**, with the cursor properly closed:

```kotlin
val projection = arrayOf(
    MediaStore.Images.Media._ID,
    MediaStore.Images.Media.DISPLAY_NAME,
    MediaStore.Images.Media.DATE_ADDED,
    MediaStore.Images.Media.SIZE
)
contentResolver.query(
    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
    projection,
    "${MediaStore.Images.Media.SIZE} > ?",
    arrayOf("1048576"),
    "${MediaStore.Images.Media.DATE_ADDED} DESC"
)?.use { cursor ->
    val idCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
    while (cursor.moveToNext()) {
        val uri = ContentUris.withAppendedId(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cursor.getLong(idCol)
        )
        // use the URI — never a file path
    }
}
```

**Writing with `IS_PENDING`** is the correct modern insert pattern: mark the entry pending so other apps don't see a half-written file, write the bytes, then clear the flag.

```kotlin
val values = ContentValues().apply {
    put(MediaStore.Images.Media.DISPLAY_NAME, "photo.jpg")
    put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
    put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/MyApp")
    put(MediaStore.Images.Media.IS_PENDING, 1)
}
val uri = contentResolver.insert(collection, values)!!
contentResolver.openOutputStream(uri)?.use { bitmap.compress(JPEG, 90, it) }
values.clear(); values.put(MediaStore.Images.Media.IS_PENDING, 0)
contentResolver.update(uri, values, null, null)
```

`RELATIVE_PATH` (API 29+) is how you place a file in a subfolder without constructing a path yourself.

**Modifying another app's media requires user consent.** On Android 11+, `createWriteRequest()` / `createDeleteRequest()` return a `PendingIntent` that shows a system confirmation dialog, and a `RecoverableSecurityException` is the signal to ask. This surprises people who expect a granted permission to be enough.

**Scoping rules:** your app can always read and write media *it created*, with no permission. Reading other apps' media needs `READ_MEDIA_*`. And `MediaStore` indexes only media — documents and arbitrary files go through SAF instead.

## 9. How do you read/write files in the App-Specific Directory?
Use `context.filesDir` for internal storage or `context.getExternalFilesDir()` for external storage. Files here are private to your app and are deleted when the app is uninstalled.

```kotlin
val file = File(context.filesDir, "my_file.txt")
file.writeText("Hello World")
```

**The directories and what each is for:**

- **`context.filesDir`** — internal, persistent, private. Your default for app data. Counts against the app's storage in Settings.
- **`context.cacheDir`** — internal, **deletable by the system** under storage pressure, and cleared by "Clear cache." Anything here must be reconstructible.
- **`context.getExternalFilesDir(type)`** — external volume, still app-specific and permission-free since API 19. Larger capacity, but may be unavailable if the volume is removed.
- **`context.getExternalCacheDir()`** — the external equivalent of `cacheDir`.
- **`context.noBackupFilesDir`** — excluded from auto-backup. The right place for tokens, device-specific IDs, and anything that shouldn't be restored onto a different device.

**No permissions are required for any of these**, including the external ones — a point people often get wrong.

**Common operations:**

```kotlin
// Small file
File(context.filesDir, "notes.txt").writeText(content)
val text = File(context.filesDir, "notes.txt").readText()

// Streaming — for anything non-trivial
context.openFileOutput("data.bin", Context.MODE_PRIVATE).use { it.write(bytes) }
context.openFileInput("data.bin").use { it.readBytes() }

// Cache with cleanup
val tmp = File.createTempFile("upload", ".jpg", context.cacheDir)
```

`MODE_PRIVATE` is the only mode you should use; `MODE_WORLD_READABLE`/`WRITEABLE` were deprecated and throw since API 24.

**Do file I/O off the main thread** — this is an ANR source and `StrictMode` will flag it:

```kotlin
suspend fun save(text: String) = withContext(Dispatchers.IO) {
    File(context.filesDir, "notes.txt").writeText(text)
}
```

**Two more things worth raising:** internal storage is **encrypted at rest** on modern Android and inaccessible to other apps (and to the user without root), which makes `filesDir` the right home for anything sensitive — though truly sensitive secrets belong in `EncryptedFile`/`EncryptedSharedPreferences` or the Keystore. And **check available space** before writing something large, via `StatFs` or `context.filesDir.usableSpace`, rather than discovering it through an `IOException`.

**To share a file with another app**, you cannot hand over a path — wrap it with a **`FileProvider`** and pass the resulting `content://` URI with a temporary grant flag.

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

**The model is user-mediated access.** Instead of your app asking for permission to a whole volume, the *user* picks a specific item and your app receives a URI granting access to exactly that item. It's the least-privilege answer to file access, and it works uniformly across local storage, SD cards, Google Drive, Dropbox, and any app implementing a `DocumentsProvider`.

**The three intents:**

- **`ACTION_OPEN_DOCUMENT`** — pick an existing file to read.
- **`ACTION_CREATE_DOCUMENT`** — choose a location and name for a new file.
- **`ACTION_OPEN_DOCUMENT_TREE`** — grant access to a whole **directory** and its descendants.

**Use the Activity Result API**, not the deprecated `startActivityForResult` in the original snippet:

```kotlin
private val openDoc = registerForActivityResult(
    ActivityResultContracts.OpenDocument()
) { uri: Uri? ->
    uri ?: return@registerForActivityResult
    contentResolver.openInputStream(uri)?.use { /* read it */ }
}

openDoc.launch(arrayOf("application/pdf"))
```

**Persisting access across restarts** is the detail most people miss. The grant you receive is temporary and dies with the process unless you explicitly take it:

```kotlin
contentResolver.takePersistableUriPermission(
    uri, Intent.FLAG_GRANT_READ_URI_PERMISSION
)
```

Without this, storing the URI string and reopening it tomorrow throws `SecurityException`. Note there's a system-wide cap on persisted grants, so release ones you no longer need.

**Reading metadata** goes through `ContentResolver`, since you have no file path:

```kotlin
contentResolver.query(uri, null, null, null, null)?.use { c ->
    c.moveToFirst()
    val name = c.getString(c.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME))
    val size = c.getLong(c.getColumnIndexOrThrow(OpenableColumns.SIZE))
}
```

**When to use which tool:** for images and videos specifically, the **Photo Picker** is better — a nicer UI, no permission, and backported through Play services. Use SAF for documents, for "import/export" flows, and for the directory-tree case (a file manager, a backup target). Use app-specific storage for your own data, which needs no picker at all.

## 11. What is the difference between Internal and External Storage?
- **Internal**: Always available, entirely private to the app. Cleared on uninstall.
- **External**: Can be removable (SD card), historically public (though restricted by Scoped Storage now). Cleared on uninstall if stored in app-specific directories.

**The naming is genuinely misleading**, and saying so is a good answer: "external" does not mean "SD card." On most modern phones, external storage is a partition of the *same* physical flash memory. The real distinction is the **access model**, not the hardware.

**Internal storage** (`filesDir`, `cacheDir`):

- Always available — no mount state to check.
- Strictly private; no other app can read it, and the user can't browse it without root.
- Encrypted at rest on modern Android.
- Typically smaller.
- Removed on uninstall.

**External storage** splits into two very different things, which is the part worth drawing out:

1. **App-specific external** (`getExternalFilesDir()`) — **no permission needed**, private in practice, removed on uninstall. Essentially internal storage with more room and the possibility of being unmounted.
2. **Shared external** (`MediaStore`, `Downloads`, `Documents`) — visible to the user and other apps, **survives uninstall**, and is now governed entirely by scoped storage.

**Choosing between them:**

- **Internal** — databases, preferences, tokens, cached API responses, anything sensitive or small.
- **App-specific external** — large files that are still yours: downloaded video, offline maps, generated assets.
- **Shared external (`MediaStore`)** — content the **user** owns and expects to find in their gallery or file manager, and to keep after uninstalling your app.

**Check availability for external storage**, since it can be unmounted:

```kotlin
val available = Environment.getExternalStorageState() == Environment.MEDIA_MOUNTED
```

**Two modern notes:** `getExternalFilesDirs()` (plural) returns multiple volumes on devices with a real SD card, with the primary first. And because scoped storage removed broad file access, the old habit of writing to `Environment.getExternalStorageDirectory()` no longer works at all on Android 11+ — code doing that must move to `MediaStore` or SAF.

## 12. How do you handle Runtime Permissions in Android?
Since Android 6.0 (API 23), dangerous permissions (like Camera or Location) must be requested at runtime, rather than just declared in the manifest.

```kotlin
// Requesting permission using Activity Result API
val requestPermissionLauncher = registerForActivityResult(RequestPermission()) { isGranted ->
    if (isGranted) { /* use camera */ }
}
requestPermissionLauncher.launch(Manifest.permission.CAMERA)
```

**Always declare in the manifest as well** — the runtime request only works for a permission you've declared. Declaration alone was sufficient before API 23; now it's necessary but not sufficient.

**The complete flow has three branches**, and handling only the happy path is the usual mistake:

```kotlin
private val requestPermission = registerForActivityResult(
    ActivityResultContracts.RequestPermission()
) { granted -> if (granted) openCamera() else showDeniedUi() }

private fun onCameraClicked() {
    when {
        ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED -> openCamera()

        shouldShowRequestPermissionRationale(Manifest.permission.CAMERA) ->
            showRationaleDialog { requestPermission.launch(Manifest.permission.CAMERA) }

        else -> requestPermission.launch(Manifest.permission.CAMERA)
    }
}
```

Note the launcher must be registered at **field-initialisation time**, not inside a click handler — the Activity re-registers on recreation, and a late registration throws `IllegalStateException`.

**Detecting permanent denial** has no direct API; you infer it. If the permission isn't granted **and** `shouldShowRequestPermissionRationale` returns `false` **and** you've asked before, the user has permanently denied it — further requests return immediately with no dialog. The correct response is a link to app settings:

```kotlin
startActivity(Intent(
    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
    Uri.fromParts("package", packageName, null)
))
```

**Three rules that matter in production:**

1. **Check every time**, never cache. The user can revoke from Settings while you're backgrounded.
2. **Ask in context.** Request the camera when the user taps the camera button — grant rates are far higher than a wall of dialogs at launch.
3. **Degrade gracefully.** A denied permission should disable a feature, not break the app.

**Modern behaviours to mention:** on Android 11+ two denials count as permanent (the "Don't ask again" checkbox is gone); one-time grants ("Only this time") expire; unused permissions are auto-revoked for dormant apps; background location must be requested *separately and after* foreground location, and sends the user to Settings on Android 11+; and Android 13 added runtime `POST_NOTIFICATIONS` and split storage into `READ_MEDIA_*`.

**Best of all, avoid the permission entirely where you can** — the Photo Picker and `ACTION_IMAGE_CAPTURE` both get you what you need with no permission at all.

## 13. What is `SharedPreferences`?
A legacy, synchronous API for storing small amounts of primitive data as key-value pairs in an XML file on the device.

```kotlin
val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)
prefs.edit().putString("username", "Alice").apply() // apply() is async, commit() is sync
```

**How it works:** an XML file in `/data/data/<package>/shared_prefs/`, loaded **entirely into memory** on first access and kept there. Reads after that are from the in-memory map, which is why reads look fast — the cost is concentrated in that first load and in the writes.

```kotlin
// Read
val name = prefs.getString("username", "default")
val count = prefs.getInt("launches", 0)

// Write — core-ktx gives you a cleaner edit block
prefs.edit {
    putString("username", "Alice")
    putInt("launches", count + 1)
}

// Observe changes
prefs.registerOnSharedPreferenceChangeListener { _, key -> /* ... */ }
```

**The problems that led to DataStore** (expanded in the next question) in short: the first access parses XML synchronously on the calling thread; `apply()` still blocks on the main thread during `Activity.onPause`/`onStop` while flushing pending writes; `commit()` does disk I/O inline; errors are silent; there's no transactional consistency; and it's stringly-typed, so a wrong getter throws `ClassCastException`.

**What it's still fine for:** a few simple flags in an existing codebase, Java projects without coroutines, and interop with libraries that expect it (`PreferenceFragmentCompat` writes here). It is **not deprecated** — but it shouldn't be the choice for new code.

**Two things not to do with it:**

- **Don't store large data.** The whole file lives in memory; a few hundred KB of JSON crammed into a string value is a real memory and parsing cost on every launch.
- **Don't store secrets in plain text.** Tokens and credentials belong in `EncryptedSharedPreferences` (Jetpack Security) or the Android Keystore. A rooted device, or a backup, exposes plain prefs directly.

**One subtlety worth knowing:** `getString` returns the *live* in-memory value, and the returned collection from `getStringSet` **must not be mutated** — the API explicitly warns that doing so corrupts the stored value, which is an easy bug to introduce.

## 14. Why is DataStore replacing SharedPreferences?
SharedPreferences parses the XML file on the UI thread, which can cause ANRs (Application Not Responding). DataStore uses Coroutines/Flow, runs completely asynchronously on background threads, and is safe from runtime exceptions.

**The ANR mechanism, precisely**, since this is the heart of the question. There are two separate blocking paths:

1. **First access** — `getSharedPreferences()` triggers a synchronous parse of the whole XML file. On a cold start with a large prefs file, that's main-thread disk I/O.
2. **`apply()` is not as asynchronous as it looks.** It updates memory immediately and queues the disk write — but Android *waits for those queued writes to finish* in `ActivityThread`'s handling of `onPause`/`onStop`. So a burst of `apply()` calls can block the main thread at the next lifecycle transition. This is a documented, measured cause of ANRs in real apps, and it's the detail that distinguishes a memorised answer.

And `commit()` simply does the disk write inline on the calling thread.

**What DataStore gives you instead:**

- **Fully asynchronous** — reads are a `Flow`, writes are `suspend`. Nothing can block the main thread, by construction.
- **Transactional** — a write either fully applies or doesn't; `updateData`/`edit` is atomic.
- **Error signalling** — an `IOException` surfaces through the flow instead of being swallowed.
- **Reactive by default** — the UI observes the flow and updates itself; no change listener to register and unregister.
- **Type safety with Proto DataStore** — a schema-backed, compile-time-typed object rather than loose keys.

```kotlin
val Context.dataStore by preferencesDataStore(name = "settings")
private val DARK = booleanPreferencesKey("dark_mode")

val darkMode: Flow<Boolean> = context.dataStore.data
    .catch { e -> if (e is IOException) emit(emptyPreferences()) else throw e }
    .map { it[DARK] ?: false }

suspend fun setDark(on: Boolean) { context.dataStore.edit { it[DARK] = on } }
```

That `catch` is not optional in production — a corrupted file arrives as an `IOException` through the flow, and handling it is what prevents a crash loop on launch.

**Migration is built in**, so adopting it doesn't lose existing settings:

```kotlin
val Context.dataStore by preferencesDataStore(
    name = "settings",
    produceMigrations = { listOf(SharedPreferencesMigration(it, "old_prefs")) }
)
```

**Be honest about the trade-offs:** every read is asynchronous, so there is no `getBoolean()` you can call inline — code that needed a value *right now* (in `Application.onCreate`, say) must be restructured. DataStore also rewrites the whole file on each change, so it's for small data only; collections and queries belong in Room.

## 15. How do you check if a device is connected to the internet?
Use `ConnectivityManager` and `NetworkCapabilities` to check if an active network exists and has the `NET_CAPABILITY_INTERNET` transport.

```kotlin
val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
val network = manager.activeNetwork
val capabilities = manager.getNetworkCapabilities(network)
val isConnected = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
```

**Add `NET_CAPABILITY_VALIDATED`**, which is the detail that makes this answer correct rather than merely typical. `NET_CAPABILITY_INTERNET` means "this network claims to provide internet"; `VALIDATED` means Android actually tested it and reached the internet. Without it, a captive-portal Wi-Fi (hotel, airport) reports as connected while every request fails:

```kotlin
val isOnline = capabilities != null &&
    capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
    capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
```

**Prefer observing over polling.** A one-shot check is stale the moment it returns, so for UI that reacts to connectivity, register a callback — and expose it as a `Flow`:

```kotlin
fun Context.networkStatus(): Flow<Boolean> = callbackFlow {
    val cm = getSystemService(ConnectivityManager::class.java)
    val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) { trySend(true) }
        override fun onLost(network: Network) { trySend(false) }
    }
    val request = NetworkRequest.Builder()
        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        .build()
    cm.registerNetworkCallback(request, callback)
    awaitClose { cm.unregisterNetworkCallback(callback) }    // must unregister
}.distinctUntilChanged()
```

Requires `ACCESS_NETWORK_STATE` (a normal permission, auto-granted).

**The architectural point worth making:** *don't gate requests on a connectivity check*. The check can pass and the request still fail — the network can drop between the two, DNS can fail, the server can be down, or a VPN can intercept. Just make the request and handle `IOException`. Use connectivity state for **UX** ("You're offline" banner, disabling a button, deciding whether to show cached data), not as a precondition.

**For deferred work, let the system do it.** A `WorkManager` constraint (`NetworkType.CONNECTED` or `UNMETERED`) is both more reliable and more battery-efficient than watching connectivity yourself, because the OS wakes your job only when the condition already holds.

**Also useful:** `NetworkCapabilities.hasTransport(TRANSPORT_WIFI / TRANSPORT_CELLULAR)` to distinguish connection types, and `isActiveNetworkMetered` to decide whether to download something large.

## 16. What is the difference between `apply()` and `commit()` in SharedPreferences?
- `apply()`: Saves the data to memory immediately, then writes it to disk asynchronously in the background. Does not return a boolean.
- `commit()`: Writes the data to disk synchronously. Returns a boolean indicating success. Can block the UI thread.

**Both update the in-memory map immediately**, so a subsequent `getString()` returns the new value either way. The difference is only *when the disk write happens* and *whether you're told it worked*.

**Use `apply()` by default.** It's the right choice in almost every case: you avoid blocking, and in practice the write will have landed long before anything needs it.

**Use `commit()` only when you genuinely need the result** — and then only off the main thread:

- You must know the write succeeded before proceeding (storing a token the next screen depends on).
- You're already on a background thread and want to be sure the data is durable before, say, triggering a process restart.

```kotlin
// Default
prefs.edit { putString("name", "Alice") }     // apply() under the hood

// Only when the result matters, and never on the main thread
withContext(Dispatchers.IO) {
    val ok = prefs.edit().putString("token", t).commit()
    if (!ok) reportFailure()
}
```

**The caveat that makes `apply()` less asynchronous than advertised** — and the best thing to add here: pending `apply()` writes are **flushed synchronously on the main thread** during `Activity.onPause`/`onStop`. So a burst of `apply()` calls can still contribute to an ANR at the next lifecycle transition. `apply()` moves the work, it doesn't eliminate it.

**A second caveat:** `commit()` returning `false` is rare and usually unrecoverable (disk full, corruption), so the boolean is less useful than it appears. Most code that calls `commit()` ignores the return value — at which point `apply()` was the better choice all along.

**Batch your edits.** One `edit { }` block with five `put` calls is one disk write; five separate `edit().put().apply()` calls are five. This matters more than the apply/commit choice:

```kotlin
prefs.edit {
    putString("name", name)
    putInt("age", age)
    putBoolean("active", true)
}                                   // single write
```

**And the modern framing:** this whole question is a symptom of an API that forces you to reason about disk I/O in your UI code. DataStore removes the choice — every write is suspending and transactional, so there is no wrong option to pick.

## 17. How do you serialize an object in Kotlin?
Use Kotlinx Serialization (`@Serializable`), Gson, or Moshi. They convert Kotlin data classes into JSON strings for network transmission or local storage.

```kotlin
@Serializable
data class User(val name: String)
val json = Json.encodeToString(User("Alice"))
```

**The three options differ in how they work, which drives everything else:**

- **kotlinx.serialization** — a **compiler plugin**. Serializers are generated at compile time, so there's no reflection, it's fast, it's multiplatform, and — crucially — it **understands Kotlin's type system**. Non-null types are genuinely enforced, and default values work.
- **Moshi** — Square's library; works reflectively or via **codegen** (`@JsonClass(generateAdapter = true)`). The codegen path is fast, R8-friendly, and Kotlin-aware. Good interop with Retrofit and OkHttp.
- **Gson** — the old default. Pure reflection, and **it does not respect Kotlin nullability or default values**. It will happily construct an object with `null` in a non-null `String` field, which then throws `NullPointerException` somewhere far from the cause. This alone is a strong reason to avoid it in new Kotlin code.

```kotlin
@Serializable
data class User(
    val id: Int,
    @SerialName("full_name") val name: String,       // JSON key ≠ property name
    val email: String? = null,                        // optional with a default
    @Transient val cached: Boolean = false            // skipped entirely
)

val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
val user = json.decodeFromString<User>(text)
```

`ignoreUnknownKeys = true` is essential in practice — without it, a new field added by the backend crashes your app.

**Wiring it into Retrofit:**

```kotlin
.addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
```

**The R8 angle**, which is the common production failure: reflection-based serialisation is invisible to the shrinker, so model classes get renamed or stripped and parsing breaks **in release builds only**. kotlinx.serialization and Moshi codegen avoid this by generating code; Gson requires explicit `-keep` rules.

**Beyond JSON:** kotlinx.serialization also supports Protobuf and CBOR formats with the same annotations, and `@Parcelize` (next questions) handles Android IPC, which is a different problem with different constraints.

**The recommendation:** kotlinx.serialization for new Kotlin projects, Moshi with codegen if you're already in the Square ecosystem, and migrate away from Gson when you get the chance.

## 18. What is the difference between Serializable and Parcelable in Android?
- **Serializable**: A standard Java interface. Uses Reflection, which makes it very slow and creates a lot of garbage collection overhead.
- **Parcelable**: An Android-specific interface. Requires writing boilerplate to explicitly state how to pack and unpack the object. It is much faster and highly optimized for IPC (Inter-Process Communication).

**Why the performance gap is so large.** `Serializable` is a *marker* interface — it carries no code, so the JVM uses reflection to discover fields, reads type metadata, and writes a self-describing stream. That allocates heavily, and the resulting garbage pressure is the real cost on Android, not just the CPU time. Benchmarks typically put `Parcelable` around **10× faster**.

`Parcelable` instead asks you to state exactly what to write and in what order, so there's no discovery step and no metadata in the output:

```kotlin
// What Parcelable costs you by hand — and why @Parcelize exists
class User(val id: Int, val name: String) : Parcelable {
    override fun writeToParcel(p: Parcel, flags: Int) { p.writeInt(id); p.writeString(name) }
    override fun describeContents() = 0
    companion object CREATOR : Parcelable.Creator<User> {
        override fun createFromParcel(p: Parcel) = User(p.readInt(), p.readString()!!)
        override fun newArray(size: Int) = arrayOfNulls<User>(size)
    }
}
```

The **order must match exactly** between write and read — a classic source of baffling corruption bugs, and the main argument for `@Parcelize`.

**The distinction that actually decides which to use** is not speed but *purpose*:

- **`Parcel` is for IPC, in memory, within one Android version.** The format is explicitly **not stable across versions or devices** — Android reserves the right to change it. So you must **never** persist a `Parcel` to disk or send it over a network. For `Intent` extras, `Bundle`s, and AIDL, it's exactly right.
- **`Serializable` is a stable, self-describing format** suitable for persistence — which is why it still exists, though in practice JSON serialisation is a better choice for that too.

**So in Android code:** use `Parcelable` (via `@Parcelize`) for anything crossing a component boundary, and use kotlinx.serialization/Moshi for anything written to disk or sent over the network. "Use `Serializable` because it's less code" stopped being a reason once `@Parcelize` existed.

**One more constraint to remember:** parcelled data crosses a Binder transaction, which is capped at roughly **1 MB per process**. A large `Parcelable` in an `Intent` throws `TransactionTooLargeException` — pass an ID and refetch, rather than the object.

## 19. How do you easily implement Parcelable in Kotlin?
Use the `@Parcelize` annotation from the `kotlin-parcelize` plugin. The compiler automatically generates the packing/unpacking boilerplate.

```kotlin
@Parcelize
data class User(val id: Int, val name: String) : Parcelable
```

**Enable the plugin:**

```groovy
plugins { id 'kotlin-parcelize' }
```

The compiler then generates `writeToParcel`, `describeContents`, and the `CREATOR` from the **primary constructor properties** — which also means it generates them in a consistent order, eliminating the write/read mismatch bugs you get writing it by hand.

**What it handles automatically:** primitives, `String`, other `@Parcelize` types, `List`/`Map`/`Set` of supported types, `Serializable` types, enums, and `@Parcelize`-annotated sealed class hierarchies.

**For types it doesn't know**, write a `Parceler` and attach it:

```kotlin
object DateParceler : Parceler<Date> {
    override fun create(parcel: Parcel) = Date(parcel.readLong())
    override fun Date.write(parcel: Parcel, flags: Int) { parcel.writeLong(time) }
}

@Parcelize
@TypeParceler<Date, DateParceler>()
data class Event(val name: String, val date: Date) : Parcelable
```

**Two annotations worth knowing:**

- **`@IgnoredOnParcel`** — excludes a property (it must have a default value, since it won't be restored). Useful for cached or derived fields.
- **`@RawValue`** — suppresses the error for a property whose type can't be verified at compile time, e.g. a generic `Any`. It's an unchecked escape hatch; a runtime failure is on you.

```kotlin
@Parcelize
data class Item(
    val id: Int,
    @IgnoredOnParcel val cachedBitmap: Bitmap? = null
) : Parcelable
```

**Where you'll use it:** `Intent` extras, `Bundle` arguments for Fragments, Navigation Safe Args with `app:argType` pointing at your class, and `onSaveInstanceState`. In all of these, parcelling is what carries the object across the process or the recreation.

**The same caution as the previous question applies:** `@Parcelize` makes it *easy* to pass whole objects around, which tempts people into passing large models through `Intent`s and navigation arguments. The Binder limit (~1 MB) and staleness both argue for passing an **ID** and letting the destination load current data from the repository.

## 20. What is WebSocket?
A communication protocol providing full-duplex, real-time communication channels over a single TCP connection. Often used in Android for chat applications or live data feeds. OkHttp has built-in support for WebSockets.

**How it differs from HTTP**, which is the point of the question: HTTP is request/response and client-initiated — the server cannot push. A WebSocket starts as an HTTP request with an `Upgrade: websocket` header, and once the server agrees (HTTP 101), the same TCP connection becomes a **persistent, bidirectional** channel where either side can send a message at any time, with very little per-message framing overhead.

**OkHttp's API:**

```kotlin
val request = Request.Builder().url("wss://example.com/socket").build()
val listener = object : WebSocketListener() {
    override fun onOpen(ws: WebSocket, response: Response) { ws.send("hello") }
    override fun onMessage(ws: WebSocket, text: String) { handle(text) }
    override fun onMessage(ws: WebSocket, bytes: ByteString) { handle(bytes) }
    override fun onClosing(ws: WebSocket, code: Int, reason: String) { ws.close(1000, null) }
    override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) { scheduleReconnect() }
}
val ws = client.newWebSocket(request, listener)
```

Wrapping this in a `callbackFlow` gives you a `Flow<Message>` that cancels cleanly with the consuming scope, which is the idiomatic way to expose it to a ViewModel.

**The things that make a production WebSocket hard**, and what an interviewer is usually probing:

- **Reconnection.** Mobile connections drop constantly — Wi-Fi to cellular handover, tunnels, backgrounding. You need reconnect logic with **exponential backoff and jitter**, plus re-authentication and re-subscription after reconnect.
- **Lifecycle.** Holding a socket open while the app is backgrounded drains battery and will be killed by Doze. Tie the connection to `STARTED` via `repeatOnLifecycle`, and use **FCM push** rather than a socket for background delivery.
- **Heartbeats.** Use `pingInterval` on the OkHttp client so dead connections are detected rather than hanging silently — NAT timeouts on mobile networks commonly kill idle connections within minutes.
- **Message ordering and delivery guarantees.** WebSocket gives you ordered delivery *within* a connection; across a reconnect you need sequence numbers or a resume token, or you'll silently lose messages.

```kotlin
OkHttpClient.Builder().pingInterval(30, TimeUnit.SECONDS).build()
```

**Choosing the right tool**, which is a better answer than describing the protocol alone:

- **WebSocket** — genuinely bidirectional, low-latency, frequent updates: chat, live collaboration, trading, multiplayer.
- **SSE / long polling** — server-to-client only, simpler, and survives proxies better.
- **FCM push** — anything that must reach the user while the app is **not running**. This is the Android-specific answer, and the one people miss: a socket cannot stay open in the background, so push is the only reliable background channel.
- **Plain polling** — for infrequent updates, often the cheapest and most robust option.

Always use **`wss://`** (TLS), never `ws://` — cleartext is blocked by default on modern Android anyway.

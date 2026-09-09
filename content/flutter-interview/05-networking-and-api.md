---
title: "Networking & API"
description: "HTTP package, Dio, JSON serialization, and websockets."
---

## 1. How do you make HTTP requests in Flutter?
You can use the built-in `dart:io` `HttpClient`, the official `http` package, or powerful third-party packages like `dio`.

```dart
// Using the http package
import 'package:http/http.dart' as http;

Future<void> fetchData() async {
  final response = await http.get(Uri.parse('https://api.example.com/data'));
  if (response.statusCode == 200) {
    print(response.body);
  }
}
```

## 2. What is the `dio` package?
Dio is a powerful HTTP client for Dart that supports Interceptors, Global configuration, FormData, Request Cancellation, File downloading, and Timeout management out of the box, making it highly preferred over the basic `http` package for complex apps.

```dart
final dio = Dio();
final response = await dio.get('https://api.example.com/data');
print(response.data); // Dio automatically decodes JSON!
```

## 3. How do you parse JSON in Dart?
Use the `dart:convert` library's `jsonDecode()` function to convert a JSON string into a `Map<String, dynamic>`, then pass it to a factory constructor to create a typed Dart object.

```dart
import 'dart:convert';

Map<String, dynamic> userMap = jsonDecode('{"name": "Alice"}');
final user = User.fromJson(userMap);
```

## 4. Why doesn't Dart use Reflection for JSON parsing?
Unlike Java (Gson) or Kotlin (Moshi), Dart prohibits Reflection (Mirrors) in Flutter to keep the compiled app size small and fast using AOT (Ahead-Of-Time) compilation. Therefore, JSON parsing must be done manually or via code generation.

## 5. What is `json_serializable`?
An official package that generates JSON serialization boilerplate code using `build_runner`. It prevents typos and makes model classes clean and maintainable.

```dart
@JsonSerializable()
class User {
  final String name;
  User(this.name);
  
  // Connect the generated code
  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);
}
```

## 6. How do you handle network exceptions?
Wrap your HTTP calls in a `try/catch` block. Catch specific exceptions like `SocketException` (no internet) or `HttpException`.

```dart
try {
  final response = await http.get(url);
} on SocketException {
  print('No Internet connection');
} catch (e) {
  print('Unknown error: $e');
}
```

## 7. What is an Interceptor?
In packages like `dio`, an interceptor is a callback that can intercept, observe, and mutate HTTP requests before they are sent, or responses before they reach your business logic (e.g., attaching Auth tokens automatically).

```dart
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) {
    options.headers["Authorization"] = "Bearer $token";
    return handler.next(options);
  }
));
```

## 8. What is `FutureBuilder`?
A widget that builds itself based on the latest snapshot of interaction with a `Future`. It is the standard way to show a loading spinner while fetching data, and then displaying the data once it arrives.

```dart
FutureBuilder<String>(
  future: fetchData(),
  builder: (context, snapshot) {
    if (snapshot.connectionState == ConnectionState.waiting) {
      return CircularProgressIndicator();
    } else if (snapshot.hasError) {
      return Text('Error: ${snapshot.error}');
    } else {
      return Text('Data: ${snapshot.data}');
    }
  },
)
```

## 9. How do you cancel an HTTP request?
Using `dio`, you can pass a `CancelToken` to your request. Calling `cancel()` on the token aborts the request immediately.

```dart
final cancelToken = CancelToken();
dio.get(url, cancelToken: cancelToken);

// Later, if user navigates away:
cancelToken.cancel("User cancelled");
```

## 10. How do you implement WebSockets in Flutter?
Use the official `web_socket_channel` package. It provides a `Stream` to listen for incoming messages and a `Sink` to send messages over a persistent connection.

```dart
final channel = WebSocketChannel.connect(Uri.parse('wss://echo.websocket.events'));
channel.sink.add('Hello!'); // Send
channel.stream.listen((message) {
  print(message); // Receive
});
```

## 11. What is the difference between `StreamBuilder` and `FutureBuilder`?
- `FutureBuilder` listens to a `Future` (single event) and rebuilds once.
- `StreamBuilder` listens to a `Stream` (multiple events) and rebuilds every time a new value is emitted (e.g., Firebase real-time database, WebSockets).

## 12. How do you handle file uploads?
Using the `http.MultipartRequest` or Dio's `FormData`. It encodes the binary file data and sends it over a POST request.

```dart
FormData formData = FormData.fromMap({
  "file": await MultipartFile.fromFile(filePath, filename: "upload.jpg"),
});
response = await dio.post("/upload", data: formData);
```

## 13. What is Retrofit for Dart?
A dio client generator built inspired by the famous Android Retrofit library. It uses annotations to generate API clients automatically.

```dart
@RestApi(baseUrl: "https://api.example.com")
abstract class RestClient {
  factory RestClient(Dio dio, {String baseUrl}) = _RestClient;
  
  @GET("/users/{id}")
  Future<User> getUser(@Path("id") String id);
}
```

## 14. What is the Isolate approach for heavy JSON parsing?
If you are parsing a massive JSON payload, doing it on the main thread will cause the UI to stutter (jank). You can use the `compute()` function to run the JSON parsing in a background Isolate.

```dart
// Runs parseJsonInBackground in a separate thread
final users = await compute(parseJsonInBackground, jsonString);
```

## 15. How do you mock HTTP requests for testing?
Use the `http_mock_adapter` (for dio) or `MockClient` (for http) to intercept network calls during Unit Tests and return predefined JSON responses instead of making actual calls.

## 16. What is GraphQL and how do you use it in Flutter?
GraphQL is an API query language. Instead of multiple REST endpoints, you query a single endpoint for exactly the data you need. The `graphql_flutter` package is the standard tool for integration.

## 17. How do you save user tokens securely?
Never use standard `SharedPreferences` for auth tokens. Use the `flutter_secure_storage` package, which stores data in the Android Keystore and iOS Keychain.

```dart
final storage = FlutterSecureStorage();
await storage.write(key: 'jwt', value: token);
```

## 18. How do you handle pagination in Flutter?
When the user scrolls near the end of a `ListView` (detected using a `ScrollController`), you fire an API call for the next "page" of data, append it to your existing list, and call `setState` (or notify your BLoC/Provider). The `infinite_scroll_pagination` package simplifies this.

## 19. What is Certificate Pinning?
A security mechanism to prevent Man-In-The-Middle (MITM) attacks. The app hardcodes the server's expected SSL certificate hash and refuses to connect if the server presents a different certificate.

## 20. How do you fetch data on app startup?
Usually by dispatching an event to your State Management tool (BLoC/Provider) during the `initState` of your main screen, or wrapping the app in a `FutureBuilder` before returning the `MaterialApp`.

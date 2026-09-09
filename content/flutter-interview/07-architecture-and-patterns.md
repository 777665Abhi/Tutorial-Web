---
title: "Architecture & Patterns"
description: "Clean Architecture, MVVM, Dependency Injection, and SOLID."
---

## 1. What is Clean Architecture?
A software architecture pattern popularized by Uncle Bob (Robert C. Martin). It separates the app into concentric layers (Presentation, Domain, Data) with a strict "Dependency Rule": dependencies can only point inwards. The core business logic (Domain) must not depend on UI, databases, or third-party libraries.

## 2. What are the layers in Flutter Clean Architecture?
1. **Presentation Layer**: UI (Widgets) and State Management (BLoC, Provider).
2. **Domain Layer**: Business logic. Contains Entities, Use Cases (Interactors), and Repository Interfaces. Completely independent of Flutter.
3. **Data Layer**: Data retrieval. Contains Models (DTOs), Data Sources (Local/Remote APIs), and the concrete Repository Implementations.

## 3. What is the role of a Repository?
A repository acts as a single source of truth for data. The domain layer asks the repository for data (e.g., `getUser()`), and the repository decides whether to fetch it from the network (Remote DataSource) or the local database (Local DataSource).

```dart
class UserRepositoryImpl implements UserRepository {
  final RemoteDataSource remote;
  final LocalDataSource local;
  
  Future<User> getUser(String id) async {
    if (await networkInfo.isConnected) {
      final user = await remote.getUser(id);
      local.cacheUser(user);
      return user;
    } else {
      return local.getUser(id);
    }
  }
}
```

## 4. What is a Use Case (Interactor)?
A class that encapsulates a single, specific piece of business logic (e.g., `LoginUserUseCase`). It takes input from the Presentation layer, interacts with the Repository, and returns the result. This keeps controllers/BLoCs incredibly thin.

```dart
class LoginUserUseCase {
  final UserRepository repository;
  LoginUserUseCase(this.repository);
  
  Future<User> execute(String email, String password) {
    return repository.login(email, password);
  }
}
```

## 5. What is MVVM in Flutter?
Model-View-ViewModel. 
- **View**: The Flutter UI (Stateless/Stateful Widgets).
- **ViewModel**: Manages the state for the View and formats data (using `ChangeNotifier` or `StateNotifier`).
- **Model**: The data source and business logic.

## 6. How is MVVM different from MVC?
In MVC (Model-View-Controller), the Controller heavily manipulates the View directly. In MVVM, the ViewModel has no direct reference to the View. Instead, the View "listens" to the ViewModel (via Streams or Listeners) and rebuilds itself when data changes.

## 7. What is Dependency Injection (DI)?
A design pattern where a class receives its dependencies from an external source rather than creating them internally. It drastically improves code reusability and testability (allowing you to easily inject mock dependencies).

```dart
// BAD: Tightly coupled
class LoginController {
  final api = ApiService(); // Hardcoded dependency
}

// GOOD: Injected
class LoginController {
  final ApiService api;
  LoginController({required this.api});
}
```

## 8. What is `get_it`?
A hugely popular Service Locator package for Dart. It acts as a central registry where you register your dependencies (like Repositories or ViewModels) and retrieve them from anywhere in the app.

```dart
final getIt = GetIt.instance;

void setup() {
  getIt.registerSingleton<ApiService>(ApiService());
  getIt.registerFactory<LoginBloc>(() => LoginBloc(getIt()));
}

// Later in UI:
final api = getIt<ApiService>();
```

## 9. What is the difference between a Singleton and a Factory in DI?
- **Singleton**: The DI container creates the object exactly once. Every time you request it, you get the exact same instance. (Good for API clients, Databases).
- **Factory**: The DI container creates a brand new instance of the object every single time you request it. (Good for BLoCs or ViewModels).

## 10. What is `injectable`?
A package used alongside `get_it`. It uses code generation (`build_runner`) to automatically register your dependencies based on annotations (`@injectable`, `@singleton`), removing the need to write the `getIt.register...` boilerplate manually.

## 11. Explain SOLID principles briefly.
1. **S**ingle Responsibility: A class should have one reason to change.
2. **O**pen/Closed: Open for extension, closed for modification.
3. **L**iskov Substitution: Subclasses should be replaceable for their base classes.
4. **I**nterface Segregation: Many client-specific interfaces are better than one general-purpose interface.
5. **D**ependency Inversion: Depend upon abstractions, not concretions.

## 12. How do you implement Dependency Inversion in Flutter?
Define an abstract class (Interface) in your Domain layer (e.g., `UserRepository`). Implement it in the Data layer (`UserRepositoryImpl`). The UI/UseCases only depend on the abstract `UserRepository`. During DI setup, you bind the interface to the concrete implementation.

## 13. What is the DTO (Data Transfer Object) pattern?
DTOs (or Models) map directly to the JSON structure from the API. The Domain layer, however, uses pure **Entities**. You create mapping functions (`toEntity()`) to convert DTOs into pure Entities, isolating the rest of the app from API changes.

## 14. What is the difference between an Entity and a Model?
- **Model**: Understands serialization (from/to JSON), knows about third-party annotations (like `@JsonSerializable`).
- **Entity**: A pure Dart class representing core business concepts. Knows nothing about JSON, APIs, or databases.

## 15. What is Equatable?
A Dart package that overrides `==` and `hashCode` for you. It is heavily used in BLoC to determine if two states are identical, preventing unnecessary UI rebuilds if the data hasn't actually changed.

```dart
class UserState extends Equatable {
  final String name;
  UserState(this.name);
  
  @override
  List<Object> get props => [name]; // Used for equality check
}
```

## 16. What is Freezed?
A powerful code generator package for creating immutable classes and sealed unions in Dart. It generates `copyWith`, `toString`, `==`, and pattern matching methods (`map`, `when`).

```dart
@freezed
class NetworkState with _$NetworkState {
  const factory NetworkState.loading() = Loading;
  const factory NetworkState.success(String data) = Success;
  const factory NetworkState.error(String msg) = Error;
}
```

## 17. What is the Singleton Pattern and why is it an anti-pattern in UI?
A pattern ensuring only one instance of a class exists. Using static singletons globally makes unit testing nearly impossible because state persists across tests. Use a Service Locator (like `get_it`) instead.

## 18. What is the Repository vs Service?
- **Service**: Executes specific actions or business logic (e.g., `StripePaymentService`).
- **Repository**: Acts specifically as a data collection. It abstracts away data fetching and caching logic.

## 19. How do you handle Environment Variables (Flavors)?
You use the `--dart-define` flag during compilation to pass environment variables (like API keys). In code, you read them using `String.fromEnvironment()`. Alternatively, use packages like `flutter_dotenv`.

```bash
flutter run --dart-define=API_URL=https://dev.api.com
```

## 20. What is the Observer Pattern?
A design pattern where an object (Subject) maintains a list of dependents (Observers) and notifies them of state changes. In Flutter, this is exactly what `ChangeNotifier` and `Stream` do.

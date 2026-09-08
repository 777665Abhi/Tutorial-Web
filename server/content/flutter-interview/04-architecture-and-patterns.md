---
title: "Architecture & Patterns"
description: "Explore clean architecture, repository patterns, and best practices."
---

## 1. What is Clean Architecture in Flutter?
Clean Architecture divides the app into independent layers (Presentation, Domain, Data) so that business logic is completely decoupled from UI, databases, and network frameworks, making the app highly testable and maintainable.

## 2. Explain the Repository Pattern.
The Repository Pattern acts as a central hub for all data sources (API, local DB, memory cache). The presentation layer requests data from the repository without needing to know where the data comes from.

## 3. What is Dependency Injection (DI) in Flutter?
DI is a technique where an object receives its dependencies from the outside rather than creating them itself. In Flutter, this is commonly handled by packages like `get_it` or by using Riverpod/Provider.

## 4. Why should you avoid global variables?
Global variables make code tightly coupled, hard to test, and difficult to track changes. They break the encapsulation principle. Dependency Injection is the preferred alternative.

## 5. What is a Service Locator, like `get_it`?
A Service Locator is a registry where you register dependencies (like singletons or factories) at app startup, and then retrieve them anywhere in the app without passing them through constructors.

## 6. How do you implement a Singleton in Dart?
You can use a private constructor and a static instance variable:
```dart
class Database {
  Database._privateConstructor();
  static final Database instance = Database._privateConstructor();
}
```

## 7. What is the Domain Layer in Clean Architecture?
It is the innermost layer. It contains the core business logic (Entities and Use Cases/Interactors) and abstract repository interfaces. It has absolutely no dependencies on the Data or Presentation layers.

## 8. What is the Data Layer?
It implements the repository interfaces defined in the Domain layer. It handles fetching data from network APIs (e.g., Dio, Http) or local storage (e.g., Hive, Sqflite) and converting JSON into models.

## 9. What is a Use Case (Interactor)?
A Use Case represents a single, specific action or business rule in the app (e.g., `LoginUserUseCase`). It acts as a bridge between the Presentation layer and the Repository.

## 10. How do you handle routing in a large Flutter app?
For large apps, declarative routing with the `Router` API (Navigator 2.0) is recommended. Popular packages like `go_router` or `auto_route` simplify this process and handle deep linking effectively.

## 11. What is the `Equatable` package?
In Dart, two instances of a class are not equal even if their properties are exactly the same, because they occupy different memory addresses. `Equatable` overrides the `==` operator automatically based on class properties, crucial for comparing States in BLoC.

## 12. What is the `Freezed` package used for?
`Freezed` is a code generation tool for creating immutable data classes and sealed classes. It automatically generates `copyWith` methods, `==` overrides, and JSON serialization, enforcing strict immutability.

## 13. What is a DTO (Data Transfer Object) vs a Domain Model?
A DTO is a raw class representing exactly what the API returns (often messy). The Data Layer maps the DTO into a pristine, UI-friendly Domain Model before sending it to the Presentation Layer.

## 14. What is "Feature First" vs "Layer First" folder structure?
- **Layer First**: Organizing by tech layer (e.g., `/blocs`, `/ui`, `/repositories`). Hard to scale.
- **Feature First**: Organizing by functionality (e.g., `/auth`, `/checkout`). Each feature folder contains its own UI, domain, and data layers. Highly scalable.

## 15. How do SOLID principles apply to Flutter?
- **Single Responsibility**: A Widget should only draw UI, not fetch data.
- **Dependency Inversion**: UI depends on abstract Repositories, not concrete HTTP clients.
- **Liskov Substitution**: Using interfaces safely.

## 16. What is the Presentation / UI Layer responsible for?
It is responsible strictly for drawing the screen and capturing user inputs. It should contain exactly zero business logic, API calls, or database queries.

## 17. Explain Navigator 1.0 vs Navigator 2.0 (Router).
- **Navigator 1.0**: Imperative routing (`push()` and `pop()`). Easy to use but struggles with deep links and web URLs.
- **Navigator 2.0**: Declarative routing. The navigation stack is treated as State, allowing full control over deep linking and browser history.

## 18. What is the difference between Factory and LazySingleton in `get_it`?
- **Factory**: Every time you request the object, `get_it` creates and returns a brand new instance.
- **LazySingleton**: The instance is only created the first time it is requested, and that exact same instance is returned for the rest of the app's life.

## 19. What is the `Either` type (from the `fpdart` or `dartz` package)?
It is a functional programming concept used for error handling. A function returns `Either<Failure, Data>`. This forces the caller to explicitly handle both the `Left` (error) and the `Right` (success) outcomes.

## 20. Why should UI components be split into smaller Widgets instead of helper methods?
Using a helper method (e.g., `Widget buildButton()`) executes every time the parent rebuilds. Extracting it into a new class (e.g., `class CustomButton extends StatelessWidget`) allows Flutter to efficiently cache it and use `const`, saving CPU cycles.

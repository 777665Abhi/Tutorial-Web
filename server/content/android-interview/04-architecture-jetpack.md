---
title: "Architecture & Android Jetpack"
description: "Master MVVM, Clean Architecture, Room, Hilt, and core Jetpack libraries."
---

## 46. Explain the Clean Architecture layers (Data, Domain, Presentation) in Android.
- **Presentation Layer**: Contains the UI (Activities, Composables) and ViewModels. Handles user interaction and displays state.
- **Domain Layer**: The core of the app. Contains pure Kotlin business logic, Use Cases (Interactors), and repository interfaces. Has zero Android dependencies.
- **Data Layer**: Implements the repository interfaces. Connects to network APIs (Retrofit) or local databases (Room). Maps raw data into Domain models.

## 47. What is MVVM (Model-View-ViewModel) architecture, and how does it compare to MVI (Model-View-Intent)?
- **MVVM**: The ViewModel exposes independent streams of state (e.g., `isLoading`, `userData`). The View observes these states. State mutation can happen scattered across the ViewModel.
- **MVI**: Enforces a unidirectional data flow. The View sends "Intents" (actions) to the ViewModel. The ViewModel reduces these actions into a *single* immutable State object emitted back to the View. MVI prevents inconsistent overlapping states.

## 48. How does `ViewModel` survive configuration changes internally?
When an Activity undergoes a configuration change (like rotation), it is destroyed, but the system preserves a `ViewModelStore` associated with that activity. The `ViewModelStore` retains all ViewModel instances in memory. When the new Activity instance is created, it reconnects to the existing `ViewModelStore` and retrieves the exact same ViewModels.

## 49. What is `LiveData`, and how does `StateFlow` replace it in modern Android development?
`LiveData` is an observable data holder that is lifecycle-aware (only updates active observers). However, it is tied to the Android framework and runs only on the main thread.
`StateFlow` is a pure Kotlin equivalent. It doesn't know about Android lifecycles inherently (handled via `collectAsStateWithLifecycle` in Compose), supports complex asynchronous operations (map, filter, combine), and belongs in the Domain layer unlike LiveData.

## 50. What is `postValue()` vs `setValue()` in `LiveData`?
- **`setValue()`**: Must be called from the Main UI thread. It immediately updates the LiveData value and notifies observers synchronously.
- **`postValue()`**: Can be called from a background thread. It posts a task to the Main thread's message queue to update the value. If called multiple times before the main thread executes the task, only the last value is dispatched.

## 51. How do you share a single `ViewModel` across multiple Fragments or Composables?
- **Fragments**: By scoping the ViewModel to the parent Activity (`activityViewModels()`) or to a specific Navigation Graph (`navGraphViewModels()`).
- **Compose**: By passing the ViewModel down from the common parent composable, or using a Dependency Injection framework like Hilt (`hiltViewModel()`) scoped to the navigation destination.

## 52. What is Dependency Injection, and why is Google Hilt / Dagger 2 used in Android?
Dependency Injection (DI) is a pattern where an object receives its dependencies from an external source rather than creating them itself. 
Hilt/Dagger automate this process by generating the boilerplate code required to construct objects and their dependency trees at compile time, improving code testability, reusability, and modularity.

## 53. What is the difference between `@Provides` and `@Binds` in Hilt/Dagger?
- **`@Provides`**: Used when you need to write custom logic to construct the object (e.g., configuring a Retrofit builder or a third-party library).
- **`@Binds`**: An optimization used specifically to bind an Interface to its concrete Implementation. It requires an abstract function and generates less overhead than `@Provides`.

## 54. What is `WorkManager`, and how does it guarantee background task execution?
`WorkManager` is the recommended library for persistent, deferrable background work. It guarantees execution even if the app closes or the device restarts. Internally, it relies on `JobScheduler` (on modern devices) or `AlarmManager`, storing the work requests in an internal SQLite database to survive process death.

## 55. What is `Room` database, and how does it handle schema migrations?
`Room` is an abstraction layer over SQLite that provides compile-time query verification. 
When your data models change, you must write a `Migration` class detailing the SQL commands to alter the tables (e.g., `ALTER TABLE users ADD COLUMN age INTEGER`). You then add this migration to the Room database builder to prevent data loss when users update the app.

## 56. What are `TypeConverters` in Room?
SQLite only supports primitive data types (integers, text, real). If you want to store a complex object (like a `Date` or a `List<String>`), you must create a `TypeConverter`. It tells Room how to convert the complex object into a primitive (e.g., converting a `Date` to a `Long` timestamp) for storage, and back again when querying.

## 57. What is Navigation Component, and what benefits does Safe Args provide?
The Navigation Component handles complex app navigation, backstack management, and deep linking.
**Safe Args** is a Gradle plugin that generates type-safe classes for navigating between destinations. Instead of passing data via unreliable `Bundle` string keys, you call generated methods (e.g., `Directions.actionToDetails(userId = 5)`), ensuring compile-time safety and preventing crashes.

## 58. What is `Paging 3` library, and how does it handle dynamic data loading?
`Paging 3` handles loading and displaying large datasets incrementally (pagination). It tracks scrolling state, handles network/database requests in the background, manages in-memory caching, and seamlessly updates the UI via `PagingDataAdapter` or Compose's `collectAsLazyPagingItems()`, preventing memory exhaustion.

## 59. How do you implement an offline-first architecture using Room and Retrofit?
The standard approach is the "Single Source of Truth" pattern using `RemoteMediator` (in Paging 3) or a custom Repository:
1. The UI always observes the local Room database (`Flow<List>`).
2. The Repository attempts to fetch fresh data from the network via Retrofit.
3. If the network call succeeds, the data is saved into Room.
4. Room automatically emits the new data to the UI via the active Flow.

## 60. What is App Modularization, and what are feature modules vs core modules?
Modularization involves splitting a monolithic app into independent Gradle modules to improve build speed and team collaboration.
- **Core/Library Modules**: Contain shared code (Networking, Design System, Database) with no business logic.
- **Feature Modules**: Contain specific isolated app features (e.g., `:feature-login`, `:feature-checkout`). They depend on core modules but never on each other.

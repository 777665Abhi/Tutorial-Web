---
title: "Architecture & Jetpack"
description: "MVVM, MVI, ViewModels, Room, Data Binding, and WorkManager."
---

## 1. What is the recommended Architecture for Android apps?
Google recommends the **MVVM** (Model-View-ViewModel) or **MVI** (Model-View-Intent) architecture combined with Unidirectional Data Flow. The architecture should be separated into a UI Layer, Domain Layer (optional), and Data Layer.

## 2. What is a ViewModel?
A Jetpack class designed to store and manage UI-related data in a lifecycle-conscious way. It survives configuration changes (like screen rotations).

```kotlin
class UserViewModel : ViewModel() {
    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user
    
    // Survives screen rotation!
}
```

## 3. How does ViewModel survive configuration changes?
When an Activity is recreated due to a configuration change, the system retains the `ViewModelStore`. The new Activity instance reconnects to the existing `ViewModelStore` and retrieves the exact same ViewModel instance.

## 4. Can you pass a `Context` into a ViewModel?
**No!** Passing an `Activity` or `View` context into a ViewModel causes severe memory leaks because the ViewModel outlives the Activity. If you must use context (e.g., for system services), use `AndroidViewModel` which provides the Application Context.

## 5. What is Room?
Room is a Jetpack persistence library that provides an abstraction layer over SQLite. It offers compile-time verification of SQL queries and native support for Coroutines and Flow.

```kotlin
@Entity(tableName = "users")
data class User(
    @PrimaryKey val id: Int,
    val name: String
)
```

## 6. What are the three main components of Room?
1. **Entity**: Represents a table within the database.
2. **DAO (Data Access Object)**: Contains the methods to access the database (e.g., `@Insert`, `@Query`).
3. **Database**: The main access point for the connection, holding the DAOs.

```kotlin
@Dao
interface UserDao {
    @Query("SELECT * FROM users")
    fun getAll(): Flow<List<User>> // Automatically updates when DB changes!
}
```

## 7. What is LiveData?
An observable data holder class that is lifecycle-aware. It only updates app component observers that are in an active lifecycle state (`STARTED` or `RESUMED`), preventing crashes from updating destroyed views.

```kotlin
val name = MutableLiveData<String>()
name.observe(this, Observer { newName ->
    textView.text = newName
})
```

## 8. What is the difference between `setValue()` and `postValue()` in LiveData?
- `setValue()`: Must be called from the Main (UI) thread. It sets the value synchronously.
- `postValue()`: Can be called from a background thread. It posts a task to the Main thread to update the value.

```kotlin
// In a background thread
liveData.postValue("Data from network")
```

## 9. What is Data Binding?
A support library that allows you to bind UI components in your XML layouts directly to data sources in your app using a declarative format rather than programmatically.

```xml
<TextView
    android:text="@{viewmodel.userName}" />
```

## 10. What is View Binding?
A feature that allows you to easily write code that interacts with views. Once enabled, it generates a binding class for each XML layout, replacing `findViewById` with null-safe and type-safe properties.

```kotlin
// No more findViewById!
val binding = ActivityMainBinding.inflate(layoutInflater)
setContentView(binding.root)
binding.textView.text = "Hello"
```

## 11. What is the difference between View Binding and Data Binding?
- **View Binding**: Only binds views to code. Faster compilation, simpler to set up, cannot execute logic in XML.
- **Data Binding**: Binds code to views (two-way binding). Allows writing expressions in XML, supports observable data, but slows down build times significantly.

## 12. What is WorkManager?
A Jetpack library for scheduling deferrable, asynchronous tasks that are expected to run even if the app exits or the device restarts (e.g., syncing logs to a server).

```kotlin
val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES).build()
WorkManager.getInstance(context).enqueue(request)
```

## 13. How does WorkManager ensure execution?
It abstracts away the underlying scheduling mechanisms. Depending on the API level, it delegates to `JobScheduler`, `FirebaseJobDispatcher`, or `AlarmManager` to guarantee execution.

## 14. What are WorkManager Constraints?
Conditions that must be met for the work to run, such as requiring an unmetered network connection or the device to be charging.

```kotlin
val constraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.UNMETERED)
    .setRequiresCharging(true)
    .build()
```

## 15. What is Navigation Component?
A framework for navigating between destinations within an app. It handles fragment transactions, back stack management, deep linking, and passing arguments safely.

```kotlin
// Navigating safely with NavDirections
val action = HomeFragmentDirections.actionHomeToDetails(userId = 123)
findNavController().navigate(action)
```

## 16. What is Safe Args?
A Gradle plugin used with the Navigation Component that generates type-safe classes for passing data between destinations, eliminating the risk of key-value mismatches and `ClassCastException`s.

```kotlin
// Receiving arguments safely
val args: DetailsFragmentArgs by navArgs()
val userId = args.userId
```

## 17. What is Hilt?
A dependency injection library for Android built on top of Dagger. It reduces the boilerplate of manual DI by providing standard containers for Android classes (like `@HiltAndroidApp` and `@AndroidEntryPoint`).

```kotlin
@HiltViewModel
class MyViewModel @Inject constructor(
    private val repository: UserRepository // Automatically injected!
) : ViewModel()
```

## 18. What is a Repository Pattern?
An architecture pattern that abstracts the data sources (Network, Database) from the rest of the app. The ViewModel asks the Repository for data, and the Repository decides whether to fetch it from the network or load it from the local cache.

## 19. What is DataStore?
The modern, coroutine-based replacement for `SharedPreferences`. It provides asynchronous, transactional data storage. There are two types: Preferences DataStore (key-value) and Proto DataStore (typed objects).

```kotlin
val Context.dataStore by preferencesDataStore(name = "settings")
```

## 20. What is Paging 3?
A Jetpack library that helps you load and display pages of data from a larger dataset from local storage or over a network. It integrates natively with RecyclerView and Compose, handling memory management and network requests seamlessly.

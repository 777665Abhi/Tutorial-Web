---
title: "Architecture & Jetpack"
description: "MVVM, MVI, ViewModels, Room, Data Binding, and WorkManager."
---

## 1. What is the recommended Architecture for Android apps?
Google recommends the **MVVM** (Model-View-ViewModel) or **MVI** (Model-View-Intent) architecture combined with Unidirectional Data Flow. The architecture should be separated into a UI Layer, Domain Layer (optional), and Data Layer.

**The three layers, and what each owns:**

- **UI layer** — Activities, Fragments or composables, plus `ViewModel`s. Renders state and forwards user events. Contains no business rules.
- **Domain layer** (optional) — use cases / interactors holding business logic reused across ViewModels. Pure Kotlin, no Android dependencies.
- **Data layer** — repositories and data sources (network, database, DataStore). Owns the application data and is the **single source of truth**.

```
  UI (Compose / Views)
        ↕  state down, events up
  ViewModel  ──▶  UseCase (optional)  ──▶  Repository
                                             ├── RemoteDataSource (Retrofit)
                                             └── LocalDataSource (Room)
```

**Two rules make the structure work:**

1. **Dependencies point inward and downward only.** The UI knows the ViewModel; the ViewModel knows the repository; the repository knows nothing about either. A repository that references a `View` or a `ViewModel` is the clearest sign the architecture has broken.
2. **The data layer is the single source of truth.** The UI never merges network and cache results itself — the repository decides, exposes one flow, and the UI just renders it.

**MVVM vs. MVI**, since the question offers both: MVVM typically exposes several observable properties and lets the ViewModel expose methods the UI calls. MVI tightens that into **one immutable state object** plus a sealed set of intents, so every change goes through a single `reduce(state, intent) -> state` funnel. MVI gives better reproducibility and makes impossible states unrepresentable; MVVM is lighter and less ceremonious. In practice most modern Android apps land in between — MVVM structure with a single `UiState` data class, which is MVI's main benefit without the boilerplate.

**What to say about *why*:** architecture is not about diagrams, it's about change cost. Separation means you can swap Retrofit for Ktor, test business logic without an emulator, and let several people work on one screen without conflicts. **Don't over-engineer** — for a small app, skipping the domain layer is the right call, and adding it later is cheap.

## 2. What is a ViewModel?
A Jetpack class designed to store and manage UI-related data in a lifecycle-conscious way. It survives configuration changes (like screen rotations).

```kotlin
class UserViewModel : ViewModel() {
    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user
    
    // Survives screen rotation!
}
```

**The problem it solves.** Before `ViewModel`, surviving rotation meant `onSaveInstanceState` (small parcelable data only) or retained Fragments (awkward and leak-prone). A `ViewModel` holds arbitrary objects, needs no serialisation, and keeps in-flight work running across the rotation instead of restarting it.

**Its responsibilities:** hold and expose UI state, survive configuration changes, and provide a coroutine scope (`viewModelScope`) that is cancelled when the screen is finished with. It is the UI layer's state owner.

**What it must not contain** — this is where most ViewModel code goes wrong:

- **No `Context`, `View`, `Activity`, `Fragment`, or binding references.** It outlives all of them, so holding one leaks the whole Activity.
- **No business logic that belongs in the domain or data layer.** A ViewModel orchestrates; it shouldn't know how to parse JSON or build SQL.
- **No Android framework imports at all**, ideally. That keeps it unit-testable on the JVM without Robolectric.

```kotlin
class UserViewModel(private val repo: UserRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()   // read-only outward

    init { load() }

    fun load() = viewModelScope.launch {
        _uiState.value = try {
            UiState.Success(repo.getUser())
        } catch (e: Exception) {
            UiState.Error(e.message)
        }
    }

    override fun onCleared() { /* release non-coroutine resources */ }
}
```

**`onCleared()`** is called when the ViewModel is genuinely finished — the Activity is finishing, not rotating. `viewModelScope` is cancelled for you, so you only override this for things it doesn't cover.

**The limit to state clearly:** a `ViewModel` survives configuration changes but **not process death**. If the system kills your backgrounded app, the ViewModel is gone. For small state that must survive that too, use `SavedStateHandle`, which bridges the ViewModel to the saved-instance-state bundle.

**Construction with dependencies** requires a factory — or Hilt's `@HiltViewModel`, which generates it. Never call `UserViewModel(repo)` directly; always go through `viewModels()`/`hiltViewModel()` so the framework manages the instance.

## 3. How does ViewModel survive configuration changes?
When an Activity is recreated due to a configuration change, the system retains the `ViewModelStore`. The new Activity instance reconnects to the existing `ViewModelStore` and retrieves the exact same ViewModel instance.

**The mechanism, step by step:**

1. Every `ViewModelStoreOwner` (Activity, Fragment, `NavBackStackEntry`) owns a **`ViewModelStore`** — essentially a `HashMap<String, ViewModel>`.
2. On a configuration change, the Activity is destroyed, but before that happens the framework stashes the `ViewModelStore` in the **`NonConfigurationInstance`** that `ActivityThread` carries across the recreation. (Historically this was `onRetainNonConfigurationInstance()`, the same mechanism that retained Fragments used.)
3. The new Activity instance is created and is handed that retained object, so it adopts the **same `ViewModelStore`**.
4. `by viewModels()` looks up the ViewModel by key in that store, finds the existing instance, and returns it — `onCreate` of the ViewModel never runs again.

**How it knows the difference between rotation and finishing** is the key insight, and the usual follow-up:

```kotlin
// Roughly what ComponentActivity does
if (!isChangingConfigurations) {
    viewModelStore.clear()      // real destruction → onCleared() runs
}
// else: keep the store for the next instance
```

`isChangingConfigurations` is the flag. Press Back and it's `false`, so the store is cleared and `onCleared()` fires. Rotate and it's `true`, so the store is retained.

**Three consequences worth stating:**

- **This is not magic persistence.** The ViewModel is kept **in memory in the same process**. Kill the process and it's gone — which is exactly why it doesn't survive process death and why `SavedStateHandle` exists.
- **The scope follows the owner.** A ViewModel scoped to a Fragment is cleared when that Fragment is permanently removed; one scoped to a `NavBackStackEntry` is cleared when that destination is popped. This is how you get per-screen ViewModels for free in Navigation.
- **Sharing works through the owner.** `by activityViewModels()` resolves against the Activity's store, so all Fragments inside get the same instance — the standard Fragment-to-Fragment communication channel.

## 4. Can you pass a `Context` into a ViewModel?
**No!** Passing an `Activity` or `View` context into a ViewModel causes severe memory leaks because the ViewModel outlives the Activity. If you must use context (e.g., for system services), use `AndroidViewModel` which provides the Application Context.

**Why it leaks, concretely:** a ViewModel deliberately survives Activity destruction. Hold an Activity `Context` and you hold that destroyed Activity, its entire view hierarchy, and its bitmaps. Rotate five times and you have five dead Activities in memory — and the leak grows with every rotation until `OutOfMemoryError`.

```kotlin
class BadViewModel(private val context: Context) : ViewModel()   // leaks the Activity
val vm = BadViewModel(this)
```

**`AndroidViewModel` is the sanctioned escape hatch**, and it's safe because the `Application` context has the same lifetime as the process:

```kotlin
class MyViewModel(app: Application) : AndroidViewModel(app) {
    private val ctx = getApplication<Application>()
    fun label() = ctx.getString(R.string.title)
}
```

**But the better answer is usually to not need a Context at all.** `AndroidViewModel` is easy to abuse into a ViewModel that formats strings, reads files, and talks to system services — which makes it untestable on the JVM and blurs the layers. The preferred alternatives:

- **Resources and strings** — expose a *resource ID* or a typed state from the ViewModel and let the UI resolve it. `UiState.Error(R.string.network_error)` keeps the ViewModel free of `Context` and makes it testable.
- **Databases, preferences, system services** — inject a repository or data source that owns the `Context` internally. The ViewModel asks `settingsRepository.theme`, not `context.getSharedPreferences(...)`.
- **With Hilt**, inject `@ApplicationContext` into the *repository*, not the ViewModel.

```kotlin
// Preferred: no Context in the ViewModel at all
@HiltViewModel
class MyViewModel @Inject constructor(
    private val settings: SettingsRepository    // holds the Context internally
) : ViewModel()
```

**The underlying rule, stated generally:** a ViewModel must not reference anything with a shorter lifetime than itself. That includes `Context`, but also `View`s, view bindings, `Fragment`s, `NavController`s, and lifecycle owners. If a ViewModel needs to trigger navigation, it emits an event and lets the UI act on it.

The one genuinely safe `Context` is the application one — and even then, prefer pushing it a layer down.

## 5. What is Room?
Room is a Jetpack persistence library that provides an abstraction layer over SQLite. It offers compile-time verification of SQL queries and native support for Coroutines and Flow.

```kotlin
@Entity(tableName = "users")
data class User(
    @PrimaryKey val id: Int,
    val name: String
)
```

**The headline feature is compile-time SQL verification.** Room parses every `@Query` against your schema at build time, so a typo in a column name or a mismatch between the query's columns and the return type is a **compile error**, not a crash in production. Raw `SQLiteOpenHelper` gives you neither.

**What else it removes:** no manual `Cursor` iteration or column-index lookups (and no leaked cursors), no hand-written `ContentValues`, no boilerplate mapping rows to objects, and no main-thread database access — Room throws if you try, unless you explicitly opt out.

**Reactive queries are the other major win.** Return a `Flow` and Room re-runs the query automatically whenever the underlying tables change:

```kotlin
@Query("SELECT * FROM users WHERE active = 1")
fun observeActive(): Flow<List<User>>      // emits again on every relevant write
```

This is what makes the "database as single source of truth" pattern practical: the network writes to Room, and the UI — observing Room — updates itself with no explicit refresh logic.

```kotlin
// Repository: offline-first, one source of truth
fun observeUser(id: String): Flow<User> = dao.observeUser(id)
    .onStart { refreshFromNetwork(id) }     // network writes into Room; UI follows
```

**Other capabilities worth naming:** `@Transaction` for atomic multi-step operations, `@Relation`/`@Embedded` for one-to-many and nested objects, `@TypeConverter` for non-primitive columns (dates, enums, lists), full-text search via `@Fts4`, and `@DatabaseView`.

**Migrations are the operational reality.** Bump `version` and supply a `Migration`, or your users' apps crash on upgrade. `fallbackToDestructiveMigration()` wipes the data and is acceptable only in development. Export the schema (`room.schemaLocation`) and commit it — that's what lets Room generate and test migrations, and `@AutoMigration` handles the simple cases for you.

```kotlin
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE users ADD COLUMN email TEXT")
    }
}
```

Room is still SQLite underneath — it's a well-designed layer, not a different database.

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

**Entity** — a class annotated `@Entity`, where each field becomes a column. Beyond `@PrimaryKey`, the useful annotations are `@ColumnInfo(name = ...)` to decouple field names from column names, `@Ignore` for fields that aren't persisted, `indices` for query performance, and `foreignKeys` for referential integrity:

```kotlin
@Entity(
    tableName = "users",
    indices = [Index(value = ["email"], unique = true)]
)
data class User(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "full_name") val name: String,
    val email: String
)
```

**DAO** — an interface (or abstract class) where each method is a query. The convenience annotations cover the common cases, and `@Query` covers everything else:

```kotlin
@Dao
interface UserDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(user: User): Long

    @Update suspend fun update(user: User)
    @Delete suspend fun delete(user: User)

    @Query("SELECT * FROM users WHERE id = :id")
    suspend fun getById(id: Long): User?           // one-shot → suspend

    @Query("SELECT * FROM users ORDER BY full_name")
    fun observeAll(): Flow<List<User>>             // observable → Flow, NOT suspend

    @Transaction
    suspend fun replaceAll(users: List<User>) {    // atomic multi-step
        deleteAll(); insertAll(users)
    }
}
```

**The return type is a design decision**, and it's a common interview point: `suspend` for a one-shot read or write, and a plain (non-suspend) `Flow` for an observable query. Marking a `Flow`-returning method `suspend` is a mistake — the `Flow` itself is the asynchrony.

**Database** — an abstract class extending `RoomDatabase`, listing entities and exposing DAO getters:

```kotlin
@Database(entities = [User::class], version = 1, exportSchema = true)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
}
```

**Make the database a singleton.** Building it is expensive and multiple instances cause locking problems and wasted memory. In practice you provide it through Hilt as an `@Singleton`, rather than hand-rolling a double-checked lock.

## 7. What is LiveData?
An observable data holder class that is lifecycle-aware. It only updates app component observers that are in an active lifecycle state (`STARTED` or `RESUMED`), preventing crashes from updating destroyed views.

```kotlin
val name = MutableLiveData<String>()
name.observe(this, Observer { newName ->
    textView.text = newName
})
```

**Lifecycle awareness is the whole value proposition**, and it gives you three things automatically:

1. **No updates to dead UI** — if the observer's lifecycle isn't at least `STARTED`, the callback isn't invoked. This structurally prevents the "updating a destroyed view" crash.
2. **Automatic unsubscription** — the observer is removed at `ON_DESTROY`. No `onDestroy` cleanup, no leaked observers.
3. **Automatic re-delivery** — when the UI comes back to `STARTED`, it immediately receives the latest value, so the screen is never stale.

**The observer owner matters.** In a Fragment, always observe with `viewLifecycleOwner`, not `this`:

```kotlin
// Wrong: the Fragment outlives its view, so returning to it adds a SECOND observer
viewModel.user.observe(this) { binding.name.text = it.name }

// Right: the observer dies with the view
viewModel.user.observe(viewLifecycleOwner) { binding.name.text = it.name }
```

Using `this` is the single most common `LiveData` bug — it accumulates duplicate observers across view recreations and can touch a destroyed binding.

**Expose `LiveData`, keep `MutableLiveData` private**, so only the ViewModel can write:

```kotlin
private val _user = MutableLiveData<User>()
val user: LiveData<User> = _user
```

**Transformations** are limited but useful: `map`, `switchMap` (re-subscribe to a new source when the input changes — the standard search pattern), and `distinctUntilChanged`. `MediatorLiveData` combines several sources.

**The quirk to know: `LiveData` always replays its last value to a new observer.** That's correct for *state* but wrong for *events* — a "navigate" or "show snackbar" value fires again after every rotation. The old workaround was an `Event` wrapper or `SingleLiveEvent`; the modern answer is to use a `Channel`/`SharedFlow` for events and keep `LiveData`/`StateFlow` for state.

**Status today:** not deprecated, and still perfectly reasonable — especially in Java codebases, where it's much easier than coroutines. But `StateFlow` is preferred in new Kotlin code, and it's effectively required with Compose.

## 8. What is the difference between `setValue()` and `postValue()` in LiveData?
- `setValue()`: Must be called from the Main (UI) thread. It sets the value synchronously.
- `postValue()`: Can be called from a background thread. It posts a task to the Main thread to update the value.

```kotlin
// In a background thread
liveData.postValue("Data from network")
```

**`setValue` is synchronous** — observers run before the call returns, so reading `liveData.value` immediately afterwards gives the new value. Calling it off the main thread throws `IllegalStateException: Cannot invoke setValue on a background thread`.

**`postValue` schedules the update** onto the main looper, so there's a gap between the call and the value actually changing:

```kotlin
liveData.postValue("B")
println(liveData.value)     // still "A" — the post hasn't run yet
```

**The gotcha that separates a memorised answer from an understood one: `postValue` conflates.** Multiple rapid posts before the main thread processes them result in **only the last value being delivered**:

```kotlin
// Observers see ONLY 100 — values 1..99 are silently dropped
repeat(100) { liveData.postValue(it) }
```

This is fine for state ("the latest is all that matters") but silently loses data if you were treating each emission as an event — a progress counter, say, or items to append. If every value matters, switch to the main thread and use `setValue`, or use a `Channel`.

**Mixing the two is also a hazard**, since a `setValue` can land between a `postValue` and its delivery, making the final value hard to reason about. Pick one per LiveData where you can.

**In coroutine code the question often disappears.** Because `viewModelScope` dispatches on `Dispatchers.Main.immediate`, you're already on the main thread after a `withContext` returns, so `value =` is both correct and simpler:

```kotlin
viewModelScope.launch {
    val data = withContext(Dispatchers.IO) { repo.fetch() }
    _state.value = data          // back on Main — setValue is fine
}
```

Worth noting that **`StateFlow` has no equivalent split** — `value` is settable from any thread and is always conflated, which is one small way it's simpler.

## 9. What is Data Binding?
A support library that allows you to bind UI components in your XML layouts directly to data sources in your app using a declarative format rather than programmatically.

```xml
<TextView
    android:text="@{viewmodel.userName}" />
```

**How it works:** you wrap the layout in a `<layout>` tag and declare `<data>` variables; the annotation processor generates a binding class that wires expressions to views. With `LiveData` or observable fields plus a `lifecycleOwner`, the views update themselves when the data changes — no manual `setText` anywhere.

```xml
<layout>
    <data>
        <variable name="viewmodel" type="com.example.UserViewModel" />
    </data>
    <LinearLayout ...>
        <TextView
            android:text="@{viewmodel.userName}"
            android:visibility="@{viewmodel.isLoading ? View.GONE : View.VISIBLE}" />
        <Button android:onClick="@{() -> viewmodel.onSave()}" />
    </LinearLayout>
</layout>
```

```kotlin
binding.viewmodel = viewModel
binding.lifecycleOwner = viewLifecycleOwner      // without this, LiveData won't update
```

**Two-way binding** (`@={}`) syncs changes back from the view to the data — the main thing View Binding cannot do:

```xml
<EditText android:text="@={viewmodel.query}" />
```

**`@BindingAdapter`** lets you teach XML about custom attributes, which is how image loading ends up in the layout:

```kotlin
@BindingAdapter("imageUrl")
fun ImageView.loadUrl(url: String?) { Glide.with(this).load(url).into(this) }
```

**The honest assessment**, which is what an interviewer is usually probing for: Data Binding has real costs. It **slows builds significantly** (annotation processing over every layout), produces **error messages that point into generated code** rather than your source, puts **logic in XML where it can't be unit-tested or debugged** with breakpoints, and makes layouts harder to read as expressions accumulate.

**Google's current guidance is to prefer View Binding** for view references, and to use Compose for new UI rather than adopting Data Binding. Its two-way binding and expression features are precisely the things Compose does better and more safely. In an existing codebase it's fine to keep; for a new project in 2026, choosing it would be hard to justify.

## 10. What is View Binding?
A feature that allows you to easily write code that interacts with views. Once enabled, it generates a binding class for each XML layout, replacing `findViewById` with null-safe and type-safe properties.

```kotlin
// No more findViewById!
val binding = ActivityMainBinding.inflate(layoutInflater)
setContentView(binding.root)
binding.textView.text = "Hello"
```

**It fixes the two failure modes of `findViewById`:**

- **Null safety** — `findViewById` returns the view for *any* layout, so referencing a view that only exists in the landscape variant compiles fine and crashes with `NullPointerException` at runtime. View Binding generates per-layout classes, so a view missing from a configuration variant is typed as nullable.
- **Type safety** — `findViewById<TextView>(R.id.button)` compiles and then throws `ClassCastException`. The generated field already has the right type.

**Enabling it is one line**, with no annotation processor and therefore no build-time cost:

```groovy
android { buildFeatures { viewBinding true } }
```

Naming is mechanical: `activity_main.xml` → `ActivityMainBinding`, and `android:id="@+id/user_name"` → `binding.userName`. Add `tools:viewBindingIgnore="true"` to skip a layout.

**The Fragment pattern is the thing to get right**, because the naive version leaks the entire view hierarchy:

```kotlin
class MyFragment : Fragment(R.layout.fragment_my) {
    private var _binding: FragmentMyBinding? = null
    private val binding get() = _binding!!

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        _binding = FragmentMyBinding.bind(view)
        binding.title.text = "Hello"
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null              // the Fragment outlives its view — must clear
    }
}
```

Note `bind(view)` rather than `inflate(...)` when using the layout-ID constructor, which avoids inflating twice.

**In a `RecyclerView.ViewHolder`** it's equally idiomatic — pass the binding into the holder and use `binding.root` as the item view.

**Compared to the alternatives:** better than `findViewById` on every axis; better than Kotlin synthetics (deprecated, and unsafe because they resolved against the wrong layout silently); and better than Data Binding when you only need view references, because it costs nothing at build time. The trade-off is simply that it cannot bind data or handle two-way binding — by design.

## 11. What is the difference between View Binding and Data Binding?
- **View Binding**: Only binds views to code. Faster compilation, simpler to set up, cannot execute logic in XML.
- **Data Binding**: Binds code to views (two-way binding). Allows writing expressions in XML, supports observable data, but slows down build times significantly.

**Point by point:**

- **Purpose** — View Binding replaces `findViewById`, nothing more. Data Binding connects layouts to data sources declaratively.
- **Build cost** — View Binding generates classes directly with **no annotation processing**, so the cost is negligible. Data Binding runs kapt/KSP over every layout and is one of the most common causes of slow Android builds.
- **Layout changes required** — View Binding: none, it works with existing layouts. Data Binding: every layout must be wrapped in `<layout>` tags.
- **Expressions in XML** — View Binding: none. Data Binding: a whole expression language, plus `@BindingAdapter` extensions.
- **Two-way binding** — only Data Binding (`@={}`).
- **Error messages** — View Binding errors are ordinary Kotlin errors. Data Binding errors frequently surface as failures inside generated code, which is notoriously hard to diagnose.
- **Testability** — logic in a ViewModel (View Binding) is unit-testable; logic in an XML expression is not.

**They are not mutually exclusive.** Enabling Data Binding also gives you View Binding behaviour for layouts without `<layout>` tags, so a codebase can migrate incrementally.

**How to choose, stated plainly:**

- **New project with Views** → View Binding. It solves the real problem (`findViewById`) at no cost, and keeps logic in Kotlin where it can be tested.
- **New project, period** → Compose, which supersedes both.
- **Existing Data Binding codebase** → keep it; ripping it out rarely pays for itself.

**The deeper argument**, and a good thing to voice in an interview: Data Binding moves logic *into the layout*, which is the opposite direction from where Android architecture has gone. Conditional visibility, formatting, and click handling are all easier to read, test, and debug in Kotlin. Compose makes this explicit — the UI is Kotlin, so there's no XML expression language to invent.

## 12. What is WorkManager?
A Jetpack library for scheduling deferrable, asynchronous tasks that are expected to run even if the app exits or the device restarts (e.g., syncing logs to a server).

```kotlin
val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES).build()
WorkManager.getInstance(context).enqueue(request)
```

**The two words that define its scope: *deferrable* and *guaranteed*.**

- **Deferrable** — the work doesn't need to happen *now*. WorkManager batches it with system maintenance windows to save battery, so it may run minutes or hours later. If the user is waiting for the result, this is the wrong tool.
- **Guaranteed** — the request is persisted in a local database, so it survives app death, process kill, and device reboot. This is the critical distinction from a coroutine in a `ViewModel`, which disappears the moment your process does.

**Writing a worker:**

```kotlin
class SyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result = try {
        repository.sync()
        Result.success()
    } catch (e: IOException) {
        Result.retry()           // transient → exponential backoff
    } catch (e: Exception) {
        Result.failure()         // permanent → give up
    }
}
```

`CoroutineWorker` is the Kotlin variant and runs `doWork` on `Dispatchers.Default` by default. The three return values matter: `retry()` reschedules with backoff, `failure()` stops permanently (and cancels dependent work in a chain), `success()` completes.

**Chaining and uniqueness** are the features that make it more than a scheduler:

```kotlin
WorkManager.getInstance(ctx)
    .beginUniqueWork("sync", ExistingWorkPolicy.KEEP, compressRequest)
    .then(uploadRequest)
    .then(cleanupRequest)
    .enqueue()
```

`ExistingWorkPolicy.KEEP`/`REPLACE`/`APPEND` is how you prevent duplicate work when the user taps "sync" five times — a very common requirement.

**Passing data and observing progress:**

```kotlin
val request = OneTimeWorkRequestBuilder<UploadWorker>()
    .setInputData(workDataOf("uri" to fileUri.toString()))
    .build()

WorkManager.getInstance(ctx).getWorkInfoByIdLiveData(request.id)
    .observe(owner) { info -> if (info?.state == WorkInfo.State.SUCCEEDED) { /* ... */ } }
```

`Data` is capped at ~10 KB, so pass identifiers and file URIs, not payloads.

**Minimum period for periodic work is 15 minutes**, and exact timing is never guaranteed — if you need precision, you want `AlarmManager` with an exact alarm (and a good justification, since those are restricted).

**When *not* to use it:** immediate work tied to a visible screen (use `viewModelScope`), user-visible ongoing work (use a foreground service), or precise timing (use `AlarmManager`).

## 13. How does WorkManager ensure execution?
It abstracts away the underlying scheduling mechanisms. Depending on the API level, it delegates to `JobScheduler`, `FirebaseJobDispatcher`, or `AlarmManager` to guarantee execution.

**Two layers deliver the guarantee**, and the delegation is only the second one.

**Layer one: persistence.** When you enqueue work, WorkManager writes the request — its ID, worker class, constraints, input data, and state — into its **own Room database** on disk. That's what survives process death and reboot. On the next app start (or at boot, via a `BOOT_COMPLETED` receiver it registers for you), it reads back everything still pending and reschedules it. Without this, no delegation scheme would survive a reboot.

**Layer two: picking a scheduler for the OS version.**

- **API 23+** — `JobScheduler`, the platform's own constraint-aware, battery-efficient scheduler. The preferred path.
- **API 14–22** — a combination of `AlarmManager` plus a `BroadcastReceiver`, since `JobScheduler` didn't exist. (`FirebaseJobDispatcher` and `GcmNetworkManager` filled this role historically and have since been removed from recent versions.)

Modern WorkManager targets API 23+ and effectively always uses `JobScheduler`, so the "three backends" answer describes the historical design more than today's.

**What "guaranteed" actually promises** — and the honest caveats are what make this answer good:

- It means **the work will eventually run** if its constraints are met, surviving app death and reboot. It does **not** mean "at a specific time."
- **Doze mode and App Standby** can delay work substantially. A device in deep Doze defers jobs to maintenance windows.
- **Aggressive OEM battery managers** (Xiaomi, Huawei, Samsung, OnePlus) are the real-world problem: if the user "force stops" the app or the OEM kills it, scheduled work can be dropped entirely. `dontkillmyapp.com` exists because of this, and it's a strong point to raise — the guarantee is best-effort against hostile OEM behaviour.
- **Force-stop** by the user cancels pending work until the app is launched again.

**Constraints are enforced by the underlying scheduler**, not polled by WorkManager, which is why they're battery-efficient — the OS wakes your job only when the conditions already hold.

## 14. What are WorkManager Constraints?
Conditions that must be met for the work to run, such as requiring an unmetered network connection or the device to be charging.

```kotlin
val constraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.UNMETERED)
    .setRequiresCharging(true)
    .build()
```

**The full set:**

- **`setRequiredNetworkType(...)`** — `NOT_REQUIRED`, `CONNECTED`, `UNMETERED` (Wi-Fi — use it for large uploads so you don't burn the user's data), `NOT_ROAMING`, `METERED`.
- **`setRequiresCharging(true)`** — for heavy or long work.
- **`setRequiresBatteryNotLow(true)`** — skips when the battery is low.
- **`setRequiresStorageNotLow(true)`** — for work that writes significant data.
- **`setRequiresDeviceIdle(true)`** — API 23+, device not in active use.
- **`addContentUriTrigger(uri, triggerForDescendants)`** — run when a content URI (e.g. `MediaStore`) changes.

```kotlin
val request = OneTimeWorkRequestBuilder<UploadWorker>()
    .setConstraints(
        Constraints.Builder()
            .setRequiredNetworkType(NetworkType.UNMETERED)
            .setRequiresCharging(true)
            .build()
    )
    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
    .setInitialDelay(10, TimeUnit.MINUTES)
    .addTag("upload")
    .build()
```

**Why they matter beyond convenience:** constraints are enforced by `JobScheduler` at the OS level, so your app isn't woken to check conditions itself. This is strictly better than the old pattern of a `CONNECTIVITY_CHANGE` broadcast receiver waking every app on the device whenever Wi-Fi flickered — which is exactly why Android 8 banned that pattern.

**Constraints are re-evaluated continuously.** If work is running and a constraint stops being satisfied — the user leaves Wi-Fi mid-upload — WorkManager **stops the worker and reschedules it**. Your worker must therefore be prepared to be interrupted, which has two implications:

1. **Make workers idempotent.** A worker can run more than once (retries, constraint interruptions, reboots). Uploading the same file twice must not create two records.
2. **Check `isStopped`** in long loops, and use `onStopped()` for cleanup.

**The practical caution: more constraints means less certainty.** Requiring charging *and* unmetered network *and* device idle may mean the work doesn't run for days on a phone that's rarely plugged in. Each constraint is a trade of promptness for politeness — add only those the work genuinely needs.

Combine with `setBackoffCriteria` (how `Result.retry()` behaves — exponential or linear, minimum 10 seconds) and `setExpedited` for work that's important enough to run promptly, which asks the system for a quota-limited immediate slot.

## 15. What is Navigation Component?
A framework for navigating between destinations within an app. It handles fragment transactions, back stack management, deep linking, and passing arguments safely.

```kotlin
// Navigating safely with NavDirections
val action = HomeFragmentDirections.actionHomeToDetails(userId = 123)
findNavController().navigate(action)
```

**The three pieces:** a **navigation graph** (an XML resource, or a Kotlin DSL, declaring destinations and the actions between them), a **`NavHost`** (the container that swaps destinations in and out), and a **`NavController`** (the object that performs navigation and owns the back stack).

**What it replaces:** hand-written `FragmentTransaction`s scattered across the codebase, manual `addToBackStack` bookkeeping, `Bundle` keys matched by convention, and bespoke deep-link parsing. It also makes the app's navigation **visible in one file** rather than implied by code spread across twenty Fragments.

```xml
<navigation app:startDestination="@id/homeFragment">
    <fragment android:id="@+id/homeFragment" android:name=".HomeFragment">
        <action android:id="@+id/action_home_to_details"
                app:destination="@id/detailsFragment" />
    </fragment>
    <fragment android:id="@+id/detailsFragment" android:name=".DetailsFragment">
        <argument android:name="userId" app:argType="integer" />
        <deepLink app:uri="example.com/user/{userId}" />
    </fragment>
</navigation>
```

**Features that earn their keep:**

- **Back stack management** — including `popUpTo` and `inclusive` for the standard "clear the stack after login" move, and `launchSingleTop` to stop double taps stacking duplicates.
- **Deep links** — one `<deepLink>` element generates the manifest intent filters and builds a correct synthetic back stack, so pressing Back from a deep link goes somewhere sensible.
- **Safe Args** — type-safe argument passing (question 16).
- **Scoped ViewModels** — each `NavBackStackEntry` is a `ViewModelStoreOwner`, so per-destination ViewModels are automatic, and `navGraphViewModels()` gives you a ViewModel shared across a nested graph.
- **Nested graphs** — a graph per feature, which is how you keep navigation modular in a multi-module app.

```kotlin
findNavController().navigate(R.id.homeFragment) {
    popUpTo(R.id.loginFragment) { inclusive = true }
    launchSingleTop = true
}
```

**The design discipline:** don't pass the `NavController` into Fragments or composables. Expose a callback and let the host navigate, so screens stay testable and reusable.

**Limitations worth acknowledging:** the single-Activity model it encourages is right for most apps but not all; multi-module graphs need care with ID collisions; and conditional navigation ("go to onboarding if not logged in") is awkward in the XML graph and usually ends up handled in code anyway. For Compose, **Navigation Compose** is the same library with a composable-based DSL, now with type-safe routes from `@Serializable` classes.

## 16. What is Safe Args?
A Gradle plugin used with the Navigation Component that generates type-safe classes for passing data between destinations, eliminating the risk of key-value mismatches and `ClassCastException`s.

```kotlin
// Receiving arguments safely
val args: DetailsFragmentArgs by navArgs()
val userId = args.userId
```

**The problem it removes.** `Bundle`-based argument passing is stringly-typed and silently wrong when it breaks:

```kotlin
// Sender
bundle.putInt("userId", 123)
// Receiver — typo, wrong type, or a renamed key
val id = arguments?.getString("user_id")    // null at runtime, no compile error
```

Rename the key on one side and nothing complains until a user hits that screen. Safe Args turns all of this into compile-time checks.

**What the plugin generates**, from the `<argument>` declarations in your graph:

- **A `Directions` class per destination that has actions** — `HomeFragmentDirections.actionHomeToDetails(userId = 123)`. The arguments are **required constructor parameters**, so forgetting one is a compile error.
- **An `Args` class per destination that takes arguments** — `DetailsFragmentArgs`, retrieved with `by navArgs()`, with correctly typed properties.

```groovy
plugins { id 'androidx.navigation.safeargs.kotlin' }
```

```xml
<argument
    android:name="userId"
    app:argType="integer" />
<argument
    android:name="filter"
    app:argType="string"
    android:defaultValue="all"
    app:nullable="true" />
```

**Supported types:** primitives, `String`, enums, arrays, and any `Parcelable` or `Serializable` — the last of which covers your own model classes via `@Parcelize`. Note that `app:nullable="true"` is only valid for reference types, and a nullable argument needs a default value.

**The guidance that matters more than the mechanics: pass IDs, not objects.** Safe Args *lets* you pass a `Parcelable` user object, but you usually shouldn't — the data gets stale, it inflates the saved state bundle (which is subject to the Binder transaction limit), and it duplicates your source of truth. Pass `userId` and let the destination's ViewModel load the current data from the repository.

**One more benefit worth mentioning:** because arguments are declared in the graph, they're also what powers deep links — the same `{userId}` placeholder in a deep link URI is parsed into the typed argument automatically.

In **Navigation Compose**, type-safe routes built from `@Serializable` data classes now serve the same purpose without a Gradle plugin, and are the recommended approach in new Compose code.

## 17. What is Hilt?
A dependency injection library for Android built on top of Dagger. It reduces the boilerplate of manual DI by providing standard containers for Android classes (like `@HiltAndroidApp` and `@AndroidEntryPoint`).

```kotlin
@HiltViewModel
class MyViewModel @Inject constructor(
    private val repository: UserRepository // Automatically injected!
) : ViewModel()
```

**Hilt generates Dagger code** — it is not a separate framework. What it adds is a *standard, Android-shaped component hierarchy*, so every team stops reinventing the same app/activity/fragment subcomponent wiring by hand.

**The component hierarchy mirrors the Android lifecycle**, and bindings are inherited downward:

```
SingletonComponent         (@Singleton)            — Application
└── ActivityRetainedComponent  (@ActivityRetainedScoped)  — survives rotation
    ├── ViewModelComponent     (@ViewModelScoped)
    └── ActivityComponent      (@ActivityScoped)
        └── FragmentComponent  (@FragmentScoped)
            └── ViewComponent  (@ViewScoped)
```

**The pieces you actually write:**

```kotlin
@HiltAndroidApp
class MyApp : Application()                     // 1. the root, once

@Module
@InstallIn(SingletonComponent::class)           // 2. where the bindings live
object NetworkModule {
    @Provides @Singleton
    fun retrofit(): Retrofit = Retrofit.Builder()./* ... */.build()

    @Provides @Singleton
    fun api(retrofit: Retrofit): Api = retrofit.create(Api::class.java)
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepoModule {
    @Binds                                      // 3. interface → implementation
    abstract fun bindUserRepo(impl: UserRepositoryImpl): UserRepository
}

@AndroidEntryPoint                              // 4. injection sites
class MainActivity : AppCompatActivity() {
    @Inject lateinit var analytics: Analytics
}
```

**`@Provides` vs. `@Binds`:** use `@Provides` when you must construct the object (third-party classes, builders); use `@Binds` to map an interface to an implementation you own — it generates less code and is the better default.

**Qualifiers** disambiguate two bindings of the same type, which comes up constantly with dispatchers and base URLs:

```kotlin
@Qualifier annotation class IoDispatcher

@Provides @IoDispatcher
fun io(): CoroutineDispatcher = Dispatchers.IO
```

**Scoping is the part people get wrong.** `@Singleton` on everything causes memory bloat and keeps objects alive forever; no scoping at all means a new instance per injection point, which breaks shared caches. Scope deliberately: `@Singleton` for repositories and clients, `@ViewModelScoped` for things tied to one screen's lifetime, unscoped for cheap stateless objects.

**Testing** is a real strength: `@HiltAndroidTest` plus `@UninstallModules` and `@BindValue` lets you swap a real module for a fake with a couple of annotations, which was multi-class ceremony in plain Dagger.

**The trade-off:** compile-time verification means errors appear at build time rather than runtime (good), but also longer builds and occasionally opaque generated-code errors. Koin trades the opposite way — faster builds, runtime failures.

## 18. What is a Repository Pattern?
An architecture pattern that abstracts the data sources (Network, Database) from the rest of the app. The ViewModel asks the Repository for data, and the Repository decides whether to fetch it from the network or load it from the local cache.

**What the abstraction buys you**, beyond tidiness:

- **The ViewModel stops caring where data comes from.** It calls `repo.getUser(id)` and doesn't know whether that hit the network, a cache, or a database. Swapping Retrofit for Ktor, or adding an offline cache, touches one class.
- **Testability** — a fake repository is a few lines, so ViewModel tests need no network or database.
- **A single source of truth** — the repository decides the caching policy in one place, instead of each ViewModel inventing its own.

**The offline-first pattern is the canonical implementation**, and worth being able to write:

```kotlin
class UserRepository @Inject constructor(
    private val api: UserApi,
    private val dao: UserDao,
    @IoDispatcher private val io: CoroutineDispatcher
) {
    // The database is the single source of truth; the network only updates it.
    fun observeUser(id: String): Flow<User> = dao.observe(id)
        .onStart { refresh(id) }

    private suspend fun refresh(id: String) = withContext(io) {
        try {
            dao.insert(api.fetchUser(id).toEntity())   // UI updates via the Flow
        } catch (e: IOException) {
            /* offline — cached data is still served */
        }
    }
}
```

The important property here: the UI observes **only** the database. A network failure degrades gracefully to cached data instead of showing an error, and a successful fetch updates the UI automatically because Room re-emits.

**Design guidance that distinguishes a considered answer:**

- **Return domain models, not DTOs or entities.** Mapping `UserDto`/`UserEntity` → `User` at the repository boundary stops a backend JSON change from rippling into your UI.
- **One repository per data type, not per screen.** `UserRepository`, `OrderRepository` — not `HomeScreenRepository`.
- **Expose an interface** if you want to swap implementations or fake it in tests; expose the class directly if you don't. Don't create an interface with exactly one implementation out of habit.
- **Handle errors as values** (`Result`, or a sealed type) rather than letting exceptions leak upward unannotated.
- **Repositories are usually `@Singleton`** so caches are shared across screens.

**When it's overkill:** an app with one data source and no caching may not need the layer at all — a DAO injected directly into a ViewModel is honest and simpler. Add the repository when there's a real decision for it to make.

## 19. What is DataStore?
The modern, coroutine-based replacement for `SharedPreferences`. It provides asynchronous, transactional data storage. There are two types: Preferences DataStore (key-value) and Proto DataStore (typed objects).

```kotlin
val Context.dataStore by preferencesDataStore(name = "settings")
```

**What was wrong with `SharedPreferences`** — this is the real content of the question:

- **`apply()` is asynchronous but still blocks on the main thread at certain points**, notably in `Activity.onPause`/`onStop`, where pending writes are flushed synchronously. This is a documented and measurable source of ANRs.
- **`commit()` performs disk I/O on the calling thread** — a main-thread write, straightforwardly.
- **The first `getSharedPreferences` call parses the whole XML file synchronously**, so even reads can block.
- **No error signalling** — a failed write is silent.
- **No transactional consistency** — no way to update several values atomically.
- **No type safety** — stringly-typed keys, and `getString` on an int key throws `ClassCastException`.

**DataStore fixes each of these:** it's fully asynchronous over coroutines, exposes data as a `Flow`, performs writes transactionally, and surfaces errors through the flow rather than swallowing them.

```kotlin
val Context.dataStore by preferencesDataStore(name = "settings")

object Keys { val DARK_MODE = booleanPreferencesKey("dark_mode") }

// Read — a Flow, so the UI reacts to changes automatically
val darkMode: Flow<Boolean> = context.dataStore.data
    .catch { e -> if (e is IOException) emit(emptyPreferences()) else throw e }
    .map { prefs -> prefs[Keys.DARK_MODE] ?: false }

// Write — suspending and transactional
suspend fun setDarkMode(enabled: Boolean) {
    context.dataStore.edit { prefs -> prefs[Keys.DARK_MODE] = enabled }
}
```

That `catch` is not optional in production — a corrupted file surfaces as an `IOException` through the flow, and handling it is how you avoid a crash loop.

**Preferences vs. Proto:**

- **Preferences DataStore** — key-value, like `SharedPreferences`, with no schema. Easy to adopt, but still no compile-time type safety on the *shape* of your data.
- **Proto DataStore** — backed by a protocol buffer schema, giving fully typed objects and compile-time guarantees. More setup (a `.proto` file and a serializer), and the right choice for structured settings.

**Migration from `SharedPreferences`** is built in via `SharedPreferencesMigration`, so adopting it doesn't lose existing user settings.

**What it's not for:** DataStore is for small amounts of data — settings, flags, tokens. It rewrites the whole file on each change, so it is *not* a database. Use Room for collections, queries, or anything substantial.

## 20. What is Paging 3?
A Jetpack library that helps you load and display pages of data from a larger dataset from local storage or over a network. It integrates natively with RecyclerView and Compose, handling memory management and network requests seamlessly.

**The problem:** loading 10,000 items at once is slow, wastes bandwidth, and can exhaust memory. Hand-rolled paging — a scroll listener, a page counter, an `isLoading` flag, and duplicate-request guards — is notoriously bug-prone, especially around configuration changes and fast scrolling.

**What Paging 3 handles for you:** requesting the next page at the right moment, de-duplicating in-flight requests, retaining position across rotation, evicting off-screen pages from memory, exposing load states (loading/error/end-of-list) for header and footer UI, and retrying failures.

**The pieces:**

```kotlin
// 1. PagingSource — knows how to load one page
class UserPagingSource(private val api: Api) : PagingSource<Int, User>() {
    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, User> = try {
        val page = params.key ?: 1
        val response = api.getUsers(page, params.loadSize)
        LoadResult.Page(
            data = response.users,
            prevKey = if (page == 1) null else page - 1,
            nextKey = if (response.users.isEmpty()) null else page + 1
        )
    } catch (e: Exception) { LoadResult.Error(e) }

    override fun getRefreshKey(state: PagingState<Int, User>): Int? = /* ... */ null
}

// 2. Pager in the ViewModel — cachedIn keeps data across config changes
val users: Flow<PagingData<User>> = Pager(PagingConfig(pageSize = 20)) {
    UserPagingSource(api)
}.flow.cachedIn(viewModelScope)
```

```kotlin
// 3. UI
// Views:
val adapter = UserPagingAdapter(DiffCallback)
lifecycleScope.launch { viewModel.users.collectLatest { adapter.submitData(it) } }

// Compose:
val items = viewModel.users.collectAsLazyPagingItems()
LazyColumn {
    items(items.itemCount) { i -> items[i]?.let { UserRow(it) } }
}
```

**`cachedIn(viewModelScope)` is essential** — without it, rotating the screen refetches page one and loses the user's scroll position.

**`RemoteMediator` is the offline-first piece**, and the main thing to mention beyond the basics: it pairs a network source with a Room `PagingSource` so the database is the single source of truth, pages are cached on disk, and the app works offline. `Pager(config, remoteMediator = ...) { dao.pagingSource() }` is the shape.

**Load states** drive your spinners and error UI without manual flags:

```kotlin
adapter.loadStateFlow.collect { state ->
    progressBar.isVisible = state.refresh is LoadState.Loading
    retryButton.isVisible = state.refresh is LoadState.Error
}
```

**Transformations** (`map`, `insertSeparators`, `filter`) operate on `PagingData` — though note that filtering happens *after* loading, so server-side filtering is still preferable.

**When not to use it:** small, bounded lists. For 50 items, Paging adds complexity for no benefit — a plain `ListAdapter` with `DiffUtil` is the right call.

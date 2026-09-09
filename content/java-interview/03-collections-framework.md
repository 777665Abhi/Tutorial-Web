---
title: "Collections Framework"
description: "Lists, Sets, Maps, Queues, and time complexities in Java."
---

## 1. What is the Java Collections Framework?
A unified architecture for representing and manipulating collections (objects that group multiple elements into a single unit). It provides standard Interfaces (`List`, `Set`, `Map`), Implementations (`ArrayList`, `HashSet`), and Algorithms (sorting, searching).

## 2. What is the difference between an Array and an ArrayList?
- **Array**: Fixed size, can hold primitives and objects, extremely fast.
- **ArrayList**: Dynamic size (resizes automatically), can only hold objects (primitives must be boxed), slower than an array due to overhead.

```java
int[] array = new int[5]; // Fixed size
List<Integer> list = new ArrayList<>(); // Dynamic size
list.add(1);
```

## 3. How does `ArrayList` resize itself dynamically?
When an `ArrayList` reaches its capacity (default is 10) and a new element is added, it creates a new internal array that is **1.5 times** the size of the old array. It then uses `Arrays.copyOf()` to copy all existing elements into the new array.

## 4. What is the difference between `ArrayList` and `LinkedList`?
- **ArrayList**: Backed by a dynamic array. Fast random access `O(1)`. Slow insertions/deletions in the middle `O(n)` because elements must be shifted.
- **LinkedList**: Backed by a doubly-linked list. Slow random access `O(n)`. Fast insertions/deletions `O(1)` (if the node reference is known) because only pointers change.

## 5. What is the difference between `HashSet` and `TreeSet`?
- **HashSet**: Backed by a Hash Table. Does not maintain any order. `O(1)` time complexity for add, remove, and contains. Allows one `null` value.
- **TreeSet**: Backed by a Red-Black Tree. Maintains ascending sorted order. `O(log n)` time complexity for operations. Does not allow `null` values.

```java
Set<String> hash = new HashSet<>(); // Unordered
Set<String> tree = new TreeSet<>(); // Alphabetical order
```

## 6. How does a `HashSet` work internally?
`HashSet` is internally backed by a `HashMap`. When you add a value to a `HashSet`, it acts as the **Key** in the underlying `HashMap`, and a dummy constant object (called `PRESENT`) is used as the **Value**.

```java
// Simplified internal logic of HashSet.add()
public boolean add(E e) {
    return map.put(e, PRESENT) == null;
}
```

## 7. What is the difference between `HashMap` and `ConcurrentHashMap`?
- **HashMap**: Not thread-safe. High performance in single-threaded environments. Can throw `ConcurrentModificationException` if modified while iterating.
- **ConcurrentHashMap**: Thread-safe. It divides the map into segments (or buckets) and locks only the specific bucket being updated, allowing multiple threads to read/write concurrently without locking the entire map (unlike `HashTable`).

## 8. How does a `HashMap` work internally?
It stores elements in an array of "Buckets" (Nodes).
1. It calls `hashCode()` on the Key to calculate the array index.
2. If the bucket is empty, it places the Node there.
3. If a collision occurs (two keys have the same hash), it stores them in a Linked List at that bucket.
4. If the Linked List grows beyond 8 elements, Java 8 converts it into a Balanced Red-Black Tree to improve lookup time from `O(n)` to `O(log n)`.

## 9. What is the significance of `hashCode()` and `equals()` in HashMap?
- `hashCode()` determines which bucket (array index) the key-value pair will be stored in.
- `equals()` is used during a collision to traverse the linked list/tree in that bucket and find the exact matching key.
If you override `equals()`, you **must** override `hashCode()` to maintain the contract that equal objects must have equal hash codes.

```java
@Override
public int hashCode() {
    return Objects.hash(id, name); // Standard way to hash
}
```

## 10. What is a `PriorityQueue`?
A queue where elements are ordered based on their natural ordering (or a custom `Comparator`). It is implemented internally as a Min-Heap by default. The element with the highest priority (smallest value) is always at the head.

```java
Queue<Integer> pq = new PriorityQueue<>();
pq.add(10); pq.add(5);
System.out.println(pq.poll()); // Prints 5
```

## 11. What is the difference between `Iterator` and `ListIterator`?
- **Iterator**: Can be used for any collection (Set, List, Map). Traverses only in the forward direction.
- **ListIterator**: Can only be used for `List`s. Can traverse in both forward and backward directions (using `previous()`). Allows adding and replacing elements during iteration.

## 12. What is the `Comparable` interface?
It defines the **natural ordering** of a class. The class itself must implement `Comparable<T>` and override the `compareTo(T obj)` method. (e.g., String and Integer implement this by default).

```java
class User implements Comparable<User> {
    int age;
    public int compareTo(User other) {
        return this.age - other.age; // Sort by age
    }
}
```

## 13. What is the `Comparator` interface?
It is used to define **custom ordering** outside the class. You create a separate class (or a Lambda) that implements `Comparator<T>` and overrides the `compare(T obj1, T obj2)` method. Useful when you can't modify the source class or need multiple sorting logic.

```java
List<String> names = Arrays.asList("Alice", "Bob");
names.sort((s1, s2) -> s2.compareTo(s1)); // Reverse alphabetical
```

## 14. What happens if you add a duplicate key to a HashMap?
The `HashMap` does not throw an error. It overwrites the existing value associated with that key and returns the old value.

```java
Map<String, String> map = new HashMap<>();
map.put("A", "One");
map.put("A", "Two"); // Overwrites "One"
```

## 15. What is the Load Factor in HashMap?
The load factor (default is 0.75) determines when the `HashMap` should resize itself. When the number of elements exceeds `(Capacity * Load Factor)`, the map doubles its capacity and rehashes all elements.

## 16. What is `Collections.unmodifiableList()`?
A utility method that returns a read-only view of a specified list. Any attempt to modify the returned list (e.g., `add()`, `remove()`) will result in an `UnsupportedOperationException`.

```java
List<String> readOnly = Collections.unmodifiableList(originalList);
```

## 17. What is a `LinkedHashMap`?
A subclass of `HashMap` that maintains a doubly-linked list running through all its entries. This allows it to maintain the **insertion order** of elements, which a standard `HashMap` does not guarantee.

## 18. What is `IdentityHashMap`?
A special map implementation where keys are compared using reference equality (`==`) instead of object equality (`equals()`). Two keys are considered equal only if they are the exact same object in memory.

## 19. What is a `CopyOnWriteArrayList`?
A thread-safe variant of `ArrayList`. All mutative operations (`add`, `set`, etc.) are implemented by making a fresh copy of the underlying array. It is highly efficient for lists where reads vastly outnumber writes (like UI listeners).

## 20. Why Map doesn't extend the Collection interface?
The `Collection` interface assumes that elements are single values (Objects). A `Map` represents a collection of Key-Value pairs. Providing methods like `add(Object o)` or `iterator()` doesn't make sense for a `Map` without specifying whether you are interacting with keys, values, or entries.

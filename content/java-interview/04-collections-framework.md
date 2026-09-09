---
title: "Collections Framework"
description: "Master Lists, Sets, Maps, sorting algorithms, and data structures in Java."
---

## 1. What is the Collections Framework?
A unified architecture for representing and manipulating collections of objects (like Lists, Sets, and Maps). It provides ready-to-use data structures and algorithms, reducing programming effort.

## 2. What is the difference between `List`, `Set`, and `Map`?
- **`List`**: An ordered collection that allows duplicates (e.g., `ArrayList`).
- **`Set`**: An unordered collection that does not allow duplicates (e.g., `HashSet`).
- **`Map`**: A collection of key-value pairs where keys must be unique (e.g., `HashMap`). Note: Map does not implement the `Collection` interface.

## 3. What is the difference between `ArrayList` and `LinkedList`?
- **`ArrayList`**: Backed by a dynamic array. Fast for retrieving elements (`O(1)`), but slow for insertions/deletions in the middle (`O(n)`) because elements must be shifted.
- **`LinkedList`**: Backed by a doubly-linked list. Fast for insertions/deletions (`O(1)`), but slow for retrieval (`O(n)`) as it must traverse nodes.

## 4. How does a `HashMap` work internally?
It uses a concept called Hashing. It stores entries in an array of nodes (buckets). The key's `hashCode()` determines the array index. If multiple keys hash to the same index (collision), they are stored in a Linked List (or a Balanced Tree in Java 8+) at that bucket.

## 5. What happens if two keys have the same `hashCode` in a `HashMap`?
This is a hash collision. The entries are stored in the same bucket using a Linked List. When retrieving (`get(key)`), the HashMap traverses the list and uses the `.equals()` method to find the exact matching key.

## 6. What is the difference between `HashMap` and `HashTable`?
- `HashMap`: Not synchronized (not thread-safe), allows one `null` key and multiple `null` values, faster.
- `HashTable`: Synchronized (thread-safe), does not allow `null` keys or values, slower due to locking overhead.

## 7. What is a `ConcurrentHashMap`?
A thread-safe alternative to `HashMap` that performs better than `HashTable`. It uses lock stripping—instead of locking the entire map, it only locks the specific bucket (or segment) being modified, allowing multiple threads to read/write simultaneously.

## 8. What is the difference between `HashSet` and `TreeSet`?
- **`HashSet`**: Backed by a HashMap. Elements are unordered, insertion/retrieval is `O(1)`. Allows `null`.
- **`TreeSet`**: Backed by a TreeMap. Elements are automatically sorted in natural order (or by a custom Comparator). Insertion/retrieval is `O(log n)`. Does not allow `null`.

## 9. What is the contract between `hashCode()` and `equals()`?
If two objects are equal according to `.equals()`, they **must** return the same `hashCode()`. If two objects have the same `hashCode()`, they are not necessarily equal (a collision).

## 10. Why must you override `hashCode()` if you override `equals()`?
If you don't, two objects that are logically equal might have different hash codes. If you use them as keys in a `HashSet` or `HashMap`, the collection won't recognize them as duplicates, breaking the collection's behavior.

## 11. What is the difference between `Comparable` and `Comparator`?
- **`Comparable`**: Modifies the class itself (`implements Comparable<T>`) to define its *natural sorting order* by overriding `compareTo()`.
- **`Comparator`**: An external class/interface used to define *multiple custom sorting orders* by overriding `compare()`, without modifying the original class.

## 12. What is an `Iterator` vs `ListIterator`?
- `Iterator`: Can traverse any Collection. Only goes forward, can remove elements.
- `ListIterator`: Can only traverse a `List`. Goes forward and backward, can add/remove/replace elements, and can get current indexes.

## 13. What is a `PriorityQueue`?
A queue where elements are ordered based on their priority (natural ordering or a Comparator) rather than First-In-First-Out (FIFO). The highest priority element is always at the head.

## 14. How do you make a Collection thread-safe?
You can use `Collections.synchronizedList(list)`, `Collections.synchronizedMap(map)`, etc. However, using concurrent collections like `CopyOnWriteArrayList` or `ConcurrentHashMap` is preferred for better performance.

## 15. What is `CopyOnWriteArrayList`?
A thread-safe variant of `ArrayList`. Instead of locking during writes, it creates a fresh copy of the underlying array for every write operation. It is extremely fast for iterating but slow for modifications.

## 16. What is the default capacity of an `ArrayList` and when does it resize?
Default capacity is 10. When it fills up, it automatically creates a new array that is 1.5 times the size of the old array, and copies the old elements over.

## 17. Can a `TreeSet` store null elements?
No. Since `TreeSet` sorts elements, it calls `.compareTo()` on them. Passing `null` will throw a `NullPointerException`.

## 18. What is the load factor of a `HashMap`?
The default load factor is 0.75. This means when the map is 75% full, it automatically resizes (doubles the bucket array size) and rehashes all elements to maintain `O(1)` performance.

## 19. What is `IdentityHashMap`?
A special Map that uses reference equality (`==`) instead of object equality (`equals()`) when comparing keys. It is rarely used outside of framework topology serialization.

## 20. What is `LinkedHashMap`?
It is exactly like a `HashMap` but it maintains a doubly-linked list running through all its entries, preserving the insertion order. It is useful for creating LRU (Least Recently Used) caches.

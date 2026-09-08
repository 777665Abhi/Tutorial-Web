---
title: "Data Structures"
description: "Lists, Tuples, Sets, Dictionaries, and Comprehensions."
---

## 1. What is a List?
A list is a mutable, ordered sequence of elements. Elements can be of mixed types, and lists can dynamically grow or shrink.

```python
my_list = [1, "two", 3.0]
my_list.append(4)
```

## 2. What is a Tuple?
A tuple is an **immutable**, ordered sequence of elements. Once created, its contents cannot be changed (no append, remove, or reassignment). Tuples are faster and consume less memory than lists.

```python
my_tuple = (1, 2, 3)
# my_tuple[0] = 5 # Raises TypeError
```

## 3. What is a Set?
A set is a mutable, **unordered** collection of **unique** elements. It is implemented using a hash table, meaning checking for membership (`in`) is extremely fast O(1).

```python
my_set = {1, 2, 3, 3, 3}
print(my_set) # {1, 2, 3}
```

## 4. What is a Dictionary?
A dictionary is a mutable, ordered (since Python 3.7) collection of **Key-Value pairs**. Keys must be immutable types (strings, numbers, tuples) and unique.

```python
my_dict = {"name": "Alice", "age": 25}
print(my_dict["name"]) # "Alice"
```

## 5. What are List Comprehensions?
A concise, readable way to create lists. It consists of brackets containing an expression followed by a `for` clause, and optionally `if` clauses.

```python
# Create a list of squares for even numbers from 0 to 9
squares = [x**2 for x in range(10) if x % 2 == 0]
```

## 6. How does a Dictionary Comprehension work?
Similar to list comprehensions, but uses curly braces `{}` and creates key-value pairs.

```python
# Create a dictionary mapping numbers to their squares
squares_dict = {x: x**2 for x in range(5)}
```

## 7. What is the difference between `remove()`, `pop()`, and `del` in lists?
- `remove(value)`: Removes the *first occurrence* of the specified value. Error if not found.
- `pop(index)`: Removes and *returns* the element at the specified index. Defaults to the last element.
- `del list[index]`: Deletes the element at the index. Does not return it. Can also delete slices or entire variables.

## 8. What is slicing in Python?
A feature that allows you to extract parts of a sequence (List, String, Tuple). Syntax: `sequence[start:stop:step]`.

```python
text = "Python"
print(text[0:4])   # "Pyth"
print(text[::-1])  # "nohtyP" (reverses the string)
```

## 9. Can a List be used as a Dictionary key?
No. Dictionary keys must be **hashable** (immutable). Because a list is mutable, its hash value would change if its contents changed, making it impossible to reliably find the value later. Use a Tuple instead.

## 10. What is the difference between `append()` and `extend()`?
- `append(item)`: Adds the item as a *single element* to the end of the list.
- `extend(iterable)`: Iterates over the iterable and adds *each element* to the end of the list.

```python
lst = [1, 2]
lst.append([3, 4]) # [1, 2, [3, 4]]
lst.extend([5, 6]) # [1, 2, [3, 4], 5, 6]
```

## 11. How do you merge two dictionaries?
In Python 3.9+, use the `|` (union) operator or the `|=` (update) operator. In older versions, use the unpack operator `**` or the `.update()` method.

```python
dict1 = {'a': 1}
dict2 = {'b': 2}
merged = dict1 | dict2 # Python 3.9+
# OR merged = {**dict1, **dict2}
```

## 12. What is `collections.defaultdict`?
A subclass of dictionary that provides a default value for a nonexistent key, preventing a `KeyError`.

```python
from collections import defaultdict
d = defaultdict(int) # Default value for int is 0
d['missing_key'] += 1
print(d['missing_key']) # 1
```

## 13. What is `collections.Counter`?
A dictionary subclass designed specifically for counting hashable objects. It returns a dictionary where elements are keys and their counts are values.

```python
from collections import Counter
counts = Counter(['apple', 'apple', 'banana'])
print(counts) # Counter({'apple': 2, 'banana': 1})
```

## 14. What is a `namedtuple`?
A factory function for creating tuple subclasses with named fields. It makes tuples much more readable by allowing attribute access instead of just index access.

```python
from collections import namedtuple
Point = namedtuple('Point', ['x', 'y'])
p = Point(10, 20)
print(p.x) # 10
```

## 15. How does Python implement a Dictionary?
Dictionaries are implemented as Hash Tables. Python uses the `hash()` function on the key to calculate an index in an underlying array. In modern Python, it uses two arrays (one for indices, one for key-value entries) to maintain insertion order and save memory.

## 16. What is the difference between a Shallow Copy and a Deep Copy?
- **Shallow Copy** (`copy.copy()`): Creates a new object, but inserts *references* to the items found in the original. If you modify a nested object, the change is reflected in both.
- **Deep Copy** (`copy.deepcopy()`): Creates a new object and recursively inserts *copies* of the items found in the original. Fully independent.

## 17. How do you sort a dictionary by its values?
You use the `sorted()` function and pass a lambda function as the `key` argument telling it to sort based on the dictionary's values.

```python
d = {'a': 3, 'b': 1, 'c': 2}
sorted_d = dict(sorted(d.items(), key=lambda item: item[1]))
```

## 18. What happens if you add an element to a tuple?
You cannot add an element to a tuple because it is immutable. Attempting to do so will result in an `AttributeError`. You must create a new tuple by concatenating the old one with a new element.

## 19. What is the difference between `discard()` and `remove()` in Sets?
Both remove an element from a set. However, if the element does not exist:
- `remove()` raises a `KeyError`.
- `discard()` does nothing (fails silently).

## 20. What is an `OrderedDict`?
Before Python 3.7, standard dictionaries did not guarantee insertion order. `collections.OrderedDict` was used to remember the order keys were inserted. While less necessary now, `OrderedDict` still has features standard dicts lack, like `move_to_end()`.

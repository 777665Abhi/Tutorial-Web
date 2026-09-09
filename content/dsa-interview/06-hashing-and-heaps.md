---
title: "Hashing & Heaps"
description: "Hash Maps, Collision resolution, Priority Queues, and Top-K problems."
---

## 1. What is a Hash Table?
A data structure that implements an associative array (Key-Value pairs). It uses a **Hash Function** to compute an index into an array of buckets, where the desired value can be found. It provides average `O(1)` time complexity for insertions, deletions, and lookups.

## 2. What is a Hash Function?
A function that takes an input (the Key) and returns an integer (the Hash Code). This integer is then mapped to an array index (usually via modulo operation: `index = hash_code % array_length`). A good hash function distributes keys uniformly across the array to minimize collisions.

## 3. What is a Collision?
A collision occurs when two different keys generate the exact same array index. Since the index is already occupied, the Hash Table must have a strategy to handle the clash.

## 4. How do you resolve Hash Collisions?
1. **Separate Chaining (Open Hashing)**: Each bucket in the array holds a Linked List (or a Binary Tree). If a collision occurs, the new key-value pair is simply appended to the list at that bucket. (Standard in Java/Python).
2. **Open Addressing (Closed Hashing)**: If a collision occurs, find the next available empty slot in the array using techniques like Linear Probing, Quadratic Probing, or Double Hashing.

## 5. What is the Load Factor?
The ratio of the number of elements in the hash table to the total size of the array. When the load factor exceeds a certain threshold (e.g., 0.75 in Java), the hash table automatically resizes (usually doubling its capacity) and rehashes all elements to maintain `O(1)` performance.

## 6. How do you find the first non-repeating character in a string?
Iterate through the string and use a Hash Map to count the frequencies of each character `O(N)`. Then, iterate through the string a second time; the first character whose frequency is 1 is the answer.

```python
from collections import Counter
def first_uniq_char(s):
    count = Counter(s)
    for i, char in enumerate(s):
        if count[char] == 1: return i
    return -1
```

## 7. How do you group Anagrams together?
Use a Hash Map. The key should be the **sorted version of the string** (or a frequency tuple), and the value should be a list of the original strings. Iterate through the array of words, sort each word to find its key, and append it to the map's list. `O(N * K log K)` where K is the max word length.

## 8. What is the Subarray Sum Equals K problem?
Find the total number of continuous subarrays whose sum equals `K`.
- Use a Hash Map to store the frequencies of all `Prefix Sums` seen so far.
- Iterate through the array, calculating the running sum.
- If `running_sum - K` exists in the Hash Map, it means there is a subarray ending at the current index that sums to K. Add the frequency of that prefix sum to your answer.

## 9. What is a Heap?
A Heap is a specialized Tree-based data structure that satisfies the Heap Property. It is usually implemented as an array.
- **Max-Heap**: The value of a node is greater than or equal to the values of its children. The maximum element is at the root.
- **Min-Heap**: The value of a node is less than or equal to the values of its children. The minimum element is at the root.

## 10. How is a Heap represented as an Array?
For a node at index `i` (0-indexed):
- Left Child is at `2i + 1`
- Right Child is at `2i + 2`
- Parent is at `(i - 1) // 2`

## 11. What are the time complexities of Heap operations?
- `Insert`: `O(log N)` (Add to the end of the array, then "bubble up" to restore the heap property).
- `Extract Max/Min`: `O(log N)` (Swap root with the last element, remove the last element, then "bubble down" the new root).
- `Peek (Find Max/Min)`: `O(1)`.
- `Heapify` (Building a heap from an unsorted array): `O(N)`.

## 12. How do you find the Kth Largest Element in an Array?
- **Sorting**: Sort descending, return the Kth element. `O(N log N)`.
- **Min-Heap**: Maintain a Min-Heap of size `K`. Iterate through the array, pushing elements onto the heap. If the heap size exceeds `K`, pop the root (the smallest element). At the end, the root of the heap is the Kth largest element. `O(N log K)`.
- **Quickselect**: Average `O(N)`, Worst `O(N^2)`.

```python
import heapq
def find_kth_largest(nums, k):
    min_heap = []
    for num in nums:
        heapq.heappush(min_heap, num)
        if len(min_heap) > k:
            heapq.heappop(min_heap)
    return min_heap[0]
```

## 13. What is a Priority Queue?
An abstract data type where elements have a priority. Highest priority elements are served first. A Heap is the most efficient data structure to implement a Priority Queue.

## 14. How do you find the Top K Frequent Elements in an array?
1. Count frequencies using a Hash Map `O(N)`.
2. Push `(frequency, element)` tuples into a Min-Heap of size K. `O(N log K)`.
3. Alternatively, use Bucket Sort: Create an array of lists where the index is the frequency. Iterate from the end of the array to collect the top K elements. `O(N)` time and space.

## 15. How do you Merge K Sorted Lists?
Push the `head` node of each of the K lists into a Min-Heap. The heap will contain `K` elements. Pop the smallest node from the heap, append it to your result list, and if that node has a `next` node, push the `next` node into the heap. Repeat until the heap is empty. `O(N log K)`.

## 16. What is the Median of a Data Stream?
You receive numbers one by one and must return the median at any given time efficiently.
- Use **Two Heaps**: A Max-Heap for the lower half of the numbers, and a Min-Heap for the upper half.
- Balance them so their sizes differ by at most 1.
- The median is either the top of the larger heap, or the average of the tops of both heaps.

## 17. How do you sort an array that is almost sorted (each element is at most K places away from its target position)?
Use a Min-Heap of size `K + 1`. Insert the first `K+1` elements. Then, for the remaining elements, pop the root (this goes into the final sorted array at the current write pointer) and push the next element from the unsorted array. `O(N log K)`.

## 18. What is a Rolling Hash (Rabin-Karp)?
A hash function used in string searching algorithms. Instead of recalculating the hash for an entire substring when the sliding window moves, a rolling hash calculates the new hash in `O(1)` time by subtracting the value of the character that left the window and adding the value of the new character.

## 19. How do you design a system to find the Top K trending keywords on Twitter?
- Use a distributed Hash Map (like Redis/Memcached) to count keyword frequencies.
- Use a Min-Heap of size K to maintain the top keywords.
- For massive scale, use the **Count-Min Sketch** probabilistic data structure to estimate frequencies using fixed memory, or MapReduce for batch processing.

## 20. What is a Bloom Filter?
A space-efficient probabilistic data structure used to test whether an element is a member of a set. 
- **False positives are possible**, but **false negatives are not** (if it says "Not Present", it is 100% not present). 
- It uses multiple hash functions and a bit array. It does not store the actual elements, making it incredibly memory efficient. Heavily used in databases to avoid expensive disk lookups for missing keys.

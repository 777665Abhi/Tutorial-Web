---
title: "Arrays & Strings"
description: "Master two pointers, sliding window, prefix sums, and string manipulation."
---

## 1. What is an Array?
An array is a contiguous block of memory used to store elements of the same data type. It provides `O(1)` time complexity for accessing an element by index, but `O(N)` for insertions and deletions (except at the end).

## 2. What is the Two-Pointer technique?
A pattern used to traverse an array or string using two pointers. Often used on sorted arrays (e.g., finding a target sum using one pointer at the start and one at the end) or for comparing elements from opposite ends (e.g., checking if a string is a palindrome).

```python
# Palindrome Check (Two Pointers)
def is_palindrome(s: str) -> bool:
    left, right = 0, len(s) - 1
    while left < right:
        if s[left] != s[right]: return False
        left += 1
        right -= 1
    return True
```

## 3. How do you find a target sum in a sorted array? (Two-Sum II)
Since the array is sorted, you place a pointer at index 0 (`left`) and the last index (`right`). If the sum of the elements at the pointers is greater than the target, decrement `right`. If it's less, increment `left`. Time complexity: `O(N)`.

```python
def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        curr_sum = nums[left] + nums[right]
        if curr_sum == target: return [left, right]
        elif curr_sum < target: left += 1
        else: right -= 1
    return []
```

## 4. What is the Sliding Window technique?
A pattern used to find subarrays or substrings that satisfy a specific condition. Instead of checking all possible `O(N^2)` subarrays, a "window" of elements is maintained (defined by two pointers). The window expands to the right and shrinks from the left as needed, reducing time complexity to `O(N)`.

## 5. How do you find the maximum sum of a contiguous subarray of size K?
Using a fixed-size sliding window. Calculate the sum of the first `K` elements. Then, slide the window to the right by adding the next element and subtracting the element that left the window.

```python
def max_sum_subarray_size_k(arr, k):
    max_sum, window_sum = 0, sum(arr[:k])
    max_sum = window_sum
    for i in range(k, len(arr)):
        window_sum += arr[i] - arr[i-k]
        max_sum = max(max_sum, window_sum)
    return max_sum
```

## 6. What is a Prefix Sum array?
An array where every element at index `i` is the sum of all elements from index `0` to `i` in the original array. It is used to answer Range Sum Queries (sum between indices `L` and `R`) in `O(1)` time instead of `O(N)`. `Sum(L, R) = Prefix[R] - Prefix[L-1]`.

```python
def prefix_sum(arr):
    pref = [0] * (len(arr) + 1)
    for i in range(len(arr)):
        pref[i+1] = pref[i] + arr[i]
    # Sum from index 2 to 4: pref[5] - pref[2]
    return pref
```

## 7. What is Kadane's Algorithm?
An optimal `O(N)` algorithm to find the maximum sum of a contiguous subarray (Maximum Subarray Problem). The idea is to maintain a running sum. If the running sum becomes negative, it resets to 0 (because a negative sum will only pull down future subarrays).

```python
def max_subarray(nums):
    max_so_far = float('-inf')
    current_max = 0
    for x in nums:
        current_max = max(x, current_max + x)
        max_so_far = max(max_so_far, current_max)
    return max_so_far
```

## 8. How do you check if two strings are Anagrams?
Two strings are anagrams if they contain the exact same characters with the exact same frequencies. 
- Approach 1 (Sort): Sort both strings and compare (`O(N log N)`).
- Approach 2 (Hash Map/Array): Count character frequencies of string A, then decrement frequencies for string B. If all counts are 0, they are anagrams (`O(N)`).

```python
from collections import Counter
def is_anagram(s, t):
    return Counter(s) == Counter(t)
```

## 9. How do you find the longest substring without repeating characters?
Use a dynamic Sliding Window (Two Pointers) and a Hash Set. Expand the `right` pointer, adding characters to the set. If a duplicate is found, increment the `left` pointer and remove characters from the set until the duplicate is gone. Update the max length at each step.

```python
def length_of_longest_substring(s):
    char_set = set()
    left = max_len = 0
    for right in range(len(s)):
        while s[right] in char_set:
            char_set.remove(s[left])
            left += 1
        char_set.add(s[right])
        max_len = max(max_len, right - left + 1)
    return max_len
```

## 10. How do you reverse a string in-place?
Since strings are immutable in languages like Java and Python, you convert them to an array/list of characters first. Then, use the Two-Pointer technique (swap `left` and `right`, move pointers inward) to reverse in `O(N)` time and `O(1)` auxiliary space.

## 11. What is the Boyer-Moore Majority Vote Algorithm?
An `O(N)` time and `O(1)` space algorithm used to find the majority element in an array (an element appearing more than `N/2` times). It maintains a candidate and a count. If count is 0, a new candidate is chosen. Similar candidates increment count, different ones decrement it.

```python
def majority_element(nums):
    candidate, count = None, 0
    for num in nums:
        if count == 0:
            candidate = num
        count += (1 if num == candidate else -1)
    return candidate
```

## 12. How do you find the missing number in an array of 1 to N?
- **Approach 1 (Math)**: Calculate the expected sum using `N*(N+1)/2`, then subtract the actual sum of the array. The difference is the missing number.
- **Approach 2 (XOR)**: XOR all numbers from 1 to N, then XOR with all elements in the array. The duplicate numbers will cancel out, leaving the missing number.

```python
def missing_number(nums):
    expected_sum = len(nums) * (len(nums) + 1) // 2
    return expected_sum - sum(nums)
```

## 13. What is the difference between Subarray, Subsequence, and Subset?
- **Subarray/Substring**: A contiguous part of an array/string (e.g., `[2, 3]` from `[1, 2, 3, 4]`).
- **Subsequence**: A sequence derived by deleting some or no elements without changing the relative order (e.g., `[1, 3]` from `[1, 2, 3]`). Not necessarily contiguous.
- **Subset**: Any combination of elements, regardless of order.

## 14. How do you move all zeros to the end of an array while maintaining relative order?
Use the Two-Pointer technique. A `write` pointer keeps track of where the next non-zero element should go. Iterate through the array; if an element is non-zero, swap it with the element at the `write` pointer and increment `write`.

```python
def move_zeroes(nums):
    write = 0
    for i in range(len(nums)):
        if nums[i] != 0:
            nums[write], nums[i] = nums[i], nums[write]
            write += 1
```

## 15. What is the Dutch National Flag problem (Sort 0s, 1s, and 2s)?
An algorithm by Edsger Dijkstra to sort an array containing only three distinct values in `O(N)` time and `O(1)` space in a single pass. It uses three pointers: `low` (for 0s), `mid` (for 1s), and `high` (for 2s).

## 16. How do you determine if a string has all unique characters?
- **O(N) Time, O(N) Space**: Use a Hash Set. If the character is already in the set, return false.
- **O(N log N) Time, O(1) Space**: Sort the string, then check if adjacent characters are equal.
- **O(N) Time, O(1) Space**: (If lowercase a-z only) Use a bit vector (an integer). Bitwise OR sets the bit for a character. Bitwise AND checks if it's already set.

## 17. How do you compress a string (e.g., "aabcccccaaa" to "a2b1c5a3")?
Iterate through the string maintaining a count of consecutive characters. If the current character differs from the next one, append the character and its count to a `StringBuilder` / Array (for efficiency), then reset the count to 1.

## 18. What is the KMP (Knuth-Morris-Pratt) Algorithm?
A string-searching algorithm that finds occurrences of a "pattern" string within a "text" string in `O(N + M)` time. It achieves this by pre-computing a "Longest Prefix Suffix" (LPS) array, which tells the algorithm how much it can skip backwards when a mismatch occurs, avoiding redundant comparisons.

## 19. How do you find the Longest Palindromic Substring?
- **Expand Around Center**: Iterate through the string, treating each character (and each pair of characters for even-length palindromes) as the center. Expand outwards as long as the characters match. `O(N^2)` time, `O(1)` space.
- Manacher's Algorithm can do this in `O(N)` time, but it is highly complex.

## 20. How do you implement `strStr()` (finding the index of a substring)?
- **Brute Force**: Check every starting position. `O(N*M)`.
- **Rabin-Karp**: Uses a Rolling Hash to compare strings in `O(N+M)` time on average.
- **KMP**: Uses the LPS array for guaranteed `O(N+M)` time.

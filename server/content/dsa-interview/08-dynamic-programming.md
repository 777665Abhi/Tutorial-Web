---
title: "Dynamic Programming"
description: "Memoization, Tabulation, Knapsack, LCS, and Matrix Chain Multiplication."
---

## 1. What is Dynamic Programming (DP)?
An algorithmic technique used to solve complex problems by breaking them down into simpler, overlapping subproblems. It optimizes a plain recursive algorithm by storing the results of subproblems so they do not have to be re-computed.

## 2. What two properties must a problem have to be solved with DP?
1. **Optimal Substructure**: The optimal solution to the main problem can be constructed from the optimal solutions of its subproblems.
2. **Overlapping Subproblems**: The recursive solution computes the exact same subproblems multiple times.

## 3. What is the difference between Memoization and Tabulation?
- **Memoization (Top-Down)**: You write a recursive function and add a cache (hash map or array). Before calculating a subproblem, you check the cache. If it's there, return it. If not, calculate it, store it, and return.
- **Tabulation (Bottom-Up)**: You eliminate recursion entirely. You use iterative loops to fill an array (table), starting from the smallest subproblems (base cases) up to the final answer.

## 4. Which is better: Memoization or Tabulation?
- **Tabulation** is generally better for performance because it completely avoids the overhead of recursive function calls and call stack memory (no StackOverflow risk).
- **Memoization** is sometimes easier to write intuitively. It also only computes subproblems that are strictly necessary, whereas Tabulation computes *every* state up to the target.

## 5. How do you solve the Fibonacci problem using DP?
- **Recursive**: `O(2^N)` time.
- **Memoization**: Cache `fib(n)` in an array. `O(N)` time, `O(N)` space.
- **Tabulation**: Create array `dp`, `dp[0]=0, dp[1]=1`, loop to N. `O(N)` time, `O(N)` space.
- **Space-Optimized Tabulation**: You only need the last two values, not the whole array. `prev1`, `prev2`. `O(N)` time, **`O(1)` space**.

```python
# O(N) Time, O(1) Space
def fib(n):
    if n <= 1: return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b
```

## 6. What is the 0/1 Knapsack Problem?
Given `N` items (each with a weight and a value) and a knapsack with maximum weight capacity `W`, find the maximum total value you can carry. "0/1" means you either take an item completely or leave it (no fractions).

## 7. How do you solve the 0/1 Knapsack Problem?
Use a 2D array `dp[N+1][W+1]`. For each item `i` and weight capacity `w`:
You have two choices:
1. **Exclude** the item: `dp[i-1][w]`
2. **Include** the item (if `weight[i] <= w`): `value[i] + dp[i-1][w - weight[i]]`
Take the maximum of these two choices. Result is at `dp[N][W]`. Time: `O(N*W)`. Space can be optimized to 1D `O(W)`.

## 8. What is the Unbounded Knapsack Problem?
Similar to 0/1 Knapsack, but you have an infinite supply of each item. You can choose the same item multiple times. The famous **Coin Change** problem is a variation of this.

## 9. How do you solve the Coin Change problem (Minimum coins)?
Given an array of coin denominations and a target amount.
Create an array `dp` of size `amount + 1`, initialized to infinity. `dp[0] = 0`.
Loop through each amount from 1 to `amount`. For each amount, loop through all coins.
If `coin <= amount`, `dp[i] = min(dp[i], dp[i - coin] + 1)`.

## 10. What is the Longest Common Subsequence (LCS)?
Given two strings `text1` and `text2`, find the length of their longest common subsequence. A subsequence does not have to be contiguous (e.g., "ace" is a subsequence of "abcde").

## 11. How do you solve the LCS problem?
Use a 2D array `dp[len1+1][len2+1]`.
Iterate through both strings.
- If characters match: `dp[i][j] = 1 + dp[i-1][j-1]` (Diagonal + 1)
- If they don't match, take the max of excluding current char from string 1 or string 2: `dp[i][j] = max(dp[i-1][j], dp[i][j-1])` (Max of Top or Left).

## 12. What is the Longest Increasing Subsequence (LIS)?
Given an integer array, find the length of the longest strictly increasing subsequence.
- **O(N^2) DP**: `dp[i]` stores the LIS ending at index `i`. For each `i`, check all previous `j`. If `nums[i] > nums[j]`, `dp[i] = max(dp[i], dp[j] + 1)`.
- **O(N log N) Binary Search**: Maintain an array of the smallest tail elements for all increasing subsequences of various lengths. Use `bisect` to overwrite elements.

## 13. How do you solve the Climbing Stairs problem?
You are climbing a staircase. It takes `n` steps to reach the top. You can climb 1 or 2 steps at a time. How many distinct ways can you climb to the top?
This is literally the Fibonacci sequence! `dp[i] = dp[i-1] + dp[i-2]`.

## 14. What is the Matrix Chain Multiplication problem?
Given a sequence of matrices, find the most efficient way (minimum scalar multiplications) to multiply them together. Matrix multiplication is associative, so the order of parenthesis matters. `(AB)C` might cost drastically less than `A(BC)`.

## 15. How do you solve Matrix Chain Multiplication?
This uses a specific pattern of DP called **Interval DP** or Partition DP. You use a 2D array `dp[i][j]` representing the min cost to multiply matrices from index `i` to `j`. You iterate through all possible lengths of chains, and for each length, try placing a partition `k` between `i` and `j` to find the minimum cost. `O(N^3)`.

## 16. What is the Edit Distance (Levenshtein Distance) problem?
Given two strings `word1` and `word2`, return the minimum number of operations required to convert `word1` to `word2`. Permitted operations are Insert, Delete, or Replace a character.

## 17. How do you solve Edit Distance?
Use a 2D array `dp[i][j]`.
- If characters match: No operation needed. `dp[i][j] = dp[i-1][j-1]`.
- If no match, take the minimum of three operations + 1:
  1. Insert: `dp[i][j-1]`
  2. Delete: `dp[i-1][j]`
  3. Replace: `dp[i-1][j-1]`

## 18. What is the Maximum Product Subarray problem?
Given an integer array, find a contiguous non-empty subarray that has the largest product.
Because multiplying two negative numbers yields a positive number, you must maintain both a `max_so_far` and a `min_so_far` at each step. If the current number is negative, you swap the `max` and `min` before multiplying.

## 19. What is the Word Break problem?
Given a string `s` and a dictionary of words, return true if `s` can be segmented into a space-separated sequence of dictionary words.
Use a 1D boolean array `dp` where `dp[i]` is True if the string up to index `i` can be segmented. For every index, check all possible previous partition points.

## 20. What is State Machine DP (e.g., Best Time to Buy and Sell Stock)?
Problems where you have distinct "states" (e.g., Holding Stock, Not Holding Stock, Cooldown). Instead of a standard grid, you maintain variables for the max profit possible in each specific state on a given day.
`held[i] = max(held[i-1], not_held[i-1] - price)`
`not_held[i] = max(not_held[i-1], held[i-1] + price)`

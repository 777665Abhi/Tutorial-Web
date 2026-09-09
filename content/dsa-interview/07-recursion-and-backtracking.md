---
title: "Recursion & Backtracking"
description: "The Call Stack, tail recursion, subsets, permutations, and N-Queens."
---

## 1. What is Recursion?
Recursion is a programming technique where a function calls itself in order to solve smaller instances of the same problem. A recursive function must have a **Base Case** (a condition to stop the recursion) and a **Recursive Case** (the part where the function calls itself).

## 2. What happens if a Recursive function lacks a Base Case?
The function will call itself infinitely, causing the call stack to grow until it exceeds the memory limit. The program will crash with a `StackOverflowError` (or `RecursionError` in Python).

## 3. What is the Call Stack?
A stack data structure used by the operating system to manage function calls. Every time a function is called, a new "Stack Frame" (containing local variables, arguments, and return address) is pushed onto the stack. When the function returns, its frame is popped off.

## 4. What is Tail Recursion?
A recursive function is tail-recursive if the recursive call is the absolutely **last operation** performed in the function. In languages that support Tail Call Optimization (like C++ or Scala, but NOT Python or Java), the compiler reuses the current stack frame for the recursive call, preventing Stack Overflows and saving memory.

## 5. What is the time complexity of a basic recursive Fibonacci function?
The naive recursive `fib(n) = fib(n-1) + fib(n-2)` has an exponential time complexity of `O(2^N)`. This is because it recalculates the same subproblems repeatedly (an overlapping subproblems tree).

## 6. How do you convert a Recursive algorithm into an Iterative one?
Any recursive algorithm can be implemented iteratively using an explicit **Stack** data structure to manually simulate the call stack.

## 7. What is Backtracking?
An algorithmic technique used to find all (or some) solutions to a problem by incrementally building candidates. If a candidate is determined to be invalid (it violates constraints), the algorithm abandons it ("backtracks"), undoes the choice, and tries the next option.

## 8. What is a State-Space Tree?
A tree representing all possible states (choices) in a backtracking problem. The root represents the initial state, branches represent choices, and leaves represent final configurations (which may be valid solutions or invalid dead ends).

## 9. How do you generate all Subsets of an array (Power Set)?
Use backtracking. At each step for an element, you have two choices:
1. **Include** the element in the current subset.
2. **Exclude** the element from the current subset.
Time complexity is `O(2^N)` because there are `2^N` possible subsets.

```python
def subsets(nums):
    res = []
    def backtrack(start, path):
        res.append(path[:]) # Append a copy
        for i in range(start, len(nums)):
            path.append(nums[i])      # Choose
            backtrack(i + 1, path)    # Explore
            path.pop()                # Un-choose (Backtrack)
    backtrack(0, [])
    return res
```

## 10. How do you generate all Permutations of an array?
A permutation is a specific arrangement of elements. For `N` elements, there are `N!` permutations.
Iterate through the array. Swap the current element with every other element (or use a `visited` array to pick unused elements), recursively generate permutations for the remaining elements, and then swap back (backtrack). Time complexity: `O(N!)`.

## 11. How do you find all Combinations of K numbers from 1 to N?
Similar to Subsets, but you stop the recursion (base case) when the current subset `path` reaches length `K`. The time complexity is bounded by the binomial coefficient "N choose K".

## 12. How do you solve the N-Queens problem?
The goal is to place N queens on an N×N chessboard so no two queens threaten each other.
- Place a queen in the first row.
- Move to the next row and try placing a queen in each column.
- Before placing, check if the column, positive diagonal, or negative diagonal is already attacked.
- If safe, place the queen and recurse. If it leads to a dead end, remove the queen (backtrack) and try the next column.

## 13. How do you solve a Sudoku puzzle using Backtracking?
1. Find an empty cell. (If none, puzzle solved).
2. Try placing digits 1-9 in that cell.
3. If a digit is valid (not in the same row, col, or 3x3 subgrid), place it and recursively attempt to solve the rest of the board.
4. If it fails later, empty the cell (backtrack) and try the next digit.

## 14. What is the Word Search problem?
Given an `M x N` grid of characters and a target word, find if the word exists via adjacent horizontal or vertical cells.
- Iterate through every cell. If the cell matches the first letter of the word, start a DFS.
- In the DFS, mark the cell as visited (e.g., change it to `#`), recursively check up/down/left/right for the next letter.
- If successful, return True. If not, backtrack (change `#` back to the original letter).

## 15. How do you generate all valid Parentheses combinations for N pairs?
Keep track of the number of `open` and `close` brackets used.
- Base Case: If `open == N` and `close == N`, add the string to results.
- If `open < N`, you can add an `(`.
- If `close < open`, you can add a `)`. (This strictly enforces validity).

## 16. What is the difference between DFS and Backtracking?
They are fundamentally the same mechanism (traversing a state-space tree depth-first). However, "Backtracking" specifically implies **pruning**: recognizing that a branch cannot possibly yield a valid solution and stopping the exploration of that branch early to save time.

## 17. How do you solve the Combination Sum problem?
Given an array of distinct integers and a target sum, return a list of all unique combinations that sum to the target. (The same number may be chosen unlimited times).
- In the backtrack function, keep a running total.
- If `total == target`, add to results. If `total > target`, return (prune).
- Loop through the numbers starting from the *current* index (to avoid duplicate combinations like `[2,3]` and `[3,2]`) and recurse.

## 18. What is the Rat in a Maze problem?
Given a maze represented by a 2D matrix (1 for path, 0 for wall), find a path from `(0,0)` to `(N-1, N-1)`.
- Use DFS. Move U, D, L, R.
- Mark visited cells to avoid infinite loops.
- If you hit a wall or go out of bounds, backtrack.
- Note: BFS is better if you need the *shortest* path, but DFS/Backtracking is fine for finding *any* path.

## 19. How do you split a string into all possible Palindromic Partitions?
- Iterate through the string. Take a prefix substring.
- If the prefix is a palindrome, add it to the current path, and recursively call the function on the remaining suffix of the string.
- When the remaining string is empty, a valid partition sequence has been found. Backtrack to find others.

## 20. Why is Backtracking usually `O(2^N)` or `O(N!)`?
Because it fundamentally attempts to generate and explore every single possible configuration (Brute Force). While pruning helps skip massive chunks of invalid states in practice, the worst-case theoretical complexity remains exponential or factorial.

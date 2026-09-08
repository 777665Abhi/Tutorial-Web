---
title: "Trees & BST"
description: "Binary Trees, traversals, LCA, and self-balancing trees."
---

## 1. What is a Tree in Data Structures?
A non-linear, hierarchical data structure consisting of nodes connected by edges. It has a single root node, and no cycles (loops) exist.

## 2. What is a Binary Tree?
A tree where each node has at most two children, referred to as the left child and the right child.

## 3. What is a Binary Search Tree (BST)?
A Binary Tree that enforces a strict property: for every node, all nodes in its left subtree have values strictly less than the node, and all nodes in its right subtree have values strictly greater than the node.

## 4. What are the time complexities of searching in a BST?
- **Average Case**: `O(log n)` (if the tree is balanced).
- **Worst Case**: `O(n)` (if the tree is skewed, effectively becoming a linked list).

## 5. What are the three types of Depth-First Search (DFS) traversals for trees?
- **Inorder**: Left, Root, Right.
- **Preorder**: Root, Left, Right.
- **Postorder**: Left, Right, Root.

## 6. Which traversal outputs a BST in sorted order?
An Inorder traversal (Left, Root, Right) of a Binary Search Tree will visit the nodes in ascending sorted order.

## 7. What is Level Order Traversal (BFS) in a tree?
Visiting nodes level by level, from top to bottom, left to right. It is implemented using a Queue.

## 8. What is the Height of a tree vs Depth of a node?
- **Height of a tree**: The number of edges on the longest path from the root to a leaf.
- **Depth of a node**: The number of edges from the root to that specific node.

## 9. How do you find the Lowest Common Ancestor (LCA) in a BST?
Start at the root. If both target values are smaller than the root, search left. If both are larger, search right. The first node where one target is smaller and the other is larger (or equals the node) is the LCA.

## 10. How do you find the LCA in a standard Binary Tree?
Use DFS. Return a node if it matches either target. If a node receives non-null returns from BOTH its left and right children, it is the LCA. Otherwise, pass the non-null return value up the call stack.

## 11. What is a Balanced Binary Tree?
A tree where the height of the left and right subtrees of *every* node differ by at most 1. This guarantees `O(log n)` search operations.

## 12. How do you check if a Binary Tree is valid BST?
Use DFS. Keep track of a valid `[min, max]` range for every node. The root starts at `[-infinity, infinity]`. When going left, update the `max` limit. When going right, update the `min` limit.

## 13. What is an AVL Tree?
A self-balancing Binary Search Tree. After every insertion or deletion, it calculates the "balance factor" (height of left subtree - height of right subtree). If it exceeds 1 or -1, it performs Rotations to restore balance.

## 14. What is a Red-Black Tree?
A self-balancing BST used in many standard libraries (like Java's `TreeMap`). It ensures `O(log n)` operations by coloring nodes red or black and enforcing rules that prevent paths from becoming more than twice as long as other paths.

## 15. How do you invert a Binary Tree?
Use recursion or BFS/DFS. For every node, simply swap its left and right child pointers, then recurse on the children. (Famous as the "Homebrew Google interview" question).

## 16. What is a Complete Binary Tree?
A tree where every level, except possibly the last, is completely filled, and all nodes in the last level are as far left as possible. (Used to implement Heaps).

## 17. What is a Full (Strict) Binary Tree?
A tree where every node has either exactly 0 or exactly 2 children. No node has only 1 child.

## 18. What is a Trie (Prefix Tree)?
A tree-like data structure used to store a dynamic set of strings. Each node represents a single character. Excellent for autocomplete features and spell checkers. Search time is `O(L)`, where `L` is the length of the word.

## 19. How do you serialize and deserialize a Binary Tree?
Serialize using Preorder or Level Order traversal, appending a distinct marker (like `null` or `#`) for missing children. Deserialize by parsing the string back using a recursive function or queue.

## 20. What is a Threaded Binary Tree?
A binary tree where null left/right pointers are replaced with "threads" pointing to the node's Inorder predecessor or successor, making Inorder traversal possible without using a stack or recursion.

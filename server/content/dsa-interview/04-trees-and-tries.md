---
title: "Trees & Tries"
description: "Binary Trees, BSTs, Traversals, AVL, Red-Black Trees, and Tries."
---

## 1. What is a Binary Tree?
A hierarchical data structure where each node has at most two children, referred to as the `left` child and the `right` child. The topmost node is the `root`. Nodes with no children are `leaves`.

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

## 2. What is a Binary Search Tree (BST)?
A Binary Tree that satisfies the BST property: For every node `N`, all values in its left subtree are strictly less than `N.value`, and all values in its right subtree are strictly greater than `N.value`. This enables `O(log N)` search times on average.

## 3. Explain the three Depth-First Search (DFS) traversals.
- **In-order** (Left, Root, Right): Returns elements of a BST in sorted, ascending order.
- **Pre-order** (Root, Left, Right): Used to create a copy of the tree or serialize it.
- **Post-order** (Left, Right, Root): Used to delete the tree (children must be deleted before the parent).

```python
def inorder(root):
    if not root: return
    inorder(root.left)
    print(root.val)
    inorder(root.right)
```

## 4. What is Breadth-First Search (BFS) / Level-Order Traversal?
Visiting all nodes at the present depth level before moving on to the nodes at the next depth level. It is implemented using a **Queue**.

```python
from collections import deque
def level_order(root):
    if not root: return []
    q = deque([root])
    res = []
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        res.append(level)
    return res
```

## 5. How do you find the Maximum Depth (Height) of a Binary Tree?
Recursively calculate the height of the left and right subtrees. The height of the current node is `1 + max(left_height, right_height)`.

```python
def max_depth(root):
    if not root: return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))
```

## 6. How do you Invert a Binary Tree?
For every node, swap its left and right child pointers, then recursively call the function on the left and right subtrees.

```python
def invert_tree(root):
    if not root: return None
    root.left, root.right = root.right, root.left
    invert_tree(root.left)
    invert_tree(root.right)
    return root
```

## 7. How do you check if two Binary Trees are Identical?
Recursively check:
1. Both nodes are null (return True).
2. One is null and the other isn't (return False).
3. Values match AND their left subtrees match AND their right subtrees match.

## 8. What is the Lowest Common Ancestor (LCA) in a BST?
Since it's a BST, start at the root. 
- If both target nodes are smaller than the root, go left.
- If both are larger, go right.
- If they split (one is smaller, one is larger), or one matches the root, you have found the LCA. `O(log N)` time.

```python
def lca_bst(root, p, q):
    while root:
        if p.val < root.val and q.val < root.val: root = root.left
        elif p.val > root.val and q.val > root.val: root = root.right
        else: return root
```

## 9. How do you find the Lowest Common Ancestor in a standard Binary Tree?
Recursively search the left and right subtrees.
- If you find node `p` or `q`, return that node.
- If the left and right recursive calls both return a non-null node, the current node is the LCA.
- If only one returns a node, pass that node up.

## 10. How do you check if a Binary Tree is a valid BST?
You must track the `min` and `max` allowable values as you traverse down.
- The root can be anything (`-inf`, `inf`).
- When traversing left, the `max` becomes the parent's value.
- When traversing right, the `min` becomes the parent's value.
If any node violates the bounds, it's invalid.

```python
def is_valid_bst(root, min_val=float('-inf'), max_val=float('inf')):
    if not root: return True
    if not (min_val < root.val < max_val): return False
    return (is_valid_bst(root.left, min_val, root.val) and 
            is_valid_bst(root.right, root.val, max_val))
```

## 11. What is a Balanced Binary Tree?
A binary tree in which the left and right subtrees of *every* node differ in height by no more than 1. This guarantees that operations like search, insert, and delete run in `O(log N)` time. (If unbalanced, it can degrade to a Linked List: `O(N)`).

## 12. What are AVL Trees?
A self-balancing Binary Search Tree. After every insertion or deletion, the tree checks the "Balance Factor" (height of left minus height of right) of every node. If it exceeds 1 or -1, the tree performs "Rotations" (Left, Right, Left-Right, or Right-Left) to restore balance.

## 13. What are Red-Black Trees?
A self-balancing BST used in standard library implementations (like Java's `TreeMap` and `TreeSet`, or C++'s `std::map`). It uses a color bit (red or black) to ensure the tree remains approximately balanced during insertions and deletions. It requires fewer rotations than an AVL tree, making insertions/deletions faster, though searches might be slightly slower.

## 14. How do you Serialize and Deserialize a Binary Tree?
- **Serialize**: Convert the tree to a string using Pre-order traversal. Use a special character (like `N`) to represent null nodes.
- **Deserialize**: Use an iterator on the string. Rebuild the root, recursively rebuild the left subtree, then recursively rebuild the right subtree.

## 15. What is a Trie (Prefix Tree)?
An N-ary tree data structure used specifically for storing strings (usually a dictionary of words). Each node represents a single character. It provides incredibly fast `O(L)` (where L is word length) lookups for word validity and prefix matching (auto-complete).

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end_of_word = False
```

## 16. How do you insert a word into a Trie?
Start at the root. For each character in the word, check if it exists in the current node's `children`. If not, create a new `TrieNode`. Move down to the child node. When the word is finished, mark the final node with `is_end_of_word = true`.

## 17. How do you find the Kth Smallest Element in a BST?
Perform an In-order traversal (which visits elements in ascending order). Keep a counter. When the counter reaches `K`, you have found the target element. `O(N)` time in the worst case, but `O(H + K)` in practice.

## 18. How do you construct a Binary Tree from Preorder and Inorder traversals?
1. The first element in the `Preorder` array is the root.
2. Find this root element in the `Inorder` array. Everything to its left belongs to the left subtree; everything to its right belongs to the right subtree.
3. Recursively repeat this process for the left and right subsets.

## 19. What is a Segment Tree?
A binary tree used for storing intervals or segments. It allows querying which of the stored segments contain a given point (or querying the Sum/Min/Max in an array range) in `O(log N)` time. Updates also take `O(log N)` time.

## 20. What is a Fenwick Tree (Binary Indexed Tree)?
A space-efficient alternative to a Segment Tree for calculating prefix sums and updating elements. It uses bitwise operations to traverse the tree, achieving `O(log N)` for both updates and range sum queries, but is much easier to implement and requires only `O(N)` space.

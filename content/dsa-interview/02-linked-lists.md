---
title: "Linked Lists"
description: "Singly, Doubly, Fast/Slow pointers, Cycle detection, and Reversal."
---

## 1. What is a Linked List?
A linear data structure where elements (Nodes) are not stored in contiguous memory locations. Instead, each Node contains data and a pointer (reference) to the next Node in the sequence. 
- Access by index takes `O(N)` time.
- Insertion/Deletion takes `O(1)` time (if the pointer is already at the correct location).

## 2. What is a Doubly Linked List?
A variation of a Linked List where each Node contains a pointer to the **next** node AND a pointer to the **previous** node. This allows traversal in both directions but requires extra memory per Node.

```python
class DLLNode:
    def __init__(self, val=0, prev=None, next=None):
        self.val = val
        self.prev = prev
        self.next = next
```

## 3. How do you reverse a Singly Linked List?
Iterate through the list, changing the `next` pointer of the current node to point to the `previous` node. You need three pointers: `prev` (starts at null), `curr` (starts at head), and `next_temp` (to temporarily store the next node).

```python
def reverse_list(head):
    prev, curr = None, head
    while curr:
        next_temp = curr.next # Save next
        curr.next = prev      # Reverse pointer
        prev = curr           # Move prev forward
        curr = next_temp      # Move curr forward
    return prev # New head
```

## 4. What is the Fast and Slow Pointer technique (Tortoise and Hare)?
A technique used to find cycles or the middle of a linked list. You use two pointers: a `slow` pointer that moves one step at a time, and a `fast` pointer that moves two steps at a time.

## 5. How do you find the middle of a Linked List in one pass?
Use the Fast and Slow pointer technique. When the `fast` pointer reaches the end of the list (`fast == null` or `fast.next == null`), the `slow` pointer will be exactly at the middle node.

```python
def find_middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow
```

## 6. How do you detect a Cycle (Loop) in a Linked List?
Use Floyd's Cycle-Finding Algorithm (Tortoise and Hare). Move `slow` by 1 and `fast` by 2. If there is a cycle, the `fast` pointer will eventually lap the `slow` pointer, and they will point to the exact same node (`slow == fast`). If `fast` reaches null, there is no cycle. Time: `O(N)`, Space: `O(1)`.

```python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast: return True
    return False
```

## 7. How do you find the starting node of a Cycle in a Linked List?
1. Use Floyd's algorithm to find the intersection point where `slow == fast`.
2. Move the `slow` pointer back to the `head` of the list. Keep `fast` at the intersection.
3. Move both pointers one step at a time. The exact node where they meet again is the start of the cycle.

## 8. How do you merge two sorted Linked Lists?
Use a **Dummy Node** to simplify edge cases. Use a `tail` pointer to build the new list. Compare the heads of both lists, attach the smaller node to `tail.next`, and advance the pointer of the chosen list. Finally, attach any remaining nodes.

```python
def merge_two_lists(l1, l2):
    dummy = ListNode(0)
    tail = dummy
    while l1 and l2:
        if l1.val < l2.val:
            tail.next, l1 = l1, l1.next
        else:
            tail.next, l2 = l2, l2.next
        tail = tail.next
    tail.next = l1 or l2
    return dummy.next
```

## 9. What is a Dummy Node?
A temporary node created at the beginning of a linked list algorithm. It prevents complex `if (head == null)` checks when building a new list or when the actual head of the list might change or be deleted. The final answer is always `dummy.next`.

## 10. How do you remove the Nth node from the end of a Linked List?
Use two pointers (`first` and `second`).
1. Move the `first` pointer exactly `N` steps ahead.
2. Move both pointers one step at a time until `first` reaches the end.
3. The `second` pointer is now right before the node to be deleted. Set `second.next = second.next.next`. (Use a dummy node in case the head needs to be deleted).

## 11. How do you find the intersection point of two Linked Lists?
Let List A have length L1 and List B have length L2.
1. Use two pointers, `ptrA` and `ptrB`.
2. Traverse. When `ptrA` hits the end of A, redirect it to the head of B. When `ptrB` hits the end of B, redirect it to the head of A.
3. They will travel the exact same total distance (L1 + L2) and will collide precisely at the intersection node (or null if they don't intersect). `O(N)` time, `O(1)` space.

```python
def get_intersection_node(headA, headB):
    pA, pB = headA, headB
    while pA != pB:
        pA = headA if pA is None else pA.next
        pB = headB if pB is None else pB.next
    return pA
```

## 12. How do you check if a Linked List is a Palindrome?
1. Find the middle of the list using Fast/Slow pointers.
2. Reverse the second half of the list.
3. Compare the first half and the reversed second half node by node.
4. (Optional) Reverse the second half back to restore the original list.

## 13. How do you add two numbers represented by Linked Lists (e.g., 2->4->3 + 5->6->4)?
The numbers are stored in reverse order (head is the least significant digit). Traverse both lists simultaneously. Add the values of corresponding nodes plus any `carry` from the previous addition. Create a new node for `sum % 10` and update `carry = sum / 10`. Use a Dummy Node.

## 14. What is a Circular Linked List?
A linked list where the last node points back to the first node instead of pointing to `null`. It can be singly or doubly linked. Useful for implementing Round Robin scheduling queues.

## 15. How do you reverse a Linked List in groups of size K?
1. Check if there are at least K nodes remaining. If not, leave them as is.
2. Reverse the next K nodes. (Keep track of the start of this group, which becomes the end after reversal).
3. Recursively (or iteratively) call the function for the rest of the list and attach the result to the end of the newly reversed group.

## 16. What is the difference between Array and Linked List memory allocation?
- **Array**: Allocated as a single, contiguous block of memory at compile time (or dynamically). High cache locality (faster to iterate).
- **Linked List**: Nodes are allocated dynamically in scattered locations on the Heap memory. Poor cache locality. Extra memory overhead is required for the pointers.

## 17. How do you flatten a Multilevel Doubly Linked List?
Iterate through the list. When you encounter a node with a `child` pointer, recursively flatten the child list. Connect the end of the flattened child list to the `current.next` node, and connect the start of the child list to `current`. Set `child` to null.

## 18. How do you copy a Linked List with a Random Pointer?
The list has nodes with a `next` pointer and a `random` pointer.
- **O(N) Space**: Use a Hash Map linking the original node to its clone. Traverse again to assign `next` and `random` pointers using the map.
- **O(1) Space**: Interleave the cloned nodes (`A -> A' -> B -> B'`). Assign random pointers for the clones (`A'.random = A.random.next`). Finally, separate the intertwined list into two lists.

## 19. Can you perform Binary Search on a Linked List?
Not efficiently. Binary search relies on `O(1)` random access to find the middle element instantly. Finding the middle of a linked list takes `O(N)` time. Therefore, binary search on a linked list takes `O(N)` time, which defeats its purpose. (A Skip List solves this).

## 20. What is a Skip List?
A probabilistic data structure built upon multiple layers of linked lists. The bottom layer is a standard sorted linked list. Higher layers act as "express lanes" that skip over elements, allowing for `O(log N)` search, insertion, and deletion times, similar to a balanced binary search tree, but easier to implement.

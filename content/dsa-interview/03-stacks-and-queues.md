---
title: "Stacks & Queues"
description: "LIFO vs FIFO, monotonic stacks, priority queues, and deque applications."
---

## 1. What is a Stack?
A Stack is a linear data structure that follows the **LIFO (Last In, First Out)** principle. The last element added to the stack is the first one to be removed.
- `push()`: Adds an item. `O(1)`
- `pop()`: Removes and returns the top item. `O(1)`
- `peek()`: Returns the top item without removing it. `O(1)`

## 2. What is a Queue?
A Queue is a linear data structure that follows the **FIFO (First In, First Out)** principle. The first element added is the first one to be removed.
- `enqueue()`: Adds an item to the rear. `O(1)`
- `dequeue()`: Removes and returns an item from the front. `O(1)`

## 3. How do you implement a Stack using an Array?
Maintain a `top` variable initialized to `-1`. 
- To `push`, increment `top` and place the element at `array[top]`. (Check for Stack Overflow).
- To `pop`, return `array[top]` and decrement `top`. (Check for Stack Underflow).

## 4. How do you implement a Queue using an Array?
Using a standard array is inefficient because `dequeue` at index 0 requires shifting all elements `O(N)`. 
Instead, use a **Circular Array**. Maintain two pointers: `front` and `rear`. 
- `enqueue`: `rear = (rear + 1) % capacity`.
- `dequeue`: `front = (front + 1) % capacity`.

## 5. How do you implement a Stack using Queues?
You need two queues (`q1` and `q2`).
- **Push O(N)**: Add the new element to `q2`. Dequeue all elements from `q1` and enqueue them into `q2`. Swap the names of `q1` and `q2`.
- **Pop O(1)**: Just dequeue from `q1`.

## 6. How do you implement a Queue using Stacks?
You need two stacks (`inbox` and `outbox`).
- **Enqueue O(1)**: Push elements onto the `inbox`.
- **Dequeue Amortized O(1)**: If `outbox` is empty, pop all elements from `inbox` and push them onto `outbox` (this reverses their order). Then pop from `outbox`.

## 7. How do you validate Balanced Parentheses (e.g., `"{[()]}"`)?
Iterate through the string.
- If it's an opening bracket, `push` it onto a Stack.
- If it's a closing bracket, check if the stack is empty (invalid) or if the `pop`ped item matches the corresponding opening bracket.
- At the end, the stack must be empty to be valid.

```python
def is_valid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top: return False
        else: stack.append(char)
    return not stack
```

## 8. What is a Monotonic Stack?
A stack whose elements are strictly increasing or strictly decreasing. It is used to solve "Next Greater Element" or "Previous Smaller Element" problems in `O(N)` time.

## 9. How do you find the Next Greater Element for each item in an array?
Use a Monotonic Decreasing Stack to store *indices*.
Iterate through the array. While the stack is not empty and the current element is greater than the element at `stack.top()`, it means the current element is the "Next Greater" for the element at `stack.top()`. Pop the stack and record the result. Push the current index onto the stack.

```python
def next_greater_element(nums):
    res = [-1] * len(nums)
    stack = [] # stores indices
    for i in range(len(nums)):
        while stack and nums[i] > nums[stack[-1]]:
            res[stack.pop()] = nums[i]
        stack.append(i)
    return res
```

## 10. How do you find the area of the Largest Rectangle in a Histogram?
Use a Monotonic Increasing Stack to store indices. When you encounter a bar smaller than the `stack.top()`, the `stack.top()` bar cannot extend any further to the right. Pop it, calculate the area using its height and the distance between the current index and the new `stack.top()`, and update the maximum area.

## 11. What is a Deque (Double-Ended Queue)?
A linear data structure where elements can be inserted and deleted from **both ends** (front and rear) in `O(1)` time. It acts as both a Stack and a Queue. Usually implemented with a doubly-linked list.

## 12. How do you find the Sliding Window Maximum?
Use a Deque. As the window slides, remove indices from the front if they are outside the window. Before adding the current element's index to the rear, remove all indices from the rear whose values are smaller than the current element (they are useless now). The maximum for the current window is always at the front of the deque.

```python
from collections import deque
def max_sliding_window(nums, k):
    q = deque() # stores indices
    res = []
    for i, num in enumerate(nums):
        while q and q[0] < i - k + 1: q.popleft() # remove out of bounds
        while q and nums[q[-1]] < num: q.pop() # remove smaller elements
        q.append(i)
        if i >= k - 1: res.append(nums[q[0]])
    return res
```

## 13. What is a Priority Queue?
An abstract data type similar to a queue, but each element has a "priority" associated with it. Elements are dequeued in order of their priority (highest priority first), regardless of when they were enqueued.

## 14. How is a Priority Queue implemented?
It is almost always implemented using a **Heap** data structure (specifically a Binary Min-Heap or Max-Heap), which provides `O(log N)` for insertion and deletion, and `O(1)` for getting the highest priority element.

## 15. Design a Stack that supports `push`, `pop`, `top`, and `getMin` all in O(1) time. (Min Stack)
Maintain two stacks: `main_stack` and `min_stack`.
- **Push(x)**: Push `x` to `main_stack`. Push `min(x, min_stack.top())` to `min_stack`.
- **Pop()**: Pop from both stacks.
- **getMin()**: Return `min_stack.top()`.

```python
class MinStack:
    def __init__(self):
        self.stack = []
        self.min_stack = []

    def push(self, val: int) -> None:
        self.stack.append(val)
        val = min(val, self.min_stack[-1] if self.min_stack else val)
        self.min_stack.append(val)

    def pop(self) -> None:
        self.stack.pop()
        self.min_stack.pop()

    def getMin(self) -> int:
        return self.min_stack[-1]
```

## 16. How do you evaluate a Postfix Expression (Reverse Polish Notation)?
Iterate through the expression.
- If it's a number, `push` it onto the stack.
- If it's an operator, `pop` the top two numbers from the stack, apply the operator, and `push` the result back onto the stack.
- The final result is the only item left on the stack.

## 17. How do you convert an Infix Expression to a Postfix Expression?
Use a Stack to hold operators. Iterate through the Infix string:
- Operands go straight to the output.
- Left parenthesis goes to the stack.
- Right parenthesis pops operators to the output until a left parenthesis is found.
- Operators pop higher or equal precedence operators to the output before being pushed themselves.

## 18. What is a Circular Queue?
A linear queue where the last position is connected back to the first position, making a circle. It solves the problem in a standard array-based queue where empty spaces at the beginning (due to dequeues) cannot be reused without shifting elements.

## 19. How do you implement a LRU (Least Recently Used) Cache?
Combine a **Hash Map** (for `O(1)` access to nodes) and a **Doubly Linked List** (to maintain ordering).
- Most recently used nodes are moved to the `head`.
- Least recently used nodes are at the `tail`.
- When capacity is reached, remove the `tail` node and delete it from the Hash Map.

## 20. What is a LFU (Least Frequently Used) Cache?
A cache eviction policy where the item with the lowest frequency of access is removed first. If frequencies are tied, the least recently used among them is removed. It is much more complex to implement than LRU, typically requiring two Hash Maps (one for Key -> Node, one for Frequency -> Doubly Linked List of Nodes).

---
title: "Graphs"
description: "DFS, BFS, Dijkstra's, Topological Sort, and MST algorithms."
---

## 1. What is a Graph?
A data structure consisting of Nodes (Vertices) connected by Edges. Used to represent networks (social networks, roads, the internet).
- **Directed**: Edges have a direction (A -> B).
- **Undirected**: Edges go both ways (A <-> B).
- **Weighted**: Edges have a cost or distance associated with them.

## 2. How do you represent a Graph in code?
1. **Adjacency Matrix**: A 2D array where `matrix[i][j] = 1` if an edge exists between `i` and `j`. `O(V^2)` space. Good for dense graphs.
2. **Adjacency List**: An array (or dictionary) of lists, where `list[i]` contains all neighbors of node `i`. `O(V + E)` space. Good for sparse graphs (most common).

```python
# Adjacency List representation
graph = {
    'A': ['B', 'C'],
    'B': ['A', 'D'],
    'C': ['A'],
    'D': ['B']
}
```

## 3. What is Breadth-First Search (BFS) in a Graph?
Explores the graph level by level, radiating outwards from the starting node. It uses a **Queue**. Crucial for finding the **Shortest Path** in an unweighted graph. You must keep track of `visited` nodes to avoid infinite loops in cyclic graphs.

```python
from collections import deque
def bfs(graph, start):
    visited = set([start])
    queue = deque([start])
    while queue:
        node = queue.popleft()
        print(node) # Process node
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
```

## 4. What is Depth-First Search (DFS) in a Graph?
Explores as deep as possible along each branch before backtracking. It uses a **Stack** (usually the implicit call stack via recursion). Good for detecting cycles or finding a path through a maze.

```python
def dfs(graph, node, visited=None):
    if visited is None: visited = set()
    if node not in visited:
        visited.add(node)
        print(node) # Process node
        for neighbor in graph[node]:
            dfs(graph, neighbor, visited)
```

## 5. How do you detect a Cycle in a Directed Graph?
Use DFS with a `visiting` set (nodes currently in the recursion stack) and a `visited` set (nodes fully processed). If you encounter a neighbor that is already in the `visiting` set, a cycle (back edge) exists.

## 6. How do you detect a Cycle in an Undirected Graph?
Use DFS or BFS. Keep track of the `parent` node that discovered the current node. If you encounter an already `visited` neighbor that is NOT the `parent`, a cycle exists.
Alternatively, use the **Union-Find** (Disjoint Set) data structure.

## 7. What is Topological Sorting?
An ordering of nodes in a Directed Acyclic Graph (DAG) such that for every directed edge `U -> V`, node `U` comes before `V` in the ordering. Used for scheduling jobs with dependencies (like compiling code or taking university courses).

## 8. How do you implement Topological Sort (Kahn's Algorithm)?
1. Calculate the **in-degree** (number of incoming edges) for all nodes.
2. Push all nodes with in-degree `0` into a Queue.
3. While the Queue is not empty: pop a node, add it to the result list, and decrement the in-degree of all its neighbors. If a neighbor's in-degree hits `0`, push it to the Queue.
4. If the result list length equals the total nodes, sorting is successful. Otherwise, a cycle exists.

## 9. What is Dijkstra's Algorithm?
Finds the shortest path from a starting node to all other nodes in a **Weighted Graph**. It uses a **Priority Queue (Min-Heap)**.
1. Set distances to all nodes to infinity, start node to 0.
2. Push `(0, start)` into the PQ.
3. Pop the node with the minimum distance.
4. Update the distances of its neighbors. If a shorter path is found, push the updated distance and neighbor into the PQ.
*Limitation: Does not work with negative edge weights.*

## 10. What is the Bellman-Ford Algorithm?
Finds the shortest path in a weighted graph, similar to Dijkstra's, but it **can handle negative edge weights**. It works by "relaxing" all edges `V-1` times. If it relaxes an edge on the `V`th iteration, it successfully detects a **Negative Weight Cycle**. Time complexity: `O(V * E)`.

## 11. What is the Floyd-Warshall Algorithm?
Finds the shortest paths between **All Pairs** of nodes in a weighted graph. It uses dynamic programming and three nested loops to check if going through an intermediate node `k` provides a shorter path between `i` and `j`. Time complexity: `O(V^3)`.

## 12. What is a Minimum Spanning Tree (MST)?
A subset of edges in a connected, weighted, undirected graph that connects all the vertices together without any cycles, while minimizing the total possible edge weight.

## 13. What is Prim's Algorithm?
An algorithm to find the MST. It starts with a single node and eagerly grows the tree by adding the cheapest edge from the tree to a node not yet in the tree, using a Priority Queue. Similar to Dijkstra's, but the PQ stores edge weights instead of path distances.

## 14. What is Kruskal's Algorithm?
An algorithm to find the MST. It sorts all edges in the graph in ascending order of their weight. It iterates through the sorted edges and adds them to the MST as long as they do not form a cycle. It relies heavily on the **Union-Find** data structure to detect cycles efficiently.

## 15. What is the Union-Find (Disjoint Set) data structure?
A data structure that keeps track of elements partitioned into non-overlapping sets. It supports two operations in near `O(1)` time (Amortized):
- `Find(A)`: Determines which set element `A` belongs to.
- `Union(A, B)`: Merges the set containing `A` with the set containing `B`.

## 16. What are Path Compression and Union by Rank?
Optimizations for the Union-Find data structure.
- **Path Compression**: During a `Find` operation, make every node on the path point directly to the root, flattening the tree.
- **Union by Rank**: During a `Union` operation, attach the shorter tree under the root of the taller tree to keep the overall height minimal.

## 17. How do you find the Number of Connected Components in an Undirected Graph?
Iterate through all nodes. If a node is not visited, increment a `components_count` and launch a DFS/BFS from that node to mark all connected nodes as visited. Alternatively, use Union-Find.

## 18. What is a Bipartite Graph?
A graph whose vertices can be divided into two disjoint sets such that every edge connects a vertex in the first set to one in the second set (i.e., no two nodes in the same set are connected).

## 19. How do you check if a Graph is Bipartite?
Use Graph Coloring (DFS or BFS). Try to color the graph using two colors. Start by coloring a node Red, then color all its neighbors Blue, then their neighbors Red. If you ever encounter a neighbor that is already colored with the *same* color as the current node, the graph is not Bipartite.

## 20. How do you solve a Maze or Grid traversal problem?
A grid is just an implicit graph where `matrix[r][c]` is a node, and its neighbors are up, down, left, right. 
- Use **BFS** to find the shortest path from start to finish.
- Use **DFS** to explore islands (e.g., "Number of Islands" problem) and overwrite visited cells with a different value (like `'0'`) to save space instead of using a `visited` set.

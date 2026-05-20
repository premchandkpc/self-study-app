export const GRAPH_CONCEPTS = [
  { title: 'Graph Representation', content: 'Adjacency list (O(V+E) space, fast lookup) vs matrix (O(V²) space, direct access). List better for sparse graphs.' },
  { title: 'Time Complexity', content: 'BFS/DFS: O(V+E). Dijkstra: O((V+E)logV) with heap. Floyd-Warshall: O(V³). Choose based on problem constraints.' },
  { title: 'Space Complexity', content: 'BFS queue: O(V). DFS stack: O(h) where h=height. Tracking visited: O(V) always.' },
  { title: 'Greedy vs Exhaustive', content: 'Dijkstra greedy (shortest so far stays shortest). BFS exhaustive (explores all distances). DFS finds any path, not shortest.' },
];

export const DIJKSTRA_CODE = [
  'function dijkstra(graph, start) {',
  '  const dist = new Map();',
  '  const visited = new Set();',
  '  const pq = new MinHeap();',
  '',
  '  for (let v of graph.vertices) {',
  '    dist[v] = Infinity;',
  '  }',
  '  dist[start] = 0;',
  '  pq.push({node: start, d: 0});',
  '',
  '  while (!pq.isEmpty()) {',
  '    const {node: u, d} = pq.pop();',
  '    if (visited.has(u)) continue;',
  '    visited.add(u);',
  '',
  '    for (let {to: v, weight} of graph.edges[u]) {',
  '      const newDist = dist[u] + weight;',
  '      if (newDist < dist[v]) {',
  '        dist[v] = newDist;',
  '        pq.push({node: v, d: newDist});',
  '      }',
  '    }',
  '  }',
  '  return dist;',
  '}',
];

export const DIJKSTRA_NOTES = [
  { title: 'Greedy Choice', content: 'Always pick unvisited node with smallest distance. Proof: shortest path property ensures no shorter path via unvisited nodes.' },
  { title: 'Priority Queue', content: 'Must use heap for O(logV) extraction. Array extraction = O(V²) total. For dense graphs (E≈V²), O(V²) acceptable.' },
  { title: 'Negative Edges', content: 'Dijkstra fails with negative weights (greedy choice invalid). Use Bellman-Ford O(VE) instead, or no cycles with SPFA.' },
  { title: 'Euclidean Heuristic', content: 'A* variant: estimate remaining distance. Good for GPS/game maps. Requires consistent heuristic (never overestimates).' },
];

export const BFS_DFS_CONCEPTS = [
  { pro: 'BFS: Shortest path in unweighted graphs', con: 'Requires queue (extra space), slower than DFS for just reachability.' },
  { pro: 'DFS: Uses less memory, detects cycles easily', con: 'Doesn\'t find shortest path. Stack overflow risk on deep trees.' },
  { pro: 'BFS good for level-order traversal (trees)', con: 'More complex implementation than DFS recursion.' },
  { pro: 'DFS good for topological sort, connected components', con: 'Order of visitation depends on starting vertex.' },
];

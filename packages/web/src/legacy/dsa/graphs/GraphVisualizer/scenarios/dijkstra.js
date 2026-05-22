import { snap, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { DIJKSTRA_NOTES } from './shared';

const _mk = createNodeFactory({ default: '●' });
const graphNode = _mk('default');

function buildDijkstraSteps() {
  const steps = [];
  const s = {
    nodes: [
      graphNode('n0', 'A', 150, 150, { dist: 0, visited: false }),
      graphNode('n1', 'B', 300, 80,  { dist: Infinity, visited: false }),
      graphNode('n2', 'C', 300, 220, { dist: Infinity, visited: false }),
      graphNode('n3', 'D', 450, 150, { dist: Infinity, visited: false }),
    ],
    edges: [
      { from: 'n0', to: 'n1', protocol: '4' },
      { from: 'n0', to: 'n2', protocol: '2' },
      { from: 'n1', to: 'n3', protocol: '1' },
      { from: 'n2', to: 'n3', protocol: '5' },
    ],
    packets: [],
    events: [],
    metrics: { visited: 0, updated: 0, current_dist: 0 },
  };

  snap(steps, s, 'Dijkstra: Shortest paths from A. Greedy: always pick unvisited with min distance. Min-heap for O(logV) extraction.', 1);

  s.nodes[0].visited = true;
  s.nodes[0].state = 'ok';
  s.metrics.visited = 1;
  s.metrics.current_dist = 0;
  s.events.push({ type: 'ok', msg: 'Extract A (dist=0). Update neighbors: B(d=4), C(d=2).' });
  snap(steps, s, 'Start: Extract A (dist=0). Update neighbors. B: 0+4=4, C: 0+2=2.', 2);

  s.nodes[2].dist = 2;
  s.nodes[1].dist = 4;
  s.metrics.updated = 2;
  s.packets = [packet('n0', 'n2', 'dist=2'), packet('n0', 'n1', 'dist=4')];
  s.events.push({ type: 'info', msg: 'Heap: [C(d=2), B(d=4), D(∞)]' });
  snap(steps, s, 'Neighbors updated. Next: extract min from heap = C (dist=2).', 3);

  s.nodes[2].visited = true;
  s.nodes[2].state = 'ok';
  s.nodes[0].state = 'idle';
  s.metrics.visited = 2;
  s.metrics.current_dist = 2;
  s.packets = [packet('n2', 'n3', 'dist=7')];
  s.events.push({ type: 'info', msg: 'Extract C (dist=2). Update D: 2+5=7 > ∞ (no update), wait check B path.' });
  snap(steps, s, 'Extract C (dist=2). Check D: C→D costs 5, total=7. Update D to 7.', 4);

  s.nodes[3].dist = 7;
  s.metrics.updated = 3;
  s.events.push({ type: 'info', msg: 'D updated: dist=7 via C. Heap: [B(d=4), D(d=7)]' });
  snap(steps, s, 'D: min(∞, 2+5) = 7. Heap: [B(4), D(7)].', 5);

  s.nodes[1].visited = true;
  s.nodes[1].state = 'ok';
  s.nodes[2].state = 'idle';
  s.metrics.visited = 3;
  s.metrics.current_dist = 4;
  s.packets = [packet('n1', 'n3', 'dist=5 (4+1)')];
  s.events.push({ type: 'ok', msg: 'Extract B (dist=4). Update D: 4+1=5 < 7. D now dist=5.' });
  snap(steps, s, 'Extract B (dist=4). Check D: B→D costs 1, total=5 < 7. Update D to 5.', 6);

  s.nodes[3].dist = 5;
  s.metrics.updated = 4;
  s.events.push({ type: 'ok', msg: 'D updated: dist=5 via B (shorter!). Heap: [D(d=5)]' });
  snap(steps, s, 'D: min(7, 4+1) = 5. Path now A→B→D cheaper than A→C→D.', 7);

  s.nodes[3].visited = true;
  s.nodes[3].state = 'ok';
  s.nodes[1].state = 'idle';
  s.metrics.visited = 4;
  s.metrics.current_dist = 5;
  s.events.push({ type: 'ok', msg: 'Extract D (dist=5). No unvisited neighbors. Done. Shortest: A=0, B=4, C=2, D=5.' });
  snap(steps, s, 'Extract D (dist=5). All visited. Dijkstra complete. Shortest paths: A→B→D=5, A→C=2.', 8);

  return steps;
}

const CODE = [
  'function dijkstra(graph, start) {',
  '  const dist = new Map();',
  '  const visited = new Set();',
  '  const pq = new MinHeap();',
  '',
  '  for (let v of graph.vertices) {',
  '    dist.set(v, Infinity);',
  '  }',
  '  dist.set(start, 0);',
  '  pq.push({node: start, d: 0});',
  '',
  '  while (!pq.isEmpty()) {',
  '    const {node: u, d} = pq.pop();',
  '    if (visited.has(u)) continue;',
  '    visited.add(u);',
  '',
  '    for (let {to: v, weight} of graph.adj[u]) {',
  '      const newDist = dist.get(u) + weight;',
  '      if (newDist < dist.get(v)) {',
  '        dist.set(v, newDist);',
  '        pq.push({node: v, d: newDist});',
  '      }',
  '    }',
  '  }',
  '  return dist;',
  '}',
];

export default {
  id: 'dijkstra',
  label: 'Dijkstra\'s Algorithm',
  icon: '📍',
  build: buildDijkstraSteps,
  code: CODE,
  language: 'JavaScript',
  concepts: [
    { title: 'Greedy Invariant', content: 'Once a node is visited, its distance is final (shortest). Proof: path via unvisited nodes = longer by definition of positive weights.' },
    { title: 'Min-Heap Optimization', content: 'Extracting min unvisited = O(logV) with heap vs O(V) with array. Total: O((V+E)logV) vs O(V²). Critical for sparse graphs.' },
    { title: 'Relaxation', content: 'For each edge u→v with weight w, update dist[v] = min(dist[v], dist[u] + w). Core operation, O(E) total.' },
    { title: 'Negative Weights', content: 'Dijkstra fails (greedy choice invalid). Bellman-Ford handles negatives but O(VE).' },
  ],
  codeNotes: DIJKSTRA_NOTES,
  tradeoffs: [
    { pro: 'Guarantees optimal shortest paths with positive weights', con: 'Fails on negative edges; need Bellman-Ford (slower).' },
    { pro: 'Efficient with min-heap: O((V+E)logV)', con: 'Heap operations overhead; array version O(V²) simpler on small graphs.' },
    { pro: 'Greedy approach elegant and intuitive', con: 'Doesn\'t find all shortest paths (only one per node). For all-pairs, run V times.' },
    { pro: 'Works on directed and undirected', con: 'Doesn\'t handle disconnected components (dist=∞ for unreachable).' },
  ],
  bestPractices: [
    'Always use min-heap for production. O(V²) array version only for prototyping/small graphs <100 nodes.',
    'Initialize start distance to 0, all others to Infinity. Skip processing if distance unchanged (optimization).',
    'For path reconstruction, track parent pointers during relaxation: parent[v] = u when dist[v] updated.',
    'On large graphs (>100k nodes), use bidirectional Dijkstra: search from both start and end, meet in middle. Halves search space.',
    'For GPS/game pathfinding, use A* variant with heuristic. Requires consistent distance estimate but much faster than Dijkstra.',
  ],
  metrics: [
    { key: 'visited', label: 'Visited', max: 4, color: 'var(--pod-running)' },
    { key: 'updated', label: 'Updated', max: 4, color: 'var(--node-comparing)' },
    { key: 'current_dist', label: 'Cur Dist', max: 10, color: 'var(--node-default)' },
  ],
};

import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { GRAPH_CONCEPTS, BFS_DFS_CONCEPTS } from './shared';

const _mk = createNodeFactory({ default: '●' });
const graphNode = _mk('default');

function buildBFSSteps() {
  const steps = [];
  const s = {
    nodes: [
      graphNode('n0', 'A', 200, 100, { visited: false, dist: -1, queued: false }),
      graphNode('n1', 'B', 350, 50,  { visited: false, dist: -1, queued: false }),
      graphNode('n2', 'C', 350, 150, { visited: false, dist: -1, queued: false }),
      graphNode('n3', 'D', 500, 100, { visited: false, dist: -1, queued: false }),
      graphNode('n4', 'E', 200, 250, { visited: false, dist: -1, queued: false }),
    ],
    edges: [
      { from: 'n0', to: 'n1', protocol: '1' }, { from: 'n0', to: 'n2', protocol: '1' },
      { from: 'n1', to: 'n3', protocol: '1' }, { from: 'n2', to: 'n3', protocol: '1' },
      { from: 'n0', to: 'n4', protocol: '1' },
    ],
    packets: [],
    events: [],
    metrics: { visited: 0, dist: 0, queue: 0 },
  };

  snap(steps, s, 'BFS explores graph level-by-level. Start from A. Queue: [A]. Distance: A=0, others=∞.', 1);

  s.nodes[0].visited = true;
  s.nodes[0].dist = 0;
  s.nodes[0].state = 'active';
  s.nodes[0].queued = true;
  s.metrics.visited = 1;
  s.metrics.queue = 1;
  s.events.push({ type: 'info', msg: 'Dequeue A. Mark visited. Explore neighbors: B, C, E.' });
  snap(steps, s, 'Dequeue A (distance 0). Mark as visited. Add unvisited neighbors to queue.', 2);

  s.nodes[1].dist = 1; s.nodes[1].queued = true;
  s.nodes[2].dist = 1; s.nodes[2].queued = true;
  s.nodes[4].dist = 1; s.nodes[4].queued = true;
  s.metrics.queue = 3;
  s.packets = [packet('n0', 'n1', 'dist=1'), packet('n0', 'n2', 'dist=1'), packet('n0', 'n4', 'dist=1')];
  s.events.push({ type: 'ok', msg: 'Queue: [B(d=1), C(d=1), E(d=1)]' });
  snap(steps, s, 'B, C, E all at distance 1 from A. Queue growing.', 3);

  s.nodes[1].visited = true; s.nodes[1].state = 'active';
  s.nodes[0].state = 'idle';
  s.metrics.visited = 2;
  s.packets = [packet('n1', 'n3', 'dist=2')];
  s.events.push({ type: 'ok', msg: 'Dequeue B. Neighbor D not visited. Add D(dist=2).' });
  snap(steps, s, 'Dequeue B (distance 1). Explore D. Queue: [C(1), E(1), D(2)].', 4);

  s.nodes[3].dist = 2; s.nodes[3].queued = true;
  s.metrics.queue = 3;
  s.events.push({ type: 'ok', msg: 'Queue: [C(d=1), E(d=1), D(d=2)]' });
  snap(steps, s, 'D discovered at distance 2 via B. Still exploring distance-1 nodes.', 5);

  s.nodes[2].visited = true; s.nodes[2].state = 'active';
  s.nodes[1].state = 'idle';
  s.metrics.visited = 3;
  s.packets = [];
  s.events.push({ type: 'info', msg: 'Dequeue C (d=1). D already queued (d=2 from B), skip.' });
  snap(steps, s, 'Dequeue C (distance 1). D already discovered at d=2. No update.', 6);

  s.nodes[4].visited = true; s.nodes[4].state = 'active';
  s.nodes[2].state = 'idle';
  s.metrics.visited = 4;
  s.events.push({ type: 'info', msg: 'Dequeue E (d=1). No unvisited neighbors.' });
  snap(steps, s, 'Dequeue E (distance 1). No new neighbors.', 7);

  s.nodes[3].visited = true; s.nodes[3].state = 'active';
  s.nodes[4].state = 'idle';
  s.metrics.visited = 5;
  s.metrics.queue = 0;
  s.events.push({ type: 'ok', msg: 'Dequeue D (d=2). All nodes visited. Distances: A=0, B=1, C=1, D=2, E=1.' });
  snap(steps, s, 'BFS complete. All reachable nodes visited in order of distance from source.', 8);

  return steps;
}

const CODE = [
  'function bfs(graph, start) {',
  '  const visited = new Set([start]);',
  '  const dist = { [start]: 0 };',
  '  const queue = [start];',
  '',
  '  while (queue.length) {',
  '    const u = queue.shift();',
  '    for (let v of graph[u]) {',
  '      if (!visited.has(v)) {',
  '        visited.add(v);',
  '        dist[v] = dist[u] + 1;',
  '        queue.push(v);',
  '      }',
  '    }',
  '  }',
  '  return dist;',
  '}',
];

export default {
  id: 'bfs',
  label: 'Breadth-First Search (BFS)',
  icon: '🔍',
  build: buildBFSSteps,
  code: CODE,
  language: 'JavaScript',
  concepts: GRAPH_CONCEPTS,
  codeNotes: [
    { title: 'Queue (FIFO)', content: 'Nodes processed in order discovered. Ensures distance-1 nodes processed before distance-2. O(V+E) time.' },
    { title: 'Visited Set', content: 'Prevents revisiting. Critical to avoid cycles; without it, infinite loop on cyclic graphs.' },
    { title: 'Distance Tracking', content: 'dist[v] = dist[u] + 1 only on first visit. Shortest path in unweighted graphs guaranteed.' },
    { title: 'Queue Size', content: 'Max queue size = O(V) (widest level). On trees, can reach V/2. On fully connected, always O(V).' },
  ],
  tradeoffs: [
    { pro: 'Guarantees shortest path in unweighted graphs', con: 'Queue memory = O(V). DFS uses O(log V) stack on balanced trees.' },
    { pro: 'Explores systematically level-by-level', con: 'Slower than DFS for deep, narrow graphs (explores wide at each level).' },
    { pro: 'Good for finding closest nodes', con: 'Overkill if only need reachability; DFS simpler.' },
    { pro: 'Works on directed and undirected', con: 'Must handle self-loops and duplicate edges manually.' },
  ],
  bestPractices: [
    'Always mark nodes visited before adding to queue; prevents duplicates and cycles.',
    'Use queue library or shift() carefully; shift() is O(n) in JS, use deque for O(1) if performance critical.',
    'For multi-source BFS (multiple starts), initialize queue with all sources at distance 0.',
    'Bidirectional BFS reduces search space: from both source and target, meet in middle. O(b^(d/2)) instead of O(b^d).',
  ],
  metrics: [
    { key: 'visited', label: 'Visited', max: 5, color: 'var(--pod-running)' },
    { key: 'dist',    label: 'Max Dist', max: 5, color: 'var(--node-default)' },
    { key: 'queue',   label: 'Queue Size', max: 5, color: 'var(--node-comparing)' },
  ],
};

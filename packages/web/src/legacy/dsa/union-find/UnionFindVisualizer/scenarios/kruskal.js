import { snap, packet, createNodeFactory } from '@/core/utils/scenarioShared';

const _mk = createNodeFactory({ default: '●' });
const gNode = _mk('default');

function buildKruskalSteps() {
  const steps = [];
  const s = {
    nodes: [
      gNode('n1', 'A', 200, 100, {}),
      gNode('n2', 'B', 400, 100, {}),
      gNode('n3', 'C', 300, 250, {}),
      gNode('n4', 'D', 100, 250, {}),
    ],
    edges: [
      { from: 'n1', to: 'n2', protocol: '1' },
      { from: 'n1', to: 'n3', protocol: '4' },
      { from: 'n1', to: 'n4', protocol: '5' },
      { from: 'n2', to: 'n3', protocol: '2' },
      { from: 'n3', to: 'n4', protocol: '3' },
    ],
    packets: [],
    events: [],
    metrics: { edges_sorted: 0, edges_added: 0, total_cost: 0, mst_complete: false },
  };

  snap(steps, s, 'Kruskal MST: Sort edges by weight. Use DSU to detect cycles. Build MST O(E log E).', 1);

  s.metrics.edges_sorted = 1;
  s.events.push({ type: 'info', msg: 'Sorted edges by weight: (A,B,1), (B,C,2), (C,D,3), (A,C,4), (A,D,5).' });
  snap(steps, s, 'Step 1: Sort edges. Weights: 1,2,3,4,5. O(E log E) sort.', 2);

  s.nodes[0].state = 'active';
  s.nodes[1].state = 'active';
  s.packets = [packet('n1', 'n2', 'add edge (A,B,1)?')];
  s.metrics.edges_added = 1;
  s.metrics.total_cost = 1;
  s.events.push({ type: 'info', msg: 'Edge (A,B,1): find(A)≠find(B). Different sets. Add to MST. union(A,B).' });
  snap(steps, s, 'Edge 1 (A,B, weight=1): find(A)!=find(B). Add. MST=[1]. Cost=1.', 3);

  s.nodes[1].state = 'active';
  s.nodes[2].state = 'active';
  s.packets = [packet('n2', 'n3', 'add edge (B,C,2)?')];
  s.metrics.edges_added = 2;
  s.metrics.total_cost = 3;
  s.events.push({ type: 'info', msg: 'Edge (B,C,2): find(B)≠find(C). Add to MST. union(B,C).' });
  snap(steps, s, 'Edge 2 (B,C, weight=2): find(B)!=find(C). Add. MST=[1,2]. Cost=3.', 4);

  s.nodes[2].state = 'active';
  s.nodes[3].state = 'active';
  s.packets = [packet('n3', 'n4', 'add edge (C,D,3)?')];
  s.metrics.edges_added = 3;
  s.metrics.total_cost = 6;
  s.events.push({ type: 'info', msg: 'Edge (C,D,3): find(C)≠find(D). Add to MST. union(C,D). All 4 nodes connected!' });
  snap(steps, s, 'Edge 3 (C,D, weight=3): find(C)!=find(D). Add. MST=[1,2,3]. Cost=6.', 5);

  s.nodes[0].state = 'active';
  s.nodes[2].state = 'active';
  s.packets = [packet('n1', 'n3', 'skip? (A,C,4) cycle')];
  s.events.push({ type: 'warn', msg: 'Edge (A,C,4): find(A)==find(C)? YES (same component via A-B-C). Skip. Creates cycle.' });
  snap(steps, s, 'Edge 4 (A,C, weight=4): find(A)==find(C). SKIP. Would create cycle.', 6);

  s.nodes[0].state = 'active';
  s.nodes[3].state = 'active';
  s.packets = [packet('n1', 'n4', 'skip? (A,D,5) cycle')];
  s.metrics.mst_complete = true;
  s.events.push({ type: 'ok', msg: 'Edge (A,D,5): find(A)==find(D). Skip. MST complete: 3 edges, 4 nodes.' });
  snap(steps, s, 'Edge 5 (A,D, weight=5): find(A)==find(D). SKIP. MST complete. n-1=3 edges. Done!', 7);

  s.metrics.edges_added = 3;
  s.events.push({ type: 'ok', msg: 'Final MST: edges (A,B,1), (B,C,2), (C,D,3). Total cost=6. All nodes spanned, no cycles.' });
  snap(steps, s, 'Kruskal Complete. MST edges: (A,B,1), (B,C,2), (C,D,3). Weight=6. Optimal!', 8);

  return steps;
}

const CODE = [
  'kruskal(vertices, edges) {',
  '  const uf = new UnionFind(vertices.length);',
  '  const mst = [];',
  '  let totalCost = 0;',
  '',
  '  // Sort edges by weight',
  '  edges.sort((a, b) => a.weight - b.weight);',
  '',
  '  // Iterate through sorted edges',
  '  for (const edge of edges) {',
  '    const { from, to, weight } = edge;',
  '',
  '    // Check if u and v are in different sets',
  '    if (uf.find(from) !== uf.find(to)) {',
  '      mst.push(edge);',
  '      totalCost += weight;',
  '      uf.union(from, to);',
  '',
  '      // MST complete when size = n-1',
  '      if (mst.length === vertices.length - 1) break;',
  '    }',
  '  }',
  '',
  '  return { mst, totalCost };',
  '}',
];

export default {
  id: 'kruskal',
  label: 'Kruskal MST Algorithm',
  icon: '🌲',
  build: buildKruskalSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'edges_sorted', label: 'Sorted', max: 5, color: 'var(--node-default)' },
    { key: 'edges_added', label: 'MST Edges', max: 5, color: 'var(--pod-running)' },
    { key: 'total_cost', label: 'Total Cost', max: 20, color: 'var(--node-comparing)' },
    { key: 'mst_complete', label: 'Complete', max: 1, color: 'var(--pod-running)' },
  ],
  codeNotes: [
    { title: 'Greedy Algorithm', content: 'Sort edges by weight. Greedily add edges if they don\'t create cycles. Union-Find detects cycles in O(α(n)).' },
    { title: 'Cycle Detection', content: 'find(u)==find(v)? YES→both in same component→adding edge would cycle. SKIP. NO→different sets→safe to add.' },
    { title: 'Time: O(E log E)', content: 'Sort O(E log E). Iterate E edges. Each find/union O(α(n)) ≈ O(1). Total: O(E log E) dominated by sort.' },
    { title: 'Optimality Proof', content: 'Kruskal is greedy: always pick minimum-weight edge that doesn\'t cycle. Matroid property: greedy = optimal MST.' },
  ],
  tradeoffs: [
    { pro: 'Simple greedy logic', con: 'Requires sorting all E edges upfront. For dense graphs, E=O(V²), sort cost = O(V² log V).' },
    { pro: 'DSU efficient', con: 'Prim\'s algorithm (heap-based) better for dense graphs. Prim: O(E log V) vs Kruskal O(E log E).' },
    { pro: 'Works on disconnected graphs', con: 'Returns forest if components > 1. Assumes connected graph for full MST.' },
    { pro: 'O(α(n)) with DSU', con: 'Prim with Fibonacci heap: O(E + V log V) even better, but complex to implement.' },
  ],
  bestPractices: [
    'Always check connected iff components==1. After Kruskal, run find on 2 nodes: find(u)==find(v) means connected.',
    'MST property: n-1 edges for n nodes. If mst.length < n-1, graph has disconnected components.',
    'Edge weight tie-breaking: if multiple edges have same weight, order doesn\'t matter (all MSTs have same total cost). Use index as tiebreaker.',
    'Compare Kruskal vs Prim: Kruskal best for sparse graphs (E << V²). Prim best for dense graphs (E ≈ V²). Use Kruskal for interview (simpler logic).',
    'Variant: maximum spanning tree = negate weights (or multiply by -1), run Kruskal. Works because MST property is weight-agnostic.',
  ],
};

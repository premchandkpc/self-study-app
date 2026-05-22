import { snap, packet, createNodeFactory } from '@/core/utils/scenarioShared';

const _mk = createNodeFactory({ default: '●', root: '🔷' });
const ufNode = _mk('default');
const rootNode = _mk('root');

function buildFindSteps() {
  const steps = [];
  const s = {
    nodes: [
      rootNode('root', 'Root', 400, 50, { parent: null, rank: 2 }),
      ufNode('n1', '1', 200, 150, { parent: 'root', rank: 0 }),
      ufNode('n2', '2', 300, 150, { parent: 'root', rank: 0 }),
      ufNode('n3', '3', 500, 150, { parent: 'root', rank: 0 }),
      ufNode('n4', '4', 250, 250, { parent: 'n1', rank: 0 }),
      ufNode('n5', '5', 550, 250, { parent: 'n3', rank: 0 }),
    ],
    edges: [
      { from: 'n1', to: 'root', protocol: '' },
      { from: 'n2', to: 'root', protocol: '' },
      { from: 'n3', to: 'root', protocol: '' },
      { from: 'n4', to: 'n1', protocol: '' },
      { from: 'n5', to: 'n3', protocol: '' },
    ],
    packets: [],
    events: [],
    metrics: { node: '4', root: 'root', steps: 0, compressed: false },
  };

  snap(steps, s, 'Union-Find: Find root via parent chain. Path compression: redirect all to root.', 1);

  s.nodes[4].state = 'active';
  s.packets = [packet('n4', 'n4', 'find(4)')];
  s.metrics.node = '4';
  s.metrics.steps = 1;
  s.events.push({ type: 'info', msg: 'Find(4). Current node: 4. Check: is 4 root? No. parent[4]=1.' });
  snap(steps, s, 'Find(4): node=4. Ask parent. parent[4]=1.', 2);

  s.nodes[0].state = 'active';
  s.nodes[1].state = 'active';
  s.packets = [packet('n4', 'n1', 'find up to parent')];
  s.metrics.steps = 2;
  s.events.push({ type: 'info', msg: 'Move to parent 1. Is 1 root? No. parent[1]=root.' });
  snap(steps, s, 'Find(4) → 1: parent[1]=root. Keep climbing.', 3);

  s.nodes[4].state = 'active';
  s.nodes[1].state = 'active';
  s.packets = [packet('n1', 'root', 'find up to root')];
  s.metrics.steps = 3;
  s.events.push({ type: 'info', msg: 'Move to parent root. Is root root? YES! Found root.' });
  snap(steps, s, 'Find(4): root found. Path: 4 → 1 → root. Return root.', 4);

  // Path compression demonstration
  s.metrics.compressed = false;
  s.events.push({ type: 'info', msg: 'Path compression: redirect all visited nodes directly to root.' });
  snap(steps, s, 'Without compression: next find(4) repeats 4→1→root. Slow on deep trees.', 5);

  // After compression
  s.edges = [
    { from: 'n1', to: 'root', protocol: '' },
    { from: 'n2', to: 'root', protocol: '' },
    { from: 'n3', to: 'root', protocol: '' },
    { from: 'n4', to: 'root', protocol: 'compressed' },
    { from: 'n5', to: 'n3', protocol: '' },
  ];
  s.nodes[4].state = 'ok';
  s.metrics.compressed = true;
  s.metrics.steps = 3;
  s.events.push({ type: 'ok', msg: 'Path compression: parent[4] = root. Now find(4) = O(1)!' });
  snap(steps, s, 'After compression: find(4) skips intermediate nodes. O(1) amortized.', 6);

  // Another find with compression already in place
  s.packets = [packet('n5', 'n5', 'find(5)')];
  s.metrics.node = '5';
  s.metrics.steps = 0;
  s.events.push({ type: 'info', msg: 'Find(5). parent[5]=3. Is 3 root? No. parent[3]=root.' });
  snap(steps, s, 'Find(5): 5→3→root. parent[3] not root yet (rank=0, no compression yet).', 7);

  s.nodes[5].state = 'active';
  s.nodes[2].state = 'active';
  s.packets = [packet('n5', 'root', 'find with path compression')];
  s.metrics.steps = 2;
  s.events.push({ type: 'ok', msg: 'Path compression: parent[3]=root, parent[5]=root. Both compressed!' });
  snap(steps, s, 'Compress: 5→root, 3→root. Next find(5) = O(1).', 8);

  return steps;
}

const CODE = [
  'class UnionFind {',
  '  constructor(n) {',
  '    this.parent = Array(n).fill(0).map((_, i) => i);',
  '    this.rank = Array(n).fill(0);',
  '  }',
  '',
  '  find(x) {',
  '    if (this.parent[x] !== x) {',
  '      this.parent[x] = this.find(this.parent[x]);',
  '    }',
  '    return this.parent[x];',
  '  }',
  '',
  '  union(x, y) {',
  '    const rootX = this.find(x);',
  '    const rootY = this.find(y);',
  '    if (rootX === rootY) return;',
  '',
  '    if (this.rank[rootX] < this.rank[rootY]) {',
  '      this.parent[rootX] = rootY;',
  '    } else if (this.rank[rootX] > this.rank[rootY]) {',
  '      this.parent[rootY] = rootX;',
  '    } else {',
  '      this.parent[rootY] = rootX;',
  '      this.rank[rootX]++;',
  '    }',
  '  }',
  '}',
];

export default {
  id: 'find',
  label: 'Union-Find: Path Compression',
  icon: '🔍',
  build: buildFindSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'node', label: 'Query Node', max: 1, color: 'var(--pod-running)' },
    { key: 'root', label: 'Root Found', max: 1, color: 'var(--node-comparing)' },
    { key: 'steps', label: 'Steps to Root', max: 10, color: 'var(--node-default)' },
    { key: 'compressed', label: 'Compressed', max: 1, color: 'var(--pod-running)' },
  ],
  codeNotes: [
    { title: 'Find + Path Compression', content: 'find(x): traverse parent chain to root. Recursively update parent[x] = find(parent[x]). Collapses tree on next access. O(α(n)) amortized.' },
    { title: 'Without Compression: Worst Case O(n)', content: 'find(x) on skewed tree (n linked) = O(n). Repeated finds still O(n) each. Bad for dense union/find workloads.' },
    { title: 'With Compression: Near O(1)', content: 'After compression, find(x) is O(α(n)) where α=inverse Ackermann (~4 for practical n). All nodes redirect directly to root. Cumulative m finds = O(m·α(n)).' },
    { title: 'Use Case: Connectivity, Kruskal MST', content: 'DSU tracks connected components. Union-Find + Kruskal: sort edges, iterate, find(u)!=find(v)→add edge→union(u,v). O(E log E) for Kruskal.' },
  ],
  tradeoffs: [
    { pro: 'Path compression = near O(1) amortized', con: 'Recursive find uses call stack. Iterative version safer (tail recursion not guaranteed).' },
    { pro: 'Union by rank = balanced trees', con: 'Rank tracking adds memory (small). Without rank: find becomes O(log n).' },
    { pro: 'Simple implementation', con: 'Race conditions in multi-threaded contexts. Need atomic CAS or locks.' },
    { pro: 'Cache-friendly: parent array', con: 'Large n → large array allocation. Dense allocation = cache misses if scattered access.' },
  ],
  bestPractices: [
    'Path compression + union by rank: enables O(α(n)) amortized. Always combine both, not one or the other.',
    'Count connected components: initially n. Each union() decreases by 1 (if new union). Check after m operations: components = n - unions_performed.',
    'Detect cycles in graph: DSU tracks components. Edge(u,v): find(u)==find(v)? YES=cycle. Use for undirected graphs only.',
    'Kruskal MST: sort edges by weight. For each edge(u,v): find(u)!=find(v)? YES→add to MST, union(u,v). Stop at n-1 edges. O(E log E).',
    'Interview tip: implement iterative find (replace recursive) to avoid stack overflow. Use while loop: x != parent[x] { x = parent[x] } then path compress on return pass.',
  ],
};

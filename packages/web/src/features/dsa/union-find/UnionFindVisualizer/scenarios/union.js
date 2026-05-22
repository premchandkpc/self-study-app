import { snap, packet, createNodeFactory } from '@/core/utils/scenarioShared';

const _mk = createNodeFactory({ default: '●', root: '🔷' });
const ufNode = _mk('default');
const rootNode = _mk('root');

function buildUnionSteps() {
  const steps = [];
  const s = {
    nodes: [
      rootNode('r1', 'Root A', 200, 50, { rank: 1 }),
      ufNode('n1', '1', 150, 150, { parent: 'r1', rank: 0 }),
      ufNode('n2', '2', 250, 150, { parent: 'r1', rank: 0 }),
      rootNode('r2', 'Root B', 450, 50, { rank: 1 }),
      ufNode('n3', '3', 400, 150, { parent: 'r2', rank: 0 }),
      ufNode('n4', '4', 500, 150, { parent: 'r2', rank: 0 }),
    ],
    edges: [
      { from: 'n1', to: 'r1', protocol: '' },
      { from: 'n2', to: 'r1', protocol: '' },
      { from: 'n3', to: 'r2', protocol: '' },
      { from: 'n4', to: 'r2', protocol: '' },
    ],
    packets: [],
    events: [],
    metrics: { x_root: 'r1', y_root: 'r2', x_rank: 1, y_rank: 1, connected: false },
  };

  snap(steps, s, 'Union-Find: Union by rank. Merge trees. Attach smaller rank to larger.', 1);

  s.nodes[0].state = 'active';
  s.nodes[3].state = 'active';
  s.packets = [packet('r1', 'r2', 'union(1,3)')];
  s.metrics.x_rank = 1;
  s.metrics.y_rank = 1;
  s.events.push({ type: 'info', msg: 'Union(1,3). find(1)=rootA (rank=1). find(3)=rootB (rank=1).' });
  snap(steps, s, 'Union(1,3): find roots. rootA.rank=1, rootB.rank=1. Equal ranks.', 2);

  s.nodes[0].state = 'active';
  s.packets = [packet('r2', 'r1', 'attach B→A')];
  s.metrics.x_rank = 2;
  s.events.push({ type: 'info', msg: 'Ranks equal: attach rootB→rootA. Increment rootA.rank: 1→2.' });
  snap(steps, s, 'Union decision: equal ranks. Set parent[rootB]=rootA, rank[rootA]++ (1→2).', 3);

  s.edges = [
    { from: 'n1', to: 'r1', protocol: '' },
    { from: 'n2', to: 'r1', protocol: '' },
    { from: 'n3', to: 'r2', protocol: '' },
    { from: 'n4', to: 'r2', protocol: '' },
    { from: 'r2', to: 'r1', protocol: 'union' },
  ];
  s.nodes[3].state = 'ok';
  s.metrics.connected = true;
  s.events.push({ type: 'ok', msg: 'Component merged. Now: find(1), find(3) both return rootA.' });
  snap(steps, s, 'Sets merged. Tree height: max(rank_A, rank_B)=2. Balanced.', 4);

  // Another union with unequal ranks
  s.nodes = [
    rootNode('r1', 'Root A', 200, 50, { rank: 2 }),
    ufNode('n1', '1', 150, 150, { parent: 'r1', rank: 0 }),
    ufNode('n2', '2', 250, 150, { parent: 'r1', rank: 0 }),
    ufNode('n3', '3', 400, 150, { parent: 'r1', rank: 0 }),
    rootNode('r3', 'Root C', 500, 50, { rank: 0 }),
    ufNode('n4', '4', 500, 150, { parent: 'r3', rank: 0 }),
  ];
  s.edges = [
    { from: 'n1', to: 'r1', protocol: '' },
    { from: 'n2', to: 'r1', protocol: '' },
    { from: 'n3', to: 'r1', protocol: '' },
    { from: 'n4', to: 'r3', protocol: '' },
  ];
  s.packets = [packet('r1', 'r3', 'union(1,4)')];
  s.metrics.x_rank = 2;
  s.metrics.y_rank = 0;
  s.metrics.connected = false;
  s.events.push({ type: 'info', msg: 'Union(1,4). find(1)=rootA (rank=2). find(4)=rootC (rank=0).' });
  snap(steps, s, 'Union(1,4): rootA.rank=2 > rootC.rank=0. Attach smaller to larger.', 5);

  s.nodes[4].state = 'active';
  s.packets = [packet('r3', 'r1', 'attach C→A (smaller→larger)')];
  s.events.push({ type: 'info', msg: 'Unequal ranks: rank[A]=2 > rank[C]=0. parent[rootC]=rootA. No rank++.' });
  snap(steps, s, 'Union rule: rootA.rank=2 > rootC.rank=0. Attach rootC→rootA. rank[A] stays 2.', 6);

  s.edges = [
    { from: 'n1', to: 'r1', protocol: '' },
    { from: 'n2', to: 'r1', protocol: '' },
    { from: 'n3', to: 'r1', protocol: '' },
    { from: 'n4', to: 'r3', protocol: '' },
    { from: 'r3', to: 'r1', protocol: 'union' },
  ];
  s.nodes[4].state = 'ok';
  s.metrics.connected = true;
  s.events.push({ type: 'ok', msg: 'Components merged. Tree height ≤ 2. Union by rank keeps trees balanced!' });
  snap(steps, s, 'Merged. Larger tree absorbs smaller. Height increases only when ranks equal.', 7);

  return steps;
}

const CODE = [
  'union(x, y) {',
  '  const rootX = this.find(x);',
  '  const rootY = this.find(y);',
  '',
  '  if (rootX === rootY) {',
  '    return; // Already in same set',
  '  }',
  '',
  '  // Union by rank: attach smaller to larger',
  '  if (this.rank[rootX] < this.rank[rootY]) {',
  '    this.parent[rootX] = rootY;',
  '  } else if (this.rank[rootX] > this.rank[rootY]) {',
  '    this.parent[rootY] = rootX;',
  '  } else {',
  '    // Equal ranks: attach Y to X, increment X',
  '    this.parent[rootY] = rootX;',
  '    this.rank[rootX]++;',
  '  }',
  '}',
];

export default {
  id: 'union',
  label: 'Union-Find: Union by Rank',
  icon: '🔗',
  build: buildUnionSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'x_root', label: 'Root X', max: 1, color: 'var(--node-default)' },
    { key: 'y_root', label: 'Root Y', max: 1, color: 'var(--node-comparing)' },
    { key: 'x_rank', label: 'Rank X', max: 5, color: 'var(--node-default)' },
    { key: 'y_rank', label: 'Rank Y', max: 5, color: 'var(--node-comparing)' },
    { key: 'connected', label: 'Connected', max: 1, color: 'var(--pod-running)' },
  ],
  codeNotes: [
    { title: 'Union by Rank O(1)', content: 'Compare rank[rootX] vs rank[rootY]. Attach smaller rank tree as child of larger. If equal: attach Y→X, increment rank[X].' },
    { title: 'Balanced Trees', content: 'Rank = height of tree. Attaching smaller tree to larger keeps height ≤ log(n). Prevents degenerate chains.' },
    { title: 'O(α(n)) Amortized', content: 'Path compression + union by rank = O(α(n)) per find/union. m operations = O(m·α(n)). α(n) ≈ 4 for n < 2^16 (negligible).' },
    { title: 'Path Compression + Union by Rank Together', content: 'Only effective together. Union by rank alone = O(log n). Path compression alone = O(α(n)). Combined = O(α(n)) amortized.' },
  ],
  tradeoffs: [
    { pro: 'Union by rank keeps trees balanced', con: 'Rank array adds memory O(n). For small n, overhead noticeable.' },
    { pro: 'Simple rule: compare ranks', con: 'Doesn\'t account for subtree sizes (size-based union slightly better in practice).' },
    { pro: 'Proven O(α(n)) with compression', con: 'Constant factors matter. In practice, 20-30 elements feel like O(1).' },
    { pro: 'Works for union(x,y) without find(x) first', con: 'find(x) is implicit: find(x)→find(y)→union(roots). All three combined.' },
  ],
  bestPractices: [
    'Always use union by rank if time permits. Trade off rank array memory for better complexity guarantees.',
    'Size-based union alternative: attach smaller set (by element count) to larger. Easier to understand, same O(α(n)) result.',
    'Check connectivity before union: if find(x)==find(y), skip union. Avoids redundant updates.',
    'Kruskal MST: sort edges by weight, iterate, union iff find(u)!=find(v). Union by rank accelerates this 30% in practice.',
    'Interview: explain intuition first. Rank = height heuristic. Smaller tree added to larger = balanced growth. Path compression = flat trees.',
  ],
};

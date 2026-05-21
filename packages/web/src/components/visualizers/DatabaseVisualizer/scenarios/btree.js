import { snap } from '@/core/utils/scenarioShared';

function buildBTreeSteps() {
  const steps = [];

  const s = {
    nodes: [],
    operation: 'insert',
    target: null,
    events: [],
    metrics: { comparisons: 0, splits: 0, depth: 0 },
    vars: { target: null, level: 0, comparisons: 0, found: false },
  };

  snap(steps, s, 'B-Tree empty. Ready to insert keys. Each node holds up to 2 keys (order-3 B-Tree).', 1, 'O(log n) insert');

  // Insert 10
  s.target = 10;
  s.nodes = [{ id: 'root', keys: [], children: [], type: 'leaf', active: true }];
  s.events = [{ type: 'info', msg: 'INSERT 10 → root node' }];
  s.vars = { target: 10, level: 1, comparisons: 0, found: false };
  snap(steps, s, 'Insert 10: tree is empty, create root node with key 10.', 2, 'O(log n) insert');

  s.nodes[0].keys = [10];
  s.nodes[0].active = false;
  s.metrics.comparisons = 1;
  s.vars = { target: 10, level: 1, comparisons: 1, found: false };
  snap(steps, s, 'Root now contains [10]. B-Tree has 1 key.', 3, 'O(log n) insert');

  // Insert 20
  s.target = 20;
  s.nodes[0].active = true;
  s.events.push({ type: 'info', msg: 'INSERT 20 → compare with 10, place right' });
  s.vars = { target: 20, level: 1, comparisons: 2, found: false };
  snap(steps, s, 'Insert 20: compare with 10. 20 > 10, place after 10 in root.', 4, 'O(log n) insert');

  s.nodes[0].keys = [10, 20];
  s.nodes[0].active = false;
  s.metrics.comparisons = 2;
  snap(steps, s, 'Root now contains [10, 20]. Node is at max capacity (2 keys).', 5, 'O(log n) insert');

  // Insert 30 → split
  s.target = 30;
  s.nodes[0].active = true;
  s.events.push({ type: 'warn', msg: 'INSERT 30 → node full, must split!' });
  s.vars = { target: 30, level: 1, comparisons: 3, found: false };
  snap(steps, s, 'Insert 30: root is full! B-Tree must split the node. Median key 20 moves up.', 6, 'O(log n) split');

  s.nodes = [
    { id: 'root', keys: [20], children: ['left', 'right'], type: 'internal', active: true },
    { id: 'left', keys: [10], children: [], type: 'leaf', active: false },
    { id: 'right', keys: [30], children: [], type: 'leaf', active: false },
  ];
  s.metrics.splits = 1;
  s.metrics.depth = 2;
  s.vars = { target: 30, level: 2, comparisons: 3, found: false };
  snap(steps, s, 'Split complete! Root [20] with children [10] and [30]. Tree depth = 2.', 7, 'O(log n) split');

  // Insert 5
  s.target = 5;
  s.nodes[0].active = true;
  s.events.push({ type: 'info', msg: 'INSERT 5 → 5 < 20, go left child' });
  s.vars = { target: 5, level: 2, comparisons: 4, found: false };
  snap(steps, s, 'Insert 5: compare with root [20]. 5 < 20, traverse to left child [10].', 8, 'O(log n) insert');

  s.nodes[0].active = false;
  s.nodes[1].active = true;
  s.metrics.comparisons = 4;
  snap(steps, s, 'At left node [10]. 5 < 10, place before 10.', 9, 'O(log n) insert');

  s.nodes[1].keys = [5, 10];
  s.nodes[1].active = false;
  s.vars = { target: 5, level: 2, comparisons: 5, found: false };
  snap(steps, s, 'Left node now [5, 10]. Tree structure maintained.', 10, 'O(log n) insert');

  // Insert 15
  s.target = 15;
  s.nodes[0].active = true;
  s.events.push({ type: 'info', msg: 'INSERT 15 → 15 < 20, go left child' });
  s.vars = { target: 15, level: 2, comparisons: 6, found: false };
  snap(steps, s, 'Insert 15: 15 < 20, go to left child [5, 10].', 11, 'O(log n) insert');

  s.nodes[0].active = false;
  s.nodes[1].active = true;
  snap(steps, s, 'Left node [5, 10] is full. Must split again! Median 10 moves up to root.', 12, 'O(log n) split');

  s.nodes = [
    { id: 'root', keys: [10, 20], children: ['ll', 'lm', 'right'], type: 'internal', active: true },
    { id: 'll', keys: [5], children: [], type: 'leaf', active: false },
    { id: 'lm', keys: [15], children: [], type: 'leaf', active: false },
    { id: 'right', keys: [30], children: [], type: 'leaf', active: false },
  ];
  s.metrics.splits = 2;
  s.metrics.comparisons = 7;
  s.vars = { target: 15, level: 2, comparisons: 7, found: false };
  snap(steps, s, 'Split! Root now [10, 20]. Leaves: [5], [15], [30]. Balanced B-Tree.', 13, 'O(log n) split');

  // Now search for 15
  s.operation = 'search';
  s.target = 15;
  s.nodes.forEach((n) => { n.active = false; });
  s.events.push({ type: 'info', msg: 'SEARCH 15 → start at root' });
  s.vars = { target: 15, level: 0, comparisons: 0, found: false };
  snap(steps, s, 'Now searching for key 15. Start at root node [10, 20].', 14, 'O(log n) search');

  s.nodes[0].active = true;
  s.vars = { target: 15, level: 1, comparisons: 1, found: false };
  snap(steps, s, 'At root [10, 20]: 15 > 10 and 15 < 20. Traverse middle child pointer.', 15, 'O(log n) search');

  s.nodes[0].active = false;
  s.nodes[2].active = true;
  s.vars = { target: 15, level: 2, comparisons: 3, found: false };
  snap(steps, s, 'At leaf [15]: key 15 found! B-Tree search in 2 levels, 3 comparisons.', 16, 'O(log n) search');

  s.nodes[2].keys = [15];
  s.vars = { target: 15, level: 2, comparisons: 3, found: true };
  s.events.push({ type: 'ok', msg: 'FOUND key=15 in 3 comparisons, depth=2' });
  snap(steps, s, 'Search complete! Key 15 found in O(log n) time. B-Tree advantage: balanced, fast range queries.', 17, 'O(log n) search');

  return steps;
}

export const BTREE_CODE = [
  '-- Create B-Tree index',
  'CREATE INDEX idx_users_age ON users(age);',
  '',
  '-- Insert triggers B-Tree update',
  'INSERT INTO users (id, name, age) VALUES (1, "Alice", 30);',
  '',
  '-- Node split when order exceeded',
  '-- B-Tree auto-rebalances on overflow',
  '',
  '-- Point lookup (uses index)',
  'SELECT * FROM users WHERE age = 30;',
  '-- EXPLAIN: Index Scan on idx_users_age',
  '--          cost=0.29..8.31 rows=1',
  '',
  '-- Range query (very efficient in B-Tree)',
  'SELECT * FROM users WHERE age BETWEEN 20 AND 40;',
  '-- EXPLAIN: Bitmap Index Scan',
  '--          cost=0.29..12.01 rows=50',
];

export default {
  id: 'btree',
  label: 'B-Tree Index',
  icon: '🌲',
  build: buildBTreeSteps,
  code: BTREE_CODE,
  language: 'SQL',
  metrics: [
    { key: 'comparisons', label: 'Comparisons', max: 20, color: 'var(--node-active)', warn: 60, critical: 85 },
    { key: 'splits',      label: 'Splits',      max: 5,  color: 'var(--node-comparing)' },
    { key: 'depth',       label: 'Tree Depth',  max: 4,  color: 'var(--node-visited)' },
  ],
};

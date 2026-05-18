import { snap, makeRow } from './shared';

const SAMPLE_ROWS = [
  makeRow(1, 'Alice',   28, 'CA'),
  makeRow(2, 'Bob',     35, 'NY'),
  makeRow(3, 'Carol',   28, 'TX'),
  makeRow(4, 'Dave',    42, 'CA'),
  makeRow(5, 'Eve',     28, 'FL'),
  makeRow(6, 'Frank',   31, 'NY'),
  makeRow(7, 'Grace',   28, 'CA'),
  makeRow(8, 'Heidi',   55, 'TX'),
  makeRow(9, 'Ivan',    28, 'WA'),
  makeRow(10, 'Judy',   29, 'CA'),
];

function buildIndexingSteps() {
  const steps = [];

  const s = {
    rows: SAMPLE_ROWS.map((r) => ({ ...r })),
    index: null,
    plan: 'seq-scan',
    scanned: 0,
    matched: 0,
    events: [],
    metrics: { scanned: 0, matched: 0, costReduction: 0 },
    vars: { rows: 1000, scanned: 0, plan: 'seq-scan', matched: 0 },
  };

  snap(steps, s, 'Table "users" with 10 rows (representing 1000 in production). No index on "age".', 1, 'O(n) full scan');

  // Sequential scan phase
  s.events.push({ type: 'info', msg: 'EXPLAIN SELECT * FROM users WHERE age = 28' });
  s.events.push({ type: 'warn', msg: 'Seq Scan on users (cost=0.00..20.00 rows=1000)' });
  snap(steps, s, 'Query: SELECT * FROM users WHERE age = 28. No index → Sequential Scan (full table scan).', 2, 'O(n) full scan');

  for (let i = 0; i < s.rows.length; i++) {
    s.rows[i].active = true;
    s.scanned = i + 1;
    s.metrics.scanned = i + 1;
    s.vars = { rows: 1000, scanned: i + 1, plan: 'seq-scan', matched: s.matched };

    if (s.rows[i].age === 28) {
      s.rows[i].matched = true;
      s.matched += 1;
      s.metrics.matched = s.matched;
      snap(steps, s, `Seq scan: row ${i + 1} — age=${s.rows[i].age} MATCHES. Scanned ${i + 1}/${s.rows.length} rows.`, 3, 'O(n) full scan');
    } else {
      snap(steps, s, `Seq scan: row ${i + 1} — age=${s.rows[i].age} ≠ 28. Keep scanning.`, 3, 'O(n) full scan');
    }

    s.rows[i].active = false;
  }

  snap(steps, s, `Sequential scan complete: scanned ALL ${s.rows.length} rows, found ${s.matched} matches. Very costly for large tables!`, 4, 'O(n) full scan');

  // Reset and create index
  s.rows.forEach((r) => { r.active = false; r.matched = false; });
  s.scanned = 0;
  s.matched = 0;
  s.metrics.scanned = 0;
  s.metrics.matched = 0;
  s.vars = { rows: 1000, scanned: 0, plan: 'seq-scan', matched: 0 };
  s.events.push({ type: 'info', msg: 'CREATE INDEX idx_users_age ON users(age)' });
  snap(steps, s, 'Now creating a B-Tree index on the "age" column. Index is built in O(n log n).', 5, 'O(n log n) build');

  s.index = {
    field: 'age',
    tree: [
      { key: 28, rowIds: [1, 3, 5, 7, 9] },
      { key: 29, rowIds: [10] },
      { key: 31, rowIds: [6] },
      { key: 35, rowIds: [2] },
      { key: 42, rowIds: [4] },
      { key: 55, rowIds: [8] },
    ],
  };
  s.events.push({ type: 'ok', msg: 'Index created: idx_users_age (B-Tree)' });
  snap(steps, s, 'Index created! B-Tree maps age values → row pointers. Now repeat the same query.', 6, 'O(log n) index');

  // Index scan
  s.plan = 'index-scan';
  s.events.push({ type: 'ok', msg: 'EXPLAIN: Index Scan using idx_users_age (cost=0.29..4.31)' });
  s.vars = { rows: 1000, scanned: 0, plan: 'index-scan', matched: 0 };
  snap(steps, s, 'Query planner chooses Index Scan! B-Tree lookup for age=28 → O(log n) pointer lookup.', 7, 'O(log n) index');

  // Only scan matching rows
  const matchingIds = [1, 3, 5, 7, 9];
  for (const id of matchingIds) {
    const row = s.rows.find((r) => r.id === id);
    if (row) {
      row.active = true;
      row.matched = true;
      s.scanned += 1;
      s.matched += 1;
      s.metrics.scanned = s.scanned;
      s.metrics.matched = s.matched;
      s.metrics.costReduction = Math.round((1 - s.scanned / s.rows.length) * 100);
      s.vars = { rows: 1000, scanned: s.scanned, plan: 'index-scan', matched: s.matched };
      snap(steps, s, `Index scan: fetched row ${id} directly via pointer. Only matching rows accessed!`, 8, 'O(log n) index');
      row.active = false;
    }
  }

  snap(steps, s, `Index scan done! Accessed only ${s.scanned} rows (vs ${s.rows.length} in seq scan). ${s.metrics.costReduction}% cost reduction!`, 9, 'O(log n) index');

  return steps;
}

export const INDEXING_CODE = [
  '-- Without index: Sequential Scan',
  'EXPLAIN ANALYZE',
  'SELECT * FROM users WHERE age = 28;',
  '-- Seq Scan on users',
  '--   cost=0.00..20.10 rows=1000',
  '--   actual time=0.023..15.3 ms',
  '',
  '-- Create B-Tree index',
  'CREATE INDEX idx_users_age ON users(age);',
  '',
  '-- With index: Index Scan',
  'EXPLAIN ANALYZE',
  'SELECT * FROM users WHERE age = 28;',
  '-- Index Scan using idx_users_age',
  '--   cost=0.29..4.31 rows=5',
  '--   actual time=0.023..0.12 ms',
  '',
  '-- Range query with index',
  'SELECT * FROM users WHERE age BETWEEN 25 AND 35;',
  '-- Bitmap Index Scan → Bitmap Heap Scan',
];

export default {
  id: 'indexing',
  label: 'Query Planning',
  icon: '📋',
  build: buildIndexingSteps,
  code: INDEXING_CODE,
  language: 'SQL',
  metrics: [
    { key: 'scanned',      label: 'Rows Scanned', max: 10,  color: 'var(--node-comparing)', warn: 70, critical: 90 },
    { key: 'matched',      label: 'Rows Matched', max: 10,  color: 'var(--node-active)' },
    { key: 'costReduction', label: 'Cost Saved %', max: 100, unit: '%', color: 'var(--pod-running)' },
  ],
};

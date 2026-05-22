import { snap } from '@/core/utils/scenarioShared';

const LEFT_TABLE = [
  { id: 1, name: 'Alice',   deptId: 10 },
  { id: 2, name: 'Bob',     deptId: 20 },
  { id: 3, name: 'Carol',   deptId: 10 },
  { id: 4, name: 'Dave',    deptId: 30 },
];

const RIGHT_TABLE = [
  { id: 10, dept: 'Engineering' },
  { id: 20, dept: 'Marketing' },
  { id: 30, dept: 'Sales' },
];

function buildJoinsSteps() {
  const steps = [];

  const s = {
    leftTable: LEFT_TABLE.map((r) => ({ ...r, active: false, matched: false })),
    rightTable: RIGHT_TABLE.map((r) => ({ ...r, active: false, matched: false })),
    algorithm: 'hash',
    joined: [],
    hashTable: {},
    comparisons: 0,
    events: [],
    metrics: { comparisons: 0, joined: 0, hashBuilt: 0 },
    vars: { algorithm: 'hash', outerRow: 1, innerRow: 0, comparisons: 0, joined: 0 },
  };

  snap(steps, s, 'Join employees (left) with departments (right). Query: SELECT name, dept FROM employees e JOIN departments d ON e.dept_id = d.id.', 1, 'O(n+m) hash join');

  // === HASH JOIN ===
  s.events.push({ type: 'info', msg: 'Algorithm: Hash Join — build phase on smaller table' });
  snap(steps, s, 'Hash Join: Phase 1 — Build hash table from the smaller table (departments).', 2, 'O(m) build phase');

  for (const dept of s.rightTable) {
    dept.active = true;
    s.hashTable[dept.id] = dept.dept;
    s.metrics.hashBuilt = Object.keys(s.hashTable).length;
    s.events.push({ type: 'info', msg: `Hash: dept_id=${dept.id} → "${dept.dept}"` });
    snap(steps, s, `Build phase: hash[${dept.id}] = "${dept.dept}". Hash table has ${s.metrics.hashBuilt} entries.`, 3, 'O(m) build phase');
    dept.active = false;
  }

  snap(steps, s, 'Hash table built from departments. Phase 2: Probe — scan employees, lookup in O(1) per row.', 4, 'O(n) probe phase');

  for (const emp of s.leftTable) {
    emp.active = true;
    s.comparisons += 1;
    s.metrics.comparisons = s.comparisons;
    s.vars = { algorithm: 'hash', outerRow: emp.id, innerRow: emp.deptId, comparisons: s.comparisons, joined: s.joined.length };

    const dept = s.hashTable[emp.deptId];
    if (dept) {
      const matchingDept = s.rightTable.find((d) => d.id === emp.deptId);
      if (matchingDept) matchingDept.active = true;
      emp.matched = true;
      s.joined.push({ name: emp.name, dept });
      s.metrics.joined = s.joined.length;
      snap(steps, s, `Probe: ${emp.name}.deptId=${emp.deptId} → hash lookup → "${dept}" MATCH! O(1) lookup.`, 5, 'O(1) probe');
      if (matchingDept) matchingDept.active = false;
    } else {
      snap(steps, s, `Probe: ${emp.name}.deptId=${emp.deptId} → no match in hash table.`, 5, 'O(1) probe');
    }
    emp.active = false;
  }

  snap(steps, s, `Hash Join complete! ${s.joined.length} rows joined. Total comparisons: ${s.comparisons}. Hash Join = O(n+m) time, O(m) space.`, 6, 'O(n+m) hash join');

  // === NESTED LOOP (reset) ===
  s.leftTable.forEach((r) => { r.active = false; r.matched = false; });
  s.rightTable.forEach((r) => { r.active = false; r.matched = false; });
  s.joined = [];
  s.hashTable = {};
  s.comparisons = 0;
  s.algorithm = 'nested-loop';
  s.metrics = { comparisons: 0, joined: 0, hashBuilt: 0 };
  s.events.push({ type: 'warn', msg: 'Algorithm: Nested Loop Join — O(n×m) for unindexed join' });
  s.vars = { algorithm: 'nested-loop', outerRow: 1, innerRow: 0, comparisons: 0, joined: 0 };
  snap(steps, s, 'Now: Nested Loop Join. For each outer row, scan ALL inner rows. O(n×m) — very slow without index!', 7, 'O(n×m) nested loop');

  for (const emp of s.leftTable) {
    emp.active = true;
    for (const dept of s.rightTable) {
      dept.active = true;
      s.comparisons += 1;
      s.metrics.comparisons = s.comparisons;
      s.vars = { algorithm: 'nested-loop', outerRow: emp.id, innerRow: dept.id, comparisons: s.comparisons, joined: s.joined.length };

      if (emp.deptId === dept.id) {
        emp.matched = true;
        dept.matched = true;
        s.joined.push({ name: emp.name, dept: dept.dept });
        s.metrics.joined = s.joined.length;
        snap(steps, s, `Nested Loop: ${emp.name} × ${dept.dept} → MATCH! Comparisons so far: ${s.comparisons}.`, 8, 'O(n×m) nested loop');
        dept.matched = false;
      } else {
        snap(steps, s, `Nested Loop: ${emp.name} × ${dept.dept} → no match. Comparison #${s.comparisons}.`, 8, 'O(n×m) nested loop');
      }
      dept.active = false;
    }
    emp.active = false;
  }

  snap(steps, s, `Nested Loop done! ${s.joined.length} rows joined in ${s.comparisons} comparisons (n×m = ${LEFT_TABLE.length}×${RIGHT_TABLE.length}). Compare to Hash Join: much slower!`, 9, 'O(n×m) nested loop');

  return steps;
}

export const JOINS_CODE = [
  '-- Hash Join (planner default for large tables)',
  'EXPLAIN ANALYZE',
  'SELECT e.name, d.dept',
  'FROM employees e',
  'JOIN departments d ON e.dept_id = d.id;',
  '',
  '-- Hash Join  (cost=1.07..2.20)',
  '--   Hash Cond: (e.dept_id = d.id)',
  '--   ->  Seq Scan on departments  (build)',
  '--   ->  Seq Scan on employees    (probe)',
  '',
  '-- Nested Loop (small tables / indexed)',
  '-- Nested Loop  (cost=0.15..1.30)',
  '--   ->  Seq Scan on employees',
  '--   ->  Index Scan using dept_pkey',
  '',
  '-- Sort-Merge Join (pre-sorted data)',
  '-- Merge Join  (cost=2.07..3.00)',
  '--   Merge Cond: (e.dept_id = d.id)',
  '--   ->  Sort on employees.dept_id',
  '--   ->  Sort on departments.id',
];

export default {
  id: 'joins',
  label: 'Join Algorithms',
  icon: '🔗',
  build: buildJoinsSteps,
  code: JOINS_CODE,
  language: 'SQL',
  metrics: [
    { key: 'comparisons', label: 'Comparisons', max: 20, color: 'var(--node-comparing)', warn: 60, critical: 85 },
    { key: 'joined',      label: 'Rows Joined', max: 5,  color: 'var(--node-active)' },
    { key: 'hashBuilt',   label: 'Hash Entries', max: 5, color: 'var(--kafka-producer)' },
  ],
};

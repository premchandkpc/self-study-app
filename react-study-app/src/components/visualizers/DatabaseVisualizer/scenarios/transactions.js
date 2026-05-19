import { snap } from '@/core/utils/scenarioShared';

function buildTransactionSteps() {
  const steps = [];

  const makeState = () => ({
    transactions: [
      { id: 'T1', status: 'idle', snapshot: 100, ops: [] },
      { id: 'T2', status: 'idle', snapshot: 100, ops: [] },
    ],
    rows: [
      { id: 1, val: 100, version: 1, lockedBy: null, visible: { T1: 100, T2: 100 } },
    ],
    locks: [],
    events: [],
    metrics: { commits: 0, rollbacks: 0, conflicts: 0 },
    vars: { T1: 'idle', T2: 'idle', isolation: 'READ_COMMITTED', conflict: false },
  });

  let s = makeState();

  snap(steps, s, 'Two transactions T1 and T2 start. Shared row: account_id=1, balance=100. Isolation: READ COMMITTED.', 1, 'O(1) txn');

  // T1 begins
  s.transactions[0].status = 'active';
  s.events.push({ type: 'info', msg: 'T1: BEGIN' });
  s.vars = { T1: 'active', T2: 'idle', isolation: 'READ_COMMITTED', conflict: false };
  snap(steps, s, 'T1 starts with BEGIN. Transaction ID assigned, snapshot version = 100.', 2, 'O(1) txn');

  // T2 begins
  s.transactions[1].status = 'active';
  s.events.push({ type: 'info', msg: 'T2: BEGIN' });
  s.vars = { T1: 'active', T2: 'active', isolation: 'READ_COMMITTED', conflict: false };
  snap(steps, s, 'T2 also starts. Both transactions active concurrently. MVCC creates isolated snapshots.', 3, 'O(1) txn');

  // T1 reads
  s.transactions[0].ops.push('READ balance=100');
  s.events.push({ type: 'info', msg: 'T1: SELECT balance FROM accounts WHERE id=1 → 100' });
  snap(steps, s, 'T1 reads balance: sees 100 (current committed version). No lock acquired for reads in READ COMMITTED.', 4, 'O(1) read');

  // T1 acquires write lock
  s.rows[0].lockedBy = 'T1';
  s.locks = [{ resource: 'row:1', holder: 'T1', type: 'EXCLUSIVE' }];
  s.transactions[0].ops.push('LOCK row:1 (exclusive)');
  s.events.push({ type: 'warn', msg: 'T1: Acquires exclusive lock on row 1' });
  snap(steps, s, 'T1 acquires exclusive write lock on row 1. T2 will block if it tries to write.', 5, 'O(1) lock');

  // T1 updates
  s.transactions[0].ops.push('UPDATE balance = 150');
  s.rows[0].val = 150;
  s.rows[0].version = 2;
  s.rows[0].visible = { T1: 150, T2: 100 }; // MVCC: T2 still sees old version
  s.events.push({ type: 'info', msg: 'T1: UPDATE accounts SET balance=150 WHERE id=1' });
  s.vars = { T1: 'active', T2: 'active', isolation: 'READ_COMMITTED', conflict: false };
  snap(steps, s, 'T1 updates balance to 150. MVCC creates new version (v2). T2 still sees v1 (balance=100) — no dirty read!', 6, 'O(1) write');

  // T2 tries to read (sees old version via MVCC)
  s.transactions[1].ops.push('READ balance=100 (MVCC snapshot)');
  s.events.push({ type: 'ok', msg: 'T2: SELECT balance → 100 (committed snapshot, not dirty data)' });
  snap(steps, s, 'T2 reads balance: MVCC returns committed snapshot value = 100. T2 never sees T1\'s uncommitted 150. ACID holds!', 7, 'O(1) read');

  // T2 tries to write (blocks on lock)
  s.transactions[1].status = 'waiting';
  s.events.push({ type: 'warn', msg: 'T2: UPDATE blocked! T1 holds exclusive lock on row 1' });
  s.vars = { T1: 'active', T2: 'waiting', isolation: 'READ_COMMITTED', conflict: true };
  snap(steps, s, 'T2 tries to UPDATE balance. Blocked — T1 holds exclusive lock. This prevents lost updates (write-write conflict).', 8, 'O(1) wait');

  // T1 commits
  s.transactions[0].status = 'committed';
  s.rows[0].lockedBy = null;
  s.locks = [];
  s.rows[0].visible = { T1: 150, T2: 150 };
  s.events.push({ type: 'ok', msg: 'T1: COMMIT → balance=150 now visible to all' });
  s.metrics.commits = 1;
  s.vars = { T1: 'committed', T2: 'active', isolation: 'READ_COMMITTED', conflict: false };
  snap(steps, s, 'T1 commits! Balance 150 now durable. Lock released. T2 unblocked. READ COMMITTED: T2 now sees 150.', 9, 'O(1) commit');

  // T2 proceeds
  s.transactions[1].status = 'active';
  s.transactions[1].ops.push('READ balance=150 (updated after T1 commit)');
  s.events.push({ type: 'info', msg: 'T2: SELECT balance → 150 (T1 committed)' });
  snap(steps, s, 'T2 now reads 150 (T1\'s committed value). In READ COMMITTED isolation, T2 sees the latest committed data.', 10, 'O(1) read');

  // T2 updates
  s.rows[0].lockedBy = 'T2';
  s.rows[0].val = 120;
  s.rows[0].version = 3;
  s.transactions[1].ops.push('UPDATE balance = 120, COMMIT');
  s.events.push({ type: 'ok', msg: 'T2: UPDATE balance=120, COMMIT' });
  s.metrics.commits = 2;
  s.vars = { T1: 'committed', T2: 'committed', isolation: 'READ_COMMITTED', conflict: false };
  snap(steps, s, 'T2 updates to 120 and commits. ACID properties maintained: Atomicity, Consistency, Isolation, Durability.', 11, 'O(1) commit');

  s.rows[0].lockedBy = null;
  s.transactions[1].status = 'committed';
  s.rows[0].visible = { T1: 120, T2: 120 };
  snap(steps, s, 'Both transactions committed. Final balance = 120. No dirty reads, no lost updates. MVCC + locks = ACID compliance.', 12, 'O(1) done');

  return steps;
}

export const TRANSACTIONS_CODE = [
  '-- Transaction 1',
  'BEGIN;',
  'SELECT balance FROM accounts WHERE id = 1;',
  '-- Returns: 100 (read committed)',
  '',
  '-- Acquire write lock',
  'UPDATE accounts SET balance = 150 WHERE id = 1;',
  '-- T2 blocked until T1 commits',
  '',
  'COMMIT; -- balance = 150 visible to all',
  '',
  '-- Transaction 2 (concurrent)',
  'BEGIN;',
  'SELECT balance FROM accounts WHERE id = 1;',
  '-- Returns: 100 (MVCC snapshot, not dirty)',
  '',
  '-- Waits for T1 lock release...',
  'UPDATE accounts SET balance = 120 WHERE id = 1;',
  'COMMIT;',
  '',
  '-- Isolation levels:',
  '-- READ COMMITTED: no dirty reads',
  '-- REPEATABLE READ: no non-repeatable reads',
  '-- SERIALIZABLE: no phantom reads',
];

export default {
  id: 'transactions',
  label: 'ACID Transactions',
  icon: '🔒',
  build: buildTransactionSteps,
  code: TRANSACTIONS_CODE,
  language: 'SQL',
  metrics: [
    { key: 'commits',   label: 'Commits',    max: 5,  color: 'var(--pod-running)' },
    { key: 'rollbacks', label: 'Rollbacks',  max: 5,  color: 'var(--pod-crash)' },
    { key: 'conflicts', label: 'Conflicts',  max: 5,  color: 'var(--node-comparing)', warn: 50, critical: 80 },
  ],
};

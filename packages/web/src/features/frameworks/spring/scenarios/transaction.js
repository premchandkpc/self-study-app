import { snap } from '@/core/utils/scenarioShared';

function item(value, state = 'idle') { return { value: String(value), state }; }
function baseState(label) {
  return { collectionType: 'spring', stages: [], result: null, opsLog: [], pipelineLabel: label };
}

export const TRANSACTION_SCENARIOS = [
  {
    id: 'tx-required', label: 'Propagation REQUIRED', icon: '🔗',
    category: 'transaction', collectionType: 'spring',
    code: [
      '@Transactional(propagation = Propagation.REQUIRED)  // default',
      'public void outerMethod() {',
      '    innerMethod();  // joins same tx',
      '}',
      '',
      '@Transactional(propagation = Propagation.REQUIRED)',
      'public void innerMethod() { }',
      '',
      '// REQUIRED: JOIN existing tx or CREATE new if none',
      '// innerMethod joins outerMethod\'s tx → ONE tx total',
      '// ANY rollback in either → ALL rollback',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('REQUIRED — Join existing or create new (default)');
      s.stages = [
        { op: 'No TX exists', type: 'state', items: [], active: false },
        { op: 'outerMethod() starts', type: 'action', items: [], active: false },
        { op: 'TX created', type: 'tx', items: [], active: false },
        { op: 'innerMethod() joins', type: 'action', items: [], active: false },
        { op: 'Same TX', type: 'tx', items: [], active: false },
      ];
      snap(steps, s, 'REQUIRED (default): If NO transaction exists → create new. IF transaction EXISTS → join it. Spring creates/manages via TransactionManager.getTransaction().', 0);

      s.stages[0].items = [item('No active transaction on current thread')];
      s.stages[0].active = true;
      snap(steps, s, 'Before outerMethod(): no transaction bound to thread (TransactionSynchronizationManager).', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('outerMethod() calls proxy → @Transactional detected')];
      snap(steps, s, 'Proxy intercepts outerMethod(). Detects @Transactional(REQUIRED). No existing tx → must create new.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('TX#4711: Connection.setAutoCommit(false)')];
      s.opsLog.push({ msg: 'TransactionManager: new transaction TX#4711 created', type: 'ok' });
      snap(steps, s, 'TransactionManager creates TX#4711. Gets Connection from pool, disables auto-commit, binds to thread. TransactionSynchronizationManager.initSynchronizations() called.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('innerMethod() checks @Transactional → existing TX? YES → join')];
      snap(steps, s, 'outerMethod() calls innerMethod(). innerMethod also has @Transactional(REQUIRED). Proxy checks: existing tx? YES (TX#4711). Joins same tx — no new tx created.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('TX#4711: inner saves + outer saves → ONE tx')];
      s.opsLog.push({ msg: 'ONE transaction for both methods. Both operations in same tx', type: 'ok' });
      s.opsLog.push({ msg: 'inner rollback → outer rollback (both rollback together)', type: 'warn' });
      s.result = 'Result: SAME transaction for both. All-or-nothing.';
      snap(steps, s, 'Both methods execute in TX#4711. innerMethod() rolls back → entire TX#4711 rolls back (including outer changes). ALL-or-nothing. Required for write operations where atomicity matters.', 5);
      return steps;
    },
  },
  {
    id: 'tx-requires-new', label: 'Propagation REQUIRES_NEW', icon: '🆕',
    category: 'transaction', collectionType: 'spring',
    code: [
      '@Transactional(propagation = Propagation.REQUIRES_NEW)',
      'public void logAudit(AuditEntry entry) {',
      '    auditRepo.save(entry);',  '    // Suspends parent TX, creates own, commits independently',
      '}',
      '',
      '// Parent TX SUSPENDED → child TX runs independently',
      '// Child commits/rollbacks WITHOUT affecting parent',
      '// Parent resumes after child completes',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('REQUIRES_NEW — Suspend parent, create independent child');
      s.stages = [
        { op: 'Parent TX active', type: 'tx', items: [], active: false },
        { op: 'call logAudit()', type: 'action', items: [], active: false },
        { op: 'SUSPEND parent TX', type: 'tx', items: [], active: false },
        { op: 'CREATE NEW TX', type: 'tx', items: [], active: false },
        { op: 'New TX commits/rollbacks', type: 'tx', items: [], active: false },
        { op: 'RESUME parent TX', type: 'tx', items: [], active: false },
      ];
      snap(steps, s, 'REQUIRES_NEW: ALWAYS create new transaction. If existing: SUSPEND it (pause), create new, run, commit new, RESUME suspended. Child COMMITS or ROLLS BACK independently. Parent unaffected by child outcome.', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('TX#100 (parent): order processing')];
      snap(steps, s, 'Parent transaction TX#100 active. Order processing in progress: inventory check, payment capture.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('service.logAudit(entry)')];
      s.opsLog.push({ msg: 'logAudit() has @Transactional(REQUIRES_NEW)', type: 'ok' });
      snap(steps, s, 'Parent calls logAudit(). Proxy detects REQUIRES_NEW on logAudit.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('TX#100 → SUSPENDED'), item('TransactionSynchronizationManager.unbindResource()')];
      s.opsLog.push({ msg: 'Parent TX#100 suspended — Connection returned temporarily', type: 'ok' });
      snap(steps, s, 'Parent transaction TX#100 SUSPENDED. Connection/resources unbound from thread. Suspended transaction stored in a holder (TransactionManager handles suspend/resume).', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('TX#200 CREATED (new Connection, autoCommit=false)')];
      s.opsLog.push({ msg: 'NEW TX#200 created for logAudit() — separate Connection', type: 'ok' });
      snap(steps, s, 'New TX#200 created. Gets NEW Connection from pool, disables auto-commit. COMPLETELY independent from TX#100. Separate resources, separate timeout, separate isolation level.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('auditRepo.save(entry) → COMMIT TX#200')];
      s.opsLog.push({ msg: 'TX#200 commits ✓', type: 'ok' });
      s.opsLog.push({ msg: 'TX#200 rolls back → parent TX#100 NOT affected!', type: 'warn' });
      snap(steps, s, 'TX#200 runs and COMMITS. Even if parent later rolls back, audit log is persisted (audit log should survive). If TX#200 rolls back → parent TX#100 is UNAFFECTED. Child rollback does NOT propagate to parent.', 5);

      s.stages[4].active = false; s.stages[5].active = true;
      s.stages[5].items = [item('TX#100 → RESUMED'), item('Parent continues with original Connection')];
      s.opsLog.push({ msg: 'TX#100 resumed — Connection rebound to thread', type: 'ok' });
      s.result = 'TX#200 independent. TX#100 unaffected. Audit saved even if parent rolls back.';
      snap(steps, s, 'TX#200 done. Suspended TX#100 is RESUMED. Connection rebound to thread. Parent continues where it left off. Use REQUIRES_NEW for: audit logs, async operations, retry logic, operations that must persist regardless of parent outcome.', 6);
      return steps;
    },
  },
  {
    id: 'tx-nested', label: 'Propagation NESTED', icon: '🪆',
    category: 'transaction', collectionType: 'spring',
    code: [
      '@Transactional(propagation = Propagation.NESTED)',
      'public void subOperation() {',
      '    // Runs within parent TX, but with SAVEPOINT',
      '    // Rollback subOperation → rollback to savepoint ONLY',
      '    // NOT full parent rollback!',
      '}',
      '',
      '// JDBC-only (savepoint support). NOT JPA!',
      '// Sub-operations can rollback independently within parent tx',
      '// Parent can catch and continue',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('NESTED — Savepoint-based subtransaction (JDBC only)');
      s.stages = [
        { op: 'Parent TX active', type: 'tx', items: [], active: false },
        { op: 'call subOperation()', type: 'action', items: [], active: false },
        { op: 'Savepoint created', type: 'tx', items: [], active: false },
        { op: 'subOperation ROLLBACK', type: 'tx', items: [], active: false },
        { op: 'Rollback to Savepoint', type: 'tx', items: [], active: false },
      ];
      snap(steps, s, 'NESTED: runs within parent transaction BUT creates a SAVEPOINT. Rollback of nested → rollback to savepoint, parent unaffected. JDBC-only (savepoint support). Requires DataSourceTransactionManager. NOT supported by JpaTransactionManager!', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('TX#1 (parent): batch processing')];
      snap(steps, s, 'Parent TX#1 active. Processing batch of records with sub-operation validation.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('subOperation(record#5)')];
      s.opsLog.push({ msg: 'NESTED: runs inside parent TX, no new transaction', type: 'ok' });
      snap(steps, s, 'subOperation() called with Propagation.NESTED. NOT a new transaction — runs in same transaction. Spring sets a JDBC Savepoint on the current Connection.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('SAVEPOINT "SP5" created on Connection')];
      s.opsLog.push({ msg: 'Savepoint "SP5" created via Connection.setSavepoint()', type: 'ok' });
      snap(steps, s, 'JDBC Savepoint created: Connection.setSavepoint(). This marks the current state of data within TX#1. Savepoint name usually auto-generated (or custom).', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('subOperation(record#5) → FAILS!'), item('DataIntegrityViolationException')];
      s.opsLog.push({ msg: '❌ subOperation throws DataIntegrityViolationException', type: 'error' });
      snap(steps, s, 'subOperation fails (invalid data). NESTED propagation means this triggers rollback to savepoint, NOT full parent rollback.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('Connection.rollback(SP5) — undo subOperation ONLY'), item('Parent TX#1 continues! record#6,7,8... processed')];
      s.opsLog.push({ msg: 'Rolled back to savepoint SP5. Parent TX#1 continues unaffected!', type: 'ok' });
      s.opsLog.push({ msg: 'Compare: REQUIRES_NEW = independent tx. NESTED = savepoint in same tx.', type: 'ok' });
      s.result = 'NESTED rolled back to savepoint. Parent continues. Record#5 skipped, batch continues.';
      snap(steps, s, 'Connection.rollback(SP5) undoes only changes made since savepoint. Parent transaction TX#1 continues (remaining records processed). NESTED vs REQUIRES_NEW: NESTED = savepoint in same tx (can be fully rolled back together). REQUIRES_NEW = separate tx (independent, more overhead).', 5);
      return steps;
    },
  },
  {
    id: 'tx-rollback', label: 'Rollback Rules', icon: '🎲',
    category: 'transaction', collectionType: 'spring',
    code: [
      '@Transactional(',
      '    rollbackFor = {DataAccessException.class, BusinessException.class},',
      '    noRollbackFor = {ValidationException.class},',
      '    timeout = 30,',
      '    readOnly = true',
      ')',
      '// Default: rollback on RuntimeException/Error',
      '// NO rollback on checked exceptions',
      '// rollbackFor: override to include checked exceptions',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Rollback Rules: Defaults + Customization');
      s.stages = [
        { op: 'method() executes in TX', type: 'tx', items: [], active: false },
        { op: 'SUCCESS', type: 'outcome', items: [], active: false },
        { op: 'RuntimeException', type: 'outcome', items: [], active: false },
        { op: 'Checked Exception', type: 'outcome', items: [], active: false },
        { op: 'Custom rollbackFor', type: 'outcome', items: [], active: false },
      ];
      snap(steps, s, 'Default rollback: RUNTIME EXCEPTIONS + ERRORS → rollback. CHECKED EXCEPTIONS → commit. Customize: rollbackFor (include checked), noRollbackFor (exclude runtime), rollbackForClassName, noRollbackForClassName.', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('TX active — target method running')];
      snap(steps, s, 'Transaction active. Method executes business logic. What happens next depends on outcome.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('Method returns normally → COMMIT ✓')];
      s.opsLog.push({ msg: 'SUCCESS: TransactionManager.commit()', type: 'ok' });
      snap(steps, s, 'Method returns normally/no exception. TransactionManager.commit() flushes changes, commits to DB. Synchronizations: afterCommit() → afterCompletion().', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('NullPointerException → ROLLBACK')];
      s.opsLog.push({ msg: 'RuntimeException: ROLLBACK (default rule)', type: 'warn' });
      snap(steps, s, 'RuntimeException or Error → TRANSACTION ROLLBACK. TransactionManager.rollback(). Connection.rollback() called. Synchronizations: afterCompletion(STATUS_ROLLED_BACK). Even if caught in parent caller: tx already marked rollback-only!', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('SQLException (checked) → COMMIT (default!)')];
      s.opsLog.push({ msg: '⚠️ Checked exception → COMMITS by default!', type: 'error' });
      snap(steps, s, 'Checked exception (SQLException, IOException): DEFAULT = COMMIT. This surprises many! Checked exceptions are "expected" — Spring assumes they are handled. Data may be partially committed. This is WHY rollbackFor is critical.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('@Transactional(rollbackFor = SQLException.class)'), item('→ now SQLException ROLLBACKS ✓')];
      s.opsLog.push({ msg: 'rollbackFor = SQLException.class → CHECKED exception now rolls back', type: 'ok' });
      s.opsLog.push({ msg: 'noRollbackFor = ValidationException.class → even RuntimeException might commit', type: 'ok' });
      s.result = 'Default: Runtime=rollback, Checked=commit. Customize with rollbackFor/noRollbackFor.';
      snap(steps, s, 'Custom rules: rollbackFor = {SQLException.class} → now SQLException rolls back. noRollbackFor = {ValidationException.class} → even RuntimeException subtypes of ValidationException commit. Also: timeout fails → rollback. readOnly=true → flushes disabled (optimization hint for Hibernate).', 5);
      return steps;
    },
  },
];

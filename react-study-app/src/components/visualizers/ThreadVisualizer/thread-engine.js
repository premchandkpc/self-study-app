export function buildThreadSteps(scenario = 'mutex') {
  if (scenario === 'mutex')    return buildMutexSteps();
  if (scenario === 'deadlock') return buildDeadlockSteps();
  if (scenario === 'semaphore')return buildSemaphoreSteps();
  return buildMutexSteps();
}

const T_STATES = { NEW: 'new', RUNNABLE: 'runnable', RUNNING: 'running', BLOCKED: 'blocked', WAITING: 'waiting', TERMINATED: 'terminated' };

function thread(id, name) {
  return { id, name, state: T_STATES.NEW, holds: [], wants: null, ops: 0 };
}

function lock(id) {
  return { id, holder: null, queue: [] };
}

function snap(steps, s, narration, codeLine = null) {
  steps.push({ ...JSON.parse(JSON.stringify(s)), narration, codeLine, complexity: { ops: steps.length + 1, label: 'concurrent', space: 'O(threads)' } });
}

/* ── MUTEX ── */
function buildMutexSteps() {
  const steps = [];
  const s = { threads: [thread('T1', 'Thread-1'), thread('T2', 'Thread-2')], locks: [lock('μ1')], semaphore: null, events: [] };

  snap(steps, s, 'Two threads: Thread-1, Thread-2. Mutex μ1 available.', 1);

  s.threads[0].state = T_STATES.RUNNABLE;
  s.threads[1].state = T_STATES.RUNNABLE;
  snap(steps, s, 'Both threads RUNNABLE. Both want mutex μ1.', 2);

  // T1 acquires
  s.threads[0].state = T_STATES.RUNNING;
  s.threads[0].holds = ['μ1'];
  s.threads[0].wants = null;
  s.locks[0].holder = 'T1';
  s.events.push({ msg: 'T1 acquires μ1', type: 'ok' });
  snap(steps, s, 'Thread-1 acquires μ1. Enters critical section.', 4);

  // T2 tries, blocks
  s.threads[1].state = T_STATES.BLOCKED;
  s.threads[1].wants = 'μ1';
  s.locks[0].queue.push('T2');
  s.events.push({ msg: 'T2 blocked — μ1 held by T1', type: 'warn' });
  snap(steps, s, 'Thread-2 tries μ1 → BLOCKED. Must wait for T1 to release.', 5);

  // T1 in critical section
  s.threads[0].ops += 1;
  snap(steps, s, 'Thread-1 executes critical section. Thread-2 waits in queue.', 6);

  // T1 releases
  s.threads[0].holds = [];
  s.threads[0].state = T_STATES.RUNNABLE;
  s.locks[0].holder = null;
  s.locks[0].queue = [];
  s.events.push({ msg: 'T1 releases μ1', type: 'ok' });
  snap(steps, s, 'Thread-1 releases μ1. Wakes Thread-2.', 8);

  // T2 acquires
  s.threads[1].state = T_STATES.RUNNING;
  s.threads[1].holds = ['μ1'];
  s.threads[1].wants = null;
  s.locks[0].holder = 'T2';
  s.events.push({ msg: 'T2 acquires μ1', type: 'ok' });
  snap(steps, s, 'Thread-2 acquires μ1. Now in critical section. No race condition.', 4);

  s.threads[1].holds = [];
  s.threads[1].state = T_STATES.TERMINATED;
  s.threads[0].state = T_STATES.TERMINATED;
  s.locks[0].holder = null;
  snap(steps, s, 'Both threads complete. Mutex prevented race condition. ✅', 10);

  return steps;
}

/* ── DEADLOCK ── */
function buildDeadlockSteps() {
  const steps = [];
  const s = {
    threads: [thread('T1', 'Thread-1'), thread('T2', 'Thread-2')],
    locks: [lock('μA'), lock('μB')],
    semaphore: null,
    events: [],
    deadlock: false,
  };

  snap(steps, s, 'Deadlock setup: T1 needs μA then μB. T2 needs μB then μA.', 1);

  s.threads[0].state = T_STATES.RUNNING;
  s.threads[1].state = T_STATES.RUNNING;
  snap(steps, s, 'Both threads start running concurrently.', 2);

  // T1 takes μA
  s.threads[0].holds = ['μA'];
  s.locks[0].holder = 'T1';
  s.events.push({ msg: 'T1 acquires μA', type: 'ok' });
  snap(steps, s, 'T1 acquires μA. Wants μB next.', 3);

  // T2 takes μB
  s.threads[1].holds = ['μB'];
  s.locks[1].holder = 'T2';
  s.events.push({ msg: 'T2 acquires μB', type: 'ok' });
  snap(steps, s, 'T2 acquires μB. Wants μA next.', 3);

  // T1 wants μB — blocked
  s.threads[0].state = T_STATES.BLOCKED;
  s.threads[0].wants = 'μB';
  s.locks[1].queue.push('T1');
  s.events.push({ msg: 'T1 wants μB — held by T2!', type: 'warn' });
  snap(steps, s, 'T1 tries μB → BLOCKED. μB held by T2.', 5);

  // T2 wants μA — blocked
  s.threads[1].state = T_STATES.BLOCKED;
  s.threads[1].wants = 'μA';
  s.locks[0].queue.push('T2');
  s.events.push({ msg: 'T2 wants μA — held by T1!', type: 'warn' });
  snap(steps, s, 'T2 tries μA → BLOCKED. μA held by T1.', 5);

  // DEADLOCK
  s.deadlock = true;
  s.events.push({ msg: '💀 DEADLOCK! T1 waits for T2, T2 waits for T1. Cycle!', type: 'error' });
  snap(steps, s, '💀 DEADLOCK detected! Circular wait: T1→μB→T2→μA→T1. No progress possible.', 7);

  snap(steps, s, 'Solutions: lock ordering, tryLock+timeout, deadlock detector, avoid nested locks.', 9);
  return steps;
}

/* ── SEMAPHORE ── */
function buildSemaphoreSteps() {
  const CAPACITY = 2;
  const steps = [];
  const s = {
    threads: [thread('T1','Worker-1'), thread('T2','Worker-2'), thread('T3','Worker-3')],
    locks: [],
    semaphore: { name: 'S', count: CAPACITY, max: CAPACITY, queue: [] },
    events: [],
  };

  snap(steps, s, `Semaphore S: max ${CAPACITY} concurrent. 3 workers want access.`, 1);

  s.threads.forEach((t) => (t.state = T_STATES.RUNNABLE));
  snap(steps, s, 'All 3 workers RUNNABLE. All acquiring semaphore S.', 2);

  // T1 acquire
  s.threads[0].state = T_STATES.RUNNING;
  s.semaphore.count -= 1;
  s.threads[0].holds = ['S'];
  s.events.push({ msg: 'T1 acquire S (count: 1)', type: 'ok' });
  snap(steps, s, `T1 acquires S. Semaphore count: ${s.semaphore.count}/${CAPACITY}.`, 4);

  // T2 acquire
  s.threads[1].state = T_STATES.RUNNING;
  s.semaphore.count -= 1;
  s.threads[1].holds = ['S'];
  s.events.push({ msg: 'T2 acquire S (count: 0)', type: 'ok' });
  snap(steps, s, `T2 acquires S. Semaphore count: ${s.semaphore.count}/${CAPACITY}. Full!`, 4);

  // T3 blocked — count=0
  s.threads[2].state = T_STATES.BLOCKED;
  s.threads[2].wants = 'S';
  s.semaphore.queue.push('T3');
  s.events.push({ msg: 'T3 blocked — semaphore count=0', type: 'warn' });
  snap(steps, s, `T3 blocked. Semaphore count=0. No capacity. T3 waits in queue.`, 6);

  // T1 releases
  s.threads[0].holds = [];
  s.threads[0].state = T_STATES.TERMINATED;
  s.semaphore.count += 1;
  s.semaphore.queue = [];
  s.events.push({ msg: 'T1 release S (count: 1). T3 woken.', type: 'ok' });
  snap(steps, s, `T1 releases S. Count: ${s.semaphore.count}. T3 woken up.`, 8);

  s.threads[2].state = T_STATES.RUNNING;
  s.threads[2].holds = ['S'];
  s.threads[2].wants = null;
  s.semaphore.count -= 1;
  snap(steps, s, `T3 acquires S. Count: ${s.semaphore.count}/${CAPACITY}. T2+T3 running concurrently.`, 4);

  s.threads[1].holds = [];
  s.threads[1].state = T_STATES.TERMINATED;
  s.threads[2].holds = [];
  s.threads[2].state = T_STATES.TERMINATED;
  s.semaphore.count = CAPACITY;
  snap(steps, s, 'All workers done. Semaphore enforced max 2 concurrent. ✅', 10);
  return steps;
}

export const THREAD_CODE = {
  mutex: [
    'ReentrantLock lock = new ReentrantLock();',
    '',
    'void criticalSection() {',
    '  lock.lock();',
    '  try {',
    '    // only one thread here',
    '    doWork();',
    '  } finally {',
    '    lock.unlock(); // always release',
    '  }',
    '}',
  ],
  deadlock: [
    '// T1: acquires A then B',
    'synchronized(lockA) {',
    '  synchronized(lockB) { ... }',
    '}',
    '// T2: acquires B then A — DEADLOCK!',
    'synchronized(lockB) {',
    '  synchronized(lockA) { ... }',
    '}',
    '// Fix: always acquire in same order',
    '// Or: tryLock(timeout)',
  ],
  semaphore: [
    'Semaphore sem = new Semaphore(2);',
    '',
    'void worker() {',
    '  sem.acquire(); // count--',
    '  try {',
    '    doWork(); // max 2 at once',
    '  } finally {',
    '    sem.release(); // count++',
    '  }',
    '}',
  ],
};

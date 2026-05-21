import { snap, thread, lock, T_STATES } from '@/core/utils/scenarioShared';

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

export const THREAD_CODE_MUTEX = [
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
];

export default {
  id: 'mutex',
  label: 'Mutex',
  icon: '🔒',
  build: buildMutexSteps,
  code: THREAD_CODE_MUTEX,
  language: 'Java',
  metrics: [
    { key: 'runs',    label: 'Runs',    max: 5, color: 'var(--pod-running)' },
    { key: 'blocked', label: 'Blocked', max: 5, color: 'var(--pod-crash)' },
    { key: 'done',    label: 'Done',    max: 5, color: 'var(--text-muted)' },
  ],
};

import { snap, thread, lock, T_STATES } from './shared';

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

export const THREAD_CODE_DEADLOCK = [
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
];

export default {
  id: 'deadlock',
  label: 'Deadlock',
  icon: '💀',
  build: buildDeadlockSteps,
  code: THREAD_CODE_DEADLOCK,
  language: 'Java',
  metrics: [
    { key: 'runs',    label: 'Runs',    max: 5, color: 'var(--pod-running)' },
    { key: 'blocked', label: 'Blocked', max: 5, color: 'var(--pod-crash)' },
    { key: 'done',    label: 'Done',    max: 5, color: 'var(--text-muted)' },
  ],
};

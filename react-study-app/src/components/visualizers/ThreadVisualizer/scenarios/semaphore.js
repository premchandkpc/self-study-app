import { snap, thread, T_STATES } from '@/core/utils/scenarioShared';

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

export const THREAD_CODE_SEMAPHORE = [
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
];

export default {
  id: 'semaphore',
  label: 'Semaphore',
  icon: '🚦',
  build: buildSemaphoreSteps,
  code: THREAD_CODE_SEMAPHORE,
  language: 'Java',
  metrics: [
    { key: 'runs',    label: 'Active', max: 5, color: 'var(--pod-running)' },
    { key: 'blocked', label: 'Waiting',max: 5, color: 'var(--pod-crash)' },
    { key: 'done',    label: 'Done',   max: 5, color: 'var(--text-muted)' },
  ],
};

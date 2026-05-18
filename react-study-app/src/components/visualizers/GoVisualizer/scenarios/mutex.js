import { G_STATES, goroutine } from './shared';

function buildMutexSteps() {
  const steps = [];
  const lock = (id, state = 'free', holder = null) => ({ id, state, holder, waiters: [] });
  const snap = (steps, s, narration, codeLine = null) => {
    steps.push({ ...JSON.parse(JSON.stringify(s)), narration, codeLine, complexity: { ops: steps.length + 1, label: 'synchronize', space: 'O(goroutines)' } });
  };

  const s = {
    goroutines: [
      goroutine('G1', 'updateCounter()'),
      goroutine('G2', 'updateCounter()'),
      goroutine('G3', 'readCounter()'),
    ],
    locks: [
      lock('mu', 'free'),
      lock('rwmu', 'free'),
    ],
    counter: 0,
    output: [],
    events: [],
    metrics: { acquired: 0, contended: 0, reads: 0 },
  };

  snap(steps, s, 'Two goroutines want to increment a shared counter. Without sync: DATA RACE!', 1);

  // G1 locks
  s.goroutines[0].state = G_STATES.RUNNING;
  s.locks[0].state = 'held';
  s.locks[0].holder = 'G1';
  s.metrics.acquired = 1;
  s.events.push({ type: 'ok', msg: 'G1: mu.Lock() — acquired mutex' });
  snap(steps, s, 'G1 calls mu.Lock(). Mutex acquired. G1 enters critical section.', 2);

  // G2 tries to lock — blocks
  s.goroutines[1].state = G_STATES.WAITING;
  s.locks[0].waiters = ['G2'];
  s.metrics.contended = 1;
  s.events.push({ type: 'warn', msg: 'G2: mu.Lock() BLOCKS — mutex held by G1' });
  snap(steps, s, 'G2 tries mu.Lock(). BLOCKS. Mutex is busy. G2 parks (no CPU wasted).', 3);

  // G1 updates counter, unlocks
  s.counter = 1;
  s.goroutines[0].state = G_STATES.RUNNABLE;
  s.locks[0].state = 'free';
  s.locks[0].holder = null;
  s.locks[0].waiters = [];
  s.output.push('counter = 1');
  s.events.push({ type: 'ok', msg: 'G1: counter++ → 1, mu.Unlock() — G2 wakes up' });
  snap(steps, s, 'G1 increments counter to 1. mu.Unlock() releases. G2 unparked by runtime.', 4);

  // G2 acquires
  s.goroutines[1].state = G_STATES.RUNNING;
  s.locks[0].state = 'held';
  s.locks[0].holder = 'G2';
  s.events.push({ type: 'ok', msg: 'G2: mu.Lock() acquired, counter++ → 2' });
  snap(steps, s, 'G2 acquires mutex. Increments counter to 2. Serialized access — no race!', 5);

  // RWMutex: G3 reads while G2 holds write lock
  s.goroutines[2].state = G_STATES.WAITING;
  s.locks[1].state = 'write';
  s.locks[1].holder = 'G2';
  s.counter = 2;
  s.events.push({ type: 'info', msg: 'sync.RWMutex: writers block all readers' });
  snap(steps, s, 'RWMutex: write lock blocks readers. G3 (RLock) waits for G2 writer.', 6);

  // G2 releases write, G3 reads
  s.goroutines[1].state = G_STATES.DEAD;
  s.goroutines[2].state = G_STATES.RUNNING;
  s.locks[1].state = 'read';
  s.locks[1].holder = null;
  s.locks[1].waiters = ['G3'];
  s.output.push('read: 2');
  s.metrics.reads = 1;
  s.events.push({ type: 'ok', msg: 'G2 done. G3: RLock() — multiple readers allowed concurrently' });
  snap(steps, s, 'G2 RUnlock(). G3 reads counter=2. Multiple goroutines can RLock simultaneously.', 7);

  return steps;
}

const MUTEX_CODE = [
  'var mu sync.Mutex',
  'var counter int',
  '',
  'func update() {',
  '  mu.Lock()',
  '  defer mu.Unlock()',
  '  counter++',
  '}',
  '',
  'var rwmu sync.RWMutex',
  'func read() int {',
  '  rwmu.RLock()',
  '  defer rwmu.RUnlock()',
  '  return counter',
  '}',
];

export default {
  id: 'mutex',
  label: 'Mutex',
  icon: '🔒',
  build: buildMutexSteps,
  code: MUTEX_CODE,
  language: 'Go',
  layout: 'mutex',
  metrics: [
    { key: 'acquired',  label: 'Acquired',   max: 5, color: 'var(--pod-running)' },
    { key: 'contended', label: 'Contended',  max: 5, color: 'var(--pod-crash)' },
    { key: 'reads',     label: 'Reads',      max: 5, color: 'var(--node-default)' },
  ],
};

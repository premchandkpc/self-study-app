import { snap, G_STATES, goroutine, processor } from '@/core/utils/scenarioShared';

function buildGoroutineSteps() {
  const steps = [];
  const s = {
    goroutines: [],
    processors: [processor(0), processor(1)],
    globalQueue: [],
    output: [],
    events: [],
    metrics: { created: 0, running: 0, done: 0 },
  };

  snap(steps, s, 'Go runtime starts. 2 OS threads (M), 2 processors (P), empty run queues.', 1);

  // go func() — create goroutines
  const g1 = goroutine('G1', 'printHello()');
  const g2 = goroutine('G2', 'printWorld()');
  s.goroutines.push(g1, g2);
  s.globalQueue = ['G1', 'G2'];
  s.metrics.created = 2;
  s.events.push({ type: 'info', msg: 'go printHello() → G1 created' });
  s.events.push({ type: 'info', msg: 'go printWorld() → G2 created' });
  snap(steps, s, 'go keyword creates G1, G2. Both RUNNABLE. Placed on global run queue.', 2);

  // P0 steals G1
  s.processors[0].g = 'G1';
  s.globalQueue = ['G2'];
  s.goroutines[0].state = G_STATES.RUNNING;
  s.metrics.running = 1;
  s.events.push({ type: 'ok', msg: 'P0 picks G1 from queue → RUNNING on M0' });
  snap(steps, s, 'Scheduler: P0 dequeues G1, M0 executes it. G1 RUNNING.', 3);

  // P1 steals G2
  s.processors[1].g = 'G2';
  s.globalQueue = [];
  s.goroutines[1].state = G_STATES.RUNNING;
  s.metrics.running = 2;
  s.events.push({ type: 'ok', msg: 'P1 picks G2 → RUNNING on M1 (true parallelism)' });
  snap(steps, s, 'P1 picks G2. Both run truly in parallel (GOMAXPROCS=2). No GIL!', 4);

  // G1 completes
  s.goroutines[0].state = G_STATES.DEAD;
  s.goroutines[0].output = ['Hello'];
  s.processors[0].g = null;
  s.output.push('Hello');
  s.metrics.running = 1; s.metrics.done = 1;
  s.events.push({ type: 'ok', msg: 'G1 returns → DEAD. Stack reclaimed.' });
  snap(steps, s, 'G1 finishes → DEAD. Stack memory returned to pool. P0 free.', 5);

  // G2 completes
  s.goroutines[1].state = G_STATES.DEAD;
  s.goroutines[1].output = ['World'];
  s.processors[1].g = null;
  s.output.push('World');
  s.metrics.running = 0; s.metrics.done = 2;
  s.events.push({ type: 'ok', msg: 'G2 returns → DEAD. All goroutines complete.' });
  snap(steps, s, 'G2 finishes. Output: Hello World. Goroutines lightweight — ~2KB stack each.', 6);

  // Many goroutines
  const many = Array.from({ length: 6 }, (_, i) => goroutine(`G${i + 3}`, 'worker()', G_STATES.RUNNABLE));
  s.goroutines.push(...many);
  s.globalQueue = many.map((g) => g.id);
  s.metrics.created = 8;
  s.events.push({ type: 'info', msg: 'Launch 1000 goroutines — only 2 OS threads needed!' });
  snap(steps, s, '1000 goroutines easily on 2 OS threads. M:N scheduling. Goroutines multiplexed.', 7);

  return steps;
}

const CODE = [
  'func main() {',
  '  go printHello() // G1',
  '  go printWorld() // G2',
  '  // goroutines are multiplexed',
  '  // onto OS threads by runtime',
  '  wg.Wait()',
  '}',
  '// Stack: 2KB initial, grows dynamically',
  '// GOMAXPROCS = runtime.NumCPU()',
];

export default {
  id: 'goroutine',
  label: 'Goroutines',
  icon: '🐹',
  build: buildGoroutineSteps,
  code: CODE,
  language: 'Go',
  layout: 'runtime',
  metrics: [
    { key: 'created', label: 'Created',  max: 8, color: 'var(--node-default)' },
    { key: 'running', label: 'Running',  max: 4, color: 'var(--pod-running)' },
    { key: 'done',    label: 'Done',     max: 8, color: 'var(--text-muted)' },
  ],
};

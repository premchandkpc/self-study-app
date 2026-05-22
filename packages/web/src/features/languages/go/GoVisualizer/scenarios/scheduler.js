import { snap, G_STATES, goroutine } from '@/core/utils/scenarioShared';

function buildSchedulerSteps() {
  const steps = [];
  const s = {
    goroutines: [],
    processors: [
      { id: 'P0', g: null, localQ: [], m: 'M0' },
      { id: 'P1', g: null, localQ: [], m: 'M1' },
    ],
    globalQueue: [],
    threads: [
      { id: 'M0', state: 'idle', p: null },
      { id: 'M1', state: 'idle', p: null },
    ],
    output: [],
    events: [],
    metrics: { goroutines: 0, threads: 2, steals: 0, syscalls: 0 },
  };

  snap(steps, s, 'Go scheduler: G=goroutine M=OS thread P=processor. GOMAXPROCS=2.', 1);

  // Create goroutines
  ['G1','G2','G3','G4','G5','G6'].forEach((id) => {
    s.goroutines.push(goroutine(id, 'work()'));
  });
  s.processors[0].localQ = ['G1','G2','G3'];
  s.processors[1].localQ = ['G4','G5','G6'];
  s.globalQueue = [];
  s.metrics.goroutines = 6;
  s.events.push({ type: 'info', msg: '6 goroutines distributed across P0, P1 local queues' });
  snap(steps, s, '6 goroutines created. Scheduler distributes to P0.localQ=[G1,G2,G3] P1.localQ=[G4,G5,G6].', 2);

  // P0 runs G1, P1 runs G4
  s.processors[0].g = 'G1'; s.processors[0].localQ = ['G2','G3'];
  s.processors[1].g = 'G4'; s.processors[1].localQ = ['G5','G6'];
  s.threads[0].state = 'running'; s.threads[1].state = 'running';
  s.goroutines[0].state = G_STATES.RUNNING;
  s.goroutines[3].state = G_STATES.RUNNING;
  s.events.push({ type: 'ok', msg: 'P0→G1 on M0, P1→G4 on M1 (parallel execution)' });
  snap(steps, s, 'P0 runs G1 on M0. P1 runs G4 on M1. True parallelism.', 3);

  // G1 makes syscall — M0 blocks, new thread M2
  s.goroutines[0].state = G_STATES.SYSCALL;
  s.processors[0].g = null;
  s.threads[0].state = 'syscall';
  s.threads.push({ id: 'M2', state: 'running', p: 'P0' });
  s.processors[0].g = 'G2'; s.processors[0].localQ = ['G3'];
  s.goroutines[1].state = G_STATES.RUNNING;
  s.metrics.threads = 3; s.metrics.syscalls = 1;
  s.events.push({ type: 'warn', msg: 'G1 syscall → M0 blocks. Runtime creates M2 to park P0.' });
  snap(steps, s, 'G1 enters syscall. M0 blocked. Runtime handoffs P0 to new M2. No stall!', 4);

  // G3 work steals from P1
  s.processors[0].localQ = [];
  s.processors[0].g = 'G3';
  s.processors[1].localQ = ['G6'];
  s.goroutines[2].state = G_STATES.RUNNING;
  s.metrics.steals = 1;
  s.events.push({ type: 'info', msg: 'P0 local queue empty → work-steals G5 from P1!' });
  snap(steps, s, 'P0 local queue empty. Work-steals G5 from P1 (takes half). Load balancing.', 5);

  // All complete
  s.goroutines.forEach((g) => { g.state = G_STATES.DEAD; });
  s.processors.forEach((p) => { p.g = null; p.localQ = []; });
  s.threads = [{ id: 'M0', state: 'idle', p: null }, { id: 'M1', state: 'idle', p: null }];
  s.metrics.goroutines = 0; s.metrics.threads = 2; s.metrics.steals = 1;
  s.events.push({ type: 'ok', msg: 'All goroutines done. Threads return to idle.' });
  snap(steps, s, 'All done. Work-stealing balances load automatically. Preemption at function calls.', 6);

  return steps;
}

const SCHEDULER_CODE = [
  '// GOMAXPROCS = 2 (P0, P1)',
  '// M = OS thread, G = goroutine',
  '// P has local run queue (256 cap)',
  '',
  '// Syscall: P handed to new M',
  '// Work stealing: P steals half',
  '//   from another P\'s queue',
  '// Preemption: at safe points',
  '//   (function calls, ~10ms)',
];

export default {
  id: 'scheduler',
  label: 'Scheduler',
  icon: '⚙️',
  build: buildSchedulerSteps,
  code: SCHEDULER_CODE,
  language: 'Go',
  layout: 'scheduler',
  metrics: [
    { key: 'goroutines', label: 'Goroutines', max: 6, color: 'var(--node-default)' },
    { key: 'threads',    label: 'Threads',    max: 4, color: 'var(--node-comparing)' },
    { key: 'steals',     label: 'Steals',     max: 3, color: 'var(--pod-running)' },
  ],
};

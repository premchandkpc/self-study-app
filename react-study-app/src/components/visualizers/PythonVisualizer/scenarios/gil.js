import { snap } from '@/core/utils/scenarioShared';

function buildGILSteps() {
  const steps = [];
  const thread = (id, fn, state = 'idle') => ({ id, fn, state, holdingGIL: false, opsCompleted: 0 });

  const s = {
    threads: [
      thread('T1', 'cpu_task()'),
      thread('T2', 'cpu_task()'),
      thread('T3', 'io_task()'),
    ],
    gil: { holder: null },
    ioPool: [],
    counter: 0,
    output: [],
    events: [],
    metrics: { acquired: 0, released: 0, ioOps: 0 },
  };

  snap(steps, s, 'Python GIL: only ONE thread executes Python bytecode at a time. T1, T2 are CPU-bound; T3 is I/O-bound.', 1);

  // T1 acquires GIL
  s.threads[0].state = 'running'; s.threads[0].holdingGIL = true;
  s.gil.holder = 'T1';
  s.metrics.acquired = 1;
  s.events.push({ type: 'ok', msg: 'T1 acquires GIL. T2 must wait.' });
  snap(steps, s, 'T1 acquires the GIL. Only T1 can execute bytecode. T2 is blocked waiting for GIL.', 2);

  // T2 waits
  s.threads[1].state = 'blocked';
  s.events.push({ type: 'warn', msg: 'T2 BLOCKED — waiting for GIL. CPU core idle!' });
  snap(steps, s, 'T2 waits for GIL. Even on a multi-core machine, T2 cannot use the other core for Python code.', 3);

  // T1 releases — switch interval (100 bytecodes)
  s.threads[0].state = 'idle'; s.threads[0].holdingGIL = false; s.threads[0].opsCompleted = 100;
  s.gil.holder = null;
  s.metrics.released = 1;
  s.events.push({ type: 'info', msg: 'T1: 100 bytecodes executed → releases GIL (sys.switchinterval)' });
  snap(steps, s, 'After ~100 bytecodes (sys.switchinterval=5ms), T1 releases GIL. OS schedules T2.', 4);

  // T2 acquires
  s.threads[1].state = 'running'; s.threads[1].holdingGIL = true;
  s.gil.holder = 'T2';
  s.events.push({ type: 'ok', msg: 'T2 acquires GIL. T1 now waits.' });
  snap(steps, s, 'T2 acquires GIL. T1 waits. Threading is serial for CPU work — no real parallelism!', 5);

  // T3 I/O — releases GIL voluntarily
  s.threads[2].state = 'running';
  s.threads[1].state = 'idle'; s.threads[1].holdingGIL = false;
  s.threads[2].holdingGIL = false;
  s.gil.holder = 'T2';
  s.ioPool = ['socket.recv()'];
  s.metrics.ioOps = 1;
  s.events.push({ type: 'ok', msg: 'T3 calls socket.recv() → releases GIL during I/O wait!' });
  snap(steps, s, 'I/O-bound threads release GIL during blocking I/O (socket, file). CPU threads can run meanwhile.', 6);

  // T1 runs while T3 waits on I/O
  s.threads[0].state = 'running'; s.threads[0].holdingGIL = true;
  s.gil.holder = 'T1';
  s.events.push({ type: 'ok', msg: 'T1 runs while T3 waits for I/O. GIL allows I/O concurrency!' });
  snap(steps, s, 'While T3 waits on I/O, T1 runs Python. GIL is efficient for I/O-bound workloads.', 7);

  // Solution: multiprocessing
  s.output.push('Use multiprocessing.Pool for CPU-bound tasks');
  s.output.push('Each process has own GIL — true parallelism');
  s.events.push({ type: 'info', msg: 'Fix: multiprocessing / C extensions (NumPy releases GIL)' });
  snap(steps, s, 'For CPU-bound: use multiprocessing (separate processes = separate GILs) or offload to C extensions (NumPy, PyTorch).', 8);

  return steps;
}

const GIL_CODE = [
  'import threading',
  '',
  'def cpu_task():',
  '  for _ in range(10_000_000):',
  '    pass  # GIL held each bytecode',
  '',
  'def io_task():',
  '  # GIL released during I/O!',
  '  response = requests.get(url)',
  '',
  '# Fix: multiprocessing',
  'with Pool(4) as p:',
  '  results = p.map(cpu_task, data)',
];

export default {
  id: 'gil',
  label: 'GIL',
  icon: '🔐',
  build: buildGILSteps,
  code: GIL_CODE,
  language: 'Python',
  layout: 'gil',
  metrics: [
    { key: 'acquired', label: 'GIL acquired', max: 10, color: 'var(--node-default)' },
    { key: 'released', label: 'GIL released', max: 10, color: 'var(--pod-running)' },
    { key: 'ioOps',    label: 'I/O ops',      max: 5,  color: 'var(--node-comparing)' },
  ],
};

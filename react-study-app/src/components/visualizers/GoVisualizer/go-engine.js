export function buildGoSteps(scenario = 'goroutine') {
  if (scenario === 'goroutine') return buildGoroutineSteps();
  if (scenario === 'channel')   return buildChannelSteps();
  if (scenario === 'select')    return buildSelectSteps();
  if (scenario === 'scheduler') return buildSchedulerSteps();
  if (scenario === 'mutex')     return buildMutexSteps();
  return buildGoroutineSteps();
}

function snap(steps, state, narration, codeLine = null) {
  steps.push({ ...JSON.parse(JSON.stringify(state)), narration, codeLine, complexity: { ops: steps.length + 1, label: 'concurrent', space: 'O(goroutines)' } });
}

const G_STATES = { RUNNABLE: 'runnable', RUNNING: 'running', WAITING: 'waiting', DEAD: 'dead', SYSCALL: 'syscall' };

const goroutine = (id, fn, state = G_STATES.RUNNABLE) => ({ id, fn, state, output: [], stackSize: 2 });
const channel   = (id, cap, items = []) => ({ id, cap, items, senders: [], receivers: [] });
const processor = (id, g = null) => ({ id, g, m: `M${id}` });

/* ── SCENARIO 1: Goroutine lifecycle ── */
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

/* ── SCENARIO 2: Channels ── */
function buildChannelSteps() {
  const steps = [];
  const s = {
    goroutines: [
      goroutine('producer', 'send loop'),
      goroutine('consumer', 'recv loop'),
    ],
    channels: [channel('ch', 3)],
    output: [],
    events: [],
    metrics: { sent: 0, received: 0, blocked: 0 },
  };

  snap(steps, s, 'Buffered channel ch (cap=3). Producer sends, Consumer receives.', 1);

  // Send 1
  s.goroutines[0].state = G_STATES.RUNNING;
  s.channels[0].items = [1];
  s.metrics.sent = 1;
  s.events.push({ type: 'ok', msg: 'ch <- 1 (buf: [1], len=1/3)' });
  snap(steps, s, 'Producer: ch <- 1. Non-blocking (buffer has space). len=1, cap=3.', 3);

  // Send 2, 3
  s.channels[0].items = [1, 2, 3];
  s.metrics.sent = 3;
  s.events.push({ type: 'ok', msg: 'ch <- 2, ch <- 3 (buf full: [1,2,3])' });
  snap(steps, s, 'Producer sends 2 and 3. Buffer FULL (len=3, cap=3).', 3);

  // Producer blocks on send 4
  s.goroutines[0].state = G_STATES.WAITING;
  s.channels[0].senders = ['producer (4)'];
  s.metrics.blocked = 1;
  s.events.push({ type: 'warn', msg: 'ch <- 4 BLOCKS — buffer full! Producer suspended.' });
  snap(steps, s, 'ch <- 4 blocks. Buffer full. Producer WAITING until consumer reads.', 4);

  // Consumer reads 1
  s.goroutines[1].state = G_STATES.RUNNING;
  s.channels[0].items = [2, 3, 4];
  s.channels[0].senders = [];
  s.goroutines[0].state = G_STATES.RUNNING;
  s.metrics.received = 1; s.metrics.blocked = 0; s.metrics.sent = 4;
  s.output.push('recv: 1');
  s.events.push({ type: 'ok', msg: 'Consumer reads 1. Producer unblocked, 4 enters buffer.' });
  snap(steps, s, 'Consumer receives 1. Buffer opens slot. Producer unblocked, sends 4.', 5);

  // Drain channel
  s.channels[0].items = [];
  s.goroutines[0].state = G_STATES.DEAD;
  s.goroutines[1].state = G_STATES.RUNNING;
  s.output = ['recv: 1', 'recv: 2', 'recv: 3', 'recv: 4'];
  s.metrics.received = 4;
  s.events.push({ type: 'ok', msg: 'close(ch) — consumer drains remaining, detects close.' });
  snap(steps, s, 'Producer closes channel. Consumer drains all values via range loop. Clean shutdown.', 7);

  // Zero-value on closed
  s.events.push({ type: 'warn', msg: 'v, ok := <-ch → ok=false (closed + empty)' });
  snap(steps, s, 'Receive from closed empty channel: returns zero-value, ok=false. Use ok to detect close.', 8);

  return steps;
}

/* ── SCENARIO 3: Select ── */
function buildSelectSteps() {
  const steps = [];
  const s = {
    goroutines: [goroutine('main', 'select loop')],
    channels: [
      channel('work', 1),
      channel('done', 0),
      channel('timeout', 0),
    ],
    output: [],
    events: [],
    metrics: { loops: 0, selected: 0, timeouts: 0 },
    selected: null,
  };

  snap(steps, s, 'select waits on multiple channels simultaneously. First ready wins.', 1);

  // work arrives
  s.goroutines[0].state = G_STATES.WAITING;
  s.events.push({ type: 'info', msg: 'main goroutine: entering select { ... }' });
  snap(steps, s, 'Goroutine enters select. Blocked waiting on work, done, or timeout channels.', 2);

  s.channels[0].items = ['job#1'];
  s.selected = 'work';
  s.goroutines[0].state = G_STATES.RUNNING;
  s.output.push('processing job#1');
  s.metrics.loops = 1; s.metrics.selected = 1;
  s.events.push({ type: 'ok', msg: 'case job := <-work: selected! processing job#1' });
  snap(steps, s, 'work channel has data → case work selected. Goroutine processes job.', 3);

  // Timeout fires
  s.channels[0].items = [];
  s.selected = null;
  s.goroutines[0].state = G_STATES.WAITING;
  s.events.push({ type: 'info', msg: 'select again — no work ready, waiting...' });
  snap(steps, s, 'Next iteration: no work. select blocks. time.After(1s) running.', 4);

  s.channels[2].items = ['tick'];
  s.selected = 'timeout';
  s.goroutines[0].state = G_STATES.RUNNING;
  s.metrics.loops = 2; s.metrics.timeouts = 1;
  s.events.push({ type: 'warn', msg: 'case <-time.After(1s): timeout selected!' });
  snap(steps, s, 'Timeout fires after 1s. case timeout selected. Non-blocking pattern.', 5);

  // done signal
  s.channels[2].items = [];
  s.channels[1].items = ['signal'];
  s.selected = 'done';
  s.goroutines[0].state = G_STATES.DEAD;
  s.metrics.loops = 3;
  s.events.push({ type: 'ok', msg: 'case <-done: shutdown signal received. exit.' });
  snap(steps, s, 'done channel signaled (context.Cancel). Goroutine exits cleanly. Context pattern.', 6);

  return steps;
}

/* ── SCENARIO 4: Go Scheduler (G,M,P) ── */
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

/* ── SCENARIO 5: sync.Mutex / RWMutex ── */
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

export const GO_CODE = {
  goroutine: [
    'func main() {',
    '  go printHello() // G1',
    '  go printWorld() // G2',
    '  // goroutines are multiplexed',
    '  // onto OS threads by runtime',
    '  wg.Wait()',
    '}',
    '// Stack: 2KB initial, grows dynamically',
    '// GOMAXPROCS = runtime.NumCPU()',
  ],
  channel: [
    'ch := make(chan int, 3) // buffered',
    '',
    'go func() {',
    '  for i := 1; i <= 4; i++ {',
    '    ch <- i  // blocks if full',
    '  }',
    '  close(ch)',
    '}()',
    'for v := range ch { // drain',
    '  fmt.Println(v)',
    '}',
  ],
  select: [
    'for {',
    '  select {',
    '  case job := <-work:',
    '    process(job)',
    '  case <-time.After(1 * time.Second):',
    '    fmt.Println("timeout")',
    '  case <-ctx.Done():',
    '    return // shutdown',
    '  }',
    '}',
  ],
  scheduler: [
    '// GOMAXPROCS = 2 (P0, P1)',
    '// M = OS thread, G = goroutine',
    '// P has local run queue (256 cap)',
    '',
    '// Syscall: P handed to new M',
    '// Work stealing: P steals half',
    '//   from another P\'s queue',
    '// Preemption: at safe points',
    '//   (function calls, ~10ms)',
  ],
  mutex: [
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
  ],
};

export const SCENARIOS = [
  {
    id: 'goroutine',
    label: 'Goroutines',
    icon: '🐹',
    build: buildGoroutineSteps,
    code: GO_CODE.goroutine,
    language: 'Go',
    layout: 'runtime',
    metrics: [
      { key: 'created', label: 'Created',  max: 8, color: 'var(--node-default)' },
      { key: 'running', label: 'Running',  max: 4, color: 'var(--pod-running)' },
      { key: 'done',    label: 'Done',     max: 8, color: 'var(--text-muted)' },
    ],
  },
  {
    id: 'channel',
    label: 'Channels',
    icon: '📡',
    build: buildChannelSteps,
    code: GO_CODE.channel,
    language: 'Go',
    layout: 'runtime',
    metrics: [
      { key: 'sent',     label: 'Sent',     max: 10, color: 'var(--node-default)' },
      { key: 'received', label: 'Received', max: 10, color: 'var(--pod-running)' },
      { key: 'blocked',  label: 'Blocked',  max: 3,  color: 'var(--pod-crash)' },
    ],
  },
  {
    id: 'select',
    label: 'Select',
    icon: '🔀',
    build: buildSelectSteps,
    code: GO_CODE.select,
    language: 'Go',
    layout: 'runtime',
    metrics: [
      { key: 'loops',    label: 'Loops',    max: 5, color: 'var(--node-default)' },
      { key: 'selected', label: 'Selected', max: 5, color: 'var(--pod-running)' },
      { key: 'timeouts', label: 'Timeouts', max: 3, color: 'var(--node-comparing)' },
    ],
  },
  {
    id: 'scheduler',
    label: 'Scheduler',
    icon: '⚙️',
    build: buildSchedulerSteps,
    code: GO_CODE.scheduler,
    language: 'Go',
    layout: 'scheduler',
    metrics: [
      { key: 'goroutines', label: 'Goroutines', max: 6, color: 'var(--node-default)' },
      { key: 'threads',    label: 'Threads',    max: 4, color: 'var(--node-comparing)' },
      { key: 'steals',     label: 'Steals',     max: 3, color: 'var(--pod-running)' },
    ],
  },
  {
    id: 'mutex',
    label: 'Mutex',
    icon: '🔒',
    build: buildMutexSteps,
    code: GO_CODE.mutex,
    language: 'Go',
    layout: 'mutex',
    metrics: [
      { key: 'acquired',  label: 'Acquired',   max: 5, color: 'var(--pod-running)' },
      { key: 'contended', label: 'Contended',  max: 5, color: 'var(--pod-crash)' },
      { key: 'reads',     label: 'Reads',      max: 5, color: 'var(--node-default)' },
    ],
  },
];

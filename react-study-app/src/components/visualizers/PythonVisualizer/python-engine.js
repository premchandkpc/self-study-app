function snap(steps, state, narration, codeLine = null) {
  steps.push({ ...JSON.parse(JSON.stringify(state)), narration, codeLine, complexity: { ops: steps.length + 1, label: 'concurrent', space: 'O(threads)' } });
}

/* ── SCENARIO 1: GIL (Global Interpreter Lock) ── */
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

/* ── SCENARIO 2: asyncio Event Loop ── */
function buildAsyncioSteps() {
  const steps = [];
  const coro = (id, fn, state = 'pending') => ({ id, fn, state, awaitingOn: null, result: null });

  const s = {
    eventLoop: { running: false, queue: [], ioCallbacks: [] },
    coroutines: [
      coro('main',    'main()'),
      coro('fetch1',  'fetch(url1)'),
      coro('fetch2',  'fetch(url2)'),
      coro('process', 'process(data)'),
    ],
    output: [],
    events: [],
    metrics: { tasks: 0, completed: 0, ioWaiting: 0 },
  };

  snap(steps, s, 'asyncio: single-threaded concurrency. Event loop runs coroutines cooperatively. No GIL issues!', 1);

  // Create tasks
  s.eventLoop.running = true;
  s.coroutines[0].state = 'running';
  s.eventLoop.queue = ['fetch1', 'fetch2'];
  s.metrics.tasks = 3;
  s.events.push({ type: 'ok', msg: 'asyncio.run(main()) → event loop starts' });
  snap(steps, s, 'main() creates two tasks: asyncio.create_task(fetch(url1)), asyncio.create_task(fetch(url2)).', 2);

  // fetch1 starts, awaits
  s.coroutines[1].state = 'running'; s.coroutines[1].awaitingOn = 'HTTP GET url1';
  s.eventLoop.queue = ['fetch2'];
  s.eventLoop.ioCallbacks = ['url1: waiting...'];
  s.metrics.ioWaiting = 1;
  s.events.push({ type: 'info', msg: 'fetch1: await session.get(url1) → suspends, yields control' });
  snap(steps, s, 'fetch1 hits "await session.get(url1)". Suspends itself, returns control to event loop.', 3);

  // fetch2 starts while fetch1 waits
  s.coroutines[2].state = 'running'; s.coroutines[2].awaitingOn = 'HTTP GET url2';
  s.eventLoop.queue = [];
  s.eventLoop.ioCallbacks = ['url1: waiting...', 'url2: waiting...'];
  s.metrics.ioWaiting = 2;
  s.events.push({ type: 'ok', msg: 'Event loop picks fetch2. Both I/O requests in-flight simultaneously!' });
  snap(steps, s, 'Event loop starts fetch2 while fetch1 waits. Two HTTP requests in-flight — no threads needed!', 4);

  // url1 responds
  s.coroutines[1].state = 'done'; s.coroutines[1].awaitingOn = null; s.coroutines[1].result = '{"data":1}';
  s.eventLoop.ioCallbacks = ['url2: waiting...'];
  s.eventLoop.queue = ['process'];
  s.metrics.ioWaiting = 1; s.metrics.completed = 1;
  s.events.push({ type: 'ok', msg: 'url1 response arrives → fetch1 resumes, queues process task' });
  snap(steps, s, 'OS notifies event loop: url1 data ready. fetch1 resumes. Response queued for processing.', 5);

  // process + fetch2 complete
  s.coroutines[2].state = 'done'; s.coroutines[2].result = '{"data":2}';
  s.coroutines[3].state = 'running';
  s.eventLoop.ioCallbacks = [];
  s.output.push('Processed: {"data":1}');
  s.output.push('Processed: {"data":2}');
  s.metrics.completed = 3;
  s.events.push({ type: 'ok', msg: 'fetch2 done, process runs, all tasks complete.' });
  snap(steps, s, 'Both fetches complete. Total time ≈ max(t1, t2), not t1+t2. Async I/O is efficient.', 6);

  return steps;
}

/* ── SCENARIO 3: Decorators ── */
function buildDecoratorSteps() {
  const steps = [];
  const fn = (name, original = true, wrappers = []) => ({ name, original, wrappers, callStack: [], lastReturn: null });

  const s = {
    functions: [fn('greet'), fn('slow_fn'), fn('add')],
    decorators: [],
    callStack: [],
    output: [],
    events: [],
    metrics: { calls: 0, cached: 0, timeMs: 0 },
  };

  snap(steps, s, 'Python decorators: wrap a function to add behaviour without modifying it. @syntax = syntactic sugar.', 1);

  // @timer decorator
  s.decorators.push({ name: '@timer', target: 'slow_fn', desc: 'measures execution time' });
  s.functions[1].wrappers = ['timer_wrapper'];
  s.events.push({ type: 'info', msg: '@timer wraps slow_fn. slow_fn = timer(slow_fn)' });
  snap(steps, s, '@timer applied to slow_fn. Equivalent to: slow_fn = timer(slow_fn). Original fn stored inside wrapper.', 2);

  // Call slow_fn — wrapper runs
  s.callStack = ['timer_wrapper(slow_fn)', 'start = time.time()'];
  s.metrics.calls = 1; s.metrics.timeMs = 0;
  s.events.push({ type: 'ok', msg: 'slow_fn() called → timer_wrapper executes first' });
  snap(steps, s, 'Calling slow_fn() actually calls timer_wrapper. Wrapper records start time, calls original.', 3);

  s.callStack = ['timer_wrapper', '→ slow_fn() executing', 'elapsed: 150ms'];
  s.metrics.timeMs = 150;
  s.output.push('slow_fn executed in 150ms');
  s.events.push({ type: 'ok', msg: 'Original slow_fn runs inside wrapper. Elapsed time computed.' });
  snap(steps, s, 'Original slow_fn runs, wrapper measures time. Transparent to caller — same interface.', 4);

  // @lru_cache decorator
  s.decorators.push({ name: '@lru_cache(128)', target: 'add', desc: 'memoizes results by args' });
  s.functions[2].wrappers = ['lru_cache'];
  s.events.push({ type: 'info', msg: '@lru_cache(128) wraps add(x,y) — memo size 128' });
  snap(steps, s, '@functools.lru_cache(maxsize=128) wraps add. Results cached by (args) key.', 5);

  // First call — cache miss
  s.callStack = ['add(3,4)', 'cache miss!', 'computing...', 'cache[(3,4)] = 7'];
  s.metrics.calls = 2;
  s.output.push('add(3,4) = 7 [computed]');
  s.events.push({ type: 'info', msg: 'add(3,4): cache miss → compute, store result' });
  snap(steps, s, 'First call add(3,4): cache miss. Computes result 7, stores in LRU cache with key (3,4).', 6);

  // Second call — cache hit
  s.callStack = ['add(3,4)', 'cache HIT! → 7'];
  s.metrics.calls = 3; s.metrics.cached = 1;
  s.output.push('add(3,4) = 7 [cached!]');
  s.events.push({ type: 'ok', msg: 'add(3,4) again → cache HIT. O(1) lookup, no recomputation!' });
  snap(steps, s, 'Second call add(3,4): cache hit. Returns 7 instantly. Cache.info(): hits=1, misses=1.', 7);

  // Stacking decorators
  s.decorators.push({ name: '@timer + @lru_cache', target: 'add', desc: 'stacked — order matters!' });
  s.output.push('@timer(@lru_cache(add)) — outermost runs first');
  s.events.push({ type: 'warn', msg: 'Stacking: @timer applied after @lru_cache. Order matters!' });
  snap(steps, s, 'Stacking decorators: applied bottom-up. @timer sees the cache-wrapped version. Call order: timer → cache → add.', 8);

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

const ASYNCIO_CODE = [
  'import asyncio, aiohttp',
  '',
  'async def fetch(session, url):',
  '  async with session.get(url) as r:',
  '    return await r.json()  # yields control',
  '',
  'async def main():',
  '  async with aiohttp.ClientSession() as s:',
  '    t1 = asyncio.create_task(fetch(s, url1))',
  '    t2 = asyncio.create_task(fetch(s, url2))',
  '    r1, r2 = await asyncio.gather(t1, t2)',
  '',
  'asyncio.run(main())',
];

const DECORATOR_CODE = [
  'import functools, time',
  '',
  'def timer(fn):',
  '  @functools.wraps(fn)',
  '  def wrapper(*args, **kwargs):',
  '    start = time.perf_counter()',
  '    result = fn(*args, **kwargs)',
  '    elapsed = time.perf_counter() - start',
  '    print(f"{fn.__name__}: {elapsed:.3f}s")',
  '    return result',
  '  return wrapper',
  '',
  '@timer',
  '@functools.lru_cache(maxsize=128)',
  'def add(x, y): return x + y',
];

export const SCENARIOS = [
  {
    id: 'gil',
    label: 'GIL',
    icon: '🔐',
    build: buildGILSteps,
    code: GIL_CODE,
    language: 'Python',
    metrics: [
      { key: 'acquired', label: 'GIL acquired', max: 10, color: 'var(--node-default)' },
      { key: 'released', label: 'GIL released', max: 10, color: 'var(--pod-running)' },
      { key: 'ioOps',    label: 'I/O ops',      max: 5,  color: 'var(--node-comparing)' },
    ],
  },
  {
    id: 'asyncio',
    label: 'asyncio',
    icon: '⚡',
    build: buildAsyncioSteps,
    code: ASYNCIO_CODE,
    language: 'Python',
    metrics: [
      { key: 'tasks',     label: 'Tasks',     max: 5, color: 'var(--node-default)' },
      { key: 'completed', label: 'Completed', max: 5, color: 'var(--pod-running)' },
      { key: 'ioWaiting', label: 'I/O Wait',  max: 5, color: 'var(--node-comparing)' },
    ],
  },
  {
    id: 'decorators',
    label: 'Decorators',
    icon: '🎁',
    build: buildDecoratorSteps,
    code: DECORATOR_CODE,
    language: 'Python',
    metrics: [
      { key: 'calls',  label: 'Calls',       max: 10, color: 'var(--node-default)' },
      { key: 'cached', label: 'Cache Hits',  max: 10, color: 'var(--pod-running)' },
      { key: 'timeMs', label: 'Time (ms)',   max: 500, unit: 'ms', color: 'var(--node-comparing)' },
    ],
  },
];

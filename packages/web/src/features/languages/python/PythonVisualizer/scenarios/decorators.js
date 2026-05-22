import { snap } from '@/core/utils/scenarioShared';

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

export default {
  id: 'decorators',
  label: 'Decorators',
  icon: '🎁',
  build: buildDecoratorSteps,
  code: DECORATOR_CODE,
  language: 'Python',
  layout: 'decorators',
  metrics: [
    { key: 'calls',  label: 'Calls',      max: 10,  color: 'var(--node-default)' },
    { key: 'cached', label: 'Cache Hits', max: 10,  color: 'var(--pod-running)' },
    { key: 'timeMs', label: 'Time (ms)',  max: 500, unit: 'ms', color: 'var(--node-comparing)' },
  ],
};

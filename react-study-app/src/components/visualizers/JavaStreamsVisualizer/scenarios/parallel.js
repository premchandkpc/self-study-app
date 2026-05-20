import { snap } from '@/core/utils/scenarioShared';

function elem(value, state = 'idle') { return { value: String(value), state }; }

function baseState(label) {
  return {
    collectionType: 'streams', stages: [], result: null,
    opsLog: [], pipelineLabel: label,
  };
}

export const PARALLEL_SCENARIOS = [
  {
    id: 'parallel-basic', label: 'parallelStream()', icon: '⚡',
    category: 'parallel', collectionType: 'streams',
    code: [
      'List<Integer> numbers = Arrays.asList(1,2,3,4,5,6,7,8);',
      'int sum = numbers.parallelStream()',
      '    .filter(n -> n % 2 == 0)',
      '    .map(n -> n * 10)',
      '    .reduce(0, Integer::sum);',
      '// Parallel: splits source, processes on multiple threads, then combines',
      '// ForkJoinPool.commonPool() used by default',
      '// Result: 20+40+60+80 = 200',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('parallelStream() — fork-join pipeline');
      s.stages = [
        { op: 'numbers.parallelStream() // SPLIT!', type: 'source', elements: [], active: false },
        { op: '.filter(n → n % 2 == 0) // per chunk', type: 'intermediate', elements: [], active: false },
        { op: '.map(n → n * 10)         // per chunk', type: 'intermediate', elements: [], active: false },
        { op: '.reduce(0, Integer::sum) // per chunk → COMBINE', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'parallelStream() splits source into segments via Spliterator. ForkJoinPool.commonPool() workers process each chunk independently. Spliterator must have SUBSIZED/SUBSIZED characteristics for efficient splitting.', 0);

      s.stages[0].active = true;
      s.stages[0].elements = [elem('1..4', 'idle'), elem('5..8', 'idle')];
      s.opsLog.push({ msg: 'Spliterator splits [1..8] → [1..4] + [5..8]', type: 'ok' });
      snap(steps, s, 'Fork phase: source split into 2 chunks. Worker-1 gets [1,2,3,4], Worker-2 gets [5,6,7,8]. More parallelism = more splits (up to available cores).', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].elements = [elem('2,4', 'passed'), elem('6,8', 'passed')];
      s.stages[0].elements = [elem('1..4', 'passed'), elem('5..8', 'passed')];
      s.opsLog.push({ msg: 'Worker-1 filter: [1,3] removed → [2,4]', type: 'ok' });
      s.opsLog.push({ msg: 'Worker-2 filter: [5,7] removed → [6,8]', type: 'ok' });
      snap(steps, s, 'Filter runs in parallel on each chunk. Worker-1 processes [1,2,3,4] → filters odds → [2,4]. Worker-2 processes [5,6,7,8] → [6,8]. NO communication between workers at this stage.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].elements = [elem('20,40', 'transformed'), elem('60,80', 'transformed')];
      s.opsLog.push({ msg: 'Worker-1 map: 2→20, 4→40', type: 'ok' });
      s.opsLog.push({ msg: 'Worker-2 map: 6→60, 8→80', type: 'ok' });
      snap(steps, s, 'Map runs in parallel. Worker-1: 2→20, 4→40. Worker-2: 6→60, 8→80. Stateless ops (filter+map) trivially parallelizable — no shared mutable state needed.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].elements = [elem('20+40=60', 'collected'), elem('60+80=140', 'collected')];
      s.opsLog.push({ msg: 'Worker-1 reduce: 0+20=20 → +40=60', type: 'ok' });
      s.opsLog.push({ msg: 'Worker-2 reduce: 0+60=60 → +80=140', type: 'ok' });
      snap(steps, s, 'Reduce runs in parallel: each worker computes partial sum. reduce(identity, accumulator, combiner). identity=0, accumulator=Integer::sum. Partial: Worker-1=60, Worker-2=140.', 4);

      s.stages[3].active = false;
      s.result = '200';
      s.opsLog.push({ msg: 'COMBINE: 60 + 140 = 200', type: 'ok' });
      snap(steps, s, 'Join phase: ForkJoinPool collects partial results. Combiner merges: 60 + 140 = 200. Parallel overhead: splitting + thread coordination. Worth it for large datasets (≈10K+ elements). Small data: sequential faster due to overhead.', 5);
      return steps;
    },
  },
  {
    id: 'parallel-reduce', label: 'Reduce: Non-associative Danger', icon: '⚠️',
    category: 'parallel', collectionType: 'streams',
    code: [
      '// BAD: Integer::max is NOT associative? Actually it IS.',
      '// But subtraction is NOT: 5-3-2 ≠ 2-3-5',
      'int wrong = Stream.of(1, 2, 3, 4)',
      '    .parallel()',
      '    .reduce(0, (a, b) -> a - b); // non-associative!',
      '// Sequential: ((0-1)-2)-3-4 = -10',
      '// Parallel: chunks combine differently → WRONG!',
      '// Result: varies depending on split!',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Non-associative accumulator BREAKS in parallel');
      s.stages = [
        { op: 'Stream.of(1,2,3,4).parallel()', type: 'source', elements: [elem('1'), elem('2'), elem('3'), elem('4')], active: false },
        { op: '.reduce(0, (a,b) → a-b) // WRONG!', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Parallel reduce requires associative accumulator. reduce(identity, BinaryOperator) MUST satisfy: op(a, op(b,c)) == op(op(a,b), c). Subtraction fails this!', 0);

      s.stages[0].active = true;
      s.stages[0].elements[0].state = 'active';
      s.stages[0].elements[2].state = 'active';
      snap(steps, s, 'Sequential: identity=0, then 0-1=-1, -1-2=-3, -3-3=-6, -6-4=-10. All correct and deterministic. Result = -10 every time.', 1);

      s.stages[0].elements = [elem('1,2', 'idle'), elem('3,4', 'idle')];
      snap(steps, s, 'Parallel splits into chunks: [1,2] and [3,4]. Each chunk gets its own reduce.', 2);

      s.stages[1].elements = [elem('0-1-2 = -3', 'collected'), elem('0-3-4 = -7', 'collected')];
      s.opsLog.push({ msg: 'Chunk1: 0-1= -1, -1-2= -3', type: 'ok' });
      s.opsLog.push({ msg: 'Chunk2: 0-3= -3, -3-4= -7', type: 'ok' });
      snap(steps, s, 'Worker-1: 0-1=-1, -1-2=-3. Worker-2: 0-3=-3, -3-4=-7. Partial results computed independently.', 3);

      s.result = '? (varies)';
      s.opsLog.push({ msg: 'COMBINE: -3 - (-7) = 4? or combine wrong way?', type: 'error' });
      s.opsLog.push({ msg: 'Expected: -10. Got: varies by split! WRONG!', type: 'error' });
      snap(steps, s, 'Combine step: combiner(a,b) = a-b. Combiner merges -3(op) -7 = -3-(-7) = 4. But correct answer is -10! Non-associative: result depends on split strategy. NEVER use non-associative ops in parallel reduce!', 4);

      s.opsLog.push({ msg: 'Fix: use associative ops (sum, product, max, min)', type: 'ok' });
      snap(steps, s, 'Safe: sum (+), product (*), max, min, minBy, maxBy, String.concat. Unsafe: subtraction, division, average (use Collectors.averagingInt). Rule: parallel reduce requires associative + identity-compatible accumulator.', 5);
      return steps;
    },
  },
  {
    id: 'parallel-vs-seq', label: 'Parallel vs Sequential', icon: '⚖️',
    category: 'parallel', collectionType: 'streams',
    code: [
      '// Sequential: 1 thread, ordered, low overhead',
      'int seq = list.stream()',
      '    .filter(Expensive::check)',
      '    .count();',
      '',
      '// Parallel: many threads, potential speedup',
      'int par = list.parallelStream()',
      '    .filter(Expensive::check)',
      '    .count();',
      '',
      '// Parallel faster when: large dataset, independent ops, expensive computation',
      '// Parallel slower when: small dataset, ordered constraint, stateful ops',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Sequential vs Parallel — when to use each');
      s.stages = [
        { op: 'list.stream()  [single thread]', type: 'source', elements: [], active: false },
        { op: 'list.parallelStream()  [fork-join]', type: 'source', elements: [], active: false },
      ];
      snap(steps, s, 'Decision: stream() vs parallelStream(). Sequential: 1 thread, ordered, predictable. Parallel: ForkJoinPool, unordered unless forEachOrdered, overhead for splitting/merging.', 0);

      s.stages[0].active = true;
      s.stages[0].elements = [elem('1'), elem('2'), elem('3'), elem('4'), elem('5'), elem('6'), elem('7'), elem('8')];
      snap(steps, s, 'Sequential: 1 thread processes all 8 elements in order. Simple, no overhead. Best for: small datasets (≤10K), ordered requirements, cheap per-element ops.', 1);

      s.stages[0].active = false;
      s.stages[1].active = true;
      s.stages[1].elements = [elem('1-4'), elem('5-8')];
      s.opsLog.push({ msg: 'Splits: ForkJoin splits source for parallel processing', type: 'ok' });
      snap(steps, s, 'Parallel: Spliterator splits into chunks. ForkJoinPool common pool uses (usually) #CPU-cores workers. Overhead: split + distribute + combine. Worth it when per-element work is significant.', 2);

      s.stages[1].elements = [elem('1-4'), elem('5-8'), elem('9-12'), elem('13-16')];
      s.opsLog.push({ msg: 'Scales with available cores (more splits = more parallelism)', type: 'ok' });
      snap(steps, s, 'Large dataset (100K+ rows) with expensive filter/map: parallel can give 2-4x speedup on typical machines. But small data with simple ops: parallel is SLOWER than sequential due to overhead.', 3);

      s.opsLog.push({ msg: 'SEQ: good for small data + ordered ops', type: 'ok' });
      s.opsLog.push({ msg: 'PAR: good for large data + CPU-intensive ops', type: 'ok' });
      s.opsLog.push({ msg: 'WARN: parallel + stateful ops = data races!', type: 'error' });
      snap(steps, s, 'Decision guide: parallelStream() when: 1) dataset is large (10K+), 2) ops are CPU-intensive, 3) ops are stateless, 4) order not critical. Otherwise: stream() (sequential). Measure before optimizing!', 4);
      return steps;
    },
  },
];

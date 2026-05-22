import { snap } from '@/core/utils/scenarioShared';

function elem(value, state = 'idle') { return { value: String(value), state }; }

function baseState(opts = {}) {
  return {
    collectionType: 'streams',
    stages: [],
    result: null,
    opsLog: [],
    pipelineLabel: opts.label ?? '',
  };
}

export const CREATION_SCENARIOS = [
  {
    id: 'creation-of', label: 'Stream.of()', icon: '🌱',
    category: 'creation', collectionType: 'streams',
    code: [
      'Stream<String> stream = Stream.of("alice", "bob", "charlie");',
      'List<String> result = stream.collect(Collectors.toList());',
      '// result = ["alice", "bob", "charlie"]',
      '// Stream.of(T… values) creates a finite ordered stream',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState({ label: 'Stream.of() → collect(toList())' });
      s.stages = [
        { op: 'Stream.of("alice", "bob", "charlie")', type: 'source', elements: [], active: false },
        { op: '.collect(toList())', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Stream.of(T... values) is a static factory that creates a sequential ordered stream from varargs. Elements are non-null references.', 0);
      s.stages[0].elements = [elem('"alice"'), elem('"bob"'), elem('"charlie"')];
      s.stages[0].active = true;
      snap(steps, s, 'Stream.of wraps the 3 String values into a stream. The stream is a lazily-evaluated pipeline — no traversal yet. Source is spliterator-based.', 1);
      s.stages[0].active = false;
      s.stages[1].active = true;
      s.stages[1].elements = [elem('"alice"', 'collected'), elem('"bob"', 'collected'), elem('"charlie"', 'collected')];
      s.result = '["alice", "bob", "charlie"]';
      s.opsLog.push({ msg: 'collect(toList()): gathers into ArrayList', type: 'ok' });
      snap(steps, s, 'collect(Collectors.toList()) is a mutable reduction. Terminal op triggers traversal: spliterator advances through source, accumulator adds each to ArrayList, combiner merges (parallel). Result: ["alice", "bob", "charlie"].', 2);
      return steps;
    },
  },
  {
    id: 'creation-list', label: 'Collection.stream()', icon: '📋',
    category: 'creation', collectionType: 'streams',
    code: [
      'List<Integer> list = Arrays.asList(10, 20, 30, 40, 50);',
      'List<Integer> result = list.stream()',
      '    .filter(n -> n > 25)',
      '    .collect(Collectors.toList());',
      '// result = [30, 40, 50]',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState({ label: 'Collection.stream() → filter → collect' });
      s.stages = [
        { op: 'Arrays.asList(10,20,30,40,50).stream()', type: 'source', elements: [], active: false },
        { op: '.filter(n → n > 25)', type: 'intermediate', elements: [], active: false },
        { op: '.collect(toList())', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Collection.stream() creates a stream backed by the collection\'s spliterator. Sequential, ordered (List preserves insertion order).', 0);
      s.stages[0].active = true;
      s.stages[0].elements = [elem('10'), elem('20'), elem('30'), elem('40'), elem('50')];
      snap(steps, s, '5 elements loaded from the List source. Stream is lazy — no filtering yet.', 1);
      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[0].elements = s.stages[0].elements.map(e => e.value === '30' || e.value === '40' || e.value === '50'
        ? { ...e, state: 'passed' } : { ...e, state: 'filtered' });
      s.stages[1].elements = [elem('30', 'idle'), elem('40', 'idle'), elem('50', 'idle')];
      s.opsLog.push({ msg: 'filter: 10,20 removed (≤25)', type: 'warn' });
      s.opsLog.push({ msg: 'filter: 30,40,50 passed (>25)', type: 'ok' });
      snap(steps, s, 'filter(n → n > 25) is a stateless intermediate op. Elements are evaluated lazily when terminal op starts. 10 and 20 dropped (predicate=false). 30, 40, 50 pass through.', 2);
      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].elements = [elem('30', 'collected'), elem('40', 'collected'), elem('50', 'collected')];
      s.result = '[30, 40, 50]';
      s.opsLog.push({ msg: 'collect: result = [30, 40, 50]', type: 'ok' });
      snap(steps, s, 'Terminal op collect triggers pipeline evaluation. Each source element passes through filter then collects into output list. O(n) time, O(n) space.', 3);
      return steps;
    },
  },
  {
    id: 'creation-range', label: 'IntStream.range()', icon: '🔢',
    category: 'creation', collectionType: 'streams',
    code: [
      'int sum = IntStream.range(1, 6)',
      '    .sum();',
      '// 1 + 2 + 3 + 4 + 5 = 15',
      '// IntStream.rangeClosed(1, 5) includes end',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState({ label: 'IntStream.range(1,6).sum()' });
      s.stages = [
        { op: 'IntStream.range(1, 6)', type: 'source', elements: [], active: false },
        { op: '.sum()', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'IntStream.range(start, endExclusive) creates a primitive stream of ints. Avoids boxing overhead of Stream<Integer>.', 0);
      s.stages[0].active = true;
      s.stages[0].elements = [elem('1'), elem('2'), elem('3'), elem('4'), elem('5')];
      snap(steps, s, 'IntStream.range(1, 6) generates 5 elements: 1,2,3,4,5. Spliterator is SIZED + SUBSIZED for optimal splitting in parallel.', 1);
      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].elements = [elem('1', 'collected'), elem('2', 'collected'), elem('3', 'collected'), elem('4', 'collected'), elem('5', 'collected')];
      s.result = '15';
      s.opsLog.push({ msg: 'sum = 1+2+3+4+5 = 15', type: 'ok' });
      snap(steps, s, 'sum() is a terminal reduction. Uses specialized IntSum reduce. 1+2+3+4+5 = 15. O(n). Primitive ops avoid boxing overhead of reduce(0, Integer::sum) on Stream<Integer>.', 2);
      return steps;
    },
  },
  {
    id: 'creation-iterate', label: 'Stream.iterate()', icon: '♾️',
    category: 'creation', collectionType: 'streams',
    code: [
      'Stream<Integer> stream = Stream.iterate(1, n -> n + 2)',
      '    .limit(5);',
      'List<Integer> result = stream.collect(Collectors.toList());',
      '// result = [1, 3, 5, 7, 9]',
      '// iterate(seed, hasNext, next) — Java 9+',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState({ label: 'Stream.iterate(1, n→n+2).limit(5).collect(toList())' });
      s.stages = [
        { op: 'Stream.iterate(1, n → n + 2)', type: 'source', elements: [], active: false },
        { op: '.limit(5)', type: 'intermediate', elements: [], active: false },
        { op: '.collect(toList())', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Stream.iterate(seed, nextFn) creates an UNBOUNDED sequential stream. Produces seed, seed*fn, ... until limit or infinite. Java 9: iterate(seed, hasNext, next) for finite.', 0);
      s.stages[0].active = true;
      s.stages[0].elements = [elem('1'), elem('3'), elem('5'), elem('7'), elem('9'), { value: '…', state: 'idle' }];
      snap(steps, s, 'Unbounded! Without limit(), iterate runs forever. Each element is computed on-demand via next function. seed=1, then 1+2=3, 3+2=5, ... ALWAYS requires limit() or short-circuit to avoid OOM.', 1);
      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[0].elements = [elem('1'), elem('3'), elem('5'), elem('7'), elem('9')];
      s.stages[1].elements = [elem('1', 'passed'), elem('3', 'passed'), elem('5', 'passed'), elem('7', 'passed'), elem('9', 'passed')];
      s.opsLog.push({ msg: 'limit(5): truncates after 5 elements', type: 'ok' });
      s.opsLog.push({ msg: 'without limit: INFINITE elements', type: 'warn' });
      snap(steps, s, 'limit(5) is a short-circuiting stateful intermediate op. After 5 elements pass through, stream is truncated. Essential for infinite streams — prevents unbounded computation.', 2);
      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].elements = [elem('1', 'collected'), elem('3', 'collected'), elem('5', 'collected'), elem('7', 'collected'), elem('9', 'collected')];
      s.result = '[1, 3, 5, 7, 9]';
      snap(steps, s, 'Terminal collect triggered: pipeline evaluates lazily. Each element flows: iterate generates → limit short-circuits after 5 → collect accumulates. Result: [1, 3, 5, 7, 9]. O(n) with n=limit.', 3);
      return steps;
    },
  },
  {
    id: 'creation-generate', label: 'Stream.generate()', icon: '🎲',
    category: 'creation', collectionType: 'streams',
    code: [
      'Stream<Double> stream = Stream.generate(Math::random)',
      '    .limit(4);',
      'List<Double> result = stream.collect(Collectors.toList());',
      '// result = [0.23, 0.87, 0.45, 0.12] (example)',
      '// Supplier<T> — no seed, each call produces next',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState({ label: 'Stream.generate(Math::random).limit(4).collect(toList())' });
      s.stages = [
        { op: 'Stream.generate(Math::random)', type: 'source', elements: [], active: false },
        { op: '.limit(4)', type: 'intermediate', elements: [], active: false },
        { op: '.collect(toList())', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Stream.generate(Supplier) creates an UNBOUNDED sequential stream. Each element is produced by calling the supplier. Unlike iterate, there is NO seed — pure side-effect generation.', 0);
      s.stages[0].active = true;
      s.stages[0].elements = [elem('Math::random'), { value: 'Math::random', state: 'idle' }, { value: 'Math::random', state: 'idle' }];
      snap(steps, s, 'generate() is useful for random numbers, UUIDs, or constant streams. Elements are lazily produced one-by-one. ALWAYS use with limit() unless you want OOM.', 1);
      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].elements = [elem('0.23', 'passed'), elem('0.87', 'passed'), elem('0.45', 'passed'), elem('0.12', 'passed')];
      s.stages[0].elements = [elem('0.23', 'idle'), elem('0.87', 'idle'), elem('0.45', 'idle'), elem('0.12', 'idle')];
      s.opsLog.push({ msg: 'generate: Math::random called 4 times', type: 'ok' });
      s.opsLog.push({ msg: 'limit(4): truncates infinite stream', type: 'ok' });
      snap(steps, s, 'Supplier called 4 times by pipeline, each producing a random double. Sequential vs parallel affects ordering: sequential preserves supplier-call order (FIFO spliterator).', 2);
      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].elements = [elem('0.23', 'collected'), elem('0.87', 'collected'), elem('0.45', 'collected'), elem('0.12', 'collected')];
      s.result = '[0.23, 0.87, 0.45, 0.12]';
      snap(steps, s, 'Terminal collect: pipeline evaluates. 4 random doubles generated, limited, collected. generate() is inherently stateful (side-effecting) — NOT thread-safe in parallel without external sync.', 3);
      return steps;
    },
  },
];

import { snap } from '@/core/utils/scenarioShared';

function elem(value, state = 'idle') { return { value: String(value), state }; }

function baseState(label) {
  return { collectionType: 'streams', stages: [], result: null, opsLog: [], pipelineLabel: label };
}

export const EDGE_CASES_SCENARIOS = [
  {
    id: 'edge-reuse', label: 'Stream Reuse Error', icon: '🚫',
    category: 'edge', collectionType: 'streams',
    code: [
      'Stream<String> stream = Stream.of("a", "b", "c");',
      'stream.forEach(System.out::println); // OK — terminal op',
      'long count = stream.count();          // BOOM!',
      '// java.lang.IllegalStateException:',
      '// "stream has already been operated upon or closed"',
      '// Streams are single-use! Recreate for each pipeline.',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('IllegalStateException: stream already consumed');
      s.stages = [
        { op: 'stream = Stream.of("a","b","c")', type: 'source', elements: [elem('"a"'), elem('"b"'), elem('"c"')], active: false },
        { op: 'stream.forEach(println)  // 1st terminal call', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Stream is a single-use consumable. First terminal op creates and exhausts the pipeline. After that, the stream is CLOSED. This prevents reuse of expensive internal state.', 0);

      s.stages[0].active = true;
      snap(steps, s, 'Stream created: "a","b","c". stream variable holds reference. Looks reusable, but...', 1);

      s.stages[1].active = true;
      s.stages[1].elements = [elem('"a"', 'collected'), elem('"b"', 'collected'), elem('"c"', 'collected')];
      s.opsLog.push({ msg: 'forEach: "a" → "b" → "c" printed', type: 'ok' });
      snap(steps, s, 'forEach() terminal op executes. Stream is now LINKED to this pipeline operation. Internal stream pipeline is exhausted, source closed.', 2);

      s.exception = { type: 'IllegalStateException', msg: 'stream has already been operated upon or closed' };
      s.stages[1].elements = s.stages[1].elements.map(e => ({ ...e, state: 'error' }));
      s.opsLog.push({ msg: 'stream.count() → 💥 IllegalStateException!', type: 'error' });
      s.result = '💥 IllegalStateException';
      snap(steps, s, 'Calling stream.count() on the same stream reference throws IllegalStateException. Stream pipeline is single-shot. FIX: create a new stream for each pipeline: Stream.of("a","b","c").count().', 3);

      s.exception = null;
      s.opsLog.push({ msg: 'FIX: Stream.of("a","b","c").count() — fluent, fresh stream', type: 'ok' });
      s.opsLog.push({ msg: 'FIX: Supplier<Stream<T>> for multiple traversals', type: 'ok' });
      snap(steps, s, 'Solutions: 1) Chain fluently — collect one pipeline per stream variable. 2) Use Supplier<Stream<T>> to create fresh streams when needed. 3) Collect to collection then stream again. Stream is NOT an Iterable.', 4);
      return steps;
    },
  },
  {
    id: 'edge-infinite', label: 'Infinite Stream Danger', icon: '♾️',
    category: 'edge', collectionType: 'streams',
    code: [
      '// DANGER: No limit() → never terminates!',
      'Stream.iterate(1, n -> n + 1)',
      '    .filter(n -> n % 100_000 == 0)',
      '    .findFirst() // OK with short-circuit',
      '',
      '// DEADLY:',
      'List<Integer> list = Stream.iterate(1, n -> n + 1)',
      '    .collect(Collectors.toList()); // OOM! NEVER finishes!',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Infinite stream: without limit/findFirst → OOM');
      s.stages = [
        { op: 'Stream.iterate(1, n→n+1) // INFINITE', type: 'source', elements: [elem('1'), elem('2'), elem('3'), elem('...')], active: false },
        { op: '.collect(toList())  // NEVER ENDS!', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Infinite streams are UNBOUNDED. Without short-circuit (limit, findFirst, anyMatch), they run forever. iterate() and generate() produce infinite sequences. ALWAYS use with a short-circuiting op or limit.', 0);

      s.stages[0].active = true;
      s.stages[0].elements = [elem('1'), elem('2'), elem('3'), { value: '...', state: 'idle' }, { value: '∞', state: 'idle' }];
      snap(steps, s, 'Stream.iterate(1, n→n+1) generates 1,2,3,4,5,... ad infinitum. No stop condition built in.', 1);

      s.stages[1].active = true;
      s.stages[0].elements = [elem('1', 'collected'), elem('2', 'collected'), elem('3', 'collected'), elem('4', 'collected'), elem('5', 'collected')];
      s.opsLog.push({ msg: 'collect: 5 elements collected... still going...', type: 'warn' });
      snap(steps, s, 'collect() starts accumulating elements... 1→2→3→4→5→6→... ArrayList grows, resizes, grows more. No termination.', 2);

      s.opsLog.push({ msg: '10,000 elements... ArrayList resize overhead', type: 'warn' });
      s.opsLog.push({ msg: '100,000 elements... JVM heap filling', type: 'warn' });
      s.opsLog.push({ msg: '💥 OutOfMemoryError: Java heap space', type: 'error' });
      s.exception = { type: 'OutOfMemoryError', msg: 'Infinite stream without limit! Always use limit() or short-circuit terminal op.' };
      s.result = '💥 OOM';
      snap(steps, s, '💥 OutOfMemoryError! .collect(toList()) on an infinite stream never terminates. ArrayList grows until heap exhaustion. ALWAYS use limit() on infinite streams. SAFE: iterate(1, n→n+1).limit(100).collect(toList()). findFirst() and anyMatch() are also safe (short-circuit).', 3);
      return steps;
    },
  },
  {
    id: 'edge-null', label: 'NullPointerException', icon: '💥',
    category: 'edge', collectionType: 'streams',
    code: [
      'Stream<String> s = Stream.of("a", null, "c");',
      's.map(String::toUpperCase) // 💥 NPE on null!',
      '    .collect(Collectors.toList());',
      '',
      '// Stream.of() allows null elements!',
      '// But almost ALL operations then NPE on them',
      '// Use .filter(Objects::nonNull) to guard',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('NullPointerException: Stream.of("a", null, "c").map(String::toUpperCase)');
      s.stages = [
        { op: 'Stream.of("a", null, "c")', type: 'source', elements: [elem('"a"'), elem('null'), elem('"c"')], active: false },
        { op: '.map(String::toUpperCase)', type: 'intermediate', elements: [], active: false },
        { op: '.collect(toList())', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Stream.of() ALLOWS null elements (unlike Stream.ofNullable in Java 9+). But most stream operations NPE on null — including map, filter, sorted, collect.', 0);

      s.stages[1].active = true;
      s.stages[0].elements[0].state = 'passed';
      s.stages[1].elements = [elem('"A"', 'transformed')];
      s.opsLog.push({ msg: '"a" → "A" (toUpperCase worked)', type: 'ok' });
      snap(steps, s, '"a" → toUpperCase → "A". Works fine.', 1);

      s.stages[0].elements[1].state = 'active';
      s.opsLog.push({ msg: 'null → toUpperCase → 💥 NPE!', type: 'error' });
      s.exception = { type: 'NullPointerException', msg: 'Cannot invoke "String.toUpperCase()" because the argument is null' };
      s.result = '💥 NullPointerException';
      snap(steps, s, '💥 null → toUpperCase(null) → NullPointerException. Stream.of() allows null,but most operations do NOT handle null. map, flatMap, filter, sorted all call methods on elements — NPE on null.', 2);

      s.exception = null;
      s.opsLog.push({ msg: 'GUARD: stream.filter(Objects::nonNull).map(...)', type: 'ok' });
      s.opsLog.push({ msg: 'Java 9+: Stream.ofNullable() creates 0/1-element stream', type: 'ok' });
      s.opsLog.push({ msg: 'Optional: stream.flatMap(Optional::stream) for Optionals', type: 'ok' });
      snap(steps, s, 'Guard patterns: 1) filter(Objects::nonNull) before map. 2) Stream.ofNullable (Java 9+). 3) .flatMap(Optional::stream) for optional fields. 4) .map(s → s == null ? "" : s.toUpperCase()). Null safety in streams is YOUR responsibility.', 3);
      return steps;
    },
  },
  {
    id: 'edge-empty', label: 'Empty Stream Edge Cases', icon: '📭',
    category: 'edge', collectionType: 'streams',
    code: [
      'Stream<String> empty = Stream.empty();',
      '',
      'Optional<String> min = empty.min(String::compareTo);',
      '// Optional.empty()  ← NO elements!',
      '',
      'long count = empty.count();',
      '// 0  ← trivial',
      '',
      'boolean any = empty.anyMatch(s -> true);',
      '// false  ← no elements to match',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Empty stream: min/max → Optional.empty, count → 0, anyMatch → false');
      s.stages = [
        { op: 'Stream.empty()', type: 'source', elements: [elem('(empty)')], active: false },
        { op: '.min(String::compareTo) // on empty stream', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Stream.empty() creates an empty sequential stream. No elements. Spliterator has SIZED + SUBSIZED characteristics with size=0. Why useful? Avoid null Stream return types — return Stream.empty() instead.', 0);

      s.stages[0].active = true;
      snap(steps, s, 'Empty stream: zero elements. Stream.of() with no args also works. Stream.empty() is equivalent to Stream.of(). The favorite: return list != null ? list.stream() : Stream.empty();', 1);

      s.stages[1].active = true;
      s.result = 'Optional.empty()';
      s.opsLog.push({ msg: 'min() on empty → Optional.empty()', type: 'ok' });
      snap(steps, s, 'min() on empty stream returns Optional.empty(). max() same. reduce(identity) returns identity (safe). reduce() without identity returns Optional.empty().', 2);

      s.opsLog.push({ msg: 'count() on empty → 0', type: 'ok' });
      s.opsLog.push({ msg: 'anyMatch/allMatch/noneMatch behavior:', type: 'ok' });
      s.opsLog.push({ msg: '  anyMatch → false (∃x: P(x) is false for empty set)', type: 'ok' });
      s.opsLog.push({ msg: '  allMatch → true  (∀x: P(x) is vacuously true)', type: 'ok' });
      s.opsLog.push({ msg: '  noneMatch → true (∄x: P(x))', type: 'ok' });
      snap(steps, s, 'count() → 0. Empty stream edge: anyMatch returns false (no element satisfies), allMatch returns TRUE (vacuous truth — all zero elements satisfy predicate), noneMatch returns TRUE. Find operations return Optional.empty(). collect(toList()) returns empty list.', 3);
      return steps;
    },
  },
];

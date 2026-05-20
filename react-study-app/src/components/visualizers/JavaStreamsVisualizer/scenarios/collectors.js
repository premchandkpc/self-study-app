import { snap } from '@/core/utils/scenarioShared';

function elem(value, state = 'idle') { return { value: String(value), state }; }

function baseState(label) {
  return { collectionType: 'streams', stages: [], result: null, opsLog: [], pipelineLabel: label };
}

export const COLLECTORS_SCENARIOS = [
  {
    id: 'collect-tolist', label: 'toList / toSet', icon: '📋',
    category: 'collectors', collectionType: 'streams',
    code: [
      'List<String> list = stream.collect(Collectors.toList());',
      'Set<String> set = stream.collect(Collectors.toSet());',
      'List<String> unmod = stream.collect(Collectors.toUnmodifiableList());',
      '// toList → ArrayList (ordered, mutable)',
      '// toSet → HashSet (no dups, unordered)',
      '// toUnmodifiableList → immutable (Java 16+)',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('toList, toSet, toUnmodifiableList');
      s.stages = [
        { op: 'stream.of("a","b","c","b","a")', type: 'source', elements: [elem('"a"'), elem('"b"'), elem('"c"'), elem('"b"'), elem('"a"')], active: false },
        { op: 'Collectors.toList()', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Collectors.toList() collects into ArrayList. Ordered, mutable, allows duplicates. Simplest collector — three parts: supplier (ArrayList::new), accumulator (List::add), combiner (List::addAll).', 0);

      s.stages[1].active = true;
      s.stages[1].elements = s.stages[0].elements.map(e => ({ ...e, state: 'collected' }));
      s.result = '["a", "b", "c", "b", "a"]';
      s.opsLog.push({ msg: 'toList: preserves insertion order + duplicates', type: 'ok' });
      snap(steps, s, 'toList(): all 5 elements collected into ArrayList. Order preserved (encounter order). Duplicates kept. Mutable — can modify result list.', 1);

      s.stages[0].elements = s.stages[0].elements.map(e => ({ ...e, state: 'idle' }));
      s.stages[1].elements = s.stages[0].elements.map(e => ({ ...e, state: 'collected' }));
      s.result = '["a", "b", "c", "b", "a"]';
      s.opsLog.push({ msg: 'toUnmodifiableList: same content, but immutable', type: 'ok' });
      s.opsLog.push({ msg: 'Immutable: result.set(0, "z") → UnsupportedOperationException', type: 'warn' });
      snap(steps, s, 'toUnmodifiableList() (Java 16+): same as toList() but returns unmodifiable list. Use for public APIs — prevents caller from modifying internal state.', 2);

      s.stages[1].elements = [elem('"a"', 'collected'), elem('"b"', 'collected'), elem('"c"', 'collected')];
      s.result = '{"a", "b", "c"}';
      s.opsLog.push({ msg: 'toSet: deduplicates "b" and "a"', type: 'warn' });
      snap(steps, s, 'Collectors.toSet() collects into HashSet. Duplicates dropped (via equals/hashCode). "b" and "a" seen twice, only first occurrence kept. Unordered — no iteration order guarantee.', 3);
      return steps;
    },
  },
  {
    id: 'collect-joining', label: 'Collectors.joining', icon: '🔗',
    category: 'collectors', collectionType: 'streams',
    code: [
      'List<String> words = Arrays.asList("Java", "Streams", "are", "powerful");',
      '',
      'String joined = words.stream()',
      '    .collect(Collectors.joining(" | "));',
      '// joined = "Java | Streams | are | powerful"',
      '',
      '// joining() — concat (no delimiter)',
      '// joining(", ") — comma separated',
      '// joining(", ", "[", "]") — with prefix/suffix → "[a, b, c]"',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Collectors.joining(delimiter, prefix, suffix)');
      s.stages = [
        { op: 'stream.of("Java","Streams","are","powerful")', type: 'source', elements: [elem('Java'), elem('Streams'), elem('are'), elem('powerful')], active: false },
        { op: '.collect(joining(" | "))', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Collectors.joining() concatenates CharSequence elements. 3 overloads: joining() (no delimiter), joining(delimiter), joining(delimiter, prefix, suffix). Only for CharSequence streams.', 0);

      s.stages[0].active = true;
      snap(steps, s, 'joining uses StringBuilder internally. Each element is appended with delimiter between. Efficient O(n) — no intermediate list, direct string building.', 1);

      s.stages[0].elements = s.stages[0].elements.map(e => ({ ...e, state: 'collected' }));
      s.result = '"Java | Streams | are | powerful"';
      s.opsLog.push({ msg: 'joining: element1 + delimiter + element2 + ...', type: 'ok' });
      snap(steps, s, 'Result built: "Java" + " | " + "Streams" + " | " + "are" + " | " + "powerful". Efficient single StringBuilder. Parallel: uses combiner for StringBuilder merge.', 2);

      s.opsLog.push({ msg: 'joining(", ", "[", "]") → "[Java, Streams, are, powerful]"', type: 'ok' });
      snap(steps, s, 'joining(", ", "[", "]"): prefix "[" then elements separated by ", " then suffix "]". Result: "[Java, Streams, are, powerful]". Perfect for readable collection output.', 3);
      return steps;
    },
  },
  {
    id: 'collect-grouping', label: 'groupingBy / partitioningBy', icon: '🗂️',
    category: 'collectors', collectionType: 'streams',
    code: [
      'List<String> words = Arrays.asList("cat", "dog", "bird", "fish", "ant");',
      '',
      'Map<Integer, List<String>> byLen = words.stream()',
      '    .collect(Collectors.groupingBy(String::length));',
      '// {3=[cat, dog, ant], 4=[bird, fish]}',
      '',
      'Map<Boolean, List<String>> part = words.stream()',
      '    .collect(Collectors.partitioningBy(s -> s.length() > 3));',
      '// {false=[cat, dog, ant], true=[bird, fish]}',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('groupingBy / partitioningBy — classification');
      s.stages = [
        { op: 'stream.of("cat","dog","bird","fish","ant")', type: 'source', elements: [elem('"cat"(3)'), elem('"dog"(3)'), elem('"bird"(4)'), elem('"fish"(4)'), elem('"ant"(3)')], active: false },
        { op: '.collect(groupingBy(String::length))', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'groupingBy(classifier) is a SQL GROUP BY for streams. Classifier maps each element to a key. Elements with same key grouped into List. Returns Map<K, List<V>>.', 0);

      s.stages[0].active = true;
      snap(steps, s, 'Classifier String::length: each word maps to its length. "cat"(3), "dog"(3) → group 3. "bird"(4), "fish"(4) → group 4. "ant"(3) → group 3.', 1);

      s.stages[0].elements = s.stages[0].elements.map(e => ({ ...e, state: 'collected' }));
      s.result = '{3=[cat, dog, ant], 4=[bird, fish]}';
      s.opsLog.push({ msg: 'groupingBy: length=3 → [cat, dog, ant]', type: 'ok' });
      s.opsLog.push({ msg: 'groupingBy: length=4 → [bird, fish]', type: 'ok' });
      snap(steps, s, 'Result: Map with 2 keys. 3→[cat,dog,ant], 4→[bird,fish]. Internal: HashMap by default (can use groupingByConcurrent for parallel). Also supports: groupingBy(classifier, downstream) where downstream is another collector.', 2);

      s.stages = s.stages.map(st => ({ ...st, active: false }));
      s.stages[1].active = true;
      s.result = '{false=[cat, dog, ant], true=[bird, fish]}';
      s.opsLog.push({ msg: 'partitioningBy: false(≤3) → [cat,dog,ant]', type: 'ok' });
      s.opsLog.push({ msg: 'partitioningBy: true(>3) → [bird,fish]', type: 'ok' });
      snap(steps, s, 'partitioningBy(predicate) is a specialized groupingBy for boolean keys. Always returns 2 keys: true/false. More efficient than groupingBy for binary classification. Map guaranteed to have both keys always.', 3);

      s.opsLog.push({ msg: 'groupingBy + downstream: counting(), mapping(), filtering()', type: 'ok' });
      s.opsLog.push({ msg: 'Example: groupingBy(String::length, counting()) → {3=3, 4=2}', type: 'ok' });
      snap(steps, s, 'Powerful: groupingBy with downstream collector. groupingBy(keyFn, counting()) → count per group. groupingBy(keyFn, mapping(fn, toList())) → transform elements per group. groupingBy(keyFn, filtering(pred, toList())) → filter within group.', 4);
      return steps;
    },
  },
  {
    id: 'collect-summarize', label: 'summarizingInt / Statistics', icon: '📊',
    category: 'collectors', collectionType: 'streams',
    code: [
      'IntSummaryStatistics stats = Stream.of(2, 5, 3, 8, 1, 9, 4)',
      '    .collect(Collectors.summarizingInt(Integer::intValue));',
      '',
      'stats.getCount();    // 7',
      'stats.getSum();      // 32',
      'stats.getMin();      // 1',
      'stats.getMax();      // 9',
      'stats.getAverage();  // 4.57',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('summarizingInt — single-pass statistics');
      s.stages = [
        { op: 'stream.of(2,5,3,8,1,9,4)', type: 'source', elements: [elem('2'), elem('5'), elem('3'), elem('8'), elem('1'), elem('9'), elem('4')], active: false },
        { op: '.collect(summarizingInt(Integer::intValue))', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Collectors.summarizingInt() computes count, sum, min, max, average in ONE pass. No separate count(), sum(), min(), max(), average() calls needed. Has summarizingInt/summarizingLong/summarizingDouble variants.', 0);

      s.stages[1].active = true;
      s.stages[1].elements = s.stages[0].elements.map((e, i) => ({
        ...e, state: 'collected',
        note: i === 0 ? 'count=1 sum=2 min=2 max=2' :
              i === 1 ? 'count=2 sum=7 min=2 max=5' :
              i === 2 ? 'count=3 sum=10 min=2 max=8' :
              i === 3 ? 'count=4 sum=18 min=2 max=8' :
              i === 4 ? 'count=5 sum=19 min=1 max=8' :
              i === 5 ? 'count=6 sum=28 min=1 max=9' :
                        'count=7 sum=32 min=1 max=9 avg=4.57',
      }));
      s.opsLog.push({ msg: 'summarizingInt: computes 5 metrics in single pass', type: 'ok' });
      snap(steps, s, 'Accumulating: each element updates the summary. count=7, sum=32, min=1, max=9, average=4.57. Internal: IntSummaryStatistics class maintains running count + sum + min + max. O(n) time, O(1) memory.', 1);

      s.result = '{count=7, sum=32, min=1, max=9, avg=4.57}';
      snap(steps, s, 'Final statistics. Use summarizingInt over separate calls for efficiency. Also: averagingInt(), summingInt(), count() as standalone collectors for individual metrics.', 2);
      return steps;
    },
  },
];

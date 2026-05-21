import { snap } from '@/core/utils/scenarioShared';

function elem(value, state = 'idle') { return { value: String(value), state }; }

function baseState(label) {
  return {
    collectionType: 'streams', stages: [], result: null,
    opsLog: [], pipelineLabel: label,
  };
}

export const LAZY_SCENARIOS = [
  {
    id: 'lazy-eval', label: 'Lazy Evaluation Demo', icon: '⏳',
    category: 'lazy', collectionType: 'streams',
    code: [
      'Stream<String> stream = Stream.of("a", "b", "c", "d")',
      '    .filter(s -> {',
      '        System.out.println("filter: " + s);',
      '        return true;',
      '    });',
      'System.out.println("After filter (no terminal yet)");',
      '// filter, map, peek, etc — NONE execute without terminal',
      'stream.collect(Collectors.toList());',
      '// NOW filter() runs for each element',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Lazy evaluation: intermediate ops deferred until terminal called');
      s.stages = [
        { op: 'Stream.of("a","b","c","d")', type: 'source', elements: [], active: false },
        { op: '.filter(s→true) // NOT executed yet!', type: 'intermediate', elements: [], active: false },
        { op: '.collect(toList()) // triggers everything', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Lazy evaluation: NO intermediate op executes until a terminal op is called. Stream.of() and filter() construct the pipeline but do NOTHING. This enables processing infinite streams and fusion optimizations.', 0);

      s.stages[0].active = true;
      s.stages[0].elements = [elem('"a"', 'idle'), elem('"b"', 'idle'), elem('"c"', 'idle'), elem('"d"', 'idle')];
      snap(steps, s, 'LINE 2: filter() defined but NOT running. Pipeline is "built" like a recipe — no cooking yet. System.out.println("After filter") prints BEFORE any filter logic.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].elements = [elem('"a"', 'active'), elem('"b"', 'idle'), elem('"c"', 'idle'), elem('"d"', 'idle')];
      s.opsLog.push({ msg: 'filter: a (line 6 runs NOW!)', type: 'ok' });
      snap(steps, s, 'LINE 6: collect() called → pipeline evaluation BEGINS. "a" enters filter. System.out.println fires. This is when lazy work actually happens.', 2);

      s.stages[1].elements = [elem('"a"', 'passed'), elem('"b"', 'active'), elem('"c"', 'idle'), elem('"d"', 'idle')];
      s.opsLog.push({ msg: 'filter: b (element 2/4)', type: 'ok' });
      snap(steps, s, '"b" enters filter. Each element is pulled through the entire pipeline one-by-one (vertical evaluation), not batch by stage (horizontal).', 3);

      s.stages[1].elements = [elem('"a"', 'passed'), elem('"b"', 'passed'), elem('"c"', 'active'), elem('"d"', 'idle')];
      s.opsLog.push({ msg: 'filter: c (element 3/4)', type: 'ok' });
      snap(steps, s, '"c" enters filter. Vertical traversal: each element goes through ALL stages before the next element starts. This is key for short-circuit operations.', 4);

      s.stages[1].elements = [elem('"a"', 'passed'), elem('"b"', 'passed'), elem('"c"', 'passed'), elem('"d"', 'active')];
      s.opsLog.push({ msg: 'filter: d (element 4/4)', type: 'ok' });
      snap(steps, s, '"d" enters filter. All 4 elements evaluated lazily when terminal collect() triggered. Without terminal op, filter NEVER runs.', 5);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].elements = [elem('"a"', 'collected'), elem('"b"', 'collected'), elem('"c"', 'collected'), elem('"d"', 'collected')];
      s.result = '["a", "b", "c", "d"]';
      s.opsLog.push({ msg: 'collect: stream consumed, all elements collected', type: 'ok' });
      snap(steps, s, 'Result collected. Without terminal op: nothing happens. With terminal op: ALL lazy work executes. This pattern separates "what" (declarative) from "when" (triggered by terminal).', 6);
      return steps;
    },
  },
  {
    id: 'lazy-findfirst', label: 'findFirst short-circuit', icon: '🎯',
    category: 'lazy', collectionType: 'streams',
    code: [
      'Stream.of(1, 2, 3, 4, 5, 6, 7, 8)',
      '    .filter(n -> n % 2 == 0)',
      '    .map(n -> {',
      '        System.out.println("map: " + n);',
      '        return n * 10;',
      '    })',
      '    .findFirst()',
      '    .orElse(-1);',
      '// Output: "map: 2"  (ONLY ONE element mapped!)',
      '// Result: Optional[20]',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('findFirst() short-circuits after first match');
      s.stages = [
        { op: 'Stream.of(1…8)', type: 'source', elements: [elem('1'), elem('2'), elem('3'), elem('4'), elem('5'), elem('6'), elem('7'), elem('8')], active: false },
        { op: '.filter(n → n % 2 == 0)', type: 'intermediate', elements: [], active: false },
        { op: '.map(n → n * 10)', type: 'intermediate', elements: [], active: false },
        { op: '.findFirst()', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'findFirst() is a short-circuiting terminal op. Returns Optional of first element matching pipeline. Only processes MINIMUM elements needed — not all 8!', 0);

      s.stages[1].active = true;
      s.stages[0].elements[0].state = 'filtered';
      s.stages[0].elements[1].state = 'active';
      s.opsLog.push({ msg: '1 is odd → filtered out', type: 'warn' });
      snap(steps, s, 'Element 1 enters filter. Predicate false (odd). 1 filtered out. Pipeline continues to next element.', 1);

      s.stages[0].elements[0].state = 'filtered';
      s.stages[0].elements[1].state = 'passed';
      s.stages[1].elements = [elem('2', 'idle')];
      s.stages[2].active = true;
      s.stages[2].elements = [elem('20', 'transformed')];
      s.opsLog.push({ msg: '2 is even → passes filter', type: 'ok' });
      s.opsLog.push({ msg: 'map: 2 → 20', type: 'ok' });
      snap(steps, s, 'Element 2 enters filter. Predicate true (even). Passes through. Then enters map(n→n*10) → 20. NOW findFirst returns Optional.of(20). STOP!', 2);

      s.stages[3].active = true;
      s.stages[3].elements = [elem('20', 'collected')];
      s.result = 'Optional[20]';
      s.opsLog.push({ msg: 'findFirst: found 20 → pipeline STOPS', type: 'ok' });
      s.opsLog.push({ msg: 'Elements 3-8: NEVER processed!', type: 'warn' });
      snap(steps, s, 'findFirst() returns immediately after first matching element. Elements 3-8 are NEVER evaluated. This is critical optimization: lazy + short-circuit means O(result_position) not O(n).', 3);
      return steps;
    },
  },
  {
    id: 'lazy-anymatch', label: 'anyMatch short-circuit', icon: '✅',
    category: 'lazy', collectionType: 'streams',
    code: [
      'Stream.of("apple", "banana", "cherry", "durian", "elderberry")',
      '    .peek(s -> System.out.println("check: " + s))',
      '    .anyMatch(s -> s.startsWith("c"));',
      '// Output:',
      '// check: apple',
      '// check: banana',
      '// check: cherry  ← MATCH! stops here',
      '// Result: true',
      '// durian, elderberry NEVER checked',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('anyMatch short-circuits on first true');
      s.stages = [
        { op: 'Stream.of("apple","banana","cherry","durian","elderberry")', type: 'source', elements: [elem('"apple"'), elem('"banana"'), elem('"cherry"'), elem('"durian"'), elem('"elderberry"')], active: false },
        { op: '.peek(s → println "check: " + s)', type: 'intermediate', elements: [], active: false },
        { op: '.anyMatch(s → s.startsWith("c"))', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'anyMatch(Predicate) returns true if ANY element matches. Short-circuits immediately on first match. false if stream exhausted with no matches. Also: allMatch, noneMatch.', 0);

      s.stages[1].active = true;
      s.stages[1].elements = [elem('"apple"', 'active')];
      s.opsLog.push({ msg: 'peek + anyMatch: "apple" → startsWith("c")? NO', type: 'warn' });
      snap(steps, s, '"apple" enters pipeline. peek prints "check: apple". anyMatch evaluates: startsWith("c")? false. Move to next element.', 1);

      s.stages[1].elements = [elem('"apple"', 'passed'), elem('"banana"', 'active')];
      s.opsLog.push({ msg: '"banana" → startsWith("c")? NO', type: 'warn' });
      snap(steps, s, '"banana" enters. peek prints "check: banana". anyMatch: startsWith("c")? false. Move to next.', 2);

      s.stages[1].elements = [elem('"apple"', 'passed'), elem('"banana"', 'passed'), elem('"cherry"', 'active')];
      s.stages[2].active = true;
      s.stages[2].elements = [elem('"cherry"', 'matched')];
      s.opsLog.push({ msg: '"cherry" → startsWith("c")? YES → short-circuit!', type: 'ok' });
      s.result = 'true';
      snap(steps, s, '"cherry" enters. peek prints "check: cherry". anyMatch: startsWith("c")? TRUE! Short-circuit: returns true. durian, elderberry NEVER processed. O(position_of_match) not O(n).', 3);
      return steps;
    },
  },
];

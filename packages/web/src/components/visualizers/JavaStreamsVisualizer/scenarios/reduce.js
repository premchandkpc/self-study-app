import { snap } from '@/core/utils/scenarioShared';

function elem(value, state = 'idle') { return { value: String(value), state }; }

function baseState(label) {
  return { collectionType: 'streams', stages: [], result: null, opsLog: [], pipelineLabel: label };
}

export const REDUCE_SCENARIOS = [
  {
    id: 'reduce-sum', label: 'reduce / count', icon: '➕',
    category: 'reduce', collectionType: 'streams',
    code: [
      'int sum = Stream.of(3, 7, 2, 9, 4)',
      '    .reduce(0, Integer::sum);',
      '// 0+3=3 → 3+7=10 → 10+2=12 → 12+9=21 → 21+4=25',
      '',
      'long count = Stream.of(3, 7, 2, 9, 4).count();',
      '// Sequential: counter per element = 5',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('reduce(0, Integer::sum) + count()');
      s.stages = [
        { op: 'Stream.of(3,7,2,9,4)', type: 'source', elements: [elem('3'), elem('7'), elem('2'), elem('9'), elem('4')], active: false },
        { op: '.reduce(0, Integer::sum)', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'reduce(identity, BinaryOperator) is a terminal reduction. identity = initial value + default if empty stream. accumulator = (partialResult, element) → newPartialResult. For parallel: must be associative.', 0);

      s.stages[1].active = true;
      s.stages[1].elements = [elem('0+3=3', 'active')];
      s.opsLog.push({ msg: 'step 1: 0 + 3 = 3', type: 'ok' });
      snap(steps, s, 'Step 1: identity(0) + element(3) = 3. Accumulator applies to cumulative result and current element.', 1);

      s.stages[1].elements = [elem('0+3=3', 'passed'), elem('3+7=10', 'active')];
      s.opsLog.push({ msg: 'step 2: 3 + 7 = 10', type: 'ok' });
      snap(steps, s, 'Step 2: partial(3) + element(7) = 10. Running sum accumulates.', 2);

      s.stages[1].elements = [elem('0+3=3', 'passed'), elem('3+7=10', 'passed'), elem('10+2=12', 'active')];
      s.opsLog.push({ msg: 'step 3: 10 + 2 = 12', type: 'ok' });
      snap(steps, s, 'Step 3: 10+2=12. O(n) sequential reduction — each element processed once.', 3);

      s.stages[1].elements = [elem('12+9=21', 'active')];
      s.opsLog.push({ msg: 'step 4: 12 + 9 = 21', type: 'ok' });
      snap(steps, s, 'Step 4: 12+9=21.', 3);

      s.stages[1].elements = [elem('21+4=25', 'active')];
      s.opsLog.push({ msg: 'step 5: 21 + 4 = 25', type: 'ok' });
      s.result = '25';
      snap(steps, s, 'Step 5: 21+4=25. Final sum=25. reduce(0, Integer::sum) is equivalent to sum() for IntStream.', 4);

      s.opsLog.push({ msg: 'count(): long l = stream.count()', type: 'ok' });
      s.result = 'count = 5';
      snap(steps, s, 'count() is a terminal op that counts stream elements. Sequential: O(n) simple counter. Parallel: count() uses specialized Spliterator COUNT_SUBSIZED characteristic for O(1) when available.', 5);
      return steps;
    },
  },
  {
    id: 'reduce-minmax', label: 'min / max', icon: '📈',
    category: 'reduce', collectionType: 'streams',
    code: [
      'Optional<Integer> min = Stream.of(42, 17, 89, 5, 63)',
      '    .min(Integer::compare);',
      '// min = Optional[5]',
      '',
      'Optional<Integer> max = Stream.of(42, 17, 89, 5, 63)',
      '    .max(Integer::compare);',
      '// max = Optional[89]',
      '',
      '// Returns Optional — empty if stream is empty!',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('min() / max() — comparator-based reduction');
      s.stages = [
        { op: 'Stream.of(42,17,89,5,63)', type: 'source', elements: [elem('42'), elem('17'), elem('89'), elem('5'), elem('63')], active: false },
        { op: '.min(Integer::compare)', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'min(Comparator) returns Optional of minimum element. max(Comparator) for maximum. Both are terminal reductions. Uses reduce internally: BinaryOperator.minBy/minBy. O(n).', 0);

      s.stages[0].active = true;
      s.stages[0].elements[0].state = 'active';
      s.opsLog.push({ msg: 'current min: 42', type: 'ok' });
      snap(steps, s, 'First element 42 → current min = 42.', 1);

      s.stages[0].elements[0].state = 'passed';
      s.stages[0].elements[1].state = 'active';
      s.opsLog.push({ msg: '17 < 42 → new min: 17', type: 'ok' });
      snap(steps, s, '17 < 42, min updates to 17.', 2);

      s.stages[0].elements[1].state = 'passed';
      s.stages[0].elements[2].state = 'active';
      s.opsLog.push({ msg: '89 > 17 → min stays: 17', type: 'ok' });
      snap(steps, s, '89 > 17, min unchanged.', 3);

      s.stages[0].elements[2].state = 'passed';
      s.stages[0].elements[3].state = 'active';
      s.opsLog.push({ msg: '5 < 17 → new min: 5', type: 'ok' });
      snap(steps, s, '5 < 17, min updates to 5.', 4);

      s.stages[0].elements[3].state = 'passed';
      s.stages[0].elements[4].state = 'active';
      s.opsLog.push({ msg: '63 > 5 → min stays: 5', type: 'ok' });
      s.result = 'Optional[5]';
      snap(steps, s, '63 > 5, no change. Final min = Optional[5]. Returns Optional — empty for empty streams. max() works identically with reverse comparison. Both O(n).', 5);
      return steps;
    },
  },
  {
    id: 'reduce-match', label: 'anyMatch / allMatch / noneMatch', icon: '✅',
    category: 'reduce', collectionType: 'streams',
    code: [
      'boolean any = Stream.of(1, 3, 5, 7, 8, 9)',
      '    .anyMatch(n -> n % 2 == 0);   // true (8 matches)',
      '',
      'boolean all = Stream.of(2, 4, 6, 8)',
      '    .allMatch(n -> n % 2 == 0);   // true',
      '',
      'boolean none = Stream.of(1, 3, 5, 7)',
      '    .noneMatch(n -> n % 2 == 0);  // true (none even)',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('anyMatch / allMatch / noneMatch');
      s.stages = [
        { op: 'Stream.of(1,3,5,7,8,9)', type: 'source', elements: [elem('1'), elem('3'), elem('5'), elem('7'), elem('8'), elem('9')], active: false },
        { op: '.anyMatch(n → n % 2 == 0)', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Short-circuiting terminal ops: anyMatch returns true if ANY element matches. allMatch returns false FIRST non-matching. noneMatch returns true if NONE match. All return boolean (not Optional).', 0);

      s.stages[1].active = true;
      s.stages[0].elements[0].state = 'active';
      s.opsLog.push({ msg: '1 % 2 == 0? false → continue', type: 'warn' });
      snap(steps, s, '1: n%2==0? false. Not a match. Continue scanning.', 1);

      s.stages[0].elements[0].state = 'passed';
      s.stages[0].elements[1].state = 'active';
      s.opsLog.push({ msg: '3 % 2 == 0? false → continue', type: 'warn' });
      snap(steps, s, '3: n%2==0? false. Continue.', 2);

      s.stages[0].elements[1].state = 'passed';
      s.stages[0].elements[2].state = 'active';
      s.opsLog.push({ msg: '5 % 2 == 0? false → continue', type: 'warn' });
      snap(steps, s, '5: false. Continue.', 3);

      s.stages[0].elements[2].state = 'passed';
      s.stages[0].elements[3].state = 'active';
      s.opsLog.push({ msg: '7 % 2 == 0? false → continue', type: 'warn' });
      snap(steps, s, '7: false. Continue.', 4);

      s.stages[0].elements[3].state = 'passed';
      s.stages[0].elements[4].state = 'active';
      s.opsLog.push({ msg: '8 % 2 == 0? TRUE → return true!', type: 'ok' });
      s.result = 'true';
      snap(steps, s, '8: n%2==0? TRUE! anyMatch short-circuits returning true. Element 9 NEVER processed. anyMatch = OR (∃). allMatch = AND (∀). noneMatch = NOR (∄). Short-circuit rules: anyMatch stops on first T, allMatch stops on first F, noneMatch stops on first T.', 5);

      s.opsLog.push({ msg: 'allMatch stops on first false', type: 'warn' });
      s.opsLog.push({ msg: 'noneMatch stops on first true', type: 'warn' });
      snap(steps, s, 'allMatch([1,3,5,7,8,9], n→n%2==0): element 1 is false → immediate false. noneMatch([1,3,5,7], n→n%2==0): 1 is false, 3 false, 5 false, 7 false → true (none matched). All O(result_position) not O(n).', 6);
      return steps;
    },
  },
  {
    id: 'reduce-find', label: 'findFirst / findAny', icon: '🔍',
    category: 'reduce', collectionType: 'streams',
    code: [
      'Optional<String> first = Stream.of("x", "y", "z")',
      '    .findFirst();',
      '// Sequential: always "x" (encounter order)',
      '',
      'Optional<String> any = stream.parallel()',
      '    .filter(s -> s.length() > 2)',
      '    .findAny();',
      '// Parallel: any match — NOT deterministic!',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('findFirst() — deterministic. findAny() — nondeterministic (parallel).');
      s.stages = [
        { op: 'Stream.of("x","y","z")', type: 'source', elements: [elem('"x"'), elem('"y"'), elem('"z"')], active: false },
        { op: '.findFirst()', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'findFirst() returns Optional of first element in encounter order. Respects order even in parallel — comes at a cost (synchronized). findAny() returns any element — more efficient in parallel.', 0);

      s.stages[1].active = true;
      s.stages[0].elements[0].state = 'active';
      s.opsLog.push({ msg: 'findFirst: element "x" → return first', type: 'ok' });
      s.result = 'Optional["x"]';
      snap(steps, s, 'findFirst() returns Optional["x"] — first in encounter order. "y" and "z" never processed due to short-circuit. Sequential: simple. Parallel: must respect encounter order (may need synchronization).', 1);

      s.opsLog.push({ msg: 'findAny: parallel — returns first result available (nondeterministic)', type: 'warn' });
      snap(steps, s, 'findAny(): parallel-friendly. Returns ANY matching element — no ordering guarantee. More efficient in parallel because no ordering constraints. Sequential: typically returns first but NOT guaranteed.', 2);
      return steps;
    },
  },
];

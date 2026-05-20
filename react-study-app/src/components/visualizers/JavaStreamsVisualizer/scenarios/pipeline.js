import { snap } from '@/core/utils/scenarioShared';

function elem(value, state = 'idle') { return { value: String(value), state }; }

function baseState(label) {
  return {
    collectionType: 'streams', stages: [], result: null,
    opsLog: [], pipelineLabel: label,
  };
}

export const PIPELINE_SCENARIOS = [
  {
    id: 'pipe-filter-map', label: 'filter → map → collect', icon: '🔀',
    category: 'pipeline', collectionType: 'streams',
    code: [
      'List<Integer> result = Stream.of(1,2,3,4,5,6)',
      '    .filter(n -> n % 2 == 0)   // intermediate: predicate',
      '    .map(n -> n * 10)           // intermediate: function',
      '    .collect(Collectors.toList()); // terminal: mutable reduction',
      '// result = [20, 40, 60]',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('filter → map → collect (lazy → eager)');
      s.stages = [
        { op: 'Stream.of(1…6)', type: 'source', elements: [elem('1'), elem('2'), elem('3'), elem('4'), elem('5'), elem('6')], active: false },
        { op: '.filter(n → n % 2 == 0)', type: 'intermediate', elements: [], active: false },
        { op: '.map(n → n * 10)', type: 'intermediate', elements: [], active: false },
        { op: '.collect(toList())', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Pipeline: 6 elements from source → filter → map → collect. Intermediate ops are LAZY — nothing executes until collect() is called.', 0);

      s.stages[1].active = true;
      s.stages[0].elements = s.stages[0].elements.map(e => {
        const val = parseInt(e.value);
        return val % 2 === 0 ? { ...e, state: 'passed' } : { ...e, state: 'filtered' };
      });
      s.stages[1].elements = [elem('2', 'idle'), elem('4', 'idle'), elem('6', 'idle')];
      s.opsLog.push({ msg: 'filter: 1,3,5 removed (odd)', type: 'warn' });
      s.opsLog.push({ msg: 'filter: 2,4,6 passed (even)', type: 'ok' });
      snap(steps, s, 'filter() evaluates predicate n%2==0 on each element. Odd numbers 1,3,5 are dropped. Evens 2,4,6 pass to next stage. Stateless — no prior element state needed.', 1);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].elements = [elem('20', 'transformed'), elem('40', 'transformed'), elem('60', 'transformed')];
      s.stages[1].elements = s.stages[1].elements.map(e => ({ ...e, state: 'passed' }));
      s.opsLog.push({ msg: 'map: 2→20, 4→40, 6→60', type: 'ok' });
      snap(steps, s, 'map() applies function n→n*10 to each element. Transforms Integer to Integer. Stateless operation — 1:1 mapping (same count as input).', 2);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].elements = [elem('20', 'collected'), elem('40', 'collected'), elem('60', 'collected')];
      s.result = '[20, 40, 60]';
      s.opsLog.push({ msg: 'collect(toList): [20, 40, 60]', type: 'ok' });
      snap(steps, s, 'collect() terminal op triggers FULL pipeline evaluation. Each source element flows through filter → map → accumulator (ArrayList.add). O(n) time, O(n) space for result list.', 3);

      s.stages[3].active = false;
      snap(steps, s, 'Done. Pipeline laziness means intermediate ops fused into single pass. No intermediate collections created — allows processing of infinite streams (with limit).', 4);
      return steps;
    },
  },
  {
    id: 'pipe-sorted-forEach', label: 'sorted → forEach', icon: '📊',
    category: 'pipeline', collectionType: 'streams',
    code: [
      'Stream.of("fig", "apple", "date", "cherry", "banana")',
      '    .sorted()                   // stateful intermediate',
      '    .forEach(System.out::println); // terminal: consume',
      '// Output (alphabetical):',
      '// apple → banana → cherry → date → fig',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('sorted() → forEach (stateful)');
      s.stages = [
        { op: 'Stream.of("fig","apple","date","cherry","banana")', type: 'source', elements: [elem('fig'), elem('apple'), elem('date'), elem('cherry'), elem('banana')], active: false },
        { op: '.sorted()', type: 'intermediate', elements: [], active: false },
        { op: '.forEach(System.out::println)', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'sorted() is a STATEful intermediate op. Unlike filter/map, it must BUFFER ALL elements before producing output. O(n log n) overhead in serial.', 0);

      s.stages[0].active = true;
      snap(steps, s, 'Input elements: fig, apple, date, cherry, banana (unsorted order). sorted() collects all into temporary array, sorts via Arrays.sort (TimSort for objects, O(n log n)).', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].elements = [elem('apple', 'passed'), elem('banana', 'passed'), elem('cherry', 'passed'), elem('date', 'passed'), elem('fig', 'passed')];
      s.opsLog.push({ msg: 'sorted(): TimSort O(n log n)', type: 'ok' });
      snap(steps, s, 'sorted() produces alphabetically ordered: apple, banana, cherry, date, fig. Stateful: entire stream must be buffered before output. Memory = O(n).', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].elements = [elem('apple', 'collected'), elem('banana', 'collected'), elem('cherry', 'collected'), elem('date', 'collected'), elem('fig', 'collected')];
      s.result = 'apple banana cherry date fig';
      s.opsLog.push({ msg: 'forEach: System.out::println ×5', type: 'ok' });
      snap(steps, s, 'forEach(Consumer) is a terminal op that applies the action to each element. Here System.out::println prints each. forEach is NOT ordered for parallel streams — use forEachOrdered() when order matters.', 3);
      return steps;
    },
  },
  {
    id: 'pipe-distinct-limit', label: 'distinct → limit', icon: '🎯',
    category: 'pipeline', collectionType: 'streams',
    code: [
      'Stream.of(3,1,4,1,5,9,2,6,5,3,5)',
      '    .distinct()        // stateful: needs tracking',
      '    .limit(4)           // short-circuiting',
      '    .collect(Collectors.toList());',
      '// result = [3, 1, 4, 2] (first 4 distinct)',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('distinct() → limit(4) → collect');
      s.stages = [
        { op: 'Stream.of(3,1,4,1,5,9,2,6,5,3,5)', type: 'source', elements: [elem('3'), elem('1'), elem('4'), elem('1'), elem('5'), elem('9'), elem('2'), elem('6'), elem('5'), elem('3'), elem('5')], active: false },
        { op: '.distinct()', type: 'intermediate', elements: [], active: false },
        { op: '.limit(4)', type: 'intermediate', elements: [], active: false },
        { op: '.collect(toList())', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'distinct() uses a Set internally to track seen elements. Stateful operation — O(n) memory for duplicates. equals()/hashCode() based.', 0);

      s.stages[1].active = true;
      s.stages[1].elements = [elem('3', 'new'), elem('1', 'new'), elem('4', 'new'), elem('5', 'new'), elem('9', 'new'), elem('2', 'new'), elem('6', 'new')];
      s.stages[0].elements = s.stages[0].elements.map(e => {
        const dups = { '1': true, '5': true, '3': true };
        return dups[e.value] && ['1', '5', '3'].indexOf(e.value) !== -1 && ['1', '5', '3'].indexOf(e.value) !== 0
          ? { ...e, state: 'filtered' } : e.state === 'idle' ? { ...e, state: 'passed' } : e;
      });
      // simplify: mark all elements properly
      s.stages[0].elements = [
        { value: '3', state: 'idle' }, { value: '1', state: 'idle' }, { value: '4', state: 'idle' },
        { value: '1', state: 'filtered' }, { value: '5', state: 'idle' }, { value: '9', state: 'idle' },
        { value: '2', state: 'idle' }, { value: '6', state: 'idle' }, { value: '5', state: 'filtered' },
        { value: '3', state: 'filtered' }, { value: '5', state: 'filtered' },
      ];
      s.opsLog.push({ msg: 'distinct: 1,5,3 are duplicates, dropped', type: 'warn' });
      snap(steps, s, 'distinct() uses HashSet to track seen elements. Duplicates 1 (index 3), 5 (index 8), 3 (index 9), 5 (index 10) are dropped. First occurrence preserved (encounter order for sequential).', 1);

      s.stages[0].active = false; s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].elements = [elem('3', 'passed'), elem('1', 'passed'), elem('4', 'passed'), elem('2', 'passed')];
      s.stages[1].elements = s.stages[1].elements.filter((_, i) => i < 4);
      s.opsLog.push({ msg: 'limit(4): first 4 distinct elements', type: 'ok' });
      snap(steps, s, 'limit(4) short-circuits: after 4 distinct elements (3,1,4,2) pass through, remaining elements (5,9,6) are discarded. Pipeline stops early — important for infinite streams.', 2);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].elements = [elem('3', 'collected'), elem('1', 'collected'), elem('4', 'collected'), elem('2', 'collected')];
      s.result = '[3, 1, 4, 2]';
      s.opsLog.push({ msg: 'collect: [3, 1, 4, 2] first 4 distinct', type: 'ok' });
      snap(steps, s, 'collect triggers pipeline. Only 4 elements flow through. Combined short-circuit: limit caps distinct. Result: [3, 1, 4, 2].', 3);
      return steps;
    },
  },
  {
    id: 'pipe-skip-limit', label: 'skip → limit (pagination)', icon: '📄',
    category: 'pipeline', collectionType: 'streams',
    code: [
      'Stream.of("Pg1", "Pg2", "Pg3", "Pg4", "Pg5", "Pg6", "Pg7")',
      '    .skip(2)    // drop first 2',
      '    .limit(3)   // take next 3',
      '    .collect(toList());',
      '// page 2 (items 3-5): [Pg3, Pg4, Pg5]',
      '// SQL equivalent: OFFSET 2 LIMIT 3',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('skip(2) → limit(3) — pagination pattern');
      s.stages = [
        { op: 'Stream.of(Pg1…Pg7)', type: 'source', elements: [elem('Pg1'), elem('Pg2'), elem('Pg3'), elem('Pg4'), elem('Pg5'), elem('Pg6'), elem('Pg7')], active: false },
        { op: '.skip(2)', type: 'intermediate', elements: [], active: false },
        { op: '.limit(3)', type: 'intermediate', elements: [], active: false },
        { op: '.collect(toList())', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'skip+limit = pagination pattern. skip(n) discards first n elements. limit(m) takes next m. Equivalent to SQL OFFSET n LIMIT m.', 0);

      s.stages[1].active = true;
      s.stages[0].elements[0].state = 'skipped'; s.stages[0].elements[1].state = 'skipped';
      s.stages[0].elements[2].state = 'passed'; s.stages[0].elements[3].state = 'passed'; s.stages[0].elements[4].state = 'passed';
      s.stages[1].elements = [elem('Pg3', 'idle'), elem('Pg4', 'idle'), elem('Pg5', 'idle')];
      s.opsLog.push({ msg: 'skip(2): Pg1, Pg2 discarded', type: 'warn' });
      snap(steps, s, 'skip(2) discards first 2 elements. Stateful: must count through skipped elements. Useful for pagination — skips to desired page offset.', 1);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].elements = [elem('Pg3', 'passed'), elem('Pg4', 'passed'), elem('Pg5', 'passed')];
      s.opsLog.push({ msg: 'limit(3): Pg3, Pg4, Pg5 taken', type: 'ok' });
      snap(steps, s, 'limit(3) takes next 3 elements: Pg3, Pg4, Pg5. Remaining elements (Pg6, Pg7) are discarded by short-circuit. Pipeline stops early.', 2);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].elements = [elem('Pg3', 'collected'), elem('Pg4', 'collected'), elem('Pg5', 'collected')];
      s.result = '[Pg3, Pg4, Pg5]';
      s.opsLog.push({ msg: 'collect: page 2 = [Pg3, Pg4, Pg5]', type: 'ok' });
      snap(steps, s, 'Result: Pg1,Pg2 skipped → Pg3,Pg4,Pg5 collected → Pg6,Pg7 not processed. Pagination with skip+limit is O(n) for skip portion. Performance tip: avoid large skip on DB-backed streams.', 3);
      return steps;
    },
  },
  {
    id: 'pipe-peek', label: 'peek (debug pipeline)', icon: '👁️',
    category: 'pipeline', collectionType: 'streams',
    code: [
      'Stream.of("  alice ", "BOB", "Charlie")',
      '    .peek(s -> System.out.println("raw: " + s))',
      '    .map(String::trim)',
      '    .peek(s -> System.out.println("trimmed: " + s))',
      '    .map(String::toLowerCase)',
      '    .collect(Collectors.toList());',
      '// result = ["alice", "bob", "charlie"]',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('peek() — debugging pipeline state at each stage');
      s.stages = [
        { op: 'Stream.of("  alice ", "BOB", "Charlie")', type: 'source', elements: [elem('"  alice "'), elem('"BOB"'), elem('"Charlie"')], active: false },
        { op: '.peek(println "raw: " + s)', type: 'intermediate', elements: [], active: false },
        { op: '.map(String::trim)', type: 'intermediate', elements: [], active: false },
        { op: '.peek(println "trimmed: " + s)', type: 'intermediate', elements: [], active: false },
        { op: '.map(String::toLowerCase)', type: 'intermediate', elements: [], active: false },
        { op: '.collect(toList())', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'peek() is an intermediate op primarily for debugging. It applies a Consumer to each element passing through, then passes the element unchanged to next stage. NOT for production.', 0);

      s.stages[1].active = true;
      s.stages[1].elements = [elem('"  alice "', 'idle'), elem('"BOB"', 'idle'), elem('"Charlie"', 'idle')];
      s.opsLog.push({ msg: 'peek: raw: "  alice "', type: 'ok' });
      s.opsLog.push({ msg: 'peek: raw: "BOB"', type: 'ok' });
      s.opsLog.push({ msg: 'peek: raw: "Charlie"', type: 'ok' });
      snap(steps, s, 'First peek() prints raw values. peek is called per element during pipeline evaluation. Each element enters peek → exits unchanged → passes to next stage.', 1);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].elements = [elem('"alice"', 'transformed'), elem('"BOB"', 'transformed'), elem('"Charlie"', 'transformed')];
      s.stages[3].active = true;
      s.stages[3].elements = [elem('"alice"', 'idle'), elem('"BOB"', 'idle'), elem('"Charlie"', 'idle')];
      s.stages[4].active = true;
      s.stages[4].elements = [elem('"alice"', 'transformed'), elem('"bob"', 'transformed'), elem('"charlie"', 'transformed')];
      s.stages[5].active = true;
      s.stages[5].elements = [elem('"alice"', 'collected'), elem('"bob"', 'collected'), elem('"charlie"', 'collected')];
      s.result = '["alice", "bob", "charlie"]';
      s.opsLog.push({ msg: 'map: trim → alice, BOB, Charlie', type: 'ok' });
      s.opsLog.push({ msg: 'map: toLowerCase → alice, bob, charlie', type: 'ok' });
      s.opsLog.push({ msg: 'collect: final result', type: 'ok' });
      snap(steps, s, 'Full pipeline: raw → peek → trim → peek → lowercase → collect. Each element passes through ALL stages sequentially. peek allows logging at each stage WITHOUT modifying elements. Use peek judiciously — side effects in functional style confuse intent.', 2);
      return steps;
    },
  },
];

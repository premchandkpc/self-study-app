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
    interview: {
      title: 'filter → map → collect Interview',
      qa: [
        {
          q: 'Why is filter() called an intermediate operation?',
          a: 'Intermediate ops are lazy — they don\'t execute until a terminal op is invoked. filter() returns a new Stream without evaluating the predicate on any element. The predicate is stored as a function to apply later, deferring computation.',
        },
        {
          q: 'Explain lazy evaluation. Why is it important?',
          a: 'Lazy evaluation means ops are deferred until necessary. Here: filter+map don\'t run until collect() is called. Benefits: (1) short-circuits like limit() can stop early, (2) avoids creating intermediate collections (filter doesn\'t create a list of evens, just a predicate), (3) enables infinite streams with conditions like Stream.iterate(0, i→i+1).filter(i→i>1000000).limit(5).',
        },
        {
          q: 'What\'s the difference between filter() and map()?',
          a: 'filter(Predicate): emits or drops elements based on boolean test (0:n mapping — drops duplicates). map(Function): transforms each element 1:1 (count in = count out). Both are stateless and intermediate. Example: filter(n→n%2==0) drops odds; map(n→n*10) scales all.',
        },
        {
          q: 'Is this pipeline O(n) or O(n²)? Why?',
          a: 'O(n). Each element flows through filter→map in a single pass. Lazy fusion: stream library optimizes intermediate ops into one loop (not 3 loops). Result: ∑(1 filter check + 1 multiplication) per element = O(n). Without fusion, O(3n) → O(n) with optimizations.',
        },
        {
          q: 'What if we write Stream.of(1…6).filter(...).map(...).collect()?',
          a: 'Nothing happens until .collect() is called. The intermediate ops build a pipeline DAG (directed acyclic graph) of lambdas. collect() triggers eager evaluation from source. Each element: 1→(filter check)→(if pass: map)→(collect). If filter rejects, element skips map and goes to next.',
        },
        {
          q: 'Can we use collect(Collectors.toSet()) instead? What changes?',
          a: 'Yes. Collector changes how results are accumulated. toSet() uses HashSet (unordered, no duplicates). toList() uses ArrayList (ordered, allows duplicates). If filter produces duplicates (won\'t, but if map did), toSet would deduplicate. Time: both O(n), space: both O(n).',
        },
        {
          q: 'What if filter rejects all elements? E.g., filter(n→false)?',
          a: 'Stream is empty after filter. map() is never called (lazy). collect(toList()) returns empty ArrayList []. No elements flow to map. This is short-circuit behavior without explicit limit().',
        },
        {
          q: 'Explain "mutable reduction" in collect(toList()).',
          a: 'Reduction = combining elements into a single value/container. Mutable = the result container (ArrayList) is modified in place (add() mutates). Immutable reduction would be reduce((a,b)→a+b) or collect(Collectors.joining()). Mutable reductions are often more efficient than building new collections.',
        },
        {
          q: 'Can this pipeline be parallelized? Stream.of(1…6).parallel().filter(...).map(...).collect()?',
          a: 'Yes. parallel() splits stream into chunks, each thread runs filter+map, results merge in collect. Work: each thread does O(n/p) where p=threads. Overhead: thread creation, merging results. For n=6, sequential beats parallel (overhead > work). Effective when n >> 1000.',
        },
        {
          q: 'Is the filter predicate called once per element or multiple times per element?',
          a: 'Once per element (due to short-circuit optimization). Stream library inlines and fuses filter+map into single iteration: for(int x : source) { if(predicate(x)) collect(function(x)); }. Predicate called once per source element. If no fusion, JIT compiler still optimizes to single pass.',
        },
        {
          q: 'What happens if filter or map throw exceptions?',
          a: 'Exception propagates to caller of collect(). Filter: if predicate throws during evaluation, exception halts pipeline (element not processed further). Map: if function throws, exception thrown, remaining elements not processed. Collect itself can throw if accumulator fails. No partial results returned.',
        },
        {
          q: 'Can we chain multiple filters/maps? filter(...).filter(...).map(...)?',
          a: 'Yes. Each filter is lazy. If first filter rejects, second filter not called (short-circuit). Multiple maps combine via function composition in bytecode (JIT inlining). Performance: same O(n) due to fusion, no intermediate collections. Readability: sometimes clearer to combine: filter(n→n%2==0 && n>2).',
        },
      ],
    },
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
    interview: {
      title: 'sorted → forEach Interview',
      qa: [
        {
          q: 'Why is sorted() called stateful while filter/map are stateless?',
          a: 'Stateful = depends on prior element state or requires buffering. sorted() must see ALL elements before outputting any (needs global order). Stateless = each element processed independently (filter just checks predicate on current element, map only uses current value). sorted() must accumulate into internal array/heap before producing output.',
        },
        {
          q: 'What happens internally when sorted() is called?',
          a: 'When sorted() is invoked (the method call), it returns a new stream wrapping a Spliterator that will sort. Real work happens on terminal op: elements are collected into byte[] (T[]), sorted via Arrays.sort (TimSort), then splitted back into stream. TimSort: adaptive O(n log n), O(1) space for nearly-sorted data.',
        },
        {
          q: 'What is TimSort and why is it used for sorted()?',
          a: 'TimSort = hybrid sorting algorithm (merge + insertion). Optimized for real-world data (often partially sorted). O(n log n) worst, O(n) best (already sorted). Uses O(n) temp space. Java\'s default for Objects.sort(). For primitives, uses quicksort (faster, less stable). sorted() uses Objects.sort, so O(n) extra memory.',
        },
        {
          q: 'How much memory does sorted() consume for a 1 million element stream?',
          a: 'For 1M Strings: (1) source stream: minimal, (2) sorted() buffer: 1M refs = ~4-8MB (depends on String size + ref overhead), (3) TimSort temp array: ~1M refs = ~4-8MB. Total O(n) space. For comparison, toList() also O(n). sorted() is NOT memory-efficient for large streams.',
        },
        {
          q: 'Can sorted() handle infinite streams like Stream.iterate()?',
          a: 'No. sorted() is terminal-blocking for infinite streams. Stream.iterate(0, i→i+1).sorted().forEach(...) will hang forever (waiting for all ∞ elements before sorting). Must use limit() first: .limit(1000).sorted().forEach(). This is why stateful ops are dangerous with infinite streams.',
        },
        {
          q: 'What is forEach() and why is it a terminal op?',
          a: 'forEach(Consumer): applies action to each element, returns void. Terminal because: (1) returns nothing (no new Stream), (2) triggers pipeline evaluation (consumes stream), (3) after forEach, stream is exhausted and cannot be reused. Used for side effects (printing, mutating external state), not recommended for pure functional style.',
        },
        {
          q: 'What\'s the difference between forEach() and forEachOrdered()?',
          a: 'forEach(): parallel streams may iterate in ANY order (order not guaranteed). forEachOrdered(): guarantees encounter order even in parallel (slower for parallel due to synchronization). Sequential streams: both identical. Use forEachOrdered when order matters in parallel context.',
        },
        {
          q: 'If sorted() buffers all elements, how does it work with parallel streams?',
          a: 'Parallel: each thread receives a partition of elements, sorts independently (O(n/p log n/p) per thread). Merge phase: sorted partitions merged via multi-way merge (O(n log p)). Total: O(n log n) theoretically, but overhead can make sequential faster for small n. Buffering still O(n), but done across threads.',
        },
        {
          q: 'What comparator does sorted() use if no argument provided?',
          a: 'Natural ordering. For Strings: Comparable.compareTo (alphabetical). Element type must implement Comparable, else ClassCastException. sorted(Comparator) allows custom logic: sorted((a,b)→b.compareTo(a)) for reverse order.',
        },
        {
          q: 'What if stream contains null? E.g., stream with [fig, null, apple]?',
          a: 'sorted() throws NullPointerException during compareTo(null). Null is not comparable in natural order. Workaround: filter(Objects::nonNull) before sorted(), or use custom Comparator: Comparator.nullsLast(Comparator.naturalOrder()).',
        },
        {
          q: 'Is forEach([System.out::println) a good way to print stream elements?',
          a: 'For quick debugging: yes. For production: avoid (side effects break functional style, not composable, hard to test). Better: collect to list, then iterate separately. Or use peek(System.out::println) for debugging (but not shipped). forEach is for side effects; use it consciously.',
        },
        {
          q: 'What if forEach is called but collect() is called later?',
          a: 'Impossible. forEach is terminal — stream is consumed after forEach. Calling collect() after forEach() throws IllegalStateException: stream is already consumed. Once terminal op runs, stream cannot be reused. Design: stream pipeline is single-use, immutable.',
        },
      ],
    },
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
    interview: {
      title: 'distinct → limit Interview',
      qa: [
        {
          q: 'How does distinct() determine if an element is a duplicate?',
          a: 'Uses equals() and hashCode(). Internally maintains a HashSet. For each element: hashCode() computed → bucket found → equals() checked. If found in set, element is dropped; else added to set and output. Relies on correct equals/hashCode implementation.',
        },
        {
          q: 'Why is distinct() stateful and expensive?',
          a: 'Must maintain state (HashSet) across all elements. Space: O(n) for set of unique elements (worst: all unique). Time: O(n) average (amortized O(1) hashset ops). Cannot know if element is duplicate until it\'s seen, so buffering is implicit via set. Large streams = large memory footprint.',
        },
        {
          q: 'What if distinct() is combined with limit()? Does limit() optimize distinct()?',
          a: 'Yes! limit() is short-circuiting. distinct().limit(4) doesn\'t need all unique elements, just first 4. Once 4 unique elements found, limit stops pulling from distinct. distinct still maintains set internally, but stream terminates early. Net: fewer elements processed, but still O(#unique before limit) memory.',
        },
        {
          q: 'What is the relationship between equals() and hashCode()?',
          a: 'Contract: if a.equals(b), then a.hashCode() == b.hashCode(). Violating this breaks distinct() (duplicates not detected). Example: class Person without override → uses identity (Object.hashCode). Two Person("Alice") objects ≠ via equals (default), but should be. Fix: @Override equals+hashCode.',
        },
        {
          q: 'What if stream elements are custom objects without equals()/hashCode()?',
          a: 'Uses default Object.equals/hashCode: identity-based (a==b only if same reference). Two Person("Alice") are different even if fields match. distinct() treats them as distinct. To fix: implement equals+hashCode OR use custom Comparator-like approach (but distinct takes no arg).',
        },
        {
          q: 'How much memory does distinct() use for Stream.of(1…1000000) with no duplicates?',
          a: 'O(1000000) = ~4-8MB for Integer refs in HashSet. If 99% duplicates, same memory (set stores first 10000). distinct() must track seen values, so worst case = stream size. For 1B elements, 4GB+ sets are feasible but impractical.',
        },
        {
          q: 'What happens if we do distinct().distinct()? Is it redundant?',
          a: 'Yes. Second distinct() is redundant (stream already has no duplicates). But JVM/compiler won\'t optimize it away (stream don\'t apply algebraic simplification). Result: same as single distinct(), just slower (extra HashSet creation, iteration). Avoid redundancy in code review.',
        },
        {
          q: 'What is a short-circuit operation and why does limit() qualify?',
          a: 'Short-circuit = can terminate before processing all elements. limit(n): after n elements emitted, stops pulling from upstream (distinct, source). Other short-circuits: findFirst, findAny, anyMatch, allMatch. opposite: collect (must consume all elements). limit enables pagination and early termination.',
        },
        {
          q: 'If limit(n) is reached, do remaining elements get garbage collected immediately?',
          a: 'Depends on upstream. limit() stops pulling, so source iterator not advanced further. If source is Stream.of (in-memory), remaining elements are already in memory (still referenced until GC). If source is database, remaining rows not fetched (lazy). Once terminal op completes, stream closed, references released.',
        },
        {
          q: 'What if limit(0) is called? Result?',
          a: 'Empty stream. limit(0) emits 0 elements, so collect(toList()) returns []. limit(n) where n≤0 treats as 0. No exception thrown. Useful for defensive programming: if pageSize==0, return empty without error.',
        },
        {
          q: 'Can we use distinct() + limit() to get "first N distinct values" from a sorted stream?',
          a: 'Yes. sorted().distinct().limit(n) gives first n distinct in order. Sequence: sort all (O(n log n)), emit distinct (O(n) set ops), limit after n unique (early stop). Efficient if n << total distinct count. Alternative: first deduplicate, then sort (might be faster if huge duplicates).',
        },
        {
          q: 'What is the difference between distinct() and using a Set collector?',
          a: 'collect(Collectors.toSet()): collects ALL elements into a Set (result is Set, not List). distinct().collect(Collectors.toList()): filters duplicates, result is List (ordered, encounter order). Both use sets internally, but one returns Set, other returns List with no duplicates. Choose based on result type needed.',
        },
      ],
    },
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
    interview: {
      title: 'skip → limit (pagination) Interview',
      qa: [
        {
          q: 'What is the pagination pattern and why is skip+limit useful?',
          a: 'Pagination = dividing results into pages. Page 1: skip(0).limit(10). Page 2: skip(10).limit(10). Page 3: skip(20).limit(10). Allows fetching N items per page at offset. SQL: OFFSET n LIMIT m. Streams: skip(n).limit(m). Efficient for large datasets (only fetch one page).',
        },
        {
          q: 'Why is skip() stateful?',
          a: 'skip(n) must count through first n elements without emitting. State = counter (internal). Must maintain position: "I\'ve skipped k elements, have I reached n?" O(n) time to skip (must pull n elements), O(1) extra space (just counter). Unbuffered (doesn\'t store skipped elements).',
        },
        {
          q: 'What is the time complexity of skip(n) + limit(m)?',
          a: 'Time: O(n+m) to process first n+m elements (skipped n, emitted m). Remaining elements not touched (lazy short-circuit). Space: O(1) for skip, O(m) for collect result. Overall O(n+m) time, O(m) space. Important for pagination: skip small n, the cost is low.',
        },
        {
          q: 'Can we use skip() on infinite streams? E.g., Stream.iterate(0, i→i+1).skip(1000000)?',
          a: 'Yes! Unlike sorted(), skip() is not terminal-blocking. It lazily counts and skips. Call doesn\'t hang until terminal op. Stream.iterate(...).skip(1M).limit(10).forEach(...) works: skips 1M (pulls 1M from iterate), takes next 10, terminates. Time: O(1M+10), safe.',
        },
        {
          q: 'What is the difference between skip() and filter() with a counter?',
          a: 'skip(n): efficiently skips first n (built-in, optimized). filter with counter: filter((x)→{if(count++<n) skip; else emit;}) is less efficient (predicate called per element, manual counting). filter can skip conditionally (skip every 3rd), skip() only first n. Use skip for fixed offsets.',
        },
        {
          q: 'What happens if skip(n) where n > stream size?',
          a: 'Result: empty stream. skip(1000) on stream of 7 elements skips all 7, emits 0. No exception. Useful for defensive code: skip(offset).limit(pageSize) handles offset >= size gracefully (returns empty page).',
        },
        {
          q: 'What if skip and limit are reversed: limit(3).skip(2)?',
          a: 'Different result. limit(3).skip(2): take first 3 (Pg1,Pg2,Pg3) → skip 2 (Pg3 only). vs skip(2).limit(3): skip 2 (Pg1,Pg2) → take 3 (Pg3,Pg4,Pg5). Order matters! Semantically: limit first = take page 1, then skip within; skip first = skip to page, then take page size. Always skip before limit for pagination.',
        },
        {
          q: 'How is skip() implemented? Does it buffer elements?',
          a: 'No buffering. Uses counter + iterator. For each element: if counter < n, counter++, discard element (don\'t emit); else emit. Pseudocode: var count=0; return stream().filter(x→{if(count<n){count++;return false;} return true;}). Unbuffered, O(1) space.',
        },
        {
          q: 'In database pagination (SELECT ... OFFSET m LIMIT n), is skip/limit a good pattern?',
          a: 'For small offsets (m<10K): yes. For large offsets (m=1M): slow (DB must scan+discard m rows). Streams are in-memory (fast to skip), DB pagination can be expensive. Better: keyset pagination (WHERE id > last_id LIMIT n, no offset). Streams: skip fine for any size (in-memory). DB: use keyset for production.',
        },
        {
          q: 'What if multiple skip() are chained? skip(2).skip(3)?',
          a: 'Composable: skip(2).skip(3) = skip(5) logically (skip 2+3=5 elements). JVM may or may not optimize this to single skip (depends on JIT). Functionally identical. Avoid redundancy: use single skip(5) for clarity.',
        },
        {
          q: 'How would you implement client-side pagination with skip/limit?',
          a: 'Page p, page size s: skip(p*s).limit(s). Page 0: skip(0).limit(10) [items 0-9]. Page 1: skip(10).limit(10) [items 10-19]. Page 2: skip(20).limit(10) [items 20-29]. Handle edge: if p*s > stream size, result empty. UI: detect empty, disable "next" button.',
        },
        {
          q: 'In parallel streams, does skip() work correctly? E.g., parallel().skip(5)?',
          a: 'Yes. parallel().skip(n).limit(m) works but is tricky. skip() must coordinate across threads to skip exactly n globally. Each partition skips proportionally. Result: first n elements globally skipped (encounter order lost in parallel). Use .sequential() before skip if order matters: stream.skip(5).parallel() instead.',
        },
      ],
    },
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
    interview: {
      title: 'peek (debug pipeline) Interview',
      qa: [
        {
          q: 'What is peek() and why is it primarily for debugging?',
          a: 'peek(Consumer): intermediate op that applies side effect (e.g., print) to each element, then passes element unchanged downstream. Returns Stream<T>, so can chain further ops. NOT for production because: (1) side effects contradict functional paradigm, (2) unreliable in parallel (order undefined), (3) performance cost (side effect per element), (4) hard to test.',
        },
        {
          q: 'Why does peek() pass elements unchanged? What is the distinction from map()?',
          a: 'peek() = side effect only (void Consumer, no return). Element enters → action executed (print, count) → element exits unchanged. map() = transformation (Function with return). Element enters → transformed to new value → exits with new value. peek changes state outside stream (observables); map changes elements inside stream.',
        },
        {
          q: 'What happens if peek() throws an exception?',
          a: 'Exception propagates, pipeline halts. Element not processed further, downstream ops not called. Example: peek(x→{if(x.equals("error")) throw new RuntimeException();}) throws on that element, remaining elements not processed. Useful for validation in debug mode.',
        },
        {
          q: 'Is peek() lazy? When does the Consumer execute?',
          a: 'peek() itself is lazy. When peek(c) is called, c is stored, not executed. c is invoked during terminal op evaluation, per-element. Example: Stream.of(1,2,3).peek(System.out::println).collect(toList()) prints 1,2,3 during collect, not before. Key: peek is lazy, deferred until terminal op.',
        },
        {
          q: 'Can multiple peek() calls be chained? stream.peek(...).peek(...)?',
          a: 'Yes. Multiple peeks chain. Each executed in order during pipeline. stream.peek(print "step 1").map(...).peek(print "step 2").collect() executes step 1 → map → step 2 per element. Order: peek1 → map → peek2. Useful for tracing through pipeline stages.',
        },
        {
          q: 'What is the difference between peek(System.out::println) and forEach(System.out::println)?',
          a: 'peek(): intermediate, lazy, returns Stream, can chain further ops. forEach(): terminal, eager, returns void, stream consumed. peek(p).map(...).collect() works (peek is middle stage). forEach(p).map(...) fails (stream consumed by forEach). For debugging: use peek. For final action: use forEach.',
        },
        {
          q: 'In parallel streams, is peek() execution order guaranteed?',
          a: 'No. parallel().peek(System.out::println) may print elements in any order (work split across threads). For sequential: encounter order preserved. For parallel: no order guarantee. forEachOrdered() does give order even in parallel, but peek doesn\'t. Test with parallel streams: element order in peek output is unpredictable.',
        },
        {
          q: 'What if peek() modifies external state? E.g., peek(x→counter++)?',
          a: 'Works, but dangerous. counter++ is side effect. In parallel: race condition (multiple threads increment unsafely). Must synchronize or use atomic. Even sequential: mutation breaks functional paradigm (hard to test, reason about). Avoid mutable external state in peek. Better: use collect(Collectors.counting()) for counts.',
        },
        {
          q: 'Can peek() be used in production for logging?',
          a: 'Sometimes, carefully. Logging in peek: stream.peek(x→logger.debug("element: " + x)) is acceptable IF: (1) logger is thread-safe, (2) logging overhead acceptable, (3) not critical (logging disabled in prod). But: prefer explicit logging outside stream. Better: logged.add(x) in forEach, then log list (clearer intent).',
        },
        {
          q: 'What is the performance impact of peek()?',
          a: 'Per-element overhead: Consumer invocation + execution (usually print/log, O(log) to O(n) depending on consumer). For N elements: O(N * consumer_cost). If consumer is println (slow, I/O): significant overhead. If consumer is no-op: negligible (JIT may eliminate). Remove peek from production; use it only during debugging.',
        },
        {
          q: 'How would you use peek() to debug a multi-stage pipeline?',
          a: 'Insert peek at each stage: stream.peek(x→print("source: "+x)).filter(...).peek(x→print("post-filter: "+x)).map(...).peek(x→print("post-map: "+x)).collect(). Output shows transformation at each stage. Helps identify where elements are lost/transformed unexpectedly.',
        },
        {
          q: 'Is peek() guaranteed to be called for all elements?',
          a: 'Only if all elements reach that stage in pipeline. Short-circuit ops (limit, findFirst) may stop early. Example: stream.peek(print).limit(3).forEach(...) only prints first 3 (limit stops after 3). Peek downstream of short-circuit: may not execute for all source elements.',
        },
      ],
    },
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

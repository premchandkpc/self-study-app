import { snap } from '@/core/utils/scenarioShared';

function elem(value, state = 'idle') { return { value: String(value), state }; }

function baseState(label) {
  return {
    collectionType: 'streams', stages: [], result: null,
    opsLog: [], pipelineLabel: label,
  };
}

export const FLATMAP_SCENARIOS = [
  {
    id: 'flatmap-nested', label: 'flatMap nested lists', icon: '📦',
    category: 'flatmap', collectionType: 'streams',
    code: [
      'List<List<Integer>> nested = Arrays.asList(',
      '    Arrays.asList(1, 2),',
      '    Arrays.asList(3, 4, 5),',
      '    Arrays.asList(6)',
      ');',
      'List<Integer> flat = nested.stream()',
      '    .flatMap(List::stream)   // stream of streams → stream',
      '    .collect(Collectors.toList());',
      '// flat = [1, 2, 3, 4, 5, 6]',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('flatMap: [[1,2],[3,4,5],[6]] → [1,2,3,4,5,6]');
      s.stages = [
        { op: '[[1,2],[3,4,5],[6]].stream()', type: 'source', elements: [elem('[1,2]'), elem('[3,4,5]'), elem('[6]')], active: false },
        { op: '.flatMap(List::stream)', type: 'intermediate', elements: [], active: false },
        { op: '.collect(toList())', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'flatMap is a mapping + flattening operation. Each element is mapped to a Stream, then all streams are concatenated into one. Signature: flatMap(Function<T, Stream<R>>).', 0);

      s.stages[1].active = true;
      s.stages[0].elements[0].state = 'active';
      s.stages[1].elements = [elem('1', 'new'), elem('2', 'new')];
      s.opsLog.push({ msg: 'flatMap: [1,2] → 2 elements streamed', type: 'ok' });
      snap(steps, s, 'First inner list [1,2] → flatMap applies List::stream → Stream(1,2). These 2 elements are "flattened" into the output stream.', 1);

      s.stages[1].elements = [elem('1', 'idle'), elem('2', 'idle'), elem('3', 'new'), elem('4', 'new'), elem('5', 'new')];
      s.stages[0].elements[0].state = 'passed'; s.stages[0].elements[1].state = 'active';
      s.opsLog.push({ msg: 'flatMap: [3,4,5] → 3 elements streamed', type: 'ok' });
      snap(steps, s, 'Second inner list [3,4,5] → flatMap emits 3 more elements. Accumulating: 5 elements total so far in flattened stream. flatMap can produce 0→many per input.', 2);

      s.stages[1].elements = [elem('1', 'idle'), elem('2', 'idle'), elem('3', 'idle'), elem('4', 'idle'), elem('5', 'idle'), elem('6', 'new')];
      s.stages[0].elements[1].state = 'passed'; s.stages[0].elements[2].state = 'active';
      s.opsLog.push({ msg: 'flatMap: [6] → 1 element streamed', type: 'ok' });
      snap(steps, s, 'Third inner list [6] → flatMap emits 1 element. Total: 6 elements from 3 input lists. flatMap can change cardinality (here 3→6). map() would be 1:1, flatMap is 1:many.', 3);

      s.stages[0].elements[2].state = 'passed';
      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].elements = [elem('1', 'collected'), elem('2', 'collected'), elem('3', 'collected'), elem('4', 'collected'), elem('5', 'collected'), elem('6', 'collected')];
      s.result = '[1, 2, 3, 4, 5, 6]';
      s.opsLog.push({ msg: 'collect: flattened result = [1,2,3,4,5,6]', type: 'ok' });
      snap(steps, s, 'Terminal collect: single flat list. flatMap vs map(List::stream).collect(toList()): map creates Stream<Stream<Integer>> (nested). flatMap flattens to Stream<Integer>. Key difference.', 4);
      return steps;
    },
  },
  {
    id: 'flatmap-words', label: 'flatMap sentences → words', icon: '📝',
    category: 'flatmap', collectionType: 'streams',
    code: [
      'List<String> sentences = Arrays.asList(',
      '    "Hello world",',
      '    "Java streams are cool",',
      '    "flatMap is powerful"',
      ');',
      'List<String> words = sentences.stream()',
      '    .flatMap(s -> Arrays.stream(s.split(" ")))',
      '    .collect(Collectors.toList());',
      '// words = [Hello, world, Java, streams, are, cool, flatMap, is, powerful]',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('flatMap: sentences → words (split)');
      s.stages = [
        { op: 'sentences.stream()', type: 'source', elements: [elem('"Hello world"'), elem('"Java streams are cool"'), elem('"flatMap is powerful"')], active: false },
        { op: '.flatMap(s → s.split(" ").stream())', type: 'intermediate', elements: [], active: false },
        { op: '.collect(toList())', type: 'terminal', elements: [], active: false },
      ];
      snap(steps, s, 'Common pattern: split sentences into words. Each sentence → array of words → stream of words → flatMap merges into single stream of words.', 0);

      s.stages[1].active = true;
      s.stages[0].elements[0].state = 'active';
      s.stages[1].elements = [elem('Hello', 'new'), elem('world', 'new')];
      s.opsLog.push({ msg: 'flatMap: "Hello world" → 2 words', type: 'ok' });
      snap(steps, s, 'First sentence split on space → ["Hello", "world"] → Arrays.stream creates Stream<String>. flatMap flattens these 2 words into output stream.', 1);

      s.stages[1].elements = [elem('Hello', 'idle'), elem('world', 'idle'), elem('Java', 'new'), elem('streams', 'new'), elem('are', 'new'), elem('cool', 'new')];
      s.stages[0].elements[0].state = 'passed'; s.stages[0].elements[1].state = 'active';
      s.opsLog.push({ msg: 'flatMap: "Java streams are cool" → 4 words', type: 'ok' });
      snap(steps, s, 'Second sentence → 4 more words. Running total: 6 words. flatMap with split() is O(total_words) — highly efficient for text processing pipelines.', 2);

      s.stages[1].elements = [elem('Hello', 'idle'), elem('world', 'idle'), elem('Java', 'idle'), elem('streams', 'idle'), elem('are', 'idle'), elem('cool', 'idle'), elem('flatMap', 'new'), elem('is', 'new'), elem('powerful', 'new')];
      s.stages[0].elements[1].state = 'passed'; s.stages[0].elements[2].state = 'active';
      s.opsLog.push({ msg: 'flatMap: "flatMap is powerful" → 3 words', type: 'ok' });
      snap(steps, s, 'Third sentence → 3 more words. Total: 9 words from 3 sentences. flatMap enables elegant text processing chained with filter, distinct, etc.', 3);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].elements = [
        elem('Hello', 'collected'), elem('world', 'collected'), elem('Java', 'collected'),
        elem('streams', 'collected'), elem('are', 'collected'), elem('cool', 'collected'),
        elem('flatMap', 'collected'), elem('is', 'collected'), elem('powerful', 'collected'),
      ];
      s.result = '[Hello, world, Java, streams, are, cool, flatMap, is, powerful]';
      s.opsLog.push({ msg: 'collect: 9 words total', type: 'ok' });
      snap(steps, s, 'Final result: all 9 words collected. flatMap + split + filter + distinct is a powerful text analysis pipeline pattern. Memory: O(total words).', 4);
      return steps;
    },
  },
];

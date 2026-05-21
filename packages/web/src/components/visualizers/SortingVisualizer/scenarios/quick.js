import { snap } from '@/core/utils/scenarioShared';

const DEFAULT_ARR = [5, 3, 8, 1, 9, 2, 7, 4];

function buildQuickSteps({ arr: inputArr = DEFAULT_ARR } = {}) {
  const steps = [];
  const raw = Array.isArray(inputArr) ? inputArr.filter((v) => Number.isFinite(v)).slice(0, 12) : [];
  const initial = raw.length >= 2 ? raw : DEFAULT_ARR;

  const s = {
    arr: initial.map((v) => ({ val: v, state: 'idle' })),
    comparisons: 0,
    swaps: 0,
    pass: 0,
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
    vars: { pivot: null, lo: 0, hi: initial.length - 1, partitionIdx: 0 },
    partitionRange: null,
  };

  snap(steps, s, 'Quick Sort: Pick pivot, partition around it, recurse on sub-arrays.', 1, 'O(n log n) avg');

  const arr = initial.slice();
  let passCount = 0;

  function quickSort(lo, hi) {
    if (lo >= hi) {
      if (lo === hi) {
        s.arr[lo] = { val: arr[lo], state: 'sorted' };
      }
      return;
    }

    passCount++;
    s.metrics.passes = passCount;

    const pivot = arr[hi];
    s.vars = { pivot, lo, hi, partitionIdx: lo };
    s.partitionRange = { lo, hi };

    s.arr = arr.map((v, idx) => {
      if (idx === hi) return { val: v, state: 'pivot' };
      if (idx < lo || idx > hi) return { val: v, state: 'sorted' };
      return { val: v, state: 'idle' };
    });
    snap(steps, s, `Pivot = ${pivot} (arr[${hi}]). Partitioning range [${lo}..${hi}].`, 4, 'O(n log n) avg');

    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      s.comparisons++;
      s.metrics.comparisons = s.comparisons;
      s.arr = arr.map((v, idx) => {
        if (idx === hi) return { val: v, state: 'pivot' };
        if (idx === j) return { val: v, state: 'comparing' };
        if (idx <= i && idx >= lo) return { val: v, state: 'window' };
        if (idx < lo || idx > hi) return { val: v, state: 'sorted' };
        return { val: v, state: 'idle' };
      });
      s.vars = { pivot, lo, hi, i, j, 'arr[j]': arr[j], partitionIdx: i + 1 };
      snap(steps, s, `Compare arr[${j}]=${arr[j]} ≤ pivot=${pivot}? ${arr[j] <= pivot ? 'Yes → move left' : 'No → leave right'}.`, 6, 'O(n log n) avg');

      if (arr[j] <= pivot) {
        i++;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        s.swaps++;
        s.metrics.swaps = s.swaps;
        s.arr = arr.map((v, idx) => {
          if (idx === hi) return { val: v, state: 'pivot' };
          if (idx <= i && idx >= lo) return { val: v, state: 'window' };
          if (idx < lo || idx > hi) return { val: v, state: 'sorted' };
          return { val: v, state: 'idle' };
        });
        s.vars = { pivot, lo, hi, i, j, 'arr[i]': arr[i], 'arr[j]': arr[j], partitionIdx: i + 1 };
        snap(steps, s, `Swap arr[${i}] ↔ arr[${j}]. Left partition grows.`, 7, 'O(n log n) avg');
      }
    }

    // place pivot
    [arr[i + 1], arr[hi]] = [arr[hi], arr[i + 1]];
    s.swaps++;
    s.metrics.swaps = s.swaps;
    const pivotPos = i + 1;
    s.arr = arr.map((v, idx) => {
      if (idx === pivotPos) return { val: v, state: 'sorted' };
      if (idx < lo || idx > hi) return { val: v, state: 'sorted' };
      return { val: v, state: 'idle' };
    });
    s.vars = { pivot, lo, hi, wallI: i, pivotPos, 'arr[pivotPos]': arr[pivotPos], swaps: s.swaps };
    snap(steps, s, `Pivot ${pivot} placed at index ${pivotPos}. Now in final position!`, 9, 'O(n log n) avg');

    quickSort(lo, pivotPos - 1);
    quickSort(pivotPos + 1, hi);
  }

  quickSort(0, arr.length - 1);

  s.arr = arr.map((v) => ({ val: v, state: 'sorted' }));
  s.vars = { pivot: null, lo: 0, hi: arr.length - 1, partitionIdx: arr.length };
  s.partitionRange = null;
  snap(steps, s, `Quick Sort complete! ${s.comparisons} comparisons, ${s.swaps} swaps.`, 12, 'O(n log n) avg');

  return steps;
}

export const QUICK_CODE = [
  'void quickSort(int[] arr, int lo, int hi) {',
  '  if (lo >= hi) return;',
  '',
  '  int pivot = arr[hi];',
  '  int i = lo - 1;',
  '  for (int j = lo; j < hi; j++) {',
  '    if (arr[j] <= pivot) {',
  '      swap(arr, ++i, j);',
  '    }',
  '  }',
  '  swap(arr, i + 1, hi); // place pivot',
  '  int p = i + 1;',
  '  quickSort(arr, lo, p - 1);',
  '  quickSort(arr, p + 1, hi);',
  '}',
];

export default {
  id: 'quick',
  label: 'Quick Sort',
  icon: '⚡',
  build: buildQuickSteps,
  inputs: [
    { key: 'arr', label: 'Array (comma-sep, max 12)', type: 'array-num', default: DEFAULT_ARR },
  ],
  code: QUICK_CODE,
  language: 'Java',
  metrics: [
    { key: 'comparisons', label: 'Comparisons', max: 30, color: 'var(--node-comparing)' },
    { key: 'swaps',       label: 'Swaps',       max: 15, color: 'var(--node-active)' },
    { key: 'passes',      label: 'Partitions',  max: 8,  color: 'var(--pod-running)' },
  ],
  codeNotes: [
    { title: 'Partition-Based', content: 'Choose pivot (last element). Partition: left ≤ pivot < right. Recursively sort left & right.' },
    { title: 'Pivot Selection', content: 'Last element: O(n²) on sorted data. Random: O(n log n) avg. Median-of-3: O(n log n) practical.' },
    { title: 'In-Place Sorting', content: 'O(log n) extra space (recursion stack). One pointer from left, one from right. Zero temporary arrays.' },
    { title: 'NOT Stable', content: 'Equal elements may reorder. Use 3-way partition (< = >) for many duplicates to avoid O(n²).' },
  ],
  tradeoffs: [
    { pro: 'Avg O(n log n), fastest in practice due to cache locality', con: 'Worst O(n²) if pivot always smallest/largest (rare with random pivot).' },
    { pro: 'O(log n) extra space (only recursion stack)', con: 'Unstable sort; not suitable if order of equal elements matters.' },
    { pro: 'No extra array allocations', con: 'Unstable; need 3-way partition for many duplicates.' },
    { pro: '10-50% faster than Merge Sort on random data', con: 'Poor on nearly-sorted data (reverse sorted = O(n²)).' },
  ],
  bestPractices: [
    'Use random pivot or median-of-3 to avoid O(n²) worst case. Don\'t hardcode first/last element.',
    'Introsort: if recursion depth > 2*log(n), switch to Heapsort to guarantee O(n log n) in worst case. Used in C++ std::sort.',
    'For many duplicates: 3-way partition (< = >) reduces to O(n) on highly repetitive data.',
    'For nearly-sorted: avoid Quicksort (O(n²)). Use Timsort (detects sorted runs) or Insertion Sort for already 90% sorted.',
    'Randomize: use random.shuffle() before sorting, or random pivot selection. Makes adversarial input impossible.',
  ],
};

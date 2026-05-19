import { snap } from './shared';

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
    s.vars = { pivot, lo, hi, partitionIdx: pivotPos };
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
};

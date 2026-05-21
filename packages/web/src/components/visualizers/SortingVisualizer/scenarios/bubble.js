import { snap } from '@/core/utils/scenarioShared';

const DEFAULT_ARR = [5, 3, 8, 1, 9, 2, 7, 4];

function buildBubbleSteps({ arr: inputArr = DEFAULT_ARR } = {}) {
  const steps = [];
  const raw = Array.isArray(inputArr) ? inputArr.filter((v) => Number.isFinite(v)).slice(0, 12) : [];
  const initial = raw.length >= 2 ? raw : DEFAULT_ARR;

  const s = {
    arr: initial.map((v) => ({ val: v, state: 'idle' })),
    comparisons: 0,
    swaps: 0,
    pass: 0,
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
    vars: { i: 0, j: 0, comparing: [], swaps: 0, pass: 0 },
    result: null,
  };

  snap(steps, s, 'Array ready for Bubble Sort. Each pass bubbles the largest element to the end.', 1, 'O(n²)');

  const arr = initial.slice();
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    s.pass = i + 1;
    s.metrics.passes = i + 1;
    s.vars.pass = i + 1;

    for (let j = 0; j < n - i - 1; j++) {
      // mark comparing
      s.arr = arr.map((v, idx) => ({
        val: v,
        state: idx === j || idx === j + 1 ? 'comparing' : idx >= n - i ? 'sorted' : 'idle',
      }));
      s.comparisons += 1;
      s.metrics.comparisons = s.comparisons;
      s.vars = { i, j, n, 'arr[j]': arr[j], 'arr[j+1]': arr[j + 1], comparisons: s.comparisons, swaps: s.swaps, pass: s.pass };
      snap(steps, s, `Pass ${i + 1}: Compare arr[${j}]=${arr[j]} vs arr[${j + 1}]=${arr[j + 1]}.`, 5, 'O(n²)');

      if (arr[j] > arr[j + 1]) {
        // swap
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        s.swaps += 1;
        s.metrics.swaps = s.swaps;
        s.vars = { i, j, n, 'arr[j]': arr[j], 'arr[j+1]': arr[j + 1], swapped: true, comparisons: s.comparisons, swaps: s.swaps, pass: s.pass };
        s.arr = arr.map((v, idx) => ({
          val: v,
          state: idx === j || idx === j + 1 ? 'comparing' : idx >= n - i ? 'sorted' : 'idle',
        }));
        snap(steps, s, `Swap! arr[${j}] ↔ arr[${j + 1}]. Swaps: ${s.swaps}.`, 7, 'O(n²)');
      }
    }

    // mark last as sorted
    arr[n - 1 - i];
    s.arr = arr.map((v, idx) => ({
      val: v,
      state: idx >= n - 1 - i ? 'sorted' : 'idle',
    }));
    snap(steps, s, `Pass ${i + 1} complete. Element ${arr[n - 1 - i]} is in final position.`, 9, 'O(n²)');
  }

  s.arr = arr.map((v) => ({ val: v, state: 'sorted' }));
  s.vars = { i: n - 1, j: 0, comparing: [], swaps: s.swaps, pass: s.pass };
  snap(steps, s, `Bubble Sort complete! ${s.comparisons} comparisons, ${s.swaps} swaps.`, 11, 'O(n²)');

  return steps;
}

export const BUBBLE_CODE = [
  'void bubbleSort(int[] arr) {',
  '  int n = arr.length;',
  '  for (int i = 0; i < n - 1; i++) {',
  '    for (int j = 0; j < n - i - 1; j++) {',
  '      if (arr[j] > arr[j+1]) {',
  '        // swap',
  '        int tmp = arr[j];',
  '        arr[j] = arr[j+1];',
  '        arr[j+1] = tmp;',
  '      }',
  '    }',
  '  }',
  '}',
];

export default {
  id: 'bubble',
  label: 'Bubble Sort',
  icon: '🫧',
  build: buildBubbleSteps,
  inputs: [
    { key: 'arr', label: 'Array (comma-sep, max 12)', type: 'array-num', default: DEFAULT_ARR },
  ],
  code: BUBBLE_CODE,
  language: 'Java',
  metrics: [
    { key: 'comparisons', label: 'Comparisons', max: 60, color: 'var(--node-comparing)' },
    { key: 'swaps',       label: 'Swaps',       max: 30, color: 'var(--node-active)' },
    { key: 'passes',      label: 'Passes',      max: 8,  color: 'var(--pod-running)' },
  ],
  codeNotes: [
    { title: 'Nested Loops', content: 'Outer loop: n-1 passes. Inner loop: compares adjacent pairs. Each pass bubbles largest unsorted element to end.' },
    { title: 'Optimal Swap Count', content: 'Best case: 0 swaps (already sorted). Worst case: n(n-1)/2 swaps (reverse sorted). Avg: n(n-1)/4.' },
    { title: 'Stable Sorting', content: 'Bubble sort preserves order of equal elements. Important for multi-key sorting.' },
    { title: 'Early Termination', content: 'If no swaps occur in a pass, array is sorted. Optimization: reduce to O(n) best case.' },
  ],
  tradeoffs: [
    { pro: 'Simple to implement and understand', con: 'O(n²) time even on nearly sorted data. Selection/Insertion better.' },
    { pro: 'Requires only O(1) extra space', con: 'Many unnecessary swaps = slow in practice (10-50x slower than Quicksort).' },
    { pro: 'Stable sort preserves equal order', con: 'Rarely used in production (replaced by Timsort, Mergesort).' },
    { pro: 'Easy to parallelize (compare/swap independent)', con: 'Parallelization overhead > speedup on small arrays.' },
  ],
  bestPractices: [
    'Use only for: educational purposes, very small arrays (<10 elements), or nearly sorted data with early termination.',
    'Add "swapped" flag to detect already-sorted arrays: if no swaps in pass, break immediately.',
    'For production: use Java Collections.sort (Timsort), JavaScript Array.sort, or std::sort (C++).',
    'If bubble sort mandatory, use optimized variant: reduce inner loop bounds after each pass (array.length - i - 1).',
  ],
};

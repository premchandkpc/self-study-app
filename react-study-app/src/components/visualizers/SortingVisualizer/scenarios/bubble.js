import { snap } from './shared';

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
      s.vars = { i, j, comparing: [arr[j], arr[j + 1]], swaps: s.swaps, pass: s.pass };
      snap(steps, s, `Pass ${i + 1}: Compare arr[${j}]=${arr[j]} vs arr[${j + 1}]=${arr[j + 1]}.`, 5, 'O(n²)');

      if (arr[j] > arr[j + 1]) {
        // swap
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        s.swaps += 1;
        s.metrics.swaps = s.swaps;
        s.vars = { i, j, comparing: [arr[j], arr[j + 1]], swaps: s.swaps, pass: s.pass };
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
};

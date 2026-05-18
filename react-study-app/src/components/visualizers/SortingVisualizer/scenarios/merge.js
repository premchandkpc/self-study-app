import { snap } from './shared';

function buildMergeSteps() {
  const steps = [];
  const initial = [5, 3, 8, 1, 9, 2];

  const s = {
    arr: initial.map((v) => ({ val: v, state: 'idle', group: -1 })),
    comparisons: 0,
    swaps: 0,
    pass: 0,
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
    vars: { left: [], right: [], merged: [], depth: 0 },
    groups: [],
  };

  snap(steps, s, 'Merge Sort: Divide array recursively then merge sorted halves.', 1, 'O(n log n)');

  // Simulate depth-first merge sort steps
  const arr = initial.slice();
  let stepCount = 0;

  function mergeSort(a, lo, hi, depth) {
    if (hi - lo <= 1) return a.slice(lo, hi);

    const mid = Math.floor((lo + hi) / 2);

    // show split
    s.arr = a.map((v, idx) => ({
      val: v,
      state: idx >= lo && idx < hi ? 'window' : 'idle',
      group: idx >= lo && idx < mid ? 0 : idx >= mid && idx < hi ? 1 : -1,
    }));
    s.vars = { left: a.slice(lo, mid), right: a.slice(mid, hi), merged: [], depth };
    s.metrics.passes = depth;
    snap(steps, s, `Depth ${depth}: Split [${a.slice(lo, hi)}] → [${a.slice(lo, mid)}] | [${a.slice(mid, hi)}]`, 4, 'O(n log n)');

    const left = mergeSort(a, lo, mid, depth + 1);
    const right = mergeSort(a, mid, hi, depth + 1);

    // merge
    const merged = [];
    let li = 0, ri = 0;
    while (li < left.length && ri < right.length) {
      s.comparisons += 1;
      s.metrics.comparisons = s.comparisons;
      if (left[li] <= right[ri]) {
        merged.push(left[li++]);
      } else {
        merged.push(right[ri++]);
        s.swaps += 1;
        s.metrics.swaps = s.swaps;
      }
    }
    while (li < left.length) merged.push(left[li++]);
    while (ri < right.length) merged.push(right[ri++]);

    // place merged back
    for (let k = 0; k < merged.length; k++) {
      a[lo + k] = merged[k];
    }

    s.arr = a.map((v, idx) => ({
      val: v,
      state: idx >= lo && idx < hi ? 'sorted' : 'idle',
      group: idx >= lo && idx < hi ? depth : -1,
    }));
    s.vars = { left, right, merged, depth };
    snap(steps, s, `Merge → [${merged}] placed at positions ${lo}..${hi - 1}.`, 10, 'O(n log n)');

    return merged;
  }

  mergeSort(arr, 0, arr.length, 1);

  s.arr = arr.map((v) => ({ val: v, state: 'sorted', group: 0 }));
  s.vars = { left: [], right: [], merged: arr.slice(), depth: 0 };
  snap(steps, s, `Merge Sort complete! ${s.comparisons} comparisons. Array sorted.`, 15, 'O(n log n)');

  return steps;
}

export const MERGE_CODE = [
  'int[] mergeSort(int[] arr, int lo, int hi) {',
  '  if (hi - lo <= 1) return arr;',
  '',
  '  int mid = (lo + hi) / 2;',
  '  int[] left  = mergeSort(arr, lo,  mid);',
  '  int[] right = mergeSort(arr, mid, hi);',
  '',
  '  return merge(left, right);',
  '}',
  '',
  'int[] merge(int[] left, int[] right) {',
  '  int[] result = new int[left.length + right.length];',
  '  int i = 0, j = 0, k = 0;',
  '  while (i < left.length && j < right.length)',
  '    result[k++] = left[i] <= right[j] ? left[i++] : right[j++];',
  '  // copy remainder',
  '}',
];

export default {
  id: 'merge',
  label: 'Merge Sort',
  icon: '🔀',
  build: buildMergeSteps,
  code: MERGE_CODE,
  language: 'Java',
  metrics: [
    { key: 'comparisons', label: 'Comparisons', max: 20, color: 'var(--node-comparing)' },
    { key: 'swaps',       label: 'Merges',      max: 10, color: 'var(--node-active)' },
    { key: 'passes',      label: 'Depth',        max: 4,  color: 'var(--pod-running)' },
  ],
};

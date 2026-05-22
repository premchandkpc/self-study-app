import { snap } from '@/core/utils/scenarioShared';

const DEFAULT_ARR = [5, 3, 8, 1, 9, 2];

function buildMergeSteps({ arr: inputArr = DEFAULT_ARR } = {}) {
  const steps = [];
  const raw = Array.isArray(inputArr) ? inputArr.filter((v) => Number.isFinite(v)).slice(0, 12) : [];
  const initial = raw.length >= 2 ? raw : DEFAULT_ARR;

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

  function mergeSort(a, lo, hi, depth) {
    if (hi - lo <= 1) return a.slice(lo, hi);

    const mid = Math.floor((lo + hi) / 2);

    // show split
    s.arr = a.map((v, idx) => ({
      val: v,
      state: idx >= lo && idx < hi ? 'window' : 'idle',
      group: idx >= lo && idx < mid ? 0 : idx >= mid && idx < hi ? 1 : -1,
    }));
    s.vars = { lo, hi, mid, left: a.slice(lo, mid), right: a.slice(mid, hi), merged: [], depth };
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
      const takeLeft = left[li] <= right[ri];
      s.arr = arr.map((v, idx) => ({
        val: v,
        state: idx < lo || idx >= hi ? 'idle' :
               idx === lo + li ? 'comparing' :
               idx === mid + ri ? 'comparing' :
               'window',
        group: idx >= lo && idx < mid ? 0 : idx >= mid && idx < hi ? 1 : -1,
      }));
      s.vars = { lo, hi, mid, li, ri, 'left[li]': left[li], 'right[ri]': right[ri], takeLeft, merged: [...merged], depth };
      if (takeLeft) {
        merged.push(left[li]);
        snap(steps, s, `Merge: left[${li}]=${left[li]} ≤ right[${ri}]=${right[ri]} → take ${left[li]}`, 14, 'O(n log n)');
        li++;
      } else {
        merged.push(right[ri]);
        s.swaps += 1;
        s.metrics.swaps = s.swaps;
        snap(steps, s, `Merge: right[${ri}]=${right[ri]} < left[${li}]=${left[li]} → take ${right[ri]}`, 14, 'O(n log n)');
        ri++;
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
    s.vars = { lo, hi, left, right, merged, depth };
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
  inputs: [
    { key: 'arr', label: 'Array (comma-sep, max 12)', type: 'array-num', default: DEFAULT_ARR },
  ],
  code: MERGE_CODE,
  language: 'Java',
  metrics: [
    { key: 'comparisons', label: 'Comparisons', max: 20, color: 'var(--node-comparing)' },
    { key: 'swaps',       label: 'Merges',      max: 10, color: 'var(--node-active)' },
    { key: 'passes',      label: 'Depth',        max: 4,  color: 'var(--pod-running)' },
  ],
  codeNotes: [
    { title: 'Divide & Conquer', content: 'Split array in half recursively until size 1. Then merge pairs bottom-up. Divide O(log n), merge O(n).' },
    { title: 'Merge Operation', content: 'Two pointers on sorted halves. Compare, advance smaller pointer. Copy remainder. O(n) per merge.' },
    { title: 'Stable Sort', content: 'Equal elements maintain original order due to <= comparison. Crucial for multi-key sorting.' },
    { title: 'External Sorting', content: 'Merge sort works on streams (files too large for memory). Read blocks, merge, write results.' },
  ],
  tradeoffs: [
    { pro: 'O(n log n) guaranteed (best/avg/worst)', con: 'Requires O(n) extra space (temporary arrays for merging).' },
    { pro: 'Stable and predictable performance', con: 'Slower than Quicksort on random data (more data movement).' },
    { pro: 'Parallelizable: split & merge phases independent', con: 'Poor cache locality (jumps between arrays).' },
    { pro: 'Works on linked lists (no random access)', con: 'O(log n) extra space for recursion stack.' },
  ],
  bestPractices: [
    'For guaranteed O(n log n): use Merge Sort or Heapsort (when stable sort not required).',
    'Optimize: use insertion sort for small subarrays (<10 elements), reduces merge overhead.',
    'For arrays: prefer Timsort (Python, Java 7+) = hybrid of Mergesort + insertion. Better cache & fewer comparisons.',
    'For linked lists: Merge Sort is natural (no random access needed). O(1) pointers vs O(n) arrays.',
    'Memory-constrained: use Heapsort or in-place Quicksort. Merge sort needs buffers.' ,
  ],
};

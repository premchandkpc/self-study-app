import { snap } from './shared';

function buildHeapSteps() {
  const steps = [];
  const initial = [3, 6, 8, 5, 2, 9, 1, 7];

  const s = {
    arr: initial.map((v) => ({ val: v, state: 'idle' })),
    comparisons: 0,
    swaps: 0,
    pass: 0,
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
    vars: { size: initial.length, root: initial[0], i: 0, largest: initial[0] },
    heapSize: initial.length,
  };

  snap(steps, s, 'Heap Sort: Build max-heap, then repeatedly extract maximum.', 1, 'O(n log n)');

  const arr = initial.slice();
  const n = arr.length;

  function heapify(arr, size, rootIdx) {
    let largest = rootIdx;
    const left = 2 * rootIdx + 1;
    const right = 2 * rootIdx + 2;

    s.comparisons++;
    s.metrics.comparisons = s.comparisons;

    if (left < size && arr[left] > arr[largest]) largest = left;
    if (right < size && arr[right] > arr[largest]) largest = right;

    s.arr = arr.map((v, idx) => ({
      val: v,
      state: idx >= size ? 'sorted' : idx === rootIdx ? 'pivot' : idx === largest ? 'comparing' : 'idle',
    }));
    s.vars = { size, root: arr[rootIdx], i: rootIdx, largest: arr[largest] };
    s.heapSize = size;
    snap(steps, s, `Heapify at ${rootIdx}: root=${arr[rootIdx]}, largest=${arr[largest]} at idx ${largest}.`, 5, 'O(n log n)');

    if (largest !== rootIdx) {
      [arr[rootIdx], arr[largest]] = [arr[largest], arr[rootIdx]];
      s.swaps++;
      s.metrics.swaps = s.swaps;
      s.arr = arr.map((v, idx) => ({
        val: v,
        state: idx >= size ? 'sorted' : idx === rootIdx || idx === largest ? 'window' : 'idle',
      }));
      snap(steps, s, `Swap arr[${rootIdx}]=${arr[rootIdx]} ↔ arr[${largest}]=${arr[largest]}. Re-heapify subtree.`, 7, 'O(n log n)');
      heapify(arr, size, largest);
    }
  }

  // Build max heap
  snap(steps, s, 'Phase 1: Build max-heap from bottom up (heapify non-leaf nodes).', 2, 'O(n log n)');
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    s.metrics.passes++;
    heapify(arr, n, i);
  }

  s.arr = arr.map((v) => ({ val: v, state: 'idle' }));
  s.vars = { size: n, root: arr[0], i: 0, largest: arr[0] };
  snap(steps, s, `Max-heap built! Root = ${arr[0]} (maximum). Phase 2: Extract max repeatedly.`, 10, 'O(n log n)');

  // Extract elements
  for (let i = n - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];
    s.swaps++;
    s.metrics.swaps = s.swaps;
    s.heapSize = i;
    s.arr = arr.map((v, idx) => ({
      val: v,
      state: idx >= i ? 'sorted' : idx === 0 ? 'pivot' : 'idle',
    }));
    s.vars = { size: i, root: arr[0], i: 0, largest: arr[0] };
    snap(steps, s, `Move max ${arr[i]} to position ${i}. Heap size → ${i}.`, 12, 'O(n log n)');

    s.metrics.passes++;
    heapify(arr, i, 0);
  }

  s.arr = arr.map((v) => ({ val: v, state: 'sorted' }));
  s.vars = { size: 0, root: arr[0], i: 0, largest: arr[0] };
  s.heapSize = 0;
  snap(steps, s, `Heap Sort complete! ${s.comparisons} comparisons, ${s.swaps} swaps. Array sorted.`, 15, 'O(n log n)');

  return steps;
}

export const HEAP_CODE = [
  'void heapSort(int[] arr) {',
  '  int n = arr.length;',
  '  // Build max-heap',
  '  for (int i = n/2 - 1; i >= 0; i--)',
  '    heapify(arr, n, i);',
  '',
  '  // Extract elements one by one',
  '  for (int i = n - 1; i > 0; i--) {',
  '    swap(arr, 0, i);',
  '    heapify(arr, i, 0);',
  '  }',
  '}',
  '',
  'void heapify(int[] arr, int n, int i) {',
  '  int largest = i, l = 2*i+1, r = 2*i+2;',
  '  if (l < n && arr[l] > arr[largest]) largest = l;',
  '  if (r < n && arr[r] > arr[largest]) largest = r;',
  '  if (largest != i) { swap(arr, i, largest); heapify(arr, n, largest); }',
  '}',
];

export default {
  id: 'heap',
  label: 'Heap Sort',
  icon: '🏔️',
  build: buildHeapSteps,
  code: HEAP_CODE,
  language: 'Java',
  metrics: [
    { key: 'comparisons', label: 'Comparisons', max: 40, color: 'var(--node-comparing)' },
    { key: 'swaps',       label: 'Swaps',       max: 20, color: 'var(--node-active)' },
    { key: 'passes',      label: 'Heapify',     max: 15, color: 'var(--pod-running)' },
  ],
};

import { snap, makeArr } from './shared';

const ARR = [2, 1, 5, 1, 3, 2];
const K = 3;

const CODE = [
  'function maxSumWindow(arr, k) {',
  '  let windowSum = 0, maxSum = 0;',
  '  for (let i = 0; i < k; i++)',
  '    windowSum += arr[i];',
  '  maxSum = windowSum;',
  '  for (let i = k; i < arr.length; i++) {',
  '    windowSum += arr[i] - arr[i - k];',
  '    maxSum = Math.max(maxSum, windowSum);',
  '  }',
  '  return maxSum;',
  '}',
];

function build() {
  const steps = [];
  const cells = makeArr(ARR);
  const s = { cells: [...cells], window: null, vars: {}, complexity: { ops: 0, label: 'O(n)', space: 'O(1)' } };

  snap(steps, s, 'Start: find max sum subarray of size k=3.', 0);

  let windowSum = 0;
  for (let i = 0; i < K; i++) {
    windowSum += ARR[i];
    s.cells = cells.map((c, idx) => ({ ...c, state: idx <= i ? 'active' : 'idle' }));
    s.window = { left: 0, right: i };
    s.vars = { i, windowSum, maxSum: 0, k: K };
    s.complexity = { ops: i + 1, label: 'O(n)', space: 'O(1)' };
    snap(steps, s, `Build first window: add arr[${i}]=${ARR[i]} → windowSum=${windowSum}`, 3);
  }

  let maxSum = windowSum;
  s.cells = cells.map((c, idx) => ({ ...c, state: idx < K ? 'window' : 'idle' }));
  s.window = { left: 0, right: K - 1 };
  s.vars = { windowSum, maxSum, k: K };
  s.complexity = { ops: K, label: 'O(n)', space: 'O(1)' };
  snap(steps, s, `Initial window [0..${K - 1}] sum=${windowSum}. Set maxSum=${maxSum}.`, 4);

  for (let i = K; i < ARR.length; i++) {
    windowSum += ARR[i] - ARR[i - K];
    maxSum = Math.max(maxSum, windowSum);
    s.cells = cells.map((c, idx) => {
      if (idx === i - K) return { ...c, state: 'removing' };
      if (idx === i) return { ...c, state: 'adding' };
      if (idx > i - K && idx <= i) return { ...c, state: 'window' };
      return { ...c, state: 'visited' };
    });
    s.window = { left: i - K + 1, right: i };
    s.vars = { i, windowSum, maxSum, k: K };
    s.complexity = { ops: K + (i - K + 1), label: 'O(n)', space: 'O(1)' };
    snap(steps, s, `Slide [${i - K + 1}..${i}]: windowSum=${windowSum}, maxSum=${maxSum}`, 6);
  }

  s.cells = cells.map((c) => ({ ...c, state: 'done' }));
  s.window = null;
  s.vars = { maxSum, result: maxSum };
  s.complexity = { ops: ARR.length, label: 'O(n)', space: 'O(1)' };
  snap(steps, s, `Done! Maximum window sum = ${maxSum}`, 9);

  return steps;
}

export default {
  id: 'sliding-window',
  label: 'Sliding Window',
  icon: '🪟',
  build,
  code: CODE,
  language: 'javascript',
  metrics: [],
};

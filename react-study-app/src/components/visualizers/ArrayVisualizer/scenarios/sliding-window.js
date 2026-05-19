import { snap, makeArr } from './shared';

const DEFAULT_ARR = [2, 1, 5, 1, 3, 2];
const DEFAULT_K = 3;

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

function build({ arr = DEFAULT_ARR, k = DEFAULT_K } = {}) {
  arr = Array.isArray(arr) ? arr.filter((v) => Number.isFinite(v)).slice(0, 12) : DEFAULT_ARR;
  if (arr.length < 2) arr = DEFAULT_ARR;
  k = Math.max(1, Math.min(Math.floor(Number(k) || DEFAULT_K), arr.length - 1));

  const steps = [];
  const cells = makeArr(arr);
  const s = { cells: [...cells], window: null, vars: {}, complexity: { ops: 0, label: 'O(n)', space: 'O(1)' } };

  snap(steps, s, `Start: find max sum subarray of size k=${k}.`, 0);

  let windowSum = 0;
  for (let i = 0; i < k; i++) {
    windowSum += arr[i];
    s.cells = cells.map((c, idx) => ({ ...c, state: idx <= i ? 'active' : 'idle' }));
    s.window = { left: 0, right: i };
    s.vars = { i, windowSum, maxSum: 0, k };
    s.complexity = { ops: i + 1, label: 'O(n)', space: 'O(1)' };
    snap(steps, s, `Build first window: add arr[${i}]=${arr[i]} → windowSum=${windowSum}`, 3);
  }

  let maxSum = windowSum;
  s.cells = cells.map((c, idx) => ({ ...c, state: idx < k ? 'window' : 'idle' }));
  s.window = { left: 0, right: k - 1 };
  s.vars = { windowSum, maxSum, k };
  s.complexity = { ops: k, label: 'O(n)', space: 'O(1)' };
  snap(steps, s, `Initial window [0..${k - 1}] sum=${windowSum}. Set maxSum=${maxSum}.`, 4);

  for (let i = k; i < arr.length; i++) {
    windowSum += arr[i] - arr[i - k];
    maxSum = Math.max(maxSum, windowSum);
    s.cells = cells.map((c, idx) => {
      if (idx === i - k) return { ...c, state: 'removing' };
      if (idx === i) return { ...c, state: 'adding' };
      if (idx > i - k && idx <= i) return { ...c, state: 'window' };
      return { ...c, state: 'visited' };
    });
    s.window = { left: i - k + 1, right: i };
    s.vars = { i, windowSum, maxSum, k };
    s.complexity = { ops: k + (i - k + 1), label: 'O(n)', space: 'O(1)' };
    snap(steps, s, `Slide [${i - k + 1}..${i}]: windowSum=${windowSum}, maxSum=${maxSum}`, 6);
  }

  s.cells = cells.map((c) => ({ ...c, state: 'done' }));
  s.window = null;
  s.vars = { maxSum, result: maxSum };
  s.complexity = { ops: arr.length, label: 'O(n)', space: 'O(1)' };
  snap(steps, s, `Done! Maximum window sum = ${maxSum}`, 9);

  return steps;
}

export default {
  id: 'sliding-window',
  label: 'Sliding Window',
  icon: '🪟',
  build,
  inputs: [
    { key: 'arr', label: 'Array (comma-sep)', type: 'array-num', default: DEFAULT_ARR },
    { key: 'k',   label: 'Window size k',    type: 'number',    default: DEFAULT_K, min: 1, max: 10 },
  ],
  code: CODE,
  language: 'javascript',
  metrics: [],
};

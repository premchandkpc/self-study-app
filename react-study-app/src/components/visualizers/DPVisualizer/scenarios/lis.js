import { snap } from './shared';

function buildLISSteps({ arr = [2, 1, 5, 3, 6, 4, 8, 9] } = {}) {
  arr = arr.filter((v) => Number.isFinite(v)).slice(0, 12);
  if (!arr.length) arr = [2, 1, 5, 3, 6, 4, 8, 9];
  const n = arr.length;
  const dp = Array(n).fill(1);

  const steps = [];
  const s = {
    kind: '1d',
    dp: dp.slice(),
    arr: arr.slice(),
    base: Array.from({ length: n }, (_, i) => i), // all 1s are base initially
    labels: arr.map((_, i) => `i=${i}`),
    active: null, checking: null, deps: [],
    metrics: { length: 1, comparisons: 0 },
    vars: { i: null, j: null, 'arr[i]': null, 'arr[j]': null, 'dp[i]': null },
    result: null,
  };

  snap(steps, s, `LIS in [${arr}]. dp[i]=LIS ending at index i, all start at 1.`, 1, 'O(n²)', 'O(n)');

  for (let i = 1; i < n; i++) {
    s.active = i; s.deps = []; s.base = s.base.filter((b) => b !== i); s.checking = null;
    s.vars = { i, j: null, 'arr[i]': arr[i], 'dp[i]': dp[i] };
    snap(steps, s, `i=${i} (val=${arr[i]}): find all j<${i} where arr[j]<arr[i] to extend LIS.`, 3, 'O(n²)', 'O(n)');

    for (let j = 0; j < i; j++) {
      s.checking = j; s.metrics.comparisons++;
      s.vars = { i, j, 'arr[i]': arr[i], 'arr[j]': arr[j], 'dp[i]': dp[i], 'dp[j]': dp[j] };

      if (arr[j] < arr[i]) {
        s.deps = [j];
        snap(steps, s, `arr[${j}]=${arr[j]} < arr[${i}]=${arr[i]} ✓ → can extend. dp[${i}]=max(${dp[i]}, ${dp[j]}+1).`, 5, 'O(n²)', 'O(n)');
        if (dp[j] + 1 > dp[i]) {
          dp[i] = dp[j] + 1;
          s.dp = dp.slice(); s.vars['dp[i]'] = dp[i];
          snap(steps, s, `Updated dp[${i}] = ${dp[i]}.`, 6, 'O(n²)', 'O(n)');
        }
      } else {
        s.deps = [];
        snap(steps, s, `arr[${j}]=${arr[j]} >= arr[${i}]=${arr[i]} ✗ skip.`, 5, 'O(n²)', 'O(n)');
      }
    }

    s.checking = null; s.deps = []; s.dp = dp.slice();
    s.metrics.length = Math.max(...dp);
    s.result = { label: 'LIS length', value: Math.max(...dp) };
    snap(steps, s, `dp[${i}] = ${dp[i]}. Best LIS so far: ${s.metrics.length}.`, 7, 'O(n²)', 'O(n)');
  }

  s.active = null; s.base = [];
  s.metrics.length = Math.max(...dp);
  s.result = { label: 'LIS length', value: Math.max(...dp) };
  snap(steps, s, `Done! LIS = ${s.metrics.length}. dp = [${dp}].`, 9, 'O(n²)', 'O(n)');
  return steps;
}

export const LIS_CODE = [
  'int lis(int[] arr) {',
  '  int n = arr.length;',
  '  int[] dp = new int[n];',
  '  Arrays.fill(dp, 1);',
  '  for (int i = 1; i < n; i++)',
  '    for (int j = 0; j < i; j++)',
  '      if (arr[j] < arr[i])',
  '        dp[i] = Math.max(dp[i], dp[j] + 1);',
  '  return Arrays.stream(dp).max().getAsInt();',
  '}',
];

export default {
  id: 'lis',
  label: 'LIS',
  icon: '📈',
  build: buildLISSteps,
  inputs: [
    { key: 'arr', label: 'Array (comma-sep nums)', type: 'array-num', default: [2, 1, 5, 3, 6, 4, 8, 9] },
  ],
  code: LIS_CODE,
  language: 'Java',
  metrics: [
    { key: 'length',      label: 'LIS length',  max: 12, color: 'var(--node-active)' },
    { key: 'comparisons', label: 'Comparisons', max: 66, color: 'var(--node-comparing)' },
  ],
};

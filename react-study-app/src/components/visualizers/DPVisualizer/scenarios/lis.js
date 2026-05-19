import { snap } from './shared';

function buildLISSteps() {
  const steps = [];
  const arr = [2, 1, 5, 3, 6, 4, 8, 9];
  const n = arr.length;
  const dp = Array(n).fill(1);

  const s = {
    kind: '1d',
    dp: dp.slice(),
    arr: arr.slice(),
    labels: arr.map((v, i) => `[${i}]=${v}`),
    active: null,
    checking: null,
    deps: [],
    metrics: { length: 1, comparisons: 0 },
    vars: { i: null, j: null, 'arr[i]': null, 'arr[j]': null, 'dp[i]': null },
  };

  snap(steps, s, `LIS: find Longest Increasing Subsequence in [${arr}]. dp[i] = LIS length ending at index i. All start at 1.`, 1, 'O(n²)', 'O(n)');

  for (let i = 1; i < n; i++) {
    s.active = i;
    s.deps = [];
    s.vars = { i, j: null, 'arr[i]': arr[i], 'arr[j]': null, 'dp[i]': dp[i] };
    snap(steps, s, `Processing index ${i} (value=${arr[i]}): check all j < ${i} where arr[j] < arr[i].`, 3, 'O(n²)', 'O(n)');

    for (let j = 0; j < i; j++) {
      s.checking = j;
      s.metrics.comparisons++;
      s.vars = { i, j, 'arr[i]': arr[i], 'arr[j]': arr[j], 'dp[i]': dp[i], 'dp[j]': dp[j] };

      if (arr[j] < arr[i]) {
        s.deps = [j];
        snap(steps, s, `arr[${j}]=${arr[j]} < arr[${i}]=${arr[i]}: dp[${i}] = max(${dp[i]}, dp[${j}]+1) = max(${dp[i]}, ${dp[j] + 1}).`, 5, 'O(n²)', 'O(n)');

        if (dp[j] + 1 > dp[i]) {
          dp[i] = dp[j] + 1;
          s.dp = dp.slice();
          s.vars['dp[i]'] = dp[i];
          snap(steps, s, `Update dp[${i}] = ${dp[i]} (extend LIS ending at ${j}).`, 6, 'O(n²)', 'O(n)');
        }
      } else {
        s.deps = [];
        snap(steps, s, `arr[${j}]=${arr[j]} >= arr[${i}]=${arr[i]}: skip.`, 5, 'O(n²)', 'O(n)');
      }
    }

    s.checking = null;
    s.deps = [];
    s.dp = dp.slice();
    const curMax = Math.max(...dp);
    s.metrics.length = curMax;
    snap(steps, s, `dp[${i}] = ${dp[i]}. Best LIS so far: ${curMax}.`, 7, 'O(n²)', 'O(n)');
  }

  s.active = null;
  const ans = Math.max(...dp);
  s.metrics.length = ans;
  snap(steps, s, `Done! LIS length = ${ans}. dp = [${dp}]. O(n²) time, O(n) space.`, 9, 'O(n²)', 'O(n)');

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
  '  int max = 1;',
  '  for (int v : dp) max = Math.max(max, v);',
  '  return max;',
  '}',
];

export default {
  id: 'lis',
  label: 'LIS',
  icon: '📈',
  build: buildLISSteps,
  code: LIS_CODE,
  language: 'Java',
  metrics: [
    { key: 'length',      label: 'LIS Length',   max: 8,  color: 'var(--node-active)' },
    { key: 'comparisons', label: 'Comparisons',  max: 30, color: 'var(--node-comparing)' },
  ],
};

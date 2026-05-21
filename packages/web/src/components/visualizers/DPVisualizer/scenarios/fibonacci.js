import { snap } from '@/core/utils/scenarioShared';

function buildFibSteps({ n = 10 } = {}) {
  n = Math.max(2, Math.min(n, 20));
  const steps = [];
  const dp = Array(n).fill('?');

  const s = {
    kind: '1d',
    dp: dp.slice(),
    base: [],
    labels: Array.from({ length: n }, (_, i) => `F(${i})`),
    active: null, deps: [],
    metrics: { computed: 0, current: 0 },
    vars: { n, i: null, 'dp[i]': null, 'dp[i-1]': null, 'dp[i-2]': null },
    result: null,
  };

  snap(steps, s, `Fibonacci DP: compute F(0)..F(${n - 1}) bottom-up. dp[i] = dp[i-1] + dp[i-2].`, 1, 'O(n)', 'O(n)');

  // base case 0
  dp[0] = 0;
  s.dp = dp.slice(); s.base = [0]; s.active = 0; s.deps = [];
  s.metrics.computed = 1;
  s.vars = { n, i: 0, 'dp[0]': 0 };
  snap(steps, s, 'Base case: dp[0] = 0 (F(0) = 0).', 3, 'O(n)', 'O(n)');

  // base case 1
  dp[1] = 1;
  s.dp = dp.slice(); s.base = [0, 1]; s.active = 1; s.deps = [];
  s.metrics.computed = 2;
  s.vars = { n, i: 1, 'dp[1]': 1 };
  snap(steps, s, 'Base case: dp[1] = 1 (F(1) = 1).', 4, 'O(n)', 'O(n)');

  for (let i = 2; i < n; i++) {
    // show about-to-compute
    s.active = i; s.deps = [i - 1, i - 2];
    s.vars = { n, i, 'dp[i-1]': dp[i - 1], 'dp[i-2]': dp[i - 2], 'dp[i]': '?' };
    snap(steps, s, `Computing dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]}.`, 6, 'O(n)', 'O(n)');

    // fill
    dp[i] = dp[i - 1] + dp[i - 2];
    s.dp = dp.slice(); s.deps = [];
    s.metrics.computed = i + 1; s.metrics.current = dp[i];
    s.vars = { n, i, 'dp[i-1]': dp[i - 1], 'dp[i-2]': dp[i - 2], 'dp[i]': dp[i] };
    snap(steps, s, `dp[${i}] = ${dp[i]}. F(${i}) found.`, 7, 'O(n)', 'O(n)');
  }

  s.active = null; s.deps = [];
  s.result = { label: `F(${n - 1})`, value: dp[n - 1] };
  snap(steps, s, `Done! F(${n - 1}) = ${dp[n - 1]}. Computed ${n} values in O(n) time, O(n) space.`, 9, 'O(n)', 'O(n)');
  return steps;
}

export const FIB_CODE = [
  'int[] fib(int n) {',
  '  int[] dp = new int[n];',
  '  dp[0] = 0;  // base',
  '  dp[1] = 1;  // base',
  '  for (int i = 2; i < n; i++)',
  '    dp[i] = dp[i-1] + dp[i-2];',
  '  return dp;',
  '}',
];

export default {
  id: 'fibonacci',
  label: 'Fibonacci',
  icon: '🌀',
  build: buildFibSteps,
  inputs: [
    { key: 'n', label: 'N (terms)', type: 'number', default: 10, min: 2, max: 20 },
  ],
  code: FIB_CODE,
  language: 'Java',
  metrics: [
    { key: 'computed', label: 'Computed',     max: 20,   color: 'var(--pod-running)' },
    { key: 'current',  label: 'Current F(n)', max: 6765, color: 'var(--node-active)' },
  ],
};

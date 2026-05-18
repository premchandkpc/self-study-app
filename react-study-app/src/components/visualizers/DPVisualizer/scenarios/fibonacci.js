import { snap } from './shared';

function buildFibSteps() {
  const steps = [];
  const N = 10;
  const INF_MARKER = '?';

  const s = {
    kind: '1d',
    dp: Array(N).fill(INF_MARKER),
    labels: Array.from({ length: N }, (_, i) => i),
    active: null,
    deps: [],
    metrics: { computed: 0, current: 0 },
    vars: { n: N, i: null, 'dp[i]': null, 'dp[i-1]': null, 'dp[i-2]': null },
  };

  snap(steps, s, `Fibonacci DP: compute F(0)..F(${N - 1}) using tabulation. dp[i] = dp[i-1] + dp[i-2].`, 1, 'O(n)', 'O(n)');

  // base cases
  s.dp[0] = 0;
  s.active = 0;
  s.deps = [];
  s.metrics.computed = 1;
  s.vars = { n: N, i: 0, 'dp[i]': 0, 'dp[i-1]': null, 'dp[i-2]': null };
  snap(steps, s, 'Base case: dp[0] = 0 (F(0) = 0).', 3, 'O(n)', 'O(n)');

  s.dp[1] = 1;
  s.active = 1;
  s.metrics.computed = 2;
  s.vars = { n: N, i: 1, 'dp[i]': 1, 'dp[i-1]': 0, 'dp[i-2]': null };
  snap(steps, s, 'Base case: dp[1] = 1 (F(1) = 1).', 4, 'O(n)', 'O(n)');

  for (let i = 2; i < N; i++) {
    s.active = i;
    s.deps = [i - 1, i - 2];
    s.vars = { n: N, i, 'dp[i-1]': s.dp[i - 1], 'dp[i-2]': s.dp[i - 2], 'dp[i]': '?' };
    snap(steps, s, `Computing dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${s.dp[i - 1]} + ${s.dp[i - 2]}.`, 6, 'O(n)', 'O(n)');

    s.dp[i] = s.dp[i - 1] + s.dp[i - 2];
    s.metrics.computed = i + 1;
    s.metrics.current = s.dp[i];
    s.vars = { n: N, i, 'dp[i-1]': s.dp[i - 1], 'dp[i-2]': s.dp[i - 2], 'dp[i]': s.dp[i] };
    snap(steps, s, `dp[${i}] = ${s.dp[i]}. Fibonacci number F(${i}) found.`, 6, 'O(n)', 'O(n)');
  }

  s.active = null;
  s.deps = [];
  snap(steps, s, `Done! F(${N - 1}) = ${s.dp[N - 1]}. All ${N} Fibonacci numbers computed in O(n) time, O(n) space.`, 8, 'O(n)', 'O(n)');

  return steps;
}

export const FIB_CODE = [
  'int[] fib(int n) {',
  '  int[] dp = new int[n];',
  '  // base cases',
  '  dp[0] = 0;',
  '  dp[1] = 1;',
  '  // fill table',
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
  code: FIB_CODE,
  language: 'Java',
  metrics: [
    { key: 'computed', label: 'Computed',    max: 10, color: 'var(--pod-running)' },
    { key: 'current',  label: 'Current F(n)', max: 34, color: 'var(--node-active)' },
  ],
};

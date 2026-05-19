import { snap } from './shared';

function buildHouseRobberSteps({ houses = [2, 7, 9, 3, 1, 8, 5] } = {}) {
  houses = houses.filter((v) => Number.isFinite(v) && v >= 0).slice(0, 12);
  if (!houses.length) houses = [2, 7, 9, 3, 1, 8, 5];
  const n = houses.length;
  const dp = Array(n).fill(0);

  const steps = [];
  const s = {
    kind: '1d',
    dp: dp.slice(),
    arr: houses.slice(),
    base: [],
    labels: houses.map((_, i) => `h[${i}]`),
    active: null, deps: [],
    metrics: { maxLoot: 0, processed: 0 },
    vars: { n, i: null, 'house[i]': null, skip: null, rob: null, 'dp[i]': null },
    result: null,
  };

  snap(steps, s, `House Robber: max loot from [${houses}] — cannot rob adjacent houses.`, 1, 'O(n)', 'O(n)');

  // base 0
  dp[0] = houses[0];
  s.dp = dp.slice(); s.base = [0]; s.active = 0; s.deps = [];
  s.metrics.maxLoot = dp[0]; s.metrics.processed = 1;
  s.vars = { n, i: 0, 'house[0]': houses[0], 'dp[0]': dp[0] };
  snap(steps, s, `Base: dp[0] = houses[0] = ${dp[0]}.`, 3, 'O(n)', 'O(n)');

  if (n > 1) {
    dp[1] = Math.max(houses[0], houses[1]);
    s.dp = dp.slice(); s.base = [0, 1]; s.active = 1; s.deps = [0];
    s.metrics.maxLoot = dp[1]; s.metrics.processed = 2;
    s.vars = { n, i: 1, 'house[1]': houses[1], 'max(h0,h1)': `max(${houses[0]},${houses[1]})`, 'dp[1]': dp[1] };
    snap(steps, s, `Base: dp[1] = max(houses[0], houses[1]) = max(${houses[0]}, ${houses[1]}) = ${dp[1]}.`, 4, 'O(n)', 'O(n)');
  }

  for (let i = 2; i < n; i++) {
    s.active = i; s.deps = [i - 1, i - 2]; s.base = [0, 1];
    const skip = dp[i - 1];
    const rob  = dp[i - 2] + houses[i];
    s.vars = { i, 'house[i]': houses[i], 'skip (dp[i-1])': skip, 'rob (dp[i-2]+h)': rob, 'dp[i]': '?' };
    snap(steps, s, `i=${i}: skip house→${skip}, rob house→dp[${i - 2}]+${houses[i]}=${rob}.`, 6, 'O(n)', 'O(n)');

    dp[i] = Math.max(skip, rob);
    s.dp = dp.slice(); s.deps = [];
    s.metrics.maxLoot = dp[i]; s.metrics.processed = i + 1;
    s.vars['dp[i]'] = dp[i];
    snap(steps, s, `dp[${i}] = max(${skip}, ${rob}) = ${dp[i]}.`, 7, 'O(n)', 'O(n)');
  }

  s.active = null; s.deps = [];
  s.result = { label: 'Max loot', value: dp[n - 1] };
  snap(steps, s, `Done! Max loot = dp[${n - 1}] = ${dp[n - 1]}.`, 9, 'O(n)', 'O(n)');
  return steps;
}

export const HOUSE_ROBBER_CODE = [
  'int rob(int[] h) {',
  '  int n = h.length;',
  '  if (n == 1) return h[0];',
  '  int[] dp = new int[n];',
  '  dp[0] = h[0];',
  '  dp[1] = Math.max(h[0], h[1]);',
  '  for (int i = 2; i < n; i++)',
  '    dp[i] = Math.max(dp[i-1], dp[i-2] + h[i]);',
  '  return dp[n-1];',
  '}',
];

export default {
  id: 'house-robber',
  label: 'House Robber',
  icon: '🏠',
  build: buildHouseRobberSteps,
  inputs: [
    { key: 'houses', label: 'House values (comma-sep)', type: 'array-num', default: [2, 7, 9, 3, 1, 8, 5] },
  ],
  code: HOUSE_ROBBER_CODE,
  language: 'Java',
  metrics: [
    { key: 'maxLoot',   label: 'Max loot',   max: 40, color: 'var(--node-active)' },
    { key: 'processed', label: 'Processed',  max: 12, color: 'var(--pod-running)' },
  ],
};

import { snap } from './shared';

function buildKnapsackSteps() {
  const steps = [];
  const items = [
    { label: 'A', wt: 2, val: 3 },
    { label: 'B', wt: 3, val: 4 },
    { label: 'C', wt: 4, val: 5 },
    { label: 'D', wt: 5, val: 7 },
  ];
  const W = 8;
  const n = items.length;

  // table[i][w] = max value using items 0..i-1 with capacity w
  const table = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));

  const s = {
    kind: '2d',
    table: table.map((r) => r.slice()),
    rowLabels: ['∅', ...items.map((it) => `${it.label}(w${it.wt},v${it.val})`)],
    colLabels: Array.from({ length: W + 1 }, (_, i) => i),
    activeRow: null,
    activeCol: null,
    deps: [],
    items,
    capacity: W,
    metrics: { cells: 0, maxVal: 0 },
    vars: { i: null, w: null, item: null, include: null, exclude: null, best: null },
  };

  snap(steps, s, `0/1 Knapsack: ${n} items, capacity ${W}. table[i][w] = max value using first i items with capacity w.`, 1, 'O(n·W)', 'O(n·W)');

  for (let i = 1; i <= n; i++) {
    const item = items[i - 1];
    for (let w = 0; w <= W; w++) {
      s.activeRow = i;
      s.activeCol = w;

      const exclude = table[i - 1][w];
      let include = 0;
      let canInclude = false;

      if (item.wt <= w) {
        canInclude = true;
        include = table[i - 1][w - item.wt] + item.val;
        s.deps = [{ r: i - 1, c: w }, { r: i - 1, c: w - item.wt }];
      } else {
        s.deps = [{ r: i - 1, c: w }];
      }

      s.vars = {
        i, w,
        item: `${item.label}(wt=${item.wt},val=${item.val})`,
        exclude,
        include: canInclude ? include : 'N/A (too heavy)',
        best: null,
      };
      snap(steps, s, `Item ${item.label} (wt=${item.wt}, val=${item.val}), cap=${w}: exclude=${exclude}${canInclude ? `, include=${include}` : ', too heavy'}.`, 5, 'O(n·W)', 'O(n·W)');

      table[i][w] = canInclude ? Math.max(exclude, include) : exclude;
      s.table = table.map((r) => r.slice());
      s.metrics.cells++;
      s.metrics.maxVal = table[i][w] > s.metrics.maxVal ? table[i][w] : s.metrics.maxVal;
      s.vars.best = table[i][w];
      snap(steps, s, `table[${i}][${w}] = ${table[i][w]}.`, 6, 'O(n·W)', 'O(n·W)');
    }
  }

  s.activeRow = null;
  s.activeCol = null;
  s.deps = [];
  s.metrics.maxVal = table[n][W];
  snap(steps, s, `Done! Max value with capacity ${W} = ${table[n][W]}. Full table computed in O(n·W) time.`, 9, 'O(n·W)', 'O(n·W)');

  return steps;
}

export const KNAPSACK_CODE = [
  'int knapsack(int[] wt, int[] val, int W) {',
  '  int n = wt.length;',
  '  int[][] dp = new int[n+1][W+1];',
  '  for (int i = 1; i <= n; i++) {',
  '    for (int w = 0; w <= W; w++) {',
  '      dp[i][w] = dp[i-1][w]; // exclude',
  '      if (wt[i-1] <= w)',
  '        dp[i][w] = Math.max(dp[i][w],',
  '          dp[i-1][w-wt[i-1]] + val[i-1]);',
  '    }',
  '  }',
  '  return dp[n][W];',
  '}',
];

export default {
  id: 'knapsack',
  label: 'Knapsack',
  icon: '🎒',
  build: buildKnapsackSteps,
  code: KNAPSACK_CODE,
  language: 'Java',
  metrics: [
    { key: 'cells',  label: 'Cells Filled', max: 40, color: 'var(--pod-running)' },
    { key: 'maxVal', label: 'Max Value',    max: 15, color: 'var(--node-active)' },
  ],
};

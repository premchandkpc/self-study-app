import { snap } from '@/core/utils/scenarioShared';

function buildEditDistSteps({ s1 = 'HORSE', s2 = 'ROS' } = {}) {
  s1 = s1.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'HORSE';
  s2 = s2.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'ROS';
  const m = s1.length, n = s2.length;

  const steps = [];
  const table = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  const s = {
    kind: '2d',
    table: table.map((r) => r.slice()),
    rowLabels: ['', ...s1.split('')],
    colLabels: ['', ...s2.split('')],
    activeRow: null, activeCol: null, deps: [], s1, s2,
    metrics: { cells: 0, distance: 0 },
    vars: { i: null, j: null, s1char: null, s2char: null, match: null, 'dp[i][j]': null },
    result: null,
  };

  snap(steps, s, `Edit Distance: min ops to convert "${s1}" → "${s2}". Base: dp[i][0]=i, dp[0][j]=j.`, 1, 'O(m·n)', 'O(m·n)');

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      s.activeRow = i; s.activeCol = j;
      const c1 = s1[i - 1], c2 = s2[j - 1];
      const match = c1 === c2;

      s.deps = [{ r: i-1, c: j-1 }, { r: i-1, c: j }, { r: i, c: j-1 }];
      s.vars = { i, j, s1char: c1, s2char: c2, match, 'dp[i][j]': '?' };
      snap(steps, s,
        match
          ? `'${c1}'=='${c2}': no op → dp[i-1][j-1]=${table[i-1][j-1]}.`
          : `'${c1}'≠'${c2}': 1+min(replace=${table[i-1][j-1]}, delete=${table[i-1][j]}, insert=${table[i][j-1]}).`,
        5, 'O(m·n)', 'O(m·n)');

      table[i][j] = match
        ? table[i - 1][j - 1]
        : 1 + Math.min(table[i-1][j-1], table[i-1][j], table[i][j-1]);

      s.table = table.map((r) => r.slice());
      s.metrics.cells++; s.metrics.distance = table[i][j];
      s.vars['dp[i][j]'] = table[i][j];
      if (i === m || j === n) s.result = { label: 'Edit distance', value: table[m][n] };
      snap(steps, s, `dp[${i}][${j}] = ${table[i][j]}.`, 7, 'O(m·n)', 'O(m·n)');
    }
  }

  s.activeRow = null; s.activeCol = null; s.deps = [];
  s.metrics.distance = table[m][n];
  s.result = { label: 'Edit distance', value: table[m][n] };
  snap(steps, s, `Done! Edit distance "${s1}" → "${s2}" = ${table[m][n]}.`, 10, 'O(m·n)', 'O(m·n)');
  return steps;
}

export const EDIT_DIST_CODE = [
  'int editDist(String s1, String s2) {',
  '  int m = s1.length(), n = s2.length();',
  '  int[][] dp = new int[m+1][n+1];',
  '  for (int i=0;i<=m;i++) dp[i][0]=i;',
  '  for (int j=0;j<=n;j++) dp[0][j]=j;',
  '  for (int i = 1; i <= m; i++) {',
  '    for (int j = 1; j <= n; j++) {',
  '      if (s1.charAt(i-1) == s2.charAt(j-1))',
  '        dp[i][j] = dp[i-1][j-1];',
  '      else',
  '        dp[i][j] = 1 + Math.min(dp[i-1][j-1],',
  '          Math.min(dp[i-1][j], dp[i][j-1]));',
  '    }',
  '  }',
  '  return dp[m][n];',
  '}',
];

export default {
  id: 'edit-distance',
  label: 'Edit Distance',
  icon: '✏️',
  build: buildEditDistSteps,
  inputs: [
    { key: 's1', label: 'From (A-Z)', type: 'string', default: 'HORSE', maxLen: 8 },
    { key: 's2', label: 'To (A-Z)',   type: 'string', default: 'ROS',   maxLen: 8 },
  ],
  code: EDIT_DIST_CODE,
  language: 'Java',
  metrics: [
    { key: 'cells',    label: 'Cells Filled', max: 64, color: 'var(--pod-running)' },
    { key: 'distance', label: 'Distance',     max: 8,  color: 'var(--node-active)' },
  ],
};

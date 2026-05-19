import { snap } from '@/core/utils/scenarioShared';

function buildLCSSteps({ s1 = 'ABCBD', s2 = 'ABDB' } = {}) {
  s1 = s1.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'ABCBD';
  s2 = s2.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'ABDB';
  const m = s1.length, n = s2.length;

  const steps = [];
  const table = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  const s = {
    kind: '2d',
    table: table.map((r) => r.slice()),
    rowLabels: ['', ...s1.split('')],
    colLabels: ['', ...s2.split('')],
    activeRow: null, activeCol: null, deps: [], s1, s2,
    metrics: { cells: 0, lcsLen: 0 },
    vars: { i: null, j: null, s1char: null, s2char: null, match: null, 'dp[i][j]': null },
    result: null,
  };

  snap(steps, s, `LCS of "${s1}" and "${s2}". dp[i][j] = LCS length of s1[0..i-1] and s2[0..j-1].`, 1, 'O(m·n)', 'O(m·n)');

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      s.activeRow = i; s.activeCol = j;
      const c1 = s1[i - 1], c2 = s2[j - 1];
      const match = c1 === c2;

      s.deps = match ? [{ r: i - 1, c: j - 1 }] : [{ r: i - 1, c: j }, { r: i, c: j - 1 }];
      s.vars = { i, j, s1char: c1, s2char: c2, match, 'dp[i][j]': '?' };
      snap(steps, s, `'${c1}' vs '${c2}': ${match ? `MATCH → dp[i-1][j-1]+1` : `no match → max(up,left)`}.`, 5, 'O(m·n)', 'O(m·n)');

      table[i][j] = match
        ? table[i - 1][j - 1] + 1
        : Math.max(table[i - 1][j], table[i][j - 1]);

      s.table = table.map((r) => r.slice());
      s.metrics.cells++;
      if (table[i][j] > s.metrics.lcsLen) s.metrics.lcsLen = table[i][j];
      s.vars['dp[i][j]'] = table[i][j];
      if (i === m || j === n) s.result = { label: 'LCS length', value: table[m][n] };
      snap(steps, s, `dp[${i}][${j}] = ${table[i][j]}.`, 7, 'O(m·n)', 'O(m·n)');
    }
  }

  s.activeRow = null; s.activeCol = null; s.deps = [];
  s.metrics.lcsLen = table[m][n];
  s.result = { label: 'LCS length', value: table[m][n] };
  snap(steps, s, `Done! LCS("${s1}", "${s2}") = ${table[m][n]}.`, 10, 'O(m·n)', 'O(m·n)');
  return steps;
}

export const LCS_CODE = [
  'int lcs(String s1, String s2) {',
  '  int m = s1.length(), n = s2.length();',
  '  int[][] dp = new int[m+1][n+1];',
  '  for (int i = 1; i <= m; i++) {',
  '    for (int j = 1; j <= n; j++) {',
  '      if (s1.charAt(i-1) == s2.charAt(j-1))',
  '        dp[i][j] = dp[i-1][j-1] + 1;',
  '      else',
  '        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);',
  '    }',
  '  }',
  '  return dp[m][n];',
  '}',
];

export default {
  id: 'lcs',
  label: 'LCS',
  icon: '🔗',
  build: buildLCSSteps,
  inputs: [
    { key: 's1', label: 'String 1 (A-Z)', type: 'string', default: 'ABCBD', maxLen: 8 },
    { key: 's2', label: 'String 2 (A-Z)', type: 'string', default: 'ABDB',  maxLen: 8 },
  ],
  code: LCS_CODE,
  language: 'Java',
  metrics: [
    { key: 'cells',  label: 'Cells Filled', max: 64, color: 'var(--pod-running)' },
    { key: 'lcsLen', label: 'LCS Length',   max: 8,  color: 'var(--node-active)' },
  ],
};

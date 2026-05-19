import { snap } from '@/core/utils/scenarioShared';

function buildPalinSubseqSteps({ str = 'BBBAB' } = {}) {
  str = str.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'BBBAB';
  const n = str.length;

  const steps = [];
  const table = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) table[i][i] = 1;

  const s = {
    kind: '2d',
    table: table.map((r) => r.slice()),
    rowLabels: str.split(''),
    colLabels: str.split(''),
    activeRow: null, activeCol: null, deps: [], str,
    metrics: { cells: 0, lpsLen: 1 },
    vars: { i: null, j: null, 'str[i]': null, 'str[j]': null, len: null, match: null, 'dp[i][j]': null },
    result: null,
  };

  snap(steps, s, `Longest Palindromic Subsequence of "${str}". dp[i][j] = LPS in str[i..j]. Diagonal = 1.`, 1, 'O(n²)', 'O(n²)');

  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const j = i + len - 1;
      s.activeRow = i; s.activeCol = j;
      const c1 = str[i], c2 = str[j];
      const match = c1 === c2;

      s.deps = match
        ? [{ r: i + 1, c: j - 1 }]
        : [{ r: i + 1, c: j }, { r: i, c: j - 1 }];

      s.vars = { i, j, 'str[i]': c1, 'str[j]': c2, len, match, 'dp[i][j]': '?' };
      snap(steps, s,
        match
          ? `'${c1}'=='${c2}': LPS extends → dp[i+1][j-1]+2.`
          : `'${c1}'≠'${c2}': max(dp[i+1][j], dp[i][j-1]).`,
        5, 'O(n²)', 'O(n²)');

      table[i][j] = match
        ? (table[i + 1]?.[j - 1] ?? 0) + 2
        : Math.max(table[i + 1]?.[j] ?? 0, table[i]?.[j - 1] ?? 0);

      s.table = table.map((r) => r.slice());
      s.metrics.cells++;
      if (table[i][j] > s.metrics.lpsLen) s.metrics.lpsLen = table[i][j];
      s.vars['dp[i][j]'] = table[i][j];
      snap(steps, s, `dp[${i}][${j}] = ${table[i][j]}.`, 7, 'O(n²)', 'O(n²)');
    }
  }

  s.activeRow = null; s.activeCol = null; s.deps = [];
  s.metrics.lpsLen = table[0][n - 1];
  s.result = { label: 'LPS length', value: table[0][n - 1] };
  snap(steps, s, `Done! LPS of "${str}" = ${table[0][n - 1]} chars.`, 10, 'O(n²)', 'O(n²)');
  return steps;
}

export const PALIN_SUBSEQ_CODE = [
  'int lps(String s) {',
  '  int n = s.length();',
  '  int[][] dp = new int[n][n];',
  '  for (int i = 0; i < n; i++) dp[i][i] = 1;',
  '  for (int len = 2; len <= n; len++) {',
  '    for (int i = 0; i <= n-len; i++) {',
  '      int j = i + len - 1;',
  '      if (s.charAt(i) == s.charAt(j))',
  '        dp[i][j] = dp[i+1][j-1] + 2;',
  '      else',
  '        dp[i][j] = Math.max(dp[i+1][j], dp[i][j-1]);',
  '    }',
  '  }',
  '  return dp[0][n-1];',
  '}',
];

export default {
  id: 'palindrome-subseq',
  label: 'Palindrome Subseq',
  icon: '🪞',
  build: buildPalinSubseqSteps,
  inputs: [
    { key: 'str', label: 'String (A-Z)', type: 'string', default: 'BBBAB', maxLen: 8 },
  ],
  code: PALIN_SUBSEQ_CODE,
  language: 'Java',
  metrics: [
    { key: 'cells',  label: 'Cells Filled', max: 64, color: 'var(--pod-running)' },
    { key: 'lpsLen', label: 'LPS Length',   max: 8,  color: 'var(--node-active)' },
  ],
};

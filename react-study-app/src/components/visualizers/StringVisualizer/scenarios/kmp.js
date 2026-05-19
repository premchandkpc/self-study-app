import { snap } from './shared';

const TEXT = 'ABABCABAB';
const PATTERN = 'ABAB';

function buildLPS(pattern) {
  const lps = new Array(pattern.length).fill(0);
  let len = 0;
  let i = 1;
  while (i < pattern.length) {
    if (pattern[i] === pattern[len]) {
      len++;
      lps[i] = len;
      i++;
    } else if (len !== 0) {
      len = lps[len - 1];
    } else {
      lps[i] = 0;
      i++;
    }
  }
  return lps;
}

function buildKMPSteps({ text: tInput = TEXT, pattern: pInput = PATTERN } = {}) {
  const rawText = String(tInput).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 20) || TEXT;
  const rawPat  = String(pInput).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8)  || PATTERN;
  const steps = [];
  const text = rawText.split('');
  const pattern = rawPat.split('');
  const lps = buildLPS(rawPat);
  const n = text.length;
  const m = pattern.length;

  const s = {
    text,
    pattern,
    charStates: new Array(n).fill('default'),
    patternStates: new Array(m).fill('default'),
    vars: { i: 0, j: 0, lps, match: false, found: -1 },
    metrics: { comparisons: 0, matches: 0 },
  };

  snap(steps, s, `KMP: text="${rawText}", pattern="${rawPat}". Build LPS table: [${lps.join(',')}].`, 1);

  let i = 0;
  let j = 0;
  let comparisons = 0;
  let found = -1;

  while (i < n) {
    comparisons++;
    s.charStates = new Array(n).fill('default');
    s.patternStates = new Array(m).fill('default');

    // Mark current window
    for (let k = 0; k < j; k++) {
      s.charStates[i - j + k] = 'window';
      s.patternStates[k] = 'window';
    }
    s.charStates[i] = 'active';
    s.patternStates[j] = 'active';

    s.vars = { i, j, 'text[i]': text[i], 'pattern[j]': pattern[j], match: text[i] === pattern[j], found, comparisons, lps };
    s.metrics.comparisons = comparisons;

    if (text[i] === pattern[j]) {
      snap(steps, s, `text[${i}]='${text[i]}' == pattern[${j}]='${pattern[j]}' ✓ advance both.`, 5);
      i++;
      j++;
    } else {
      s.charStates[i] = 'mismatch';
      s.patternStates[j] = 'mismatch';
      s.vars = { i, j, 'text[i]': text[i], 'pattern[j]': pattern[j], match: false, found, comparisons, lps };
      snap(steps, s, `text[${i}]='${text[i]}' != pattern[${j}]='${pattern[j]}' ✗ — use LPS to skip.`, 7);
      if (j !== 0) {
        j = lps[j - 1];
      } else {
        i++;
      }
    }

    if (j === m) {
      found = i - j;
      s.metrics.matches++;
      for (let k = found; k < found + m; k++) {
        s.charStates[k] = 'match';
      }
      for (let k = 0; k < m; k++) {
        s.patternStates[k] = 'match';
      }
      s.vars = { i, j, match: true, found, matchStart: found, matchStr: rawText.slice(found, found + m), comparisons, lps };
      snap(steps, s, `Match found at index ${found}! Pattern "${rawPat}" in "${rawText.slice(found, found + m)}".`, 9);
      j = lps[j - 1];
    }
  }

  s.charStates = new Array(n).fill(found >= 0 ? 'visited' : 'default');
  if (found >= 0) {
    for (let k = found; k < found + m; k++) s.charStates[k] = 'match';
  }
  s.vars = { i: n, j: 0, lps, match: found >= 0, found };
  snap(steps, s, found >= 0 ? `KMP complete. "${rawPat}" found at index ${found}.` : `KMP complete. "${rawPat}" not found.`, 11);

  return steps;
}

const KMP_CODE = [
  'function kmpSearch(text, pattern) {',
  '  const lps = buildLPS(pattern);',
  '  let i = 0, j = 0;',
  '  while (i < text.length) {',
  '    if (text[i] === pattern[j]) {',
  '      i++; j++;',
  '    } else if (j > 0) {',
  '      j = lps[j - 1];   // skip via LPS',
  '    } else { i++; }',
  '    if (j === pattern.length) {',
  '      return i - j;     // match!',
  '    }',
  '  }',
  '}',
];

export default {
  id: 'kmp',
  label: 'KMP Pattern Match',
  icon: '🔍',
  build: buildKMPSteps,
  inputs: [
    { key: 'text',    label: 'Text (A-Z only)',    type: 'string', default: TEXT,    maxLen: 20 },
    { key: 'pattern', label: 'Pattern (A-Z only)', type: 'string', default: PATTERN, maxLen: 8  },
  ],
  code: KMP_CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'comparisons', label: 'Comparisons', max: 20, color: 'var(--node-active)' },
    { key: 'matches',     label: 'Matches',     max: 5,  color: 'var(--node-visited)' },
  ],
};

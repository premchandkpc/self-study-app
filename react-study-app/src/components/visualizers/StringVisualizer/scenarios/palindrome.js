import { snap } from '@/core/utils/scenarioShared';

const INPUT = 'babad';

function buildPalindromeSteps({ str = INPUT } = {}) {
  const raw = String(str).toLowerCase().replace(/[^a-z]/g, '').slice(0, 16) || INPUT;
  const steps = [];
  const chars = raw.split('');
  const n = chars.length;

  const state = {
    text: [...chars],
    charStates: new Array(n).fill('default'),
    vars: { center: 0, left: 0, right: 0, longest: '', maxLen: 0 },
    metrics: { expansions: 0, maxLen: 0 },
  };

  snap(steps, state, `Expand-around-center palindrome on "${raw}". Check each center.`, 1);

  let longest = '';
  let maxLen = 0;

  function expand(center1, center2) {
    let l = center1;
    let r = center2;

    while (l >= 0 && r < n && chars[l] === chars[r]) {
      const substr = raw.slice(l, r + 1);
      state.charStates = new Array(n).fill('default');
      for (let k = l; k <= r; k++) state.charStates[k] = 'window';
      state.vars = { center: center1, left: l, right: r, substr, 'chars[l]': chars[l], 'chars[r]': chars[r], longest, maxLen };
      state.metrics.expansions++;

      snap(steps, state, `Expand center=${center1}: [${l}..${r}] = "${substr}" is palindrome (len=${r - l + 1}).`, 4);

      if (r - l + 1 > maxLen) {
        maxLen = r - l + 1;
        longest = substr;
        state.vars.longest = longest;
        state.vars.maxLen = maxLen;
        state.metrics.maxLen = maxLen;

        for (let k = l; k <= r; k++) state.charStates[k] = 'match';
        snap(steps, state, `New longest palindrome: "${longest}" (len=${maxLen}).`, 5);
      }

      l--;
      r++;
    }

    if (l + 1 <= r - 1 && center1 !== center2) {
      // ended without match — show mismatch
      const safeL = Math.max(0, l + 1 - 1);
      const safeR = Math.min(n - 1, r - 1 + 1);
      if (safeL >= 0 && safeR < n) {
        state.charStates = new Array(n).fill('default');
        state.charStates[safeL] = 'mismatch';
        state.charStates[safeR] = 'mismatch';
        state.vars = { center: center1, left: safeL, right: safeR, 'chars[l]': chars[safeL], 'chars[r]': chars[safeR], match: false, longest, maxLen };
        snap(steps, state, `Mismatch at [${safeL}]='${chars[safeL]}' vs [${safeR}]='${chars[safeR]}'. Stop expanding.`, 6);
      }
    }
  }

  for (let c = 0; c < n; c++) {
    // Odd center
    expand(c, c);
    // Even center
    if (c + 1 < n) expand(c, c + 1);
  }

  state.charStates = new Array(n).fill('default');
  const start = raw.indexOf(longest);
  for (let k = start; k < start + longest.length; k++) state.charStates[k] = 'match';
  state.vars = { center: -1, left: start, right: start + longest.length - 1, longest, maxLen };
  snap(steps, state, `Done. Longest palindrome: "${longest}" (length ${maxLen}).`, 8);

  return steps;
}

const PALINDROME_CODE = [
  'function longestPalindrome(s) {',
  '  let longest = "";',
  '  for (let c = 0; c < s.length; c++) {',
  '    expand(c, c);       // odd',
  '    expand(c, c + 1);   // even',
  '  }',
  '  function expand(l, r) {',
  '    while (l>=0 && r<s.length && s[l]===s[r])',
  '      { l--; r++; }',
  '    if (r-l-1 > longest.length)',
  '      longest = s.slice(l+1, r);',
  '  }',
  '}',
];

export default {
  id: 'palindrome',
  label: 'Palindrome Expand',
  icon: '🔄',
  build: buildPalindromeSteps,
  inputs: [
    { key: 'str', label: 'String (a-z only)', type: 'string', default: INPUT, maxLen: 16 },
  ],
  code: PALINDROME_CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'expansions', label: 'Expansions', max: 20, color: 'var(--node-active)' },
    { key: 'maxLen',     label: 'Max Length', max: 10, color: 'var(--node-visited)' },
  ],
};

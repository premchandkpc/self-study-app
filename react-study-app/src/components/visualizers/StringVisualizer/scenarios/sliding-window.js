import { snap } from './shared';

const TEXT = 'cbaebabacd';
const PATTERN = 'abc';

function buildSlidingWindowSteps() {
  const steps = [];
  const s = TEXT.split('');
  const p = PATTERN.split('');
  const n = s.length;
  const m = p.length;

  const pCount = {};
  for (const c of p) pCount[c] = (pCount[c] || 0) + 1;

  const wCount = {};
  const matches = [];
  const charStates = new Array(n).fill('default');

  const state = {
    text: [...s],
    charStates: [...charStates],
    vars: { left: 0, right: 0, pCount: { ...pCount }, wCount: {}, matches: 0 },
    metrics: { window: 0, matches: 0, steps: 0 },
  };

  snap(steps, state, `Sliding window anagram: find all starts of anagram of "${PATTERN}" in "${TEXT}".`, 1);

  // Initialize first window
  for (let i = 0; i < m; i++) {
    wCount[s[i]] = (wCount[s[i]] || 0) + 1;
    state.charStates[i] = 'window';
  }
  state.vars = { left: 0, right: m - 1, pCount: { ...pCount }, wCount: { ...wCount }, matches: matches.length };
  state.metrics.window = m;
  snap(steps, state, `Init window [0..${m - 1}]: "${TEXT.slice(0, m)}". Count: ${JSON.stringify(wCount)}.`, 3);

  function countsMatch(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if ((a[k] || 0) !== (b[k] || 0)) return false;
    }
    return true;
  }

  if (countsMatch(pCount, wCount)) {
    matches.push(0);
    state.vars.matches = matches.length;
    state.metrics.matches = matches.length;
    for (let i = 0; i < m; i++) state.charStates[i] = 'match';
    snap(steps, state, `Window [0..${m - 1}] is anagram of "${PATTERN}"! Match at index 0.`, 6);
  }

  for (let right = m; right < n; right++) {
    const left = right - m + 1;

    // Add right char
    wCount[s[right]] = (wCount[s[right]] || 0) + 1;
    // Remove left-1 char
    const removeChar = s[left - 1];
    wCount[removeChar]--;
    if (wCount[removeChar] === 0) delete wCount[removeChar];

    // Update states
    const newStates = new Array(n).fill('default');
    for (let i = left; i <= right; i++) newStates[i] = 'window';

    const isMatch = countsMatch(pCount, wCount);
    state.vars = { left, right, pCount: { ...pCount }, wCount: { ...wCount }, matches: matches.length };
    state.metrics.steps++;
    state.metrics.window = m;

    if (isMatch) {
      matches.push(left);
      state.vars.matches = matches.length;
      state.metrics.matches = matches.length;
      for (let i = left; i <= right; i++) newStates[i] = 'match';
      state.charStates = newStates;
      snap(steps, state, `Window [${left}..${right}] = "${TEXT.slice(left, right + 1)}" is anagram! Match at index ${left}.`, 6);
    } else {
      state.charStates = newStates;
      snap(steps, state, `Slide window to [${left}..${right}]: "${TEXT.slice(left, right + 1)}". Not anagram.`, 5);
    }
  }

  state.charStates = new Array(n).fill('default');
  for (const idx of matches) {
    for (let i = idx; i < idx + m; i++) state.charStates[i] = 'match';
  }
  state.vars = { left: n - m, right: n - 1, pCount: { ...pCount }, wCount: { ...wCount }, matches: matches.length };
  snap(steps, state, `Done. Found ${matches.length} anagram(s) of "${PATTERN}" at indices: [${matches.join(', ')}].`, 8);

  return steps;
}

const SLIDING_CODE = [
  'function findAnagrams(s, p) {',
  '  const pCount = count(p);',
  '  const wCount = count(s.slice(0, p.length));',
  '  const result = [];',
  '  for (let r = p.length; r < s.length; r++) {',
  '    wCount[s[r]]++;',
  '    wCount[s[r - p.length]]--;',
  '    if (equal(wCount, pCount))',
  '      result.push(r - p.length + 1);',
  '  }',
  '  return result;',
  '}',
];

export default {
  id: 'sliding-window',
  label: 'Sliding Window Anagram',
  icon: '🪟',
  build: buildSlidingWindowSteps,
  code: SLIDING_CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'window',  label: 'Window Size', max: 10,  color: 'var(--node-default)' },
    { key: 'matches', label: 'Matches',     max: 5,   color: 'var(--node-visited)' },
    { key: 'steps',   label: 'Slides',      max: 10,  color: 'var(--node-comparing)' },
  ],
};

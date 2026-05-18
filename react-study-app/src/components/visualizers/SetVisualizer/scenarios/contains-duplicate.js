import { snap } from './shared';

const NUMS = [1, 2, 3, 1, 4, 2];
const K = 2;

function buildContainsDuplicateSteps() {
  const steps = [];
  const window = {};  // value → last index seen
  let found = false;
  let foundPair = null;

  const state = {
    nums: [...NUMS],
    k: K,
    activeIndex: -1,
    windowIndices: [],
    foundIndices: [],
    vars: { i: 0, k: K, window: {}, found: false },
    metrics: { checked: 0, windowSize: 0, found: 0 },
  };

  snap(steps, state, `Contains Duplicate: find nums[i]==nums[j] where |i-j|<=${K}. Sliding set window.`, 1);

  for (let i = 0; i < NUMS.length; i++) {
    const num = NUMS[i];

    // Remove elements outside window
    const expiredKey = Object.entries(window).find(([, idx]) => i - idx > K);
    if (expiredKey) {
      delete window[expiredKey[0]];
    }

    state.activeIndex = i;
    state.windowIndices = Object.values(window);
    state.vars = { i, k: K, window: { ...window }, found };
    state.metrics.checked = i + 1;
    state.metrics.windowSize = Object.keys(window).length;

    if (window[num] !== undefined && i - window[num] <= K) {
      found = true;
      foundPair = [window[num], i];
      state.foundIndices = foundPair;
      state.vars = { i, k: K, window: { ...window }, found };
      state.metrics.found = 1;
      snap(steps, state, `Duplicate found! nums[${foundPair[0]}]==${num}==nums[${i}], |${foundPair[0]}-${i}|=${i - foundPair[0]} <= k=${K}.`, 5);
      break;
    }

    window[num] = i;
    state.windowIndices = Object.values(window);
    state.vars = { i, k: K, window: { ...window }, found };
    snap(steps, state, `nums[${i}]=${num} not in window. Add to set. Window: {${Object.keys(window).map((k) => `${k}@${window[k]}`).join(', ')}}.`, 4);
  }

  if (!found) {
    state.vars = { i: NUMS.length, k: K, window: { ...window }, found: false };
    snap(steps, state, `No duplicate within distance k=${K} found.`, 7);
  } else {
    state.activeIndex = -1;
    snap(steps, state, `Done. Duplicate pair: nums[${foundPair[0]}]=nums[${foundPair[1]}]=${NUMS[foundPair[0]]}. Distance=${foundPair[1] - foundPair[0]}.`, 7);
  }

  return steps;
}

const DUP_CODE = [
  'function containsNearbyDuplicate(nums, k) {',
  '  const window = new Set();',
  '  for (let i = 0; i < nums.length; i++) {',
  '    if (window.has(nums[i])) return true;',
  '    window.add(nums[i]);',
  '    if (window.size > k)',
  '      window.delete(nums[i - k]);',
  '  }',
  '  return false;',
  '}',
];

export default {
  id: 'contains-duplicate',
  label: 'Contains Duplicate',
  icon: '🔁',
  build: buildContainsDuplicateSteps,
  code: DUP_CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'checked',    label: 'Checked',     max: 10, color: 'var(--node-default)' },
    { key: 'windowSize', label: 'Window Size',  max: 5,  color: 'var(--node-comparing)' },
    { key: 'found',      label: 'Duplicate',    max: 1,  color: 'var(--node-visited)' },
  ],
};

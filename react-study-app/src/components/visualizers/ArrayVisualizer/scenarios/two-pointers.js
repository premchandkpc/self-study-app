import { snap, makeArr } from '@/core/utils/scenarioShared';

const DEFAULT_ARR = [1, 2, 3, 4, 5, 6];
const DEFAULT_TARGET = 9;

const CODE = [
  'function twoSum(arr, target) {',
  '  let left = 0, right = arr.length - 1;',
  '  while (left < right) {',
  '    const sum = arr[left] + arr[right];',
  '    if (sum === target) return [left, right];',
  '    if (sum < target) left++;',
  '    else right--;',
  '  }',
  '  return [-1, -1];',
  '}',
];

function build({ arr = DEFAULT_ARR, target = DEFAULT_TARGET } = {}) {
  arr = Array.isArray(arr) ? arr.filter((v) => Number.isFinite(v)).slice(0, 12) : DEFAULT_ARR;
  if (arr.length < 2) arr = DEFAULT_ARR;
  arr = arr.slice().sort((a, b) => a - b); // must be sorted for two-pointer
  target = Number(target) || DEFAULT_TARGET;

  const steps = [];
  const cells = makeArr(arr);

  function mkCells(left, right, extraStates = {}) {
    return cells.map((c, i) => {
      if (extraStates[i]) return { ...c, state: extraStates[i] };
      if (i === left) return { ...c, state: 'left' };
      if (i === right) return { ...c, state: 'right' };
      if (i < left || i > right) return { ...c, state: 'visited' };
      return { ...c, state: 'idle' };
    });
  }

  let left = 0, right = arr.length - 1;
  const s = {
    cells: mkCells(left, right),
    pointers: { left, right },
    vars: { left, right, sum: '-', target, found: false },
    complexity: { ops: 0, label: 'O(n)', space: 'O(1)' },
  };
  snap(steps, s, `Two Pointers: left=0, right=${right}. Target=${target}. Array sorted.`, 1);

  let ops = 0;
  while (left < right) {
    const sum = arr[left] + arr[right];
    ops++;
    s.cells = mkCells(left, right);
    s.pointers = { left, right };
    s.vars = { left, right, sum, target, found: false };
    s.complexity = { ops, label: 'O(n)', space: 'O(1)' };

    if (sum === target) {
      s.cells = mkCells(left, right, { [left]: 'found', [right]: 'found' });
      s.vars = { left, right, sum, target, found: true };
      snap(steps, s, `Found! arr[${left}]+arr[${right}] = ${arr[left]}+${arr[right]} = ${sum} == target!`, 4);
      return steps;
    } else if (sum < target) {
      snap(steps, s, `sum=${sum} < target=${target} → move left pointer right (need bigger sum)`, 5);
      left++;
    } else {
      snap(steps, s, `sum=${sum} > target=${target} → move right pointer left (need smaller sum)`, 6);
      right--;
    }

    s.cells = mkCells(left, right);
    s.pointers = { left, right };
    s.vars = { left, right, sum: '-', target, found: false };
    snap(steps, s, `Pointers now: left=${left}, right=${right}. ${left >= right ? 'Pointers crossed.' : 'Continue.'}`, 2);
  }

  s.cells = cells.map((c) => ({ ...c, state: 'done' }));
  s.vars = { left, right, sum: arr[left] + arr[right], target, found: false };
  snap(steps, s, 'Pointers crossed — no pair found.', 8);

  return steps;
}

export default {
  id: 'two-pointers',
  label: 'Two Pointers',
  icon: '👉',
  build,
  inputs: [
    { key: 'arr',    label: 'Sorted array (comma-sep)', type: 'array-num', default: DEFAULT_ARR },
    { key: 'target', label: 'Target sum',               type: 'number',    default: DEFAULT_TARGET },
  ],
  code: CODE,
  language: 'javascript',
  metrics: [],
};

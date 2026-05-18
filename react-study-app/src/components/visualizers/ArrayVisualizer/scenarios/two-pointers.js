import { snap, makeArr } from './shared';

// Sorted array, target sum = 9
const ARR = [1, 2, 3, 4, 5, 6];
const TARGET = 9;

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

function build() {
  const steps = [];
  const cells = makeArr(ARR);

  function mkCells(left, right, extraStates = {}) {
    return cells.map((c, i) => {
      if (extraStates[i]) return { ...c, state: extraStates[i] };
      if (i === left) return { ...c, state: 'left' };
      if (i === right) return { ...c, state: 'right' };
      if (i < left || i > right) return { ...c, state: 'visited' };
      return { ...c, state: 'idle' };
    });
  }

  let left = 0, right = ARR.length - 1;
  const s = {
    cells: mkCells(left, right),
    pointers: { left, right },
    vars: { left, right, sum: 0, target: TARGET, found: false },
    complexity: { ops: 0, label: 'O(n)', space: 'O(1)' },
  };
  snap(steps, s, `Two Pointers: left=0, right=${right}. Target=${TARGET}.`, 1);

  let ops = 0;
  while (left < right) {
    const sum = ARR[left] + ARR[right];
    ops++;
    s.cells = mkCells(left, right);
    s.pointers = { left, right };
    s.vars = { left, right, sum, target: TARGET, found: false };
    s.complexity = { ops, label: 'O(n)', space: 'O(1)' };

    if (sum === TARGET) {
      s.cells = mkCells(left, right, { [left]: 'found', [right]: 'found' });
      s.vars = { left, right, sum, target: TARGET, found: true };
      snap(steps, s, `Found! arr[${left}]+arr[${right}] = ${ARR[left]}+${ARR[right]} = ${sum} == target!`, 4);
      break;
    } else if (sum < TARGET) {
      snap(steps, s, `sum=${sum} < target=${TARGET} → move left pointer right (need bigger sum)`, 5);
      left++;
    } else {
      snap(steps, s, `sum=${sum} > target=${TARGET} → move right pointer left (need smaller sum)`, 6);
      right--;
    }
  }

  if (!(ARR[left] + ARR[right] === TARGET && left < right)) {
    s.cells = cells.map((c) => ({ ...c, state: 'done' }));
    s.vars = { left, right, sum: ARR[left] + ARR[right], target: TARGET, found: false };
    snap(steps, s, 'Pointers crossed — no pair found.', 8);
  }

  return steps;
}

export default {
  id: 'two-pointers',
  label: 'Two Pointers',
  icon: '👉',
  build,
  code: CODE,
  language: 'javascript',
  metrics: [],
};

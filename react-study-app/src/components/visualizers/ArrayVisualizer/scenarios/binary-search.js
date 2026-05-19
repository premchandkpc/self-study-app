import { snap, makeArr } from '@/core/utils/scenarioShared';

const DEFAULT_ARR    = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
const DEFAULT_TARGET = 13;

const CODE = [
  'function binarySearch(arr, target) {',
  '  let lo = 0, hi = arr.length - 1;',
  '  while (lo <= hi) {',
  '    const mid = Math.floor((lo + hi) / 2);',
  '    if (arr[mid] === target) return mid;',
  '    if (arr[mid] < target) lo = mid + 1;',
  '    else hi = mid - 1;',
  '  }',
  '  return -1;',
  '}',
];

function mkCells(base, lo, hi, mid, foundIdx) {
  return base.map((c, i) => {
    if (i === foundIdx) return { ...c, state: 'found' };
    if (i === mid)      return { ...c, state: 'active' };
    if (i >= lo && i <= hi) return { ...c, state: 'window' };
    return { ...c, state: 'visited' };
  });
}

function build({ arr = DEFAULT_ARR, target = DEFAULT_TARGET } = {}) {
  // ensure sorted
  arr = arr.slice().sort((a, b) => a - b);
  if (!arr.length) arr = DEFAULT_ARR;
  target = Number(target);

  const steps = [];
  const base  = makeArr(arr);

  let lo = 0, hi = arr.length - 1, ops = 0;

  const s = {
    cells: mkCells(base, lo, hi, -1, -1),
    pointers: { lo, hi, mid: '-' },
    vars: { lo, hi, mid: '-', 'arr[mid]': '-', target, result: '-' },
    complexity: { ops: 0, label: 'O(log n)', space: 'O(1)' },
  };
  snap(steps, s, `Binary Search: find ${target} in [${arr}]. lo=0, hi=${hi}.`, 1);

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    ops++;

    // step 1: compute mid
    s.cells    = mkCells(base, lo, hi, mid, -1);
    s.pointers = { lo, hi, mid };
    s.vars     = { lo, hi, mid, 'arr[mid]': arr[mid], target, result: '-' };
    s.complexity = { ops, label: 'O(log n)', space: 'O(1)' };
    snap(steps, s, `Iteration ${ops}: lo=${lo}, hi=${hi} → mid=${mid}. Check arr[${mid}]=${arr[mid]}.`, 3);

    if (arr[mid] === target) {
      // step 2: found
      s.cells = mkCells(base, lo, hi, -1, mid);
      s.vars  = { lo, hi, mid, 'arr[mid]': arr[mid], target, result: mid };
      snap(steps, s, `arr[${mid}]=${arr[mid]} === target=${target}. ✓ Found at index ${mid}!`, 4);
      return steps;
    }

    if (arr[mid] < target) {
      // step 2: compare
      snap(steps, s, `arr[${mid}]=${arr[mid]} < target=${target} → discard left half. New lo = ${mid + 1}.`, 5);
      lo = mid + 1;
      // step 3: show new range
      s.cells    = mkCells(base, lo, hi, -1, -1);
      s.pointers = { lo, hi, mid: '-' };
      s.vars     = { lo, hi, mid: '-', 'arr[mid]': '-', target, result: '-' };
      snap(steps, s, `Search range narrowed: [${lo}..${hi}]. ${lo > hi ? 'Range empty.' : `${hi - lo + 1} element(s) remain.`}`, 2);
    } else {
      // step 2: compare
      snap(steps, s, `arr[${mid}]=${arr[mid]} > target=${target} → discard right half. New hi = ${mid - 1}.`, 6);
      hi = mid - 1;
      // step 3: show new range
      s.cells    = mkCells(base, lo, hi, -1, -1);
      s.pointers = { lo, hi, mid: '-' };
      s.vars     = { lo, hi, mid: '-', 'arr[mid]': '-', target, result: '-' };
      snap(steps, s, `Search range narrowed: [${lo}..${hi}]. ${lo > hi ? 'Range empty.' : `${hi - lo + 1} element(s) remain.`}`, 2);
    }
  }

  // not found
  s.cells = base.map((c) => ({ ...c, state: 'visited' }));
  s.pointers = { lo, hi, mid: '-' };
  s.vars  = { lo, hi, mid: '-', 'arr[mid]': '-', target, result: -1 };
  snap(steps, s, `lo(${lo}) > hi(${hi}) — search space exhausted. ${target} not found → return -1.`, 8);

  return steps;
}

export default {
  id: 'binary-search',
  label: 'Binary Search',
  icon: '🎯',
  build,
  inputs: [
    { key: 'arr',    label: 'Sorted array (comma-sep)', type: 'array-num', default: DEFAULT_ARR },
    { key: 'target', label: 'Target',                   type: 'number',    default: DEFAULT_TARGET },
  ],
  code: CODE,
  language: 'javascript',
  metrics: [],
};

import { snap, makeArr } from './shared';

const ARR = [1, 3, 5, 7, 9, 11, 13, 15];
const TARGET = 11;

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

function build() {
  const steps = [];
  const cells = makeArr(ARR);

  function mkCells(lo, hi, mid, foundIdx = -1) {
    return cells.map((c, i) => {
      if (i === foundIdx) return { ...c, state: 'found' };
      if (i === mid) return { ...c, state: 'active' };
      if (i >= lo && i <= hi) return { ...c, state: 'window' };
      return { ...c, state: 'visited' };
    });
  }

  let lo = 0, hi = ARR.length - 1;
  const s = {
    cells: mkCells(lo, hi, -1),
    pointers: { lo, hi, mid: -1 },
    vars: { lo, hi, mid: '?', target: TARGET, found: false },
    complexity: { ops: 0, label: 'O(log n)', space: 'O(1)' },
  };
  snap(steps, s, `Binary Search: target=${TARGET} in sorted array. lo=0, hi=${hi}.`, 1);

  let ops = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    ops++;
    s.cells = mkCells(lo, hi, mid);
    s.pointers = { lo, hi, mid };
    s.vars = { lo, hi, mid, 'arr[mid]': ARR[mid], target: TARGET, found: false };
    s.complexity = { ops, label: 'O(log n)', space: 'O(1)' };

    if (ARR[mid] === TARGET) {
      s.cells = mkCells(lo, hi, -1, mid);
      s.vars = { lo, hi, mid, 'arr[mid]': ARR[mid], target: TARGET, found: true };
      snap(steps, s, `Found! arr[${mid}]=${ARR[mid]} == target. Index=${mid}.`, 4);
      return steps;
    } else if (ARR[mid] < TARGET) {
      snap(steps, s, `arr[${mid}]=${ARR[mid]} < ${TARGET} → search right half. lo=${mid + 1}`, 5);
      lo = mid + 1;
    } else {
      snap(steps, s, `arr[${mid}]=${ARR[mid]} > ${TARGET} → search left half. hi=${mid - 1}`, 6);
      hi = mid - 1;
    }
  }

  s.cells = cells.map((c) => ({ ...c, state: 'done' }));
  s.vars = { lo, hi, mid: -1, target: TARGET, found: false };
  snap(steps, s, `Not found. lo > hi — target ${TARGET} not in array.`, 8);

  return steps;
}

export default {
  id: 'binary-search',
  label: 'Binary Search',
  icon: '🎯',
  build,
  code: CODE,
  language: 'javascript',
  metrics: [],
};

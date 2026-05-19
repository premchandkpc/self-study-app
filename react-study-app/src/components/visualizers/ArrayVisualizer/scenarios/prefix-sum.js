import { snap, makeArr } from '@/core/utils/scenarioShared';

const DEFAULT_ARR = [1, 2, 3, 4];
const DEFAULT_L = 1;
const DEFAULT_R = 3;

const CODE = [
  'function buildPrefix(arr) {',
  '  const pre = [0];',
  '  for (let i = 0; i < arr.length; i++)',
  '    pre[i+1] = pre[i] + arr[i];',
  '  return pre; // pre[i+1]-pre[l] = rangeSum(l,i)',
  '}',
  'function rangeSum(pre, l, r) {',
  '  return pre[r+1] - pre[l];',
  '}',
];

function build({ arr = DEFAULT_ARR, l = DEFAULT_L, r = DEFAULT_R } = {}) {
  arr = Array.isArray(arr) ? arr.filter((v) => Number.isFinite(v)).slice(0, 12) : DEFAULT_ARR;
  if (arr.length < 2) arr = DEFAULT_ARR;
  l = Math.max(0, Math.min(Math.floor(Number(l) || 0), arr.length - 1));
  r = Math.max(l, Math.min(Math.floor(Number(r) || arr.length - 1), arr.length - 1));

  const steps = [];
  const cells = makeArr(arr);

  const s = {
    cells: cells.map((c) => ({ ...c, state: 'idle' })),
    prefix: [0],
    query: null,
    vars: { i: -1, prefix: [0] },
    complexity: { ops: 0, label: 'O(n)', space: 'O(n)' },
  };

  snap(steps, s, 'Build prefix sum array. pre[0]=0 (sentinel).', 1);

  for (let i = 0; i < arr.length; i++) {
    const newPre = [...s.prefix, s.prefix[s.prefix.length - 1] + arr[i]];
    s.cells = cells.map((c, idx) => ({ ...c, state: idx === i ? 'active' : idx < i ? 'visited' : 'idle' }));
    s.prefix = newPre;
    s.vars = { i, 'arr[i]': arr[i], 'pre[i+1]': newPre[i + 1], prefix: newPre };
    s.complexity = { ops: i + 1, label: 'O(n)', space: 'O(n)' };
    snap(steps, s, `pre[${i + 1}] = pre[${i}] + arr[${i}] = ${newPre[i]} + ${arr[i]} = ${newPre[i + 1]}`, 3);
  }

  const finalPrefix = s.prefix;
  s.cells = cells.map((c, idx) => ({ ...c, state: idx >= l && idx <= r ? 'window' : 'visited' }));
  s.query = { l, r };
  const rangeSum = finalPrefix[r + 1] - finalPrefix[l];
  s.vars = { prefix: finalPrefix, l, r, 'pre[r+1]': finalPrefix[r + 1], 'pre[l]': finalPrefix[l], rangeSum };
  s.complexity = { ops: arr.length + 1, label: 'O(1) query', space: 'O(n)' };
  snap(steps, s, `Query rangeSum(${l},${r}) = pre[${r + 1}] - pre[${l}] = ${finalPrefix[r + 1]} - ${finalPrefix[l]} = ${rangeSum}`, 7);

  s.cells = cells.map((c) => ({ ...c, state: 'done' }));
  s.vars = { prefix: finalPrefix, rangeSum, result: rangeSum };
  s.complexity = { ops: arr.length + 1, label: 'O(1) query', space: 'O(n)' };
  snap(steps, s, `Done! rangeSum(${l},${r}) = ${rangeSum} in O(1) after O(n) build.`, 8);

  return steps;
}

export default {
  id: 'prefix-sum',
  label: 'Prefix Sum',
  icon: '∑',
  build,
  inputs: [
    { key: 'arr', label: 'Array (comma-sep)', type: 'array-num', default: DEFAULT_ARR },
    { key: 'l',   label: 'Query left index',  type: 'number',    default: DEFAULT_L, min: 0, max: 11 },
    { key: 'r',   label: 'Query right index', type: 'number',    default: DEFAULT_R, min: 0, max: 11 },
  ],
  code: CODE,
  language: 'javascript',
  metrics: [],
};

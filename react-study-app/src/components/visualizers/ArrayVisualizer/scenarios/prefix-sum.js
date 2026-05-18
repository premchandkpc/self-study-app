import { snap, makeArr } from './shared';

const ARR = [1, 2, 3, 4]; // prefix: [0,1,3,6,10]
const QUERY_L = 1;
const QUERY_R = 3;

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

function build() {
  const steps = [];
  const cells = makeArr(ARR);

  const s = {
    cells: cells.map((c) => ({ ...c, state: 'idle' })),
    prefix: [0],
    query: null,
    vars: { i: -1, prefix: [0] },
    complexity: { ops: 0, label: 'O(n)', space: 'O(n)' },
  };

  snap(steps, s, 'Build prefix sum array. pre[0]=0 (sentinel).', 1);

  for (let i = 0; i < ARR.length; i++) {
    const newPre = [...s.prefix, s.prefix[s.prefix.length - 1] + ARR[i]];
    s.cells = cells.map((c, idx) => ({ ...c, state: idx === i ? 'active' : idx < i ? 'visited' : 'idle' }));
    s.prefix = newPre;
    s.vars = { i, 'arr[i]': ARR[i], 'pre[i+1]': newPre[i + 1], prefix: newPre };
    s.complexity = { ops: i + 1, label: 'O(n)', space: 'O(n)' };
    snap(steps, s, `pre[${i + 1}] = pre[${i}] + arr[${i}] = ${newPre[i]} + ${ARR[i]} = ${newPre[i + 1]}`, 3);
  }

  // Show query
  const finalPrefix = s.prefix;
  s.cells = cells.map((c, idx) => ({ ...c, state: idx >= QUERY_L && idx <= QUERY_R ? 'window' : 'visited' }));
  s.query = { l: QUERY_L, r: QUERY_R };
  const rangeSum = finalPrefix[QUERY_R + 1] - finalPrefix[QUERY_L];
  s.vars = { prefix: finalPrefix, l: QUERY_L, r: QUERY_R, 'pre[r+1]': finalPrefix[QUERY_R + 1], 'pre[l]': finalPrefix[QUERY_L], rangeSum };
  s.complexity = { ops: ARR.length + 1, label: 'O(1) query', space: 'O(n)' };
  snap(steps, s, `Query rangeSum(${QUERY_L},${QUERY_R}) = pre[${QUERY_R + 1}] - pre[${QUERY_L}] = ${finalPrefix[QUERY_R + 1]} - ${finalPrefix[QUERY_L]} = ${rangeSum}`, 7);

  s.cells = cells.map((c) => ({ ...c, state: 'done' }));
  s.vars = { prefix: finalPrefix, rangeSum, result: rangeSum };
  s.complexity = { ops: ARR.length + 1, label: 'O(1) query', space: 'O(n)' };
  snap(steps, s, `Done! rangeSum(${QUERY_L},${QUERY_R}) = ${rangeSum} in O(1) after O(n) build.`, 8);

  return steps;
}

export default {
  id: 'prefix-sum',
  label: 'Prefix Sum',
  icon: '∑',
  build,
  code: CODE,
  language: 'javascript',
  metrics: [],
};

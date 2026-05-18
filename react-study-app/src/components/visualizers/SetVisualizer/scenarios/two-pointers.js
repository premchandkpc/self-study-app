import { snap } from './shared';

const ARR1 = [1, 3, 5, 7];
const ARR2 = [2, 3, 6, 7];

function buildTwoPointersSteps() {
  const steps = [];
  const result = [];
  const seen = {};
  let i = 0;
  let j = 0;

  const state = {
    arr1: [...ARR1],
    arr2: [...ARR2],
    result: [],
    seen: {},
    activeI: -1,
    activeJ: -1,
    vars: { i: 0, j: 0, result: [], seen: {} },
    metrics: { steps: 0, merged: 0, deduped: 0 },
  };

  snap(steps, state, `Merge two sorted arrays using Set dedup. A=${JSON.stringify(ARR1)}, B=${JSON.stringify(ARR2)}.`, 1);

  while (i < ARR1.length || j < ARR2.length) {
    let picked;
    let fromArr;

    if (i >= ARR1.length) {
      picked = ARR2[j];
      fromArr = 'B';
      j++;
    } else if (j >= ARR2.length) {
      picked = ARR1[i];
      fromArr = 'A';
      i++;
    } else if (ARR1[i] <= ARR2[j]) {
      picked = ARR1[i];
      fromArr = 'A';
      i++;
    } else {
      picked = ARR2[j];
      fromArr = 'B';
      j++;
    }

    state.activeI = i - (fromArr === 'A' ? 1 : 0);
    state.activeJ = j - (fromArr === 'B' ? 1 : 0);
    state.vars = { i, j, result: [...result], seen: { ...seen } };
    state.metrics.steps++;

    if (seen[picked]) {
      snap(steps, state, `Pick ${picked} from ${fromArr} — already in Set. Skip (dedup).`, 5);
      state.metrics.deduped++;
    } else {
      seen[picked] = true;
      result.push(picked);
      state.result = [...result];
      state.seen = { ...seen };
      state.vars = { i, j, result: [...result], seen: { ...seen } };
      state.metrics.merged = result.length;
      snap(steps, state, `Pick ${picked} from ${fromArr} — new. Add to result: [${result.join(',')}].`, 6);
    }
  }

  state.activeI = -1;
  state.activeJ = -1;
  state.vars = { i, j, result: [...result], seen: { ...seen } };
  snap(steps, state, `Done. Merged sorted set: [${result.join(',')}]. Deduped ${state.metrics.deduped} duplicate(s).`, 9);

  return steps;
}

const TWO_PTR_CODE = [
  'function mergeSortedSets(a, b) {',
  '  const result = [];',
  '  const seen = new Set();',
  '  let i = 0, j = 0;',
  '  while (i < a.length || j < b.length) {',
  '    const val = pick smaller of a[i], b[j];',
  '    if (!seen.has(val)) {',
  '      seen.add(val);',
  '      result.push(val);',
  '    }',
  '  }',
  '  return result;',
  '}',
];

export default {
  id: 'two-pointers',
  label: 'Sorted Set Merge',
  icon: '↔️',
  build: buildTwoPointersSteps,
  code: TWO_PTR_CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'merged',  label: 'Merged',   max: 8, color: 'var(--node-visited)' },
    { key: 'deduped', label: 'Deduped',  max: 4, color: 'var(--node-active)' },
    { key: 'steps',   label: 'Steps',    max: 8, color: 'var(--node-default)' },
  ],
};

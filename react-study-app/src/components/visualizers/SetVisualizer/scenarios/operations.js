import { snap } from './shared';

const SET_A = [1, 2, 3];
const SET_B = [2, 3, 4];

function buildOperationsSteps({ setA: aIn = SET_A, setB: bIn = SET_B } = {}) {
  const A = Array.isArray(aIn) ? aIn.filter((v) => Number.isFinite(v)).slice(0, 8) : SET_A;
  const B = Array.isArray(bIn) ? bIn.filter((v) => Number.isFinite(v)).slice(0, 8) : SET_B;
  const SA = A.length ? A : SET_A;
  const SB = B.length ? B : SET_B;
  const steps = [];

  const state = {
    setA: [...SA],
    setB: [...SB],
    union: [],
    intersect: [],
    diff: [],
    activeOp: 'none',
    highlightA: [],
    highlightB: [],
    vars: { A: [...SA], B: [...SB], union: [], intersect: [], diff: [] },
    metrics: { union: 0, intersect: 0, diff: 0 },
  };

  snap(steps, state, `Set operations: A={${SA.join(',')}} and B={${SB.join(',')}}.`, 1);

  const union = [...new Set([...SA, ...SB])];
  state.activeOp = 'union';
  state.union = union;
  state.highlightA = [...SA];
  state.highlightB = [...SB];
  state.vars = { A: [...SA], B: [...SB], union, intersect: [], diff: [] };
  state.metrics.union = union.length;
  snap(steps, state, `Union A∪B: all elements from both. {${union.join(',')}}.`, 2);

  const intersect = SA.filter((x) => SB.includes(x));
  state.activeOp = 'intersect';
  state.intersect = intersect;
  state.highlightA = intersect;
  state.highlightB = intersect;
  state.vars = { A: [...SA], B: [...SB], union, intersect, diff: [] };
  state.metrics.intersect = intersect.length;
  snap(steps, state, `Intersection A∩B: elements in both. {${intersect.join(',')}}.`, 4);

  const diff = SA.filter((x) => !SB.includes(x));
  state.activeOp = 'diff';
  state.diff = diff;
  state.highlightA = diff;
  state.highlightB = [];
  state.vars = { A: [...SA], B: [...SB], union, intersect, diff };
  state.metrics.diff = diff.length;
  snap(steps, state, `Difference A-B: in A but not B. {${diff.join(',')}}.`, 6);

  state.activeOp = 'all';
  state.highlightA = [...SA];
  state.highlightB = [...SB];
  state.vars = { A: [...SA], B: [...SB], union, intersect, diff };
  snap(steps, state, `Complete: A∪B={${union.join(',')}}, A∩B={${intersect.join(',')}}, A-B={${diff.join(',')}}.`, 8);

  return steps;
}

const OPS_CODE = [
  'const A = new Set([1, 2, 3]);',
  'const B = new Set([2, 3, 4]);',
  '// Union',
  'const union = new Set([...A, ...B]);',
  '// Intersection',
  'const intersect = new Set([...A].filter(x => B.has(x)));',
  '// Difference',
  'const diff = new Set([...A].filter(x => !B.has(x)));',
];

export default {
  id: 'operations',
  label: 'Set Operations',
  icon: '∪',
  build: buildOperationsSteps,
  inputs: [
    { key: 'setA', label: 'Set A (comma-sep)', type: 'array-num', default: SET_A },
    { key: 'setB', label: 'Set B (comma-sep)', type: 'array-num', default: SET_B },
  ],
  code: OPS_CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'union',     label: 'Union',     max: 8, color: 'var(--node-default)' },
    { key: 'intersect', label: 'Intersect', max: 4, color: 'var(--node-visited)' },
    { key: 'diff',      label: 'Diff',      max: 4, color: 'var(--node-active)' },
  ],
};

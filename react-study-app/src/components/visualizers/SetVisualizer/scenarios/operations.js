import { snap } from './shared';

const SET_A = [1, 2, 3];
const SET_B = [2, 3, 4];

function buildOperationsSteps() {
  const steps = [];

  const state = {
    setA: [...SET_A],
    setB: [...SET_B],
    union: [],
    intersect: [],
    diff: [],
    activeOp: 'none',
    highlightA: [],
    highlightB: [],
    vars: { A: [...SET_A], B: [...SET_B], union: [], intersect: [], diff: [] },
    metrics: { union: 0, intersect: 0, diff: 0 },
  };

  snap(steps, state, `Set operations: A={${SET_A.join(',')}} and B={${SET_B.join(',')}}.`, 1);

  // Union
  const union = [...new Set([...SET_A, ...SET_B])];
  state.activeOp = 'union';
  state.union = union;
  state.highlightA = [...SET_A];
  state.highlightB = [...SET_B];
  state.vars = { A: [...SET_A], B: [...SET_B], union, intersect: [], diff: [] };
  state.metrics.union = union.length;
  snap(steps, state, `Union A∪B: all elements from both. {${union.join(',')}}.`, 2);

  // Intersection
  const intersect = SET_A.filter((x) => SET_B.includes(x));
  state.activeOp = 'intersect';
  state.intersect = intersect;
  state.highlightA = intersect;
  state.highlightB = intersect;
  state.vars = { A: [...SET_A], B: [...SET_B], union, intersect, diff: [] };
  state.metrics.intersect = intersect.length;
  snap(steps, state, `Intersection A∩B: elements in both. {${intersect.join(',')}}.`, 4);

  // Difference A - B
  const diff = SET_A.filter((x) => !SET_B.includes(x));
  state.activeOp = 'diff';
  state.diff = diff;
  state.highlightA = diff;
  state.highlightB = [];
  state.vars = { A: [...SET_A], B: [...SET_B], union, intersect, diff };
  state.metrics.diff = diff.length;
  snap(steps, state, `Difference A-B: in A but not B. {${diff.join(',')}}.`, 6);

  // All
  state.activeOp = 'all';
  state.highlightA = [...SET_A];
  state.highlightB = [...SET_B];
  state.vars = { A: [...SET_A], B: [...SET_B], union, intersect, diff };
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
  code: OPS_CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'union',     label: 'Union',     max: 8, color: 'var(--node-default)' },
    { key: 'intersect', label: 'Intersect', max: 4, color: 'var(--node-visited)' },
    { key: 'diff',      label: 'Diff',      max: 4, color: 'var(--node-active)' },
  ],
};

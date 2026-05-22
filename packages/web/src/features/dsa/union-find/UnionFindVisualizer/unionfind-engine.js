import { AlgorithmCompiler } from '../../../../core/compiler/AlgorithmCompiler';

const compiler = new AlgorithmCompiler();

const unionFindAlgorithm = (input, tracer) => {
  const { n, edges } = input;
  const parent = Array(n).fill(0).map((_, i) => i);
  
  tracer.step('Initialize', `UnionFind with ${n} elements`, input);
  
  const find = (x) => parent[x] === x ? x : find(parent[x]);
  
  for (let [u, v] of edges) {
    const pu = find(u), pv = find(v);
    if (pu !== pv) {
      parent[pu] = pv;
      tracer.step('Union', `Connect ${u} and ${v}`,
        { n, edges, parent: [...parent] });
    }
  }
  
  tracer.found(parent, { state: { n, parent } });
  return parent;
};

export const SCENARIOS = [
  {
    id: 'union-find',
    label: 'Union-Find',
    icon: '⚡',
    code: `const algorithm = (input, tracer) => {
  const { n, edges } = input;
  const parent = Array(n).fill(0).map((_, i) => i);
  const find = (x) => parent[x] === x ? x : find(parent[x]);
  for (let [u, v] of edges) {
    const pu = find(u), pv = find(v);
    if (pu !== pv) parent[pu] = pv;
  }
  return parent;
};`,
    language: 'javascript',
    inputs: [
      { key: 'n', label: 'Elements', type: 'number', default: 5, min: 2, max: 10 },
      { key: 'edges', label: 'Edges', type: 'text', default: '[[0,1],[1,2],[3,4]]' },
    ],
    build(params = {}) {
      const n = Math.max(2, Math.floor(params.n || 5));
      let edges = [[0,1],[1,2],[3,4]];
      if (typeof params.edges === 'string') {
        try { edges = JSON.parse(params.edges); } catch { /* intentionally empty */ }
      }
      return compiler.compile(unionFindAlgorithm, { n, edges });
    },
  },
];

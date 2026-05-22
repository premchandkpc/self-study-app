import { AlgorithmCompiler } from '../../core/compiler/AlgorithmCompiler';

const compiler = new AlgorithmCompiler();

const unionAlgorithm = (input, tracer) => {
  const { setA, setB } = input;
  tracer.step('Initialize', `Union of ${JSON.stringify(setA)} and ${JSON.stringify(setB)}`, input);
  
  const result = new Set(setA);
  for (let item of setB) {
    if (!result.has(item)) {
      result.add(item);
      tracer.step('Add', `Added ${item}`, { setA, setB, result: Array.from(result) });
    }
  }
  
  tracer.found(Array.from(result), { state: { setA, setB, result: Array.from(result) } });
  return Array.from(result);
};

const intersectionAlgorithm = (input, tracer) => {
  const { setA, setB } = input;
  tracer.step('Initialize', `Intersection`, input);
  
  const result = [];
  for (let item of setA) {
    if (setB.includes(item)) {
      result.push(item);
      tracer.step('Common', `${item} in both sets`, { setA, setB, result });
    }
  }
  
  tracer.found(result, { state: { setA, setB, result } });
  return result;
};

export const SCENARIOS = [
  {
    id: 'union',
    label: 'Set Union',
    icon: '∪',
    code: `const algorithm = (input, tracer) => {
  const { setA, setB } = input;
  const result = new Set(setA);
  for (let item of setB) result.add(item);
  return Array.from(result);
};`,
    language: 'javascript',
    inputs: [
      { key: 'setA', label: 'Set A', type: 'array-num', default: [1, 2, 3] },
      { key: 'setB', label: 'Set B', type: 'array-num', default: [3, 4, 5] },
    ],
    build(params = {}) {
      const setA = Array.isArray(params.setA) ? params.setA : [1, 2, 3];
      const setB = Array.isArray(params.setB) ? params.setB : [3, 4, 5];
      return compiler.compile(unionAlgorithm, { setA, setB });
    },
  },
  {
    id: 'intersection',
    label: 'Set Intersection',
    icon: '∩',
    code: `const algorithm = (input, tracer) => {
  const { setA, setB } = input;
  return setA.filter(x => setB.includes(x));
};`,
    language: 'javascript',
    inputs: [
      { key: 'setA', label: 'Set A', type: 'array-num', default: [1, 2, 3] },
      { key: 'setB', label: 'Set B', type: 'array-num', default: [2, 3, 4] },
    ],
    build(params = {}) {
      const setA = Array.isArray(params.setA) ? params.setA : [1, 2, 3];
      const setB = Array.isArray(params.setB) ? params.setB : [2, 3, 4];
      return compiler.compile(intersectionAlgorithm, { setA, setB });
    },
  },
];

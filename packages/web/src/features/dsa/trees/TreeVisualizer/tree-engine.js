import { AlgorithmCompiler } from '../../../../core/compiler/AlgorithmCompiler';

const compiler = new AlgorithmCompiler();

const inorderAlgorithm = (input, tracer) => {
  const { values } = input;
  const result = [];
  
  tracer.step('Initialize', `Inorder traversal`, input);
  
  const inorder = (index) => {
    if (index >= values.length || values[index] === null) return;
    inorder(2 * index + 1);
    result.push(values[index]);
    tracer.step('Visit', `Node ${values[index]}`, { values, result });
    inorder(2 * index + 2);
  };
  
  inorder(0);
  tracer.found(result, { state: { values, result } });
  return result;
};

export const SCENARIOS = [
  {
    id: 'inorder',
    label: 'Inorder Traversal',
    icon: '🌳',
    code: `const algorithm = (input, tracer) => {
  const { values } = input;
  const result = [];
  const inorder = (i) => {
    if (i >= values.length || values[i] === null) return;
    inorder(2*i+1);
    result.push(values[i]);
    inorder(2*i+2);
  };
  inorder(0);
  return result;
};`,
    language: 'javascript',
    inputs: [
      { key: 'values', label: 'Tree (Level Order)', type: 'text', default: '[1,2,3]' },
    ],
    build(params = {}) {
      let values = [1,2,3];
      if (typeof params.values === 'string') {
        try { values = JSON.parse(params.values); } catch { }
      }
      return compiler.compile(inorderAlgorithm, { values });
    },
  },
];

import { AlgorithmCompiler } from '../../core/compiler/AlgorithmCompiler';

const compiler = new AlgorithmCompiler();

const permutationsAlgorithm = (input, tracer) => {
  const { nums } = input;
  const result = [];
  const used = new Array(nums.length).fill(false);
  
  tracer.step('Initialize', `Generate permutations of ${JSON.stringify(nums)}`, input);
  
  const backtrack = (path) => {
    if (path.length === nums.length) {
      result.push([...path]);
      tracer.found([...path], { state: { nums, result } });
      return;
    }
    
    for (let i = 0; i < nums.length; i++) {
      if (!used[i]) {
        used[i] = true;
        path.push(nums[i]);
        tracer.step('Explore', `Path: [${path}]`, { nums, path, result });
        backtrack(path);
        path.pop();
        used[i] = false;
      }
    }
  };
  
  backtrack([]);
  return result;
};

export const SCENARIOS = [
  {
    id: 'permutations',
    label: 'Permutations',
    icon: '🔀',
    code: `const algorithm = (input, tracer) => {
  const { nums } = input;
  const result = [];
  const backtrack = (path) => {
    if (path.length === nums.length) {
      result.push([...path]);
      return;
    }
    for (let num of nums) {
      if (!path.includes(num)) {
        path.push(num);
        backtrack(path);
        path.pop();
      }
    }
  };
  backtrack([]);
  return result;
};`,
    language: 'javascript',
    inputs: [
      { key: 'nums', label: 'Numbers', type: 'array-num', default: [1, 2, 3] },
    ],
    build(params = {}) {
      const nums = Array.isArray(params.nums) ? params.nums : [1, 2, 3];
      return compiler.compile(permutationsAlgorithm, { nums });
    },
  },
];

import { AlgorithmCompiler } from '../../../core/compiler/AlgorithmCompiler';

const compiler = new AlgorithmCompiler();

const bubbleSortAlgorithm = (input, tracer) => {
  const { array } = input;
  const arr = [...array];
  tracer.step('Initialize', `Bubble sort ${arr.length} elements`, input);
  
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        tracer.step('Swap', `Swap arr[${j}]=${arr[j+1]} and arr[${j+1}]=${arr[j]}`,
          { array: [...arr], i, j });
      }
    }
  }
  
  tracer.found(arr, { state: { array: arr } });
  return arr;
};

export const SCENARIOS = [
  {
    id: 'bubble-sort',
    label: 'Bubble Sort',
    icon: '🫧',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  const arr = [...array];
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
};`,
    language: 'javascript',
    inputs: [
      { key: 'array', label: 'Array', type: 'array-num', default: [5, 2, 8, 1, 9] },
    ],
    build(params = {}) {
      const array = Array.isArray(params.array) ? params.array : [5, 2, 8, 1, 9];
      return compiler.compile(bubbleSortAlgorithm, { array });
    },
  },
];

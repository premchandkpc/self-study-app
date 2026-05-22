import { AlgorithmCompiler } from '../../core/compiler/AlgorithmCompiler';

const compiler = new AlgorithmCompiler();

// Sliding Window: Max Sum Subarray
const slidingWindowAlgorithm = (input, tracer) => {
  const { array, k } = input;
  let windowSum = 0;

  tracer.step('Initialize', `Find max sum window of size ${k}`, input);

  for (let i = 0; i < k; i++) {
    windowSum += array[i];
    tracer.step(
      'Build Window',
      `Add arr[${i}]=${array[i]}, windowSum=${windowSum}`,
      { array, k, i, windowSum, left: 0, right: i }
    );
  }

  let maxSum = windowSum;
  tracer.step('Max Found', `Initial window sum=${maxSum}`, { array, k, windowSum, maxSum });

  for (let i = k; i < array.length; i++) {
    windowSum += array[i] - array[i - k];
    maxSum = Math.max(maxSum, windowSum);
    tracer.step(
      'Slide Window',
      `Remove arr[${i - k}]=${array[i - k]}, add arr[${i}]=${array[i]}, sum=${windowSum}`,
      { array, k, i, windowSum, maxSum, left: i - k + 1, right: i }
    );
  }

  tracer.found(maxSum, { state: { array, k, result: maxSum } });
  return maxSum;
};

// Two Pointers: Two Sum
const twoSumAlgorithm = (input, tracer) => {
  const { array, target } = input;
  let left = 0, right = array.length - 1;

  tracer.step('Initialize', `Find pair summing to ${target}`, input);

  while (left < right) {
    const sum = array[left] + array[right];
    tracer.step(
      'Calculate',
      `arr[${left}]=${array[left]} + arr[${right}]=${array[right]} = ${sum}`,
      { array, target, left, right }
    );

    if (sum === target) {
      tracer.found([left, right], { state: { array, target, left, right } });
      return [left, right];
    }

    sum < target ? left++ : right--;
  }

  return [];
};

// Prefix Sum: Range Query
const prefixSumAlgorithm = (input, tracer) => {
  const { array, queries } = input;
  const prefix = [0];

  tracer.step('Build Prefix', 'Create prefix sum array', { array });

  for (let i = 0; i < array.length; i++) {
    prefix.push(prefix[i] + array[i]);
    tracer.step(
      'Prefix Update',
      `prefix[${i + 1}] = ${prefix[i]} + ${array[i]} = ${prefix[i + 1]}`,
      { array, prefix: [...prefix], index: i + 1 }
    );
  }

  const results = [];
  tracer.step('Ready', `Prefix array built. Answer queries in O(1)`, { array, prefix });

  for (let [left, right] of queries) {
    const sum = prefix[right + 1] - prefix[left];
    results.push(sum);
    tracer.step(
      'Query',
      `Sum[${left}..${right}] = prefix[${right + 1}] - prefix[${left}] = ${sum}`,
      { array, prefix, left, right, queryResult: sum }
    );
  }

  tracer.found(results, { state: { array, prefix, results } });
  return results;
};

// Binary Search
const binarySearchAlgorithm = (input, tracer) => {
  const { array, target } = input;
  let left = 0, right = array.length - 1;

  tracer.step('Initialize', `Search for ${target}`, input);

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    tracer.step(
      'Check Mid',
      `arr[${mid}] = ${array[mid]}`,
      { array, target, left, mid, right }
    );

    if (array[mid] === target) {
      tracer.found(mid, { state: { array, target, found: mid } });
      return mid;
    }

    array[mid] < target ? left = mid + 1 : right = mid - 1;
  }

  return -1;
};

export const SCENARIOS = [
  {
    id: 'sliding-window',
    label: 'Sliding Window',
    icon: '🪟',
    code: `const algorithm = (input, tracer) => {
  const { array, k } = input;
  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += array[i];
  let maxSum = windowSum;
  for (let i = k; i < array.length; i++) {
    windowSum += array[i] - array[i - k];
    maxSum = Math.max(maxSum, windowSum);
  }
  return maxSum;
};`,
    language: 'javascript',
    inputs: [
      { key: 'array', label: 'Array', type: 'array-num', default: [2, 1, 5, 1, 3, 2] },
      { key: 'k', label: 'Window Size', type: 'number', default: 3, min: 1, max: 10 },
    ],
    build(params = {}) {
      const array = Array.isArray(params.array) ? params.array : [2, 1, 5, 1, 3, 2];
      const k = Math.max(1, Math.min(Math.floor(params.k || 3), array.length - 1));
      return compiler.compile(slidingWindowAlgorithm, { array, k });
    },
  },
  {
    id: 'two-sum',
    label: 'Two Sum',
    icon: '➕',
    code: `const algorithm = (input, tracer) => {
  const { array, target } = input;
  let left = 0, right = array.length - 1;
  while (left < right) {
    const sum = array[left] + array[right];
    if (sum === target) return [left, right];
    sum < target ? left++ : right--;
  }
  return [];
};`,
    language: 'javascript',
    inputs: [
      { key: 'array', label: 'Array (sorted)', type: 'array-num', default: [1, 2, 3, 5, 7, 11] },
      { key: 'target', label: 'Target Sum', type: 'number', default: 9 },
    ],
    build(params = {}) {
      const array = Array.isArray(params.array) ? params.array : [1, 2, 3, 5, 7, 11];
      const target = Number(params.target) || 9;
      return compiler.compile(twoSumAlgorithm, { array, target });
    },
  },
  {
    id: 'prefix-sum',
    label: 'Prefix Sum',
    icon: '∑',
    code: `const algorithm = (input, tracer) => {
  const { array, queries } = input;
  const prefix = [0];
  for (let i = 0; i < array.length; i++) {
    prefix.push(prefix[i] + array[i]);
  }
  const results = [];
  for (let [left, right] of queries) {
    results.push(prefix[right + 1] - prefix[left]);
  }
  return results;
};`,
    language: 'javascript',
    inputs: [
      { key: 'array', label: 'Array', type: 'array-num', default: [1, 2, 3, 4, 5] },
      { key: 'queries', label: 'Queries [left,right]', type: 'text', default: '[[0,2],[1,3]]' },
    ],
    build(params = {}) {
      const array = Array.isArray(params.array) ? params.array : [1, 2, 3, 4, 5];
      let queries = [[0, 2], [1, 3]];
      if (typeof params.queries === 'string') {
        try {
          queries = JSON.parse(params.queries);
        } catch {
          queries = [[0, 2], [1, 3]];
        }
      }
      return compiler.compile(prefixSumAlgorithm, { array, queries });
    },
  },
  {
    id: 'binary-search',
    label: 'Binary Search',
    icon: '🔍',
    code: `const algorithm = (input, tracer) => {
  const { array, target } = input;
  let left = 0, right = array.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (array[mid] === target) return mid;
    array[mid] < target ? left = mid + 1 : right = mid - 1;
  }
  return -1;
};`,
    language: 'javascript',
    inputs: [
      { key: 'array', label: 'Array (sorted)', type: 'array-num', default: [1, 3, 5, 7, 9, 11, 13] },
      { key: 'target', label: 'Target', type: 'number', default: 7 },
    ],
    build(params = {}) {
      const array = Array.isArray(params.array) ? params.array : [1, 3, 5, 7, 9, 11, 13];
      const target = Number(params.target) || 7;
      return compiler.compile(binarySearchAlgorithm, { array, target });
    },
  },
];

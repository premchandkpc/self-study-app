import { AlgorithmCompiler } from '../../../../core/compiler/AlgorithmCompiler';

const compiler = new AlgorithmCompiler();

const twoSumHashAlgorithm = (input, tracer) => {
  const { nums, target } = input;
  const map = {};

  tracer.step('Initialize', `Find pair summing to ${target}`, input);

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    tracer.step('Check', `Need ${complement} to make ${target} with ${nums[i]}`,
      { nums, target, i, map: { ...map } });

    if (complement in map) {
      tracer.found([map[complement], i], { state: { nums, target, result: [map[complement], i] } });
      return [map[complement], i];
    }

    map[nums[i]] = i;
  }

  return [];
};

const lruCacheAlgorithm = (input, tracer) => {
  const { operations } = input;
  const cache = {};
  const order = [];
  const capacity = 2;

  tracer.step('Initialize', `LRU Cache (capacity=${capacity})`, input);

  for (let [op, key, value] of operations) {
    if (op === 'put') {
      if (key in cache) {
        order.splice(order.indexOf(key), 1);
      } else if (order.length >= capacity) {
        const removed = order.shift();
        delete cache[removed];
        tracer.step('Evict', `Removed LRU key: ${removed}`,
          { cache: { ...cache }, order: [...order] });
      }
      cache[key] = value;
      order.push(key);
      tracer.step('Put', `Set ${key}=${value}`,
        { cache: { ...cache }, order: [...order] });
    } else if (op === 'get') {
      const result = cache[key] || -1;
      if (key in cache) {
        order.splice(order.indexOf(key), 1);
        order.push(key);
      }
      tracer.step('Get', `Retrieve ${key} = ${result}`,
        { cache: { ...cache }, order: [...order], result });
    }
  }

  return cache;
};

const containsDupAlgorithm = (input, tracer) => {
  const { nums, k } = input;
  const window = new Set();

  tracer.step('Initialize', `Check for duplicates within distance ${k}`, input);

  for (let i = 0; i < nums.length; i++) {
    if (i > k) {
      window.delete(nums[i - k - 1]);
    }

    if (window.has(nums[i])) {
      tracer.found(true, { state: { nums, k, index: i, isDuplicate: true } });
      return true;
    }

    window.add(nums[i]);
    tracer.step('Add', `Added ${nums[i]} to window`,
      { nums, k, window: Array.from(window), index: i });
  }

  return false;
};

export const SCENARIOS = [
  {
    id: 'twosum-hash',
    label: 'Two Sum (Hash)',
    icon: '➕',
    code: `const algorithm = (input, tracer) => {
  const { nums, target } = input;
  const map = {};
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (complement in map) return [map[complement], i];
    map[nums[i]] = i;
  }
  return [];
};`,
    language: 'javascript',
    inputs: [
      { key: 'nums', label: 'Numbers', type: 'array-num', default: [2, 7, 11, 15] },
      { key: 'target', label: 'Target', type: 'number', default: 9 },
    ],
    build(params = {}) {
      const nums = Array.isArray(params.nums) ? params.nums : [2, 7, 11, 15];
      const target = Number(params.target) || 9;
      return compiler.compile(twoSumHashAlgorithm, { nums, target });
    },
  },
  {
    id: 'lru-cache',
    label: 'LRU Cache',
    icon: '💾',
    code: `const algorithm = (input, tracer) => {
  const { operations } = input;
  const cache = {}, order = [];
  const capacity = 2;
  for (let [op, key, value] of operations) {
    if (op === 'put') {
      if (!(key in cache) && order.length >= capacity) {
        delete cache[order.shift()];
      }
      cache[key] = value;
      order.push(key);
    }
  }
  return cache;
};`,
    language: 'javascript',
    inputs: [
      { key: 'operations', label: 'Operations', type: 'text', default: '[["put",1,1],["put",2,2],["get",1],["put",3,3]]' },
    ],
    build(params = {}) {
      let operations = [["put",1,1],["put",2,2],["get",1],["put",3,3]];
      if (typeof params.operations === 'string') {
        try {
          operations = JSON.parse(params.operations);
        } catch { /* intentionally empty */ }
      }
      return compiler.compile(lruCacheAlgorithm, { operations });
    },
  },
  {
    id: 'contains-dup-k',
    label: 'Contains Duplicate (K Distance)',
    icon: '🔀',
    code: `const algorithm = (input, tracer) => {
  const { nums, k } = input;
  const window = new Set();
  for (let i = 0; i < nums.length; i++) {
    if (i > k) window.delete(nums[i - k - 1]);
    if (window.has(nums[i])) return true;
    window.add(nums[i]);
  }
  return false;
};`,
    language: 'javascript',
    inputs: [
      { key: 'nums', label: 'Numbers', type: 'array-num', default: [99, 99] },
      { key: 'k', label: 'Max Distance', type: 'number', default: 2, min: 1, max: 10 },
    ],
    build(params = {}) {
      const nums = Array.isArray(params.nums) ? params.nums : [99, 99];
      const k = Math.max(1, Math.floor(params.k || 2));
      return compiler.compile(containsDupAlgorithm, { nums, k });
    },
  },
];

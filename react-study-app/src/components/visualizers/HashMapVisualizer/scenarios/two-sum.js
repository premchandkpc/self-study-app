import { snap } from './shared';

const NUMS = [2, 7, 11, 15];
const TARGET = 9;
const MAP_SIZE = 7;

function buildTwoSumSteps() {
  const steps = [];
  const buckets = Array.from({ length: MAP_SIZE }, () => []);
  const map = {};

  const state = {
    nums: [...NUMS],
    target: TARGET,
    buckets: buckets.map((b) => [...b]),
    activeBucket: -1,
    activeIndex: -1,
    resultIndices: [],
    vars: { i: 0, num: NUMS[0], target: TARGET, complement: TARGET - NUMS[0], map: {} },
    metrics: { lookups: 0, found: 0 },
  };

  snap(steps, state, `Two Sum: find indices where nums[i] + nums[j] == ${TARGET}. Use HashMap for O(n).`, 1);

  for (let i = 0; i < NUMS.length; i++) {
    const num = NUMS[i];
    const complement = TARGET - num;

    state.activeIndex = i;
    state.vars = { i, num, target: TARGET, complement, map: { ...map } };
    state.metrics.lookups++;
    snap(steps, state, `i=${i}, num=${num}. Need complement ${TARGET}-${num}=${complement}. Check map.`, 3);

    if (map[complement] !== undefined) {
      state.resultIndices = [map[complement], i];
      state.vars = { i, num, target: TARGET, complement, map: { ...map } };
      state.metrics.found = 1;
      snap(steps, state, `Found! map[${complement}]=${map[complement]}. Result: [${map[complement]}, ${i}].`, 5);
      break;
    }

    map[num] = i;
    // Store in bucket (hash-based visualization)
    const bucket = num % MAP_SIZE;
    buckets[bucket].push({ key: String(num), value: i });
    state.buckets = buckets.map((b) => [...b]);
    state.activeBucket = bucket;
    state.vars = { i, num, target: TARGET, complement, map: { ...map } };
    snap(steps, state, `Complement not found. Store map[${num}]=${i}. Next.`, 6);
  }

  if (!state.resultIndices.length) {
    state.vars = { i: NUMS.length, num: -1, target: TARGET, complement: -1, map: { ...map } };
    snap(steps, state, 'No pair found.', 8);
  }

  return steps;
}

const TWO_SUM_CODE = [
  'function twoSum(nums, target) {',
  '  const map = {};',
  '  for (let i = 0; i < nums.length; i++) {',
  '    const complement = target - nums[i];',
  '    if (map[complement] !== undefined)',
  '      return [map[complement], i];',
  '    map[nums[i]] = i;',
  '  }',
  '}',
];

export default {
  id: 'two-sum',
  label: 'Two Sum',
  icon: '➕',
  build: buildTwoSumSteps,
  code: TWO_SUM_CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'lookups', label: 'Lookups', max: 10, color: 'var(--node-active)' },
    { key: 'found',   label: 'Found',   max: 1,  color: 'var(--node-visited)' },
  ],
};

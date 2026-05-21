import { AlgorithmCompiler } from '../../../core/compiler/AlgorithmCompiler.js';

// Two Pointers algorithm scenarios
// Generated from algorithm definitions using AlgorithmCompiler

const compiler = new AlgorithmCompiler();

// Algorithm: 2Sum in sorted array
const twoSumAlgorithm = (input, tracer) => {
  const { array, target } = input;
  let left = 0;
  let right = array.length - 1;

  tracer.step('Initialize', `left=0, right=${array.length - 1}, target=${target}`, input, {
    opsLog: [{ msg: 'Set up two pointers at both ends', type: 'init' }],
  });

  while (left < right) {
    const sum = array[left] + array[right];

    tracer.step(
      'Calculate sum',
      `arr[${left}] + arr[${right}] = ${sum}`,
      { array, target, left, right },
      {
        opsLog: [{ msg: `${array[left]} + ${array[right]} = ${sum}`, type: 'compare' }],
      }
    );

    if (sum === target) {
      tracer.found([left, right], { state: { array, target, left, right } });
      return [left, right];
    }

    if (sum < target) {
      left++;
      tracer.move('left', left, { state: { array, target, left, right } });
    } else {
      right--;
      tracer.move('right', right, { state: { array, target, left, right } });
    }
  }

  return [];
};

// Algorithm: Valid palindrome
const palindromeAlgorithm = (input, tracer) => {
  const { string } = input;
  let left = 0;
  let right = string.length - 1;

  tracer.step('Initialize', `Check if "${string}" is palindrome`, input, {
    opsLog: [{ msg: 'Start from both ends', type: 'init' }],
  });

  while (left < right) {
    const match = string[left] === string[right];
    tracer.step(
      `Compare ${left + 1}`,
      `s[${left}]='${string[left]}' vs s[${right}]='${string[right]}'`,
      { string, left, right },
      {
        opsLog: [{ msg: `'${string[left]}' === '${string[right]}' = ${match}`, type: 'compare' }],
      }
    );

    if (!match) return false;

    left++;
    right--;
  }

  tracer.found(true, { state: { string, left, right } });
  return true;
};

export const SCENARIOS = [
  {
    id: 'two-sum',
    label: '2Sum - Sorted Array',
    icon: '🔢',
    category: 'Two Pointers',
    collectionType: 'array',
    code: [
      'function twoSum(arr, target) {',
      '  let left = 0, right = arr.length - 1;',
      '  while (left < right) {',
      '    const sum = arr[left] + arr[right];',
      '    if (sum === target) return [left, right];',
      '    if (sum < target) left++;',
      '    else right--;',
      '  }',
      '  return [];',
      '}',
    ],
    language: 'javascript',
    build() {
      const testInput = { array: [1, 2, 3, 5, 7, 11], target: 9 };
      return compiler.compile(twoSumAlgorithm, testInput);
    },
  },
  {
    id: 'valid-palindrome',
    label: 'Valid Palindrome',
    icon: '📝',
    category: 'Two Pointers',
    collectionType: 'string',
    code: [
      'function isPalindrome(s) {',
      '  let left = 0, right = s.length - 1;',
      '  while (left < right) {',
      '    if (s[left] !== s[right]) return false;',
      '    left++;',
      '    right--;',
      '  }',
      '  return true;',
      '}',
    ],
    language: 'javascript',
    build() {
      const testInput = { string: 'racecar' };
      return compiler.compile(palindromeAlgorithm, testInput);
    },
  },
];

// DSA Example Code Library
// Format: { code, explanation, defaultInput, testCases: [{input, expected}, ...] }

export const EXAMPLES = {
  'two-pointer-sum': {
    topic: 'Arrays',
    title: 'Two Sum (Sorted Array)',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array, target } = input;
  let left = 0, right = array.length - 1;

  tracer.step('Initialize', \`Find pair summing to \${target}\`, { array, target, left, right });

  while (left < right) {
    const sum = array[left] + array[right];
    tracer.step('Check', \`arr[\${left}] + arr[\${right}] = \${sum}\`,
      { array, target, left, right, sum });

    if (sum === target) {
      tracer.found([left, right], { state: { array, target, left, right } });
      return [left, right];
    }

    sum < target ? left++ : right--;
  }

  return [];
};`,
    explanation: 'Two pointers approach for finding a pair with a given sum in a sorted array. Time: O(n), Space: O(1).',
    defaultInput: { array: [1, 2, 3, 5, 7, 11], target: 9 },
    testCases: [
      { input: { array: [1, 2, 3, 5], target: 8 }, expected: [2, 3] },
      { input: { array: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
    ],
  },

  'sliding-window-max': {
    topic: 'Arrays',
    title: 'Sliding Window Max Sum',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array, k } = input;
  let windowSum = 0;

  tracer.step('Initialize', \`Max sum window of size \${k}\`, { array, k });

  for (let i = 0; i < k; i++) {
    windowSum += array[i];
  }

  let maxSum = windowSum;
  tracer.step('Initial', \`First window sum = \${maxSum}\`, { array, k, windowSum, maxSum, left: 0, right: k - 1 });

  for (let i = k; i < array.length; i++) {
    windowSum += array[i] - array[i - k];
    maxSum = Math.max(maxSum, windowSum);
    tracer.step('Slide', \`Window [\${i - k + 1}..\${i}] sum = \${windowSum}\`,
      { array, k, windowSum, maxSum, left: i - k + 1, right: i });
  }

  tracer.found(maxSum, { state: { array, k, result: maxSum } });
  return maxSum;
};`,
    explanation: 'Sliding window technique to find maximum sum of any contiguous subarray of size k. Time: O(n), Space: O(1).',
    defaultInput: { array: [2, 1, 5, 1, 3, 2], k: 3 },
    testCases: [
      { input: { array: [1, 3, -1, -3, 5, 3], k: 3 }, expected: 7 },
    ],
  },

  'binary-search': {
    topic: 'Arrays',
    title: 'Binary Search',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array, target } = input;
  let left = 0, right = array.length - 1;

  tracer.step('Start', \`Search for \${target}\`, { array, target, left, right });

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    tracer.step('Check', \`arr[\${mid}] = \${array[mid]}\`,
      { array, target, left, mid, right });

    if (array[mid] === target) {
      tracer.found(mid, { state: { array, target, found: mid } });
      return mid;
    }

    array[mid] < target ? left = mid + 1 : right = mid - 1;
  }

  tracer.found(-1, { state: { array, target, found: -1 } });
  return -1;
};`,
    explanation: 'Binary search on a sorted array. Time: O(log n), Space: O(1).',
    defaultInput: { array: [1, 3, 5, 7, 9, 11, 13], target: 7 },
    testCases: [
      { input: { array: [1, 3, 5, 7], target: 5 }, expected: 2 },
      { input: { array: [1, 3, 5, 7], target: 6 }, expected: -1 },
    ],
  },

  'palindrome-check': {
    topic: 'Strings',
    title: 'Valid Palindrome',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { string } = input;
  let left = 0, right = string.length - 1;

  tracer.step('Start', \`Check if "\${string}" is palindrome\`, { string, left, right });

  while (left < right) {
    tracer.step('Compare', \`s[\${left}]='\${string[left]}' vs s[\${right}]='\${string[right]}'\`,
      { string, left, right });

    if (string[left] !== string[right]) {
      tracer.found(false, { state: { string, left, right, isPalindrome: false } });
      return false;
    }

    left++;
    right--;
  }

  tracer.found(true, { state: { string, left, right, isPalindrome: true } });
  return true;
};`,
    explanation: 'Check if a string is a palindrome using two pointers. Time: O(n), Space: O(1).',
    defaultInput: { string: 'racecar' },
    testCases: [
      { input: { string: 'hello' }, expected: false },
      { input: { string: 'madam' }, expected: true },
    ],
  },

  'merge-sorted-lists': {
    topic: 'Linked Lists',
    title: 'Merge Sorted Lists',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { list1, list2 } = input;

  tracer.step('Initialize', \`Merge [\${list1}] and [\${list2}]\`, { list1, list2 });

  let i = 0, j = 0;
  const result = [];

  while (i < list1.length && j < list2.length) {
    if (list1[i] <= list2[j]) {
      result.push(list1[i]);
      tracer.step('Add from List1', \`Added \${list1[i]}\`,
        { list1, list2, result, i, j });
      i++;
    } else {
      result.push(list2[j]);
      tracer.step('Add from List2', \`Added \${list2[j]}\`,
        { list1, list2, result, i, j });
      j++;
    }
  }

  while (i < list1.length) result.push(list1[i++]);
  while (j < list2.length) result.push(list2[j++]);

  tracer.found(result, { state: { list1, list2, result } });
  return result;
};`,
    explanation: 'Merge two sorted lists. Time: O(n+m), Space: O(n+m).',
    defaultInput: { list1: [1, 3, 5], list2: [2, 4, 6] },
    testCases: [
      { input: { list1: [1, 2, 3], list2: [1, 2, 3] }, expected: [1, 1, 2, 2, 3, 3] },
    ],
  },
};

export function getExamplesByTopic(topic) {
  return Object.entries(EXAMPLES)
    .filter(([, ex]) => ex.topic === topic)
    .map(([id, ex]) => ({ id, ...ex }));
}

export function getExample(id) {
  return EXAMPLES[id] ? { id, ...EXAMPLES[id] } : null;
}

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
    topic: 'Arrays',
    title: 'Merge Sorted Lists',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array: arr1, arr2 } = input;

  tracer.step('Initialize', \`Merge [\${arr1}] and [\${arr2}]\`, { array: arr1, arr2, result: [], i: 0, j: 0, left: 0, right: 0 });

  let i = 0, j = 0;
  const result = [];

  while (i < arr1.length && j < arr2.length) {
    if (arr1[i] <= arr2[j]) {
      result.push(arr1[i]);
      tracer.step('Add from arr1', \`Added \${arr1[i]}\`,
        { array: [...result], arr2, result, i, j, left: i, right: j });
      i++;
    } else {
      result.push(arr2[j]);
      tracer.step('Add from arr2', \`Added \${arr2[j]}\`,
        { array: [...result], arr2, result, i, j, left: i, right: j });
      j++;
    }
  }

  while (i < arr1.length) result.push(arr1[i++]);
  while (j < arr2.length) result.push(arr2[j++]);

  tracer.found(result, { state: { array: result } });
  return result;
};`,
    explanation: 'Merge two sorted arrays into one sorted array. Time: O(n+m), Space: O(n+m).',
    defaultInput: { array: [1, 3, 5], arr2: [2, 4, 6] },
    testCases: [
      { input: { array: [1, 2, 3], arr2: [1, 2, 3] }, expected: [1, 1, 2, 2, 3, 3] },
    ],
  },

  'remove-duplicates': {
    topic: 'Arrays',
    title: 'Remove Duplicates from Sorted Array',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  if (array.length === 0) return 0;

  let k = 1;
  tracer.step('Start', 'Mark first element', { array, k, left: 0, right: 1 });

  for (let i = 1; i < array.length; i++) {
    if (array[i] !== array[i - 1]) {
      array[k] = array[i];
      tracer.step('Found unique', \`Unique value \${array[i]} at position \${k}\`, { array, k, left: i, right: k });
      k++;
    }
  }

  return k;
};`,
    explanation: 'Remove duplicates in-place from sorted array. Time: O(n), Space: O(1).',
    defaultInput: { array: [1, 1, 2, 2, 3, 3, 4] },
    testCases: [{ input: { array: [1, 1, 2] }, expected: 2 }],
  },

  'contains-duplicate': {
    topic: 'Hash Tables',
    title: 'Contains Duplicate',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  const seen = new Set();

  tracer.step('Start', 'Check for duplicates', { array, nums: array, k: 0 });

  for (let i = 0; i < array.length; i++) {
    if (seen.has(array[i])) {
      tracer.found(true, { state: { array, found: true } });
      return true;
    }
    seen.add(array[i]);
    tracer.step('Add', \`Added \${array[i]} to set\`, { array, nums: array, k: i + 1 });
  }

  return false;
};`,
    explanation: 'Check if array contains duplicates. Time: O(n), Space: O(n).',
    defaultInput: { array: [1, 2, 3, 1] },
    testCases: [{ input: { array: [1, 2, 3] }, expected: false }],
  },

  'max-subarray': {
    topic: 'DP/Greedy',
    title: 'Maximum Subarray (Kadane)',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  let maxSum = array[0], currentSum = array[0];

  tracer.step('Initialize', \`Start with \${array[0]}\`, { array, maxSum, currentSum, i: 0 });

  for (let i = 1; i < array.length; i++) {
    currentSum = Math.max(array[i], currentSum + array[i]);
    maxSum = Math.max(maxSum, currentSum);
    tracer.step('Update', \`Current sum: \${currentSum}\`, { array, maxSum, currentSum, i });
  }

  return maxSum;
};`,
    explanation: 'Find max sum of contiguous subarray. Time: O(n), Space: O(1).',
    defaultInput: { array: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
    testCases: [{ input: { array: [-2, -1] }, expected: -1 }],
  },

  'best-time-buy-sell': {
    topic: 'Arrays',
    title: 'Best Time to Buy and Sell Stock',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { prices } = input;
  let minPrice = prices[0], maxProfit = 0;

  tracer.step('Start', \`Min price: \${minPrice}\`, { prices, minPrice, maxProfit, i: 0 });

  for (let i = 1; i < prices.length; i++) {
    const profit = prices[i] - minPrice;
    maxProfit = Math.max(maxProfit, profit);
    minPrice = Math.min(minPrice, prices[i]);
    tracer.step('Check', \`Price \${prices[i]}, Profit \${profit}\`, { prices, minPrice, maxProfit, i });
  }

  return maxProfit;
};`,
    explanation: 'Find max profit from buying and selling once. Time: O(n), Space: O(1).',
    defaultInput: { prices: [7, 1, 5, 3, 6, 4] },
    testCases: [{ input: { prices: [7, 6, 4, 3, 1] }, expected: 0 }],
  },

  'rotate-array': {
    topic: 'Arrays',
    title: 'Rotate Array',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array: arr, k: steps } = input;
  const n = arr.length;
  const k = steps % n;

  tracer.step('Start', \`Rotate by \${k} steps\`, { array: arr, k });

  const result = [...arr.slice(-k), ...arr.slice(0, n - k)];
  tracer.step('Rotated', \`Array rotated\`, { array: result });

  return result;
};`,
    explanation: 'Rotate array right by k steps. Time: O(n), Space: O(n).',
    defaultInput: { array: [1, 2, 3, 4, 5], k: 2 },
    testCases: [{ input: { array: [1, 2, 3], k: 1 }, expected: [3, 1, 2] }],
  },

  'reverse-string': {
    topic: 'Strings',
    title: 'Reverse String',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { string } = input;
  const chars = string.split('');

  tracer.step('Start', 'Reverse string', { string, text: string, left: 0, right: chars.length - 1 });

  let left = 0, right = chars.length - 1;
  while (left < right) {
    [chars[left], chars[right]] = [chars[right], chars[left]];
    tracer.step('Swap', \`Swapped \${chars[right]} and \${chars[left]}\`, { string: chars.join(''), text: chars.join(''), left, right });
    left++;
    right--;
  }

  return chars.join('');
};`,
    explanation: 'Reverse a string. Time: O(n), Space: O(n).',
    defaultInput: { string: 'hello' },
    testCases: [{ input: { string: 'a' }, expected: 'a' }],
  },

  'valid-palindrome': {
    topic: 'Strings',
    title: 'Valid Palindrome II',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { string } = input;
  let left = 0, right = string.length - 1;

  tracer.step('Start', 'Check palindrome', { string, text: string, left, right });

  while (left < right) {
    if (string[left] !== string[right]) {
      tracer.found(false, { state: { string, isPalindrome: false } });
      return false;
    }
    tracer.step('Match', \`\${string[left]} == \${string[right]}\`, { string, text: string, left, right });
    left++;
    right--;
  }

  return true;
};`,
    explanation: 'Check if string is palindrome. Time: O(n), Space: O(1).',
    defaultInput: { string: 'racecar' },
    testCases: [{ input: { string: 'abc' }, expected: false }],
  },

  'longest-substring': {
    topic: 'Strings/Hash',
    title: 'Longest Substring Without Repeating Characters',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { string } = input;
  const charIndex = {};
  let maxLen = 0, left = 0;

  tracer.step('Start', 'Find longest substring', { string, text: string, windowStart: 0, windowEnd: 0 });

  for (let right = 0; right < string.length; right++) {
    if (charIndex[string[right]] !== undefined && charIndex[string[right]] >= left) {
      left = charIndex[string[right]] + 1;
    }
    charIndex[string[right]] = right;
    maxLen = Math.max(maxLen, right - left + 1);
    tracer.step('Window', \`Substring: \${string.slice(left, right + 1)}\`, { string, text: string, windowStart: left, windowEnd: right });
  }

  return maxLen;
};`,
    explanation: 'Find length of longest substring without repeating chars. Time: O(n), Space: O(min(m,n)).',
    defaultInput: { string: 'abcabcbb' },
    testCases: [{ input: { string: 'au' }, expected: 2 }],
  },

  'group-anagrams': {
    topic: 'Hash Tables',
    title: 'Group Anagrams',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { words } = input;
  const map = {};

  tracer.step('Start', 'Group anagrams', { nums: words, k: 0 });

  for (let i = 0; i < words.length; i++) {
    const sorted = words[i].split('').sort().join('');
    if (!map[sorted]) map[sorted] = [];
    map[sorted].push(words[i]);
    tracer.step('Add', \`Added \${words[i]}\`, { nums: words, k: i + 1 });
  }

  return Object.values(map);
};`,
    explanation: 'Group words that are anagrams. Time: O(n*k log k), Space: O(n).',
    defaultInput: { words: ['eat', 'tea', 'tan', 'ate', 'nat'] },
    testCases: [{ input: { words: ['a'] }, expected: [['a']] }],
  },

  'merge-intervals': {
    topic: 'Arrays',
    title: 'Merge Intervals',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { intervals } = input;
  if (intervals.length === 0) return [];

  intervals.sort((a, b) => a[0] - b[0]);
  const result = [intervals[0]];

  tracer.step('Sort', 'Intervals sorted', { nums: intervals });

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] <= result[result.length - 1][1]) {
      result[result.length - 1][1] = Math.max(result[result.length - 1][1], intervals[i][1]);
      tracer.step('Merge', \`Merged intervals\`, { nums: intervals });
    } else {
      result.push(intervals[i]);
      tracer.step('Add', \`Added new interval\`, { nums: intervals });
    }
  }

  return result;
};`,
    explanation: 'Merge overlapping intervals. Time: O(n log n), Space: O(n).',
    defaultInput: { intervals: [[1, 3], [2, 6], [8, 10], [15, 18]] },
    testCases: [{ input: { intervals: [[1, 4], [4, 5]] }, expected: [[1, 5]] }],
  },

  'product-array': {
    topic: 'Arrays',
    title: 'Product of Array Except Self',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  const n = array.length;
  const output = new Array(n).fill(1);

  tracer.step('Initialize', 'Output array created', { array, nums: array, k: 0 });

  for (let i = 1; i < n; i++) {
    output[i] = output[i - 1] * array[i - 1];
    tracer.step('Left pass', \`output[\${i}] = \${output[i]}\`, { array, nums: output, k: i });
  }

  let right = 1;
  for (let i = n - 1; i >= 0; i--) {
    output[i] *= right;
    right *= array[i];
  }

  return output;
};`,
    explanation: 'Compute product of array except self. Time: O(n), Space: O(1) excluding output.',
    defaultInput: { array: [1, 2, 3, 4] },
    testCases: [{ input: { array: [-1, 1, 0, -3, 3] }, expected: [0, 0, 9, 0, 0] }],
  },

  'first-missing-positive': {
    topic: 'Arrays',
    title: 'First Missing Positive',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  const n = array.length;

  tracer.step('Start', 'Find first missing positive', { array, nums: array, k: 1 });

  for (let i = 0; i < n; i++) {
    while (array[i] > 0 && array[i] <= n && array[array[i] - 1] !== array[i]) {
      [array[array[i] - 1], array[i]] = [array[i], array[array[i] - 1]];
      tracer.step('Swap', 'Rearranging', { array, nums: array });
    }
  }

  for (let i = 0; i < n; i++) {
    if (array[i] !== i + 1) {
      return i + 1;
    }
  }

  return n + 1;
};`,
    explanation: 'Find smallest missing positive integer. Time: O(n), Space: O(1).',
    defaultInput: { array: [3, 4, -1, 1] },
    testCases: [{ input: { array: [1, 2, 0] }, expected: 3 }],
  },

  'interval-scheduling': {
    topic: 'Greedy',
    title: 'Interval Scheduling Maximization',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { intervals } = input;
  intervals.sort((a, b) => a[1] - b[1]);

  const result = [intervals[0]];
  tracer.step('Start', 'Sort by end time', { nums: intervals });

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] >= result[result.length - 1][1]) {
      result.push(intervals[i]);
      tracer.step('Add', 'Non-overlapping interval added', { nums: intervals });
    }
  }

  return result;
};`,
    explanation: 'Select maximum non-overlapping intervals. Time: O(n log n), Space: O(n).',
    defaultInput: { intervals: [[1, 2], [2, 3], [3, 4], [4, 5]] },
    testCases: [{ input: { intervals: [[1, 2], [1, 2], [1, 2]] }, expected: [[1, 2]] }],
  },

  'lcs': {
    topic: 'DP',
    title: 'Longest Common Subsequence',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { str1, str2 } = input;
  const m = str1.length, n = str2.length;
  const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

  tracer.step('Initialize', 'DP table created', { string: str1, text: str2 });

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
};`,
    explanation: 'Find length of longest common subsequence. Time: O(m*n), Space: O(m*n).',
    defaultInput: { str1: 'abcde', str2: 'ace' },
    testCases: [{ input: { str1: 'abc', str2: 'abc' }, expected: 3 }],
  },

  'coin-change': {
    topic: 'DP',
    title: 'Coin Change',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { coins, amount } = input;
  const dp = Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  tracer.step('Initialize', \`Find min coins for \${amount}\`, { array: coins, dp });

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
    tracer.step('Update', \`dp[\${i}] = \${dp[i]}\`, { array: coins, dp });
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
};`,
    explanation: 'Minimum coins needed to make amount. Time: O(n*m), Space: O(n).',
    defaultInput: { coins: [1, 2, 5], amount: 5 },
    testCases: [{ input: { coins: [2], amount: 3 }, expected: -1 }],
  },

  'word-break': {
    topic: 'DP',
    title: 'Word Break',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { string, words } = input;
  const wordSet = new Set(words);
  const dp = Array(string.length + 1).fill(false);
  dp[0] = true;

  tracer.step('Start', 'Check if word break possible', { string, text: string });

  for (let i = 1; i <= string.length; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && wordSet.has(string.slice(j, i))) {
        dp[i] = true;
        tracer.step('Found', \`Word: \${string.slice(j, i)}\`, { string, text: string });
        break;
      }
    }
  }

  return dp[string.length];
};`,
    explanation: 'Determine if string can be segmented into words. Time: O(n^2), Space: O(n).',
    defaultInput: { string: 'leetcode', words: ['leet', 'code'] },
    testCases: [{ input: { string: 'catsanddogs', words: ['cat', 'cats'] }, expected: false }],
  },

  'house-robber': {
    topic: 'DP',
    title: 'House Robber',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { nums } = input;
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];

  const dp = [nums[0], Math.max(nums[0], nums[1])];
  tracer.step('Initialize', 'DP initialized', { array: nums, dp });

  for (let i = 2; i < nums.length; i++) {
    dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i]);
    tracer.step('Update', \`dp[\${i}] = \${dp[i]}\`, { array: nums, dp });
  }

  return dp[nums.length - 1];
};`,
    explanation: 'Rob houses for max money without robbing adjacent. Time: O(n), Space: O(n).',
    defaultInput: { nums: [1, 2, 3, 1] },
    testCases: [{ input: { nums: [2, 7, 9, 3] }, expected: 9 }],
  },

  'climb-stairs': {
    topic: 'DP',
    title: 'Climbing Stairs',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { n } = input;
  if (n === 1) return 1;
  if (n === 2) return 2;

  let prev2 = 1, prev1 = 2;
  tracer.step('Start', 'Climb stairs', { i: 2 });

  for (let i = 3; i <= n; i++) {
    const current = prev1 + prev2;
    tracer.step('Step', \`Ways to reach step \${i}: \${current}\`, { i });
    prev2 = prev1;
    prev1 = current;
  }

  return prev1;
};`,
    explanation: 'Count ways to climb n stairs. Time: O(n), Space: O(1).',
    defaultInput: { n: 3 },
    testCases: [{ input: { n: 2 }, expected: 2 }],
  },

  'fib-sequence': {
    topic: 'Recursion/DP',
    title: 'Fibonacci Number',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { n } = input;
  if (n <= 1) return n;

  let prev = 0, curr = 1;
  tracer.step('Start', \`Calculate fib(\${n})\`, { n, prev, curr });

  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
    tracer.step('Compute', \`F(\${i}) = \${curr}\`, { n, i, prev, curr });
  }

  return curr;
};`,
    explanation: 'Calculate nth Fibonacci number. Time: O(n), Space: O(1).',
    defaultInput: { n: 6 },
    testCases: [{ input: { n: 4 }, expected: 3 }],
  },

  'min-window-substring': {
    topic: 'Strings/Sliding Window',
    title: 'Minimum Window Substring',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { string, pattern } = input;
  const patternCount = {};
  for (const char of pattern) patternCount[char] = (patternCount[char] || 0) + 1;

  let left = 0, minLen = Infinity, minStart = 0, matched = 0;
  const windowCount = {};

  tracer.step('Start', 'Find min window substring', { string, text: string, windowStart: 0, windowEnd: 0 });

  for (let right = 0; right < string.length; right++) {
    windowCount[string[right]] = (windowCount[string[right]] || 0) + 1;
    if (patternCount[string[right]] && windowCount[string[right]] <= patternCount[string[right]]) {
      matched++;
    }

    while (matched === pattern.length) {
      if (right - left + 1 < minLen) {
        minLen = right - left + 1;
        minStart = left;
      }
      windowCount[string[left]]--;
      if (patternCount[string[left]] && windowCount[string[left]] < patternCount[string[left]]) {
        matched--;
      }
      left++;
    }
  }

  return minLen === Infinity ? '' : string.slice(minStart, minStart + minLen);
};`,
    explanation: 'Find minimum window containing all chars from pattern. Time: O(n), Space: O(1).',
    defaultInput: { string: 'ADOBECODEBANC', pattern: 'ABC' },
    testCases: [{ input: { string: 'a', pattern: 'a' }, expected: 'a' }],
  },

  'three-sum': {
    topic: 'Arrays/Two Pointers',
    title: 'Three Sum',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  array.sort((a, b) => a - b);
  const result = [];

  tracer.step('Sort', 'Array sorted', { array });

  for (let i = 0; i < array.length - 2; i++) {
    if (array[i] > 0) break;
    if (i > 0 && array[i] === array[i - 1]) continue;

    let left = i + 1, right = array.length - 1;
    while (left < right) {
      const sum = array[i] + array[left] + array[right];
      if (sum === 0) {
        result.push([array[i], array[left], array[right]]);
        while (left < right && array[left] === array[left + 1]) left++;
        while (left < right && array[right] === array[right - 1]) right--;
        left++;
        right--;
      } else if (sum < 0) {
        left++;
      } else {
        right--;
      }
      tracer.step('Check', \`Sum: \${sum}\`, { array, left: i, right });
    }
  }

  return result;
};`,
    explanation: 'Find all unique triplets summing to zero. Time: O(n^2), Space: O(1).',
    defaultInput: { array: [-1, 0, 1, 2, -1, -4] },
    testCases: [{ input: { array: [0] }, expected: [] }],
  },

  'trapping-rain-water': {
    topic: 'Arrays/DP',
    title: 'Trapping Rain Water',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { heights } = input;
  if (heights.length < 3) return 0;

  const left = Array(heights.length), right = Array(heights.length);
  left[0] = heights[0];
  right[heights.length - 1] = heights[heights.length - 1];

  for (let i = 1; i < heights.length; i++) {
    left[i] = Math.max(left[i - 1], heights[i]);
  }
  for (let i = heights.length - 2; i >= 0; i--) {
    right[i] = Math.max(right[i + 1], heights[i]);
  }

  let water = 0;
  for (let i = 0; i < heights.length; i++) {
    water += Math.min(left[i], right[i]) - heights[i];
    tracer.step('Calculate', \`Water at \${i}: \${Math.min(left[i], right[i]) - heights[i]}\`, { array: heights });
  }

  return water;
};`,
    explanation: 'Calculate trapped rain water. Time: O(n), Space: O(n).',
    defaultInput: { heights: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] },
    testCases: [{ input: { heights: [4, 2, 0, 3, 2, 5] }, expected: 9 }],
  },

  'valid-parentheses': {
    topic: 'Stack',
    title: 'Valid Parentheses',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { string } = input;
  const stack = [];
  const pairs = { ')': '(', '}': '{', ']': '[' };

  tracer.step('Start', 'Validate parentheses', { string, text: string });

  for (const char of string) {
    if (char === '(' || char === '{' || char === '[') {
      stack.push(char);
      tracer.step('Push', \`Pushed \${char}\`, { string, text: string });
    } else {
      if (stack.length === 0 || stack.pop() !== pairs[char]) {
        return false;
      }
      tracer.step('Match', \`Matched \${char}\`, { string, text: string });
    }
  }

  return stack.length === 0;
};`,
    explanation: 'Validate matching parentheses. Time: O(n), Space: O(n).',
    defaultInput: { string: '()[]{}' },
    testCases: [{ input: { string: '([)]' }, expected: false }],
  },

  'daily-temperatures': {
    topic: 'Stack',
    title: 'Daily Temperatures',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { temps } = input;
  const result = new Array(temps.length).fill(0);
  const stack = [];

  tracer.step('Start', 'Find warmer days ahead', { array: temps });

  for (let i = temps.length - 1; i >= 0; i--) {
    while (stack.length > 0 && temps[stack[stack.length - 1]] <= temps[i]) {
      stack.pop();
      tracer.step('Pop', 'Remove smaller temperature', { array: temps });
    }

    if (stack.length > 0) {
      result[i] = stack[stack.length - 1] - i;
    }

    stack.push(i);
    tracer.step('Push', \`Day \${i} with temp \${temps[i]}\`, { array: temps });
  }

  return result;
};`,
    explanation: 'Find days until warmer temperature. Time: O(n), Space: O(n).',
    defaultInput: { temps: [73, 74, 75, 71, 69, 72, 76, 73] },
    testCases: [{ input: { temps: [30, 40, 50] }, expected: [1, 1, 0] }],
  },

  'min-stack': {
    topic: 'Stack',
    title: 'Min Stack',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { operations } = input;
  const stack = [];
  const minStack = [];

  tracer.step('Initialize', 'Create min stack', { nums: stack, k: 0 });

  for (const [op, val] of operations) {
    if (op === 'push') {
      stack.push(val);
      if (minStack.length === 0 || val <= minStack[minStack.length - 1]) {
        minStack.push(val);
      }
      tracer.step('Push', \`Value \${val}\`, { nums: stack });
    } else if (op === 'pop') {
      const popped = stack.pop();
      if (popped === minStack[minStack.length - 1]) {
        minStack.pop();
      }
      tracer.step('Pop', \`Removed \${popped}\`, { nums: stack });
    }
  }

  return minStack[minStack.length - 1];
};`,
    explanation: 'Stack with constant time min queries. Time: O(1), Space: O(n).',
    defaultInput: { operations: [['push', 1], ['push', 2], ['push', 0]] },
    testCases: [{ input: { operations: [['push', -2], ['pop'], ['top']] }, expected: -2 }],
  },

  'number-of-islands': {
    topic: 'Graph/DFS',
    title: 'Number of Islands',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { grid } = input;
  const rows = grid.length, cols = grid[0].length;
  let count = 0;

  const dfs = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === '0') return;
    grid[r][c] = '0';
    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
  };

  tracer.step('Start', 'Count islands', { matrix: grid });

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === '1') {
        dfs(i, j);
        count++;
        tracer.step('Island', \`Found island \${count}\`, { matrix: grid });
      }
    }
  }

  return count;
};`,
    explanation: 'Count number of islands using DFS. Time: O(m*n), Space: O(m*n).',
    defaultInput: { grid: [['1', '1', '0'], ['1', '0', '1'], ['1', '1', '1']] },
    testCases: [{ input: { grid: [['1', '0', '1']] }, expected: 2 }],
  },

  'course-schedule': {
    topic: 'Graph/Topological Sort',
    title: 'Course Schedule',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { n, prerequisites } = input;
  const adjList = Array.from({ length: n }, () => []);
  const inDegree = new Array(n).fill(0);

  tracer.step('Build graph', 'Create adjacency list', { i: 0 });

  for (const [course, prereq] of prerequisites) {
    adjList[prereq].push(course);
    inDegree[course]++;
  }

  const queue = [];
  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  let count = 0;
  while (queue.length > 0) {
    const course = queue.shift();
    count++;
    tracer.step('Process', \`Course \${course}\`, { i: count });

    for (const neighbor of adjList[course]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return count === n;
};`,
    explanation: 'Determine if all courses can be completed. Time: O(V+E), Space: O(V+E).',
    defaultInput: { n: 2, prerequisites: [[1, 0]] },
    testCases: [{ input: { n: 2, prerequisites: [[1, 0], [0, 1]] }, expected: false }],
  },

  'pacific-atlantic': {
    topic: 'Graph/DFS',
    title: 'Pacific Atlantic Water Flow',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { heights } = input;
  const rows = heights.length, cols = heights[0].length;
  const pacific = Array.from({ length: rows }, () => Array(cols).fill(false));
  const atlantic = Array.from({ length: rows }, () => Array(cols).fill(false));

  const dfs = (r, c, visited, prevHeight) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || visited[r][c] || heights[r][c] < prevHeight) return;
    visited[r][c] = true;
    tracer.step('Visit', \`Height \${heights[r][c]}\`, { matrix: heights });
    dfs(r + 1, c, visited, heights[r][c]);
    dfs(r - 1, c, visited, heights[r][c]);
    dfs(r, c + 1, visited, heights[r][c]);
    dfs(r, c - 1, visited, heights[r][c]);
  };

  tracer.step('Start', 'Find water flow', { matrix: heights });

  for (let r = 0; r < rows; r++) {
    dfs(r, 0, pacific, 0);
    dfs(r, cols - 1, atlantic, 0);
  }

  for (let c = 0; c < cols; c++) {
    dfs(0, c, pacific, 0);
    dfs(rows - 1, c, atlantic, 0);
  }

  const result = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (pacific[r][c] && atlantic[r][c]) result.push([r, c]);
    }
  }

  return result;
};`,
    explanation: 'Find cells from which water flows to both oceans. Time: O(m*n), Space: O(m*n).',
    defaultInput: { heights: [[4, 2, 7], [7, 4, 8], [8, 5, 2]] },
    testCases: [{ input: { heights: [[1]] }, expected: [[0, 0]] }],
  },

  'surrounded-regions': {
    topic: 'Graph/DFS',
    title: 'Surrounded Regions',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { board } = input;
  const rows = board.length, cols = board[0].length;

  const dfs = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || board[r][c] !== 'O') return;
    board[r][c] = 'T';
    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
  };

  tracer.step('Start', 'Find surrounded Os', { matrix: board });

  for (let r = 0; r < rows; r++) {
    dfs(r, 0);
    dfs(r, cols - 1);
  }

  for (let c = 0; c < cols; c++) {
    dfs(0, c);
    dfs(rows - 1, c);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] === 'T') {
        board[r][c] = 'O';
      } else {
        board[r][c] = 'X';
      }
    }
  }

  return board;
};`,
    explanation: 'Replace surrounded Os with Xs. Time: O(m*n), Space: O(m*n).',
    defaultInput: { board: [['X', 'X', 'X'], ['X', 'O', 'X'], ['X', 'X', 'X']] },
    testCases: [{ input: { board: [['X', 'O', 'X']] }, expected: [['X', 'O', 'X']] }],
  },

  'clone-graph': {
    topic: 'Graph',
    title: 'Clone Graph',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { nodes } = input;
  if (!nodes || nodes.length === 0) return null;

  const map = new Map();
  const queue = [nodes[0]];
  const cloneNode = { val: nodes[0].val, neighbors: [] };
  map.set(nodes[0].val, cloneNode);

  tracer.step('Start', 'Clone graph', { nodeStates: nodes });

  while (queue.length > 0) {
    const node = queue.shift();
    tracer.step('Process', \`Node \${node.val}\`, { nodeStates: nodes });

    for (const neighbor of node.neighbors) {
      if (!map.has(neighbor.val)) {
        map.set(neighbor.val, { val: neighbor.val, neighbors: [] });
      }
      map.get(node.val).neighbors.push(map.get(neighbor.val));
      if (!queue.includes(neighbor)) queue.push(neighbor);
    }
  }

  return cloneNode;
};`,
    explanation: 'Clone an undirected graph. Time: O(V+E), Space: O(V).',
    defaultInput: { nodes: [{val: 1, neighbors: []}] },
    testCases: [{ input: { nodes: [] }, expected: null }],
  },

  'word-ladder': {
    topic: 'Graph/BFS',
    title: 'Word Ladder',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { begin, end, words } = input;
  if (!words.includes(end)) return 0;

  const wordSet = new Set(words);
  const queue = [[begin, 1]];
  const visited = new Set([begin]);

  tracer.step('Start', \`Transform \${begin} to \${end}\`, { string: begin, text: end });

  while (queue.length > 0) {
    const [word, distance] = queue.shift();
    tracer.step('Level', \`Distance: \${distance}\`, { string: word });

    if (word === end) return distance;

    for (let i = 0; i < word.length; i++) {
      for (let c = 97; c <= 122; c++) {
        const newWord = word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1);
        if (wordSet.has(newWord) && !visited.has(newWord)) {
          visited.add(newWord);
          queue.push([newWord, distance + 1]);
        }
      }
    }
  }

  return 0;
};`,
    explanation: 'Find shortest word transformation sequence. Time: O(n*m*26), Space: O(n).',
    defaultInput: { begin: 'hit', end: 'cog', words: ['hot', 'dot', 'dog', 'lot', 'log', 'cog'] },
    testCases: [{ input: { begin: 'a', end: 'c', words: ['a', 'b', 'c'] }, expected: 2 }],
  },

  'alien-dictionary': {
    topic: 'Graph/Topological Sort',
    title: 'Alien Dictionary',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { words } = input;
  const graph = {}, inDegree = {};

  for (const word of words) {
    for (const char of word) {
      if (!graph[char]) graph[char] = [];
      if (!inDegree[char]) inDegree[char] = 0;
    }
  }

  tracer.step('Build', 'Create character graph', { string: words[0] });

  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i], w2 = words[i + 1];
    for (let j = 0; j < Math.min(w1.length, w2.length); j++) {
      if (w1[j] !== w2[j]) {
        if (!graph[w1[j]].includes(w2[j])) {
          graph[w1[j]].push(w2[j]);
          inDegree[w2[j]]++;
        }
        break;
      }
    }
  }

  const queue = Object.keys(inDegree).filter(c => inDegree[c] === 0);
  let result = '';

  while (queue.length > 0) {
    const char = queue.shift();
    result += char;
    for (const neighbor of graph[char]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return result;
};`,
    explanation: 'Determine order of characters in alien dictionary. Time: O(n*m), Space: O(1).',
    defaultInput: { words: ['wrt', 'wrf', 'er', 'ett', 'rftt'] },
    testCases: [{ input: { words: ['z', 'x'] }, expected: 'zx' }],
  },

  'meeting-rooms': {
    topic: 'Arrays',
    title: 'Meeting Rooms',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { intervals } = input;
  intervals.sort((a, b) => a[0] - b[0]);

  tracer.step('Sort', 'Meetings sorted by start time', { nums: intervals });

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] < intervals[i - 1][1]) {
      tracer.step('Conflict', 'Meetings overlap', { nums: intervals });
      return false;
    }
    tracer.step('Check', 'No overlap', { nums: intervals });
  }

  return true;
};`,
    explanation: 'Determine if a person can attend all meetings. Time: O(n log n), Space: O(1).',
    defaultInput: { intervals: [[0, 30], [5, 10], [15, 20]] },
    testCases: [{ input: { intervals: [[7, 10], [2, 4]] }, expected: true }],
  },

  'meeting-rooms-2': {
    topic: 'Heap/Sort',
    title: 'Meeting Rooms II',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { intervals } = input;
  if (intervals.length === 0) return 0;

  const events = [];
  for (const [start, end] of intervals) {
    events.push([start, 1]);
    events.push([end, -1]);
  }

  events.sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
  tracer.step('Sort', 'Events sorted', { nums: intervals });

  let maxRooms = 0, currentRooms = 0;
  for (const [time, type] of events) {
    currentRooms += type;
    maxRooms = Math.max(maxRooms, currentRooms);
    tracer.step('Update', \`Rooms needed: \${maxRooms}\`, { nums: intervals });
  }

  return maxRooms;
};`,
    explanation: 'Minimum conference rooms needed. Time: O(n log n), Space: O(n).',
    defaultInput: { intervals: [[0, 30], [5, 10], [15, 20]] },
    testCases: [{ input: { intervals: [[9, 10], [4, 9], [4, 17]] }, expected: 2 }],
  },

  'next-permutation': {
    topic: 'Arrays',
    title: 'Next Permutation',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  let i = array.length - 2;

  tracer.step('Start', 'Find next permutation', { array });

  while (i >= 0 && array[i] >= array[i + 1]) i--;

  if (i >= 0) {
    let j = array.length - 1;
    while (j > i && array[j] <= array[i]) j--;
    [array[i], array[j]] = [array[j], array[i]];
    tracer.step('Swap', \`Swapped \${array[j]} and \${array[i]}\`, { array });
  }

  let left = i + 1, right = array.length - 1;
  while (left < right) {
    [array[left], array[right]] = [array[right], array[left]];
    left++;
    right--;
  }

  return array;
};`,
    explanation: 'Find lexicographically next permutation. Time: O(n), Space: O(1).',
    defaultInput: { array: [1, 2, 3] },
    testCases: [{ input: { array: [3, 2, 1] }, expected: [1, 2, 3] }],
  },

  'palindrome-partitions': {
    topic: 'Backtracking/DP',
    title: 'Palindrome Partitioning',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { string } = input;
  const result = [];
  const isPalin = (s, l, r) => {
    while (l < r) {
      if (s[l] !== s[r]) return false;
      l++;
      r--;
    }
    return true;
  };

  const backtrack = (start, current) => {
    if (start === string.length) {
      result.push([...current]);
      tracer.step('Found', 'Partition complete', { string, text: string });
      return;
    }

    for (let end = start; end < string.length; end++) {
      if (isPalin(string, start, end)) {
        current.push(string.slice(start, end + 1));
        tracer.step('Partition', \`Added \${string.slice(start, end + 1)}\`, { string, text: string });
        backtrack(end + 1, current);
        current.pop();
      }
    }
  };

  tracer.step('Start', 'Find palindrome partitions', { string, text: string });
  backtrack(0, []);
  return result;
};`,
    explanation: 'Partition string into palindromic substrings. Time: O(n*2^n), Space: O(n).',
    defaultInput: { string: 'aab' },
    testCases: [{ input: { string: 'a' }, expected: [['a']] }],
  },

  'letter-combinations': {
    topic: 'Backtracking',
    title: 'Letter Combinations of Phone Number',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { digits } = input;
  const map = { '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl', '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz' };
  const result = [];

  if (!digits) return result;

  const backtrack = (index, current) => {
    if (index === digits.length) {
      result.push(current);
      tracer.step('Found', \`Combination: \${current}\`, { string: current, text: current });
      return;
    }

    const letters = map[digits[index]];
    for (const letter of letters) {
      tracer.step('Try', \`Adding \${letter}\`, { string: current + letter });
      backtrack(index + 1, current + letter);
    }
  };

  tracer.step('Start', 'Generate combinations', { string: digits });
  backtrack(0, '');
  return result;
};`,
    explanation: 'Generate letter combinations from phone number. Time: O(4^n), Space: O(4^n).',
    defaultInput: { digits: '23' },
    testCases: [{ input: { digits: '' }, expected: [] }],
  },

  'subsets': {
    topic: 'Backtracking',
    title: 'Subsets',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { nums } = input;
  const result = [[]];

  tracer.step('Initialize', 'Start with empty subset', { array: nums, nums: nums });

  for (const num of nums) {
    const newSubsets = [];
    for (const subset of result) {
      const newSubset = [...subset, num];
      newSubsets.push(newSubset);
      tracer.step('Add', \`Added \${num} to subset\`, { array: nums, nums: nums });
    }
    result.push(...newSubsets);
  }

  return result;
};`,
    explanation: 'Generate all subsets (power set). Time: O(2^n), Space: O(2^n).',
    defaultInput: { nums: [1, 2, 3] },
    testCases: [{ input: { nums: [0] }, expected: [[], [0]] }],
  },

  'combination-sum': {
    topic: 'Backtracking',
    title: 'Combination Sum',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { candidates, target } = input;
  const result = [];

  const backtrack = (start, current, sum) => {
    if (sum === target) {
      result.push([...current]);
      tracer.step('Found', \`Combination: \${current.join(',')}\`, { nums: candidates, k: target });
      return;
    }

    if (sum > target) return;

    for (let i = start; i < candidates.length; i++) {
      current.push(candidates[i]);
      tracer.step('Try', \`Added \${candidates[i]}\`, { nums: candidates, k: candidates[i] });
      backtrack(i, current, sum + candidates[i]);
      current.pop();
    }
  };

  tracer.step('Start', \`Find combinations summing to \${target}\`, { nums: candidates, k: target });
  backtrack(0, [], 0);
  return result;
};`,
    explanation: 'Find all combinations summing to target. Time: O(n^(t/m)), Space: O(t/m).',
    defaultInput: { candidates: [2, 3, 6, 7], target: 7 },
    testCases: [{ input: { candidates: [2, 3, 5], target: 8 }, expected: [[2, 2, 2, 2], [2, 3, 3], [3, 5]] }],
  },

  'permutations': {
    topic: 'Backtracking',
    title: 'Permutations',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { nums } = input;
  const result = [];
  const used = Array(nums.length).fill(false);

  const backtrack = (current) => {
    if (current.length === nums.length) {
      result.push([...current]);
      tracer.step('Found', \`Permutation: \${current.join(',')}\`, { array: nums });
      return;
    }

    for (let i = 0; i < nums.length; i++) {
      if (!used[i]) {
        used[i] = true;
        current.push(nums[i]);
        tracer.step('Add', \`Added \${nums[i]}\`, { array: nums });
        backtrack(current);
        current.pop();
        used[i] = false;
      }
    }
  };

  tracer.step('Start', 'Generate permutations', { array: nums });
  backtrack([]);
  return result;
};`,
    explanation: 'Generate all permutations. Time: O(n!), Space: O(n!).',
    defaultInput: { nums: [1, 2, 3] },
    testCases: [{ input: { nums: [0, 1] }, expected: [[0, 1], [1, 0]] }],
  },

  'generate-parentheses': {
    topic: 'Backtracking',
    title: 'Generate Parentheses',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { n } = input;
  const result = [];

  const backtrack = (current, open, close) => {
    if (current.length === 2 * n) {
      result.push(current);
      tracer.step('Found', current, { string: current });
      return;
    }

    if (open < n) {
      tracer.step('Add open', 'Adding (', { string: current + '(' });
      backtrack(current + '(', open + 1, close);
    }

    if (close < open) {
      tracer.step('Add close', 'Adding )', { string: current + ')' });
      backtrack(current + ')', open, close + 1);
    }
  };

  tracer.step('Start', \`Generate \${n} pairs\`, { n });
  backtrack('', 0, 0);
  return result;
};`,
    explanation: 'Generate valid parentheses combinations. Time: O(4^n/n^1.5), Space: O(n).',
    defaultInput: { n: 3 },
    testCases: [{ input: { n: 1 }, expected: ['()'] }],
  },

  'word-search': {
    topic: 'Backtracking',
    title: 'Word Search',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { board, word } = input;
  const rows = board.length, cols = board[0].length;

  const dfs = (r, c, index) => {
    if (index === word.length) return true;
    if (r < 0 || r >= rows || c < 0 || c >= cols || board[r][c] !== word[index]) return false;

    const temp = board[r][c];
    board[r][c] = '*';
    tracer.step('Visit', \`Found \${word[index]} at (\${r},\${c})\`, { matrix: board });

    const found = dfs(r + 1, c, index + 1) || dfs(r - 1, c, index + 1) ||
                  dfs(r, c + 1, index + 1) || dfs(r, c - 1, index + 1);

    board[r][c] = temp;
    return found;
  };

  tracer.step('Start', \`Search for word: \${word}\`, { matrix: board });

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (dfs(i, j, 0)) return true;
    }
  }

  return false;
};`,
    explanation: 'Search for word in 2D grid. Time: O(n*m*4^l), Space: O(l).',
    defaultInput: { board: [['a', 'b'], ['c', 'd']], word: 'ab' },
    testCases: [{ input: { board: [['a']], word: 'a' }, expected: true }],
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

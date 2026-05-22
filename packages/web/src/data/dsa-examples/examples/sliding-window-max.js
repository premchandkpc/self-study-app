export default {
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
      { input: { array: [1, 3, -1, -3, 5, 3], k: 3 }, expected: 5 },
    ],
}

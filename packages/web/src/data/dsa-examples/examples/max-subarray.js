export default {
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
}

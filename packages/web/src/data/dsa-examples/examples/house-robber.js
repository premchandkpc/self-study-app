export default {
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
}

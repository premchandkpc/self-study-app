export default {
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
}

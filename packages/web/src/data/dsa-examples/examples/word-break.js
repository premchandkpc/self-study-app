export default {
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
}

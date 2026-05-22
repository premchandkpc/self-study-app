export default {
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
}

export default {
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
}

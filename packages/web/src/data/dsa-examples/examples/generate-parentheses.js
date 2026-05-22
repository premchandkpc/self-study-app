export default {
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
}

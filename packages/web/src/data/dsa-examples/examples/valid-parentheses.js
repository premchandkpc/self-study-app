export default {
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
}

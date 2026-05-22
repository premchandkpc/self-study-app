export default {
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
}

export default {
    topic: 'Stack',
    title: 'Min Stack',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { operations } = input;
  const stack = [];
  const minStack = [];

  tracer.step('Initialize', 'Create min stack', { nums: stack, k: 0 });

  for (const [op, val] of operations) {
    if (op === 'push') {
      stack.push(val);
      if (minStack.length === 0 || val <= minStack[minStack.length - 1]) {
        minStack.push(val);
      }
      tracer.step('Push', \`Value \${val}\`, { nums: stack });
    } else if (op === 'pop') {
      const popped = stack.pop();
      if (popped === minStack[minStack.length - 1]) {
        minStack.pop();
      }
      tracer.step('Pop', \`Removed \${popped}\`, { nums: stack });
    }
  }

  return minStack[minStack.length - 1];
};`,
    explanation: 'Stack with constant time min queries. Time: O(1), Space: O(n).',
    defaultInput: { operations: [['push', 1], ['push', 2], ['push', 0]] },
    testCases: [{ input: { operations: [['push', -2], ['pop'], ['top']] }, expected: -2 }],
}

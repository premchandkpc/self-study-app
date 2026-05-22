export default {
    topic: 'Hash Tables',
    title: 'Contains Duplicate',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  const seen = new Set();

  tracer.step('Start', 'Check for duplicates', { array, nums: array, k: 0 });

  for (let i = 0; i < array.length; i++) {
    if (seen.has(array[i])) {
      tracer.found(true, { state: { array, found: true } });
      return true;
    }
    seen.add(array[i]);
    tracer.step('Add', \`Added \${array[i]} to set\`, { array, nums: array, k: i + 1 });
  }

  return false;
};`,
    explanation: 'Check if array contains duplicates. Time: O(n), Space: O(n).',
    defaultInput: { array: [1, 2, 3, 1] },
    testCases: [{ input: { array: [1, 2, 3] }, expected: false }],
}

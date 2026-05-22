export default {
    topic: 'Arrays',
    title: 'Remove Duplicates from Sorted Array',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  if (array.length === 0) return 0;

  let k = 1;
  tracer.step('Start', 'Mark first element', { array, k, left: 0, right: 1 });

  for (let i = 1; i < array.length; i++) {
    if (array[i] !== array[i - 1]) {
      array[k] = array[i];
      tracer.step('Found unique', \`Unique value \${array[i]} at position \${k}\`, { array, k, left: i, right: k });
      k++;
    }
  }

  return k;
};`,
    explanation: 'Remove duplicates in-place from sorted array. Time: O(n), Space: O(1).',
    defaultInput: { array: [1, 1, 2, 2, 3, 3, 4] },
    testCases: [{ input: { array: [1, 1, 2] }, expected: 2 }],
}

export default {
    topic: 'Arrays',
    title: 'Rotate Array',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array: arr, k: steps } = input;
  const n = arr.length;
  const k = steps % n;

  tracer.step('Start', \`Rotate by \${k} steps\`, { array: arr, k });

  const result = [...arr.slice(-k), ...arr.slice(0, n - k)];
  tracer.step('Rotated', \`Array rotated\`, { array: result });

  return result;
};`,
    explanation: 'Rotate array right by k steps. Time: O(n), Space: O(n).',
    defaultInput: { array: [1, 2, 3, 4, 5], k: 2 },
    testCases: [{ input: { array: [1, 2, 3], k: 1 }, expected: [3, 1, 2] }],
}

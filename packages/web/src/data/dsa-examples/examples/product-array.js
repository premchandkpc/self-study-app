export default {
    topic: 'Arrays',
    title: 'Product of Array Except Self',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  const n = array.length;
  const output = new Array(n).fill(1);

  tracer.step('Initialize', 'Output array created', { array, nums: array, k: 0 });

  for (let i = 1; i < n; i++) {
    output[i] = output[i - 1] * array[i - 1];
    tracer.step('Left pass', \`output[\${i}] = \${output[i]}\`, { array, nums: output, k: i });
  }

  let right = 1;
  for (let i = n - 1; i >= 0; i--) {
    output[i] *= right;
    right *= array[i];
  }

  return output;
};`,
    explanation: 'Compute product of array except self. Time: O(n), Space: O(1) excluding output.',
    defaultInput: { array: [1, 2, 3, 4] },
    testCases: [{ input: { array: [-1, 1, 0, -3, 3] }, expected: [0, 0, 9, 0, 0] }],
}

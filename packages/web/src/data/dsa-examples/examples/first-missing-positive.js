export default {
    topic: 'Arrays',
    title: 'First Missing Positive',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  const n = array.length;

  tracer.step('Start', 'Find first missing positive', { array, nums: array, k: 1 });

  for (let i = 0; i < n; i++) {
    while (array[i] > 0 && array[i] <= n && array[array[i] - 1] !== array[i]) {
      [array[array[i] - 1], array[i]] = [array[i], array[array[i] - 1]];
      tracer.step('Swap', 'Rearranging', { array, nums: array });
    }
  }

  for (let i = 0; i < n; i++) {
    if (array[i] !== i + 1) {
      return i + 1;
    }
  }

  return n + 1;
};`,
    explanation: 'Find smallest missing positive integer. Time: O(n), Space: O(1).',
    defaultInput: { array: [3, 4, -1, 1] },
    testCases: [{ input: { array: [1, 2, 0] }, expected: 3 }],
}

export default {
    topic: 'Arrays/Two Pointers',
    title: 'Three Sum',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  array.sort((a, b) => a - b);
  const result = [];

  tracer.step('Sort', 'Array sorted', { array });

  for (let i = 0; i < array.length - 2; i++) {
    if (array[i] > 0) break;
    if (i > 0 && array[i] === array[i - 1]) continue;

    let left = i + 1, right = array.length - 1;
    while (left < right) {
      const sum = array[i] + array[left] + array[right];
      if (sum === 0) {
        result.push([array[i], array[left], array[right]]);
        while (left < right && array[left] === array[left + 1]) left++;
        while (left < right && array[right] === array[right - 1]) right--;
        left++;
        right--;
      } else if (sum < 0) {
        left++;
      } else {
        right--;
      }
      tracer.step('Check', \`Sum: \${sum}\`, { array, left: i, right });
    }
  }

  return result;
};`,
    explanation: 'Find all unique triplets summing to zero. Time: O(n^2), Space: O(1).',
    defaultInput: { array: [-1, 0, 1, 2, -1, -4] },
    testCases: [{ input: { array: [0] }, expected: [] }],
}

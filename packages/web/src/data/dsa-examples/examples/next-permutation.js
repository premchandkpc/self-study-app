export default {
    topic: 'Arrays',
    title: 'Next Permutation',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  let i = array.length - 2;

  tracer.step('Start', 'Find next permutation', { array });

  while (i >= 0 && array[i] >= array[i + 1]) i--;

  if (i >= 0) {
    let j = array.length - 1;
    while (j > i && array[j] <= array[i]) j--;
    [array[i], array[j]] = [array[j], array[i]];
    tracer.step('Swap', \`Swapped \${array[j]} and \${array[i]}\`, { array });
  }

  let left = i + 1, right = array.length - 1;
  while (left < right) {
    [array[left], array[right]] = [array[right], array[left]];
    left++;
    right--;
  }

  return array;
};`,
    explanation: 'Find lexicographically next permutation. Time: O(n), Space: O(1).',
    defaultInput: { array: [1, 2, 3] },
    testCases: [{ input: { array: [3, 2, 1] }, expected: [1, 2, 3] }],
}

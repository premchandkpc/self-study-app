export default {
    topic: 'Arrays',
    title: 'Two Sum (Sorted Array)',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array, target } = input;
  let left = 0, right = array.length - 1;

  tracer.step('Initialize', \`Find pair summing to \${target}\`, { array, target, left, right });

  while (left < right) {
    const sum = array[left] + array[right];
    tracer.step('Check', \`arr[\${left}] + arr[\${right}] = \${sum}\`,
      { array, target, left, right, sum });

    if (sum === target) {
      tracer.found([left, right], { state: { array, target, left, right } });
      return [left, right];
    }

    sum < target ? left++ : right--;
  }

  return [];
};`,
    explanation: 'Two pointers approach for finding a pair with a given sum in a sorted array. Time: O(n), Space: O(1).',
    defaultInput: { array: [1, 2, 3, 5, 7, 11], target: 9 },
    testCases: [
      { input: { array: [1, 2, 3, 5], target: 8 }, expected: [2, 3] },
      { input: { array: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
    ],
}

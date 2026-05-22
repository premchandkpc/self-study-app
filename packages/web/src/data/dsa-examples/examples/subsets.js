export default {
    topic: 'Backtracking',
    title: 'Subsets',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { nums } = input;
  const result = [[]];

  tracer.step('Initialize', 'Start with empty subset', { array: nums, nums: nums });

  for (const num of nums) {
    const newSubsets = [];
    for (const subset of result) {
      const newSubset = [...subset, num];
      newSubsets.push(newSubset);
      tracer.step('Add', \`Added \${num} to subset\`, { array: nums, nums: nums });
    }
    result.push(...newSubsets);
  }

  return result;
};`,
    explanation: 'Generate all subsets (power set). Time: O(2^n), Space: O(2^n).',
    defaultInput: { nums: [1, 2, 3] },
    testCases: [{ input: { nums: [0] }, expected: [[], [0]] }],
}

export default {
    topic: 'Backtracking',
    title: 'Permutations',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { nums } = input;
  const result = [];
  const used = Array(nums.length).fill(false);

  const backtrack = (current) => {
    if (current.length === nums.length) {
      result.push([...current]);
      tracer.step('Found', \`Permutation: \${current.join(',')}\`, { array: nums });
      return;
    }

    for (let i = 0; i < nums.length; i++) {
      if (!used[i]) {
        used[i] = true;
        current.push(nums[i]);
        tracer.step('Add', \`Added \${nums[i]}\`, { array: nums });
        backtrack(current);
        current.pop();
        used[i] = false;
      }
    }
  };

  tracer.step('Start', 'Generate permutations', { array: nums });
  backtrack([]);
  return result;
};`,
    explanation: 'Generate all permutations. Time: O(n!), Space: O(n!).',
    defaultInput: { nums: [1, 2, 3] },
    testCases: [{ input: { nums: [0, 1] }, expected: [[0, 1], [1, 0]] }],
}

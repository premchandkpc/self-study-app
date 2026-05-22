export default {
    topic: 'Backtracking',
    title: 'Combination Sum',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { candidates, target } = input;
  const result = [];

  const backtrack = (start, current, sum) => {
    if (sum === target) {
      result.push([...current]);
      tracer.step('Found', \`Combination: \${current.join(',')}\`, { nums: candidates, k: target });
      return;
    }

    if (sum > target) return;

    for (let i = start; i < candidates.length; i++) {
      current.push(candidates[i]);
      tracer.step('Try', \`Added \${candidates[i]}\`, { nums: candidates, k: candidates[i] });
      backtrack(i, current, sum + candidates[i]);
      current.pop();
    }
  };

  tracer.step('Start', \`Find combinations summing to \${target}\`, { nums: candidates, k: target });
  backtrack(0, [], 0);
  return result;
};`,
    explanation: 'Find all combinations summing to target. Time: O(n^(t/m)), Space: O(t/m).',
    defaultInput: { candidates: [2, 3, 6, 7], target: 7 },
    testCases: [{ input: { candidates: [2, 3, 5], target: 8 }, expected: [[2, 2, 2, 2], [2, 3, 3], [3, 5]] }],
}

export default {
    topic: 'Backtracking',
    title: 'Letter Combinations of Phone Number',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { digits } = input;
  const map = { '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl', '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz' };
  const result = [];

  if (!digits) return result;

  const backtrack = (index, current) => {
    if (index === digits.length) {
      result.push(current);
      tracer.step('Found', \`Combination: \${current}\`, { string: current, text: current });
      return;
    }

    const letters = map[digits[index]];
    for (const letter of letters) {
      tracer.step('Try', \`Adding \${letter}\`, { string: current + letter });
      backtrack(index + 1, current + letter);
    }
  };

  tracer.step('Start', 'Generate combinations', { string: digits });
  backtrack(0, '');
  return result;
};`,
    explanation: 'Generate letter combinations from phone number. Time: O(4^n), Space: O(4^n).',
    defaultInput: { digits: '23' },
    testCases: [{ input: { digits: '' }, expected: [] }],
}

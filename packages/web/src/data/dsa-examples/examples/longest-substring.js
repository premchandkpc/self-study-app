export default {
    topic: 'Strings/Hash',
    title: 'Longest Substring Without Repeating Characters',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { string } = input;
  const charIndex = {};
  let maxLen = 0, left = 0;

  tracer.step('Start', 'Find longest substring', { string, text: string, windowStart: 0, windowEnd: 0 });

  for (let right = 0; right < string.length; right++) {
    if (charIndex[string[right]] !== undefined && charIndex[string[right]] >= left) {
      left = charIndex[string[right]] + 1;
    }
    charIndex[string[right]] = right;
    maxLen = Math.max(maxLen, right - left + 1);
    tracer.step('Window', \`Substring: \${string.slice(left, right + 1)}\`, { string, text: string, windowStart: left, windowEnd: right });
  }

  return maxLen;
};`,
    explanation: 'Find length of longest substring without repeating chars. Time: O(n), Space: O(min(m,n)).',
    defaultInput: { string: 'abcabcbb' },
    testCases: [{ input: { string: 'au' }, expected: 2 }],
}

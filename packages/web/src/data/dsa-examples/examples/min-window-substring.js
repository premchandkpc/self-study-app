export default {
    topic: 'Strings/Sliding Window',
    title: 'Minimum Window Substring',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { string, pattern } = input;
  const patternCount = {};
  for (const char of pattern) patternCount[char] = (patternCount[char] || 0) + 1;

  let left = 0, minLen = Infinity, minStart = 0, matched = 0;
  const windowCount = {};

  tracer.step('Start', 'Find min window substring', { string, text: string, windowStart: 0, windowEnd: 0 });

  for (let right = 0; right < string.length; right++) {
    windowCount[string[right]] = (windowCount[string[right]] || 0) + 1;
    if (patternCount[string[right]] && windowCount[string[right]] <= patternCount[string[right]]) {
      matched++;
    }

    while (matched === pattern.length) {
      if (right - left + 1 < minLen) {
        minLen = right - left + 1;
        minStart = left;
      }
      windowCount[string[left]]--;
      if (patternCount[string[left]] && windowCount[string[left]] < patternCount[string[left]]) {
        matched--;
      }
      left++;
    }
  }

  return minLen === Infinity ? '' : string.slice(minStart, minStart + minLen);
};`,
    explanation: 'Find minimum window containing all chars from pattern. Time: O(n), Space: O(1).',
    defaultInput: { string: 'ADOBECODEBANC', pattern: 'ABC' },
    testCases: [{ input: { string: 'a', pattern: 'a' }, expected: 'a' }],
}

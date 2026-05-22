export default {
    topic: 'Strings',
    title: 'Valid Palindrome II',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { string } = input;
  let left = 0, right = string.length - 1;

  tracer.step('Start', 'Check palindrome', { string, text: string, left, right });

  while (left < right) {
    if (string[left] !== string[right]) {
      tracer.found(false, { state: { string, isPalindrome: false } });
      return false;
    }
    tracer.step('Match', \`\${string[left]} == \${string[right]}\`, { string, text: string, left, right });
    left++;
    right--;
  }

  return true;
};`,
    explanation: 'Check if string is palindrome. Time: O(n), Space: O(1).',
    defaultInput: { string: 'racecar' },
    testCases: [{ input: { string: 'abc' }, expected: false }],
}

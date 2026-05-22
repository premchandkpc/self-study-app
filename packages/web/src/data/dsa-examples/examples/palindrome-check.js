export default {
    topic: 'Strings',
    title: 'Valid Palindrome',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { string } = input;
  let left = 0, right = string.length - 1;

  tracer.step('Start', \`Check if "\${string}" is palindrome\`, { string, left, right });

  while (left < right) {
    tracer.step('Compare', \`s[\${left}]='\${string[left]}' vs s[\${right}]='\${string[right]}'\`,
      { string, left, right });

    if (string[left] !== string[right]) {
      tracer.found(false, { state: { string, left, right, isPalindrome: false } });
      return false;
    }

    left++;
    right--;
  }

  tracer.found(true, { state: { string, left, right, isPalindrome: true } });
  return true;
};`,
    explanation: 'Check if a string is a palindrome using two pointers. Time: O(n), Space: O(1).',
    defaultInput: { string: 'racecar' },
    testCases: [
      { input: { string: 'hello' }, expected: false },
      { input: { string: 'madam' }, expected: true },
    ],
}

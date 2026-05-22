export default {
    topic: 'Strings',
    title: 'Reverse String',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { string } = input;
  const chars = string.split('');

  tracer.step('Start', 'Reverse string', { string, text: string, left: 0, right: chars.length - 1 });

  let left = 0, right = chars.length - 1;
  while (left < right) {
    [chars[left], chars[right]] = [chars[right], chars[left]];
    tracer.step('Swap', \`Swapped \${chars[right]} and \${chars[left]}\`, { string: chars.join(''), text: chars.join(''), left, right });
    left++;
    right--;
  }

  return chars.join('');
};`,
    explanation: 'Reverse a string. Time: O(n), Space: O(n).',
    defaultInput: { string: 'hello' },
    testCases: [{ input: { string: 'a' }, expected: 'a' }],
}

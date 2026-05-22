export default {
    topic: 'Hash Tables',
    title: 'Group Anagrams',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { words } = input;
  const map = {};

  tracer.step('Start', 'Group anagrams', { nums: words, k: 0 });

  for (let i = 0; i < words.length; i++) {
    const sorted = words[i].split('').sort().join('');
    if (!map[sorted]) map[sorted] = [];
    map[sorted].push(words[i]);
    tracer.step('Add', \`Added \${words[i]}\`, { nums: words, k: i + 1 });
  }

  return Object.values(map);
};`,
    explanation: 'Group words that are anagrams. Time: O(n*k log k), Space: O(n).',
    defaultInput: { words: ['eat', 'tea', 'tan', 'ate', 'nat'] },
    testCases: [{ input: { words: ['a'] }, expected: [['a']] }],
}

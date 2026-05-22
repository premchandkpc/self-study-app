export default {
    topic: 'Graph/BFS',
    title: 'Word Ladder',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { begin, end, words } = input;
  if (!words.includes(end)) return 0;

  const wordSet = new Set(words);
  const queue = [[begin, 1]];
  const visited = new Set([begin]);

  tracer.step('Start', \`Transform \${begin} to \${end}\`, { string: begin, text: end });

  while (queue.length > 0) {
    const [word, distance] = queue.shift();
    tracer.step('Level', \`Distance: \${distance}\`, { string: word });

    if (word === end) return distance;

    for (let i = 0; i < word.length; i++) {
      for (let c = 97; c <= 122; c++) {
        const newWord = word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1);
        if (wordSet.has(newWord) && !visited.has(newWord)) {
          visited.add(newWord);
          queue.push([newWord, distance + 1]);
        }
      }
    }
  }

  return 0;
};`,
    explanation: 'Find shortest word transformation sequence. Time: O(n*m*26), Space: O(n).',
    defaultInput: { begin: 'hit', end: 'cog', words: ['hot', 'dot', 'dog', 'lot', 'log', 'cog'] },
    testCases: [{ input: { begin: 'a', end: 'c', words: ['a', 'b', 'c'] }, expected: 2 }],
}

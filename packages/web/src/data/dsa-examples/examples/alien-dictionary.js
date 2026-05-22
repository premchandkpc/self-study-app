export default {
    topic: 'Graph/Topological Sort',
    title: 'Alien Dictionary',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { words } = input;
  const graph = {}, inDegree = {};

  for (const word of words) {
    for (const char of word) {
      if (!graph[char]) graph[char] = [];
      if (!inDegree[char]) inDegree[char] = 0;
    }
  }

  tracer.step('Build', 'Create character graph', { string: words[0] });

  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i], w2 = words[i + 1];
    for (let j = 0; j < Math.min(w1.length, w2.length); j++) {
      if (w1[j] !== w2[j]) {
        if (!graph[w1[j]].includes(w2[j])) {
          graph[w1[j]].push(w2[j]);
          inDegree[w2[j]]++;
        }
        break;
      }
    }
  }

  const queue = Object.keys(inDegree).filter(c => inDegree[c] === 0);
  let result = '';

  while (queue.length > 0) {
    const char = queue.shift();
    result += char;
    for (const neighbor of graph[char]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return result;
};`,
    explanation: 'Determine order of characters in alien dictionary. Time: O(n*m), Space: O(1).',
    defaultInput: { words: ['wrt', 'wrf', 'er', 'ett', 'rftt'] },
    testCases: [{ input: { words: ['z', 'x'] }, expected: 'zx' }],
}

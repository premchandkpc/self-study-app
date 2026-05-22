import { AlgorithmCompiler } from '../../core/compiler/AlgorithmCompiler';

const compiler = new AlgorithmCompiler();

const trieAlgorithm = (input, tracer) => {
  const { words } = input;
  const trie = {};
  
  tracer.step('Initialize', `Build trie from ${words.length} words`, input);
  
  for (let word of words) {
    let node = trie;
    for (let char of word) {
      if (!node[char]) node[char] = {};
      node = node[char];
      tracer.step('Insert', `${word}: added '${char}'`, { words, trie });
    }
    node.isEnd = true;
  }
  
  tracer.found(words, { state: { words, nodeCount: Object.keys(trie).length } });
  return trie;
};

export const SCENARIOS = [
  {
    id: 'insert-search',
    label: 'Trie Insert/Search',
    icon: '🌳',
    code: `const algorithm = (input, tracer) => {
  const { words } = input;
  const trie = {};
  for (let word of words) {
    let node = trie;
    for (let char of word) {
      if (!node[char]) node[char] = {};
      node = node[char];
    }
    node.isEnd = true;
  }
  return trie;
};`,
    language: 'javascript',
    inputs: [
      { key: 'words', label: 'Words', type: 'array-string', default: ['cat', 'car', 'card'] },
    ],
    build(params = {}) {
      const words = Array.isArray(params.words) ? params.words : ['cat', 'car', 'card'];
      return compiler.compile(trieAlgorithm, { words });
    },
  },
];

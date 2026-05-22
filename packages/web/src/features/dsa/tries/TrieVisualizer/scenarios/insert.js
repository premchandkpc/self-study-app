import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';

const _mk = createNodeFactory({ default: '●' });
const trieNode = _mk('default');

function buildInsertSteps() {
  const steps = [];
  const s = {
    nodes: [
      trieNode('root', 'ROOT', 300, 50, { children: 0 }),
      trieNode('c', 'c', 200, 150, { children: 0 }),
      trieNode('a', 'a', 200, 250, { children: 0 }),
      trieNode('r', 'r', 200, 350, { children: 0 }),
      trieNode('t', 't', 350, 200, { children: 0, isWord: false }),
    ],
    edges: [],
    packets: [],
    events: [],
    metrics: { words: 0, nodes: 1, depth: 0 },
  };

  snap(steps, s, 'Trie Insert: Build prefix tree. Each node = letter. Path = word. O(m) where m=word length.', 1);

  s.nodes[1].state = 'active';
  s.edges = [{ from: 'root', to: 'c', protocol: '1' }];
  s.packets = [packet('root', 'c', 'insert "cat"')];
  s.events.push({ type: 'info', msg: 'Insert "cat". Step 1: Create node "c". Link root → c.' });
  snap(steps, s, 'Insert "cat". Root → c. Node c created.', 2);

  s.nodes[2].state = 'active';
  s.edges.push({ from: 'c', to: 'a', protocol: '1' });
  s.packets = [packet('c', 'a', 'insert "ca"')];
  s.metrics.nodes = 3;
  s.events.push({ type: 'info', msg: 'Step 2: Create node "a" under c. Link c → a.' });
  snap(steps, s, 'Root → c → a. Node a created.', 3);

  s.nodes[3].state = 'active';
  s.edges.push({ from: 'a', to: 'r', protocol: '1' });
  s.packets = [packet('a', 'r', 'insert "car"')];
  s.metrics.nodes = 4;
  s.metrics.depth = 3;
  s.events.push({ type: 'info', msg: 'Step 3: Create node "r" under a. Link a → r.' });
  snap(steps, s, 'Root → c → a → r. Node r created.', 4);

  s.nodes[3].state = 'ok';
  s.metrics.words = 1;
  s.events.push({ type: 'ok', msg: 'Mark r as word end. Word "cat" inserted. isWord[r]=true.' });
  snap(steps, s, 'Mark r.isWord=true. Word "cat" complete. Path: root→c→a→r.', 5);

  s.nodes[4].state = 'active';
  s.edges.push({ from: 'r', to: 't', protocol: '1' });
  s.packets = [packet('r', 't', 'insert "cart"')];
  s.metrics.nodes = 5;
  s.events.push({ type: 'info', msg: 'Insert "cart". Reuse path root→c→a→r, add "t".' });
  snap(steps, s, 'Insert "cart". Reuses root→c→a→r, adds t. Node t created.', 6);

  s.nodes[4].state = 'ok';
  s.metrics.words = 2;
  s.events.push({ type: 'ok', msg: 'Mark t as word end. Word "cart" inserted. Common prefix "car" shared!' });
  snap(steps, s, 'Mark t.isWord=true. Both "cat" and "cart" stored. Shared prefix = memory efficient!', 7);

  return steps;
}

const CODE = [
  'class TrieNode {',
  '  constructor() {',
  '    this.children = {};',
  '    this.isWord = false;',
  '  }',
  '}',
  '',
  'class Trie {',
  '  constructor() {',
  '    this.root = new TrieNode();',
  '  }',
  '',
  '  insert(word) {',
  '    let node = this.root;',
  '    for (const char of word) {',
  '      if (!node.children[char]) {',
  '        node.children[char] = new TrieNode();',
  '      }',
  '      node = node.children[char];',
  '    }',
  '    node.isWord = true;',
  '  }',
  '}',
];

export default {
  id: 'insert',
  label: 'Trie Insert',
  icon: '📝',
  build: buildInsertSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'words', label: 'Words', max: 10, color: 'var(--pod-running)' },
    { key: 'nodes', label: 'Nodes', max: 20, color: 'var(--node-default)' },
    { key: 'depth', label: 'Max Depth', max: 15, color: 'var(--node-comparing)' },
  ],
  codeNotes: [
    { title: 'Insert O(m)', content: 'Traverse from root, create missing nodes. m=word length. Always O(m), no hashing.' },
    { title: 'Prefix Sharing', content: 'Words with common prefixes share nodes. E.g., "cat" & "cart" share c→a→r. Saves space.' },
    { title: 'isWord Flag', content: 'Mark node as word end. Allows "cat" and "category" both in same trie (different end nodes).' },
    { title: 'Space O(n)', content: 'n=sum of all word lengths. Smaller than hashmap if many shared prefixes (common in dictionaries).' },
  ],
  tradeoffs: [
    { pro: 'Prefix search easy: traverse one path', con: 'More memory than hashtable for random words (no prefix overlap).' },
    { pro: 'No hash collisions or rehashing', con: 'Slower than hashtable per operation (character-by-character traversal).' },
    { pro: 'Autocomplete natural (DFS finds all)', con: 'Overhead: 26 pointers per node (for a-z). Memory = 26 * (num_nodes).' },
    { pro: 'Works with any alphabet (unicode)', con: 'Unicode = larger node size. Sparse child array (most slots empty).' },
  ],
  bestPractices: [
    'For autocomplete: build trie from dictionary. Query: DFS from prefix node. Return top K by frequency.',
    'Optimize: use HashMap instead of array for children (saves space). Trade: ~10% slower lookup.',
    'Prefix trie vs suffix trie: prefix for autocomplete, suffix for spell-check (reverse string).',
    'Word count: add count to isWord. E.g., "the" frequency=1000. Rank results by frequency in autocomplete.',
    'Compression: ternary search tree. Each node has 3 children (left < mid == right >). Smaller than 26-array tries.',
  ],
};

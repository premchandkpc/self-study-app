import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';

const _mk = createNodeFactory({ default: '●' });
const trieNode = _mk('default');

function buildSearchSteps() {
  const steps = [];
  const s = {
    nodes: [
      trieNode('root', 'ROOT', 300, 50, {}),
      trieNode('c', 'c', 200, 150, {}),
      trieNode('a', 'a', 200, 250, {}),
      trieNode('t', 't', 200, 350, { isWord: true }),
      trieNode('d', 'd', 350, 150, {}),
      trieNode('o', 'o', 350, 250, {}),
      trieNode('g', 'g', 350, 350, { isWord: true }),
    ],
    edges: [
      { from: 'root', to: 'c', protocol: '' },
      { from: 'c', to: 'a', protocol: '' },
      { from: 'a', to: 't', protocol: '' },
      { from: 'root', to: 'd', protocol: '' },
      { from: 'd', to: 'o', protocol: '' },
      { from: 'o', to: 'g', protocol: '' },
    ],
    packets: [],
    events: [],
    metrics: { found: 0, comparisons: 0, result: 'searching' },
  };

  snap(steps, s, 'Trie Search: Traverse matching path. O(m). Return isWord flag.', 1);

  s.nodes[0].state = 'active';
  s.packets = [packet('root', 'root', 'search "cat"')];
  s.metrics.comparisons = 0;
  s.events.push({ type: 'info', msg: 'Search "cat". Start at root. Check children for "c".' });
  snap(steps, s, 'Search "cat". Root check: has child "c"? Yes.', 2);

  s.nodes[1].state = 'active';
  s.packets = [packet('c', 'c', 'search "ca"')];
  s.metrics.comparisons = 1;
  s.events.push({ type: 'info', msg: 'Step 1: c found. Check c.children for "a".' });
  snap(steps, s, 'Found c. Check c.children["a"]. Yes.', 3);

  s.nodes[2].state = 'active';
  s.packets = [packet('a', 'a', 'search "cat"')];
  s.metrics.comparisons = 2;
  s.events.push({ type: 'info', msg: 'Step 2: a found. Check a.children for "t".' });
  snap(steps, s, 'Found a. Check a.children["t"]. Yes.', 4);

  s.nodes[3].state = 'ok';
  s.metrics.comparisons = 3;
  s.metrics.found = 1;
  s.metrics.result = 'found';
  s.events.push({ type: 'ok', msg: 'Step 3: t found. Check t.isWord? TRUE. Word exists!' });
  snap(steps, s, 'Found t. t.isWord=true. Word "cat" found! Search complete: O(3) comparisons.', 5);

  // Search not found
  s.nodes = [
      trieNode('root', 'ROOT', 300, 50, {}),
      trieNode('c', 'c', 200, 150, {}),
      trieNode('a', 'a', 200, 250, {}),
  ];
  s.edges = [
      { from: 'root', to: 'c', protocol: '' },
      { from: 'c', to: 'a', protocol: '' },
  ];
  s.packets = [packet('root', 'root', 'search "cap"')];
  s.metrics.comparisons = 0;
  s.metrics.found = 0;
  s.metrics.result = 'not_found';
  s.events.push({ type: 'info', msg: 'Search "cap". Root → c → a. Check a.children["p"]. NOT FOUND.' });
  snap(steps, s, 'Search "cap". Path root→c→a found. But a has no child "p". Return false.', 6);

  return steps;
}

const CODE = [
  'search(word) {',
  '  let node = this.root;',
  '  for (const char of word) {',
  '    if (!node.children[char]) {',
  '      return false; // Path breaks',
  '    }',
  '    node = node.children[char];',
  '  }',
  '  return node.isWord; // Word exists?',
  '}',
  '',
  'startsWith(prefix) {',
  '  let node = this.root;',
  '  for (const char of prefix) {',
  '    if (!node.children[char]) {',
  '      return false;',
  '    }',
  '    node = node.children[char];',
  '  }',
  '  return true; // Prefix found (ignore isWord)',
  '}',
];

export default {
  id: 'search',
  label: 'Trie Search & Prefix Match',
  icon: '🔍',
  build: buildSearchSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'found', label: 'Found', max: 1, color: 'var(--pod-running)' },
    { key: 'comparisons', label: 'Comparisons', max: 10, color: 'var(--node-default)' },
    { key: 'result', label: 'Result', max: 1, color: 'var(--node-comparing)' },
  ],
  codeNotes: [
    { title: 'Search O(m)', content: 'Traverse m characters. Each char = O(1) lookup (dict/map). Total O(m).' },
    { title: 'isWord vs Prefix', content: 'search("cat"): check isWord. startsWith("ca"): ignore isWord. Both traverse same path.' },
    { title: 'Not Found Early Exit', content: 'If any character missing, return false immediately. E.g., "cap" → a.children["p"] = null → false.' },
    { title: 'Difference from HashMap', content: 'HashMap: O(1) lookup but no prefix info. Trie: O(m) but prefix matches free (check intermediate nodes).' },
  ],
  tradeoffs: [
    { pro: 'Prefix search built-in', con: 'Slower than hashmap on average (m-character traversal vs hash).' },
    { pro: 'No hash collisions', con: 'Higher memory footprint (26+ pointers per node).' },
    { pro: 'Worst case O(m) = best case', con: 'String hashing can be O(1) average if hash function good.' },
  ],
  bestPractices: [
    'Spell checker: store dictionary in trie. Search word. If not found, suggest edits (one-char delete/add/swap).',
    'IP routing: store IP prefixes in trie. Longest prefix match = traverse to end, backtrack to last valid node.',
    'Autocomplete: search prefix, DFS from that node to find all words. Frequency sorting gives top suggestions.',
  ],
};

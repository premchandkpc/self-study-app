import { snap, packet, createNodeFactory } from '@/core/utils/scenarioShared';

const _mk = createNodeFactory({ default: '●' });
const trieNode = _mk('default');

function buildAutocompleteSteps() {
  const steps = [];
  const s = {
    nodes: [
      trieNode('root', 'ROOT', 300, 50, {}),
      trieNode('c', 'c', 200, 150, {}),
      trieNode('a', 'a', 200, 250, {}),
      trieNode('t', 't', 200, 350, { isWord: true, freq: 1000 }),
      trieNode('r', 'r', 200, 450, { isWord: true, freq: 500 }),
      trieNode('d', 'd', 350, 150, {}),
      trieNode('o', 'o', 350, 250, {}),
      trieNode('g', 'g', 350, 350, { isWord: true, freq: 800 }),
    ],
    edges: [
      { from: 'root', to: 'c', protocol: '' },
      { from: 'c', to: 'a', protocol: '' },
      { from: 'a', to: 't', protocol: '' },
      { from: 'a', to: 'r', protocol: '' },
      { from: 'root', to: 'd', protocol: '' },
      { from: 'd', to: 'o', protocol: '' },
      { from: 'o', to: 'g', protocol: '' },
    ],
    packets: [],
    events: [],
    metrics: { prefix: 'ca', matches: 0, top_k: 0, dfs_calls: 0 },
  };

  snap(steps, s, 'Trie Autocomplete: DFS from prefix node. Collect words + frequency. Top K by score. O(p+n)', 1);

  s.nodes[0].state = 'active';
  s.packets = [packet('root', 'root', 'autocomplete("ca")')];
  s.metrics.prefix = 'ca';
  s.events.push({ type: 'info', msg: 'Autocomplete "ca". User types "ca". Find prefix node. DFS all descendants.' });
  snap(steps, s, 'Query prefix "ca". Traverse root → c → a. At node a.', 2);

  s.nodes[2].state = 'active';
  s.packets = [packet('a', 'a', 'DFS from "ca"')];
  s.metrics.dfs_calls = 1;
  s.events.push({ type: 'info', msg: 'DFS at node a. Children: [t, r]. Recursively visit t (isWord=true, freq=1000).' });
  snap(steps, s, 'Start DFS at "a". Children: t (cat, freq=1000), r (car, freq=500).', 3);

  s.nodes[3].state = 'ok';
  s.metrics.matches = 1;
  s.metrics.top_k = 1;
  s.events.push({ type: 'ok', msg: 'Found word "cat" (freq=1000). Add to results heap. Max heap by frequency.' });
  snap(steps, s, 'Word "cat": freq=1000. Heap: [("cat", 1000)].', 4);

  s.nodes[4].state = 'ok';
  s.metrics.matches = 2;
  s.events.push({ type: 'ok', msg: 'Found word "car" (freq=500). Add to heap. Heap size=2.' });
  snap(steps, s, 'Word "car": freq=500. Heap: [("cat", 1000), ("car", 500)].', 5);

  s.metrics.top_k = 2;
  s.metrics.dfs_calls = 5;
  s.events.push({ type: 'info', msg: 'DFS complete. Collected all words. Sort heap. Return top 2 by frequency (top_k=2).' });
  snap(steps, s, 'DFS done. All descendants visited. Sort by freq. Top 2: ["cat", "car"].', 6);

  // Another prefix example
  s.nodes = [
    trieNode('root', 'ROOT', 300, 50, {}),
    trieNode('d', 'd', 200, 150, {}),
    trieNode('o', 'o', 200, 250, {}),
    trieNode('g', 'g', 200, 350, { isWord: true, freq: 800 }),
    trieNode('e', 'e', 200, 450, { isWord: true, freq: 300 }),
  ];
  s.edges = [
    { from: 'root', to: 'd', protocol: '' },
    { from: 'd', to: 'o', protocol: '' },
    { from: 'o', to: 'g', protocol: '' },
    { from: 'o', to: 'e', protocol: '' },
  ];
  s.packets = [packet('root', 'root', 'autocomplete("do")')];
  s.metrics.prefix = 'do';
  s.metrics.matches = 0;
  s.metrics.top_k = 0;
  s.metrics.dfs_calls = 0;
  s.events.push({ type: 'info', msg: 'Autocomplete "do". Find "do" node. DFS children: [g (dog, 800), e (doe, 300)].' });
  snap(steps, s, 'Prefix "do". DFS results: ["dog" (800), "doe" (300)]. Sorted by frequency.', 7);

  return steps;
}

const CODE = [
  'class TrieNode {',
  '  constructor() {',
  '    this.children = {};',
  '    this.isWord = false;',
  '    this.freq = 0;',
  '  }',
  '}',
  '',
  'autocomplete(prefix, top_k=10) {',
  '  // 1. Find prefix node',
  '  let node = this.root;',
  '  for (const char of prefix) {',
  '    if (!node.children[char]) return [];',
  '    node = node.children[char];',
  '  }',
  '',
  '  // 2. DFS to collect all words',
  '  const words = [];',
  '  const dfs = (n, path) => {',
  '    if (n.isWord) {',
  '      words.push({ word: path, freq: n.freq });',
  '    }',
  '    for (const char in n.children) {',
  '      dfs(n.children[char], path + char);',
  '    }',
  '  };',
  '  dfs(node, prefix);',
  '',
  '  // 3. Sort by frequency (descending)',
  '  words.sort((a, b) => b.freq - a.freq);',
  '',
  '  // 4. Return top K',
  '  return words.slice(0, top_k);',
  '}',
];

export default {
  id: 'autocomplete',
  label: 'Trie Autocomplete',
  icon: '📝',
  build: buildAutocompleteSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'prefix', label: 'Prefix', max: 1, color: 'var(--pod-running)' },
    { key: 'matches', label: 'Matches Found', max: 20, color: 'var(--node-default)' },
    { key: 'top_k', label: 'Results (Top K)', max: 10, color: 'var(--node-comparing)' },
    { key: 'dfs_calls', label: 'DFS Nodes Visited', max: 50, color: 'var(--pod-warning)' },
  ],
  codeNotes: [
    { title: 'Find Prefix O(p)', content: 'Traverse p characters to find prefix node. Early exit if prefix missing. O(p) where p = prefix length.' },
    { title: 'DFS All Words O(n)', content: 'Collect all words under prefix node. n = total nodes in subtrie. Visit each once. O(n).' },
    { title: 'Frequency Sorting O(k log k)', content: 'Sort results by frequency (or edit distance, alphabetical). k = matches found. Heap for top K: O(n log k) better if n >> k.' },
    { title: 'Total: O(p + n log k)', content: 'p = prefix length, n = subtrie nodes, k = top_k requested. Industry use: Google search, IDE autocomplete, chat mentions.' },
  ],
  tradeoffs: [
    { pro: 'Natural prefix search', con: 'DFS cost depends on subtrie size. Large prefix → fewer results but still traverse all.' },
    { pro: 'Frequency-weighted ranking', con: 'Frequency data adds memory (4 bytes per node). Must track user behavior.' },
    { pro: 'Top K efficient via heap', con: 'Heap overhead small for K << matches. If K large, sort all is faster.' },
    { pro: 'Works with any ranking function', con: 'Edit distance / recency / relevance = more computation. Simple frequency is fastest.' },
  ],
  bestPractices: [
    'Precompute top 10 globally per prefix. Cache top 10 suggestions for common prefixes (a, b, c, ...). Avoid recomputing if traffic high.',
    'Use frequency from user behavior. Update freq incrementally: freq = 0.9*freq + 0.1*new_count. Stale suggestions decay.',
    'Batch updates: collect user searches in log. Rebuild trie offline daily. Serve static trie for autocomplete requests.',
    'Distributed: shard by prefix character. "a*" trie on server 1, "b*" on server 2, etc. Each shard runs independently. Query all shards in parallel.',
    'Optimize DFS: limit depth (max 100 results). Return early if top K solidified (next word freq << top_k[last]). Bloom filters for rare prefixes (zero results).',
  ],
};

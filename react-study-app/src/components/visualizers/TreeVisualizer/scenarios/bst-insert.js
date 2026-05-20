import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { TREE_CONCEPTS, BST_TRADEOFFS } from './shared';

const _mk = createNodeFactory({ default: '●' });
const treeNode = _mk('default');

function buildBSTInsertSteps() {
  const steps = [];
  const s = {
    nodes: [
      treeNode('n50', '50', 300, 80, { role: 'root' }),
    ],
    edges: [],
    packets: [],
    events: [],
    metrics: { nodes: 1, depth: 1, balanced: 1 },
  };

  snap(steps, s, 'BST Insert: Maintain BST property (left < parent < right). Insert 50 as root.', 1);

  s.nodes.push(treeNode('n30', '30', 200, 180, { role: 'left' }));
  s.edges.push({ from: 'n50', to: 'n30', protocol: 'L' });
  s.metrics.nodes = 2; s.metrics.depth = 2;
  s.packets = [packet('n50', 'n30', 'insert(30)')];
  s.events.push({ type: 'info', msg: 'Insert 30: 30 < 50, go left. Add as left child.' });
  snap(steps, s, 'Insert 30: Compare with 50. 30 < 50, place as left child.', 2);

  s.nodes.push(treeNode('n70', '70', 400, 180, { role: 'right' }));
  s.edges.push({ from: 'n50', to: 'n70', protocol: 'R' });
  s.metrics.nodes = 3;
  s.packets = [packet('n50', 'n70', 'insert(70)')];
  s.events.push({ type: 'info', msg: 'Insert 70: 70 > 50, go right. Add as right child.' });
  snap(steps, s, 'Insert 70: 70 > 50, place as right child.', 3);

  s.nodes.push(treeNode('n20', '20', 150, 280, { role: 'left-left' }));
  s.edges.push({ from: 'n30', to: 'n20', protocol: 'L' });
  s.metrics.nodes = 4;
  s.packets = [packet('n30', 'n20', 'insert(20)')];
  s.events.push({ type: 'info', msg: 'Insert 20: 20 < 50 (go L to 30), 20 < 30 (go L). Add as left of 30.' });
  snap(steps, s, 'Insert 20: 20 < 50 → left. 20 < 30 → left of 30.', 4);

  s.nodes.push(treeNode('n40', '40', 250, 280, { role: 'left-right' }));
  s.edges.push({ from: 'n30', to: 'n40', protocol: 'R' });
  s.metrics.nodes = 5;
  s.packets = [packet('n30', 'n40', 'insert(40)')];
  s.events.push({ type: 'info', msg: 'Insert 40: 40 < 50 (go L), 40 > 30 (go R of 30). Add as right of 30.' });
  snap(steps, s, 'Insert 40: 40 < 50 → left to 30. 40 > 30 → right of 30.', 5);

  s.nodes.push(treeNode('n60', '60', 350, 280, { role: 'right-left' }));
  s.edges.push({ from: 'n70', to: 'n60', protocol: 'L' });
  s.metrics.nodes = 6;
  s.packets = [packet('n70', 'n60', 'insert(60)')];
  s.events.push({ type: 'info', msg: 'Insert 60: 60 > 50 (go R), 60 < 70 (go L of 70). Add as left of 70.' });
  snap(steps, s, 'Insert 60: 60 > 50 → right to 70. 60 < 70 → left of 70.', 6);

  s.nodes.push(treeNode('n80', '80', 450, 280, { role: 'right-right' }));
  s.edges.push({ from: 'n70', to: 'n80', protocol: 'R' });
  s.metrics.nodes = 7; s.metrics.depth = 3;
  s.packets = [packet('n70', 'n80', 'insert(80)')];
  s.events.push({ type: 'ok', msg: 'Insert 80: 80 > 50 (go R), 80 > 70 (go R of 70). BST complete with 7 nodes.' });
  snap(steps, s, 'Insert 80: 80 > 50 → right. 80 > 70 → right of 70. Final BST: balanced 7 nodes.', 7);

  return steps;
}

const CODE = [
  'class BSTNode {',
  '  constructor(val) {',
  '    this.val = val;',
  '    this.left = null;',
  '    this.right = null;',
  '  }',
  '}',
  '',
  'class BST {',
  '  insert(val, node = this.root) {',
  '    if (!this.root) {',
  '      this.root = new BSTNode(val);',
  '      return;',
  '    }',
  '    if (val < node.val) {',
  '      if (!node.left) node.left = new BSTNode(val);',
  '      else this.insert(val, node.left);',
  '    } else {',
  '      if (!node.right) node.right = new BSTNode(val);',
  '      else this.insert(val, node.right);',
  '    }',
  '  }',
  '}',
];

export default {
  id: 'bst-insert',
  label: 'BST Insert & Search',
  icon: '🌳',
  build: buildBSTInsertSteps,
  code: CODE,
  language: 'JavaScript',
  concepts: TREE_CONCEPTS,
  codeNotes: [
    { title: 'Recursive Insertion', content: 'Compare value with current node. If less, recurse left; else right. Create new node when null reached. Time: O(h) where h=height.' },
    { title: 'BST Property Maintained', content: 'Each comparison ensures smaller values go left, larger go right. Inorder traversal yields sorted values.' },
    { title: 'Search is Identical', content: 'Insert logic = Search logic (stop at first match). Both O(h) time. Balanced tree h=log(n), unbalanced h=n.' },
    { title: 'Insertion Order Affects Balance', content: 'Sorted inputs create chain (height=n). Random inputs create balanced tree (height=log n). No rebalancing in plain BST.' },
  ],
  tradeoffs: BST_TRADEOFFS,
  bestPractices: [
    'For production, use self-balancing trees (AVL, Red-Black). Plain BST risky if insertion order unknown.',
    'Always check for value existence before inserting (avoid duplicates or handle via count).',
    'For large datasets, batch insert random order to improve balance. Purely sequential kills performance.',
    'Monitor tree height; if height > 1.5 * log(n), tree is unbalanced. Consider rebalancing (AVL rotations).',
    'For search-heavy workloads, ensure log(n) guarantees via balanced tree. Hash table O(1) if ordering not needed.',
  ],
  metrics: [
    { key: 'nodes', label: 'Nodes', max: 7, color: 'var(--node-default)' },
    { key: 'depth', label: 'Depth', max: 7, color: 'var(--pod-running)' },
    { key: 'balanced', label: 'Balanced', max: 1, color: 'var(--pod-crash)' },
  ],
};

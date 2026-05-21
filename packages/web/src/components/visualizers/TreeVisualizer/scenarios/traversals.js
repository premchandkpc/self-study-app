import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { TREE_CONCEPTS } from './shared';

const _mk = createNodeFactory({ default: '●' });
const treeNode = _mk('default');

function buildTraversalSteps() {
  const steps = [];
  const s = {
    nodes: [
      treeNode('n50', '50', 300, 80, { visited: false }),
      treeNode('n30', '30', 200, 180, { visited: false }),
      treeNode('n70', '70', 400, 180, { visited: false }),
      treeNode('n20', '20', 150, 280, { visited: false }),
      treeNode('n40', '40', 250, 280, { visited: false }),
      treeNode('n60', '60', 350, 280, { visited: false }),
      treeNode('n80', '80', 450, 280, { visited: false }),
    ],
    edges: [
      { from: 'n50', to: 'n30', protocol: 'L' },
      { from: 'n50', to: 'n70', protocol: 'R' },
      { from: 'n30', to: 'n20', protocol: 'L' },
      { from: 'n30', to: 'n40', protocol: 'R' },
      { from: 'n70', to: 'n60', protocol: 'L' },
      { from: 'n70', to: 'n80', protocol: 'R' },
    ],
    packets: [],
    events: [],
    metrics: { inorder: '20,30,40,50,60,70,80', preorder: '50,30,20,40,70,60,80', postorder: '20,40,30,60,80,70,50' },
    traversal_type: 'inorder',
  };

  snap(steps, s, 'Tree Traversals: 3 DFS orders. Inorder = sorted. Preorder = structure copy. Postorder = delete order.', 1);

  // Inorder: left-root-right = sorted
  s.nodes[3].state = 'active';
  s.packets = [packet('n30', 'n20', 'visit')];
  s.events.push({ type: 'info', msg: 'Inorder DFS: visit left subtree first.' });
  snap(steps, s, 'Inorder (L-R-R): Visit left subtree of 50. Recursively visit left of 30.', 2);

  s.nodes[3].visited = true;
  s.nodes[3].state = 'ok';
  s.events.push({ type: 'ok', msg: '20 is leaf. Visit 20. Order: [20]' });
  snap(steps, s, 'Leaf 20 visited. Order: [20]. Backtrack to 30.', 3);

  s.nodes[1].state = 'active';
  s.events.push({ type: 'ok', msg: 'Back to 30. Visit root 30. Order: [20, 30]' });
  snap(steps, s, 'Visit 30 (root of left subtree). Order: [20, 30]. Now visit right.', 4);

  s.nodes[1].visited = true;
  s.nodes[1].state = 'ok';
  s.nodes[4].state = 'active';
  s.packets = [packet('n30', 'n40', 'visit')];
  s.events.push({ type: 'ok', msg: 'Visit right subtree of 30. Visit 40. Order: [20, 30, 40]' });
  snap(steps, s, 'Visit 40 (right of 30). Order: [20, 30, 40]. Backtrack to 50.', 5);

  s.nodes[4].visited = true;
  s.nodes[4].state = 'ok';
  s.nodes[0].state = 'active';
  s.events.push({ type: 'ok', msg: 'Back to 50. Visit root 50. Order: [20, 30, 40, 50]' });
  snap(steps, s, 'Visit 50 (root). Order: [20, 30, 40, 50]. Now right subtree.', 6);

  s.nodes[0].visited = true;
  s.nodes[0].state = 'ok';
  s.nodes[5].state = 'active';
  s.events.push({ type: 'ok', msg: 'Right subtree of 50: visit left 60. Order: [20, 30, 40, 50, 60]' });
  snap(steps, s, 'Visit 60 (left of 70). Order: [20, 30, 40, 50, 60]. Visit 70.', 7);

  s.nodes[5].visited = true;
  s.nodes[5].state = 'ok';
  s.nodes[2].state = 'active';
  s.events.push({ type: 'ok', msg: 'Visit root 70. Order: [20, 30, 40, 50, 60, 70]' });
  snap(steps, s, 'Visit 70. Order: [20, 30, 40, 50, 60, 70]. Visit right 80.', 8);

  s.nodes[2].visited = true;
  s.nodes[2].state = 'ok';
  s.nodes[6].state = 'active';
  s.events.push({ type: 'ok', msg: 'Visit 80. Inorder complete: [20, 30, 40, 50, 60, 70, 80] = SORTED!' });
  snap(steps, s, 'Inorder complete: [20, 30, 40, 50, 60, 70, 80]. Output sorted naturally!', 9);

  return steps;
}

const CODE = [
  '// Inorder: left → root → right = sorted',
  'function inorder(node) {',
  '  if (!node) return;',
  '  inorder(node.left);',
  '  console.log(node.val);',
  '  inorder(node.right);',
  '}',
  '',
  '// Preorder: root → left → right = copy structure',
  'function preorder(node) {',
  '  if (!node) return;',
  '  console.log(node.val);',
  '  preorder(node.left);',
  '  preorder(node.right);',
  '}',
  '',
  '// Postorder: left → right → root = delete',
  'function postorder(node) {',
  '  if (!node) return;',
  '  postorder(node.left);',
  '  postorder(node.right);',
  '  console.log(node.val);',
  '}',
  '',
  '// Level-order (BFS): use queue',
  'function levelorder(root) {',
  '  const q = [root];',
  '  while (q.length) {',
  '    const n = q.shift();',
  '    console.log(n.val);',
  '    if (n.left) q.push(n.left);',
  '    if (n.right) q.push(n.right);',
  '  }',
  '}',
];

export default {
  id: 'traversals',
  label: 'Tree Traversals (Inorder/Preorder/Postorder)',
  icon: '🌳',
  build: buildTraversalSteps,
  code: CODE,
  language: 'JavaScript',
  concepts: TREE_CONCEPTS,
  codeNotes: [
    { title: 'Inorder (L-R-R)', content: 'Visit left subtree, then root, then right. BST inorder = sorted values. Essential for dump/export.' },
    { title: 'Preorder (R-L-R)', content: 'Visit root, then left, then right. Encodes tree structure for serialization. Used in copy/clone algorithms.' },
    { title: 'Postorder (L-R-R)', content: 'Visit left, right, then root. Root visited last = safe deletion order. Useful for freeing memory bottom-up.' },
    { title: 'Level-order (BFS)', content: 'Use queue, visit all nodes at each depth. Breadth-first vs depth-first DFS. Good for printing tree structure.' },
  ],
  tradeoffs: [
    { pro: 'Inorder gives sorted data naturally', con: 'Only works for BST; general tree inorder not meaningful.' },
    { pro: 'Preorder efficient for tree copy', con: 'Requires reconstruction logic to rebuild tree from preorder sequence.' },
    { pro: 'Postorder safe for deletion (children first)', con: 'Harder to think about; not needed in garbage-collected languages.' },
    { pro: 'All three are O(n) time, O(h) space', con: 'Recursive stack overflow risk on deep trees (use iterative with explicit stack).' },
  ],
  bestPractices: [
    'For BST dump to sorted list: always use inorder. Verifies BST property: sorted output = valid BST.',
    'For tree serialization: preorder + record null markers. Enables exact reconstruction (e.g., "50,30,20,null,null,40,null,null,70,...").',
    'Use iterative traversals (explicit stack) for very deep trees to avoid stack overflow. Recursion elegant but fragile on deep data.',
    'For deletion heavy workload: postorder traversal during cleanup. Avoids dangling pointers in parent nodes.',
    'Level-order useful for tree printing/visualization and checking tree balance (depth per level).',
  ],
  metrics: [
    { key: 'inorder', label: 'Inorder', max: 7, color: 'var(--node-default)' },
    { key: 'preorder', label: 'Preorder', max: 7, color: 'var(--pod-running)' },
    { key: 'postorder', label: 'Postorder', max: 7, color: 'var(--node-comparing)' },
  ],
};

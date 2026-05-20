export const TREE_CONCEPTS = [
  { title: 'BST Property', content: 'Left child < parent < right child. Enables O(log n) search. Unbalanced BST degrades to O(n) linked list.' },
  { title: 'Traversals', content: 'Inorder: left-root-right = sorted. Preorder: root-left-right = copy. Postorder: left-right-root = delete. Each O(n) time.' },
  { title: 'Balancing', content: 'AVL maintains height diff ≤1 (rotations restore balance). Red-Black weaker: height ~2 log n. Trade-off: rotations vs simpler logic.' },
  { title: 'Space Complexity', content: 'Tree node = O(n) space. Balanced tree height = O(log n). Unbalanced chain = O(n) height.' },
];

export const BST_TRADEOFFS = [
  { pro: 'Simple to implement', con: 'Unbalanced insertion degrades to O(n) lookup.' },
  { pro: 'Inorder gives sorted sequence naturally', con: 'Requires full tree traversal O(n) for kth smallest.' },
  { pro: 'Good for range queries (values in range)', con: 'No better than binary search on sorted array.' },
  { pro: 'Efficient if insertions random', con: 'Sequential or reverse insertions create skewed trees.' },
];

export const ROTATION_CODE = [
  '// Right rotation (balance left-heavy)',
  'function rotateRight(node) {',
  '  const left = node.left;',
  '  node.left = left.right;',
  '  left.right = node;',
  '  return left;',
  '}',
  '',
  '// Left rotation (balance right-heavy)',
  'function rotateLeft(node) {',
  '  const right = node.right;',
  '  node.right = right.left;',
  '  right.left = node;',
  '  return right;',
  '}',
  '',
  '// AVL height',
  'function getHeight(node) {',
  '  return node ? 1 + Math.max(',
  '    getHeight(node.left),',
  '    getHeight(node.right)) : 0;',
  '}',
];

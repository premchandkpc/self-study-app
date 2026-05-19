// BST operations — returns step snapshots

function insert(root, val) {
  if (!root) return { val, left: null, right: null, id: val };
  if (val < root.val) return { ...root, left: insert(root.left, val) };
  if (val > root.val) return { ...root, right: insert(root.right, val) };
  return root;
}

function cloneTree(node) {
  if (!node) return null;
  return { ...node, left: cloneTree(node.left), right: cloneTree(node.right) };
}

function setNodeState(root, val, state) {
  if (!root) return null;
  return {
    ...root,
    state: root.val === val ? state : root.state,
    left: setNodeState(root.left, val, state),
    right: setNodeState(root.right, val, state),
  };
}

function resetStates(root) {
  if (!root) return null;
  return { ...root, state: 'default', left: resetStates(root.left), right: resetStates(root.right) };
}

export function buildInsertSteps(values = [50, 30, 70, 20, 40, 60, 80]) {
  const steps = [];
  let root = null;

  for (const val of values) {
    // trace insertion path
    let curr = root;
    const path = [];

    while (curr) {
      path.push(curr.val);
      if (val < curr.val) curr = curr.left;
      else if (val > curr.val) curr = curr.right;
      else break;
    }

    // snapshot each comparison
    for (let i = 0; i < path.length; i++) {
      let display = cloneTree(root);
      for (let j = 0; j <= i; j++) {
        display = setNodeState(display, path[j], j < i ? 'visited' : 'active');
      }
      steps.push({
        tree: display,
        narration: `Insert ${val}: compare with ${path[i]} → go ${val < path[i] ? 'left' : 'right'}.`,
        codeLine: val < path[i] ? 4 : 5,
        complexity: { ops: steps.length + 1, label: 'O(log n)', space: 'O(n)' },
      });
    }

    root = insert(root, val);
    let display = resetStates(cloneTree(root));
    display = setNodeState(display, val, 'done');
    steps.push({
      tree: display,
      narration: `${val} inserted at ${path.length === 0 ? 'root' : `leaf (parent: ${path[path.length - 1]})`}.`,
      codeLine: 2,
      complexity: { ops: steps.length + 1, label: 'O(log n)', space: 'O(n)' },
    });
  }

  steps.push({
    tree: resetStates(cloneTree(root)),
    narration: 'BST complete. Inorder traversal gives sorted sequence.',
    codeLine: null,
    complexity: { ops: values.length, label: 'O(n log n)', space: 'O(n)' },
  });

  return steps;
}

export function buildTraversalSteps(root, order = 'inorder') {
  const steps = [];
  const visited = [];

  function snap(tree, curr, narration, codeLine) {
    steps.push({
      tree: setNodeState(resetStates(cloneTree(tree)), curr?.val, 'active'),
      visited: [...visited],
      narration,
      codeLine,
      complexity: { ops: steps.length + 1, label: 'O(n)', space: 'O(h)' },
    });
  }

  function inorder(node) {
    if (!node) return;
    inorder(node.left);
    visited.push(node.val);
    snap(root, node, `Inorder: visit ${node.val}. Left done → visit → go right.`, 3);
    inorder(node.right);
  }

  function preorder(node) {
    if (!node) return;
    visited.push(node.val);
    snap(root, node, `Preorder: visit ${node.val} first, then subtrees.`, 2);
    preorder(node.left);
    preorder(node.right);
  }

  function postorder(node) {
    if (!node) return;
    postorder(node.left);
    postorder(node.right);
    visited.push(node.val);
    snap(root, node, `Postorder: visit ${node.val} after both subtrees.`, 4);
  }

  if (order === 'inorder')   inorder(root);
  if (order === 'preorder')  preorder(root);
  if (order === 'postorder') postorder(root);

  return steps;
}

// Assign x,y positions for SVG rendering
export function layoutTree(root, x = 300, y = 40, spread = 140) {
  if (!root) return null;
  return {
    ...root,
    x, y,
    left:  layoutTree(root.left,  x - spread, y + 70, spread / 2),
    right: layoutTree(root.right, x + spread, y + 70, spread / 2),
  };
}

export const INSERT_CODE = [
  'function insert(root, val) {',
  '  if (!root) return new Node(val);',
  '  if (val === root.val) return root;',
  '  if (val < root.val)',
  '    root.left = insert(root.left, val);',
  '  else',
  '    root.right = insert(root.right, val);',
  '  return root;',
  '}',
];

export const TRAVERSAL_CODE = {
  inorder:   ['function inorder(node) {', '  if (!node) return;', '  inorder(node.left);', '  visit(node);', '  inorder(node.right);', '}'],
  preorder:  ['function preorder(node) {', '  if (!node) return;', '  visit(node);', '  preorder(node.left);', '  preorder(node.right);', '}'],
  postorder: ['function postorder(node) {', '  if (!node) return;', '  postorder(node.left);', '  postorder(node.right);', '  visit(node);', '}'],
};

const _DEFAULT = [50, 30, 70, 20, 40, 60, 80];
function _buildBST(values) {
  let root = null;
  for (const v of values) root = insert(root, v);
  return root;
}

export const SCENARIOS = [
  { id: 'insert',   label: 'BST Insert',  icon: '➕', build: () => buildInsertSteps(_DEFAULT),                       code: INSERT_CODE,             language: 'JavaScript' },
  { id: 'inorder',  label: 'Inorder',     icon: '↙',  build: () => buildTraversalSteps(_buildBST(_DEFAULT), 'inorder'),   code: TRAVERSAL_CODE.inorder,  language: 'JavaScript' },
  { id: 'preorder', label: 'Preorder',    icon: '↖',  build: () => buildTraversalSteps(_buildBST(_DEFAULT), 'preorder'),  code: TRAVERSAL_CODE.preorder, language: 'JavaScript' },
  { id: 'postorder',label: 'Postorder',   icon: '↘',  build: () => buildTraversalSteps(_buildBST(_DEFAULT), 'postorder'), code: TRAVERSAL_CODE.postorder,language: 'JavaScript' },
];

import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';

const _mk = createNodeFactory({ default: '●' });
const arrNode = _mk('default');

function buildPermutationsSteps() {
  const steps = [];
  const s = {
    nodes: [
      arrNode('n1', '1', 100, 50, {}),
      arrNode('n2', '2', 150, 50, {}),
      arrNode('n3', '3', 200, 50, {}),
    ],
    edges: [],
    packets: [],
    events: [],
    metrics: { index: 0, path: '[]', perms: 0, depth: 0 },
  };

  snap(steps, s, 'Permutations: Backtracking generates all n! orderings. Choose/use/unchoose pattern.', 1);

  s.nodes[0].state = 'active';
  s.packets = [packet('n1', 'n1', 'index 0')];
  s.metrics.index = 0;
  s.metrics.path = '[1]';
  s.metrics.depth = 1;
  s.events.push({ type: 'info', msg: 'Index 0: Choose element 1. Path: [1]. Swap arr[0] ↔ arr[0]. Recurse to index 1.' });
  snap(steps, s, 'Choose 1. Path: [1]. Swap arr[0]↔arr[0]. Recurse next index.', 2);

  s.nodes[1].state = 'active';
  s.packets = [packet('n2', 'n2', 'index 1')];
  s.metrics.index = 1;
  s.metrics.path = '[1,2]';
  s.metrics.depth = 2;
  s.events.push({ type: 'info', msg: 'Index 1: Choose element 2. Path: [1,2]. Swap arr[1] ↔ arr[1]. Recurse to index 2.' });
  snap(steps, s, 'Choose 2. Path: [1,2]. Swap arr[1]↔arr[1]. Recurse.', 3);

  s.nodes[2].state = 'active';
  s.packets = [packet('n3', 'n3', 'index 2')];
  s.metrics.index = 2;
  s.metrics.path = '[1,2,3]';
  s.metrics.depth = 3;
  s.metrics.perms = 1;
  s.events.push({ type: 'ok', msg: 'Index 2 (end): Permutation found: [1,2,3]. Store. Backtrack (undo swap).' });
  snap(steps, s, 'Index 2 (end): Permutation [1,2,3] complete. Save. Backtrack.', 4);

  s.nodes[2].state = 'normal';
  s.metrics.index = 1;
  s.metrics.path = '[1,3]';
  s.packets = [packet('n2', 'n3', 'choose 3')];
  s.events.push({ type: 'info', msg: 'Backtrack to index 1. Next: choose element 3. Swap arr[1] ↔ arr[2]. Recurse.' });
  snap(steps, s, 'Backtrack to index 1. Swap arr[1]↔arr[2]. Path: [1,3,...].', 5);

  s.nodes[1].state = 'active';
  s.packets = [packet('n3', 'n2', 'permutation [1,3,2]')];
  s.metrics.index = 2;
  s.metrics.path = '[1,3,2]';
  s.metrics.perms = 2;
  s.events.push({ type: 'ok', msg: 'Permutation: [1,3,2]. Save. Backtrack. Undo swap (arr[1] ↔ arr[2]).' });
  snap(steps, s, 'Permutation [1,3,2] complete. Save. Backtrack, undo swap.', 6);

  s.metrics.index = 0;
  s.packets = [packet('n1', 'n2', 'choose 2 (next)')];
  s.events.push({ type: 'info', msg: 'Backtrack to index 0. Next: choose element 2. Swap arr[0] ↔ arr[1]. Recurse.' });
  snap(steps, s, 'Backtrack to index 0. Swap arr[0]↔arr[1]. Choose 2. Path: [2,...].', 7);

  s.metrics.path = '[2]';
  s.metrics.depth = 1;
  s.packets = [packet('n2', 'n2', 'path continues')];
  s.events.push({ type: 'info', msg: 'Choose 2, continue to indices 1-2. Find [2,1,3] and [2,3,1].' });
  snap(steps, s, 'Continue DFS: [2,1,3], [2,3,1] found. Perms: 4.', 8);

  s.metrics.path = '[3]';
  s.metrics.perms = 6;
  s.metrics.depth = 0;
  s.packets = [packet('n3', 'n3', 'final permutations')];
  s.events.push({ type: 'ok', msg: 'Final: [3,1,2], [3,2,1]. All 3! = 6 permutations generated. DFS tree complete.' });
  snap(steps, s, 'All permutations: [1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]. Total: 6.', 9);

  return steps;
}

const CODE = [
  'permute(arr, index) {',
  '  if (index === arr.length - 1) {',
  '    results.push([...arr]); // Found permutation',
  '    return;',
  '  }',
  '',
  '  for (let i = index; i < arr.length; i++) {',
  '    // Choose: swap',
  '    [arr[index], arr[i]] = [arr[i], arr[index]];',
  '',
  '    // Explore: recurse',
  '    permute(arr, index + 1);',
  '',
  '    // Unchoose: swap back',
  '    [arr[index], arr[i]] = [arr[i], arr[index]];',
  '  }',
  '}',
];

export default {
  id: 'permutations',
  label: 'Permutations: Choose-Explore-Unchoose',
  icon: '🔄',
  build: buildPermutationsSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'index', label: 'Current Index', max: 5, color: 'var(--node-default)' },
    { key: 'path', label: 'Path', max: 1, color: 'var(--node-comparing)' },
    { key: 'perms', label: 'Permutations Found', max: 24, color: 'var(--pod-running)' },
    { key: 'depth', label: 'Recursion Depth', max: 5, color: 'var(--node-active)' },
  ],
  codeNotes: [
    { title: 'Choose-Explore-Unchoose Pattern', content: 'Choose: make swap (arr[i]↔arr[index]). Explore: recurse on next index. Unchoose: undo swap. Restores array state for next iteration.' },
    { title: 'DFS Tree: O(n!) leaves', content: 'Tree has depth n. Each level branches n, n-1, ..., 1 times. Total leaves = n!. Each leaf = one permutation.' },
    { title: 'Time: O(n·n!)', content: 'Generate n! permutations. Copy each = O(n). Total: O(n·n!). Space: O(n) recursion stack.' },
    { title: 'In-Place Swapping', content: 'Swap arr[index] with arr[i]. No extra array. After recursion: swap back. Simplifies state management.' },
  ],
  tradeoffs: [
    { pro: 'In-place generation', con: 'Modifies input array during recursion (requires care if array used elsewhere).' },
    { pro: 'Generates all permutations', con: 'O(n!) inherently exponential. Slow for n>10. No pruning possible (all are valid).' },
    { pro: 'DFS natural for backtracking', con: 'BFS permutation generation exists but less intuitive.' },
    { pro: 'Easy to extend (combinations, subsets)', con: 'Minor tweaks needed. Different problem = different termination condition.' },
  ],
  bestPractices: [
    'Template: for any backtracking, follow choose→explore→unchoose. Apply to N-Queens, Sudoku, subsets, permutations.',
    'Optimization: if generating permutations of large arrays, use lexicographic order (next_permutation algorithm) instead of recursive DFS.',
    'Space: if only counting permutations, don\'t store results. Recursive function returns count. Saves O(n!) storage.',
    'Interview: code permutation problem from scratch (shows mastery). Explain choose→explore→unchoose clearly. Complexity = O(n·n!) time/space.',
    'Variants: permutations with repetition (n^k), combinations C(n,k), subsets 2^n. All follow same pattern with different termination/iteration logic.',
  ],
};

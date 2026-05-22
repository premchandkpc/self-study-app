import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';

const _mk = createNodeFactory({ default: '●', queen: '👑', invalid: '✗' });
const boardCell = _mk('default');
const queenCell = _mk('queen');
const invalidCell = _mk('invalid');

function buildNQueensSteps() {
  const steps = [];
  const s = {
    nodes: [
      boardCell('c00', '(0,0)', 100, 50, {}),
      boardCell('c01', '(0,1)', 150, 50, {}),
      boardCell('c02', '(0,2)', 200, 50, {}),
      boardCell('c03', '(0,3)', 250, 50, {}),
      boardCell('c10', '(1,0)', 100, 100, {}),
      boardCell('c11', '(1,1)', 150, 100, {}),
      boardCell('c12', '(1,2)', 200, 100, {}),
      boardCell('c13', '(1,3)', 250, 100, {}),
      boardCell('c20', '(2,0)', 100, 150, {}),
      boardCell('c21', '(2,1)', 150, 150, {}),
      boardCell('c22', '(2,2)', 200, 150, {}),
      boardCell('c23', '(2,3)', 250, 150, {}),
      boardCell('c30', '(3,0)', 100, 200, {}),
      boardCell('c31', '(3,1)', 150, 200, {}),
      boardCell('c32', '(3,2)', 200, 200, {}),
      boardCell('c33', '(3,3)', 250, 200, {}),
    ],
    edges: [],
    packets: [],
    events: [],
    metrics: { row: 0, queens_placed: 0, backtracks: 0, solutions: 0 },
  };

  snap(steps, s, 'N-Queens: Backtracking with constraint checking. Place n queens on n×n board. No two attack.', 1);

  s.nodes[0].state = 'active';
  s.packets = [packet('c00', 'c00', 'place queen at (0,0)')];
  s.metrics.row = 0;
  s.metrics.queens_placed = 1;
  s.events.push({ type: 'info', msg: 'Row 0: Try column 0. Place queen at (0,0). Mark attacked squares.' });
  snap(steps, s, 'Row 0, Col 0: Queen placed. (0,*), (*,0), diagonals marked attacked.', 2);

  s.nodes[5].state = 'invalid';
  s.nodes[9].state = 'invalid';
  s.nodes[12].state = 'invalid';
  s.packets = [packet('c00', 'c10', 'attacked cells')];
  s.events.push({ type: 'info', msg: 'Attacked cells: (1,0) down, (1,1) diagonal. Mark forbidden.' });
  snap(steps, s, 'Attacked cells: (1,0), (1,1), (0,1), (0,2), (0,3). Row 1 can\'t use col 0 or 1.', 3);

  s.nodes[7].state = 'active';
  s.packets = [packet('c10', 'c13', 'row 1: try col 2 (skip col 0,1)')];
  s.metrics.row = 1;
  s.metrics.queens_placed = 2;
  s.events.push({ type: 'info', msg: 'Row 1: Columns 0, 1 attacked. Try column 2. Place queen at (1,2). Check row 2.' });
  snap(steps, s, 'Row 1, Col 2: Queen placed. (1,*), (*,2) marked. Diagonals attacked.', 4);

  s.nodes[8].state = 'invalid';
  s.nodes[10].state = 'invalid';
  s.packets = [packet('c12', 'c22', 'attacked: diagonal (2,1), (2,3)')];
  s.events.push({ type: 'warn', msg: 'Row 2: all columns attacked by row 0 queen, row 1 queen, or diagonals. Backtrack!' });
  snap(steps, s, 'Row 2: ALL columns attacked. No valid placement. BACKTRACK.', 5);

  s.nodes[7].state = 'active';
  s.packets = [packet('c12', 'c12', 'backtrack: remove (1,2)')];
  s.metrics.backtracks = 1;
  s.metrics.queens_placed = 1;
  s.events.push({ type: 'warn', msg: 'Backtrack: Remove queen at (1,2). Try next column in row 1.' });
  snap(steps, s, 'Backtrack from row 1. Restore state. Try row 1, col 3 next.', 6);

  s.nodes[7].state = 'active';
  s.packets = [packet('c10', 'c13', 'row 1: col 3')];
  s.metrics.queens_placed = 2;
  s.events.push({ type: 'info', msg: 'Row 1, Col 3: Place queen at (1,3). Check row 2 feasibility.' });
  snap(steps, s, 'Row 1, Col 3: Queen placed. (1,*), (*,3) marked.', 7);

  s.nodes[8].state = 'active';
  s.packets = [packet('c13', 'c20', 'row 2: col 0 safe')];
  s.metrics.row = 2;
  s.metrics.queens_placed = 3;
  s.events.push({ type: 'info', msg: 'Row 2: Column 0 not attacked. Place queen at (2,0). Progress to row 3.' });
  snap(steps, s, 'Row 2, Col 0: Queen placed. Three queens, proceed.', 8);

  s.nodes[12].state = 'active';
  s.packets = [packet('c20', 'c30', 'row 3: col 1')];
  s.metrics.row = 3;
  s.metrics.queens_placed = 4;
  s.events.push({ type: 'ok', msg: 'Row 3, Col 1: Place final queen. All 4 queens placed! No conflicts. Solution found.' });
  snap(steps, s, 'Row 3, Col 1: 4th queen placed. Solution 1: (0,0), (1,3), (2,0), (3,1). ✓', 9);

  s.metrics.solutions = 1;
  s.events.push({ type: 'ok', msg: 'Solution count: 1 (for 4-Queens, total 2 solutions exist). Continue to find all.' });
  snap(steps, s, 'Solution recorded. Backtrack to find remaining solutions.', 10);

  return steps;
}

const CODE = [
  'solve(board, row) {',
  '  if (row === n) {',
  '    return 1; // Found solution',
  '  }',
  '',
  '  count = 0;',
  '  for (const col of [0...n-1]) {',
  '    if (isSafe(board, row, col)) {',
  '      place(board, row, col);',
  '      count += solve(board, row + 1);',
  '      remove(board, row, col); // Backtrack',
  '    }',
  '  }',
  '  return count;',
  '}',
  '',
  'isSafe(board, row, col) {',
  '  // Check column',
  '  if (board[*][col] === queen) return false;',
  '  // Check diagonals',
  '  if (board[row-i][col-i] === queen) return false;',
  '  // ... more diagonal checks',
  '  return true;',
  '}',
];

export default {
  id: 'nqueens',
  label: 'N-Queens: Constraint Backtracking',
  icon: '👑',
  build: buildNQueensSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'row', label: 'Current Row', max: 8, color: 'var(--node-default)' },
    { key: 'queens_placed', label: 'Queens Placed', max: 8, color: 'var(--pod-running)' },
    { key: 'backtracks', label: 'Backtracks', max: 50, color: 'var(--text-warn)' },
    { key: 'solutions', label: 'Solutions Found', max: 10, color: 'var(--pod-running)' },
  ],
  codeNotes: [
    { title: 'Backtracking Strategy', content: 'Place queens row by row. For each row, try each column. Check if safe (no column/diagonal conflicts). If safe: recurse next row. Else: backtrack (undo, try next column).' },
    { title: 'Constraint Checking: isSafe', content: 'Check column: no queens below in same column. Check diagonals: no queens on two diagonals (↖↗, ↙↘). O(n) check per placement.' },
    { title: 'Time: O(n!)', content: 'Worst case: try all n! permutations. With pruning (constraint checking): much faster in practice (pruning factor ~0.1-0.5).' },
    { title: 'Space: O(n) call stack', content: 'Recursion depth = n. Each frame stores row, col, board state. Backtracking = implicit via recursion unwinding.' },
  ],
  tradeoffs: [
    { pro: 'Simple recursive logic', con: 'Exponential time: impractical for large n (n>12 slow).' },
    { pro: 'Easy to understand and code', con: 'Naive backtracking explores many dead-end paths. Constraint propagation could reduce search space.' },
    { pro: 'Finds all solutions', con: 'If only 1 solution needed, early exit wastes cycles.' },
    { pro: 'No extra data structure (implicit backtrack)', con: 'Call stack overhead. Explicit DP table might be faster for some variants.' },
  ],
  bestPractices: [
    'Pruning: constraint check early. Don\'t place queen, then check legality after. Check BEFORE placing to skip bad branches.',
    'Symmetry breaking: exploit board symmetries. E.g., first queen must be in first half of first row (n solutions reduced by 8x for reflections).',
    'Memoization: state = (row, column_bitmask, diagonal_bitmasks). Cache: "with this state, how many solutions?". Speeds up identical subproblems.',
    'Interview tip: explain backtracking structure first (place, check, recurse, undo). Then code the constraint check (isSafe). Practice time management.',
    'N-Queens optimization: use bitmasks for column/diagonal tracking. O(n²) time per placement → O(n) via bit ops. Dramatically faster for n>8.',
  ],
};

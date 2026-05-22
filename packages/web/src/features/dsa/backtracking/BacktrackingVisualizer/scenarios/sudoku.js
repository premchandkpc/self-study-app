import { snap, packet, createNodeFactory } from '@/core/utils/scenarioShared';

const _mk = createNodeFactory({ default: '●', filled: '✓' });
const cell = _mk('default');

function buildSudokuSteps() {
  const steps = [];
  const s = {
    nodes: [
      cell('c00', '5', 50, 50, {}),
      cell('c01', '?', 80, 50, {}),
      cell('c02', '3', 110, 50, {}),
      cell('c10', '?', 50, 80, {}),
      cell('c11', '7', 80, 80, {}),
      cell('c12', '?', 110, 80, {}),
      cell('c20', '?', 50, 110, {}),
      cell('c21', '6', 80, 110, {}),
      cell('c22', '1', 110, 110, {}),
    ],
    edges: [],
    packets: [],
    events: [],
    metrics: { empty: 4, filled: 5, backtracks: 0, solved: false },
  };

  snap(steps, s, 'Sudoku Backtracking: Fill 9×9 grid. Constraints: row/col/box unique digits.', 1);

  s.nodes[1].state = 'active';
  s.packets = [packet('c01', 'c01', 'cell (0,1) empty')];
  s.metrics.empty = 4;
  s.events.push({ type: 'info', msg: 'Find first empty cell (0,1). Constraints: row 0 has [5,3], col 1 has [7,6], box has [5,3,7,1].' });
  snap(steps, s, 'Cell (0,1): Try digits 1-9. Row has [5,3]. Col has [7,6]. Box has [5,3,7,1].', 2);

  s.packets = [packet('c01', 'c01', 'try digit 2')];
  s.events.push({ type: 'info', msg: 'Try digit 2: not in row, col, or box. Place 2 at (0,1). Recurse.' });
  snap(steps, s, 'Try digit 2: valid. Place 2. empty count: 4→3. Move to next cell.', 3);

  s.nodes[1].state = 'ok';
  s.nodes[3].state = 'active';
  s.packets = [packet('c10', 'c10', 'cell (1,0) empty')];
  s.metrics.empty = 3;
  s.metrics.filled = 6;
  s.events.push({ type: 'info', msg: 'Cell (1,0): Row 1 has [7], col 0 has [5]. Box has [5,2,3,7,6,1]. Try 1-9.' });
  snap(steps, s, 'Cell (1,0): Row has [7]. Col has [5]. Box has [5,2,3,7,6,1]. Try valid digits.', 4);

  s.packets = [packet('c10', 'c10', 'try digit 1')];
  s.events.push({ type: 'info', msg: 'Try digit 1: in box (row 0-2, col 0-2) already has 1 at (2,2). Invalid. Backtrack.' });
  snap(steps, s, 'Try digit 1: INVALID (box conflict). Backtrack from (1,0). Try next digit.', 5);

  s.metrics.backtracks = 1;
  s.packets = [packet('c10', 'c10', 'try digit 4')];
  s.events.push({ type: 'info', msg: 'Try digit 4: not in row, col, or box. Place 4. Recurse.' });
  snap(steps, s, 'Try digit 4: valid. Place 4. Move to (1,2).', 6);

  s.nodes[3].state = 'ok';
  s.nodes[5].state = 'active';
  s.packets = [packet('c12', 'c12', 'cell (1,2) empty')];
  s.metrics.filled = 7;
  s.events.push({ type: 'warn', msg: 'Cell (1,2): Row 1 has [4,7]. Col 2 has [3,1]. Box has [5,2,3,4,7,6,1]. Try 1-9.' });
  snap(steps, s, 'Cell (1,2): Remaining digits = 6,8,9. All valid for row/col/box.', 7);

  s.packets = [packet('c12', 'c12', 'try digit 6')];
  s.events.push({ type: 'info', msg: 'Try digit 6: valid. Place 6. Continue filling.' });
  snap(steps, s, 'Try digit 6: valid. Place 6. one cell left.', 8);

  s.nodes[5].state = 'ok';
  s.nodes[6].state = 'active';
  s.packets = [packet('c20', 'c20', 'cell (2,0) empty (last)')];
  s.metrics.empty = 1;
  s.metrics.filled = 8;
  s.events.push({ type: 'info', msg: 'Cell (2,0): Last empty. Row 2 has [6,1]. Col 0 has [5,4]. Box has [5,2,3,4,7,6,1]. Only valid: 8 or 9.' });
  snap(steps, s, 'Cell (2,0): Only digit 8 remains valid. Fill 8.', 9);

  s.nodes[6].state = 'ok';
  s.metrics.empty = 0;
  s.metrics.solved = true;
  s.metrics.filled = 9;
  s.events.push({ type: 'ok', msg: 'All cells filled! Puzzle solved. Unique solution found. Total backtracks: 1.' });
  snap(steps, s, 'Sudoku Solved! All constraints satisfied. Backtracks: 1 (minimal due to constraint propagation).', 10);

  return steps;
}

const CODE = [
  'solve(grid) {',
  '  const [row, col] = findEmpty(grid);',
  '  if (row === -1) return true; // Solved',
  '',
  '  for (const digit of [1...9]) {',
  '    if (isValid(grid, row, col, digit)) {',
  '      grid[row][col] = digit;',
  '      if (solve(grid)) return true;',
  '      grid[row][col] = 0; // Backtrack',
  '    }',
  '  }',
  '  return false;',
  '}',
  '',
  'isValid(grid, row, col, digit) {',
  '  // Check row',
  '  if (grid[row].includes(digit)) return false;',
  '  // Check column',
  '  if (grid[*][col].includes(digit)) return false;',
  '  // Check 3×3 box',
  '  const boxRow = (row // 3) * 3;',
  '  const boxCol = (col // 3) * 3;',
  '  for (let r = boxRow; r < boxRow+3; r++) {',
  '    for (let c = boxCol; c < boxCol+3; c++) {',
  '      if (grid[r][c] === digit) return false;',
  '    }',
  '  }',
  '  return true;',
  '}',
];

export default {
  id: 'sudoku',
  label: 'Sudoku: Multi-Constraint Backtracking',
  icon: '📋',
  build: buildSudokuSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'empty', label: 'Empty Cells', max: 81, color: 'var(--text-muted)' },
    { key: 'filled', label: 'Filled Cells', max: 81, color: 'var(--pod-running)' },
    { key: 'backtracks', label: 'Backtracks', max: 100, color: 'var(--text-warn)' },
    { key: 'solved', label: 'Solved', max: 1, color: 'var(--pod-running)' },
  ],
  codeNotes: [
    { title: 'Multi-Constraint Backtracking', content: 'Find empty cell. Try digits 1-9. Check: row unique, column unique, 3×3 box unique. If all valid: place, recurse. Else: try next digit. If no digit works: backtrack.' },
    { title: 'Constraint Checking: O(1)', content: 'Each constraint check = O(1) if using bitmask (digit already in row/col/box?). Alternatively, O(9) for row/col/box iteration.' },
    { title: 'Time: O(9^m)', content: 'Worst case: m empty cells, 9 choices per cell. With pruning: much faster. Average Sudoku: <100 backtracks.' },
    { title: 'Optimization: Constraint Propagation', content: 'Don\'t randomly pick digit. Try cell with fewest valid candidates (minimum remaining values heuristic). Cuts search space 10-100x.' },
  ],
  tradeoffs: [
    { pro: 'Solves any valid Sudoku', con: 'Naive approach slow on hard puzzles (1000+ backtracks). Constraint propagation essential.' },
    { pro: 'Simple recursive structure', con: 'O(9^81) theoretical worst case. Pruning vital for practical speed.' },
    { pro: 'No pre-computation needed', con: 'Each solve from scratch. Pre-computing constraint graph marginally faster.' },
    { pro: 'Works on variations (Killer, X-Sudoku)', con: 'More constraints = slower. Need smart heuristics (backtracking alone not enough).' },
  ],
  bestPractices: [
    'Constraint propagation: before backtracking, reduce candidate sets. Naked singles (cell with 1 candidate) + hidden singles (digit appears in only 1 cell in row/col/box) often solve puzzles without backtracking.',
    'Heuristic: pick empty cell with minimum remaining values (MRV). Tries cell with fewest candidates first. 50-100x faster than arbitrary order.',
    'Bitmask optimization: represent possible digits as 9-bit integer. Check "digit in candidates" = O(1). Iterate candidates = O(9) via bit operations.',
    'Interview tip: implement naive backtracking first (easy to code). Mention constraint propagation + MRV as optimizations (shows deep understanding).',
    'Hardest Sudoku (17 clues minimum): even optimized backtracking takes seconds. "AI Escargot" requires careful heuristic tuning. Know the limits.',
  ],
};

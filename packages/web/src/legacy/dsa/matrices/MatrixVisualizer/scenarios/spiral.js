import { snap, makeMatrix, cloneMatrix } from '@/core/utils/scenarioShared';

const VALUES = [
  [ 1,  2,  3,  4],
  [ 5,  6,  7,  8],
  [ 9, 10, 11, 12],
  [13, 14, 15, 16],
];

const CODE = [
  'function spiralOrder(matrix) {',
  '  const res = [];',
  '  let top=0, bot=m-1, left=0, right=n-1;',
  '  while (top <= bot && left <= right) {',
  '    for (c=left; c<=right; c++) res.push(mat[top][c]);',
  '    top++;',
  '    for (r=top; r<=bot; r++) res.push(mat[r][right]);',
  '    right--;',
  '    if (top<=bot) { for (c=right;c>=left;c--) res.push(mat[bot][c]); bot--; }',
  '    if (left<=right) { for (r=bot;r>=top;r--) res.push(mat[r][left]); left++; }',
  '  }',
  '  return res;',
  '}',
];

function build() {
  const steps = [];
  const ROWS = VALUES.length;
  const COLS = VALUES[0].length;

  let top = 0, bot = ROWS - 1, left = 0, right = COLS - 1;
  const result = [];
  const order = []; // [r,c] insertion order

  const s = {
    matrix: makeMatrix(VALUES),
    path: [],
    queue: [],
    vars: { top, bottom: bot, left, right, direction: 'right', result: [] },
    complexity: { ops: 0, label: 'O(m·n)', space: 'O(m·n)' },
  };

  snap(steps, s, `Spiral traversal of ${ROWS}×${COLS} matrix. top=${top}, bot=${bot}, left=${left}, right=${right}.`, 2);

  function push(r, c, direction) {
    result.push(VALUES[r][c]);
    order.push([r, c]);
    s.matrix = cloneMatrix(s.matrix);
    // mark visited
    order.slice(0, -1).forEach(([pr, pc]) => { s.matrix[pr][pc].state = 'visited'; });
    s.matrix[r][c].state = 'active';
    s.path = [...order];
    s.vars = { r, c, top, bottom: bot, left, right, direction, 'cell value': VALUES[r][c], result: [...result] };
    s.complexity = { ops: result.length, label: 'O(m·n)', space: 'O(m·n)' };
    snap(steps, s, `${direction}: visit [${r}][${c}]=${VALUES[r][c]}. result=[${result.join(',')}]`, direction === 'right' ? 4 : direction === 'down' ? 6 : direction === 'left' ? 8 : 9);
  }

  while (top <= bot && left <= right) {
    for (let c = left; c <= right; c++) push(top, c, 'right');
    top++;
    for (let r = top; r <= bot; r++) push(r, right, 'down');
    right--;
    if (top <= bot) { for (let c = right; c >= left; c--) push(bot, c, 'left'); bot--; }
    if (left <= right) { for (let r = bot; r >= top; r--) push(r, left, 'up'); left++; }
  }

  // Final — all result
  s.matrix = makeMatrix(VALUES);
  order.forEach(([r, c]) => { s.matrix[r][c].state = 'result'; });
  s.vars = { top, bottom: bot, left, right, direction: 'done', result };
  s.complexity = { ops: ROWS * COLS, label: 'O(m·n)', space: 'O(m·n)' };
  snap(steps, s, `Done! Spiral: [${result.join(', ')}]`, 11);

  return steps;
}

export default {
  id: 'spiral',
  label: 'Spiral Traversal',
  icon: '🌀',
  build,
  code: CODE,
  language: 'javascript',
  metrics: [],
};

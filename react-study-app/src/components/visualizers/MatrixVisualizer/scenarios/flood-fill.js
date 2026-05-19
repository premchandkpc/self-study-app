import { snap, makeMatrix, cloneMatrix } from './shared';

// 0=empty, 1=target color, 2=new color
const VALUES = [
  [0, 1, 1, 0],
  [0, 1, 1, 0],
  [0, 0, 1, 1],
  [1, 0, 0, 0],
];
const START_R = 0, START_C = 1;
const OLD_COLOR = 1, NEW_COLOR = 2;

const CODE = [
  'function floodFill(image, r, c, newColor) {',
  '  const oldColor = image[r][c];',
  '  if (oldColor === newColor) return image;',
  '  const queue = [[r, c]];',
  '  while (queue.length) {',
  '    const [cr, cc] = queue.shift();',
  '    if (image[cr][cc] !== oldColor) continue;',
  '    image[cr][cc] = newColor;',
  '    for (const [dr,dc] of dirs)',
  '      queue.push([cr+dr, cc+dc]);',
  '  }',
  '  return image;',
  '}',
];

const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

function build() {
  const steps = [];
  const ROWS = VALUES.length, COLS = VALUES[0].length;

  // working grid (mutable)
  const grid = VALUES.map((row) => [...row]);
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

  function toMatrix() {
    return grid.map((row, r) =>
      row.map((val, c) => {
        if (val === NEW_COLOR) return { val, state: 'filled' };
        if (val === OLD_COLOR) return { val, state: 'idle' };
        return { val, state: 'idle' };
      })
    );
  }

  const s = {
    matrix: toMatrix(),
    path: [],
    queue: [[START_R, START_C]],
    vars: { queue: [`[${START_R},${START_C}]`], visited: 0, color: OLD_COLOR, newColor: NEW_COLOR },
    complexity: { ops: 0, label: 'O(m·n)', space: 'O(m·n)' },
  };

  snap(steps, s, `Flood Fill BFS: start=(${START_R},${START_C}), color=${OLD_COLOR}→${NEW_COLOR}.`, 3);

  const queue = [[START_R, START_C]];
  let visitedCount = 0;

  while (queue.length) {
    const [r, c] = queue.shift();
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    if (grid[r][c] !== OLD_COLOR) continue;

    grid[r][c] = NEW_COLOR;
    visitedCount++;

    const newNeighbors = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === OLD_COLOR) {
        queue.push([nr, nc]);
        newNeighbors.push([nr, nc]);
      }
    }

    const mat = toMatrix();
    // highlight current cell as active
    mat[r][c] = { val: NEW_COLOR, state: 'active' };
    // highlight queue cells
    queue.forEach(([qr, qc]) => {
      if (qr >= 0 && qr < ROWS && qc >= 0 && qc < COLS && mat[qr][qc].state !== 'active' && mat[qr][qc].state !== 'filled') {
        mat[qr][qc] = { ...mat[qr][qc], state: 'queued' };
      }
    });

    s.matrix = mat;
    s.queue = queue.map(([qr, qc]) => `[${qr},${qc}]`);
    s.vars = {
      r, c,
      queue: queue.slice(0, 5).map(([qr, qc]) => `[${qr},${qc}]`),
      queueSize: queue.length,
      visited: visitedCount,
      color: OLD_COLOR,
      newColor: NEW_COLOR,
    };
    s.complexity = { ops: visitedCount, label: 'O(m·n)', space: 'O(m·n)' };
    snap(steps, s, `Fill [${r}][${c}]. Queue size=${queue.length}. Visited=${visitedCount}.`, 7);
  }

  // final
  const finalMat = toMatrix();
  s.matrix = finalMat;
  s.queue = [];
  s.vars = { queue: [], visited: visitedCount, color: OLD_COLOR, newColor: NEW_COLOR };
  s.complexity = { ops: visitedCount, label: 'O(m·n)', space: 'O(m·n)' };
  snap(steps, s, `Done! Flood fill complete. ${visitedCount} cells recolored from ${OLD_COLOR} to ${NEW_COLOR}.`, 11);

  return steps;
}

export default {
  id: 'flood-fill',
  label: 'Flood Fill',
  icon: '🎨',
  build,
  code: CODE,
  language: 'javascript',
  metrics: [],
};

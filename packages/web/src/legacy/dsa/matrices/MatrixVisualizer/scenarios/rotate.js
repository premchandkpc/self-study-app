import { snap } from '@/core/utils/scenarioShared';

const ORIGINAL = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

const CODE = [
  'function rotate90(matrix) {',
  '  const n = matrix.length;',
  '  // Step 1: Transpose',
  '  for (let i=0; i<n; i++)',
  '    for (let j=i+1; j<n; j++)',
  '      [matrix[i][j], matrix[j][i]] =',
  '      [matrix[j][i], matrix[i][j]];',
  '  // Step 2: Reverse each row',
  '  for (let i=0; i<n; i++)',
  '    matrix[i].reverse();',
  '}',
];

function build() {
  const steps = [];
  const N = 3;
  const mat = ORIGINAL.map((r) => [...r]);

  function toMatrix(active = [], swapping = []) {
    return mat.map((row, r) =>
      row.map((val, c) => {
        const isSwap = swapping.some(([sr, sc]) => sr === r && sc === c);
        const isActive = active.some(([ar, ac]) => ar === r && ac === c);
        return { val, state: isSwap ? 'active' : isActive ? 'visited' : 'idle' };
      })
    );
  }

  let s = {
    matrix: toMatrix(),
    path: [],
    queue: [],
    vars: { step: 'start', i: '-', j: '-', swapping: '-' },
    complexity: { ops: 0, label: 'O(n²)', space: 'O(1)' },
  };
  snap(steps, s, `Rotate 90° in-place. N=${N}. Two steps: transpose then reverse rows.`, 0);

  // Step 1: Transpose
  let ops = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      ops++;
      const origIJ = mat[i][j];
      const origJI = mat[j][i];
      const tmp = origIJ;
      mat[i][j] = origJI;
      mat[j][i] = tmp;

      s.matrix = toMatrix([], [[i, j], [j, i]]);
      s.vars = { step: 'transpose', i, j, tmp, 'mat[i][j]_before': origIJ, 'mat[j][i]_before': origJI, 'mat[i][j]_after': mat[i][j], 'mat[j][i]_after': mat[j][i] };
      s.complexity = { ops, label: 'O(n²)', space: 'O(1)' };
      snap(steps, s, `Transpose: swap mat[${i}][${j}] ↔ mat[${j}][${i}]`, 5);
    }
  }

  s.matrix = toMatrix();
  s.vars = { step: 'transposed', i: '-', j: '-', swapping: 'done' };
  snap(steps, s, 'Transpose complete. Now reverse each row to complete 90° rotation.', 7);

  // Step 2: Reverse each row
  for (let i = 0; i < N; i++) {
    mat[i].reverse();
    ops++;
    s.matrix = toMatrix([[i, 0], [i, 1], [i, 2]]);
    s.vars = { step: 'reverse', i, j: '-', 'row[i]': `[${mat[i].join(',')}]` };
    s.complexity = { ops, label: 'O(n²)', space: 'O(1)' };
    snap(steps, s, `Reverse row ${i}: [${mat[i].join(',')}]`, 9);
  }

  s.matrix = mat.map((row) => row.map((val) => ({ val, state: 'result' })));
  s.vars = { step: 'done', result: mat.map((r) => `[${r.join(',')}]`).join(' | ') };
  s.complexity = { ops, label: 'O(n²)', space: 'O(1)' };
  snap(steps, s, `Done! Matrix rotated 90° clockwise in-place.`, 10);

  return steps;
}

export default {
  id: 'rotate',
  label: 'Rotate 90°',
  icon: '🔄',
  build,
  code: CODE,
  language: 'javascript',
  metrics: [],
};

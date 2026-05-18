/** Shared helpers for MatrixVisualizer scenarios */

export function snap(steps, state, narration, codeLine = null) {
  steps.push({
    ...JSON.parse(JSON.stringify(state)),
    narration,
    codeLine,
    complexity: state.complexity ?? { ops: steps.length + 1, label: 'O(m·n)', space: 'O(m·n)' },
  });
}

/** Create a fresh rows×cols matrix with given values (2D array) */
export function makeMatrix(values) {
  return values.map((row) =>
    row.map((val) => ({ val, state: 'idle' }))
  );
}

/** Clone the matrix deeply */
export function cloneMatrix(matrix) {
  return matrix.map((row) => row.map((cell) => ({ ...cell })));
}

/** Set a single cell's state, returns new matrix */
export function setCellState(matrix, r, c, state) {
  const m = cloneMatrix(matrix);
  m[r][c] = { ...m[r][c], state };
  return m;
}

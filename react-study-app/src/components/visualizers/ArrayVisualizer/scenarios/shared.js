/** Shared helpers for ArrayVisualizer scenarios */

export function snap(steps, state, narration, codeLine = null) {
  steps.push({
    ...JSON.parse(JSON.stringify(state)),
    narration,
    codeLine,
    complexity: state.complexity ?? { ops: steps.length + 1, label: 'O(n)', space: 'O(1)' },
  });
}

export function makeArr(arr) {
  return arr.map((v, i) => ({ value: v, state: 'idle', index: i }));
}

export function setCellState(cells, idx, state) {
  return cells.map((c, i) => (i === idx ? { ...c, state } : c));
}

export function setRangeState(cells, lo, hi, state) {
  return cells.map((c, i) => (i >= lo && i <= hi ? { ...c, state } : c));
}

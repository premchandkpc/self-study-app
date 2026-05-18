/** Shared helpers for LinkedListVisualizer scenarios */

export function snap(steps, state, narration, codeLine = null) {
  steps.push({
    ...JSON.parse(JSON.stringify(state)),
    narration,
    codeLine,
    complexity: state.complexity ?? { ops: steps.length + 1, label: 'O(n)', space: 'O(1)' },
  });
}

/**
 * Build a node list array from values.
 * Each node: { id, val, state: 'idle'|'active'|'prev'|'curr'|'next'|'slow'|'fast'|'visited'|'done' }
 * nextIdx: index of next node (-1 = null, or index into nodes)
 */
export function makeList(values, cycleTarget = -1) {
  return values.map((val, i) => ({
    id: i,
    val,
    state: 'idle',
    nextIdx: i < values.length - 1 ? i + 1 : cycleTarget,
  }));
}

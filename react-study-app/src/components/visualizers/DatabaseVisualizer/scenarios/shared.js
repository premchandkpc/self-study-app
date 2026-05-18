export function snap(steps, s, narration, codeLine = null, complexityLabel = 'O(log n)') {
  steps.push({
    ...JSON.parse(JSON.stringify(s)),
    narration,
    codeLine,
    complexity: { ops: steps.length + 1, label: complexityLabel, space: 'O(n)' },
  });
}

export const makeRow = (id, name, age, state) => ({ id, name, age, state, active: false, matched: false });

export function snap(steps, s, narration, codeLine = null, complexityLabel = 'O(n²)') {
  steps.push({
    ...JSON.parse(JSON.stringify(s)),
    narration,
    codeLine,
    complexity: { ops: steps.length + 1, label: complexityLabel, space: 'O(1)' },
  });
}

export function makeBar(val, state = 'idle') {
  return { val, state };
}

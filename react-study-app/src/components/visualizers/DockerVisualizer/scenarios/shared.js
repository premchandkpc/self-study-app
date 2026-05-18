export function snap(steps, s, narration, codeLine = null, complexityLabel = 'O(1)') {
  steps.push({
    ...JSON.parse(JSON.stringify(s)),
    narration,
    codeLine,
    complexity: { ops: steps.length + 1, label: complexityLabel, space: 'O(layers)' },
  });
}

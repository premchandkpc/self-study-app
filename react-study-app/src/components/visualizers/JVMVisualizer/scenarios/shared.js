export function snap(steps, s, narration, codeLine = null) {
  steps.push({
    ...JSON.parse(JSON.stringify(s)),
    narration,
    codeLine,
    complexity: { ops: steps.length + 1, label: 'GC cycle', space: 'O(heap)' },
  });
}

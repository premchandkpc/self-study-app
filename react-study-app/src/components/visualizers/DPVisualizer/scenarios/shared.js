export function snap(steps, s, narration, codeLine = null, complexityLabel = '', spaceLabel = 'O(n)') {
  steps.push({
    ...JSON.parse(JSON.stringify(s)),
    narration,
    codeLine,
    complexity: { ops: steps.length + 1, label: complexityLabel, space: spaceLabel },
  });
}

export const INF = 999;

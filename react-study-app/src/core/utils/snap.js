export function snap(steps, state, narration, codeLine = null, complexity) {
  if (complexity && typeof complexity === 'string') {
    complexity = { ops: steps.length + 1, label: complexity, space: 'O(1)' };
  }
  steps.push({
    ...JSON.parse(JSON.stringify(state)),
    narration,
    codeLine,
    complexity: complexity ?? state.complexity ?? { ops: steps.length + 1, label: '', space: '' },
  });
}

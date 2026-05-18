export const makePod = (id, node, state = 'pending') => ({
  id, node, state, age: 0, ready: false, restarts: 0,
});

export const makeNode = (id, cpu = 0, mem = 0) => ({ id, cpu, mem, maxCpu: 100, maxMem: 100 });

export function snap(steps, state, narration, codeLine = null) {
  steps.push({
    ...JSON.parse(JSON.stringify(state)),
    narration,
    codeLine,
    complexity: { ops: steps.length + 1, label: 'O(pods)', space: 'O(nodes)' },
  });
}

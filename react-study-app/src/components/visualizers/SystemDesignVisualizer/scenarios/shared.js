export function snap(steps, state, narration, codeLine = null) {
  steps.push({ ...JSON.parse(JSON.stringify(state)), narration, codeLine, complexity: { ops: steps.length + 1, label: 'distributed', space: 'O(nodes)' } });
}

export const node   = (id, label, type, x, y, extra = {}) => ({ id, label, type, x, y, state: 'idle', ...extra });
export const packet = (from, to, label, type = 'request') => ({ from, to, label, type, id: `${from}-${to}-${Math.random().toString(36).slice(2,6)}` });

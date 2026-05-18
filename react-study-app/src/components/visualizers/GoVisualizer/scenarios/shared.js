export const G_STATES = { RUNNABLE: 'runnable', RUNNING: 'running', WAITING: 'waiting', DEAD: 'dead', SYSCALL: 'syscall' };

export const goroutine = (id, fn, state = G_STATES.RUNNABLE) => ({ id, fn, state, output: [], stackSize: 2 });
export const channel   = (id, cap, items = []) => ({ id, cap, items, senders: [], receivers: [] });
export const processor = (id, g = null) => ({ id, g, m: `M${id}` });

export function snap(steps, state, narration, codeLine = null) {
  steps.push({ ...JSON.parse(JSON.stringify(state)), narration, codeLine, complexity: { ops: steps.length + 1, label: 'concurrent', space: 'O(goroutines)' } });
}

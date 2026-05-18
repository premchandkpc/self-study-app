export const T_STATES = { NEW: 'new', RUNNABLE: 'runnable', RUNNING: 'running', BLOCKED: 'blocked', WAITING: 'waiting', TERMINATED: 'terminated' };

export function thread(id, name) {
  return { id, name, state: T_STATES.NEW, holds: [], wants: null, ops: 0 };
}

export function lock(id) {
  return { id, holder: null, queue: [] };
}

export function snap(steps, s, narration, codeLine = null) {
  steps.push({ ...JSON.parse(JSON.stringify(s)), narration, codeLine, complexity: { ops: steps.length + 1, label: 'concurrent', space: 'O(threads)' } });
}

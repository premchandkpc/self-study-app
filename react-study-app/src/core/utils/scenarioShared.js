export { snap } from './snap';

// ─── Array helpers ──────────────────────────────────────────────────────────
export function makeArr(arr) {
  return arr.map((v, i) => ({ value: v, state: 'idle', index: i }));
}
export function setCellState(cells, idx, state) {
  return cells.map((c, i) => (i === idx ? { ...c, state } : c));
}
export function setRangeState(cells, lo, hi, state) {
  return cells.map((c, i) => (i >= lo && i <= hi ? { ...c, state } : c));
}

// ─── Sort helpers ───────────────────────────────────────────────────────────
export function makeBar(val, state = 'idle') {
  return { val, state };
}

// ─── Matrix helpers ─────────────────────────────────────────────────────────
export function makeMatrix(values) {
  return values.map((row) => row.map((val) => ({ val, state: 'idle' })));
}
export function cloneMatrix(matrix) {
  return matrix.map((row) => row.map((cell) => ({ ...cell })));
}
export function setMatrixCell(matrix, r, c, state) {
  const m = cloneMatrix(matrix);
  m[r][c] = { ...m[r][c], state };
  return m;
}

// ─── Linked List helpers ────────────────────────────────────────────────────
export function makeList(values, cycleTarget = -1) {
  return values.map((val, i) => ({
    id: i, val, state: 'idle',
    nextIdx: i < values.length - 1 ? i + 1 : cycleTarget,
  }));
}

// ─── System Design helpers ──────────────────────────────────────────────────
export function node(id, label, type, x, y, extra = {}) {
  return { id, label, type, x, y, state: 'idle', ...extra };
}
export function packet(from, to, label, type = 'request', extra = {}) {
  return { from, to, label, type, id: `${from}-${to}-${Math.random().toString(36).slice(2, 6)}`, ...extra };
}
export function createNodeFactory(icons) {
  return (type) => (id, label, x, y, extra = {}) =>
    node(id, label, type, x, y, { icon: icons[type] ?? '\u25CF', ...extra });
}

// ─── AWS helpers ────────────────────────────────────────────────────────────
export function svc(id, label, type, x, y, extra = {}) {
  return { id, label, type, x, y, state: 'idle', ...extra };
}
export function pkt(from, to, label, type = 'request') {
  return { from, to, label, type, id: `${from}-${to}-${Math.random().toString(36).slice(2,5)}` };
}

// ─── K8s helpers ────────────────────────────────────────────────────────────
export function makePod(id, nodeName, state = 'pending') {
  return { id, node: nodeName, state, age: 0, ready: false, restarts: 0 };
}
export function makeNode(id, cpu = 0, mem = 0) {
  return { id, cpu, mem, maxCpu: 100, maxMem: 100 };
}

// ─── Thread helpers ─────────────────────────────────────────────────────────
export const T_STATES = { NEW: 'new', RUNNABLE: 'runnable', RUNNING: 'running', BLOCKED: 'blocked', WAITING: 'waiting', TERMINATED: 'terminated' };
export function thread(id, name) {
  return { id, name, state: T_STATES.NEW, holds: [], wants: null, ops: 0 };
}
export function lock(id) {
  return { id, holder: null, queue: [] };
}

// ─── Go helpers ─────────────────────────────────────────────────────────────
export const G_STATES = { RUNNABLE: 'runnable', RUNNING: 'running', WAITING: 'waiting', DEAD: 'dead', SYSCALL: 'syscall' };
export function goroutine(id, fn, state = G_STATES.RUNNABLE) {
  return { id, fn, state, output: [], stackSize: 2 };
}
export function channel(id, cap, items = []) {
  return { id, cap, items, senders: [], receivers: [] };
}
export function processor(id, g = null) {
  return { id, g, m: `M${id}` };
}

// ─── DB helpers ─────────────────────────────────────────────────────────────
export function makeRow(id, name, age, state) {
  return { id, name, age, state, active: false, matched: false };
}

// ─── DP constant ────────────────────────────────────────────────────────────
export const INF = 999;

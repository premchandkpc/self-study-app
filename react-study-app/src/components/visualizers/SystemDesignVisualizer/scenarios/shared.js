import { ICONS } from '../sd-types.js';

export function snap(steps, state, narration, codeLine = null) {
  steps.push({ ...JSON.parse(JSON.stringify(state)), narration, codeLine, complexity: { ops: steps.length + 1, label: 'distributed', space: 'O(nodes)' } });
}

export const node   = (id, label, type, x, y, extra = {}) => ({ id, label, type, x, y, state: 'idle', ...extra });
export const packet = (from, to, label, type = 'request') => ({ from, to, label, type, id: `${from}-${to}-${Math.random().toString(36).slice(2, 6)}` });

/* Typed node factories — auto-set icon from ICONS, overridable via extra */
const mknode = (type) => (id, label, x, y, extra = {}) =>
  node(id, label, type, x, y, { icon: ICONS[type] ?? '●', ...extra });

export const clientNode  = mknode('client');
export const serverNode  = mknode('server');
export const gatewayNode = mknode('gateway');
export const lbNode      = mknode('lb');
export const cacheNode   = mknode('cache');
export const redisNode   = mknode('redis');
export const dbNode      = mknode('db');
export const brokerNode  = mknode('broker');
export const cdnNode     = mknode('cdn');
export const serviceNode = mknode('service');
export const raftNode    = mknode('raft');
export const podNode     = mknode('pod');
export const workerNode  = mknode('worker');

import lb            from './scenarios/lb.js';
import cache         from './scenarios/cache.js';
import cdn           from './scenarios/cdn.js';
import raft          from './scenarios/raft.js';
import microservices from './scenarios/microservices.js';
import uber          from './scenarios/uber.js';

export const SCENARIOS = [uber, lb, cache, cdn, raft, microservices];

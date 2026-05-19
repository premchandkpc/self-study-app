import lb                from './scenarios/lb.js';
import cache             from './scenarios/cache.js';
import cdn               from './scenarios/cdn.js';
import raft              from './scenarios/raft.js';
import microservices     from './scenarios/microservices.js';
import uber              from './scenarios/uber.js';
import uberArchitecture  from './scenarios/uber-architecture.js';
import uberFailures      from './scenarios/uber-failures.js';

export const SCENARIOS = [uber, uberArchitecture, uberFailures, lb, cache, cdn, raft, microservices];

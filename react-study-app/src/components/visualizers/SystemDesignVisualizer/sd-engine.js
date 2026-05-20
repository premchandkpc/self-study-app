import lb                from './scenarios/lb.js';
import cache             from './scenarios/cache.js';
import cdn               from './scenarios/cdn.js';
import rateLimiter       from './scenarios/rate-limiter.js';
import sharding          from './scenarios/sharding.js';
import replication       from './scenarios/replication.js';
import messageQueue      from './scenarios/message-queue.js';
import raft              from './scenarios/raft.js';
import uber              from './scenarios/uber.js';
import uberArchitecture  from './scenarios/uber-architecture.js';
import uberFailures      from './scenarios/uber-failures.js';

export const SCENARIOS = [lb, cache, cdn, rateLimiter, sharding, replication, messageQueue, raft, uber, uberArchitecture, uberFailures];

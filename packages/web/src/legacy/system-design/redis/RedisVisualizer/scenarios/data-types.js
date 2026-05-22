import { snap } from '@/core/utils/scenarioShared';

function buildDataTypesSteps() {
  const steps = [];

  const s = {
    store: {},
    activeKey: null,
    command: '',
    result: null,
    events: [],
    metrics: { commands: 0, keys: 0, memBytes: 0 },
    vars: { command: '', key: '', type: '', size: 0, ttl: -1 },
  };

  snap(steps, s, 'Redis in-memory store ready. Demonstrating 5 core data types: String, List, Hash, Set, ZSet.', 1, 'O(1)');

  // String
  s.command = 'SET user:1 "Alice"';
  s.activeKey = 'user:1';
  s.result = 'OK';
  s.events.push({ type: 'ok', msg: 'SET user:1 "Alice" → OK' });
  s.metrics.commands = 1;
  s.metrics.keys = 1;
  s.metrics.memBytes = 32;
  s.vars = { command: 'SET user:1 "Alice"', key: 'user:1', type: 'string', size: 5, ttl: -1 };
  snap(steps, s, 'SET user:1 "Alice" — String type. O(1). Supports INCR, APPEND, GETSET, SETNX.', 2, 'O(1) SET');

  s.store['user:1'] = { type: 'string', val: 'Alice', active: true };
  snap(steps, s, 'Key user:1 stored as String. Strings can be plain text, JSON, integers, or binary (max 512 MB).', 3, 'O(1) GET');

  s.store['user:1'].active = false;
  s.activeKey = null;

  // List
  s.command = 'LPUSH tasks "deploy" "test" "build"';
  s.activeKey = 'tasks';
  s.result = '3';
  s.events.push({ type: 'info', msg: 'LPUSH tasks → [build, test, deploy]' });
  s.metrics.commands = 2;
  s.metrics.keys = 2;
  s.metrics.memBytes = 80;
  s.vars = { command: 'LPUSH tasks "build"', key: 'tasks', type: 'list', size: 3, ttl: -1 };
  snap(steps, s, 'LPUSH tasks — List type. O(1) push/pop. Used for queues, recent activity, timelines.', 4, 'O(1) LPUSH');

  s.store['tasks'] = { type: 'list', val: ['build', 'test', 'deploy'], active: true };
  snap(steps, s, 'List "tasks" has 3 items. LPUSH prepends. RPUSH appends. LRANGE 0 -1 to list all.', 5, 'O(n) LRANGE');

  s.store['tasks'].active = false;
  s.activeKey = null;

  // Hash
  s.command = 'HSET session:abc user Alice ttl 3600 role admin';
  s.activeKey = 'session:abc';
  s.result = '3';
  s.events.push({ type: 'info', msg: 'HSET session:abc → {user, ttl, role}' });
  s.metrics.commands = 3;
  s.metrics.keys = 3;
  s.metrics.memBytes = 140;
  s.vars = { command: 'HSET session:abc user Alice', key: 'session:abc', type: 'hash', size: 3, ttl: 3600 };
  snap(steps, s, 'HSET session:abc — Hash type. O(1) per field. Perfect for user sessions, config, structured data.', 6, 'O(1) HSET');

  s.store['session:abc'] = { type: 'hash', val: { user: 'Alice', ttl: 3600, role: 'admin' }, active: true };
  snap(steps, s, 'Hash "session:abc" stores 3 fields. HGET for single field, HGETALL for all. Memory-efficient vs JSON strings.', 7, 'O(n) HGETALL');

  s.store['session:abc'].active = false;
  s.activeKey = null;

  // Set
  s.command = 'SADD tags "redis" "nosql" "cache" "redis"';
  s.activeKey = 'tags';
  s.result = '3';
  s.events.push({ type: 'info', msg: 'SADD tags → {redis, nosql, cache} (dedup!)' });
  s.metrics.commands = 4;
  s.metrics.keys = 4;
  s.metrics.memBytes = 200;
  s.vars = { command: 'SADD tags "redis" "nosql" "cache"', key: 'tags', type: 'set', size: 3, ttl: -1 };
  snap(steps, s, 'SADD tags — Set type. O(1) add/check. Automatic deduplication. Supports UNION, INTERSECT, DIFF.', 8, 'O(1) SADD');

  s.store['tags'] = { type: 'set', val: ['redis', 'nosql', 'cache'], active: true };
  snap(steps, s, 'Set "tags" has 3 unique members. Duplicate "redis" was ignored. SISMEMBER for O(1) membership check.', 9, 'O(1) SISMEMBER');

  s.store['tags'].active = false;
  s.activeKey = null;

  // ZSet
  s.command = 'ZADD leaderboard 1500 "Alice" 2300 "Bob" 1800 "Carol"';
  s.activeKey = 'leaderboard';
  s.result = '3';
  s.events.push({ type: 'ok', msg: 'ZADD leaderboard → sorted by score' });
  s.metrics.commands = 5;
  s.metrics.keys = 5;
  s.metrics.memBytes = 280;
  s.vars = { command: 'ZADD leaderboard 2300 "Bob"', key: 'leaderboard', type: 'zset', size: 3, ttl: -1 };
  snap(steps, s, 'ZADD leaderboard — Sorted Set (ZSet). O(log n). Members ordered by score. Perfect for leaderboards, priority queues.', 10, 'O(log n) ZADD');

  s.store['leaderboard'] = { type: 'zset', val: [{ member: 'Alice', score: 1500 }, { member: 'Carol', score: 1800 }, { member: 'Bob', score: 2300 }], active: true };
  snap(steps, s, 'ZSet "leaderboard" auto-sorted by score. ZRANGE for rank, ZRANK for position, ZRANGEBYSCORE for range queries.', 11, 'O(log n+m) ZRANGE');

  s.store['leaderboard'].active = false;
  s.activeKey = null;
  snap(steps, s, 'All 5 Redis data types demonstrated. Strings, Lists, Hashes, Sets, Sorted Sets — each optimized for specific access patterns.', 12, 'O(1)');

  return steps;
}

export const DATA_TYPES_CODE = [
  '# String — O(1)',
  'SET user:1 "Alice"',
  'GET user:1            # → "Alice"',
  'INCR counter          # atomic increment',
  '',
  '# List — O(1) push/pop, O(n) range',
  'LPUSH tasks "deploy" "test" "build"',
  'LRANGE tasks 0 -1     # → [build, test, deploy]',
  'RPOP tasks            # → "deploy"',
  '',
  '# Hash — O(1) per field',
  'HSET session:abc user Alice ttl 3600 role admin',
  'HGET session:abc user # → "Alice"',
  'HGETALL session:abc   # → all fields',
  '',
  '# Set — O(1), unique members',
  'SADD tags "redis" "nosql" "cache" "redis"',
  'SMEMBERS tags         # → {redis, nosql, cache}',
  'SISMEMBER tags "redis" # → 1',
  '',
  '# Sorted Set — O(log n)',
  'ZADD leaderboard 1500 "Alice" 2300 "Bob"',
  'ZRANGE leaderboard 0 -1 WITHSCORES',
  'ZRANK leaderboard "Bob" # → 2 (0-indexed)',
];

export default {
  id: 'data-types',
  label: 'Redis Data Types',
  icon: '📦',
  build: buildDataTypesSteps,
  code: DATA_TYPES_CODE,
  language: 'Redis',
  metrics: [
    { key: 'commands',  label: 'Commands',  max: 12,   color: 'var(--kafka-producer)' },
    { key: 'keys',      label: 'Keys',      max: 10,   color: 'var(--node-active)' },
    { key: 'memBytes',  label: 'Mem (B)',   max: 512,  color: 'var(--node-comparing)' },
  ],
};

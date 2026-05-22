import { snap, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../../sd-types';
const _mk = createNodeFactory(ICONS);
const clientNode = _mk('client');
const gatewayNode = _mk('gateway');
const dbNode = _mk('db');

/* ─────────────────────────────────────────────────────────────────────────────
   Database Sharding — horizontal scaling via key distribution
   Layout: Client (x≈100) · Gateway (x≈250) · Shards (x≈400+)
───────────────────────────────────────────────────────────────────────────── */
function buildShardingSteps() {
  const steps = [];
  const s = {
    nodes: [
      clientNode ('client',    'Client',             100,  190, { desc: 'Multi-tenant requests by user_id' }),
      gatewayNode('shard_key', 'Shard Router',       250,  190, { desc: 'Hash(user_id) % num_shards → route' }),
      dbNode     ('shard_0',   'Shard 0\n(0-33%)',   400,  80,  { desc: 'user_id % 3 = 0 · 1M records' }),
      dbNode     ('shard_1',   'Shard 1\n(33-66%)',  400,  190, { desc: 'user_id % 3 = 1 · 1M records' }),
      dbNode     ('shard_2',   'Shard 2\n(66-99%)',  400,  300, { desc: 'user_id % 3 = 2 · 1M records' }),
    ],
    edges: [
      { from: 'client',    to: 'shard_key', protocol: 'SQL', desc: 'SELECT * WHERE user_id = ?' },
      { from: 'shard_key', to: 'shard_0',   protocol: 'SQL' },
      { from: 'shard_key', to: 'shard_1',   protocol: 'SQL' },
      { from: 'shard_key', to: 'shard_2',   protocol: 'SQL' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, latency_ms: 0, hotShard: 0 },
  };

  snap(steps, s, 'Database Sharding: 3M records split by user_id. Hash(user_id) % 3 routes to correct shard. Each shard is independent.', 1);

  s.nodes.find((n) => n.id === 'client').state = 'active';
  s.nodes.find((n) => n.id === 'shard_key').state = 'active';
  s.packets = [packet('client', 'shard_key', 'user_id=42')];
  s.metrics.requests = 1;
  s.events.push({ type: 'ok', msg: 'Client: SELECT * WHERE user_id = 42' });
  snap(steps, s, 'Client requests data for user_id=42. Router computes shard: 42 % 3 = 0 → routes to Shard 0.', 2);

  s.nodes.find((n) => n.id === 'shard_0').state = 'active';
  s.packets = [packet('shard_key', 'shard_0', 'lookup')];
  s.events.push({ type: 'ok', msg: 'Shard 0: Found user_id=42 in local index (B-tree), O(log n)' });
  snap(steps, s, 'Shard 0 finds record in local index (1M records). Single shard query = O(log n). No full table scan.', 3);

  s.nodes.find((n) => n.id === 'shard_0').state = 'idle';
  s.nodes.find((n) => n.id === 'shard_1').state = 'warn';
  s.packets = [];
  s.metrics.hotShard = 1;
  s.events.push({ type: 'warn', msg: 'Hot shard detected: Shard 1 handling 60% of traffic (sequential user_ids)' });
  snap(steps, s, 'Problem: Non-uniform distribution. Sequential user_ids hash to same shard → hot shard (Shard 1 overloaded).', 4);

  s.nodes.find((n) => n.id === 'shard_1').state = 'error';
  s.events.push({ type: 'error', msg: 'Shard 1 CPU: 95%, latency spike. Need re-sharding.' });
  snap(steps, s, 'Hot shard saturated. Solution: re-shard using consistent hashing or add cache layer (Redis) in front.', 5);

  s.nodes.find((n) => n.id === 'shard_1').state = 'idle';
  s.events.push({ type: 'ok', msg: 'Added Redis cache + re-sharded with consistent hash. Latency: 50ms → 10ms' });
  snap(steps, s, 'Fix: Consistent hashing allows adding/removing shards without rehashing all data. Cache layer absorbs hot reads.', 6);

  return steps;
}

const CODE = [
  '// Modulo Sharding (simple)',
  'function getShardId(userId) {',
  '  return userId % 3; // 3 shards',
  '}',
  '// Problem: Non-uniform load distribution',
  '',
  '// Consistent Hashing (better for scaling)',
  'const ring = new ConsistentHashRing();',
  'ring.addNode("shard-0");',
  'ring.addNode("shard-1");',
  'ring.addNode("shard-2");',
  'const shardId = ring.getNode(userId);',
  '',
  '// Benefits: Add shard without full rehash',
  '// Only ~1/N data moves on rebalance',
  '// Handles hotspots with caching layer',
];

const LAYERS = [
  { label: 'Client',        x1: 5,   x2: 180, color: 'rgba(100,140,255,0.06)', border: 'rgba(100,140,255,0.30)' },
  { label: 'Routing',       x1: 190, x2: 310, color: 'rgba(255,160,50,0.06)',  border: 'rgba(255,160,50,0.35)'  },
  { label: 'Data Shards',   x1: 350, x2: 520, color: 'rgba(60,200,120,0.06)',  border: 'rgba(60,200,120,0.28)'  },
];

export default {
  id: 'sharding',
  label: 'Database Sharding',
  icon: '📊',
  layers: LAYERS,
  build: buildShardingSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'requests',   label: 'Requests',    max: 10, color: 'var(--node-default)' },
    { key: 'latency_ms', label: 'Latency',     max: 100, color: 'var(--node-visited)' },
    { key: 'hotShard',   label: 'Hot Shard',   max: 1,  color: 'var(--pod-crash)', warn: 50 },
  ],
  codeNotes: [
    { title: 'Modulo Sharding', content: 'Hash(key) % N shards. Simple but adding a shard changes N → all keys remapped. O(N) rebalance cost per shard change.' },
    { title: 'Consistent Hashing', content: 'Keys hash onto a ring. Each shard owns an arc. Adding a shard only remaps ~1/N of keys. Used by DynamoDB, Cassandra.' },
    { title: 'Shard Key Selection', content: 'Choose key with high cardinality and uniform access pattern. Bad: user_id (if users sorted → hot shard). Good: hash(user_id). Worse: timestamp (all writes to latest shard).' },
    { title: 'Resharding', content: 'Add shards → migrate data. Online resharding: 1) add new shard, 2) dual-write to old+new, 3) backfill history, 4) cut reads. Takes hours for TB-scale data.' },
  ],
  tradeoffs: [
    { pro: 'Sharding scales write throughput linearly with shards', con: 'Cross-shard queries impossible — must scatter-gather from all shards (slow).' },
    { pro: 'Consistent hashing minimizes rebalance on shard add/remove', con: 'Uneven data distribution (hot shards) still possible despite hash uniformity.' },
    { pro: 'Smaller shards = faster backups, easier maintenance', con: 'Too many shards = connection overhead. 1000 shards × 100 connections = 100K connections.' },
    { pro: 'No single-node storage bottleneck', con: 'Joins/transactions across shards not possible — app must handle at application layer.' },
  ],
  bestPractices: [
    'Choose shard key with high cardinality and uniform distribution. Avoid monotonically increasing keys (timestamp, auto-increment) — they create hot shards.',
    'Monitor per-shard request rate and disk usage; alert if any shard differs by >20% from mean — indicates skew.',
    'Use virtual nodes (vnodes) in Cassandra to spread each shard across many physical nodes — reduces rebalance impact.',
    'Plan for resharding: pre-split into more shards than needed (e.g., 1024 shards for 10 nodes) to avoid full rebalance on scale-out.',
    'For relational data, keep JOIN-heavy tables on same shard (co-location). Avoid cross-shard FK references.',
  ],
};

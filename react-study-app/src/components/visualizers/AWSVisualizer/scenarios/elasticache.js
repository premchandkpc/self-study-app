import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildElastiCacheSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('client', 'Client App', 'client', 30, 170, { desc: 'Web/mobile app that needs fast data access. Instead of hitting DB every time, asks Redis first. Cache hit = 1-5ms, cache miss = 50-200ms (DB fallback).' }),
      svc('lambda', 'Lambda', 'lambda', 180, 170, { desc: 'Serverless function implementing lazy-loading cache pattern. Checks Redis before DB. Writes to Redis after DB read. Sets TTL for automatic expiration.', runtime: 'nodejs20.x', mem: 1024 }),
      svc('elasticache', 'ElastiCache (Redis)', 'cache', 330, 170, { desc: 'In-memory data store. Sub-millisecond latency. Supports strings, hashes, lists, sets, sorted sets. Cluster mode: shard data across up to 500 nodes. Multi-AZ auto-failover.', engine: 'Redis 7.x', nodeType: 'cache.r6g.large', shards: 3, replicas: 1 }),
      svc('replica', 'Read Replica', 'cache', 330, 290, { desc: 'Redis replica in different AZ. Handles read traffic. If primary fails, replica promoted automatically. Synchronous replication (async within AZ).' }),
      svc('rds', 'Aurora (DB)', 'db', 480, 170, { desc: 'Primary database. Cached data comes from here on first read. Write-through cache pattern: every write goes to both Redis and DB.', engine: 'Aurora MySQL' }),
      svc('cw', 'CloudWatch', 'server', 480, 290, { desc: 'Monitoring: CacheHits, CacheMisses, CurrConnections, CPUUtilization, Evictions, ReplicationLag, MemoryUsage. Alarms for high evictions (need larger cluster).' }),
    ],
    edges: [
      { from: 'client', to: 'lambda' },
      { from: 'lambda', to: 'elasticache' },
      { from: 'lambda', to: 'rds' },
      { from: 'elasticache', to: 'replica' },
      { from: 'elasticache', to: 'cw' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, cacheHits: 0, cacheMisses: 0, dbLoad: 0, evictions: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'ElastiCache: managed in-memory cache. Redis (rich data structures, persistence) or Memcached (simple, no persistence). Sub-ms latency reduces DB load by up to 90%.', 1);

  s.nodes[0].state = 'active';
  s.nodes[1].state = 'active';
  s.packets = [pkt('client', 'lambda', 'GET /users/42')];
  s.events.push({ type: 'info', msg: 'Client request arrives. Lambda checks cache first (lazy loading pattern).' });
  snap(steps, s, 'Lazy loading pattern: check cache first. If cache hit → return immediately (1-5ms). If cache miss → query DB (50-200ms) → write to cache with TTL → return. Pro: simple. Con: cache miss penalty (thundering herd on cold start).', 2);

  s.packets = [pkt('lambda', 'elasticache', 'GET users:42'), pkt('elasticache', 'lambda', 'nil (miss)')];
  s.metrics.cacheMisses = 1;
  s.events.push({ type: 'warn', msg: 'Cache MISS for key "users:42". Falling back to database.' });
  snap(steps, s, 'Cache miss (Redis returns nil). Lambda queries Aurora DB. This is the "thundering herd" problem — many concurrent cache misses on the same key can overload the DB.', 3);

  s.packets = [pkt('lambda', 'rds', 'SELECT * FROM users WHERE id = 42'), pkt('rds', 'lambda', 'result')];
  s.nodes[4].state = 'active';
  s.metrics.dbLoad = 1;
  s.events.push({ type: 'ok', msg: 'DB returns result (85ms). Lambda writes to Redis with TTL=300.' });
  snap(steps, s, 'DB returns data. Lambda writes to Redis: SET users:42 <data> EX 300 (TTL 300s). Next request for same key will get a cache hit. TTL ensures stale data is eventually evicted. Choose TTL based on data freshness needs.', 4);

  s.packets = [pkt('lambda', 'elasticache', 'SET users:42 <data> EX 300'), pkt('elasticache', 'lambda', 'OK')];
  s.metrics.cacheHits = 1;
  s.events.push({ type: 'ok', msg: 'Key cached with TTL=300s. Subsequent reads will hit Redis (1-5ms).' });
  snap(steps, s, 'After cache is warm: subsequent reads hit Redis in 1-5ms. DB load drops to near zero. Redis handles millions of ops/second on a single node. Cluster mode: shard across nodes using hash slots (CRC16 % 16384).', 5);

  s.packets = [pkt('lambda', 'elasticache', 'GET users:42'), pkt('elasticache', 'lambda', '<data> (HIT)')];
  s.nodes[2].state = 'active';
  s.metrics.requests = 5; s.metrics.cacheHits = 4; s.metrics.dbLoad = 1;
  s.events.push({ type: 'ok', msg: 'Cache HIT! 4ms vs 85ms (20x faster). Redis serving all requests.' });
  snap(steps, s, 'Cache hit ratio: 4/5 = 80%. Target ratio >90% for well-cached workloads. Monitor CacheMisses in CloudWatch. If ratio drops: increase TTL, check evictions, or right-size the cluster.', 6);

  s.nodes[2].state = 'error';
  s.events.push({ type: 'error', msg: 'Redis primary fails! Multi-AZ auto-failover: replica promoted to primary.' });
  snap(steps, s, 'Redis primary node fails. If Multi-AZ enabled: DNS automatically updates to point to the replica. Promotion takes ~10-30s. During promotion: cache unavailable → all requests hit DB (cache stampede). To mitigate: use a local cache (e.g., in-memory L1 cache) as backup.', 7);

  s.nodes[2].state = 'active';
  s.nodes[3].state = 'idle';
  s.events.push({ type: 'ok', msg: 'Failover complete. New primary active. Old primary becomes replica when recovered.' });
  snap(steps, s, 'Failover complete. Replica promoted to primary. ElastiCache auto-heals: on failover, the previous primary rejoins as a replica. Data: if persistence enabled (AOF/RDB), data survives restart. Without persistence: failover = empty cache (cold start all over).', 8);

  s.packets = [];
  s.nodes[5].state = 'active';
  s.metrics.evictions = 100;
  s.events.push({ type: 'warn', msg: 'Evictions increasing! Memory full. Consider larger node type or cluster sharding.' });
  snap(steps, s, 'Redis evictions: when maxmemory reached, Redis evicts keys based on policy (allkeys-lru, volatile-lru, allkeys-lfu, noeviction). allkeys-lru recommended for caches. High evictions = need more memory. Scale up (bigger node) or scale out (more shards in cluster mode).', 9);

  s.events.push({ type: 'info', msg: 'Redis use cases: cache (90%), session store, rate limiter (INCR+EXPIRE), leaderboard (sorted sets), message queue (pub/sub + lists), distributed lock (Redlock).' });
  snap(steps, s, 'ElastiCache pricing: On-demand ($0.138/hr for cache.r6g.large), Reserved (up to 55% off). Multi-AZ charges for replica. Cluster mode recommended for production. DAX (DynamoDB Accelerator) is a separate service for DynamoDB specifically.', 10);

  s.nodes[4].state = 'idle';
  s.nodes[3].state = 'active';
  s.events.push({ type: 'info', msg: 'Write-through pattern: writes go to both Redis and DB concurrently. Pro: cache always fresh. Con: slower writes, more complexity.' });
  snap(steps, s, 'Write-through cache: on every write, update both Redis and DB. Pro: cache always consistent (no stale data). Con: write latency includes both Redis + DB round trips. Use for: critical data that must be fresh. Alternative: write-back (write to cache first, async write to DB) — faster but risk of data loss.', 11);

  s.events.push({ type: 'ok', msg: 'ElastiCache vs DAX: ElastiCache = Redis/Memcached (general cache). DAX = DynamoDB-specific (in-memory acceleration). DAX is tightly coupled to DynamoDB, ElastiCache works with any DB.' });
  snap(steps, s, 'Key differences: ElastiCache for Redis (general purpose, rich data types, pub/sub, TTL, persistence), ElastiCache for Memcached (simple, no persistence, no replication, multi-threaded), DAX (DynamoDB only, write-through, microsecond latency). Choose Redis for most use cases.', 12);

  return steps;
}

const CODE = [
  '# Create Redis cluster (cluster mode)',
  'aws elasticache create-replication-group',
  '  --replication-group-id my-redis',
  '  --engine redis',
  '  --engine-version 7.1',
  '  --cache-node-type cache.r6g.large',
  '  --num-node-groups 3',
  '  --replicas-per-node-group 1',
  '  --multi-az-enabled',
  '  --automatic-failover-enabled',
  '  --cache-parameter-group default.redis7.cluster.on',
  '# Lazy loading pattern (Node.js)',
  'async function getUser(id) {',
  '  const key = `users:${id}`;',
  '  let data = await redis.get(key);',
  '  if (data) return JSON.parse(data); // CACHE HIT',
  '  data = await db.query("SELECT * FROM users WHERE id = ?", [id]);',
  '  await redis.set(key, JSON.stringify(data), "EX", 300); // CACHE MISS',
  '  return data;',
  '}',
  '# Monitor cache metrics',
  'aws cloudwatch get-metric-statistics',
  '  --namespace AWS/ElastiCache',
  '  --metric-name CacheHits',
  '  --dimensions Name=CacheClusterId,Value=my-redis',
  '  --start-time 2026-05-20T00:00:00Z --end-time 2026-05-20T23:59:59Z',
  '  --period 300 --statistics Sum',
  '# Redis CLI commands',
  'redis-cli -h my-redis.xxxxx.clustercfg.use1.cache.amazonaws.com -p 6379',
  '  SET users:42 \'{"name":"Alice"}\' EX 300',
  '  GET users:42',
  '  INFO stats | grep evicted_keys',
  '# Pricing (us-east-1, cache.r6g.large, 1 shard + 1 replica)',
  '# Primary: $0.138/hr  Replica: $0.138/hr',
  '# Total: ~$202/month for 1 shard + 1 replica',
  '# Cluster mode 3 shards: ~$606/month',
];

export default {
  id: 'elasticache',
  label: 'ElastiCache',
  icon: '⚡',
  build: buildElastiCacheSteps,
  code: CODE,
  language: 'AWS CLI / Node.js',
  metrics: [
    { key: 'requests', label: 'Requests', max: 20, color: 'var(--node-default)' },
    { key: 'cacheHits', label: 'Cache Hits', max: 10, color: 'var(--pod-running)' },
    { key: 'cacheMisses', label: 'Cache Misses', max: 10, color: 'var(--pod-crash)' },
    { key: 'dbLoad', label: 'DB Queries', max: 10, color: 'var(--kafka-producer)' },
    { key: 'evictions', label: 'Evictions', max: 200, color: 'var(--node-comparing)' },
  ],
  topicContent: {
    concept: [
      { title: 'Lazy Loading Caching', content: 'Check cache first — on miss, query the database, populate the cache with a TTL, then return. Simple but has thundering herd problem on cold starts.' },
      { title: 'Write-Through Caching', content: 'Write to both cache and database simultaneously. Cache is always fresh but write latency increases. Best for data that must be immediately consistent.' },
    ],
    why: ['Adding a cache layer reduces database load by up to 90% and improves read latency from 50-200ms to 1-5ms, directly impacting user experience and infrastructure cost.'],
    interview: [
      { question: 'What is the difference between lazy loading and write-through caching?', answer: 'Lazy loading populates cache on read miss — simple but has thundering herd problem. Write-through updates cache on every write — always fresh but slower writes. Lazy loading is more common for most use cases.', followUps: ['How do you handle cache stampede?', 'When would you use write-through over lazy loading?'] },
      { question: 'What happens when ElastiCache Redis runs out of memory?', answer: 'Redis evicts keys based on the eviction policy (allkeys-lru recommended for caches). High evictions mean you need to scale up (bigger node) or scale out (more shards). Without eviction policy, writes fail.', followUps: ['What eviction policies does Redis support?', 'How do you monitor evictions in CloudWatch?'] },
    ],
    gotcha: ['Without persistence (AOF/RDB), a Redis failover or restart results in a completely cold cache — every request hits the database until the cache warms up.', 'ElastiCache Multi-AZ adds replica cost and only helps with AZ failures — it does not protect against data loss unless persistence is enabled.'],
    tradeoffs: [
      { pro: 'Sub-millisecond latency reduces database load by up to 90%, improving application performance dramatically.', con: 'Caching adds complexity — stale data, cache invalidation, and thundering herd problems must be handled carefully.' },
      { pro: 'Redis supports rich data structures (sorted sets, lists, hashes) beyond simple key-value, enabling leaderboards, rate limiting, and pub/sub.', con: 'Cluster mode (sharding) is required for production but increases cost and operational complexity. Memcached is simpler but less capable.' },
    ],
  },
};

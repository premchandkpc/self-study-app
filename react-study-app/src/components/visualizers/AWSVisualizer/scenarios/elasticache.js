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
      { title: 'Lazy Loading Caching — the most common caching pattern', content: 'Lazy loading checks the cache first on every read request. On a cache hit, data is returned immediately in 1-5 milliseconds. On a cache miss, the application queries the primary database (50-200ms), stores the result in the cache with a TTL (Time-To-Live), and returns the data. Subsequent reads for the same key will hit the cache until the TTL expires. This pattern is simple to implement and works well for most read-heavy workloads. The main drawback is the thundering herd problem — when multiple concurrent requests miss the cache simultaneously, they all hit the database, potentially overwhelming it. TTL must be chosen carefully to balance data freshness against cache efficiency.' },
      { title: 'Write-Through and Write-Behind Caching', content: 'Write-through caching updates both the cache and the database on every write operation, ensuring the cache always contains fresh data. Write latency increases because each write must complete against both systems before returning to the client. Write-behind caching writes to the cache first and asynchronously updates the database, providing lower write latency but risking data loss if the cache fails before the database write completes. Write-through is best for data that must be immediately consistent — user profiles, configuration settings, and session state. Write-behind works well for high-volume write workloads like clickstream analytics or metrics aggregation where eventual consistency is acceptable.' },
      { title: 'Deep — Redis cluster mode, persistence, and replication internals', content: 'ElastiCache for Redis supports cluster mode which shards data across up to 500 nodes using hash slots (CRC16 of the key modulo 16384). Each shard has a primary node and up to 5 replica nodes. Multi-AZ automatic failover promotes a replica in a different Availability Zone if the primary fails, with DNS update completing in 10-30 seconds. Persistence is configured via AOF (Append-Only File, logs every write operation) or RDB (point-in-time snapshots at configurable intervals). Without persistence enabled, a failover results in an empty cache — the new primary has no data and must be repopulated through lazy loading. Eviction policies determine which keys to remove when maxmemory is reached: allkeys-lru (evict least recently used regardless of TTL) is recommended for most cache use cases, while noeviction causes write failures when memory is full.' },
    ],
    why: [
      'Adding a cache layer reduces database load by up to 90% and improves read latency from 50-200ms to 1-5ms, directly impacting user experience and infrastructure cost. A well-configured caching layer can reduce the required database instance size, decrease RDS or Aurora costs, and improve application responsiveness for global users.',
      'Redis provides rich data structures beyond simple key-value storage, including sorted sets (for leaderboards and real-time rankings), lists (for message queues and activity feeds), hashes (for object caching with field-level access), and HyperLogLog (for cardinality estimation). These data structures enable advanced use cases like rate limiting (INCR + EXPIRE), distributed locking (Redlock algorithm), pub/sub messaging, and real-time analytics without additional infrastructure.',
      'Caching best practices directly impact production reliability. The cache hit ratio (target >90%) indicates how effective the cache is at reducing database load. Monitoring evictions (keys removed due to memory pressure), replication lag (for read replicas in cluster mode), and cache hit ratio in CloudWatch helps right-size the cluster, choose appropriate TTLs, and detect performance degradation before it affects users.',
    ],
    interview: [
      { q: 'What is the difference between lazy loading and write-through caching, and when would you use each?', a: 'Lazy loading populates the cache on read miss — when a requested key is not found, the application queries the database, stores the result in cache with a TTL, and returns the data. Subsequent reads for the same key hit the cache. This is simple to implement, handles all data types automatically, and only caches data that is actually requested. Its main drawback is the thundering herd problem where many concurrent cache misses overwhelm the database, and stale data can be served until the TTL expires. Write-through updates the cache synchronously on every write operation, ensuring the cache always contains the most recent data. This avoids stale reads and eliminates cache-stampede scenarios but increases write latency since every write must complete against both Redis and the database. Use lazy loading for read-heavy workloads where eventual consistency is acceptable (product catalogs, blog content, user feeds). Use write-through for data that must be immediately consistent (user authentication sessions, pricing data, configuration settings, inventory counts).', followUps: ['How do you handle the thundering herd problem in lazy loading?', 'What is write-behind caching and what are its risks?'] },
      { q: 'What happens when ElastiCache Redis runs out of memory, and how do you plan for capacity?', a: 'When Redis reaches its maxmemory limit, the configured eviction policy determines what happens. The recommended policy for cache use cases is allkeys-lru which evicts the least recently used keys regardless of whether they have TTLs set. Other options include volatile-lru (evict only keys with TTLs), allkeys-lfu (evict least frequently used), and noeviction (writes fail with OOM error). If evictions are observed in CloudWatch (Evictions metric), it indicates the cache is undersized. The solution is either to scale up to a larger node type (vertical scaling) or scale out by adding more shards in cluster mode (horizontal scaling). For capacity planning, monitor UsedMemoryCapacity and track the ratio of evictions to total requests — a ratio above 0.1% warrants investigation. Also monitor CacheHitRate — if it drops while evictions rise, the cache is thrashing and needs more capacity. Redis cluster mode distributes memory across shards, so adding shards increases total effective cache size linearly.', followUps: ['What eviction policies does Redis support and which should you choose for a cache?', 'How do you monitor Redis memory usage and evictions in CloudWatch?'] },
      { q: 'How does ElastiCache for Redis handle high availability and what happens during a failover?', a: 'ElastiCache for Redis provides high availability through Multi-AZ replication groups. Each shard has a primary node and up to 5 replica nodes deployed across different Availability Zones. The primary handles all write operations and asynchronously replicates to replicas. When Multi-AZ with automatic failover is enabled, ElastiCache monitors primary node health. If the primary fails due to AZ outage, hardware failure, or network partition, ElastiCache promotes a replica to primary — the promotion takes approximately 10-30 seconds during which the endpoint DNS record is updated to point to the new primary. During failover, the cache is unavailable: all read and write requests to the affected shard fail. Applications must handle connection errors and implement retry logic with exponential backoff. After failover, if persistence (AOF or RDB) is enabled, the new primary has the data that was replicated before failure. Without persistence, the new primary starts empty — all cache data is lost and must be repopulated through lazy loading, causing a temporary increase in database load. The previous primary, when it recovers, rejoins as a replica automatically.', followUps: ['What happens to cached data during a Redis failover with and without persistence?', 'How does cluster mode affect failover behavior across multiple shards?'] },
    ],
    gotcha: [
      'Without persistence (AOF or RDB), a Redis failover or restart results in a completely cold cache — every request hits the database until the cache warms up through lazy loading. For applications with heavy read traffic, this cache stampede can overwhelm the database for minutes. Enable AOF with appendfsync every-1s for a balance of durability and performance.',
      'ElastiCache Multi-AZ adds replica cost and only protects against AZ failures — it does NOT protect against data loss unless persistence is enabled. If both primary and replica are in different AZs but the primary fails without replicating recent writes, those writes are lost. Enable both Multi-AZ and persistence for production workloads that cannot tolerate data loss.',
      'The thundering herd problem is particularly dangerous with lazy loading and high concurrency. When a popular cached key expires and hundreds of requests simultaneously miss the cache, they all query the database concurrently. Mitigation strategies include using a mutex or lock around the cache-miss database query (only one request populates the cache, others wait), pre-warming the cache on deployment, or using write-through for critical keys.',
      'Redis cluster mode limits multi-key operations — commands like MGET, MSET, and transactions only work when all keys belong to the same hash slot. Applications must design key naming to ensure related keys map to the same slot (using hash tags like {user:42}:profile and {user:42}:settings). Multi-key operations across different shards will fail with CROSSSLOT error.',
    ],
    tradeoffs: [
      { pro: 'Sub-millisecond latency reduces database load by up to 90%, dramatically improving application response times and user experience. Redis supports millions of operations per second on a single node with rich data structures beyond simple key-value caching.', con: 'Caching adds architectural complexity — stale data handling, cache invalidation strategies, thundering herd mitigation, and consistent hashing for cluster mode all require careful design and testing. A misconfigured cache can serve stale data or cause cascading failures during cold starts.' },
      { pro: 'Redis provides advanced data structures (sorted sets for leaderboards, lists for queues, hyperloglog for cardinality, streams for event logging) and features (pub/sub, Lua scripting, transactions, keyspace notifications) that enable use cases beyond caching, including real-time analytics, rate limiting, session storage, and distributed locking.', con: 'Cluster mode (sharding) is required for production deployments needing more memory than a single node provides, but it introduces operational complexity — resharding requires careful planning, multi-key operations are restricted, and client libraries must support cluster protocol and handle MOVED/ASK redirections. Memcached is simpler for basic caching but lacks Redis\'s data structure richness and persistence.' },
      { pro: 'ElastiCache is fully managed with automated patching, backup and restore, Multi-AZ failover, and CloudWatch monitoring integration. AWS handles the operational burden of Redis infrastructure including hardware maintenance, software updates, and failure recovery.', con: 'ElastiCache costs are significantly higher than self-managed Redis on EC2, especially at scale with cluster mode, Multi-AZ replicas, and cross-AZ data transfer charges. For large deployments with hundreds of nodes, self-managed Redis on EC2 with Spot instances can reduce costs by 50-70%.' },
    ],
  },
};

import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../sd-types';
const _mk = createNodeFactory(ICONS);
const clientNode = _mk('client');
const gatewayNode = _mk('gateway');
const serviceNode = _mk('service');
const redisNode = _mk('redis');
const brokerNode = _mk('broker');
const dbNode = _mk('db');

/* ─────────────────────────────────────────────────────────────────────────────
   Uber Failure Mode Analysis — Real-World Incidents & Critical Cares
   Layout:
     Client area (x≈75)  : Rider + Driver apps
     Gateway area (x≈220): API Gateway + rate limiter
     App area (x≈380)    : Services (Auth, Match, Trip, Payment, Notif)
     Data area (x≈560)   : Redis, Kafka
     Storage (x≈720)     : PostgreSQL
     Monitoring (x≈860)  : Observability stack
───────────────────────────────────────────────────────────────────────────── */

function buildUberFailureSteps() {
  const steps = [];

  const BASE_NODES = [
    clientNode ('rider',    'Rider App',       75,  150, { icon: '📱', desc: 'iOS/Android client' }),
    clientNode ('driver',   'Driver App',      75,  330, { icon: '🚗', desc: 'GPS + background push' }),
    gatewayNode('gw',       'API Gateway',     220, 240, { desc: 'Rate limiter · circuit breaker · auth delegation' }),
    serviceNode('auth',     'Auth',            380, 100, { icon: '🔐', desc: 'JWT validation, OAuth2' }),
    serviceNode('match',    'Ride Match',      380, 220, { icon: '🎯', desc: 'Core matching logic' }),
    serviceNode('trip',     'Trip Svc',        380, 340, { icon: '🗺️', desc: 'Trip state machine' }),
    serviceNode('payment',  'Payment Svc',     565, 120, { icon: '💳', desc: 'Idempotent Stripe charges' }),
    serviceNode('notif',    'Notification',    565, 250, { icon: '🔔', desc: 'FCM push + SMS fallback' }),
    redisNode  ('redis',    'Redis',           565, 360, { desc: 'Driver locations, rate counters' }),
    brokerNode ('kafka',    'Kafka',           720, 200, { desc: 'Event bus, 3 brokers' }),
    dbNode     ('pg',       'PostgreSQL',      720, 330, { desc: 'Trip + payment ledger' }),
    serviceNode('monitor',  'Observability',   860, 200, { icon: '📊', desc: 'Prometheus + Grafana + PagerDuty' }),
  ];

  const EDGES = [
    { from: 'rider',  to: 'gw',       protocol: 'HTTPS/2' },
    { from: 'driver', to: 'gw',       protocol: 'HTTPS/2' },
    { from: 'gw',     to: 'auth',     protocol: 'gRPC' },
    { from: 'gw',     to: 'match',    protocol: 'gRPC' },
    { from: 'gw',     to: 'trip',     protocol: 'gRPC' },
    { from: 'match',  to: 'redis',    protocol: 'Redis' },
    { from: 'match',  to: 'kafka',    protocol: 'Kafka', async: true },
    { from: 'trip',   to: 'pg',       protocol: 'SQL' },
    { from: 'trip',   to: 'kafka',    protocol: 'Kafka', async: true },
    { from: 'kafka',  to: 'payment',  protocol: 'Kafka', async: true },
    { from: 'kafka',  to: 'notif',    protocol: 'Kafka', async: true },
    { from: 'payment',to: 'pg',       protocol: 'SQL' },
    { from: 'notif',  to: 'rider',    protocol: 'FCM' },
    { from: 'notif',  to: 'driver',   protocol: 'FCM' },
    { from: 'monitor',to: 'pg',       protocol: 'SQL',   async: true },
    { from: 'monitor',to: 'kafka',    protocol: 'Kafka', async: true },
  ];

  function mkState(overrides = {}, pkts = [], evts = [], metrics = {}) {
    return {
      nodes: BASE_NODES.map(n => ({ ...n, state: overrides[n.id] || 'idle', healthy: overrides[n.id] === 'error' ? false : undefined })),
      edges: EDGES,
      packets: pkts,
      events: evts,
      metrics: { rps: 0, p99_ms: 0, errors: 0, drivers: 0, ...metrics },
    };
  }

  /* ── Step 1: Normal baseline ────────────────────────────────────────────── */
  snap(steps, {
    ...mkState(
      { rider: 'active', gw: 'active', match: 'active', redis: 'active' },
      [packet('rider', 'gw', 'POST /ride', 'request'), packet('gw', 'match', 'match()', 'request')],
      [{ type: 'ok', msg: 'Normal ops: 200 RPS, P99 25ms, 0 errors' }],
      { rps: 200, p99_ms: 25, errors: 0, drivers: 850 },
    ),
    concepts: {
      flows: ['Rider → API Gateway → Match Svc (gRPC)', 'Match Svc → Redis GEORADIUS (locate drivers)', 'Match Svc → Rider (driver assigned + ETA)', 'Round-robin: 4 match replicas, normal 200 RPS load'],
      functional: ['Normal ride matching flow — rider to gateway to match service', 'Redis GEORADIUS finds nearby drivers', 'Round-robin across 4 match service replicas'],
      nonFunctional: ['200 req/s, P99 25ms, 0 errors', '850 drivers in Redis', 'All services healthy'],
      cost: ['4 match service replicas × c5.xlarge ~$700/mo', 'Redis cluster ~$500/mo', 'PostgreSQL primary + 2 replicas ~$1,200/mo', 'Kafka 3 brokers ~$3,600/mo'],
      edgeCases: ['Normal ops: baseline — nothing fails', 'At capacity: 200 RPS is 80% of 250 RPS per replica — a spike to 300 RPS would cause queuing'],
      tools: ['PostgreSQL (primary + 2 read replicas)', 'Redis (driver location cache)', 'Kafka (3 brokers, 7-day retention)', 'Prometheus + Grafana (monitoring)'],
    },
  }, 'Baseline: 200 req/s, P99 25ms, all healthy. 850 drivers in Redis. Normal round-robin across 4 match service replicas.', 1);

  /* ── Step 2: DB Primary Failure ──────────────────────────────────────────── */
  snap(steps, {
    ...mkState(
      { trip: 'active', pg: 'error', monitor: 'active' },
      [packet('trip',  'pg',       'INSERT trip',    'request'      ), packet('trip',   'pg',       'timeout!',      'error'        )],
      [{ type: 'error', msg: 'PostgreSQL primary unresponsive — network partition detected' }],
      { rps: 180, p99_ms: 2000, errors: 45, drivers: 850 },
    ),
    concepts: {
      flows: ['Trip Svc → PostgreSQL primary: INSERT times out (2s+)', 'Orphaned retries exhaust PgBouncer connection pool', 'Failover: read replica promoted to primary (30s RTO)', 'Kafka trip-backlog: writes queued for replay when PG recovers'],
      breakpoints: ['PostgreSQL primary unresponsive — Trip Svc INSERTs timeout at 2s+', 'Failover to read replica (RPO ~100ms async lag vs. 30s RTO)', 'Replica lag > 5s during promotion → stale reads for ongoing trips'],
      whys: ['Auto-failover to read replica gives 30s RTO', 'Circuit breaker in Trip Svc falls back to cached trip state for 60s', 'Queue writes to Kafka for replay when PG is down'],
      cost: ['PgBouncer connection pool exhaustion: orphaned retries consume all 100 pool connections', 'Failover RTO 30s: 180 RPS × 30s = 5,400 requests degraded', 'Replica promotion: ~2min total downtime before full recovery'],
      edgeCases: ['Replica lag during promo >5s: ongoing trips read stale location data — rider sees wrong driver position', 'Connection pool exhaustion: orphaned retries consume all connections → even healthy queries fail with pool timeout', 'Circuit breaker must be reset manually after verification — auto-reset would cause cascading'],
      tricky: ['Replica lag during promo: ongoing trips read stale location data', 'Connection pool exhaustion: orphaned retries consume all connections'],
      critical: ['45 requests erroring per second — must decide: failover vs degrade vs queue', 'Never auto-promote replica if lag > 10s — data loss unacceptable', 'Circuit breaker must be reset manually after verification'],
      tools: ['PostgreSQL streaming replication', 'PgBouncer connection pool', 'Kafka (trip-backlog topic for queued writes)'],
    },
  }, 'PostgreSQL Primary Failure — Trip Svc INSERTs start timing out (2s+). Critical: 45 requests erroring per sec. Make-or-break decision: failover to replica (RPO ~100ms async lag) vs. degrade gracefully (queue writes to Kafka for replay).', 2);

  /* ── Step 3: Kafka partition crash ───────────────────────────────────────── */
  snap(steps, {
    ...mkState(
      { kafka: 'error', trip: 'ok', payment: 'idle', notif: 'idle' },
      [packet('trip',   'kafka',  'TRIP_COMPLETED',  'event'        ), packet('kafka',  'monitor', 'no ISR',        'error'        )],
      [{ type: 'error', msg: 'Kafka broker 2 down — partition 0 has 0 in-sync replicas' }],
      { rps: 160, p99_ms: 22, errors: 12, drivers: 650 },
    ),
    concepts: {
      flows: ['Trip Svc → Kafka broker-2: TRIP_COMPLETED produced', 'Kafka broker-2 crashes → partition leader offline', 'ISR drops to 0 → min.insync.replicas=2 violated', 'Producer NotEnoughReplicas after 30s timeout', 'Trip Svc retries 3× → dead-letter to local disk'],
      breakpoints: ['Kafka broker 2 crashes — partition leader for RIDE_EVENTS goes offline', 'ISR (in-sync replica) drops to 0 → min.insync.replicas=2 violated', 'Producer gets NotEnoughReplicas exception after 30s timeout'],
      whys: ['Trip Svc retries 3× then dead-letters to local disk for manual replay', 'Payment Svc never notified = revenue leak if events are lost', 'Manual intervention: reassign partition to remaining brokers'],
      cost: ['Kafka broker-2 down: 2 of 3 brokers remaining — degraded throughput', 'Dead-lettered events: manual replay costs ~$200/h in engineer time', 'Partition reassignment: ~10min Kafka CLI operation', 'Revenue leak: 12 RPS errors × $20 avg ride × 10min = ~$144K lost revenue'],
      edgeCases: ['Dead-lettered events on local disk are LOST if Trip Svc pod restarts before manual replay', 'Mix of committed + uncommitted offsets: consumer group offset reset → some events processed, some skipped'],
      tricky: ['Kafka does not auto-reassign partitions — must use kafka-reassign-partitions.sh', 'Dead-lettered events on local disk are lost if Trip Svc pod dies'],
      critical: ['TRIP_COMPLETED events lost = rides completed but not paid = revenue leak', 'Mix of committed + uncommitted offsets makes recovery complex', 'Fix: KIP-966 (stronger quorum) + 5 brokers in production avoids single-broker failure'],
      tools: ['Kafka (3 brokers, RF=3)', 'Kafka-reassign-partitions (CLI)', 'Local disk dead-letter queue'],
    },
  }, 'Kafka Broker Failure — One of 3 brokers crashes. Partition leader for RIDE_EVENTS topic goes offline. ISR (in-sync replica) count drops to 0. Critical: TRIP_COMPLETED events can not be produced — Payment Svc never notified = revenue leak.', 3);

  /* ── Step 4: Redis memory exhaustion ─────────────────────────────────────── */
  snap(steps, {
    ...mkState(
      { redis: 'error', match: 'warn', monitor: 'active' },
      [packet('match',  'redis',  'GEORADIUS',       'request'      ), packet('match',  'redis',  'OOM!',          'error'        )],
      [{ type: 'error', msg: 'Redis OOM — used_memory > maxmemory, evictions at 5K/sec' }],
      { rps: 150, p99_ms: 500, errors: 80, drivers: 0 },
    ),
    concepts: {
      flows: ['Taylor Swift concert: 3× driver location key surge', 'Match Svc → Redis GEORADIUS: maxmemory exceeded', 'allkeys-lru eviction deletes TTL keys for driver locations', 'GEORADIUS returns empty → zero drivers found → zero matches', 'Revenue waterfall: 80 errors/s × $20 avg × 5min = $480K'],
      breakpoints: ['Taylor Swift concert: driver location keys (TTL 5s) spike 3×', 'maxmemory reached → evictions start at 5K/sec', 'allkeys-lru eviction deletes TTL keys — GEORADIUS returns empty', 'Zero drivers available → zero rides matched → revenue waterfall'],
      whys: ['allkeys-lru evicts ANY key — including active TTL keys for driver locations', 'Partial Redis data is useless for GEORADIUS — missing drivers = no matches', 'Fix: maxmemory-policy=volatile-ttl preserves TTL keys over cache keys'],
      cost: ['80 errors/s × $20 avg ride = $1,600/s revenue loss during outage', 'Redis cluster recovery: flush + backfill from Kafka GPS topic ~5min', 'Location Svc writes 50K GPS writes/s — Redis write amplification during recovery delays return to normal', 'Solution: maxmemory-policy=volatile-ttl costs $0 to configure'],
      edgeCases: ['Partial Redis data is useless for GEORADIUS — missing even 1 driver degrades match quality to 0', 'Recovery requires flush + backfill from Kafka GPS topic — takes minutes, during which zero rides match', 'Separate Redis cluster for driver locations vs general cache prevents other cache keys from polluting location keys'],
      tricky: ['Recovery requires flush + backfill from Kafka GPS topic — takes minutes', 'Location Svc writes 50K GPS writes/s — Redis write amplification during recovery'],
      critical: ['All-or-nothing failure: partial Redis data = 0 value', 'Separate Redis cluster for driver locations vs general cache prevents cross-contamination', 'Monitor memory_usage / maxmemory ratio with alert at 75%'],
      tools: ['Redis (maxmemory-policy, INFO memory, KEYS)', 'Kafka (GPS topic for backfill)', 'Prometheus (memory_usage metric)'],
    },
  }, 'Redis Out-of-Memory — Driver location keys (TTL 5s) increased 3× during Taylor Swift concert. maxmemory reached → evictions start. All driver keys evicted → no drivers available → zero rides matched → revenue waterfall.', 4);

  /* ── Step 5: Payment idempotency failure (double-charge) ─────────────────── */
  snap(steps, {
    ...mkState(
      { payment: 'error', pg: 'active', kafka: 'warn' },
      [packet('kafka', 'payment', 'TRIP_COMPLETED',   'event'        ), packet('payment', 'pg',     'INSERT charge', 'replication'  ), packet('kafka',  'payment', 'TRIP_COMPLETED(dup)','event')],
      [{ type: 'error', msg: 'Kafka rebalance delivers TRIP_COMPLETED twice! Idempotency key missing!' }],
      { rps: 5, p99_ms: 45, errors: 1, drivers: 650 },
    ),
    concepts: {
      flows: ['Kafka rebalance → TRIP_COMPLETED delivered twice (at-least-once)', 'Payment Svc processes first message → charge $18.40', 'Payment Svc processes duplicate → second charge $18.40', 'No idempotency guard → two PostgreSQL INSERTs → two Stripe charges'],
      breakpoints: ['Kafka rebalance causes message re-delivery of TRIP_COMPLETED', 'Payment Svc has no idempotency guard → processes twice → double-charges $18.40', 'Customer disputes + regulatory fine potential'],
      whys: ['UNIQUE constraint on idempotency_key in PostgreSQL prevents duplicate DB writes', 'SELECT … FOR UPDATE before charge prevents race conditions', 'Stripe idempotency-Key header provides safety at payment processor level'],
      cost: ['Double-charge: $18.40 × 2 charged to customer = $36.80', 'Regulatory fine: GDPR Article 32 non-compliance up to €20M or 4% of revenue', 'Customer dispute cost: chargeback fee $25 + processing overhead', 'Fix: add UNIQUE(idempotency_key) index = $0 in developer time'],
      edgeCases: ['Idempotency cache invalidation race condition: if cache entry expires between read and write, second charge goes through (2019 Uber incident)', 'Stripe idempotency key expires after 24h — DB is source of truth for retries beyond 24h', 'SELECT … FOR UPDATE before charge prevents race but adds 5ms latency per charge'],
      tricky: ['Idempotency cache invalidation race condition: 2019 Uber incident, 0.001% of rides double-charged', 'Stripe idempotency key expires after 24h — DB is source of truth for retries beyond 24h'],
      critical: ['Financial impact + angry customer + regulatory fine if repeat', 'Idempotency key on ALL payment writes — no exceptions', 'Dead-letter queue must trigger pager for manual reconciliation'],
      tools: ['PostgreSQL (idempotency_key UNIQUE constraint)', 'Stripe API (Idempotency-Key header)', 'Kafka (at-least-once delivery, consumer offsets)'],
    },
  }, 'Payment Idempotency Failure — Kafka rebalance causes message re-delivery. Payment Svc processes TRIP_COMPLETED twice because idempotency key lookup is unindexed → double charge of $18.40. Real-world: Uber incident 2019.', 5);

  /* ── Step 6: DDoS / rate limit attack ────────────────────────────────────── */
  snap(steps, {
    ...mkState(
      { gw: 'error', auth: 'idle', match: 'idle', monitor: 'active' },
      [packet('rider',  'gw',     'POST /ride x1000', 'request'      ), packet('rider',  'gw',     'POST /ride x1000', 'request'      )],
      [{ type: 'warn',  msg: 'Rate limit breach: 15K req/s from single IP (limit: 100/min)' }],
      { rps: 15000, p99_ms: 5000, errors: 14900, drivers: 850 },
    ),
    concepts: {
      flows: ['Compromised credential → 15K req/s from single IP', 'Gateway Redis rate-counter saturates at 100 req/min per IP', 'Redis INCR pipeline contention: rate-counter false negatives', 'Auth Svc overloaded: 500 req/s vs 50 normal → 503 errors', '14.9K req/s erroring — only 100 legitimate / get through'],
      breakpoints: ['Compromised credential: 15K req/s from single IP vs 100 req/min limit', 'Redis rate-counter contention causes false negatives — pipeline bottleneck', 'Auth Svc overloaded at 500 req/s (normal: 50) → legitimate users get 503'],
      whys: ['Redis INCR with 60s TTL works for normal traffic but fails under contention', 'Local token bucket (in-memory) eliminates Redis bottleneck', 'Global rate limit at DNS/CDN layer blocks before it reaches backend'],
      cost: ['14.9K RPS errors × $20 avg ride × 5min outage = ~$9M revenue loss', 'Cloudflare rate limiting: included in $200/mo Business plan', 'Local token bucket: zero cost — in-memory data structure', 'Redis INCR per request: ~500 Redis ops/s at 15K RPS → $0, just latency'],
      edgeCases: ['Distinguishing legitimate flash crowd (concert event) from attack: both look like traffic spikes', 'Rate limiter must fail CLOSED (block) not OPEN (allow) — failing open under contention makes attacks worse', 'Client reputation scoring: track failure patterns, not just IP counts — shared IPs (cellular NAT) block 100 legitimate users'],
      tricky: ['Distinguishing legitimate flash crowd (concert event) from attack', 'Client reputation scoring: track failure patterns, not just IP counts'],
      critical: ['Cascading: Gateway fails → Auth overloaded → all rides blocked', 'Always have global rate limits at CDN layer as first defense', 'Rate limiter must fail CLOSED (block) not OPEN (allow) under contention'],
      tools: ['Cloudflare (global rate limiting)', 'Token bucket (in-memory local + Redis sync)', 'Client reputation scoring engine'],
    },
  }, 'Rate Limit Attack — Compromised credential sends 15K req/s from one IP. Gateway rate limiter (token bucket, 100 req/min per IP) fails open due to Redis rate-counter contention → 14.9K req errors.', 6);

  /* ── Step 7: Cascading failure chain ─────────────────────────────────────── */
  snap(steps, {
    ...mkState(
      { gw: 'error', auth: 'error', match: 'error', trip: 'error', redis: 'error', kafka: 'warn', pg: 'error', monitor: 'active' },
      [],
      [
        { type: 'error', msg: 'CASCADE: Redis OOM → Match fail → Auth overload → Gateway backpressure → PG fallover' },
        { type: 'error', msg: 'Cascade detected. Circuit breakers tripped. 85% error rate.' },
      ],
      { rps: 50, p99_ms: 10000, errors: 43, drivers: 0 },
    ),
    concepts: {
      flows: ['Redis OOM → Match Svc GEORADIUS fails → times out', 'Gateway marks Match unhealthy → failover to Auth Svc (3× redirect load)', 'Auth overloaded at 500 req/s → all ride requests fail', 'Trip Svc orphaned retries → PgBouncer pool exhaustion', 'PG falls over → all 12 services error at 85%'],
      breakpoints: ['Redis OOM → Match Svc cannot find drivers → times out', 'Gateway marks Match unhealthy → Auth Svc gets 3× redirect load', 'Auth overloads → all rides fail → Trip Svc orphaned retries exhaust PG pool', 'PG falls over from connection exhaustion'],
      whys: ['Bulkhead pattern: separate thread pools prevent one dependency from consuming all resources', 'Circuit breaker: after N failures, fail fast without calling downstream — prevents cascade', 'Independent recovery: each service retries in isolation — no domino effect'],
      cost: ['85% error rate for 2h (2021 Uber outage case study)', 'Uber 2h outage: ~$600K revenue lost (200 RPS × $20 avg × 7200s × 85%)', 'Engineering incident response: 5 engineers × 2h × $150/h = $1,500', 'Post-mortem + remediation: ~$20K in engineering time'],
      edgeCases: ['Orphaned retries are the silent killer — they exhaust PG connections AFTER Redis recovers, extending outage', 'Feature flags for kill switches require deployment-free activation — push config, not code, to avoid code review delay', 'Chaos Monkey: randomly kills services in production to validate resilience — scary but necessary'],
      tricky: ['Orphaned retries are the silent killer — they exhaust resources after the root cause is already resolved', 'Feature flags for kill switches require deployment-free activation (use config push)'],
      critical: ['2021 Uber 2-hour global outage: single Redis config push cascaded through 12 services', 'Each service must survive ALL downstream dependencies failing — not just the ones it uses', 'Chaos Monkey: randomly kill services in production to validate resilience'],
      tools: ['Bulkhead (separate thread pools)', 'Circuit breaker (Hystrix/resilience4j)', 'Feature flags (LaunchDarkly)', 'Chaos Monkey', 'RED metrics (Rate, Errors, Duration)'],
    },
  }, 'Full Cascade Failure — Redis OOM triggers chain reaction through 6 services. Match Svc fails → Auth overloaded → all rides fail → Trip Svc retries exhaust PG pool. Real-world: 2021 Uber 2-hour global outage from single Redis config push.', 7);

  /* ── Step 8: Recovery + lessons ──────────────────────────────────────────── */
  snap(steps, {
    ...mkState(
      { rider: 'active', gw: 'active', match: 'active', redis: 'active', monitor: 'active' },
      [packet('rider', 'gw', 'POST /ride',               'request'      ), packet('gw',  'match', 'match()', 'request')],
      [
        { type: 'ok',   msg: 'Recovery complete. Circuit breakers reset. Redis OOM fixed with TTL tuning.' },
        { type: 'info', msg: 'Lessons: bulkheads, circuit breakers, graceful degradation, independent recovery.' },
      ],
      { rps: 200, p99_ms: 28, errors: 0, drivers: 850 },
    ),
    concepts: {
      flows: ['Circuit breakers reset after 60s cooldown → normal traffic resumes', 'Redis maxmemory-policy=volatile-ttl → TTL keys preserved under pressure', 'PG replica promoted → verified consistent → connections restored', 'Kafka partition reassigned to remaining 2 brokers → offline partition recovered'],
      functional: ['Circuit breakers reset after 60s cooldown', 'Redis maxmemory-policy changed to volatile-ttl', 'PG replica promoted and verified', 'Kafka partition reassigned to new broker'],
      nonFunctional: ['All services healthy, 200 req/s, 0 errors', 'Recovery time: ~4min for full stack (PG: 30s, Kafka: 2min, Redis: 1min, verification: 30s)'],
      cost: ['Total outage cost: ~$9M revenue + $20K engineering + regulatory exposure', 'Remediation: maxmemory-policy change = $0, bulkhead config = $0, circuit breaker library = free (OSS)', 'Chaos Monkey: free (Netflix OSS), requires engineering time to set up', 'Feature flags (LaunchDarkly): ~$200/mo for Pro plan'],
      whys: ['Each service must survive ALL downstream dependencies failing — not just normal traffic', 'Cascading failures are #1 cause of Uber downtime — bulkheads + circuit breakers are mandatory', 'Feature flags enable ops kill switches without deployment — push config, not code'],
      edgeCases: ['Recovery: circuit breakers reset MUST be verified one-by-one — not all at once (avoids thundering herd on dependency)', 'Post-mortem: every outage gets a blameless root-cause analysis within 48h — fastest path to corrective action', 'Monitoring: RED metrics (Rate, Errors, Duration) for EVERY dependency — not just services — because rate limiters and connection pools fail silently'],
      tools: ['Circuit breaker (resilience4j)', 'Bulkhead pattern', 'Chaos Monkey', 'RED monitoring', 'Feature flags'],
      critical: ['Testing: Chaos Monkey kills random services in production continuously', 'Monitoring: RED metrics (Rate, Errors, Duration) for every dependency — not just services', 'Post-mortem: every outage gets a blameless root-cause analysis within 48h'],
    },
  }, 'Recovery — Circuit breakers reset after 60s cooldown. Redis maxmemory-policy changed to volatile-ttl. PG replica promoted and verified. Kafka partition reassigned. Lessons: bulkheads, circuit breakers, graceful degradation, independent recovery.', 8);

  return steps;
}

const CODE = [
  '// Circuit breaker pattern (Trip Svc → PG)',
  'const breaker = new CircuitBreaker(async () => {',
  '  return pg.query("INSERT INTO trips ...");',
  '}, {',
  '  failureThreshold: 5,       // trips after 5 failures',
  '  successThreshold: 3,        // recovery after 3 successes',
  '  timeout: 2000,              // 2s per attempt',
  '  resetTimeout: 60_000,       // 60s cooldown',
  '  fallback: (trip) => {',
  '    // Graceful degradation: queue to Kafka instead',
  '    return kafka.publish("trip-backlog", trip);',
  '  },',
  '});',
  '',
  '// Idempotency guard',
  'async function chargeRider(tripId, amount) {',
  '  const key = `charge:${tripId}`;',
  '  await pg.query(',
  '    "INSERT INTO idempotency(key) VALUES($1) ON CONFLICT DO NOTHING", [key]',
  '  );',
  '  // Only charges if INSERT succeeded (first call)',
  '}',
];

const LAYERS = [
  { label: 'Client Apps',      x1: 8,    x2: 148, color: 'rgba(100,140,255,0.06)', border: 'rgba(100,140,255,0.30)' },
  { label: 'Gateway / Edge',   x1: 155,  x2: 300, color: 'rgba(255,160,50,0.06)',  border: 'rgba(255,160,50,0.35)' },
  { label: 'Core Services',    x1: 308,  x2: 490, color: 'rgba(60,200,120,0.06)',  border: 'rgba(60,200,120,0.28)' },
  { label: 'Data Infra',       x1: 498,  x2: 660, color: 'rgba(80,190,220,0.06)',  border: 'rgba(80,190,220,0.28)' },
  { label: 'Storage + Events', x1: 668,  x2: 800, color: 'rgba(190,110,220,0.06)', border: 'rgba(190,110,220,0.28)' },
  { label: 'Observability',    x1: 808,  x2: 950, color: 'rgba(220,90,90,0.06)',   border: 'rgba(220,90,90,0.28)' },
];

export default {
  id:       'uber-failures',
  label:    'Uber Failures',
  icon:     '💥',
  layers:   LAYERS,
  build:    buildUberFailureSteps,
  code:     CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'rps',     label: 'Req/s',    max: 20000, color: 'var(--node-active)',    unit: '' },
    { key: 'p99_ms',  label: 'P99 ms',   max: 12000, color: 'var(--node-comparing)', unit: 'ms', warn: 100, critical: 150 },
    { key: 'errors',  label: 'Errors/s', max: 20000, color: 'var(--pod-crash)',      unit: '' },
  ],
};

import { snap, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../../sd-types';
const _mk = createNodeFactory(ICONS);
const clientNode = _mk('client');
const gatewayNode = _mk('gateway');
const serviceNode = _mk('service');
const redisNode = _mk('redis');
const brokerNode = _mk('broker');
const dbNode = _mk('db');

/* ─────────────────────────────────────────────────────────────────────────────
   Uber Bounded Contexts (DDD Architecture)
   Each layer = one bounded context / envelope with F/NF requirements.

   Layout (user-space coords, fits scale=0.88 canvas):
     Context 0 (x≈75)  : Rider Bounded Context    — Client apps, auth, session
     Context 1 (x≈225) : Ride Booking Context      — Match, price, trip creation
     Context 2 (x≈390) : Ride Execution Context     — Live tracking, WS streams
     Context 3 (x≈540) : Payment Context            — Billing, payout, receipts
     Context 4 (x≈690) : Notification Context       — Push, email, SMS
     Context 5 (x≈840) : Data Platform              — Analytics, auditing, ML
───────────────────────────────────────────────────────────────────────────── */

function buildUberArchSteps() {
  const steps = [];

  /* ── Baseline nodes (one per key service with bounded-context metadata) ── */
  const BASE_NODES = [
    // Rider Context
    clientNode('rider',  'Rider App',    75,  165, { icon: '📱', ctx: 'Rider',      desc: 'iOS/Android — SwiftUI/Jetpack Compose' }),
    clientNode('driver', 'Driver App',   75,  350, { icon: '🚗', ctx: 'Driver',     desc: 'Background GPS, Kotlin/Swift' }),

    // Booking Context
    gatewayNode('gw',    'API Gateway',   225, 260, { ctx: 'Booking',  desc: 'Kong/Tyk — rate limit, auth delegation, routing' }),
    serviceNode('auth',  'Auth Service',  390, 105, { icon: '🔐', ctx: 'Rider',      desc: 'JWT, OAuth2, 3rd-party SSO' }),
    serviceNode('match', 'Ride Matching', 390, 235, { icon: '🎯', ctx: 'Booking',    desc: 'Geospatial match + ETA + surge' }),
    serviceNode('price', 'Pricing Svc',   390, 365, { icon: '💰', ctx: 'Booking',    desc: 'Surge calc, fare estimation, promo' }),
    redisNode('redis',   'Redis Cluster', 535, 235, { ctx: 'Booking',  desc: 'Driver locations, GEORADIUS, TTL 5s' }),

    // Execution Context
    serviceNode('trip',  'Trip Service',   680, 175, { icon: '🗺️', ctx: 'Execution',  desc: 'Trip lifecycle, state machine' }),
    serviceNode('ws',    'WebSocket Svc',  680, 310, { icon: '🔌', ctx: 'Execution',  desc: 'Persistent conn manager' }),

    // Payment Context
    serviceNode('pay',   'Payment Svc',    830, 175, { icon: '💳', ctx: 'Payment',    desc: 'Stripe, idempotency, retry logic' }),
    dbNode('pg',         'PostgreSQL',     830, 310, { ctx: 'Payment',  desc: 'Sharded by city_id, 2 read replicas' }),

    // Notification Context
    serviceNode('notif', 'Notification',   980, 175, { icon: '🔔', ctx: 'Notification', desc: 'FCM/APNs, Twilio SMS, email' }),
    brokerNode('kafka',  'Kafka',          980, 310, { ctx: 'Notification', desc: '3 brokers, 7-day retention' }),
  ];

  /* ── Edges ─────────────────────────────────────────────────────────────── */
  const EDGES = [
    { from: 'rider', to: 'gw',    protocol: 'HTTPS/2' },
    { from: 'driver',to: 'gw',    protocol: 'HTTPS/2' },
    { from: 'gw',    to: 'auth',  protocol: 'gRPC' },
    { from: 'gw',    to: 'match', protocol: 'gRPC' },
    { from: 'gw',    to: 'trip',  protocol: 'gRPC' },
    { from: 'match', to: 'price', protocol: 'gRPC' },
    { from: 'match', to: 'redis', protocol: 'Redis' },
    { from: 'match', to: 'kafka', protocol: 'Kafka', async: true },
    { from: 'trip',  to: 'ws',    protocol: 'WS' },
    { from: 'trip',  to: 'pg',    protocol: 'SQL' },
    { from: 'trip',  to: 'kafka', protocol: 'Kafka', async: true },
    { from: 'kafka', to: 'notif', protocol: 'Kafka', async: true },
    { from: 'kafka', to: 'pay',   protocol: 'Kafka', async: true },
    { from: 'pay',   to: 'pg',    protocol: 'SQL' },
    { from: 'notif', to: 'rider', protocol: 'FCM' },
    { from: 'notif', to: 'driver',protocol: 'FCM' },
    { from: 'ws',    to: 'rider', protocol: 'WS' },
  ];

  function mkState(overrides = {}, pkts = [], evts = [], metrics = {}) {
    return {
      nodes: BASE_NODES.map(n => ({ ...n, state: overrides[n.id] || 'idle', healthy: overrides[n.id] === 'error' ? false : undefined })),
      edges: EDGES,
      packets: pkts,
      events: evts,
      metrics: { rps: 0, p99_ms: 0, drivers: 0, surge: '1.0×', ...metrics },
    };
  }

  /* ── Step 1: Architecture overview — all bounded contexts ───────────────── */
  snap(steps, {
    ...mkState(),
    concepts: {
      flows: ['Rider App → GraphQL → API Gateway (gRPC → REST)', 'Booking → ETA + Surge response back to rider (sync)', 'Ride matched → Execution state machine across contexts', 'Payment charge flow: Execution → Kafka → Payment Svc'],
      functional: ['Visualize all 6 bounded contexts and their relationships', 'Understand envelope boundaries and inter-context communication'],
      nonFunctional: ['Each context independently deployable and scalable', 'Cross-context calls always through API — no shared DB'],
      cost: ['Kafka cluster (3 brokers × 3 AZs) ~$3,600/mo', 'Redis GEORADIUS cluster ~$500/mo per region', 'Each context: 3–8 replicas × c5.xlarge ~$700/mo per context', 'gRPC overhead ~0.3ms negligible at 200 RPS'],
      whys: ['Bounded contexts prevent tight coupling — teams own their domain', 'Enforced API boundaries enable independent versioning'],
      edgeCases: ['Context boundary violation: dev reads Payment DB from Booking code — architectural violation caught in code review', 'Kafka schema evolution: new field in TRIP_COMPLETED breaks downstream consumer', 'Slow gRPC call chain: Rider → Booking → multiple sub-calls exceeds 200ms SLA'],
      tools: ['gRPC (sync inter-context)', 'Kafka (async events)', 'REST (external-facing APIs)'],
    },
  }, 'Uber DDD Architecture — 6 bounded contexts (envelopes). Each envelope encapsulates one domain concern with clear inbound/outbound contracts. Horizontal lines = context boundaries. Hover for details.', 1);

  /* ── Step 2: Rider Bounded Context ──────────────────────────────────────── */
  snap(steps, {
    ...mkState(
      { rider: 'active', driver: 'active', auth: 'active' },
      [],
      [
        { type: 'info', msg: 'Rider Context: session mgmt, auth, client-rendered UI' },
        { type: 'info', msg: 'Driver Context: GPS ingestion, background services, push rx' },
      ],
      { rps: 0, drivers: 47 },
    ),
    concepts: {
      flows: ['Rider opens app → GraphQL fetch (user profile + recent rides)', 'Ride request → POST /ride → Gateway → Booking', 'Driver GPS ping → WebSocket → Location Svc every 3s', 'Ride updates pushed via FCM (new driver, ETA change)'],
      functional: ['Signup/login with OAuth2/SSO + biometry', 'Ride request UI with real-time map', 'Payment method management (card, cash, wallet)', 'Ride history and receipts', 'Driver GPS ping and background location'],
      nonFunctional: ['P99 cold start < 200ms', 'Offline-capable via local cache (GraphQL)', 'App size < 60MB (dynamic delivery)', 'Biometry auth completes < 500ms'],
      cost: ['GraphQL CDN caching ~$200/mo for static assets', 'FCM push: free up to 1M messages/day', 'Offline queue uses local SQLite — zero server cost', 'Dynamic delivery (split APK/DMG) reduces CDN bandwidth by 40%'],
      whys: ['Client-side state reduces server round-trips for UI', 'Offline queue prevents data loss on network loss', 'GraphQL enables efficient data fetching per screen'],
      edgeCases: ['App killed mid-ride: local cache + API restore on relaunch finds active trip', 'Network loss during ride request: queue request locally, retry on reconnect with exponential backoff', 'Biometry sensor unavailable: fallback to PIN with degraded auth flow'],
      tools: ['SwiftUI/Kotlin Compose (UI)', 'GraphQL Apollo (data layer)', 'FCM (push)', 'OAuth2 + JWT (auth)'],
      breakpoints: ['App killed mid-ride: how to restore trip state? Local cache + API restore on relaunch', 'Network loss during ride request: queue request locally, retry on reconnect'],
      tricky: ['Biometry fallback when sensor unavailable', 'Dynamic delivery fails on old OS — full APK fallback needed'],
      critical: ['Never cache payment auth tokens in plaintext', 'Biometry must degrade gracefully to PIN'],
    },
  }, 'Rider Envelope — Functional: signup/login, ride request UI, payment method mgmt, ride history. Non-functional: P99 < 200ms cold start, offline-capable (GraphQL cache), biometry auth. Why: Client-side state reduces server load, offline queue prevents data loss on network loss. App size < 60MB (dynamic delivery via split APK/DMG).', 2);

  /* ── Step 3: Booking Bounded Context ────────────────────────────────────── */
  snap(steps, {
    ...mkState(
      { gw: 'active', match: 'active', price: 'active', redis: 'active' },
      [],
      [
        { type: 'info', msg: 'Booking Context: ride matching, surge pricing, fare estimation' },
        { type: 'ok',   msg: 'Redis GEORADIUS: < 2ms read, TTL-based expiry' },
        { type: 'ok',   msg: 'Pricing Svc: demand/supply ratio computed every 15s' },
      ],
      { rps: 200, p99_ms: 14, drivers: 1200, surge: '1.8×' },
    ),
    concepts: {
      flows: ['Rider → API Gateway → Booking (gRPC trip request)', 'Booking → Redis GEORADIUS (locate drivers)', 'Booking → Pricing Svc (gRPC surge calc)', 'Match found → Booking → Kafka RIDE_REQUESTED (async)', 'Booking → Rider (gRPC response: driver + ETA)'],
      functional: ['Find nearby drivers via geospatial query', 'Compute surge multiplier from demand/supply', 'Estimate fare with distance + time + surge', 'Match rider to best driver (closest + highest rated)'],
      nonFunctional: ['P99 match time < 50ms', '99.99% match accuracy within 2km radius', 'Redis GEORADIUS P99 < 2ms', 'Surge computed every 15s across all active regions'],
      cost: ['Redis GEORADIUS cluster (r6g.large × 3) ~$500/mo', 'gRPC overhead ~0.3ms per call at 200 RPS', 'Redis 200M reads/day ~0.69M RCU — within single cluster capacity', 'Kafka RIDE_REQUESTED ~20 MB/s peak — negligible broker cost'],
      whys: ['Redis eliminates DB read on hot path — 200M GEORADIUS calls/day', 'Sync gRPC for ETA/surge (must return before rider can confirm)', 'Async Kafka for side-effects — no blocking on downstream'],
      edgeCases: ['Redis OOM: allkeys-lru eviction deletes driver-location TTL keys → GEORADIUS returns empty = zero matches', 'Surge price must be accepted by rider before match proceeds — atomicity failure double-charges surge + base', 'Two riders matched to same driver simultaneously: pessimistic lock on driver ID in Redis prevents race'],
      tools: ['Redis (GEORADIUS, in-memory geo-index)', 'gRPC (sync Pricing/Match calls)', 'Kafka (RIDE_REQUESTED event)'],
      breakpoints: ['Redis OOM when driver count spikes at events: allkeys-lru eviction deletes TTL keys → GEORADIUS returns empty', 'Pricing Svc latency spike: surge computation queued behind slow DB query'],
      tricky: ['Surge price must be accepted by rider before match proceeds — atomicity across Pricing + Match', 'Redis GEORADIUS accuracy degrades with distance at high latitudes: WGS-84 vs Mercator projection'],
      critical: ['Surge must not exceed regulatory caps (some cities: max 3×)', 'Race condition: two riders matched to same driver simultaneously — Match Svc uses pessimistic locking on driver ID in Redis'],
    },
  }, 'Booking Envelope — Functional: find nearby drivers, compute surge, estimate fare, match rider-to-driver. Non-functional: P99 matching < 50ms, 99.99% match accuracy within 2km radius. Why: Redis eliminates DB read on hot path — 200M GEORADIUS calls/day. Sync gRPC for ETA/surge (must return before rider confirmation). Async Kafka for downstream side-effects (no blocking). Tools: Redis (in-memory geo), Pricing (gRPC), Kafka (event bus).', 3);

  /* ── Step 4: Execution Bounded Context ──────────────────────────────────── */
  snap(steps, {
    ...mkState(
      { trip: 'active', ws: 'active' },
      [],
      [
        { type: 'ok',   msg: 'Trip state machine: CREATED → ACCEPTED → ACTIVE → COMPLETED → PAID' },
        { type: 'info', msg: 'WebSocket: persistent push of driver location every 3s' },
      ],
      { rps: 15, p99_ms: 35, drivers: 1, surge: '1.8×' },
    ),
    concepts: {
      flows: ['Driver accepts → Trip state: ACCEPTED (PostgreSQL)', 'Location Svc → WebSocket → Rider (driver GPS every 3s)', 'Ride ends → Kafka TRIP_COMPLETED → Payment + Notification', 'Rider cancels → state CREATED→CANCELED → Kafka event'],
      functional: ['Track trip lifecycle through state machine', 'Stream driver GPS location to rider in real-time', 'Handle trip modifications: reroute, cancel, update ETA', 'Location history for post-ride audit'],
      nonFunctional: ['WebSocket reconnect < 1s', 'At-most-once location delivery (stale locations acceptable)', 'Trip state transitions < 100ms'],
      cost: ['WebSocket persistent connection per active trip: 15K concurrent trips = 15K TCP connections', 'PostgreSQL Trip Svc: SERIALIZABLE isolation ~2× write overhead vs READ COMMITTED', 'Redis location cache: 15K trips × 3s GPS = 5 GPS writes/s per trip = 75K writes/s total', 'Kafka TRIP_COMPLETED: ~15K events/h = negligible throughput cost'],
      whys: ['WebSocket avoids 5× polling overhead vs HTTP for live location', 'State machine in PostgreSQL ensures consistency without distributed lock', 'At-most-once delivery accepts data loss over double-write conflicts'],
      edgeCases: ['Driver enters tunnel → WS drops: Location Svc caches last known position, resumes on reconnect with stale data', 'Trip Svc pod crashes mid-ride: new pod reads state from PostgreSQL and resumes WS — rider sees brief disconnect', 'Rider cancels while driver is accepting: Trip Svc must reject second acceptance with stale CREATED trip state'],
      tools: ['PostgreSQL (trip state with SERIALIZABLE isolation)', 'WebSocket (persistent connection)', 'Redis (location cache, resume on reconnect)'],
      breakpoints: ['Driver enters tunnel → WS drops: Location Svc caches last known position, resumes on reconnect', 'Trip Svc pod crashes mid-ride: new pod reads state from PostgreSQL and resumes WS', 'Rider cancels while driver is accepting: Trip Svc must reject second acceptance with stale trip state'],
      tricky: ['Trip state transitions must be atomic: CREATED→ACCEPTED locked to prevent double-accept', 'WS reconnect storm after network recovery: exponential backoff per connection'],
      critical: ['Never process a trip with stale state — always validate state before transition', 'Canceled trip must not re-enter active state — guard with optimistic locking'],
    },
  }, 'Execution Envelope — Functional: track trip lifecycle, stream driver GPS to rider, handle trip modifications (reroute, cancel). Non-functional: WebSocket reconnect < 1s, at-most-once location delivery (stale locations OK). Why: WS avoids 5× polling overhead vs HTTP. Trip state machine (PostgreSQL + application code) ensures consistency without distributed lock.', 4);

  /* ── Step 5: Payment Bounded Context ────────────────────────────────────── */
  snap(steps, {
    ...mkState(
      { pay: 'active', pg: 'active' },
      [],
      [
        { type: 'ok',   msg: 'Stripe charge: idempotency key prevents double-charge' },
        { type: 'warn', msg: 'Edge case: payment failed → retry with exponential backoff (3 attempts)' },
      ],
      { rps: 5, p99_ms: 90, drivers: 0, surge: '1.8×' },
    ),
    concepts: {
      flows: ['Kafka TRIP_COMPLETED consumed → Payment Svc starts', 'Payment Svc → Stripe API (idempotency key header)', 'Charge success → INSERT into PostgreSQL payment ledger', 'Charge fail → retry 3× (100ms/500ms/2s) → dead-letter topic', 'PAYMENT_DONE → Kafka → Notification Svc (receipt push)'],
      functional: ['Charge rider payment method via Stripe', 'Payout driver earnings weekly', 'Handle refunds and partial refunds', 'Apply promo codes and credits', 'Generate receipt and invoice'],
      nonFunctional: ['P99 charge completion < 200ms (Stripe API avg 80ms)', 'Exactly-once processing via idempotency keys', 'Retry with exponential backoff: 100ms / 500ms / 2s → dead-letter queue'],
      cost: ['Stripe API: 2.9% + $0.30 per charge — $0.87 avg fee on $20 ride', 'PostgreSQL idempotency table: UNIQUE index overhead ~0.1ms per write', 'Kafka PAYMENT_DONE: ~15K events/day — free within provisioned cluster', 'Dead-letter queue monitoring: PagerDuty ~$30/mo per escalation policy'],
      whys: ['Async via Kafka decouples payment from trip end — Payment Svc retries independently', 'Idempotency keys prevent financial double-charge on retry', 'PostgreSQL UNIQUE constraint on idempotency_key prevents duplicate writes at DB level'],
      edgeCases: ['Stripe returns 500 → retry exhausted → dead-letter → payment never processed = revenue leak until manual reconcile', 'Kafka rebalance delivers TRIP_COMPLETED twice → idempotency key catches duplicate only if DB lookup succeeds', 'Promo code + surge: which is applied first? Surge on base fare, then promo on surged amount — calculation mismatch'],
      tools: ['Stripe API (charge processing)', 'PostgreSQL (payment ledger, idempotency store)', 'Kafka (TRIP_COMPLETED / PAYMENT_DONE events)'],
      breakpoints: ['Stripe returns 500 → Payment Svc retries with backoff, then dead-letter', 'Kafka rebalance delivers TRIP_COMPLETED twice → idempotency key catches duplicate', 'Promo code + surge interaction: which is applied first? Surge, then promo on surged amount'],
      tricky: ['Stripe idempotency key expires after 24h — what if retry arrives after expiry? Payment Svc uses DB idempotency as source of truth', 'Partial refund vs full refund state machine — refunded trip must not allow second charge'],
      critical: ['Idempotency key on ALL payment writes prevents financial double-charge', 'Dead-letter queue must trigger pager — unreconciled payments cause revenue leak', 'PCI compliance: never store raw card data, use Stripe tokens'],
    },
  }, 'Payment Envelope — Functional: charge rider, payout driver, handle refunds, promo codes. Non-functional: exactly-once payment (idempotency keys), P99 charge < 200ms (Stripe API avg 80ms). Why: Async via Kafka decouples payment from trip end — payment service can retry without blocking trip completion.', 5);

  /* ── Step 6: Notification Bounded Context ───────────────────────────────── */
  snap(steps, {
    ...mkState(
      { notif: 'active', kafka: 'active' },
      [],
      [
        { type: 'ok',   msg: 'FCM delivery: ~150ms P50, ~800ms P99' },
        { type: 'info', msg: 'Kafka offset committed only after FCM acknowledges' },
      ],
      { rps: 50, p99_ms: 800, drivers: 1, surge: '1.8×' },
    ),
    concepts: {
      flows: ['Kafka TRIP_COMPLETED → Notif Svc consumer group', 'Ride status push → FCM → Rider App (150ms P50)', 'Emergency → Twilio SMS → Rider phone (5s SLA)', 'Email receipt → SendGrid API (fire-and-forget)', 'In-app notification → WebSocket (real-time feed)'],
      functional: ['Push notifications to rider (ride status, ETA, receipt)', 'Push to driver (ride request, cancellations)', 'SMS fallback for critical notifications', 'Email receipts and marketing', 'In-app notification center'],
      nonFunctional: ['P99 push delivery < 2s', 'SMS delivery < 5s (Twilio SLA)', 'At-least-once delivery with dedup at receiver'],
      cost: ['FCM: free up to 1M messages/day — $0 after that', 'Twilio SMS: $0.0079 per SMS — 100× cost of push', 'SendGrid email: free tier 100/day, then $20/mo for 50K', 'Kafka consumer group: 100 KB/s at 50 RPS — negligible broker cost'],
      whys: ['Kafka consumer group enables parallel push processing', 'At-least-once delivery with dedup notification_id prevents duplicate pushes', 'FCM primary + Twilio fallback covers device offline scenarios'],
      edgeCases: ['FCM rate limit (600 req/min per device token): burst sends queue and throttle — ride-request push delayed', 'FCM token expires → push falls back to SMS — $0.0079 per message vs $0 push cost', 'FCM token cache invalidation bug (2023 Uber outage): invalid token sent → FCM silently drops → 2-hour push blackout'],
      tools: ['FCM (primary push channel)', 'Twilio (SMS fallback)', 'SendGrid (email)', 'Kafka (event buffer, consumer groups)'],
      breakpoints: ['FCM rate limit (600 req/min per device token): Notif Svc must batch', 'FCM token expires → push fails → fallback to SMS', '2023 Uber outage: FCM token cache invalidation bug caused 2-hour push blackout'],
      tricky: ['Notification priority: ride request must be high-priority FCM, marketing can be low', 'Dedup-id in push payload: receiver ignores duplicate notification_ids within 5min window'],
      critical: ['Never batch different notification types — ride-request has delivery SLA, marketing does not', 'FCM key rotation: cache token → FCM key mapping, re-register on rotate', 'SMS costs 100× push — limit to critical notifications only'],
    },
  }, 'Notification Envelope — Functional: push to rider/driver (FCM), SMS fallback (Twilio), email receipts (SendGrid), in-app notifications. Non-functional: P99 push delivery < 2s, SMS < 5s. Why: Kafka consumer group enables parallel push processing with at-least-once delivery. Deduplication at receiver (notification_id in push payload).', 6);

  /* ── Step 7: Data Platform Context ───────────────────────────────────────── */
  snap(steps, {
    ...mkState(
      { kafka: 'active' },
      [],
      [
        { type: 'info', msg: 'Analytics: Kafka → Hive → hourly ETL for ML model training' },
        { type: 'info', msg: 'Auditing: every ride event logged to separate Kafka topic with 90-day retention' },
      ],
      { rps: 200, p99_ms: 15, drivers: 1200, surge: '1.8×' },
    ),
    concepts: {
      flows: ['Kafka Connect → S3 raw data lake (all ride events)', 'S3 → Hive/Spark ETL → Parquet → ML training data', 'ML model → Michelangelo inference → production (ETA, surge)', 'Apache Airflow DAG: hourly ETL scheduled, retry on failure'],
      functional: ['Ride analytics dashboards (real-time + historical)', 'ML model training: ETA prediction, surge optimization, fraud detection', 'Regulatory auditing and compliance reporting', 'A/B testing platform for pricing and matching algorithms'],
      nonFunctional: ['90-day retention for audit topics', '7-day retention for operational topics', 'ETL pipeline completes within 1h per day', 'PII masking at connector level before landing in data lake'],
      cost: ['S3 data lake: ~$23/TB/mo — 90-day ride events ~2TB = $46/mo', 'Kafka audit topic 90-day retention: ~$300/mo extra broker storage', 'Spark ETL cluster: ~$150/h for 1h daily = $4,500/mo', 'Airflow workers: ~$50/mo on small instances'],
      whys: ['Separate data pipeline prevents analytical queries from affecting production', 'Kafka mirroring streams prod data to analytics cluster without impact', 'PII masking at connector level ensures compliance (GDPR, CCPA) before any processing'],
      edgeCases: ['ETL job fails mid-run: checkpoint-based restart from last success — if checkpoint stale, reprocess 2h of data', 'Schema evolution: new ride field added but Hive table not updated → column mismatch → ETL fails silently at serde step', 'GDPR right-to-delete must cascade through S3: delete from data lake + all Parquet snapshots + ML training sets'],
      tools: ['Kafka Connect → S3 (raw data lake)', 'Hive/Spark (ETL processing)', 'PyTorch + Michelangelo (ML model training/inference)', 'Apache Airflow (pipeline orchestration)'],
      breakpoints: ['ETL job fails mid-run: checkpoint-based restart from last success', 'Schema evolution: new ride field added but Hive table not updated → column mismatch → job fails'],
      tricky: ['PII is not just email/phone — GPS trail is also PII in GDPR → must be masked/aggregated before storage', 'ML model training data must be time-windowed to avoid data leakage (future data in training set)'],
      critical: ['Regulatory compliance: GDPR right-to-delete must cascade through data lake', 'Never store raw GPS coordinates in long-term storage — only anonymized grid cells', 'Model drift monitoring: surge model trained on pre-COVID data will fail post-COVID'],
    },
  }, 'Data Platform Envelope — Functional: ride analytics, ML model training (ETA prediction, surge optimization, fraud detection), regulatory auditing. Non-functional: 90-day retention for audit, 7-day for operational topics. Why: Separate data pipeline prevents analytical queries from affecting production — Kafka mirroring streams prod data to analytics cluster.', 7);

  /* ── Step 8: Context communication summary ──────────────────────────────── */
  snap(steps, {
    ...mkState(
      { rider: 'active', gw: 'active', auth: 'active', match: 'active', price: 'active', redis: 'active', trip: 'active', ws: 'active', pay: 'active', pg: 'active', notif: 'active', kafka: 'active' },
      [],
      [
        { type: 'ok',   msg: 'Sync (gRPC): Rider/Booking Contexts — low-latency imperative flow' },
        { type: 'ok',   msg: 'Async (Kafka): Execution/Notification/Payment — decoupled side-effects' },
        { type: 'ok',   msg: 'Sync (SQL): Payment/Execution with PostgreSQL — ACID-critical state' },
        { type: 'info', msg: 'In-memory (Redis): Booking — sub-millisecond geospatial queries' },
      ],
      { rps: 200, p99_ms: 90, drivers: 1200, surge: '1.8×' },
    ),
    concepts: {
      flows: ['Rider App → gRPC → Booking (match + surge)', 'Booking → Kafka → Payment (async charge)', 'Execution → Kafka → Notification (async push)', 'Redis: hot-path geo queries bypass DB completely'],
      functional: ['4 communication patterns across 6 bounded contexts', 'Each context owns its data — zero cross-context DB access'],
      nonFunctional: ['Sync gRPC: 50ms P99 ride match (Rider→Booking)', 'Async Kafka: independent scaling (Payment Svc = 3 replicas)', 'Redis: 200M GEORADIUS calls/day at < 2ms P99'],
      cost: ['gRPC: zero additional infra cost — reuses existing k8s service mesh', 'Kafka cluster shared across 4 contexts — cost amortized', 'Redis: dedicated cluster for Booking = $500/mo, separate from generic cache', 'Each context deploys independently = lower blast radius but higher aggregate k8s overhead (~$700/context/mo)'],
      whys: ['Sync for imperative flow (rider must get answer before proceeding)', 'Async for side-effects (payment should not block trip completion)', 'Data ownership eliminates coupling — no shared schema', 'Each context can fail independently without cascading'],
      edgeCases: ['Cross-context DB access by mistake: dev queries Payment DB from Booking — architectural boundary violation — must enforce via code review + DB firewall', 'Dead-letter topic for every async consumer: unprocessed messages pile up silently if alert not configured', 'Circuit breaker tripped on gRPC: if Booking fails, Rider gets 503 — should Rider show cached price or error?'],
      tools: ['gRPC (sync inter-context)', 'Kafka (async event bus)', 'Redis (in-memory hot path)', 'PostgreSQL (ACID state)'],
      critical: ['No cross-context DB reads: always through API', 'Dead-letter topics for every async consumer', 'Circuit breaker on every sync gRPC call', 'Each context independently deployable and scalable'],
    },
  }, 'Communication Summary — 4 communication patterns across 6 contexts. Sync gRPC between Rider+Booking ensures 50ms P99 ride match. Async Kafka links Execution→Payment→Notification enables independent scaling. Redis isolates Booking hot-path from DB contention. Key design principle: each context owns its data — no cross-context DB access.', 8);

  return steps;
}

const CODE = [
  '// Bounded Context boundary enforcement',
  '// Each context owns its data and exposes APIs only',
  '',
  '// Rider Context → Booking Context (sync)',
  'POST /v1/rides { pickup, dropoff } → 200 { trip_id, driver, eta }',
  '',
  '// Booking Context → Payment Context (async via Kafka)',
  'RIDE_COMPLETED { trip_id, fare, surge } → Payment Svc consumes',
  '',
  '// Communication rules:',
  '//  1. No cross-context DB reads (always through API)',
  '//  2. Async for side-effects, sync for imperative flow',
  '//  3. Each context can fail independently',
  '//  4. Dead-letter topics for processing failures',
];

const LAYERS = [
  { label: 'Rider & Driver',     x1: 8,    x2: 155, color: 'rgba(100,140,255,0.06)', border: 'rgba(100,140,255,0.30)' },
  { label: 'Booking Core',       x1: 162,  x2: 475, color: 'rgba(255,160,50,0.06)',  border: 'rgba(255,160,50,0.35)' },
  { label: 'Ride Execution',     x1: 482,  x2: 630, color: 'rgba(60,200,120,0.06)',  border: 'rgba(60,200,120,0.28)' },
  { label: 'Payment',            x1: 638,  x2: 785, color: 'rgba(80,190,220,0.06)',  border: 'rgba(80,190,220,0.28)' },
  { label: 'Notification',       x1: 793,  x2: 940, color: 'rgba(190,110,220,0.06)', border: 'rgba(190,110,220,0.28)' },
  { label: 'Data Platform',      x1: 948,  x2: 1090, color: 'rgba(220,90,90,0.06)',  border: 'rgba(220,90,90,0.28)' },
];

export default {
  id:       'uber-arch',
  label:    'Uber Architecture',
  icon:     '🏛️',
  layers:   LAYERS,
  build:    buildUberArchSteps,
  code:     CODE,
  language: 'Markdown',
  metrics: [
    { key: 'rps',     label: 'Req/s',    max: 300, color: 'var(--node-active)',    unit: '' },
    { key: 'p99_ms',  label: 'P99 ms',   max: 200, color: 'var(--node-comparing)', unit: 'ms', warn: 100, critical: 150 },
    { key: 'drivers', label: 'Drivers',  max: 1500, color: 'var(--pod-running)',   unit: '' },
  ],
  codeNotes: [
    { title: 'Bounded Context Communication', content: 'Sync (gRPC) for imperative flows: Rider→Booking (50ms P99). Async (Kafka) for side-effects: Execution→Payment→Notification. No cross-context DB access — always through API.' },
    { title: 'Rider Context', content: 'Signup/login (OAuth2 + biometry), ride request UI with real-time map, payment method mgmt. Offline-capable via GraphQL local cache. App size < 60MB.' },
    { title: 'Booking Context', content: 'Redis GEORADIUS for driver location. Pricing Svc computes surge from demand/supply. Kafka for RIDE_REQUESTED event. P99 match time < 50ms.' },
    { title: 'Payment + Data Contexts', content: 'Async via Kafka decouples charging from trip completion. Idempotency keys prevent double-charge. Data Platform: Kafka → S3 → Spark ETL for ML training.' },
  ],
  tradeoffs: [
    { pro: 'Bounded contexts prevent tight coupling — teams own their domain', con: 'Context boundaries add gRPC/Kafka overhead (~1ms per cross-context call). 6 contexts × 2 hops = 12ms extra.' },
    { pro: 'Each context independently deployable and scalable', con: 'N+1 problem: each context needs its own k8s deployment + monitoring + on-call. Ops overhead ~$700/context/mo.' },
    { pro: 'Data ownership eliminates shared-schema coupling', con: 'Cross-context queries require scatter-gather. Booking cannot query Payment data — must go through Payment API.' },
    { pro: 'Different communication patterns per use case', con: 'Polyglot communication adds complexity: gRPC for sync, Kafka for async, Redis for hot-path. Devs must know 3 protocols.' },
  ],
  bestPractices: [
    'Enforce context boundaries with linter rules: no cross-context DB imports. All inter-context communication through APIs only.',
    'Each async consumer must have dead-letter topic + alert. Unprocessed events pile up silently if not monitored.',
    'Circuit breaker on every sync gRPC call. Failure threshold: 5 consecutive failures → open circuit for 60s.',
    'Use feature flags (LaunchDarkly) for kill switches per context — allows ops to disable broken context without deployment.',
    'Monitor RED metrics (Rate, Errors, Duration) per context, not per service. Context-level SLO: P99 < 100ms, error rate < 0.1%.',
  ],
};

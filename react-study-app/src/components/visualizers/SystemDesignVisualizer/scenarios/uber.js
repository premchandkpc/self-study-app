import { snap, node, packet } from './shared.js';

/* ─────────────────────────────────────────────────────────────────────────────
   Uber System Design — full 14-component architecture
   Layout (user-space coords, fits scale=0.88 canvas):
     Layer 0 (x≈75)  : Client apps
     Layer 1 (x≈215) : API Gateway
     Layer 2 (x≈360) : Core services (Auth, Ride Match, Location)
     Layer 3 (x≈500) : Domain services (Pricing, Trip, Payment)
     Layer 4 (x≈645) : Infra (Redis, Kafka, Notification)
     Layer 5 (x≈790) : Storage (PostgreSQL, WebSocket)
───────────────────────────────────────────────────────────────────────────── */

function buildUberSteps() {
  const steps = [];

  /* ── baseline nodes ─────────────────────────────────────────────────────── */
  const BASE_NODES = [
    node('rider',    'Rider App',       'client',  75,  190, { icon: '📱', desc: 'iOS/Android — REST + WebSocket client' }),
    node('driver',   'Driver App',      'client',  75,  365, { icon: '🚗', desc: 'Background GPS ping every 4s' }),
    node('gw',       'API Gateway',     'gateway', 215, 278, { icon: '🛡️', desc: 'Rate limit · Auth delegation · Routing' }),
    node('auth',     'Auth Service',    'service', 360, 118, { icon: '🔐', desc: 'JWT validation, OAuth2, rate-limit' }),
    node('match',    'Ride Matching',   'service', 360, 248, { icon: '🎯', desc: 'Geospatial match, ETA calc, surge check' }),
    node('location', 'Location Svc',   'service', 360, 378, { icon: '📍', desc: 'Ingests driver GPS, writes to Redis' }),
    node('pricing',  'Pricing Svc',     'service', 500, 148, { icon: '💰', desc: 'Surge multiplier, base fare, ETA fare' }),
    node('trip',     'Trip Service',    'service', 500, 268, { icon: '🗺️', desc: 'Trip lifecycle: CREATED→ACTIVE→DONE' }),
    node('payment',  'Payment Svc',     'service', 500, 388, { icon: '💳', desc: 'Stripe, retry logic, idempotency keys' }),
    node('redis',    'Redis Cluster',   'redis',   645, 198, { icon: '⚡', desc: 'Driver locations · TTL 5s · GEORADIUS' }),
    node('kafka',    'Kafka',           'broker',  645, 308, { icon: '📨', desc: '3 brokers · 7-day retention · 3 partitions' }),
    node('notif',    'Notification',    'service', 645, 415, { icon: '🔔', desc: 'FCM/APNs push, SMS fallback via Twilio' }),
    node('pg',       'PostgreSQL',      'db',      790, 248, { icon: '🐘', desc: 'Sharded by city_id · 2 read replicas' }),
    node('ws',       'WebSocket Svc',   'service', 790, 388, { icon: '🔌', desc: 'Persistent conn · 3s location push' }),
  ];

  /* ── edges (async flagged separately) ──────────────────────────────────── */
  const EDGES = [
    { from: 'rider',    to: 'gw',       protocol: 'HTTPS/2' },
    { from: 'driver',   to: 'gw',       protocol: 'HTTPS/2' },
    { from: 'driver',   to: 'location', protocol: 'gRPC',   desc: 'GPS ping every 4s' },
    { from: 'gw',       to: 'auth',     protocol: 'gRPC' },
    { from: 'gw',       to: 'match',    protocol: 'gRPC' },
    { from: 'gw',       to: 'trip',     protocol: 'gRPC' },
    { from: 'match',    to: 'redis',    protocol: 'Redis',  desc: 'GEORADIUS nearby drivers' },
    { from: 'match',    to: 'pricing',  protocol: 'gRPC' },
    { from: 'match',    to: 'kafka',    protocol: 'Kafka',  async: true, desc: 'Publish RIDE_REQUESTED' },
    { from: 'location', to: 'redis',    protocol: 'Redis',  desc: 'GEOADD driver position' },
    { from: 'trip',     to: 'pg',       protocol: 'SQL' },
    { from: 'trip',     to: 'kafka',    protocol: 'Kafka',  async: true, desc: 'Publish TRIP_COMPLETED' },
    { from: 'trip',     to: 'ws',       protocol: 'WS',     desc: 'Stream driver location' },
    { from: 'kafka',    to: 'notif',    protocol: 'Kafka',  async: true },
    { from: 'kafka',    to: 'payment',  protocol: 'Kafka',  async: true },
    { from: 'notif',    to: 'rider',    protocol: 'FCM',    desc: 'Push notification' },
    { from: 'notif',    to: 'driver',   protocol: 'FCM',    desc: 'Push notification' },
    { from: 'payment',  to: 'pg',       protocol: 'SQL' },
    { from: 'ws',       to: 'rider',    protocol: 'WS',     desc: 'Real-time location stream' },
  ];

  function mkState(nodeOverrides = {}, pkts = [], evts = [], metrics = {}) {
    return {
      nodes: BASE_NODES.map(n => ({
        ...n,
        state: nodeOverrides[n.id] || 'idle',
        healthy: nodeOverrides[n.id] === 'error' ? false : undefined,
      })),
      edges: EDGES,
      packets: pkts,
      events: evts,
      metrics: { rps: 0, p99_ms: 0, drivers: 0, surge: '1.0×', ...metrics },
    };
  }

  /* ── Step 1: Architecture overview ─────────────────────────────────────── */
  snap(
    steps,
    mkState(),
    'Uber architecture: 14 components across 5 layers. Solid lines = sync (gRPC/HTTP). Dashed orange = async (Kafka). Hover any node or edge for details.',
    1,
  );

  /* ── Step 2: Driver pings location ─────────────────────────────────────── */
  snap(
    steps,
    mkState(
      { driver: 'active', location: 'active', redis: 'active' },
      [
        packet('driver',   'location', 'GPS {lat,lng}',      'request'),
        packet('location', 'redis',    'GEOADD driver:42',   'replication'),
      ],
      [{ type: 'ok', msg: 'Driver GPS ping → Location Svc → Redis (GEOADD, TTL 5s)' }],
      { drivers: 1 },
    ),
    'Driver app pings GPS every 4s. Location Service writes to Redis using GEOADD — key expires in 5s if driver goes offline. No DB write — hot path stays fast.',
    2,
  );

  /* ── Step 3: More drivers register ─────────────────────────────────────── */
  snap(
    steps,
    mkState(
      { location: 'ok', redis: 'ok' },
      [],
      [
        { type: 'ok',  msg: 'Redis: 47 active drivers in area cached' },
        { type: 'ok',  msg: 'Location Svc ingesting 1200 GPS/sec (city-wide)' },
      ],
      { drivers: 47, rps: 1200 },
    ),
    '47 nearby drivers cached in Redis. Location Service handles 1,200 GPS pings/sec city-wide using a dedicated Kafka topic for ingest (not shown). Redis GEORADIUS returns results in < 2ms.',
    2,
  );

  /* ── Step 4: Rider requests ride ────────────────────────────────────────── */
  snap(
    steps,
    mkState(
      { rider: 'active', gw: 'active' },
      [packet('rider', 'gw', 'POST /v1/rides', 'request')],
      [{ type: 'ok', msg: 'Rider → API Gateway: POST /v1/rides' }],
      { rps: 1, drivers: 47 },
    ),
    'Rider taps "Book Ride". App sends POST /v1/rides with pickup + dropoff coords to API Gateway over HTTPS/2. Gateway applies rate limiting (100 req/min per IP).',
    3,
  );

  /* ── Step 5: Gateway → Auth (sync JWT) ──────────────────────────────────── */
  snap(
    steps,
    mkState(
      { rider: 'active', gw: 'active', auth: 'active' },
      [packet('gw', 'auth', 'Bearer <JWT>', 'request')],
      [{ type: 'ok', msg: 'Gateway → Auth: validate JWT (sync gRPC, ~3ms)' }],
      { rps: 1, p99_ms: 3, drivers: 47 },
    ),
    'Gateway delegates auth to Auth Service via sync gRPC. Auth validates JWT signature, checks expiry, verifies scopes. Sync call — gateway blocks ~3ms. Result cached in gateway for 30s.',
    4,
  );

  /* ── Step 6: Forward to Ride Matching ───────────────────────────────────── */
  snap(
    steps,
    mkState(
      { rider: 'active', gw: 'ok', auth: 'ok', match: 'active' },
      [packet('gw', 'match', 'book_ride(lat,lng)', 'request')],
      [{ type: 'ok', msg: 'Auth OK → Gateway forwards to Ride Matching' }],
      { rps: 1, p99_ms: 3, drivers: 47 },
    ),
    'Auth passes. Gateway routes to Ride Matching Service. Request carries: pickup coords, dropoff coords, rider_id, client timestamp.',
    5,
  );

  /* ── Step 7: Redis GEORADIUS lookup ─────────────────────────────────────── */
  snap(
    steps,
    mkState(
      { match: 'active', redis: 'active' },
      [packet('match', 'redis', 'GEORADIUS 2km', 'request')],
      [
        { type: 'ok',  msg: 'Ride Match → Redis: GEORADIUS pickup 2km' },
        { type: 'ok',  msg: 'Redis returns 8 available drivers < 2ms' },
      ],
      { rps: 1, p99_ms: 5, drivers: 8 },
    ),
    'Ride Matching queries Redis GEORADIUS at pickup coords, 2km radius. Returns 8 available drivers with distance. Zero DB calls on this hot path — purely in-memory, < 2ms.',
    6,
  );

  /* ── Step 8: Surge pricing ──────────────────────────────────────────────── */
  snap(
    steps,
    mkState(
      { match: 'active', redis: 'ok', pricing: 'active' },
      [packet('match', 'pricing', 'demand=HIGH', 'request')],
      [
        { type: 'warn', msg: 'High demand: 8 drivers vs 31 pending requests' },
        { type: 'warn', msg: 'Surge multiplier: 1.8× applied' },
      ],
      { rps: 1, p99_ms: 12, drivers: 8, surge: '1.8×' },
    ),
    'Pricing Service computes surge: demand/supply ratio = 3.9 → 1.8× multiplier. Fare estimate returned to rider via gateway. Rider must accept before match proceeds.',
    7,
  );

  /* ── Step 9: Ride Matching publishes to Kafka (ASYNC) ───────────────────── */
  snap(
    steps,
    mkState(
      { match: 'active', pricing: 'ok', kafka: 'active' },
      [packet('match', 'kafka', 'RIDE_REQUESTED', 'event')],
      [
        { type: 'ok',  msg: 'Best driver selected: driver_42 (0.8km away)' },
        { type: 'ok',  msg: 'Ride Match → Kafka: RIDE_REQUESTED (async, fire-and-forget)' },
      ],
      { rps: 1, p99_ms: 14, drivers: 8, surge: '1.8×' },
    ),
    'Best driver selected (closest + highest rating). Ride Matching publishes RIDE_REQUESTED to Kafka async — non-blocking. Response already sent back to rider. Kafka durably stores event.',
    8,
  );

  /* ── Step 10: Kafka fans out to Notification Svc ────────────────────────── */
  snap(
    steps,
    mkState(
      { kafka: 'active', notif: 'active' },
      [packet('kafka', 'notif', 'RIDE_REQUESTED', 'event')],
      [
        { type: 'ok', msg: 'Kafka consumer group: notif-svc receives event' },
        { type: 'ok', msg: 'Partition offset committed after processing' },
      ],
      { rps: 2, p99_ms: 14, drivers: 8, surge: '1.8×' },
    ),
    'Notification Service consumes RIDE_REQUESTED from Kafka (consumer group offset). Decoupled from booking — if Notif Svc is down, Kafka retains event for replay.',
    9,
  );

  /* ── Step 11: Push to driver AND rider (async) ──────────────────────────── */
  snap(
    steps,
    mkState(
      { notif: 'active', driver: 'active', rider: 'active' },
      [
        packet('notif', 'driver', '🚗 Ride request!',  'event'),
        packet('notif', 'rider',  '✅ Driver found!',   'response'),
      ],
      [
        { type: 'ok', msg: 'FCM → Driver app: new ride request' },
        { type: 'ok', msg: 'FCM → Rider app: driver confirmed, ETA 4 min' },
      ],
      { rps: 2, p99_ms: 40, drivers: 8, surge: '1.8×' },
    ),
    'Notification Service pushes via FCM (fallback: APNs/SMS). Driver sees ride request, rider gets "Driver found" with ETA. Both async — Notif Svc retries on FCM failure.',
    10,
  );

  /* ── Step 12: Driver accepts → Trip Service ─────────────────────────────── */
  snap(
    steps,
    mkState(
      { driver: 'active', gw: 'active', trip: 'active' },
      [
        packet('driver', 'gw',   'ACCEPT_RIDE',   'request'),
        packet('gw',     'trip', 'create_trip()', 'request'),
      ],
      [
        { type: 'ok', msg: 'Driver accepts → Gateway → Trip Service' },
        { type: 'ok', msg: 'Trip Service: allocating trip_id=TRP-8821' },
      ],
      { rps: 3, p99_ms: 22, drivers: 1, surge: '1.8×' },
    ),
    'Driver accepts. Gateway routes to Trip Service which creates a trip record: status=CREATED, assigns trip_id, links driver_id + rider_id. Idempotency key prevents double-create.',
    11,
  );

  /* ── Step 13: Trip persisted to PostgreSQL ──────────────────────────────── */
  snap(
    steps,
    mkState(
      { trip: 'active', pg: 'active' },
      [packet('trip', 'pg', 'INSERT trip TRP-8821', 'replication')],
      [
        { type: 'ok', msg: 'PostgreSQL: INSERT trips (shard: city_id=NYC)' },
        { type: 'ok', msg: 'Replicated to 2 read replicas async' },
      ],
      { rps: 3, p99_ms: 28, drivers: 1, surge: '1.8×' },
    ),
    'Trip Service writes to PostgreSQL primary (sharded by city_id). Schema: trips(trip_id, rider_id, driver_id, status, surge_multiplier, ...). Async replication to 2 read replicas.',
    12,
  );

  /* ── Step 14: WebSocket — real-time location stream ─────────────────────── */
  snap(
    steps,
    mkState(
      { trip: 'active', ws: 'active', rider: 'active', driver: 'active' },
      [
        packet('driver', 'location', 'GPS stream',        'request'),
        packet('trip',   'ws',       'open_stream(rider)', 'event'),
        packet('ws',     'rider',    '📍 {lat,lng,eta}',  'event'),
      ],
      [
        { type: 'ok', msg: 'WebSocket channel opened: driver → rider' },
        { type: 'ok', msg: 'Location pushed every 3s over persistent WS' },
      ],
      { rps: 5, p99_ms: 35, drivers: 1, surge: '1.8×' },
    ),
    'Trip Service opens WebSocket stream for this trip. Driver GPS (via Location Svc → Redis → Trip Svc) pushed to rider every 3s. Persistent connection — no polling overhead.',
    13,
  );

  /* ── Step 15: Trip completes → async payment chain ─────────────────────── */
  snap(
    steps,
    mkState(
      { trip: 'active', kafka: 'active', payment: 'active' },
      [
        packet('trip',    'kafka',   'TRIP_COMPLETED',   'event'),
        packet('kafka',   'payment', 'TRIP_COMPLETED',   'event'),
      ],
      [
        { type: 'ok', msg: 'Trip ended → Kafka: TRIP_COMPLETED (async)' },
        { type: 'ok', msg: 'Payment Svc consuming TRIP_COMPLETED...' },
      ],
      { rps: 2, p99_ms: 18, drivers: 1, surge: '1.8×' },
    ),
    'Ride ends. Trip Service publishes TRIP_COMPLETED to Kafka async. Payment Service consumes independently — charges Stripe with idempotency key, handles retries without affecting Trip Svc.',
    14,
  );

  /* ── Step 16: Payment settled + receipt ─────────────────────────────────── */
  snap(
    steps,
    mkState(
      { payment: 'ok', pg: 'active', notif: 'active' },
      [
        packet('payment', 'pg',   'UPDATE payment',   'replication'),
        packet('payment', 'kafka', 'PAYMENT_DONE',    'event'),
        packet('kafka',   'notif', 'PAYMENT_DONE',    'event'),
      ],
      [
        { type: 'ok', msg: 'Stripe: $18.40 charged (1.8× surge)' },
        { type: 'ok', msg: 'PostgreSQL: payment record updated' },
        { type: 'ok', msg: 'Notification Svc: receipt email queued' },
      ],
      { rps: 2, p99_ms: 90, drivers: 0, surge: '1.8×' },
    ),
    'Payment settled ($18.40 with surge). PostgreSQL updated. Payment Svc publishes PAYMENT_DONE → Notification Svc sends receipt email. Full async chain — zero coupling between services.',
    15,
  );

  return steps;
}

/* ── Code sample ─────────────────────────────────────────────────────────── */
const CODE = [
  '// Ride Matching — core flow',
  'async function matchRide(riderId, pickup) {',
  '  // 1. sync: find nearby drivers (Redis, <2ms)',
  '  const drivers = await redis.geoRadius(pickup, "2km");',
  '',
  '  // 2. sync: get surge multiplier (Pricing gRPC)',
  '  const { surge } = await pricingSvc.getSurge(pickup);',
  '',
  '  // 3. pick best driver (distance + rating)',
  '  const best = selectBest(drivers);',
  '',
  '  // 4. async: publish event (non-blocking)',
  '  await kafka.publish("rides", {',
  '    type: "RIDE_REQUESTED",',
  '    riderId, driverId: best.id, surge',
  '  });',
  '',
  '  return { driverId: best.id, eta: best.eta, surge };',
  '}',
];

/* ── Layer zone boundaries (x-coords match node layout) ─────────────────────
   Nodes at: clients x=75, gateway x=215, core x=360, domain x=500,
             infra x=645, storage x=790. Half-width=54.
   Band edges = midpoints between adjacent layer outer edges.
─────────────────────────────────────────────────────────────────────────── */
const LAYERS = [
  {
    label:  'Client',
    x1: 8,   x2: 148,
    color:  'rgba(100,140,255,0.06)',
    border: 'rgba(100,140,255,0.30)',
  },
  {
    label:  'API Gateway',
    x1: 152, x2: 292,
    color:  'rgba(255,160,50,0.06)',
    border: 'rgba(255,160,50,0.35)',
  },
  {
    label:  'Core Services',
    x1: 296, x2: 448,
    color:  'rgba(60,200,120,0.06)',
    border: 'rgba(60,200,120,0.28)',
  },
  {
    label:  'Domain Services',
    x1: 452, x2: 578,
    color:  'rgba(80,190,220,0.06)',
    border: 'rgba(80,190,220,0.28)',
  },
  {
    label:  'Infrastructure',
    x1: 582, x2: 718,
    color:  'rgba(190,110,220,0.06)',
    border: 'rgba(190,110,220,0.28)',
  },
  {
    label:  'Storage',
    x1: 722, x2: 872,
    color:  'rgba(220,90,90,0.06)',
    border: 'rgba(220,90,90,0.28)',
  },
];

export default {
  id:       'uber',
  label:    'Uber',
  icon:     '🚗',
  layers:   LAYERS,
  build:    buildUberSteps,
  code:     CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'rps',     label: 'Req/s',    max: 20,  color: 'var(--node-active)',    unit: '' },
    { key: 'p99_ms',  label: 'P99 ms',   max: 200, color: 'var(--node-comparing)', unit: 'ms', warn: 100, critical: 150 },
    { key: 'drivers', label: 'Drivers',  max: 50,  color: 'var(--pod-running)',    unit: '' },
  ],
};

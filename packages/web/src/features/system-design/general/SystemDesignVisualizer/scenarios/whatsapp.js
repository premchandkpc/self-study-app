import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../../sd-types';
const _mk = createNodeFactory(ICONS);
const clientNode = _mk('client');
const gatewayNode = _mk('gateway');
const serviceNode = _mk('service');
const redisNode = _mk('redis');
const brokerNode = _mk('broker');
const dbNode = _mk('db');

/* ─────────────────────────────────────────────────────────────────────────────
   WhatsApp System Design — global messaging at scale (2B+ users, 100B msgs/day)
   Layout (user-space coords):
     Layer 0 (x≈75)  : Client apps
     Layer 1 (x≈215) : WebSocket Gateway (500K conns/node)
     Layer 2 (x≈360) : Chat Service, Presence Service
     Layer 3 (x≈500) : Media Service, Group Service
     Layer 4 (x≈645) : Kafka Message Bus, Redis Cluster
     Layer 5 (x≈790) : Storage (Cassandra, PostgreSQL, S3)
───────────────────────────────────────────────────────────────────────────── */

function buildWhatsAppSteps() {
  const steps = [];

  /* ── baseline nodes ─────────────────────────────────────────────────────── */
  const BASE_NODES = [
    clientNode ('sender',    'Sender Client',   75,  190, { icon: '📱', desc: 'iOS/Android — WebSocket persistent conn' }),
    clientNode ('receiver',  'Receiver Client', 75,  365, { icon: '📱', desc: 'Connected or offline (FCM pending)' }),
    gatewayNode('gw',        'WS Gateway',      215, 278, { desc: 'Terminate 500K connections · heartbeat' }),
    serviceNode('chat',      'Chat Service',    360, 148, { icon: '💬', desc: 'Dedup (Redis), rate-limit, content scan' }),
    serviceNode('presence',  'Presence Svc',    360, 308, { icon: '🟢', desc: 'Redis TTL 120s · last seen' }),
    serviceNode('media',     'Media Service',   500, 118, { icon: '📷', desc: 'Upload to S3 · transcode · CDN' }),
    serviceNode('group',     'Group Service',   500, 268, { icon: '👥', desc: 'Fanout-on-write <1024 members' }),
    redisNode  ('redis',     'Redis Cluster',   645, 198, { desc: 'Dedup · presence · session cache' }),
    brokerNode ('kafka',     'Kafka',           645, 308, { desc: '20 brokers · 48h retention' }),
    dbNode     ('cassandra', 'Cassandra',       790, 118, { desc: '80 nodes · multi-DC · RF=3' }),
    dbNode     ('postgres',  'PostgreSQL',      790, 238, { desc: 'Users, contacts, groups (1000 shards)' }),
    serviceNode('cdn',       'CloudFront',      790, 358, { icon: '🌍', desc: 'Media CDN · 200+ PoPs' }),
  ];

  /* ── edges (async flagged separately) ──────────────────────────────────── */
  const EDGES = [
    { from: 'sender',    to: 'gw',        protocol: 'WSS',    desc: 'Persistent WebSocket TLS' },
    { from: 'receiver',  to: 'gw',        protocol: 'WSS',    desc: 'Persistent or offline' },
    { from: 'gw',        to: 'chat',      protocol: 'gRPC',   desc: 'Protobuf frame decode' },
    { from: 'chat',      to: 'redis',     protocol: 'Redis',  desc: 'Dedup SETNX · rate limit' },
    { from: 'chat',      to: 'cassandra', protocol: 'CQL',    desc: 'Write to inbox/outbox' },
    { from: 'chat',      to: 'kafka',     protocol: 'Kafka',  async: true, desc: 'msg_sent topic' },
    { from: 'presence',  to: 'redis',     protocol: 'Redis',  desc: 'Pub/Sub · TTL refresh' },
    { from: 'chat',      to: 'group',     protocol: 'gRPC',   desc: 'If group message' },
    { from: 'group',     to: 'cassandra', protocol: 'CQL',    desc: 'Fanout to members' },
    { from: 'kafka',     to: 'gw',        protocol: 'Kafka',  async: true, desc: 'Deliver to receiver' },
    { from: 'gw',        to: 'receiver',  protocol: 'WSS',    desc: 'Push frame if online' },
    { from: 'kafka',     to: 'media',     protocol: 'Kafka',  async: true, desc: 'Transcode if video' },
    { from: 'media',     to: 'cassandra', protocol: 'CQL',    desc: 'Store thumbnail hash' },
    { from: 'media',     to: 'cdn',       protocol: 'HTTPS',  desc: 'Upload to S3 → CDN' },
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
      metrics: { msgRate: 0, p50_ms: 0, onlineUsers: 0, dupe: '0', ...metrics },
    };
  }

  /* ── Step 1: Architecture overview ─────────────────────────────────────── */
  snap(
    steps,
    mkState(),
    'WhatsApp architecture: Client (sender/receiver) → WS Gateway (500K connections/node) → Chat Service (dedup, rate-limit) → Cassandra (messages) + Kafka (async delivery) + Redis (ephemeral state). Storage: Cassandra for messages (write-optimized), PostgreSQL for users (transactional), Redis for ephemeral (presence TTL 120s).',
    0,
  );

  /* ── Step 2: Sender connected, types message ─────────────────────────────── */
  snap(
    steps,
    mkState(
      { sender: 'active' },
      [],
      [{ type: 'info', msg: 'Sender opens app, establishes WebSocket connection (TLS 1.3)' }],
      { msgRate: 0, p50_ms: 0, onlineUsers: 1, dupe: '0' },
    ),
    'Sender connects to nearest PoP (anycast DNS Route53) → TLS handshake (cached session) → HTTP Upgrade → 101 Switching Protocols. WebSocket Gateway registers connection in Redis, marks presence:sender online.',
    1,
  );

  /* ── Step 3: Sender generates message with UUID ──────────────────────────── */
  snap(
    steps,
    mkState(
      { sender: 'active' },
      [packet('sender', 'gw', '📨 UUID v7 msg', 'request')],
      [
        { type: 'info', msg: 'Client-side: generate UUID v7 msg_id (sortable by timestamp)' },
        { type: 'info', msg: 'Encrypt with Signal Protocol (Double Ratchet per-message keys)' },
      ],
      { msgRate: 1, p50_ms: 5, onlineUsers: 1, dupe: '0' },
    ),
    'Sender composes message, client generates UUID v7 msg_id (timestamp-based, sortable). Encrypts with E2EE session key (Signal Protocol Double Ratchet). Sends Protobuf frame over WebSocket.',
    2,
  );

  /* ── Step 4: Chat Service deduplicates ───────────────────────────────────── */
  snap(
    steps,
    mkState(
      { gw: 'active', chat: 'active', redis: 'active' },
      [
        packet('gw', 'chat', 'route message', 'request'),
        packet('chat', 'redis', 'SETNX msg_id', 'request'),
      ],
      [
        { type: 'ok', msg: 'Chat Service: decode Protobuf frame' },
        { type: 'ok', msg: 'Redis dedup: SETNX(msg_id, 1, EX 24h) — if exists, drop as duplicate' },
      ],
      { msgRate: 2, p50_ms: 8, onlineUsers: 1, dupe: '0' },
    ),
    'WS Gateway routes message to Chat Service (gRPC). Chat Service checks Redis for dedup: SETNX returns 0 if msg_id exists (duplicate), 1 if new. Prevents accidental resends on reconnect.',
    3,
  );

  /* ── Step 5: Rate limit check ──────────────────────────────────────────────── */
  snap(
    steps,
    mkState(
      { chat: 'active', redis: 'active' },
      [packet('chat', 'redis', 'DECRBY rate_limit', 'request')],
      [
        { type: 'ok', msg: 'Rate limit: token bucket 30 msg/s per sender' },
        { type: 'ok', msg: 'If <0, reject with 429 backoff (exponential jitter)' },
      ],
      { msgRate: 3, p50_ms: 10, onlineUsers: 1, dupe: '0' },
    ),
    'Chat Service checks Redis token bucket rate limit (30 msg/s per sender, sliding window). If limit exceeded, return error with Retry-After header. Sender exponentially backs off.',
    4,
  );

  /* ── Step 6: Content scan async ────────────────────────────────────────── */
  snap(
    steps,
    mkState(
      { chat: 'active', kafka: 'active' },
      [packet('chat', 'kafka', 'spam_scan task', 'event')],
      [
        { type: 'info', msg: 'Chat Service publishes to Kafka content_scan topic (async)' },
        { type: 'ok', msg: 'Proceed to write immediately (don\'t block on scan)' },
      ],
      { msgRate: 3, p50_ms: 12, onlineUsers: 1, dupe: '0' },
    ),
    'Chat Service publishes to Kafka content_scan topic (async, non-blocking). Spam detection workers consume and may flag content later. Message flow is not blocked by content scan.',
    5,
  );

  /* ── Step 7: Write to Cassandra (3 tables, batch) ────────────────────────── */
  snap(
    steps,
    mkState(
      { chat: 'active', cassandra: 'active' },
      [packet('chat', 'cassandra', 'BATCH: inbox,outbox,convo', 'replication')],
      [
        { type: 'ok', msg: 'Cassandra BATCH write (atomic): 3 tables' },
        { type: 'ok', msg: '1) messages_by_user (sender: inbox, direction=sent)' },
        { type: 'ok', msg: '2) messages_by_user (receiver: inbox, direction=received)' },
        { type: 'ok', msg: '3) messages_by_conversation (chronological view)' },
      ],
      { msgRate: 4, p50_ms: 18, onlineUsers: 1, dupe: '0' },
    ),
    'Chat Service writes to Cassandra. Partition: (user_id, time_bucket=yyyy-MM-dd-HH) prevents unbounded partitions. Write ONE consistency (any replica acks immediately). Replicated to 2 other nodes (RF=3).',
    6,
  );

  /* ── Step 8: Ack to sender (sync path complete) ──────────────────────────── */
  snap(
    steps,
    mkState(
      { chat: 'active', gw: 'active', sender: 'active' },
      [
        packet('chat', 'gw', 'ack msg_persisted', 'response'),
        packet('gw', 'sender', '✓ sent', 'response'),
      ],
      [
        { type: 'ok', msg: 'Sender app shows single ✓ (sent)' },
        { type: 'ok', msg: 'P50 latency: ~35ms (network + 3 service hops + Cassandra write)' },
      ],
      { msgRate: 5, p50_ms: 35, onlineUsers: 1, dupe: '0' },
    ),
    'Chat Service acks to sender: message persisted. Total P50 latency ~35ms (client 5ms + network 10ms + server 5ms + Cassandra 10ms + delivery 5ms). Sender UI shows ✓.',
    7,
  );

  /* ── Step 9: Publish to Kafka msg_sent topic ──────────────────────────────── */
  snap(
    steps,
    mkState(
      { chat: 'active', kafka: 'active' },
      [packet('chat', 'kafka', 'msg_sent event (part:hash)', 'event')],
      [
        { type: 'ok', msg: 'Kafka msg_sent topic, partition = hash(receiver_id) % N' },
        { type: 'ok', msg: 'Ensures ordered delivery per recipient (same partition → same consumer)' },
      ],
      { msgRate: 6, p50_ms: 35, onlineUsers: 1, dupe: '0' },
    ),
    'Chat Service produces to Kafka msg_sent topic. Partition key = hash(receiver_id), ensures all messages for receiver_id go to same partition (ordering). 48h retention for offline delivery.',
    8,
  );

  /* ── Step 10: Delivery Service consumes, checks presence ─────────────────── */
  snap(
    steps,
    mkState(
      { kafka: 'active' },
      [packet('kafka', 'redis', 'GET presence:receiver', 'request')],
      [
        { type: 'info', msg: 'Delivery Service consumer group reads msg_sent' },
        { type: 'ok', msg: 'Checks Redis presence:receiver_id (TTL 120s, last heartbeat)' },
      ],
      { msgRate: 6, p50_ms: 35, onlineUsers: 1, dupe: '0' },
    ),
    'Delivery Service (Kafka consumer group) reads msg_sent topic. Checks Redis for presence:{receiver_id}. If TTL expired or missing → offline.',
    9,
  );

  /* ── Step 11: Online delivery (receiver connected) ────────────────────────── */
  snap(
    steps,
    mkState(
      { redis: 'active', gw: 'active', receiver: 'active' },
      [packet('gw', 'receiver', '📨 message frame', 'event')],
      [
        { type: 'ok', msg: 'Receiver is online (presence found in Redis)' },
        { type: 'ok', msg: 'WebSocket Gateway pushes encrypted message frame to receiver' },
        { type: 'ok', msg: 'Receiver app decrypts, shows message' },
      ],
      { msgRate: 7, p50_ms: 45, onlineUsers: 2, dupe: '0' },
    ),
    'Receiver is online (presence in Redis). WS Gateway pushes Protobuf frame to receiver\u2019s connection. Receiver app decrypts (Double Ratchet) and displays message. Total P50: ~45ms.',
    10,
  );

  /* ── Step 12: Receiver acks (delivered status) ──────────────────────────── */
  snap(
    steps,
    mkState(
      { receiver: 'active', gw: 'active', chat: 'active', cassandra: 'active' },
      [
        packet('receiver', 'gw', 'ack delivered', 'request'),
        packet('chat', 'cassandra', 'UPDATE status=delivered', 'request'),
      ],
      [
        { type: 'ok', msg: 'Receiver sends delivery receipt (msg_id acked)' },
        { type: 'ok', msg: 'Chat Service updates Cassandra: message status=delivered' },
        { type: 'ok', msg: 'Sender UI shows ✓✓ (blue, delivered)' },
      ],
      { msgRate: 8, p50_ms: 50, onlineUsers: 2, dupe: '0' },
    ),
    'Receiver sends delivery receipt over WebSocket (ack msg_id). Chat Service updates Cassandra message status=delivered. Sender app shows ✓✓ (blue check mark).',
    11,
  );

  /* ── Step 13: Receiver reads message ────────────────────────────────────── */
  snap(
    steps,
    mkState(
      { receiver: 'active', gw: 'active', chat: 'active', cassandra: 'active' },
      [packet('receiver', 'gw', 'read receipt', 'request')],
      [
        { type: 'ok', msg: 'Receiver scrolls to message or it\'s marked as read' },
        { type: 'ok', msg: 'Chat Service updates: status=read, read_at timestamp' },
      ],
      { msgRate: 8, p50_ms: 55, onlineUsers: 2, dupe: '0' },
    ),
    'Receiver reads message (or it auto-reads if visible). App sends read receipt. Chat Service updates Cassandra: status=read, read_at timestamp. Sender shows ✓✓ blue (read).',
    12,
  );

  /* ── Step 14: Offline scenario (receiver disconnects) ──────────────────── */
  snap(
    steps,
    mkState(
      { receiver: 'error' },
      [],
      [
        { type: 'warn', msg: 'Receiver offline: WebSocket connection lost' },
        { type: 'info', msg: 'Presence TTL expires in 120s if no heartbeat' },
      ],
      { msgRate: 1, p50_ms: 0, onlineUsers: 1, dupe: '0' },
    ),
    'Receiver app closes or network fails. WebSocket connection terminates. Presence:{receiver_id} TTL expires in 120s if not refreshed.',
    13,
  );

  /* ── Step 15: Offline delivery (FCM push + cursor-based sync) ──────────── */
  snap(
    steps,
    mkState(
      { kafka: 'active' },
      [packet('kafka', 'fcm', 'push notification', 'event')],
      [
        { type: 'info', msg: 'Delivery Service: presence expired, enqueue FCM' },
        { type: 'ok', msg: 'Batches 10 messages → 1 push to FCM/APNS' },
        { type: 'ok', msg: 'Device wakes up, app reconnects, does cursor-based sync' },
      ],
      { msgRate: 1, p50_ms: 0, onlineUsers: 1, dupe: '0' },
    ),
    'Delivery Service sees receiver offline (presence expired). Enqueues to FCM/APNS push topic. Batches 10 pending messages → 1 push notification. Reduces notification spam, but adds ~1s latency.',
    14,
  );

  return steps;
}

const LAYERS = [
  { x: 75,  label: 'Clients' },
  { x: 215, label: 'Gateway' },
  { x: 360, label: 'Services' },
  { x: 500, label: 'Domain' },
  { x: 645, label: 'Infra' },
  { x: 790, label: 'Storage' },
];

const CODE = `
// WhatsApp: Message send flow (simplified pseudocode)

// 1. Client generates UUID v7 msg_id + encrypts
const msg_id = uuidv7();
const encrypted = signalProtocol.encrypt(message, session_key);
client.sendFrame({msg_id, encrypted});

// 2. Chat Service: dedup + rate limit
const isDuplicate = !await redis.setnx(\`msg:\${msg_id}\`, 1, 'EX', 86400);
if (isDuplicate) return; // drop

const canSend = await redis.decrby(\`ratelimit:\${sender_id}\`, 1);
if (canSend < 0) throw Error('429 Too Many Requests');

// 3. Batch write to Cassandra (3 tables for inbox/outbox/conversation)
await cassandra.batch([
  \`INSERT INTO messages_by_user (user_id, bucket, created_at, msg_id, ...) VALUES (...)\`,
  \`INSERT INTO messages_by_user (user_id, bucket, created_at, msg_id, ...) VALUES (...)\`,
  \`INSERT INTO messages_by_conversation (...)\`
]);

// 4. Ack to sender (message persisted)
await websocket.send({msg_id, status: 'sent'});

// 5. Async: publish to Kafka (partition by receiver for ordering)
await kafka.produce('msg_sent', \`hash(\${receiver_id})\`, {
  msg_id, sender_id, receiver_id, encrypted, created_at
});

// 6. Delivery Service: consume, check presence, deliver
const msg = await kafka.consume('msg_sent');
const isOnline = await redis.get(\`presence:\${msg.receiver_id}\`);
if (isOnline) {
  const connection = connectionRegistry[msg.receiver_id];
  await connection.send(msg); // <100ms P50
} else {
  // Offline: queue for FCM push (48h Kafka retention)
  await fcm.push({msg_id, sender: msg.sender_id, preview: msg.text});
}
`;

export default {
  id:       'whatsapp',
  name:     'WhatsApp',
  tabName:  'Architecture',
  icon:     '💬',
  layers:   LAYERS,
  build:    buildWhatsAppSteps,
  code:     CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'msgRate',     label: 'Msg/s',      max: 50,  color: 'var(--node-active)',    unit: '' },
    { key: 'p50_ms',      label: 'P50 ms',     max: 100, color: 'var(--node-comparing)', unit: 'ms', warn: 50, critical: 80 },
    { key: 'onlineUsers', label: 'Online',     max: 10,  color: 'var(--pod-running)',    unit: '' },
    { key: 'dupe',        label: 'Dedup %',    max: 5,   color: 'var(--error-light)',    unit: '%' },
  ],
  codeNotes: [
    { title: 'Message ID Deduplication', content: 'Client generates UUID v7 (timestamp + random). Server: Redis SETNX with 24h TTL. Retry-safe: same msg_id always produces same result. Fallback: Cassandra by msg_id if Redis unavailable.' },
    { title: 'Cassandra Write-Optimized', content: 'Time-bucketed partitions (yyyy-MM-dd-HH) prevent unbounded partition growth. Each message written 3x: sender outbox, receiver inbox, conversation view. Write ONE consistency + RF=3 replication.' },
    { title: 'Kafka Event Ordering', content: 'msg_sent topic: partition = hash(receiver_id) % N_partitions. Ensures all messages for receiver go to same partition → same consumer → ordered delivery per recipient.' },
    { title: 'Online vs Offline Delivery', content: 'Online: WebSocket push <100ms P50. Offline: FCM/APNS wake device (1-5s), app reconnects, cursor-based sync fetches missed messages. Batching: 10 messages → 1 push (trade latency for push cost).' },
    { title: 'E2EE Signal Protocol', content: 'X3DH key agreement (4 DH operations) on first contact. Double Ratchet per message: Root Key → Chain Keys → Message Keys. Perfect Forward Secrecy: compromise of long-term key ≠ past messages decrypted.' },
  ],
  tradeoffs: [
    { pro: 'WebSocket Gateway: persistent conn eliminates polling overhead', con: 'OOM risk on slow clients: 500K × 100KB buffer = 50GB. Mitigated by credit-based backpressure.' },
    { pro: 'Cassandra write-optimized: 100B+ msgs/day, linear scale', con: 'Read queries expensive (no secondary indexes), fan queries. Workaround: separate read-optimized cache.' },
    { pro: 'Kafka: 48h offline retention, consumer replay', con: 'Adds ~100ms latency for async fanout. Not suitable for <50ms delivery SLA.' },
    { pro: 'E2EE by default: privacy, regulatory compliance', con: 'Server can\'t content-scan plaintext. Workaround: client-side scanning before encryption.' },
    { pro: 'Time-bucketed Cassandra partitions: bounded partition size', con: 'Hot partitions still possible (very active user). Mitigation: sub-bucket by user if needed.' },
  ],
  bestPractices: [
    'UUID v7 for msg_id (timestamp-based, sortable). Enables cursor-based sync: "fetch messages since timestamp".',
    'Redis dedup 24h TTL: catches accidental resends. Check Cassandra as fallback if Redis unavailable (higher latency, still correct).',
    'Rate limit: token bucket per sender, 30 msg/s. Use sliding window (not fixed window) to prevent edge case spikes.',
    'Cassandra: Write ONE consistency (fire-and-forget), but RF=3 for durability. Accept rare stale reads in offline sync.',
    'Kafka partitioning: hash(receiver_id) % N ensures ordered delivery per user. Rebalancing on scale: careful planning (avoid thundering herd on re-subscribe).',
    'Credit-based backpressure on WebSocket: server grants N credits on connect. Client stops at 0 credits. Prevents: OOM from slow clients, TCP buffer bloat.',
    'Presence TTL 120s with heartbeat every 30s: trade latency for accuracy. Shorter TTL = faster offline detection, higher Redis load.',
  ],
};

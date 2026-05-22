import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../../sd-types';
const _mk = createNodeFactory(ICONS);
const clientNode = _mk('client');
const serviceNode = _mk('service');
const brokerNode = _mk('broker');
const dbNode = _mk('db');

/* ─────────────────────────────────────────────────────────────────────────────
   Message Queue Pattern — async decoupling with publish-subscribe
   Layout: Producer (x≈100) · Broker (x≈250) · Consumers (x≈400+)
───────────────────────────────────────────────────────────────────────────── */
function buildMessageQueueSteps() {
  const steps = [];
  const s = {
    nodes: [
      clientNode ('producer', 'Order Service',     100,  190, { desc: 'Publishes ORDER_CREATED events' }),
      brokerNode ('kafka',    'Message Broker',    250,  190, { desc: 'Kafka: 3 replicas, 7-day retention' }),
      serviceNode('email',    'Email Consumer',    400,  80,  { desc: 'Subscribed to order topic' }),
      serviceNode('inventory','Inventory Cons.',   400,  190, { desc: 'Subscribed to order topic' }),
      serviceNode('analytics','Analytics Cons.',   400,  300, { desc: 'Subscribed to order topic' }),
    ],
    edges: [
      { from: 'producer',   to: 'kafka',      protocol: 'Kafka',  async: true, desc: 'PUBLISH topic:orders' },
      { from: 'kafka',      to: 'email',      protocol: 'Kafka',  async: true },
      { from: 'kafka',      to: 'inventory',  protocol: 'Kafka',  async: true },
      { from: 'kafka',      to: 'analytics',  protocol: 'Kafka',  async: true },
    ],
    packets: [],
    events: [],
    metrics: { messages: 0, lag_sec: 0, consumers: 0 },
  };

  snap(steps, s, 'Message Queue Pattern: Producer decoupled from consumers via broker. Publish once, consume many. Async = resilient.', 1);

  s.nodes.find((n) => n.id === 'producer').state = 'active';
  s.nodes.find((n) => n.id === 'kafka').state = 'active';
  s.packets = [packet('producer', 'kafka', 'ORDER_CREATED')];
  s.metrics.messages = 1;
  s.events.push({ type: 'ok', msg: 'Producer publishes event to topic:orders partition:0 offset:1234567' });
  snap(steps, s, 'Order Service publishes ORDER_CREATED. Broker appends to log. Returns immediately (producer doesn\'t wait).', 2);

  s.nodes.find((n) => n.id === 'email').state = 'active';
  s.nodes.find((n) => n.id === 'inventory').state = 'active';
  s.nodes.find((n) => n.id === 'analytics').state = 'active';
  s.packets = [
    packet('kafka', 'email', 'event'),
    packet('kafka', 'inventory', 'event'),
    packet('kafka', 'analytics', 'event'),
  ];
  s.metrics.consumers = 3;
  s.events.push({ type: 'ok', msg: 'Email, Inventory, Analytics consumers fetch from offset:1234567' });
  snap(steps, s, 'Consumers independently read from shared topic. Each tracks own offset. Email fails? Others still process.', 3);

  s.nodes.find((n) => n.id === 'email').state = 'error';
  s.metrics.lag_sec = 45;
  s.packets = [];
  s.events.push({ type: 'error', msg: 'Email consumer crashed. Lag = 45s (message 1234567 → 1234612)' });
  snap(steps, s, 'Email service down. Orders queue on broker (retention 7 days). No data loss. Other consumers unaffected.', 4);

  s.nodes.find((n) => n.id === 'email').state = 'active';
  s.metrics.lag_sec = 0;
  s.events.push({ type: 'ok', msg: 'Email consumer restarted. Replays offset:1234567. Catches up in 2 seconds.' });
  snap(steps, s, 'Email service recovers. Replays queued messages from offset. Idempotent consumer = no duplicates on retry.', 5);

  s.nodes.find((n) => n.id === 'inventory').state = 'idle';
  s.nodes.find((n) => n.id === 'analytics').state = 'idle';
  s.packets = [];
  s.events.push({ type: 'ok', msg: 'All consumers in sync. Latency ~100ms (network) vs 10s (sync RPC)' });
  snap(steps, s, 'Message queue enables graceful degradation. Slowest consumer doesn\'t block producer. Scale independently.', 6);

  return steps;
}

const CODE = [
  '// Producer: Fire-and-forget',
  'await producer.send({',
  '  topic: "orders",',
  '  messages: [{',
  '    key: "user:123", // partition key',
  '    value: JSON.stringify({',
  '      orderId: 42,',
  '      items: [...],',
  '      total: 99.99',
  '    })',
  '  }]',
  '});',
  '',
  '// Consumer: Idempotent processing',
  'consumer.subscribe(["orders"]);',
  'consumer.run({',
  '  eachMessage: async ({topic, partition, ',
  '    message}) => {',
  '    const order = JSON.parse(message.value);',
  '    await processOrder(order);',
  '    // auto-commit offset',
  '  }',
  '});',
  '',
  '// Tuning: 3 brokers, 3 replicas, 7-day retention',
];

const LAYERS = [
  { label: 'Producer',   x1: 5,   x2: 150, color: 'rgba(100,140,255,0.06)', border: 'rgba(100,140,255,0.30)' },
  { label: 'Broker',     x1: 160, x2: 340, color: 'rgba(255,160,50,0.06)',  border: 'rgba(255,160,50,0.35)'  },
  { label: 'Consumers',  x1: 350, x2: 520, color: 'rgba(60,200,120,0.06)',  border: 'rgba(60,200,120,0.28)'  },
];

export default {
  id: 'message-queue',
  label: 'Message Queue',
  icon: '📨',
  layers: LAYERS,
  build: buildMessageQueueSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'messages',   label: 'Messages/sec', max: 100, color: 'var(--node-default)' },
    { key: 'lag_sec',    label: 'Consumer Lag', max: 60,  color: 'var(--pod-crash)' },
    { key: 'consumers',  label: 'Active Cons.', max: 10,  color: 'var(--node-visited)' },
  ],
  codeNotes: [
    { title: 'Partition Keys', content: 'Messages with same key go to same partition. Order guaranteed within partition only. E.g., key="user:123" ensures all orders from 1 user processed sequentially.' },
    { title: 'Consumer Groups', content: 'Each group tracks offset independently. 3 consumers in same group each get ~1/3 of partitions. Rebalance takes ~30s when consumer added/removed.' },
    { title: 'Idempotent Processing', content: 'Consumer must handle duplicate delivery (broker failure → resend). Use dedup cache: if event_id in Redis, skip. TTL = 24h to handle slow consumers.' },
    { title: 'Offset Commits', content: 'Auto-commit every 5s or manual after processing. Early commit = data loss. Late commit = duplicate processing. Use transactions: Kafka 0.11+ supports exactly-once semantics.' },
  ],
  tradeoffs: [
    { pro: 'Decouples producer from consumers', con: 'Adds 100-500ms latency (network + broker persist). Not suitable for RPC-style requests.' },
    { pro: 'Consumer lag provides visibility', con: 'Lag = 0 but still "slow consumer" if processing each message takes 10s. Need app-level monitoring.' },
    { pro: 'Partition-level order guarantees', con: 'Global ordering requires single partition (throughput capped ~50k msg/s).' },
    { pro: '7-day retention = replay capability', con: 'Storage overhead: ~100MB/day per 1k msg/s. Needs monitoring; old topics auto-delete.' },
  ],
  bestPractices: [
    'Monitor consumer lag; alert if >10min behind. Slow consumers trigger cascading failures (lag grows exponentially).',
    'Use partition keys for ordering guarantees. Unkeyed messages distribute randomly; good for throughput but lose ordering.',
    'Set replication factor = 3 for durability. In-sync replicas (ISR) = 2 at minimum. Tolerance: lose 1 broker without data loss.',
    'Tune batch.size = 16KB for latency, 100KB+ for throughput. Compression (snappy) reduces network by 70% on text-heavy messages.',
    'For critical events, use transactions: atomically publish to Kafka + write to PostgreSQL. Enables exactly-once semantics end-to-end.',
  ],
};


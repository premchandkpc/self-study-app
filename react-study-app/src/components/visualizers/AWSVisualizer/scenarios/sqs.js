import { snap, svc, pkt } from './shared';

function buildSQSSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('producer', 'Producer\n(App Server)',  'server',   60,  180),
      svc('sqs',      'SQS Queue',               'queue',    260, 180, { messages: [], visibility: 30, dlq: 0 }),
      svc('consumer', 'Consumer\n(Lambda/EC2)',  'lambda',   480, 180),
      svc('dlq',      'Dead Letter\nQueue (DLQ)', 'dlq',     480, 320, { messages: [] }),
    ],
    edges: [
      { from: 'producer', to: 'sqs' },
      { from: 'sqs',      to: 'consumer' },
      { from: 'sqs',      to: 'dlq' },
    ],
    packets: [],
    events: [],
    metrics: { sent: 0, received: 0, dlq: 0, inFlight: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'SQS: durable message queue. Decouples producer from consumer. At-least-once delivery.', 1);

  // Send messages
  ['order#1','order#2','order#3'].forEach((msg, i) => {
    s.nodes[1].messages.push({ id: msg, retries: 0 });
    s.metrics.sent = i + 1;
    s.packets = [pkt('producer', 'sqs', msg, 'request')];
    s.events.push({ type: 'ok', msg: `SendMessage: ${msg} → SQS` });
  });
  snap(steps, s, 'Producer sends 3 messages to SQS. Messages persisted across AZs. Durable.', 2);

  // Consumer polls
  s.nodes[2].state = 'active';
  s.packets = [pkt('sqs', 'consumer', 'order#1', 'request')];
  s.nodes[1].messages[0] = { id: 'order#1', retries: 0, inflight: true };
  s.metrics.inFlight = 1;
  s.events.push({ type: 'info', msg: 'ReceiveMessage: order#1 → visibility timeout 30s' });
  snap(steps, s, 'Consumer polls. Gets order#1. Message hidden (visibility 30s). Others still visible.', 3);

  // Delete after processing
  s.nodes[1].messages.shift();
  s.metrics.received = 1; s.metrics.inFlight = 0;
  s.events.push({ type: 'ok', msg: 'DeleteMessage: order#1 processed ✓' });
  snap(steps, s, 'Consumer processes, calls DeleteMessage. Removed from queue. Exactly-once via idempotency.', 4);

  // Consumer fails — message reappears
  s.packets = [pkt('sqs', 'consumer', 'order#2', 'request')];
  s.nodes[1].messages[0] = { id: 'order#2', retries: 1 };
  s.events.push({ type: 'warn', msg: 'Consumer crash: order#2 not deleted → reappears after 30s' });
  snap(steps, s, 'Consumer crashes. Visibility timeout expires (30s). order#2 reappears for retry.', 5);

  // Max retries → DLQ
  s.nodes[1].messages[0] = { id: 'order#2', retries: 3 };
  s.nodes[3].messages = [{ id: 'order#2', retries: 3 }];
  s.nodes[1].messages.shift();
  s.nodes[3].state = 'warn';
  s.metrics.dlq = 1;
  s.events.push({ type: 'error', msg: 'order#2 maxReceiveCount=3 exceeded → moved to DLQ' });
  snap(steps, s, 'After 3 failures: order#2 moved to Dead Letter Queue (DLQ). Inspect for bugs.', 6);

  return steps;
}

const CODE = [
  '# SQS queue settings',
  'VisibilityTimeout: 30s',
  'MessageRetentionPeriod: 4days',
  'MaxReceiveCount: 3 → DLQ',
  '# Standard vs FIFO',
  'Standard: at-least-once, unordered',
  'FIFO: exactly-once, ordered',
  '# Long polling: WaitTimeSeconds=20',
  '# Reduce empty receives + cost',
];

export default {
  id: 'sqs',
  label: 'SQS',
  icon: '📬',
  build: buildSQSSteps,
  code: CODE,
  language: 'YAML/CLI',
  metrics: [
    { key: 'sent',     label: 'Sent',     max: 5, color: 'var(--node-default)' },
    { key: 'received', label: 'Received', max: 5, color: 'var(--pod-running)' },
    { key: 'dlq',      label: 'DLQ',      max: 3, color: 'var(--pod-crash)' },
  ],
};

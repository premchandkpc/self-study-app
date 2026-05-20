import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildSQSSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('producer', 'Producer\n(App Server)',   'server',  50,  180, { region: 'us-east-1' }),
      svc('sqsS',     'SQS Standard',              'queue',   250, 100, { messages: [], visibility: 30, retention: 4 }),
      svc('sqsF',     'SQS FIFO',                  'queue',   250, 310, { messages: [], dedup: true, ordered: true }),
      svc('consumer1','Consumer 1\n(Lambda)',      'lambda',  460, 80, { batchSize: 10 }),
      svc('consumer2','Consumer 2\n(EC2 Service)', 'server',  460, 180),
      svc('dlq',      'Dead Letter\nQueue (DLQ)',  'dlq',     460, 310, { messages: [] }),
      svc('cw',       'CloudWatch\nMetrics',       'server',  460, 420),
    ],
    edges: [
      { from: 'producer', to: 'sqsS' },
      { from: 'producer', to: 'sqsF' },
      { from: 'sqsS', to: 'consumer1' },
      { from: 'sqsS', to: 'consumer2' },
      { from: 'sqsS', to: 'dlq' },
      { from: 'sqsF', to: 'consumer2' },
      { from: 'sqsS', to: 'cw' },
    ],
    packets: [],
    events: [],
    metrics: { sent: 0, received: 0, dlq: 0, inFlight: 0, batchSize: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'SQS = managed message queue. Decouples producer (who sends) from consumer (who processes). Buffer that absorbs traffic spikes. Think of it as a mailbox — messages wait there until someone picks them up. At-least-once delivery by default.', 1);

  ['order#1','order#2','order#3'].forEach((msg, i) => {
    s.nodes.find(n => n.id === 'sqsS').messages.push({ id: msg, retries: 0 });
    s.metrics.sent = i + 1;
    s.packets = [pkt('producer', 'sqsS', msg, 'request')];
    s.events.push({ type: 'ok', msg: `SendMessage(${msg}) → SQS Standard. Amazon Resource Name (ARN): arn:aws:sqs:us-east-1:...` });
  });
  snap(steps, s, 'Producer sends 3 messages to Standard queue. Each message persisted across ≥3 AZs (durable, not lost on hardware failure). Max message size: 256KB. Messages survive up to 14 days (retention period). Standard queue: best-effort ordering, at-least-once delivery (duplicates possible).', 2);

  s.nodes[2].messages = [{ id: 'order#F1', dedup: 'abc123', group: 'orders' }];
  s.metrics.sent = 4;
  s.packets = [pkt('producer', 'sqsF', 'order#F1 (dedup=abc123)', 'request')];
  s.events.push({ type: 'ok', msg: 'FIFO queue: order#F1 sent with MessageGroupId=orders + MessageDeduplicationId=abc123' });
  snap(steps, s, 'FIFO queue: exactly-once delivery, strict ordering (first-in-first-out). Name must end in .fifo. Uses MessageGroupId to group related messages (all messages in same group processed in order). MessageDeduplicationId prevents duplicates within 5-min dedup window. 3000 msg/s per API action (batch: 3000).', 3);

  s.packets = [pkt('producer', 'sqsS', 'order#4 (delay=30s)', 'request')];
  s.nodes.find(n => n.id === 'sqsS').messages.push({ id: 'order#4', delay: 30 });
  s.metrics.sent = 5;
  s.events.push({ type: 'info', msg: 'Delay queue: order#4 hidden for 30s before becoming visible. DelaySeconds=0-900 (15min) per queue or per message.' });
  snap(steps, s, 'Delay queues: messages start invisible, become visible after DelaySeconds. Per-queue delay (0-900s) or per-message delay (overrides queue). Use for: wait before processing (think: "are you sure?" email confirmations), rate limiting downstream systems, scheduled tasks.', 4);

  s.nodes[3].state = 'active';
  s.packets = [pkt('sqsS', 'consumer1', 'order#1..order#10', 'request')];
  s.nodes.find(n => n.id === 'sqsS').messages = s.nodes.find(n => n.id === 'sqsS').messages.slice(1); // remove first via shift simulation
  s.metrics.received = 1; s.metrics.batchSize = 10;
  s.events.push({ type: 'ok', msg: 'ReceiveMessage: batch of 10 messages → Consumer1 Lambda. MaxBatchSize=10. WaitTimeSeconds=20 (long poll).' });
  snap(steps, s, 'Consumer polls SQS using ReceiveMessage. Best practice: Long Polling (WaitTimeSeconds=20) — reduces empty responses, saves cost. Short polling returns immediately (may return empty). Batch size up to 10 messages. Lambda SQS trigger auto-polls with batches. Also supports: SQS→EC2 worker, SQS→ECS task, SQS→SES.', 5);

  s.nodes.find(n => n.id === 'sqsS').messages[0] = { id: 'order#2', retries: 0, inflight: true };
  s.metrics.inFlight = 1;
  s.packets = [pkt('sqsS', 'consumer2', 'order#2', 'request')];
  s.events.push({ type: 'info', msg: 'Message received by Consumer2 → hidden for 30s (VisibilityTimeout). Other consumers cannot see it.' });
  snap(steps, s, 'Visibility Timeout: message received → hidden from other consumers for N seconds (default 30s). Like holding a physical letter — no one else can grab it. If consumer finishes: call DeleteMessage to remove. If consumer crashes: timeout expires, message reappears for retry. Set timeout based on your max processing time + buffer.', 6);

  s.events.push({ type: 'warn', msg: 'Consumer2 crash: message NOT deleted. After 30s visibility timeout, order#2 reappears in queue.' });
  snap(steps, s, 'Consumer crashes mid-processing: message stays hidden until VisibilityTimeout expires, then reappears. Another consumer sees it as "retry". This is how SQS achieves at-least-once delivery. If consumer was about to finish, processing might happen twice — your code should be idempotent (same outcome even if called twice).', 7);

  s.nodes.find(n => n.id === 'sqsS').messages[0].retries = 3;
  s.nodes.find(n => n.id === 'sqsS').messages = s.nodes.find(n => n.id === 'sqsS').messages.filter(m => m.id !== 'order#2');
  s.nodes.find(n => n.id === 'dlq').messages.push({ id: 'order#2', retries: 3 });
  s.nodes.find(n => n.id === 'dlq').state = 'warn';
  s.metrics.dlq = 1;
  s.events.push({ type: 'error', msg: 'MaxReceiveCount=3 exceeded. order#2 moved to DLQ. Inspect DLQ to debug failures.' });
  snap(steps, s, 'Dead Letter Queue: message fails 3 times (MaxReceiveCount) → automatically moved to DLQ. Prevents "poison pills" from looping forever. Think of DLQ as a "problems pile". Monitor DLQ depth in CloudWatch. Configure alarm when DLQ has messages. Manually redrive DLQ messages back to source queue after fixing the bug (using SQS console or StartMessageMoveTask).', 8);

  s.nodes.find(n => n.id === 'dlq').state = 'idle';
  s.packets = [pkt('sqsS', 'cw', 'queue depth: 0', 'request')];
  s.events.push({ type: 'ok', msg: 'CloudWatch: ApproximateNumberOfMessagesVisible=0, ApproximateAgeOfOldestMessage=0s. Auto-scaling: target 1 msg/batch.' });
  snap(steps, s, 'CloudWatch metrics: ApproximateNumberOfMessagesVisible (queue depth), ApproximateAgeOfOldestMessage, NumberOfMessagesSent, NumberOfMessagesReceived. Use these for auto-scaling consumers: CloudWatch alarm → SQS queue depth > N → add more consumers. For Lambda: SQS triggers scale automatically (up to 60 concurrent batches per minute per queue).', 9);

  s.nodes[3].state = 'idle';
  s.nodes[4].state = 'idle';
  s.events.push({ type: 'ok', msg: 'SQS + S3: S3 event notification → SQS → Lambda process. SQS + SNS: SNS fanout → SQS for durable processing.' });
  snap(steps, s, 'SQS integrations: S3 event notifications → SQS (process uploads), SNS → SQS (durable fan-out subscriber), SQS → Lambda trigger (auto-poll), SQS → Auto Scaling Group (scale EC2 workers), SQS → ECS (run task per message). Key pattern: use SQS anywhere you need buffer + decoupling + durability between services.', 10);

  s.result = 'Standard: at-least-once, unordered, high throughput. FIFO: exactly-once, ordered, 3000/s.';
  snap(steps, s, 'Key takeaways: Standard = maximum throughput + at-least-once. FIFO = ordering + exactly-once, capped at 3000/s (or 3000/s batch). Use Long Polling (WaitTimeSeconds=20) to reduce cost + empty responses. Set appropriate VisibilityTimeout (processing time × 2). Always configure DLQ. Make consumer code idempotent. Encryption at rest: SSE-SQS (AWS managed) or SSE-KMS (custom key). Access: SQS queue policy or IAM with sqs:* actions.', 11);

  return steps;
}

const CODE = [
  '# Create Standard queue',
  'aws sqs create-queue --queue-name my-queue',
  '# Create FIFO queue',
  'aws sqs create-queue --queue-name my-queue.fifo',
  '# Send + receive message',
  'aws sqs send-message --queue-url <url> --message-body "hello"',
  'aws sqs receive-message --queue-url <url>',
  '# Long polling (reduce cost)',
  'aws sqs receive-message --queue-url <url>',
  '  --wait-time-seconds 20',
  '# DLQ redrive (move messages back)',
  'aws sqs start-message-move-task',
  '# FIFO dedup + group',
  'aws sqs send-message --queue-url <url>.fifo',
  '  --message-body "order"',
  '  --message-group-id "orders"',
  '  --message-deduplication-id "abc123"',
];

export default {
  id: 'sqs',
  label: 'SQS',
  icon: '📬',
  build: buildSQSSteps,
  code: CODE,
  language: 'YAML/CLI',
  metrics: [
    { key: 'sent',     label: 'Sent',      max: 8,  color: 'var(--node-default)' },
    { key: 'received', label: 'Received',  max: 5,  color: 'var(--pod-running)' },
    { key: 'batchSize',label: 'Batch',     max: 10, color: 'var(--node-comparing)' },
    { key: 'dlq',      label: 'DLQ',       max: 3,  color: 'var(--pod-crash)' },
  ],
};

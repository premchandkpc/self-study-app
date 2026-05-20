import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildSQSSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('producer', 'Producer\n(App Server)', 'server',  50, 180, { desc: 'Web server or Lambda sending messages. SendMessage API puts messages in queue. Can batch up to 10 messages (max 256KB each).', region: 'us-east-1', app: 'order-service' }),
      svc('sqsS',     'SQS Standard',           'queue',   270, 100, { messages: [], visibility: 30, retention: 4, desc: 'Standard queue: high throughput (near unlimited), at-least-once delivery (duplicates possible), best-effort ordering. Max 120K inflight messages.', type: 'Standard', arn: 'arn:aws:sqs:us-east-1:123:orders-queue' }),
      svc('sqsF',     'SQS FIFO',               'queue',   270, 320, { messages: [], dedup: true, ordered: true, desc: 'FIFO queue: strict first-in-first-out ordering, exactly-once delivery. 3000 msgs/s (batch: 3000). Name ends in .fifo. Requires MessageGroupId.', type: 'FIFO', throughput: '3000/s' }),
      svc('consumer1','Consumer 1\n(Lambda)',   'lambda',  480, 80,  { batchSize: 10, desc: 'Lambda with SQS trigger. Auto-polls queue, processes batch of up to 10 messages. Scales automatically (60 concurrent batches/min). DLQ configured.', concurrency: 60 }),
      svc('consumer2','Consumer 2\n(EC2 Worker)','server',  480, 180, { desc: 'EC2 worker that polls SQS. Long polling (WaitTimeSeconds=20) to reduce cost. Processes in background thread. Scales via ASG based on queue depth.', pollInterval: '20s' }),
      svc('dlq',      'Dead Letter\nQueue (DLQ)','dlq',    480, 310, { messages: [], desc: 'Messages that exceeded maxReceiveCount go here. Monitor depth via CloudWatch. Redrive back to source queue after fixing bug.', maxReceiveCount: 3 }),
      svc('cw',       'CloudWatch\nMetrics',    'server',  480, 430, { desc: 'Queue metrics: ApproximateNumberOfMessagesVisible, AgeOfOldestMessage, Sent/Received count. Creates alarms for DLQ depth, age threshold.', metricsCount: 8 }),
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
    packets: [], events: [],
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
  s.nodes.find(n => n.id === 'sqsS').messages = s.nodes.find(n => n.id === 'sqsS').messages.slice(1);
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
  s.events.push({ type: 'ok', msg: 'DLQ Redrive: "StartMessageMoveTask" moves DLQ messages back to source queue. Source must be empty or same type (Standard↔Standard, FIFO↔FIFO).' });
  snap(steps, s, 'SQS DLQ Redrive (2022): managed operation to move messages from DLQ back to source queue. Console: select DLQ → "Start DLQ redrive". CLI: `aws sqs start-message-move-task`. Handles large volumes (millions). Cancelable. Does NOT re-trigger Lambda if source SQS trigger configured — messages go back to queue for normal polling. No more custom scripts or manual re-queuing.', 9);

  s.packets = [pkt('sqsS', 'cw', 'queue depth: 0', 'request')];
  s.events.push({ type: 'ok', msg: 'CloudWatch: ApproximateNumberOfMessagesVisible=0, ApproximateAgeOfOldestMessage=0s. Auto-scaling: target 1 msg/batch.' });
  snap(steps, s, 'CloudWatch metrics: ApproximateNumberOfMessagesVisible (queue depth), ApproximateAgeOfOldestMessage, NumberOfMessagesSent, NumberOfMessagesReceived. Use these for auto-scaling consumers: CloudWatch alarm → SQS queue depth > N → add more consumers. For Lambda: SQS triggers scale automatically (up to 60 concurrent batches per minute per queue).', 10);

  s.packets = [pkt('sqsS', 'consumer2', 'EventBridge Pipes → filter + transform', 'request')];
  s.events.push({ type: 'info', msg: 'EventBridge Pipes: SQS → filter → enrich → target. No-code filtering + transformation between source and target.' });
  snap(steps, s, 'EventBridge Pipes: simplified point-to-point event integration. SQS as source → optional filtering (SQL-like filter pattern) → optional enrichment (Lambda, Step Functions, API Gateway) → target (SQS, SNS, Event Bus, Lambda, Step Functions). No custom code for simple filtering! Example: SQS → filter (only "orderType=premium") → SNS fan-out. Cheaper than running a Lambda just to filter messages.', 11);

  s.nodes[3].state = 'idle';
  s.nodes[4].state = 'idle';
  s.events.push({ type: 'ok', msg: 'VPC Endpoint (Gateway): access SQS from VPC without internet/NAT. Endpoint policy controls which queues are accessible.' });
  snap(steps, s, 'VPC Endpoints for SQS: access SQS from EC2/Lambda in private VPC without NAT gateway or internet. Gateway Endpoint: free, accessed via prefix list in route table. Interface Endpoint (PrivateLink): paid, uses ENI with private IP. Configure VPC endpoint policy: restrict to specific SQS queues. Without endpoint: Lambda in VPC can only reach SQS via NAT → NAT cost + latency. Always use Gateway Endpoint for SQS + DynamoDB.', 12);

  s.events.push({ type: 'ok', msg: 'SQS + S3 Event Notifications: S3 → SQS → Lambda. SQS + SNS: SNS fanout → SQS for durable processing.' });
  snap(steps, s, 'SQS integrations: S3 event notifications → SQS (process uploads), SNS → SQS (durable fan-out subscriber), SQS → Lambda trigger (auto-poll), SQS → Auto Scaling Group (scale EC2 workers), SQS → ECS (run task per message). Key pattern: use SQS anywhere you need buffer + decoupling + durability between services.', 13);

  s.result = 'Standard: at-least-once, unordered, high throughput. FIFO: exactly-once, ordered, 3000/s.';
  snap(steps, s, 'Key takeaways: Standard = maximum throughput + at-least-once. FIFO = ordering + exactly-once, capped at 3000/s (or 3000/s batch). Use Long Polling (WaitTimeSeconds=20) to reduce cost + empty responses. Set appropriate VisibilityTimeout (processing time × 2). Always configure DLQ. Make consumer code idempotent. Encryption at rest: SSE-SQS (AWS managed) or SSE-KMS (custom key). Access: SQS queue policy or IAM with sqs:* actions.', 14);

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
  '# EventBridge Pipes (SQS → filter → SNS)',
  'aws pipes create-pipe --source <sqs-arn> --target <sns-arn>',
  '# VPC Gateway Endpoint for SQS',
  'aws ec2 create-vpc-endpoint --service-name com.amazonaws.<region>.sqs',
];

export default {
  id: 'sqs',
  label: 'SQS',
  icon: '📬',
  build: buildSQSSteps,
  code: CODE,
  language: 'YAML/CLI',
  metrics: [
    { key: 'sent',      label: 'Sent',      max: 8,  color: 'var(--node-default)' },
    { key: 'received',  label: 'Received',  max: 5,  color: 'var(--pod-running)' },
    { key: 'batchSize', label: 'Batch',     max: 10, color: 'var(--node-comparing)' },
    { key: 'dlq',       label: 'DLQ',       max: 3,  color: 'var(--pod-crash)' },
  ],
  topicContent: {
    concept: [
      { title: 'Standard vs FIFO Queues', content: 'Standard: high throughput (near unlimited), at-least-once delivery (possible duplicates), best-effort ordering. FIFO: exactly-once, strict ordering, 3000 msg/s, name must end in .fifo.' },
      { title: 'Visibility Timeout', content: 'Message received becomes hidden from other consumers for N seconds. If not deleted in time, it reappears for retry. Prevents duplicate processing and handles consumer crashes.' },
    ],
    why: ['SQS decouples producers from consumers, acting as a shock absorber for traffic spikes and preventing data loss if a consumer fails — essential for building resilient distributed systems.'],
    interview: [
      { question: 'What is the difference between short polling and long polling in SQS?', answer: 'Short polling returns immediately (may return empty responses). Long polling (WaitTimeSeconds=20) waits up to 20s for messages to arrive, reducing empty responses and saving cost. Long polling is recommended.', followUps: ['What is the maximum WaitTimeSeconds?', 'How does long polling affect cost?'] },
      { question: 'How does a Dead Letter Queue work in SQS?', answer: 'Messages that exceed MaxReceiveCount (e.g., fail processing 3 times) are automatically moved to a DLQ. This prevents poison pills from looping forever. DLQ depth can trigger CloudWatch alarms for manual inspection.', followUps: ['How do you redrive messages from the DLQ?', 'What is the redrive policy?'] },
    ],
    gotcha: ['Standard queues can deliver the same message twice — consumer code MUST be idempotent. Use deduplication IDs or idempotency keys in your processing logic.', 'FIFO queues have a 3000 msg/s throughput limit (or 3000/s for batched). Exceeding this causes throttling — you cannot scale FIFO by adding more consumers.'],
    tradeoffs: [
      { pro: 'Fully managed, highly durable (messages stored across 3 AZs), and virtually unlimited throughput for Standard queues.', con: 'At-least-once delivery in Standard queues requires idempotent consumers. FIFO queues have throughput limitations.' },
      { pro: 'Long polling reduces cost by eliminating empty responses, and batching (up to 10 messages) improves consumer efficiency.', con: 'Latency is inherent — polling has delay. For real-time messaging without polling, consider SNS or EventBridge.' },
    ],
  },
};

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
      { title: 'Standard vs FIFO Queues — choosing the right delivery semantics', content: 'Standard queues provide near-unlimited throughput (thousands of messages per second per API action), at-least-once delivery where the same message may be delivered multiple times, and best-effort ordering where messages may occasionally be delivered out of order. FIFO queues provide exactly-once delivery with strict first-in-first-out ordering within each message group, a maximum throughput of 3000 messages per second per API action (or 3000 with batching), and require the queue name to end in .fifo. FIFO uses MessageGroupId to group related messages that must be processed in order, and MessageDeduplicationId with a 5-minute deduplication window to prevent duplicate sends. Choose Standard for most use cases where throughput and simplicity matter; choose FIFO for financial transactions, inventory updates, and any scenario where message ordering and exactly-once delivery are critical.' },
      { title: 'Visibility Timeout — how SQS prevents duplicate processing', content: 'When a consumer receives a message via ReceiveMessage, the message becomes invisible to other consumers for the duration of the VisibilityTimeout (default 30 seconds, configurable 0 seconds to 12 hours). If the consumer successfully processes the message, it calls DeleteMessage to permanently remove it from the queue. If the consumer crashes or takes too long, the VisibilityTimeout expires and the message reappears in the queue for another consumer to retry. This mechanism prevents duplicate processing during normal operation but creates at-least-once delivery semantics — a consumer that crashes just before calling DeleteMessage causes the message to be processed twice. Setting VisibilityTimeout correctly (twice the expected processing time) minimizes unnecessary retries while preventing duplicate processing windows.' },
      { title: 'Deep — SQS architecture, long polling, and throughput internals', content: 'SQS queues are distributed across multiple AWS regions with messages stored redundantly across at least three Availability Zones. Short polling (ReceiveMessage with WaitTimeSeconds=0) queries only a subset of the available servers (weighted random distribution) and may return empty responses even when messages exist — this increases cost because you pay per request even for empty responses. Long polling (WaitTimeSeconds between 1 and 20) queries all servers and waits up to 20 seconds for messages to arrive, reducing empty responses to near zero and significantly lowering cost. Batch operations improve efficiency — SendMessageBatch sends up to 10 messages (max 256KB each) in a single request, and ReceiveMessage can receive up to 10 messages per request. For Lambda triggers, the batch size and batch window (maximum batching window in seconds) control how SQS event source mapping batches messages before invoking the Lambda function, with maximum concurrency capped at 60 batches per minute per queue by default.' },
    ],
    why: [
      'SQS decouples producers from consumers, acting as a shock absorber for traffic spikes and preventing data loss if a consumer fails. When a service under heavy load, SQS buffers the excess messages until consumers can process them — the producers never block or fail due to backend capacity issues. This is essential for building resilient, loosely coupled distributed systems that degrade gracefully under load.',
      'SQS provides durable message storage with redundancy across multiple Availability Zones — once a message is accepted by the SQS API, it is durably stored and will not be lost even if underlying hardware fails. Messages survive up to 14 days (configurable retention period), giving consumers ample time to recover from extended outages. This durability makes SQS the backbone of reliable async processing patterns including S3 event notifications, SNS fan-out subscribers, and Step Functions task callbacks.',
      'The DLQ (Dead Letter Queue) pattern is critical for production message processing — it prevents poison-pill messages that continuously fail processing from looping forever and consuming resources. By configuring a redrive policy with MaxReceiveCount, failed messages are automatically moved to a separate DLQ where operators can inspect them, fix the underlying issue, and redrive them back to the source queue using the managed StartMessageMoveTask operation, introduced in 2022.',
    ],
    interview: [
      { q: 'What is the difference between short polling and long polling in SQS and why does it matter for cost?', a: 'Short polling (WaitTimeSeconds=0 or not set) returns immediately after querying a subset of the available servers. The response may be empty even when messages exist in the queue, because the subset of servers queried did not contain the messages. Short polling generates more empty responses, which still count as billable requests — significantly increasing costs for queues with low message volumes. Long polling (WaitTimeSeconds set between 1 and 20) queries all available servers and waits up to the specified time for messages to arrive. This virtually eliminates empty responses because it checks all server partitions. Setting WaitTimeSeconds=20 is the AWS best practice and can reduce costs by up to 90% for lightly loaded queues because you pay only for requests that actually receive messages. The maximum WaitTimeSeconds is 20 seconds. Long polling also reduces latency variability compared to short polling because the consistent wait time reduces the frequency of empty-result retries.', followUps: ['What is the maximum WaitTimeSeconds for SQS long polling?', 'How does long polling affect the cost profile of an SQS-based application?'] },
      { q: 'How does a Dead Letter Queue work and what is the redrive process?', a: 'A Dead Letter Queue is a separate SQS queue configured as the destination for messages that exceed the MaxReceiveCount threshold. When a message is received but not deleted (because the consumer failed to process it), the ReceiveCount for that message increments. Once ReceiveCount reaches MaxReceiveCount (default 3), SQS automatically moves the message to the configured DLQ using a redrive policy. The original message is deleted from the source queue and a copy is placed in the DLQ, preserving the message body and attributes. The DLQ serves as a manual inspection queue — operators monitor its depth using CloudWatch alarms (ApproximateNumberOfMessagesVisible for the DLQ). After diagnosing and fixing the issue (e.g., fixing a bug in the consumer or updating a downstream service), messages can be redriven back to the source queue using the StartMessageMoveTask API or the SQS console Redrive button. This operation was simplified in 2022 and now handles the redrive as a managed AWS operation with progress tracking and cancellation support. DLQ messages retain their original message attributes, body, and approximate receive count.', followUps: ['What is the redrive policy configuration?', 'How do you monitor and alarm on DLQ depth?', 'What happened to DLQ redrive before the managed StartMessageMoveTask operation?'] },
      { q: 'How does SQS handle message ordering and what guarantees do Standard and FIFO queues provide?', a: 'Standard queues provide best-effort ordering — messages are generally delivered in the order they were sent, but occasionally may be delivered out of order due to the distributed architecture where messages are stored across multiple servers and partitions. Standard queues do NOT guarantee order and should not be used for scenarios where sequence matters. FIFO queues guarantee strict first-in-first-out ordering within each message group, identified by the MessageGroupId parameter. All messages within the same MessageGroupId are processed in the exact order they were sent, and one message at a time (the consumer must delete the current message before receiving the next one in the group). FIFO queues also provide exactly-once delivery by using MessageDeduplicationId — SQS uses this ID to detect and reject duplicate messages within a 5-minute deduplication window. The throughput limit for FIFO queues is 3000 messages per second with batching (3000 API requests per second without batching). You cannot increase FIFO throughput by adding more consumers — throughput is capped at the queue level, not the consumer level. For higher throughput with ordering, you can use multiple message groups and distribute messages across them.', followUps: ['How does MessageGroupId affect FIFO ordering?', 'Can you increase FIFO throughput beyond 3000 msg/s?', 'What happens if a FIFO consumer fails and needs to retry within the same message group?'] },
    ],
    gotcha: [
      'Standard queues can deliver the same message twice — at-least-once delivery means your consumer code MUST be idempotent. Use idempotency keys in your processing logic, deduplicate by message ID, or implement idempotency checks in your database (e.g., INSERT with ON CONFLICT DO NOTHING in PostgreSQL). Non-idempotent consumers cause duplicate charges, duplicate emails, or duplicate orders.',
      'FIFO queues have a hard throughput limit of 3000 messages per second per API action (or 3000 with batching). Unlike Standard queues where adding more consumers increases throughput, FIFO throughput is capped at the queue level. Exceeding this limit causes throttling (HTTP 403 with TooManyEntriesPerRequest or ThrottlingException errors). You cannot scale FIFO throughput by adding more consumers.',
      'The visibility timeout should be set to approximately 6x the 99th percentile processing time. If set too low, messages will be redelivered before processing completes, causing duplicate work. If set too high, consumer failures will take too long to trigger retries, increasing end-to-end processing latency. ChangeMessageVisibility API can extend the timeout in-progress for long-running operations.',
      'SQS message size is limited to 256KB total including the message body and all metadata (attributes, message attributes). If your message exceeds this limit, you must use S3 to store the payload and include only the S3 reference in the SQS message. The S3-SQS extended client library handles this pattern automatically for supported SDKs.',
    ],
    tradeoffs: [
      { pro: 'Fully managed, highly durable with messages stored redundantly across at least 3 Availability Zones, virtually unlimited throughput for Standard queues, and automatic scaling — no infrastructure to provision or manage for message queuing at any scale.', con: 'At-least-once delivery in Standard queues requires idempotent consumer code, which adds complexity. FIFO queues solve this but impose throughput limits and require careful message group design. Neither queue type supports real-time push delivery — consumers must poll, introducing latency.' },
      { pro: 'Long polling and batching significantly reduce costs by eliminating empty responses and reducing the number of API calls. With WaitTimeSeconds=20 and batch size of 10, a high-throughput queue can achieve processing costs below $0.10 per million messages.', con: 'Polling-based delivery has inherent latency — the time from message send to consumption includes the poll interval plus visibility timeout for retries. For real-time push-based scenarios with sub-second delivery, consider SNS (push-based pub/sub) or EventBridge (event bus with multiple targets).' },
      { pro: 'Deep integration with the AWS ecosystem — Lambda triggers automatically poll and process messages, S3 event notifications send directly to SQS, CloudWatch metrics provide queue depth and age monitoring, and EventBridge Pipes enable no-code filtering and transformation between SQS and targets.', con: 'SQS is AWS-only — migrating to another cloud provider requires a complete messaging infrastructure redesign. There is no on-premises equivalent of SQS without running ActiveMQ or RabbitMQ on EC2, which increases operational complexity.' },
    ],
  },
};

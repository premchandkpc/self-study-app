import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildSNSSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('pub',    'Publisher\n(Order Service)', 'client',  30, 200, { desc: 'Service that calls sns.publish() to send messages. Single publish reaches all subscribers. No need to know who subscribes.', service: 'order-service' }),
      svc('sns',    'SNS Topic: orders',          'apigw',  220, 200, { subscribers: 5, filter: false, desc: 'Pub/sub topic. Receives messages and fans out to all subscribers in parallel. Supports: SQS, Lambda, HTTP, email, SMS, mobile push.', type: 'Standard', arn: 'arn:aws:sns:us-east-1:123:orders' }),
      svc('sqsE',   'SQS: email-queue',           'queue',  430, 80,  { desc: 'Subscribed to SNS topic via subscription. Receives ALL messages (or filtered subset). Durable buffer — survives Lambda failures.', filter: 'amount > 0' }),
      svc('sqsN',   'SQS: notify-queue',          'queue',  430, 200, { desc: 'Push notification queue. Messages processed by Push Lambda for mobile push via SNS mobile endpoints.', filter: 'type=push' }),
      svc('sqsA',   'SQS: audit-queue',           'queue',  430, 320, { desc: 'Compliance audit queue. Only receives high-value orders (filter policy: amount > 1000). Archived to S3 via Firehose.', filter: 'amount > 1000' }),
      svc('lamE',   'Email Lambda',               'lambda', 600, 80,  { desc: 'Sends transactional email via Amazon SES. Triggered by SQS poll. Formats message body, renders template, sends.', runtime: 'nodejs20.x' }),
      svc('lamN',   'Push Lambda',                'lambda', 600, 200, { desc: 'Sends mobile push via SNS Platform Endpoint. Supports: iOS (APNs), Android (FCM), Kindle (ADM).', runtime: 'nodejs20.x' }),
      svc('lamA',   'Audit Lambda',               'lambda', 600, 320, { desc: 'Stores audit record in S3 + DynamoDB. For compliance/regulatory requirements. Immutable log entry.', runtime: 'nodejs20.x' }),
      svc('http',   'HTTP Endpoint\n(3rd Party)', 'server', 600, 440, { desc: 'HTTP/s subscription: SNS POSTs message to your public endpoint. Must confirm subscription via URL (valid 3 days). Retries up to 100x over 20 days.', retryPolicy: '100 retries / 20 days' }),
    ],
    edges: [
      { from: 'pub', to: 'sns' },
      { from: 'sns', to: 'sqsE' }, { from: 'sns', to: 'sqsN' }, { from: 'sns', to: 'sqsA' },
      { from: 'sns', to: 'http' },
      { from: 'sqsE', to: 'lamE' }, { from: 'sqsN', to: 'lamN' }, { from: 'sqsA', to: 'lamA' },
    ],
    packets: [], events: [],
    metrics: { published: 0, fannedOut: 0, filtered: 0, failed: 0 },
  };

  snap(steps, s, 'SNS = Simple Notification Service. Pub/sub messaging. 1 publisher → many subscribers. Think of it as a PA system: one announcement, everyone subscribed hears it. AWS managed, highly available, durable.', 1);

  s.nodes[0].state = 'active'; s.nodes[1].state = 'active';
  s.packets = [pkt('pub', 'sns', 'Publish($100 order)', 'request')];
  s.metrics.published = 1;
  s.events.push({ type: 'ok', msg: 'Publisher: sns.publish(TopicArn, Message, MessageAttributes). SNS receives message with attributes: {amount: 100, type: "premium"}' });
  snap(steps, s, 'Publisher calls Publish() to SNS topic "orders". Message body = JSON (up to 256KB). MessageAttributes = key-value metadata for filtering. SNS immediately persists the message across AZs, then forwards to all subscribers. Think of Publish as a single "send" that reaches N recipients.', 2);

  s.packets = [pkt('sns', 'sqsE', '→ email-queue', 'request'), pkt('sns', 'sqsN', '→ notify-queue', 'request'), pkt('sns', 'sqsA', '→ audit-queue', 'request')];
  ['sqsE','sqsN','sqsA'].forEach(id => s.nodes.find(n => n.id === id).state = 'active');
  s.metrics.fannedOut = 3;
  s.events.push({ type: 'ok', msg: 'Fan-out: SNS delivers to ALL 3 SQS subscribers in parallel. Each gets the SAME message.' });
  snap(steps, s, 'Fan-out! Same message reaches all subscribers simultaneously. SQS subscribers: durable (messages survive in queue even if Lambda is down). Each subscriber gets the identical message. If you add a new subscriber, it starts receiving new messages only (no retroactive delivery). This is the most common AWS event pattern.', 3);

  s.packets = [pkt('sqsE', 'lamE', 'recv', 'request'), pkt('sqsN', 'lamN', 'recv', 'request'), pkt('sqsA', 'lamA', 'recv', 'request')];
  ['lamE','lamN','lamA'].forEach(id => s.nodes.find(n => n.id === id).state = 'active');
  s.events.push({ type: 'ok', msg: 'Each Lambda polls its SQS queue. Email sent, push notification dispatched, audit logged — independently.' });
  snap(steps, s, 'Each Lambda processes independently: Email Lambda sends transactional email (via SES), Push Lambda sends mobile notification (via SNS mobile push), Audit Lambda stores record in S3/DynamoDB. Independent processing means: if Push Lambda fails, email and audit are unaffected. Each component has its own failure domain.', 4);

  s.packets = []; s.nodes.find(n => n.id === 'sqsA').state = 'idle'; s.nodes.find(n => n.id === 'lamA').state = 'idle';
  s.metrics.filtered = 1; s.nodes[1].filter = true;
  s.events.push({ type: 'info', msg: 'Filter Policy: audit subscriber only receives messages where amount > 1000. This $100 order → filtered out for audit.' });
  snap(steps, s, 'SNS Filter Policy: subscriber says "only give me messages matching this rule". Rule = JSON like {"amount": [{"numeric": [">", 1000]}]}. $100 order → audit subscriber ignores it. Filter before delivery — saves processing. Policies support: exact match, prefix, numeric, anything-but, exists. Up to 10 filter policies per subscription.', 5);

  s.nodes[8].state = 'active';
  s.packets = [pkt('http', 'sns', 'subscription confirmed', 'response')];
  s.events.push({ type: 'ok', msg: 'HTTP subscription: SNS sends POST to https://my-app.com/sns-endpoint. Must confirm subscription within 3 days.' });
  snap(steps, s, 'SNS supports multiple protocol types: SQS (durable), Lambda (direct invoke), HTTP/HTTPS (public endpoint), Email/Email-JSON (for admins), SMS (mobile text), Platform Application Endpoint (push notification to iOS/Android/kindle). Each has different delivery behavior and retry policies.', 6);

  s.packets = []; s.nodes.find(n => n.id === 'sqsE').state = 'error'; s.nodes.find(n => n.id === 'lamE').state = 'idle';
  s.metrics.failed = 1;
  s.events.push({ type: 'error', msg: 'Email Lambda crashes (out of memory). SQS message not deleted → reappears. MaxReceiveCount=3 → DLQ.' });
  snap(steps, s, 'Failure handling: Lambda crashes → message stays in SQS → visibility timeout expires → another consumer retries. After MaxReceiveCount=3 → DLQ. SNS itself: HTTP subscriptions have retry policy (exponential backoff, up to 100 retries over 20 days). Failed HTTP deliveries can go to SQS DLQ too. Monitor delivery failures via CloudWatch + SNS delivery status logging.', 7);

  s.events.push({ type: 'info', msg: 'Delivery Status Logging: SNS → CloudWatch Logs per subscription. Logs every delivery attempt with HTTP status code, latency, error type.' });
  snap(steps, s, 'SNS Delivery Status Logging: per-subscription logging to CloudWatch Logs. Shows: delivery success/failure per attempt, HTTP status code (for HTTP/S), error classification (InvalidParameter, NetworkError, Throttled), timestamps. Enable in console: subscription → "Delivery status logging". Create IAM role: sns.amazonaws.com → write to CloudWatch Logs. Essential for debugging delivery failures.', 8);

  s.events.push({ type: 'ok', msg: 'SNS + Kinesis Firehose: subscribe Firehose to SNS topic → all messages stream to S3/Redshift/Elasticsearch.' });
  snap(steps, s, 'SNS + Kinesis Firehose: subscribe Firehose to SNS topic → all messages stream to S3/Redshift/Elasticsearch. Use for: audit logging, data lake ingestion, compliance archiving. Archive is a subscriber like any other — zero code, just configure delivery stream. The Firehose subscriber receives SNS messages as a batch, converts to format (Parquet, JSON, ORC), delivers to destination on schedule (60s or 5MB interval).', 9);

  s.events.push({ type: 'ok', msg: 'SNS + CloudWatch: metric filter on SNS topic → alarm on delivery failure rate > 0% for 5min.' });
  snap(steps, s, 'SNS + CloudWatch: SNS sends metrics: NumberOfNotificationsDelivered, NumberOfNotificationsFailed, PublishSize. Create CloudWatch alarm: failed > 0 for 5 min → notify ops. SNS delivery status logging: enable per subscription → CloudWatch Logs for detailed per-delivery success/failure with HTTP status codes.', 10);

  s.packets = [pkt('pub', 'sns', 'MessageAttributes: {source: "eu-west-1"}', 'request')];
  s.metrics.published = 2;
  s.events.push({ type: 'info', msg: 'Cross-region: publisher in eu-west-1 publishes to us-east-1 topic. SNS automatically handles region-to-region delivery.' });
  snap(steps, s, 'Cross-region SNS: SNS topic is regional. Publishers in other regions can still publish (HTTP call). Subscribers in other regions also work — SNS handles cross-region delivery automatically. Best practice: use a topic per region for lower latency + fault isolation. SNS + SQS cross-account: SQS queue policy grants SNS topic in another account permission to send messages.', 11);

  s.events.push({ type: 'ok', msg: 'SNS FIFO Topic: strict ordering + dedup. Subscriber must be SQS FIFO. 3000 msg/s. Best for: banking transactions, inventory sync.' });
  snap(steps, s, 'SNS FIFO Topic (newer feature): strict message ordering + deduplication. Topic name must end in .fifo. All subscribers must be FIFO (SQS FIFO). MessageGroupId for ordering groups. MessageDeduplicationId for dedup (5min window). 3000 messages/s per API (batch: 3000). Use for: financial transactions (order matters!), inventory sync across systems, event sourcing. When you need ordering but still want fan-out pattern.', 12);

  s.events.push({ type: 'ok', msg: 'Message archiving: SNS + Firehose → S3. Archive all messages to S3 for compliance + replay.' });
  snap(steps, s, 'SNS message archiving: send all messages to S3 via Firehose automatically. Use for compliance (SEC 17a-4, FINRA), data replay (re-process messages later), data science (analyze message patterns). Configure: SNS → Kinesis Firehose → S3 bucket. Firehose converts to Parquet/ORC for cost-effective querying via Athena. Retention: managed by S3 lifecycle. Also supports: SNS → Lambda (process + archive), SNS → SQS → Lambda (durable archive pipeline).', 13);

  s.result = 'SNS fan-out: 1 publish → N subscribers. SQS for durability. Filter for efficiency.';
  snap(steps, s, 'Key takeaways: SNS = push-based pub/sub (SQS = pull-based queue). Use SNS→SQS pattern for durable fan-out (service decoupling). Always use MessageAttributes + FilterPolicy to reduce downstream processing. Monitor delivery failures with CloudWatch. Message size limit: 256KB. Consider FIFO topics (newer feature) for strict ordering at the cost of lower throughput. SNS is Regional — plan for multi-region if needed.', 14);

  return steps;
}

const CODE = [
  '# Create SNS topic',
  'aws sns create-topic --name orders',
  '# Subscribe SQS queue (fan-out)',
  'aws sns subscribe --topic-arn <arn> --protocol sqs --notification-endpoint <queue-arn>',
  '# Subscribe with filter policy',
  'aws sns subscribe --topic-arn <arn> --protocol sqs --notification-endpoint <queue-arn>',
  '  --attributes \'{"FilterPolicy":"{\\"amount\\":[{\\"numeric\\":[\\">\\",1000]}]}"}\'',
  '# Subscribe Lambda (direct invoke)',
  'aws sns subscribe --topic-arn <arn> --protocol lambda --notification-endpoint <lambda-arn>',
  '# Publish with message attributes',
  'aws sns publish --topic-arn <arn> --message \'{"order":42}\' --message-attributes file://attrs.json',
  '# Subscription confirmation for HTTP',
  'curl -X POST -H "Content-Type: text/plain" --data "token" <SubscribeURL>',
  '# Message archiving to S3',
  'aws firehose create-delivery-stream --s3-destination-configuration ...',
  'aws sns subscribe --topic-arn <arn> --protocol firehose ...',
  '# Enable delivery status logging',
  'aws sns set-subscription-attributes --subscription-arn <arn>',
  '  --attribute-name DeliveryPolicy --attribute-value file://policy.json',
];

export default {
  id: 'sns',
  label: 'SNS Fan-out',
  icon: '📢',
  build: buildSNSSteps,
  code: CODE,
  language: 'YAML/CLI',
  metrics: [
    { key: 'published', label: 'Published', max: 5, color: 'var(--node-default)' },
    { key: 'fannedOut', label: 'Fanned Out', max: 5, color: 'var(--pod-running)' },
    { key: 'filtered',  label: 'Filtered',  max: 3, color: 'var(--node-comparing)' },
    { key: 'failed',    label: 'Failed',    max: 3, color: 'var(--pod-crash)' },
  ],
};

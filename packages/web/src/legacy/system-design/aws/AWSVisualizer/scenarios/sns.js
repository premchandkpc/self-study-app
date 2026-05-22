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
  topicContent: {
    concept: [
      { title: 'Pub/Sub Fan-Out — one publish, many consumers', content: 'SNS implements the publish-subscribe pattern where a single message published to a topic is fanned out to all subscribers in parallel. Subscribers can be SQS queues (for durable, buffered processing with isolated failure domains), Lambda functions (for direct serverless invocation), HTTP/HTTPS endpoints (for third-party webhooks), email (for admin notifications), SMS (for text messages), mobile push via platform endpoints (Apple APNs, Google FCM, Amazon ADM), and Kinesis Data Firehose (for streaming to S3, Redshift, or Elasticsearch). The publisher does not need to know about or manage any subscriber — it simply publishes to a topic ARN. This decoupling is the foundation of event-driven architectures where adding a new consumer does not require any changes to the producer.' },
      { title: 'Filter Policies — reducing downstream noise', content: 'Filter policies allow subscribers to define JSON-based rules that SNS evaluates before delivering the message. Only messages matching the filter policy are delivered to that subscriber, reducing downstream processing, compute cost, and data transfer. Filter policies support exact matching (string equals), numeric comparisons (greater than, less than, between), prefix matching, anything-but matching, and the exists condition. For example, an audit subscriber might only receive messages where amount is greater than 1000, while a push notification subscriber only receives messages where type equals push. Filter policies are evaluated at the SNS service level before any delivery attempt, so filtered-out messages incur no downstream cost. Up to 10 filter policies can be defined per subscription.' },
      { title: 'Deep — SNS delivery mechanics, retry policies, and FIFO topics', content: 'SNS delivers messages to subscribers using different mechanisms depending on the protocol: SQS subscribers receive messages pushed directly (the SNS service writes to the SQS queue), Lambda subscribers are invoked synchronously by SNS, and HTTP subscribers receive POST requests with the message in the body. For HTTP/S subscriptions, SNS implements a sophisticated retry policy with exponential backoff — up to 100 retries over 20 days depending on the delivery policy configured. HTTP subscribers must confirm the subscription within 3 days by handling the SubscriptionConfirmation notification and calling the SubscribeURL endpoint. SNS FIFO topics (newer feature) provide strict message ordering and deduplication with all subscribers being SQS FIFO queues, limited to 3000 messages per second. FIFO topics use MessageGroupId for ordering groups and MessageDeduplicationId for 5-minute deduplication, enabling ordered fan-out to multiple consumers simultaneously — previously impossible with standard topics.' },
    ],
    why: [
      'SNS enables event-driven architectures by decoupling event producers from consumers — one event can trigger email notifications, push notifications, audit logging, third-party webhooks, and data lake ingestion simultaneously. Adding a new consumer requires zero changes to the producer — just subscribe to the topic. This architectural pattern scales to thousands of subscribers per topic and is the foundation of AWS\'s event-driven ecosystem.',
      'The SNS + SQS fan-out pattern is the most durable event distribution pattern on AWS. SNS provides the push-based fan-out, while SQS queues provide durable buffering for each consumer — if the email service is down, the email SQS queue holds the messages until it recovers, without affecting the push notification or audit logging consumers. Each subscriber has its own isolated failure domain, making the overall system resilient to individual component failures.',
      'SNS filter policies reduce downstream processing by preventing irrelevant messages from reaching subscribers. Without filtering, every subscriber receives every message and must filter internally — wasting compute and requiring duplicate filtering logic. SNS filter policies save significant cost at scale by eliminating unnecessary Lambda invocations, SQS storage, and HTTP data transfer for messages that no subscriber needs.',
    ],
    interview: [
      { q: 'What is the SNS plus SQS fan-out pattern and why is it the most common AWS event distribution pattern?', a: 'The SNS plus SQS fan-out pattern connects a single SNS topic to multiple SQS queues, each representing a different consumer or processing pipeline. When a message is published to the SNS topic, it is automatically delivered to every subscribed SQS queue in parallel. Each queue then acts as a durable buffer for its consumer — typically a Lambda function, EC2 instance, or ECS task that polls the queue. This pattern is the most common because it combines SNS\'s push-based real-time delivery with SQS\'s durable buffering and retry mechanics. If one consumer\'s Lambda function is down (e.g., due to a deployment or crash), its SQS queue continues to accumulate messages without losing any data. When the consumer recovers, it picks up where it left off. Meanwhile, other consumers processing the same message are unaffected because their queues are independent. This provides true failure isolation — a bug in the email consumer does not affect the audit logging or push notification pipelines. Filter policies can also be applied at the subscription level so that each SQS queue only receives messages relevant to its consumer, reducing processing overhead.', followUps: ['What happens if one SQS queue subscriber is unavailable?', 'How does SNS subscription filtering work with this pattern?'] },
      { q: 'How does SNS handle failed HTTP deliveries and what retry mechanisms are available?', a: 'SNS implements a comprehensive retry policy for HTTP/S subscriptions. When SNS sends a POST request to an HTTP endpoint and receives a non-success response (non-2xx status code) or a network error occurs, it initiates a retry sequence with exponential backoff. The default retry policy attempts delivery up to 100 times over approximately 20 days, with the interval between retries increasing from 1 second up to a maximum of 20 minutes. You can configure a custom delivery policy that specifies the number of retries, the backoff function, and the maximum retry duration. SNS also supports a dead letter queue for HTTP subscriptions — when all retries are exhausted, the message can be forwarded to a configured SQS DLQ for manual inspection instead of being permanently lost. Delivery status logging can be enabled per subscription to send detailed delivery attempt logs (HTTP status code, response time, error type) to CloudWatch Logs for analysis. For SQS and Lambda subscriptions, retry handling is delegated to those services — Lambda retries async invocations twice, and SQS redrives based on the queue\'s redrive policy after the visibility timeout expires.', followUps: ['Can failed SNS deliveries be sent to a Dead Letter Queue?', 'How do you monitor SNS delivery failures using CloudWatch?'] },
      { q: 'How does SNS FIFO differ from standard SNS and when would you use it?', a: 'SNS FIFO topics provide strict message ordering and deduplication in addition to the fan-out pattern. FIFO topic names must end in .fifo, and all subscribers must be SQS FIFO queues (not Lambda, HTTP, email, or other protocols). Within a FIFO topic, messages with the same MessageGroupId are delivered to all subscribing FIFO queues in strict order — the first message in a group is delivered to all queues before the second message. MessageDeduplicationId prevents duplicate messages within a 5-minute deduplication window. The throughput is 3000 messages per second per API action (or 3000 with batching), matching the SQS FIFO throughput limit. Use FIFO topics for event-driven architectures where ordering and deduplication are critical across multiple consumers — for example, financial transaction events that must be processed in sequence by both the fraud detection system and the accounting system. The trade-off is reduced throughput and subscriber protocol flexibility compared to standard topics. FIFO topics are appropriate for banking transactions, inventory synchronization across multiple systems, and event sourcing where event order must be preserved across all consumers.', followUps: ['What are the throughput limits for FIFO topics?', 'Why must FIFO topic subscribers all be SQS FIFO queues?'] },
    ],
    gotcha: [
      'SNS topics are regional — messages do NOT automatically replicate across regions. If you publish to a topic in us-east-1, subscribers in eu-west-1 will not receive messages unless you set up cross-region SNS subscriptions (which is possible but adds cross-region data transfer costs and latency) or deploy a separate topic per region with cross-region message forwarding.',
      'HTTP and HTTPS subscriptions require subscription confirmation within 3 days — the endpoint must handle the SubscriptionConfirmation notification type by visiting the SubscribeURL included in the notification body. If the endpoint does not confirm the subscription within 3 days, the subscription is automatically deleted. Many developers miss this step and wonder why their HTTP endpoints never receive messages.',
      'SNS message attributes are limited to 10 attributes per message, with each attribute name limited to 80 bytes and each attribute value limited to 256 bytes. For complex filtering requirements that exceed these limits, you must include filter data in the message body and implement server-side filtering in the subscriber rather than using SNS filter policies.',
      'SNS does NOT guarantee exactly-once delivery to standard topics — messages may be delivered to subscribers zero, one, or multiple times in rare failure scenarios. For exactly-once delivery combined with fan-out, use FIFO topics (which require FIFO queues as subscribers) or implement idempotent message processing in your subscribers using message IDs or custom deduplication logic.',
    ],
    tradeoffs: [
      { pro: 'Simple pub/sub model with multiple delivery protocols (SQS, Lambda, HTTP, email, SMS, mobile push) and filter policies that eliminate irrelevant downstream processing — a single publish reaches all relevant subscribers without the publisher knowing about any of them.', con: 'No built-in support for message replay or history — messages are delivered in real-time and discarded after delivery. For message archiving and replay capability, you must add a Kinesis Firehose subscriber that streams all messages to S3, adding cost and complexity.' },
      { pro: 'FIFO topics provide strict message ordering combined with fan-out, enabling ordered event distribution to multiple consumers — the first message in a group reaches all queues before the second message, which is critical for financial transactions, inventory sync, and event sourcing scenarios.', con: 'FIFO topics require all subscribers to be SQS FIFO queues, eliminating Lambda, HTTP, email, and mobile push delivery options. Throughput is limited to 3000 messages per second, and the FIFO SQS subscriber limitation means all consumers must poll rather than receive push deliveries.' },
      { pro: 'SNS integrates with 15+ AWS services as targets and supports CloudWatch delivery status logging, dead letter queues for HTTP failures, and message archiving via Firehose — providing comprehensive delivery observability and failure handling.', con: 'SNS has limited DLQ support — only HTTP subscriptions support DLQ configuration. For SQS and Lambda subscriptions, failed delivery handling must be configured on the subscriber side (SQS redrive policy, Lambda DLQ configuration). Cross-region delivery adds data transfer costs and latency.' },
    ],
  },
};

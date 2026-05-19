import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildSNSSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('publisher', 'Publisher',    'client',  70,  190),
      svc('sns',       'SNS Topic',    'apigw',   240, 190),
      svc('sqs1',      'SQS: email',   'queue',   430, 100),
      svc('sqs2',      'SQS: notify',  'queue',   430, 190),
      svc('sqs3',      'SQS: audit',   'queue',   430, 280),
      svc('lambda1',   'Email Lambda', 'lambda',  610, 100),
      svc('lambda2',   'Push Lambda',  'lambda',  610, 190),
      svc('lambda3',   'Audit Lambda', 'lambda',  610, 280),
    ],
    edges: [
      { from: 'publisher', to: 'sns' },
      { from: 'sns', to: 'sqs1' },
      { from: 'sns', to: 'sqs2' },
      { from: 'sns', to: 'sqs3' },
      { from: 'sqs1', to: 'lambda1' },
      { from: 'sqs2', to: 'lambda2' },
      { from: 'sqs3', to: 'lambda3' },
    ],
    packets: [],
    events: [],
    metrics: { published: 0, delivered: 0, subscribers: 3 },
  };

  snap(steps, s, 'SNS Topic "orders" with 3 SQS subscribers. Fan-out pattern: 1 publish → N consumers.', 1);

  // Publisher sends
  s.nodes.find((n) => n.id === 'publisher').state = 'active';
  s.nodes.find((n) => n.id === 'sns').state = 'active';
  s.packets = [pkt('publisher', 'sns', 'PutItem', 'request')];
  s.metrics.published = 1;
  s.events.push({ type: 'ok', msg: 'sns.Publish(topicArn, message) → SNS receives event' });
  snap(steps, s, 'Publisher calls sns.Publish(). SNS topic receives the message.', 2);

  // SNS fans out to all queues
  s.packets = [
    pkt('sns', 'sqs1', '→ email', 'request'),
    pkt('sns', 'sqs2', '→ notify', 'request'),
    pkt('sns', 'sqs3', '→ audit', 'request'),
  ];
  ['sqs1','sqs2','sqs3'].forEach((id) => { s.nodes.find((n) => n.id === id).state = 'active'; });
  s.metrics.delivered = 3;
  s.events.push({ type: 'ok', msg: 'SNS delivers to all 3 SQS queues simultaneously (fan-out)' });
  snap(steps, s, 'SNS delivers to all 3 SQS subscribers in parallel. Decoupled fan-out.', 3);

  // Lambdas poll and process
  s.packets = [
    pkt('sqs1', 'lambda1', 'recv', 'request'),
    pkt('sqs2', 'lambda2', 'recv', 'request'),
    pkt('sqs3', 'lambda3', 'recv', 'request'),
  ];
  ['lambda1','lambda2','lambda3'].forEach((id) => { s.nodes.find((n) => n.id === id).state = 'active'; });
  s.events.push({ type: 'ok', msg: 'Each Lambda polls its SQS queue and processes independently' });
  snap(steps, s, 'Each Lambda processes its queue. Email sent, push notification dispatched, audit logged.', 4);

  // Filter policy
  s.packets = [];
  s.nodes.find((n) => n.id === 'sqs3').state = 'idle';
  s.nodes.find((n) => n.id === 'lambda3').state = 'idle';
  s.events.push({ type: 'warn', msg: 'SNS filter policy: audit queue only receives high-value orders' });
  snap(steps, s, 'SNS Filter Policy: audit subscriber only gets messages matching {"amount": [{"numeric": [">", 1000]}]}.', 5);

  // DLQ for failed delivery
  s.nodes.find((n) => n.id === 'sqs2').state = 'error';
  s.events.push({ type: 'error', msg: 'lambda2 crash → message re-queued, maxReceiveCount=3 → DLQ' });
  snap(steps, s, 'lambda2 fails. SQS makes message visible again (visibility timeout). After 3 retries → DLQ.', 6);

  return steps;
}

const CODE = [
  '# SNS Topic + Fan-out',
  'aws sns create-topic --name orders',
  '# Subscribe SQS queues',
  'aws sns subscribe \\',
  '  --topic-arn arn:aws:sns:orders \\',
  '  --protocol sqs \\',
  '  --notification-endpoint <queue-arn>',
  '# Publish message',
  'aws sns publish \\',
  '  --topic-arn arn:aws:sns:orders \\',
  '  --message \'{"order":42}\'',
];

export default {
  id: 'sns',
  label: 'SNS Fan-out',
  icon: '📢',
  build: buildSNSSteps,
  code: CODE,
  language: 'YAML/CLI',
  metrics: [
    { key: 'published',   label: 'Published',   max: 5,  color: 'var(--node-default)' },
    { key: 'delivered',   label: 'Delivered',   max: 15, color: 'var(--pod-running)' },
    { key: 'subscribers', label: 'Subscribers', max: 5,  color: 'var(--node-comparing)' },
  ],
};

import { snap, svc, pkt } from './shared';

function buildLambdaSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('client',   'Client',        'client',   60,  180),
      svc('apigw',    'API Gateway',   'apigw',    220, 180),
      svc('lambda',   'Lambda fn',     'lambda',   400, 180, { instances: 0, cold: true }),
      svc('dynamo',   'DynamoDB',      'db',        560, 180),
    ],
    edges: [
      { from: 'client', to: 'apigw' },
      { from: 'apigw',  to: 'lambda' },
      { from: 'lambda', to: 'dynamo' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, coldStarts: 0, warmServed: 0, p99ms: 0 },
    lambdaContainers: [],
    activeEdge: null,
  };

  snap(steps, s, 'Lambda: serverless function. No servers to manage. Pay per 100ms.', 1);

  // Cold start
  s.nodes[0].state = 'active';
  s.packets = [pkt('client', 'apigw', 'POST /orders')];
  s.events.push({ type: 'info', msg: 'Client → API Gateway: POST /orders' });
  snap(steps, s, 'Client calls API. API Gateway receives, authorizes, routes to Lambda.', 2);

  s.packets = [pkt('apigw', 'lambda', 'invoke', 'request')];
  s.nodes[2].state = 'cold';
  s.events.push({ type: 'warn', msg: '❄️ COLD START: Lambda container not running. Provisioning...' });
  s.metrics.coldStarts = 1;
  snap(steps, s, '❄️ Cold start! No warm container. Lambda: download code → init runtime → init handler.', 3);

  s.nodes[2].state = 'active';
  s.nodes[2].cold = false;
  s.nodes[2].instances = 1;
  s.lambdaContainers = [{ id: 'c1', warm: true, age: 0 }];
  s.packets = [pkt('lambda', 'dynamo', 'PutItem', 'request')];
  s.metrics.requests = 1; s.metrics.p99ms = 850;
  s.events.push({ type: 'ok', msg: 'Container ready (850ms). Handler executes. DynamoDB call.' });
  snap(steps, s, 'Container provisioned (850ms cold start). Executes, queries DynamoDB.', 4);

  s.packets = [pkt('lambda', 'client', '201 Created', 'response')];
  s.events.push({ type: 'ok', msg: 'Response returned. Container stays warm 5-15min.' });
  snap(steps, s, 'Response sent. Container stays warm. Next call reuses it — no cold start.', 5);

  // Warm start
  s.nodes[0].state = 'active';
  s.packets = [pkt('apigw', 'lambda', 'invoke', 'request')];
  s.events.push({ type: 'ok', msg: '♨️ WARM: reusing container. No init overhead.' });
  s.metrics.requests = 2; s.metrics.warmServed = 1; s.metrics.p99ms = 12;
  snap(steps, s, '♨️ Warm start: 12ms. Container reused. Lambda freezes between invocations.', 6);

  // Concurrency — multiple invocations
  s.lambdaContainers = [
    { id: 'c1', warm: true, age: 30 },
    { id: 'c2', warm: false, age: 0 },
    { id: 'c3', warm: false, age: 0 },
  ];
  s.nodes[2].instances = 3;
  s.metrics.requests = 5; s.metrics.coldStarts = 3;
  s.events.push({ type: 'info', msg: '5 concurrent requests → 3 containers spin up (1 per invocation)' });
  snap(steps, s, '5 concurrent requests: Lambda scales to 5 instances automatically. 1 container per invoke.', 7);

  return steps;
}

const CODE = [
  '# Lambda function config',
  'Runtime: nodejs20.x',
  'Memory: 512MB',
  'Timeout: 30s',
  '# Cold start mitigation:',
  'ProvisionedConcurrency: 5',
  '# Triggers: API GW, SQS, S3',
  '# Pricing: $0.0000166667/GB-s',
  '# Free tier: 1M requests/month',
];

export default {
  id: 'lambda',
  label: 'Lambda',
  icon: '⚡',
  build: buildLambdaSteps,
  code: CODE,
  language: 'YAML/CLI',
  metrics: [
    { key: 'requests',   label: 'Requests',    max: 5,    color: 'var(--node-default)' },
    { key: 'coldStarts', label: 'Cold Starts', max: 5,    color: 'var(--pod-crash)', warn: 20, critical: 40 },
    { key: 'p99ms',      label: 'P99 (ms)',    max: 1000, unit: 'ms', color: 'var(--node-comparing)' },
  ],
};

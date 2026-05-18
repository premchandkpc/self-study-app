export function buildAWSSteps(scenario = 'lambda') {
  if (scenario === 'lambda')  return buildLambdaSteps();
  if (scenario === 'sqs')     return buildSQSSteps();
  if (scenario === 'apigw')   return buildAPIGWSteps();
  if (scenario === 'eks')     return buildEKSSteps();
  return buildLambdaSteps();
}

function snap(steps, state, narration, codeLine = null) {
  steps.push({ ...JSON.parse(JSON.stringify(state)), narration, codeLine, complexity: { ops: steps.length + 1, label: 'managed', space: 'O(1) infra' } });
}

const svc  = (id, label, type, x, y, extra = {}) => ({ id, label, type, x, y, state: 'idle', ...extra });
const pkt  = (from, to, label, type = 'request') => ({ from, to, label, type, id: `${from}-${to}-${Math.random().toString(36).slice(2,5)}` });

/* ── SCENARIO 1: Lambda Cold/Warm Start ── */
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

/* ── SCENARIO 2: SQS Queue ── */
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

/* ── SCENARIO 3: API Gateway ── */
function buildAPIGWSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('mobile',  'Mobile App',    'client',   60,  100),
      svc('browser', 'Browser',       'client',   60,  260),
      svc('apigw',   'API Gateway',   'apigw',    240, 180, { rps: 0, throttle: 1000 }),
      svc('auth',    'Cognito Auth',  'auth',     400, 80),
      svc('lambda1', 'Lambda\n/users','lambda',   400, 200),
      svc('lambda2', 'Lambda\n/orders','lambda',  400, 300),
    ],
    edges: [
      { from: 'mobile',  to: 'apigw' },
      { from: 'browser', to: 'apigw' },
      { from: 'apigw',   to: 'auth' },
      { from: 'apigw',   to: 'lambda1' },
      { from: 'apigw',   to: 'lambda2' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, throttled: 0, auth: 0, p50ms: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'API Gateway: managed entry point. Auth, routing, throttling, SSL, CORS.', 1);

  // Incoming request
  s.nodes[0].state = 'active';
  s.packets = [pkt('mobile', 'apigw', 'GET /users JWT', 'request')];
  s.metrics.requests = 1;
  s.events.push({ type: 'info', msg: 'Mobile: GET /users with JWT Bearer token' });
  snap(steps, s, 'Request hits API Gateway. SSL terminated. JWT extracted for auth.', 2);

  // Cognito auth
  s.packets = [pkt('apigw', 'auth', 'verify JWT', 'request')];
  s.nodes[3].state = 'active';
  s.metrics.auth = 1;
  s.events.push({ type: 'info', msg: 'API GW → Cognito: verify JWT signature + claims' });
  snap(steps, s, 'API Gateway calls Cognito authorizer. Verifies JWT. Attaches user context.', 3);

  s.packets = [pkt('apigw', 'lambda1', 'GET /users {userId}', 'request')];
  s.nodes[4].state = 'active';
  s.events.push({ type: 'ok', msg: 'Auth OK → route to Lambda /users handler' });
  snap(steps, s, 'Auth passes. API Gateway routes GET /users to Lambda based on path mapping.', 4);

  s.packets = [pkt('lambda1', 'mobile', '200 [{users}]', 'response')];
  s.metrics.p50ms = 45;
  s.events.push({ type: 'ok', msg: 'Lambda responds 200 OK (45ms total)' });
  snap(steps, s, 'Lambda returns users. API Gateway adds CORS headers, forwards 200 to client.', 5);

  // Throttling
  s.nodes[2].rps = 1001;
  s.packets = [pkt('mobile', 'apigw', '1001 req/s', 'request')];
  s.events.push({ type: 'warn', msg: 'Rate limit exceeded (1000 rps). API GW returns 429.' });
  s.metrics.requests = 5; s.metrics.throttled = 1;
  snap(steps, s, 'Traffic spike: 1001 req/s. Exceeds throttle limit (1000/s). API GW returns 429 Too Many Requests.', 6);

  // Browser CORS
  s.nodes[1].state = 'active';
  s.nodes[2].rps = 50;
  s.packets = [pkt('browser', 'apigw', 'OPTIONS /orders (CORS preflight)', 'request')];
  s.events.push({ type: 'info', msg: 'Browser CORS preflight: OPTIONS → API GW handles automatically' });
  snap(steps, s, 'Browser sends CORS preflight. API Gateway returns Access-Control headers. No Lambda invoked.', 7);

  return steps;
}

/* ── SCENARIO 4: EKS (Kubernetes on AWS) ── */
function buildEKSSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('alb',    'ALB\n(Load Balancer)', 'apigw',  60,  180),
      svc('eks',    'EKS Control Plane',    'server',  240, 180, { nodes: 0, pods: 0 }),
      svc('ng1',    'Node Group 1\n(t3.xl)', 'server', 440, 100, { nodes: 2, cpu: 20 }),
      svc('ng2',    'Node Group 2\n(t3.2xl)','server', 440, 260, { nodes: 1, cpu: 10 }),
      svc('ecr',    'ECR Registry',          'db',      620, 180),
    ],
    edges: [
      { from: 'alb',  to: 'eks' },
      { from: 'eks',  to: 'ng1' },
      { from: 'eks',  to: 'ng2' },
      { from: 'eks',  to: 'ecr' },
    ],
    packets: [],
    events: [],
    metrics: { nodes: 3, pods: 0, cpu: 15, cost: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'EKS: managed Kubernetes. AWS manages control plane. You manage worker nodes.', 1);

  s.events.push({ type: 'info', msg: 'kubectl apply -f deployment.yaml' });
  s.packets = [pkt('eks', 'ecr', 'pull app:v1.2', 'request')];
  s.nodes[2].pods = 2;
  s.metrics.pods = 2;
  s.events.push({ type: 'ok', msg: 'Pods scheduled on NodeGroup1 (more free resources)' });
  snap(steps, s, 'Deploy: EKS scheduler pulls image from ECR, places 2 pods on NodeGroup1.', 3);

  // ALB Ingress
  s.packets = [pkt('alb', 'eks', 'ingress route', 'request')];
  s.nodes[0].state = 'active';
  s.events.push({ type: 'ok', msg: 'AWS ALB Ingress Controller: ALB created, routes to pods via NodePort' });
  snap(steps, s, 'ALB Ingress Controller provisions AWS Application Load Balancer. External traffic routed.', 5);

  // Cluster Autoscaler
  s.nodes[2].cpu = 85;
  s.metrics.cpu = 85;
  s.events.push({ type: 'warn', msg: 'CPU 85% on NodeGroup1 → Cluster Autoscaler triggers EC2 scale-out' });
  snap(steps, s, 'CPU 85%. Cluster Autoscaler requests new EC2 from Auto Scaling Group. ~2min to join.', 6);

  s.nodes[2].nodes = 3;
  s.nodes[2].cpu = 42;
  s.metrics.nodes = 4; s.metrics.cpu = 42; s.metrics.cost = 3;
  s.events.push({ type: 'ok', msg: 'New node joined. Pods rescheduled. CPU normalized.' });
  snap(steps, s, 'New EC2 node joined EKS. Pending pods scheduled. Load distributed. Cost: +$3/hr.', 7);

  // Fargate option
  s.events.push({ type: 'info', msg: 'Fargate profile: run pods serverless — no EC2 management' });
  snap(steps, s, 'EKS Fargate: run pods without managing EC2 nodes. AWS provisions microVM per pod. Pay per vCPU+mem.', 8);

  return steps;
}

export const AWS_CODE = {
  lambda: [
    '# Lambda function config',
    'Runtime: nodejs20.x',
    'Memory: 512MB',
    'Timeout: 30s',
    '# Cold start mitigation:',
    'ProvisionedConcurrency: 5',
    '# Triggers: API GW, SQS, S3',
    '# Pricing: $0.0000166667/GB-s',
    '# Free tier: 1M requests/month',
  ],
  sqs: [
    '# SQS queue settings',
    'VisibilityTimeout: 30s',
    'MessageRetentionPeriod: 4days',
    'MaxReceiveCount: 3 → DLQ',
    '# Standard vs FIFO',
    'Standard: at-least-once, unordered',
    'FIFO: exactly-once, ordered',
    '# Long polling: WaitTimeSeconds=20',
    '# Reduce empty receives + cost',
  ],
  apigw: [
    '# API Gateway throttling',
    'DefaultRouteThrottling:',
    '  BurstLimit: 5000',
    '  RateLimit: 1000 (req/s)',
    '# Authorizers:',
    'JWT: Cognito / custom Lambda',
    '# Integrations:',
    'Lambda, HTTP, AWS_PROXY',
    '# Stage: dev → staging → prod',
  ],
  eks: [
    '# EKS cluster creation',
    'eksctl create cluster \\',
    '  --name prod \\',
    '  --nodegroup-name ng-1 \\',
    '  --nodes 3 --nodes-min 1 \\',
    '  --nodes-max 10',
    '# Fargate profile',
    'eksctl create fargateprofile \\',
    '  --cluster prod --name fp-default',
  ],
};

import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildLambdaSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('client',  'Client App',    'client',  30, 170, { desc: 'Mobile app or web browser making HTTPS calls. No AWS SDK needed — just HTTP.' }),
      svc('apigw',   'API Gateway',   'apigw',  180, 170, { desc: 'Managed API front door. Terminates SSL (TLS 1.3), validates JWT, routes to Lambda. Handles CORS, throttling, request validation.', throttle: '1000/s', stage: 'prod' }),
      svc('lambda',  'Lambda Function', 'lambda', 350, 170, { instances: 0, cold: true, timeout: 30, mem: 512, desc: 'Serverless function. Node.js 20.x runtime. 512MB RAM, 30s timeout. Ephemeral storage: 512MB. AWS manages scaling, patching, availability.', runtime: 'nodejs20.x', arch: 'x86_64' }),
      svc('dynamo',  'DynamoDB Table', 'db',    510, 170, { desc: 'NoSQL key-value + document DB. Single-digit millisecond latency at any scale. Auto-scales throughput. Pay per read/write request unit.', table: 'orders', region: 'us-east-1' }),
      svc('cwlogs',  'CloudWatch Logs', 'server', 510, 70, { desc: 'Centralized log storage. Auto-captures all console.log() from Lambda. No agent needed. Retention: configurable (default indefinite). Log stream per container instance.', retention: 'indefinite' }),
      svc('cf',      'CloudFront CDN',  'apigw', 510, 270, { desc: 'Content delivery network at 450+ edge locations. Lambda@Edge runs at edge for low-latency transforms. Cache static content, rewrite URLs, add security headers.', pops: 450 }),
      svc('rdsproxy','RDS Proxy',      'db',    670, 270, { desc: 'Managed connection pool for RDS/Aurora. Lambda creates many connections quickly → proxy pools them. No more "too many connections" errors. IAM auth + VPC.', engine: 'Aurora MySQL' }),
    ],
    edges: [
      { from: 'client', to: 'apigw' },
      { from: 'apigw',  to: 'lambda' },
      { from: 'lambda', to: 'dynamo' },
      { from: 'lambda', to: 'cwlogs' },
      { from: 'cf',     to: 'lambda' },
      { from: 'lambda', to: 'rdsproxy' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, coldStarts: 0, warmServed: 0, p99ms: 0, errors: 0 },
    lambdaContainers: [],
    activeEdge: null,
  };

  snap(steps, s, 'Lambda = serverless function. No servers to manage, no OS patching, no idle cost. Pay only for compute time (per 1ms). AWS manages runtime, scaling, availability.', 1);

  s.nodes[0].state = 'active';
  s.packets = [pkt('client', 'apigw', 'POST /orders JWT')];
  s.events.push({ type: 'info', msg: 'Client → API Gateway: POST /orders with JWT. SSL terminated at edge.' });
  snap(steps, s, 'Client sends POST to API Gateway. Gateway terminates SSL, extracts JWT, validates request body (JSON schema), adds CORS headers. Acts as bouncer — only valid requests reach Lambda.', 2);

  s.packets = [pkt('apigw', 'lambda', 'invoke', 'request')];
  s.nodes[2].state = 'pending';
  s.nodes[2].cold = true;
  s.events.push({ type: 'warn', msg: '❄️ COLD START: no warm Lambda container. AWS must spin up a new one.' });
  snap(steps, s, 'Cold start: AWS downloads your code from S3 (~50-200ms), starts a new micro-container (sandbox), initializes the Node.js/Python/Java runtime, calls your handler code outside the main function. Only the init code runs once — subsequent calls in same container skip this.', 3);

  s.nodes[2].state = 'active';
  s.nodes[2].cold = false;
  s.nodes[2].instances = 1;
  s.lambdaContainers = [{ id: 'c1', warm: true, age: 0 }];
  s.packets = [pkt('lambda', 'dynamo', 'PutItem', 'request')];
  s.metrics.requests = 1; s.metrics.coldStarts = 1; s.metrics.p99ms = 850;
  s.events.push({ type: 'ok', msg: 'Container ready (850ms). Handler runs. DynamoDB PutItem: 20ms.' });
  snap(steps, s, 'Container provisioned (850ms = cold start). Handler function runs: connects to DynamoDB (reuses TCP pool after warm), inserts order row (20ms). Cold start is the main Lambda performance concern — 850ms vs 12ms warm is 70x slower!', 4);

  s.packets = [pkt('lambda', 'cwlogs', '{"order":42}', 'request')];
  s.events.push({ type: 'ok', msg: 'Console.log → CloudWatch Logs. Auto-collected without agents.' });
  snap(steps, s, 'Every console.log() goes to CloudWatch Logs automatically. No agent, no setup. Log group = /aws/lambda/functionName. Log stream = container instance ID. Each invocation has a unique request ID for correlation. Logs persist indefinitely (configurable retention).', 5);

  s.packets = [pkt('lambda', 'client', '201 Created: {"orderId":42}', 'response')];
  s.events.push({ type: 'ok', msg: 'Response sent. Container stays alive ~5-15min for next call.' });
  snap(steps, s, 'API Gateway returns 201 to client. Lambda container stays warm: AWS freezes it after response (not killed). Next request to same function reuses this container — zero cold start. But if no requests come for ~5-15min, AWS reclaims it. This is why "warmup pings" exist.', 6);

  s.packets = [pkt('apigw', 'lambda', 'invoke', 'request')];
  s.events.push({ type: 'ok', msg: '♨️ WARM: same container reused. Handler invoked directly — no init.' });
  s.metrics.requests = 2; s.metrics.warmServed = 1; s.metrics.p99ms = 12;
  snap(steps, s, 'Warm start: 12ms vs 850ms — 70x faster! AWS keeps the container frozen between calls. On next invoke: just runs your handler function. No runtime init, no code download. Same TCP connections to DynamoDB reused. This is the Lambda ideal state.', 7);

  s.packets = [];
  s.lambdaContainers = [
    { id: 'c1', warm: true, age: 60 },
    { id: 'c2', warm: false, age: 0 },
    { id: 'c3', warm: false, age: 0 },
    { id: 'c4', warm: false, age: 0 },
    { id: 'c5', warm: false, age: 0 },
  ];
  s.nodes[2].instances = 5;
  s.metrics.requests = 7; s.metrics.coldStarts = 4;
  s.events.push({ type: 'info', msg: '5 concurrent requests → 4 new containers (1 warm reused, 4 cold starts)' });
  snap(steps, s, 'Lambda scales by creating 1 container per concurrent request. 5 concurrent invocations: 1 gets existing warm container, 4 get cold starts. This is called "concurrency scaling". No config needed — Lambda scales automatically, but there is a regional concurrency limit (1000 by default).', 8);

  s.events.push({ type: 'ok', msg: '🔥 Provisioned Concurrency: pre-warm 3 containers → zero cold starts forever. Extra cost: same as running them.' });
  snap(steps, s, 'Provisioned Concurrency: keep N containers always warm. Zero cold starts, always. Use for: latency-sensitive apps (API endpoints, user-facing). Price: you pay for warm containers even when idle. Trade-off: cold start elimination vs extra cost. Pro tip: combine with Application Auto Scaling for schedule-based warm count.', 9);

  s.nodes[5].state = 'active';
  s.events.push({ type: 'info', msg: 'Lambda@Edge: function runs at CloudFront edge (450+ PoPs). ~5ms latency.' });
  snap(steps, s, 'Lambda@Edge: run code at CloudFront edge locations. Use cases: rewrite URLs based on device type, add security headers, A/B test redirects, JWT validation before origin request. 4 trigger points: viewer-request, viewer-response, origin-request, origin-response. Runs in us-east-1 but executes close to user geographically.', 10);

  s.nodes[3].state = 'error';
  s.events.push({ type: 'error', msg: 'Error: DynamoDB throttle (WCU exceeded). Lambda auto-retries 2x, then returns 500.' });
  s.metrics.errors = 1;
  snap(steps, s, 'Lambda error handling: if your code throws or times out (timeout: configurable 1s-900s), API Gateway returns 500. Lambda automatically retries async invocations (S3, SQS triggers) 2 times. For sync (API GW): retry at client. Dead Letter Queue: configure SQS/SNS destination for failed async events.', 11);

  s.nodes[3].state = 'active';
  s.nodes[2].mem = 1024;
  s.events.push({ type: 'info', msg: 'Memory: 512MB → 1024MB (2x CPU + 2x cost). Max: 10,240MB. Ephemeral storage: 512MB→10GB.' });
  snap(steps, s, 'Lambda resources: memory 128MB-10,240MB (CPU scales proportionally — more memory = more CPU). Ephemeral storage /tmp: 512MB default, up to 10GB. VPC Lambda: needs ENI in your VPC (adds ~10s cold start). Environment variables: up to 4KB. Layers: shared dependencies (zip) up to 250MB unzipped.', 12);

  s.nodes[6].state = 'active';
  s.packets = [pkt('lambda', 'rdsproxy', 'query via pool', 'request')];
  s.events.push({ type: 'ok', msg: 'RDS Proxy: Lambda connects to proxy → proxy maintains persistent DB connections. Prevents connection storms. Requires VPC.' });
  snap(steps, s, 'RDS Proxy: Lambda creates a new DB connection per invoke → easily exhausts RDS connection pool (esp. with concurrency). RDS Proxy sits between Lambda and RDS/Aurora. It maintains a warm connection pool. Lambda connects to proxy via IAM auth (no DB password in code!). Proxy queues and multiplexes connections. Supports MySQL and PostgreSQL. Must deploy Lambda in VPC + proxy in same VPC.', 13);

  s.packets = [];
  s.events.push({ type: 'info', msg: 'Lambda Function URL: https://xxxxx.lambda-url.us-east-1.on.aws/ — direct HTTPS endpoint, no API Gateway needed. Auth: IAM or NONE.' });
  snap(steps, s, 'Lambda Function URL: public HTTPS endpoint for Lambda without API Gateway. Create from Lambda console → URL config. Supports IAM auth (caller must sign) or NONE (public — use with caution). CORS configurable. Invoke mode: BUFFERED (wait for response) or RESPONSE_STREAM (stream response chunks back). Use for: simple webhooks, internal microservices, prototype APIs. When to NOT use: need throttling, WAF, custom domain, usage plans — use API Gateway instead.', 14);

  s.events.push({ type: 'warn', msg: 'Reserved Concurrency: set to 5. Regional burst concurrency: 500-3000 (varies by region). No other functions can use this capacity.' });
  snap(steps, s, 'Reserved Concurrency: guarantee N concurrent executions for a function. Other functions CANNOT use this capacity. Prevents noisy neighbors. Also sets a hard limit — function never scales beyond N. Without reserved concurrency: Lambda scales unlimited (up to regional burst). With reserved = 5: only 5 concurrent invocations, extra requests get throttled (429). Use reserved concurrency for: critical path functions, to limit downstream DB pressure, control max cost.', 15);

  s.events.push({ type: 'ok', msg: 'SnapStart (Java only): snapshot at init complete → restore from snapshot on cold start. ~850ms → ~100ms. Cache warmed JVM.' });
  snap(steps, s, 'Lambda SnapStart (Java 11+): takes a snapshot of the microVM after initialization (after Init code, before handler). On cold start: restores from snapshot instead of re-running init. Cold start drops from ~850ms to ~100ms for Java. Works by: Lambda caches the fired-initialized VM, on next start it restores from cache. Limitations: no random number seeds at init, no unique IDs generated at init. Use RANDOM or SecureRandom at handler (not init) to avoid duplicates. Also works with .NET (startup improvement).', 16);

  s.result = 'Lambda: cold (~850ms) vs warm (~12ms). Scales 1 container per concurrent request. Pay per ms.';
  snap(steps, s, 'Lambda pricing: $0.0000166667/GB-s (x86) or $0.0000133334/GB-s (arm64/Graviton). Free tier: 1M requests + 400,000 GB-s/month. Use ARM (Graviton) for 20% cost reduction. Always prefer provisioned concurrency for latency-sensitive paths. Use DLQ + dead-letter queue for async failure handling.', 17);

  return steps;
}

const CODE = [
  '# Lambda function config',
  'Runtime: nodejs20.x',
  'Memory: 1024MB',
  'Timeout: 30s',
  'Ephemeral storage: 512MB',
  '# Cold start mitigation',
  'ProvisionedConcurrency: 5',
  '# Triggers: API GW, SQS, S3, SNS',
  '# DLQ: send failed async invocations',
  'DeadLetterConfig:',
  '  TargetArn: arn:aws:sqs:.../dlq',
  '# Function URL (no API GW)',
  'aws lambda create-function-url-config',
  '  --function-name my-fn --auth-type IAM',
  '# RDS Proxy',
  'aws rds create-db-proxy --engine-family MYSQL',
  '# SnapStart (Java)',
  'aws lambda update-function-configuration',
  '  --function-name my-fn',
  '  --snap-start ApplyOn=PublishedVersions',
  '# Pricing',
  'x86: $0.0000166667/GB-s',
  'arm64: $0.0000133334/GB-s (20% less)',
  '# Free tier: 1M req + 400K GB-s/month',
];

export default {
  id: 'lambda',
  label: 'Lambda',
  icon: '⚡',
  build: buildLambdaSteps,
  code: CODE,
  language: 'YAML/CLI',
  metrics: [
    { key: 'requests',   label: 'Requests',     max: 10,   color: 'var(--node-default)' },
    { key: 'coldStarts', label: 'Cold Starts',  max: 10,   color: 'var(--pod-crash)', warn: 20, critical: 40 },
    { key: 'warmServed', label: 'Warm Served',  max: 5,    color: 'var(--pod-running)' },
    { key: 'p99ms',      label: 'P99 (ms)',     max: 1000, unit: 'ms', color: 'var(--node-comparing)' },
    { key: 'errors',     label: 'Errors',       max: 5,    color: 'var(--pod-error)' },
  ],
  topicContent: {
    concept: [
      { title: 'Cold Starts', content: 'AWS downloads code, initializes runtime, and runs init code before handler. Cold start adds 200ms-1s latency. Warm containers skip init and respond in ~10ms.' },
      { title: 'Concurrency Model', content: 'Lambda creates one container per concurrent request. Scale automatically but regional concurrency limit (1000 default). Reserved concurrency guarantees capacity. Provisioned concurrency eliminates cold starts.' },
    ],
    why: ['Lambda enables true pay-per-use compute — no idle cost, automatic scaling, zero server management. It is the cornerstone of serverless architectures on AWS.'],
    interview: [
      { question: 'How do you mitigate Lambda cold starts?', answer: 'Provisioned Concurrency keeps N containers always warm. Choosing ARM/Graviton reduces init time. Keeping dependencies small and using SnapStart (Java) helps. VPC Lambda adds ~10s to cold starts — use RDS Proxy.', followUps: ['What is SnapStart and when is it available?', 'How does VPC affect Lambda cold starts?'] },
      { question: 'How does Lambda handle concurrent invocations?', answer: 'Lambda creates one container per concurrent request. If all containers are busy, new requests are throttled (429). Regional burst concurrency varies (500-3000). Reserved concurrency limits a function and guarantees capacity.', followUps: ['What is the difference between reserved and provisioned concurrency?', 'How does Lambda scale for SQS triggers?'] },
    ],
    gotcha: ['Lambda in a VPC requires an ENI in each subnet, adding ~10s to cold starts and requiring NAT gateway for internet access — significant cost and latency overhead.', 'Lambda timeouts (max 15 minutes) and /tmp storage (512MB default, 10GB max) are hard limits — long-running processes or large file processing may need ECS/Fargate instead.'],
    tradeoffs: [
      { pro: 'Zero infrastructure management — no patching, no scaling config, no capacity planning. Pay only for compute time consumed.', con: 'Cold starts impact latency-sensitive applications. VPC Lambda cold starts are particularly slow (~10s). Some workloads need predictable, always-on compute.' },
      { pro: 'Automatic scaling from 0 to thousands of concurrent executions based on demand.', con: 'Hard limits on execution duration (15min), memory (10GB), and payload size (6MB for sync, 256KB for async).' },
    ],
  },
};

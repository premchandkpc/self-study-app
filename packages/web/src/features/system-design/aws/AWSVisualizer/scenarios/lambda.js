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
      { title: 'Cold Starts — the #1 Lambda performance consideration', content: 'A cold start occurs when Lambda receives an invocation but no warm container is available. AWS must download the deployment package from S3, start a new microVM sandbox, initialize the runtime (Node.js, Python, Java, etc.), and execute any initialization code outside the handler function. This adds 200ms to 1 second of latency depending on runtime, package size, and memory allocation. Java and .NET are slowest (500ms-1s), Python and Node.js are faster (200-400ms), and Go/ Rust are fastest (sub-100ms). After the response is returned, AWS keeps the container frozen for 5-15 minutes to serve subsequent invocations — these warm invocations complete in approximately 10ms. Provisioned Concurrency keeps a configurable number of containers always warm, eliminating cold starts entirely at the cost of paying for idle capacity.' },
      { title: 'Concurrency Model — how Lambda scales', content: 'Lambda creates one container per concurrent request. When a request arrives and all existing containers are busy processing other requests, Lambda provisions a new container. This automatic scaling continues until the regional concurrency limit (default 1000, can be increased via support request) or function-level reserved concurrency limit is reached. Beyond these limits, requests are throttled with HTTP 429 TooManyRequests. Reserved Concurrency allocates a specific number of concurrent executions to a function — guaranteeing that capacity but also setting a hard ceiling. Provisioned Concurrency pre-warms containers to eliminate cold starts for latency-sensitive functions. Lambda\'s scaling rate depends on the invocation source — synchronous invocations (API Gateway) scale rapidly, while SQS event source mappings scale based on batch window and message backlog.' },
      { title: 'Deep — Lambda execution environment, extensions, and SnapStart', content: 'Lambda execution environments are microVMs (Firecracker) that provide strong isolation between customers. Each environment includes the runtime, function code, ephemeral storage at /tmp (512MB default, configurable up to 10GB), and environment variables (4KB max, encrypted at rest with KMS). Lambda Extensions run alongside the function in the same environment and can integrate with monitoring tools (Datadog, New Relic, Lumigo), secrets managers, and configuration services during function initialization and invocation phases. SnapStart (Java 11+ and .NET) takes a snapshot of the initialized execution environment after the init phase completes — on cold start, it restores from the snapshot instead of re-running init, reducing Java cold start from ~850ms to ~100ms. However, any unique state created during init (random seeds, unique IDs, open connections) is captured in the snapshot and must be regenerated at handler invocation time.' },
    ],
    why: [
      'Lambda enables true pay-per-use compute with no idle cost — you pay only for the compute time consumed per invocation, rounded to the nearest millisecond. This eliminates the cost of over-provisioned servers that sit idle during low-traffic periods and removes the operational burden of OS patching, runtime updates, and capacity planning. Lambda is the cornerstone of serverless architectures on AWS.',
      'Lambda\'s automatic scaling from zero to thousands of concurrent executions based on demand eliminates the need for Auto Scaling Groups, launch templates, and manual capacity management. Applications can handle traffic spikes of 10x or 100x without any scaling configuration — AWS provisions containers automatically within seconds. This enables event-driven architectures where functions respond to S3 uploads, SQS messages, DynamoDB streams, or API Gateway requests without any infrastructure management.',
      'Lambda\'s ecosystem of triggers and destinations enables building fully serverless applications without provisioning any servers. API Gateway triggers Lambda for HTTP APIs, S3 events trigger Lambda for image processing, SQS and DynamoDB Streams trigger Lambda for event-driven processing, and EventBridge schedules Lambda for cron jobs. Lambda Destinations send execution results to SQS, SNS, or another Lambda for asynchronous orchestration. This eliminates the need for message polling, cron servers, or event-processing infrastructure.',
    ],
    interview: [
      { q: 'What are the main strategies for mitigating Lambda cold starts?', a: 'The most effective strategy is Provisioned Concurrency, which keeps a configurable number of containers always warm by pre-initializing them and maintaining them regardless of traffic. You pay for the warm containers even when idle — similar to keeping EC2 instances running. Application Auto Scaling can adjust Provisioned Concurrency on a schedule to match daily traffic patterns. Choosing ARM64/Graviton2 reduces cold start time by approximately 20% compared to x86_64 due to faster init. Minimizing deployment package size is critical — exclude development dependencies from production packages, use AWS Lambda Layers for shared dependencies (extracted from the function package, loaded once), and keep the package under 10MB for optimal cold start. VPC Lambda adds 8-10 seconds to cold start because Lambda must create an Elastic Network Interface in the VPC — use RDS Proxy to reduce VPC Lambda cold start impact or avoid VPC Lambda entirely by using AWS service endpoints for DynamoDB, SQS, and S3. SnapStart for Java 11+ reduces cold start from ~850ms to ~100ms by snapshotting the initialized JVM and restoring on cold start.', followUps: ['What is SnapStart and when is it available?', 'How does VPC affect Lambda cold starts and how can you mitigate it?', 'What is the impact of runtime choice on cold starts?'] },
      { q: 'How does Lambda handle concurrent invocations and what happens when the concurrency limit is reached?', a: 'Lambda automatically scales by creating one container per concurrent request. When a request arrives and no warm containers are available, Lambda provisions a new container (cold start). If the function\'s reserved concurrency limit or the regional account-level limit is reached, Lambda throttles additional requests with an HTTP 429 TooManyRequests error and a Retry-After header. The regional burst concurrency limit varies by region — it starts at 500-3000 and increases over time as you invoke functions. Reserved Concurrency guarantees a specific number of concurrent executions for a function and also prevents other functions from using that capacity — this is essential for critical functions that must always be available. Provisioned Concurrency is different from Reserved Concurrency — Reserved Concurrency limits the maximum concurrent executions, while Provisioned Concurrency pre-warms containers to eliminate cold starts at the configured concurrency level. For SQS triggers, Lambda scales based on the batch window and the number of messages in the queue — the event source mapping polls SQS and processes batches, scaling up to 60 concurrent batches per minute per queue by default. For async invocations (S3, SNS, EventBridge), Lambda queues the events and scales up processing capacity automatically.', followUps: ['What is the difference between Reserved Concurrency and Provisioned Concurrency?', 'How does Lambda scale differently for SQS triggers versus API Gateway triggers?'] },
      { q: 'What are the pros and cons of using Lambda in a VPC versus without a VPC?', a: 'Lambda functions without VPC access can reach any public AWS service endpoint (DynamoDB, SQS, S3, SNS) and the internet directly, with the lowest cold start times (typically 200-400ms for Node.js). They cannot access resources in a VPC — RDS databases, ElastiCache clusters, internal ALBs, or EC2 instances. Lambda in a VPC requires an Elastic Network Interface (ENI) in each configured subnet, which adds approximately 8-10 seconds to the cold start time because Lambda must wait for the ENI creation and attachment. VPC Lambda also requires a NAT Gateway (approximately $32 per month plus data processing charges) to access the internet or public AWS services. The benefits of VPC Lambda include direct access to RDS/Aurora databases without traversing the internet, direct access to ElastiCache for caching, connection to internal load balancers, and meeting security compliance requirements that mandate VPC-based resource access. Best practice is to avoid VPC Lambda unless you need to access VPC-private resources. When VPC Lambda is necessary, use RDS Proxy to reduce connection overhead, configure multiple subnets across AZs for HA, and use VPC Endpoints for S3 and DynamoDB to avoid NAT costs.', followUps: ['How does RDS Proxy help with Lambda and Aurora?', 'What is the cost difference between VPC Lambda and non-VPC Lambda?'] },
    ],
    gotcha: [
      'Lambda in a VPC requires an ENI in each configured subnet, adding approximately 8-10 seconds to cold start time. Additionally, VPC Lambda functions cannot access the internet or public AWS service endpoints without a NAT Gateway ($32/month + data processing). Always use VPC Endpoints for S3 and DynamoDB to avoid NAT costs, and evaluate whether your function truly needs VPC access before configuring it.',
      'Lambda has hard execution limits: 15 minute maximum timeout, 10GB maximum memory (with CPU proportional to memory), 512MB default ephemeral storage /tmp (up to 10GB, but adds cold start delay), 6MB synchronous response payload, and 256KB asynchronous event payload. Workloads exceeding these limits belong on ECS, Fargate, or EC2 — not Lambda.',
      'Reserved Concurrency sets a HARD limit on concurrent executions — if you set reserved concurrency to 5, your function can never scale beyond 5 concurrent invocations. Any additional invocations are throttled with 429 errors. This is useful for protecting downstream resources but can also cause production throttling if set too low. Provisioned Concurrency does not affect the reserved concurrency limit — you need both configured properly.',
      'Lambda function URLs created with auth type NONE are public internet-facing by default — anyone with the URL can invoke your function. This can result in unexpected usage spikes, cost overruns, and security issues if the function processes sensitive data. Always use IAM auth or API Gateway with WAF for production endpoints.',
    ],
    tradeoffs: [
      { pro: 'Zero infrastructure management — no OS patching, no runtime updates, no capacity planning, no instance monitoring. Deploy code and AWS handles everything else. Pay only for compute time consumed with no idle cost.', con: 'Cold starts impact latency-sensitive applications, especially Java and .NET runtimes. VPC Lambda cold starts are particularly slow (8-10 seconds). Workloads requiring predictable sub-millisecond latency or always-on compute may be better suited for containers or EC2 with Provisioned Concurrency adding cost.' },
      { pro: 'Automatic scaling from zero to thousands of concurrent executions based on demand — no Auto Scaling configuration, no launch templates, no scaling policies. Lambda handles traffic spikes of 100x without any operational intervention.', con: 'Hard limits on execution duration (15 minutes), memory (10GB), ephemeral storage (10GB), and payload size (6MB sync, 256KB async) mean Lambda is not suitable for all workloads. Long-running data processing, large file transformations, and streaming workloads may require ECS or EC2.' },
      { pro: 'Serverless application model with triggers from 15+ AWS services enables event-driven architectures without polling, queues, or infrastructure. S3 events, SQS messages, DynamoDB Streams, and API Gateway requests all directly invoke Lambda without intermediate infrastructure.', con: 'Debugging and observability can be challenging — ephemeral containers mean no SSH access, no persistent logs on disk, and no ability to attach a debugger. CloudWatch Logs is the primary debugging interface, and distributed tracing requires X-Ray or third-party tools. The 15-minute timeout and ephemeral storage limit complex debugging sessions.' },
    ],
  },
};

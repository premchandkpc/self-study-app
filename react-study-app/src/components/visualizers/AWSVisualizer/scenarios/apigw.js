import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildAPIGWSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('mobile',  'Mobile App',         'client',  30,  80,  { desc: 'iOS/Android app making HTTPS calls to API endpoints. Uses JWT for auth, gets response with CORS headers.' }),
      svc('browser', 'Browser',            'client',  30,  250, { desc: 'Web app making fetch() / axios calls. Sends CORS preflight (OPTIONS). Expects Access-Control-* headers back.' }),
      svc('apigw',   'API Gateway',        'apigw',   210, 170, { rps: 0, throttle: 1000, stage: 'prod', desc: 'Managed API front door. Terminates SSL/TLS at edge. Handles auth, throttling, routing, request validation, CORS, caching.', type: 'REST', region: 'us-east-1' }),
      svc('auth',    'Cognito Auth',       'auth',    420, 60,  { desc: 'JWT authorizer. Verifies token signature + expiry against Cognito JWKS public keys. Attaches user claims to request context.', provider: 'Cognito User Pools' }),
      svc('lam1',    'Lambda /users',      'lambda',  420, 170, { desc: 'Returns user profile data. Receives auth context (userId, role) from API GW. Reads from DynamoDB or RDS.', runtime: 'nodejs20.x' }),
      svc('lam2',    'Lambda /orders',     'lambda',  420, 280, { desc: 'Order management handler. Validates request body, inserts to DynamoDB, publishes SNS event.', runtime: 'nodejs20.x' }),
      svc('waf',     'AWS WAF',            'server',  420, 400, { desc: 'Web Application Firewall. Rules: SQL injection, XSS, IP rate limiting, geo-blocking, OWASP top 10 managed rules. Evaluated BEFORE API Gateway.', rules: 'SQLi + XSS + IP rate' }),
      svc('nlb',     'VPC Link\n(NLB)',    'apigw',   600, 280, { desc: 'Private integration with internal ALB/NLB in VPC. API Gateway calls private resources without internet. Uses PrivateLink.', target: 'internal-service:8080' }),
    ],
    edges: [
      { from: 'mobile',  to: 'apigw' }, { from: 'browser', to: 'apigw' },
      { from: 'apigw',   to: 'auth' }, { from: 'apigw',   to: 'lam1' }, { from: 'apigw',   to: 'lam2' },
      { from: 'waf',     to: 'apigw' }, { from: 'apigw',   to: 'nlb' },
    ],
    packets: [], events: [],
    metrics: { requests: 0, throttled: 0, auth: 0, latency: 0, wafBlocked: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'API Gateway = managed API front door. Handles SSL, auth, throttling, routing, CORS, request validation. Think of it as a smart reverse proxy in front of your backend. Two types: REST (full-featured) and HTTP (cheaper, simpler).', 1);

  s.nodes[0].state = 'active'; s.packets = [pkt('mobile', 'apigw', 'GET /users Authorization: Bearer <JWT>', 'request')];
  s.metrics.requests = 1;
  s.events.push({ type: 'info', msg: 'Mobile: GET /users with JWT. API Gateway terminates SSL (TLS 1.3). Extracts Authorization header.' });
  snap(steps, s, 'Request arrives at API Gateway endpoint. SSL/TLS terminated at the AWS edge (CloudFront integration). Gateway parses: HTTP method (GET), path (/users), headers (Authorization), query params, body. You define the API schema in OpenAPI (Swagger) or CDK/Terraform. Gateway validates request against schema automatically before routing.', 2);

  s.packets = [pkt('apigw', 'auth', 'verify JWT (Cognito)', 'request')];
  s.nodes[3].state = 'active'; s.metrics.auth = 1;
  s.events.push({ type: 'info', msg: 'API GW → Cognito User Pools: verify JWT signature, check expiry, extract claims (userId, role).' });
  snap(steps, s, 'Cognito JWT authorizer: API Gateway decodes the JWT, verifies signature against Cognito JWKS (public keys). Checks: token expiry (exp claim), issuer (iss), audience (aud). On success → attaches user claims to request context (available in Lambda as event.requestContext.authorizer.claims). Alternative: Lambda authorizer for custom auth logic (e.g., custom JWT, OAuth, API keys).', 3);

  s.packets = [pkt('apigw', 'lam1', 'GET /users (userId=alice)', 'request')];
  s.nodes[4].state = 'active';
  s.events.push({ type: 'ok', msg: 'Auth OK → route to Lambda /users. Path param: {proxy+}. Request transformed (mapping template).' });
  snap(steps, s, 'Auth passes → API Gateway routes request to Lambda. Route selection matches: method (GET) + path pattern (/users/{proxy+}). Route settings: enable CORS (Access-Control headers), request validation (required params/body schema), mapping templates (transform request before Lambda). Integration types: AWS_PROXY (Lambda gets raw request) vs AWS (Lambda gets transformed request).', 4);

  s.packets = [pkt('lam1', 'mobile', '200 OK (users list)', 'response')];
  s.metrics.latency = 42;
  s.events.push({ type: 'ok', msg: 'Lambda returns users. API Gateway adds CORS headers + caching headers. Total 42ms.' });
  snap(steps, s, 'Lambda responds 200 OK. API Gateway adds: CORS headers (Access-Control-Allow-Origin: *), cache headers (Cache-Control), security headers (X-Content-Type-Options: nosniff). Response caching: enable per-stage, TTL configurable (default 300s). Cache hit = no Lambda invocation. Response transformation: mapping templates can modify response shape.', 5);

  s.nodes[2].rps = 1001; s.packets = [pkt('mobile', 'apigw', '1001 req/s (burst)', 'request')];
  s.events.push({ type: 'warn', msg: '🚨 Rate limit: 1000 req/s. You sent 1001. API GW returns 429 Too Many Requests.' });
  s.metrics.requests = 2; s.metrics.throttled = 1;
  snap(steps, s, 'Traffic exceeds throttle (burst 5000, rate 1000/s). API Gateway returns 429 with Retry-After header. Throttling protects backend from overload. Two levels: 1) Route-level (burst + rate per route), 2) Account-level (region-wide per account). If account limit hit → 429 with "LimitExceededException". Request is NOT sent to Lambda — protected. Configure usage plans with API keys for per-client throttling.', 6);

  s.nodes[2].rps = 50; s.nodes[1].state = 'active';
  s.packets = [pkt('browser', 'apigw', 'OPTIONS /orders (CORS preflight)', 'request')];
  s.events.push({ type: 'info', msg: 'Browser CORS preflight: OPTIONS request. API GW handles automatically (no Lambda invoked).' });
  snap(steps, s, 'Browser sends OPTIONS (CORS preflight). API Gateway intercepts at edge — returns Access-Control headers immediately. NO Lambda invoked for OPTIONS. Saves compute cost + latency. Configure: allowed origins (specific domain or *), allowed methods (GET,POST), allowed headers (Content-Type, Authorization), max age (how long browser caches preflight result).', 7);

  s.nodes[2].stage = 'dev';
  s.events.push({ type: 'info', msg: 'Canary deployment: 90% traffic → prod stage, 10% → canary stage. Monitor errors. Auto-promote if OK.' });
  snap(steps, s, 'Stages + Canary: each deployment goes to a stage (dev, staging, prod). Canary: deploy new version to "prod" stage, route % of traffic to it. Monitor errors → if OK, promote to 100%. If NOT OK, rollback. Stage variables: environment-specific settings (Lambda alias, DB table name). Custom domain per stage: api.dev.myapp.com, api.myapp.com with SSL cert from ACM (AWS Certificate Manager).', 8);

  s.events.push({ type: 'warn', msg: 'WAF: SQL injection attempt detected in query params. Rule "SQLi_MatchingStatement" → BLOCKED (403).' });
  s.nodes[6].state = 'active'; s.metrics.wafBlocked = 1;
  snap(steps, s, 'AWS WAF integrated with API Gateway. Rules: SQL injection prevention, cross-site scripting (XSS), IP rate limiting, geo-blocking, managed rule sets (OWASP top 10). WAF evaluates rules BEFORE request reaches API Gateway. Blocked requests never hit Lambda — saves cost and protects backend. WAF logs to Kinesis Firehose for analysis.', 9);

  s.nodes[7].state = 'active';
  s.packets = [pkt('apigw', 'nlb', 'VPC Link → internal ALB → ECS service', 'request')];
  s.events.push({ type: 'info', msg: 'VPC Link: API Gateway → PrivateLink → NLB in VPC → internal service. No internet exposure!' });
  snap(steps, s, 'VPC Link (Private Integration): connect API Gateway to resources INSIDE your VPC (NLB/ALB) without internet. Use for: internal microservices running on ECS/EKS/EC2 that should NOT be internet-accessible. How: 1) Create NLB pointing to internal service, 2) Create VPC Link, 3) Configure API Gateway integration to VPC Link + NLB endpoint. Traffic stays within AWS network — never traverses internet.', 10);

  s.events.push({ type: 'ok', msg: 'WebSocket API: wss://api.myapp.com. Bidirectional real-time comms. $connect/$disconnect/$default routes.' });
  snap(steps, s, 'WebSocket API in API Gateway: maintains persistent connection between client and server. Use for: real-time chat, live notifications, game state sync, collaborative editing. Routes: $connect (on open), $disconnect (on close), $default (any other message), custom routes. Connection ID stored in DynamoDB for targeted messaging. API Gateway manages connection lifecycle. PostToConnection API sends messages to specific clients.', 11);

  s.events.push({ type: 'ok', msg: 'Mutual TLS (mTLS): API Gateway verifies client certificate against a trusted CA. Used for IoT device auth, B2B API security.' });
  snap(steps, s, 'Mutual TLS (mTLS): both client AND server present certificates. API Gateway verifies client cert against a configured CA (Certificate Authority). Use for: IoT device authentication (each device has unique cert), B2B integrations (partner API calls), regulatory compliance (know exactly who calls). Configure: upload trusted CA to S3 → reference in API Gateway custom domain → API GW requires client cert → extracts cert data (Subject, Issuer, Serial) for Lambda processing.', 12);

  s.events.push({ type: 'info', msg: 'Per-method throttling: GET /users: 100/s, POST /orders: 50/s. Usage plan per API key: 1000 req/day per developer key.' });
  snap(steps, s, 'Usage Plans + API Keys: per-client throttling and quota. Create API key → assign to usage plan → associate with API stage. Usage plan config: throttle (rate + burst per key) and quota (requests per day/week/month). Use for: tiered pricing (free tier: 1000/day, pro: 100K/day), API monetization, client-specific rate limiting. API key sent via x-api-key header. Without valid key → 403 Forbidden.', 13);

  s.result = 'API Gateway: SSL → Auth → Route → Throttle → WAF → Lambda. Managed API front door.';
  snap(steps, s, 'Key takeaways: 1) API Gateway is NOT just a proxy — it handles auth, throttling, caching, CORS, WAF, request validation. 2) Always enable throttling (protects backend + controls cost). 3) Use AWS_PROXY integration for simplicity (full request passed to Lambda). 4) Enable caching for frequent GET endpoints. 5) WAF is essential for production (SQL injection, XSS, IP blocking). 6) WebSocket for real-time needs. 7) VPC Link for private integrations. 8) mTLS for device/B2B auth. Pricing: REST API: $3.50/M requests + data transfer. HTTP API: $1.00/M requests (cheaper, simpler).', 14);

  return steps;
}

const CODE = [
  '# REST API config',
  'aws apigateway create-rest-api --name my-api',
  '# Deploy to stage',
  'aws apigateway create-deployment --rest-api-id <id> --stage-name prod',
  '# Canary deployment',
  'aws apigateway update-stage --rest-api-id <id> --stage-name prod',
  '  --patch-operations op=replace,path=/canarySettings/percentTraffic,value=10',
  '# Create WebSocket API',
  'aws apigatewayv2 create-api --name my-ws-api --protocol-type WEBSOCKET',
  '# VPC Link (private integration)',
  'aws apigateway create-vpc-link --name my-vpc-link --target-arns <nlb-arn>',
  '# Mutual TLS',
  'aws apigateway update-domain-name --domain-name api.myapp.com',
  '  --mutual-tls-authentication TruststoreUri=s3://bucket/cert.pem',
  '# Usage plan + API key',
  'aws apigateway create-usage-plan --name "Free Tier" --throttle file://t.json',
  'aws apigateway create-api-key --enabled --value my-key-123',
];

export default {
  id: 'apigw',
  label: 'API Gateway',
  icon: '🚪',
  build: buildAPIGWSteps,
  code: CODE,
  language: 'YAML/CLI',
  metrics: [
    { key: 'requests',   label: 'Requests',    max: 10,  color: 'var(--node-default)' },
    { key: 'throttled',  label: 'Throttled',   max: 5,   color: 'var(--pod-crash)' },
    { key: 'latency',    label: 'Latency (ms)', max: 200, unit: 'ms', color: 'var(--pod-running)' },
    { key: 'wafBlocked', label: 'WAF Blocked', max: 5,   color: 'var(--pod-error)' },
  ],
  topicContent: {
    concept: [
      { title: 'API Gateway Types', content: 'REST API: full-featured with WAF, caching, usage plans, API keys. HTTP API: cheaper, simpler, faster. WebSocket API: bidirectional real-time communication.' },
      { title: 'API Gateway as a Security Barrier', content: 'Terminates SSL, validates JWT (Cognito/Lambda authorizer), throttles traffic (rate + burst), filters requests through WAF (SQL injection, XSS), and validates request schemas — all before reaching your backend.' },
    ],
    why: ['API Gateway is the front door for your APIs — it handles cross-cutting concerns (auth, throttling, CORS, WAF) centrally, keeping backend code focused on business logic.'],
    interview: [
      { question: 'How does API Gateway handle authentication?', answer: 'Cognito Authorizer verifies JWT tokens against Cognito User Pools. Lambda Authorizer runs custom auth logic (custom JWT, OAuth, API keys). Request validation can reject malformed payloads before reaching Lambda.', followUps: ['What is a Lambda authorizer?', 'How does CORS work with API Gateway?'] },
      { question: 'What is VPC Link in API Gateway?', answer: 'VPC Link (Private Integration) connects API Gateway to resources inside your VPC via PrivateLink/NLB — no internet exposure. Used for internal microservices that should not be publicly accessible.', followUps: ['What protocols does VPC Link support?', 'How does VPC Link differ from a public integration?'] },
    ],
    gotcha: ['API Gateway 429 throttling returns "Too Many Requests" but does NOT wait — request is dropped entirely. Design clients to handle 429s with exponential backoff, not retry storms.', 'CORS preflight (OPTIONS) requests are handled automatically but only work if you configure CORS properly — double-check allowed origins, methods, and headers in production.'],
    tradeoffs: [
      { pro: 'Handles SSL, auth, throttling, caching, CORS, WAF, and request validation — reducing backend complexity significantly.', con: 'Cost can add up at scale ($3.50/M requests for REST API). HTTP API ($1.00/M) is cheaper but lacks some features (WAF, usage plans).' },
      { pro: 'Stage variables + canary deployments enable safe, gradual rollouts with instant rollback.', con: 'Custom domain names require ACM certificates in us-east-1 (for CloudFront), adding cross-region complexity for global APIs.' },
    ],
  },
};

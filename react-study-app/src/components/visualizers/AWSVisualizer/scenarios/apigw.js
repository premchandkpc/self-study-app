import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildAPIGWSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('mobile',   'Mobile App',       'client',  30,  80),
      svc('browser',  'Browser',          'client',  30,  250),
      svc('apigw',    'API Gateway',      'apigw',   210, 170, { rps: 0, throttle: 1000, stage: 'prod' }),
      svc('auth',     'Cognito Auth',     'auth',    400, 60),
      svc('lambda1',  'Lambda /users',    'lambda',  400, 170),
      svc('lambda2',  'Lambda /orders',   'lambda',  400, 280),
      svc('waf',      'AWS WAF',          'server',  400, 380),
      svc('cw',       'CloudWatch\nMetrics','server', 560, 380),
    ],
    edges: [
      { from: 'mobile',  to: 'apigw' },
      { from: 'browser', to: 'apigw' },
      { from: 'apigw',   to: 'auth' },
      { from: 'apigw',   to: 'lambda1' },
      { from: 'apigw',   to: 'lambda2' },
      { from: 'waf',     to: 'apigw' },
      { from: 'apigw',   to: 'cw' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, throttled: 0, auth: 0, latency: 0, wafBlocked: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'API Gateway = managed API front door. Handles SSL, auth, throttling, routing, CORS, request validation. Think of it as a smart reverse proxy in front of your backend. Two types: REST (full-featured) and HTTP (cheaper, simpler).', 1);

  s.nodes[0].state = 'active';
  s.packets = [pkt('mobile', 'apigw', 'GET /users Authorization: Bearer <JWT>', 'request')];
  s.metrics.requests = 1;
  s.events.push({ type: 'info', msg: 'Mobile: GET /users with JWT. API Gateway terminates SSL (TLS 1.3). Extracts Authorization header.' });
  snap(steps, s, 'Request arrives at API Gateway endpoint. SSL/TLS terminated at the AWS edge (CloudFront integration). Gateway parses: HTTP method (GET), path (/users), headers (Authorization), query params, body. You define the API schema in OpenAPI (Swagger) or CDK/Terraform. Gateway validates request against schema automatically before routing.', 2);

  s.packets = [pkt('apigw', 'auth', 'verify JWT (Cognito)', 'request')];
  s.nodes[3].state = 'active';
  s.metrics.auth = 1;
  s.events.push({ type: 'info', msg: 'API GW → Cognito User Pools: verify JWT signature, check expiry, extract claims (userId, role).' });
  snap(steps, s, 'Cognito JWT authorizer: API Gateway decodes the JWT, verifies signature against Cognito JWKS (public keys). Checks: token expiry (exp claim), issuer (iss), audience (aud). On success → attaches user claims to request context (available in Lambda as event.requestContext.authorizer.claims). Alternative: Lambda authorizer for custom auth logic (e.g., custom JWT, OAuth, API keys).', 3);

  s.packets = [pkt('apigw', 'lambda1', 'GET /users (userId=alice)', 'request')];
  s.nodes[4].state = 'active';
  s.events.push({ type: 'ok', msg: 'Auth OK → route to Lambda /users. Path param: {proxy+}. Request transformed (mapping template).' });
  snap(steps, s, 'Auth passes → API Gateway routes request to Lambda. Route selection matches: method (GET) + path pattern (/users/{proxy+}). Route settings: enable CORS (Access-Control headers), request validation (required params/body schema), mapping templates (transform request before Lambda). Integration types: AWS_PROXY (Lambda gets raw request) vs AWS (Lambda gets transformed request).', 4);

  s.packets = [pkt('lambda1', 'mobile', '200 OK (users list)', 'response')];
  s.metrics.latency = 42;
  s.events.push({ type: 'ok', msg: 'Lambda returns users. API Gateway adds CORS headers + caching headers. Total 42ms.' });
  snap(steps, s, 'Lambda responds 200 OK. API Gateway adds: CORS headers (Access-Control-Allow-Origin: *), cache headers (Cache-Control), security headers (X-Content-Type-Options: nosniff). Response caching: enable per-stage, TTL configurable (default 300s). Cache hit = no Lambda invocation. Response transformation: mapping templates can modify response shape.', 5);

  s.nodes[2].rps = 1001;
  s.packets = [pkt('mobile', 'apigw', '1001 req/s (burst)', 'request')];
  s.events.push({ type: 'warn', msg: '🚨 Rate limit: 1000 req/s. You sent 1001. API GW returns 429 Too Many Requests.' });
  s.metrics.requests = 2; s.metrics.throttled = 1;
  snap(steps, s, 'Traffic exceeds throttle (burst 5000, rate 1000/s). API Gateway returns 429 with Retry-After header. Throttling protects backend from overload. Two levels: 1) Route-level (burst + rate per route), 2) Account-level (region-wide per account). If account limit hit → 429 with "LimitExceededException". Request is NOT sent to Lambda — protected. Configure usage plans with API keys for per-client throttling.', 6);

  s.nodes[2].rps = 50;
  s.nodes[1].state = 'active';
  s.packets = [pkt('browser', 'apigw', 'OPTIONS /orders (CORS preflight)', 'request')];
  s.events.push({ type: 'info', msg: 'Browser CORS preflight: OPTIONS request. API GW handles automatically (no Lambda invoked).' });
  snap(steps, s, 'Browser sends OPTIONS (CORS preflight). API Gateway intercepts at edge — returns Access-Control headers immediately. NO Lambda invoked for OPTIONS. Saves compute cost + latency. Configure: allowed origins (specific domain or *), allowed methods (GET,POST), allowed headers (Content-Type, Authorization), max age (how long browser caches preflight result).', 7);

  s.nodes[2].stage = 'dev';
  s.events.push({ type: 'info', msg: 'Canary deployment: 90% traffic → prod stage, 10% → canary stage. Monitor errors. Auto-promote if OK.' });
  snap(steps, s, 'Stages + Canary: each deployment goes to a stage (dev, staging, prod). Canary: deploy new version to "prod" stage, route % of traffic to it. Monitor errors → if OK, promote to 100%. If NOT OK, rollback. Stage variables: environment-specific settings (Lambda alias, DB table name). Custom domain per stage: api.dev.myapp.com, api.myapp.com with SSL cert from ACM (AWS Certificate Manager).', 8);

  s.events.push({ type: 'warn', msg: 'WAF: SQL injection attempt detected in query params. Rule "SQLi_MatchingStatement" → BLOCKED (403).' });
  s.nodes[6].state = 'active';
  s.metrics.wafBlocked = 1;
  snap(steps, s, 'AWS WAF (Web Application Firewall) integrated with API Gateway. Rules: SQL injection prevention, cross-site scripting (XSS), IP rate limiting, geo-blocking (block traffic from specific countries), managed rule sets (OWASP top 10). WAF evaluates rules BEFORE request reaches API Gateway. Blocked requests never hit Lambda — saves cost and protects backend. WAF logs to Kinesis Firehose for analysis.', 9);

  s.events.push({ type: 'ok', msg: 'WebSocket API: wss://api.myapp.com. Bidirectional real-time comms. $connect/$disconnect/$default routes.' });
  snap(steps, s, 'WebSocket API in API Gateway: maintains persistent connection between client and server. Use for: real-time chat, live notifications, game state sync, collaborative editing. Routes: $connect (on open), $disconnect (on close), $default (any other message), custom routes. Connection ID stored in DynamoDB for targeted messaging. API Gateway manages connection lifecycle. PostToConnection API sends messages to specific clients.', 10);

  s.result = 'API Gateway: SSL → Auth → Route → Throttle → WAF → Lambda. Managed API front door.';
  snap(steps, s, 'Key takeaways: 1) API Gateway is NOT just a proxy — it handles auth, throttling, caching, CORS, WAF, request validation. 2) Always enable throttling (protects backend + controls cost). 3) Use AWS_PROXY integration for simplicity (full request passed to Lambda). 4) Enable caching for frequent GET endpoints. 5) WAF is essential for production (SQL injection, XSS, IP blocking). 6) WebSocket for real-time needs. Pricing: REST API: $3.50/M requests + data transfer. HTTP API: $1.00/M requests (cheaper, simpler).', 11);

  return steps;
}

const CODE = [
  '# REST API config',
  'aws apigateway create-rest-api --name my-api',
  '# Deploy to stage',
  'aws apigateway create-deployment',
  '  --rest-api-id <id> --stage-name prod',
  '# Canary deployment',
  'aws apigateway update-stage',
  '  --rest-api-id <id> --stage-name prod',
  '  --patch-operations op=replace,path=/canarySettings/percentTraffic,value=10',
  '# Create WebSocket API',
  'aws apigatewayv2 create-api',
  '  --name my-ws-api --protocol-type WEBSOCKET',
  '# Throttling per route',
  '  RateLimit: 1000 (req/s)',
  '  BurstLimit: 5000',
  '# Usage plan (per-client throttle)',
  'aws apigateway create-usage-plan',
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
};

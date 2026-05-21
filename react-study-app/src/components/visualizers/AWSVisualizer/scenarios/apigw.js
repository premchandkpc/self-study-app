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
      { title: 'API Gateway Types — REST, HTTP, and WebSocket', content: 'API Gateway offers three API types. REST API is the full-featured option with built-in WAF integration, caching, usage plans with API keys, request validation, canary deployments, and VPC Link for private integrations. HTTP API is a simpler, lower-cost alternative at $1.00 per million requests (vs $3.50 for REST) with support for JWT and Lambda authorizers, CORS, and automatic deployments. WebSocket API provides bidirectional real-time communication over a persistent connection with routes for connect, disconnect, and custom message handlers for real-time chat and live notifications.' },
      { title: 'API Gateway as a Security Barrier — defense in depth at the edge', content: 'API Gateway acts as the security front door for your APIs, handling multiple security layers before requests reach your backend. SSL/TLS termination at the edge with TLS 1.3 and customizable security policies. Authentication via Cognito User Pools JWT authorizer or Lambda authorizer for custom token validation. Throttling at the route level (rate and burst) protects backend from traffic spikes and DDoS. AWS WAF integration blocks SQL injection, cross-site scripting, IP reputation lists, and geo-blocking before the request reaches API Gateway. Request validation checks required parameters, headers, and body schema against a model before any backend invocation.' },
      { title: 'Deep — execution model, canary deployments, and private integrations', content: 'API Gateway REST APIs follow a lifecycle: client sends request, API Gateway terminates SSL, authorizer validates credentials, request validation checks schema, WAF rules evaluate, throttling checks rate limits, route matches method and path, integration transforms the request, backend processes, integration transforms the response, and API Gateway adds CORS and caching headers. Deployments create point-in-time snapshots deployed to stages. Canary deployments route a percentage of traffic to a new version with instant rollback by setting canary percent to 0. VPC Link creates a PrivateLink connection from API Gateway to an internal Network Load Balancer in your VPC, enabling calls to private microservices without internet exposure. Mutual TLS adds client certificate verification for B2B and IoT authentication.' },
    ],
    why: [
      'API Gateway handles cross-cutting concerns (SSL termination, authentication, throttling, CORS, WAF, request validation, caching) centrally, keeping backend code focused on business logic. Without API Gateway, every backend microservice must independently implement rate limiting, CORS headers, and input validation, leading to inconsistency and security gaps.',
      'API Gateway throttling and usage plans are essential for production API management. Route-level throttling prevents traffic spikes from overwhelming your backend by returning 429 before invocation. Usage plans with API keys enable per-client rate limits and quotas for tiered pricing, API monetization, and client access control.',
      'API Gateway stage management and canary deployments provide safe rollout mechanisms. Each API version is deployed to a stage with stage variables for environment-specific configuration. Canary deployments route a configurable percentage of traffic to a new version with instant rollback by setting canary percent to 0, eliminating risks of full blue-green deployments.',
    ],
    interview: [
      { q: 'How does API Gateway handle authentication and what are the different authorizer types?', a: 'API Gateway supports three authorizer types. Cognito Authorizer integrates with Cognito User Pools — the client includes a JWT token, API Gateway validates the signature against the Cognito JWKS endpoint, checks expiry and issuer claims, and passes decoded claims to the backend. Lambda Authorizer lets you implement arbitrary authentication logic by writing a Lambda function that receives the token or request parameters and returns an IAM policy document plus a context map, enabling custom JWT validation, OAuth integration, or third-party IdP support. Lambda Authorizers are cached using a TTL to avoid calling the authorizer on every request. IAM Authorizer uses SigV4 signing where the client signs the request with IAM credentials and API Gateway verifies the signature, best for service-to-service calls within AWS. Request validation checks query parameters, headers, and body against a JSON schema model, rejecting malformed requests with 400 before any auth or backend processing.', followUps: ['What is the difference between Cognito Authorizer and Lambda Authorizer?', 'How does CORS work with API Gateway authentication?'] },
      { q: 'What is VPC Link in API Gateway and when would you use it?', a: 'VPC Link (Private Integration) connects API Gateway to resources inside your VPC using AWS PrivateLink technology. API Gateway sends requests to an internal Network Load Balancer through an Elastic Network Interface in your VPC, keeping all traffic within the AWS network without internet exposure. To set up VPC Link, you create an internal NLB pointing to your backend service, create the VPC Link resource referencing the NLB, and configure the API Gateway integration to use the VPC Link. VPC Link is essential for APIs that need to call internal microservices that should not be publicly accessible, such as backend processing services, internal databases behind a proxy, and legacy systems on EC2. VPC Link does not support Lambda directly since Lambda can be invoked without VPC Link. It supports TCP and TLS protocols and the NLB handles millions of requests per second.', followUps: ['What protocols does VPC Link support?', 'How does VPC Link differ from a public integration?'] },
      { q: 'How does API Gateway handle canary deployments and what are the rollback mechanics?', a: 'API Gateway canary deployments allow you to deploy a new version of your API to a stage and route a percentage of traffic to it. You create a deployment and specify a canary setting on the stage with a percentTraffic value (e.g., 10%). The canary version receives that percentage of requests while the base version handles the rest. API Gateway tracks metrics separately for the canary and base versions (latency, error rates, HTTP status codes in CloudWatch). If the canary shows elevated errors or latency, you can instantly roll back by setting the canary percentTraffic to 0, which sends all traffic back to the base version. If the canary is healthy, you can promote the canary to become the new base stage version, making it 100% of traffic. Canary deployments are configured through the console, CLI, or SDK using update-stage with patch operations. Unlike blue-green deployments that require creating a new stage and switching DNS, canary deployments work within a single stage and provide gradual, observable traffic shifting with instant rollback capability.', followUps: ['How do you rollback a canary deployment?', 'What metrics should you monitor during a canary deployment?'] },
    ],
    gotcha: [
      'API Gateway 429 throttling returns TooManyRequests but does NOT queue or wait — the request is dropped entirely. Design clients to handle 429s with exponential backoff and jitter, not retry storms that make throttling worse. Implement client-side circuit breakers for production use.',
      'CORS preflight OPTIONS requests are handled automatically by API Gateway but only if CORS is configured correctly — you must specify allowed origins, methods, and headers. A common mistake is forgetting to add the Authorization header to allowed headers, causing authenticated requests to fail with CORS errors after the preflight succeeds.',
      'API Gateway has a 30-second integration timeout for all integration types (Lambda, HTTP, VPC Link). If your backend operation takes longer than 30 seconds, API Gateway returns a 504 response and the connection is dropped. For long-running operations, use Step Functions or async Lambda invocation with a separate status-polling endpoint.',
      'Custom domain names for API Gateway require ACM certificates in us-east-1 even if the API is deployed in a different region, because API Gateway uses CloudFront at the edge for custom domains. This cross-region certificate requirement catches many teams off guard during initial setup.',
    ],
    tradeoffs: [
      { pro: 'Handles SSL termination, authentication, throttling, caching, CORS, WAF, and request validation centrally — reducing backend complexity significantly and ensuring consistent security policies across all API endpoints.', con: 'Cost adds up at scale ($3.50 per million requests for REST API). HTTP API at $1.00 per million is cheaper but lacks WAF, usage plans, and some advanced features. For very high-volume APIs, cost must be evaluated against backend compute savings.' },
      { pro: 'Canary deployments with instant rollback enable safe gradual rollouts without creating duplicate stages or managing DNS switching, providing observable traffic shifting with separate CloudWatch metrics per canary.', con: 'Custom domain names require ACM certificates in us-east-1 for CloudFront, adding cross-region certificate management complexity. Each custom domain also has an additional monthly charge beyond the API request costs.' },
      { pro: 'VPC Link enables secure private integration with internal services without exposing them to the internet, supporting TCP and TLS protocols through PrivateLink for millions of requests per second.', con: 'VPC Link adds latency (approximately 5-10ms per request) due to the PrivateLink hop through the NLB. Each VPC Link has an hourly cost and requires maintaining an NLB in your VPC, adding operational overhead.' },
    ],
  },
};

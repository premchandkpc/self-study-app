import { snap, svc, pkt } from './shared';

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

const CODE = [
  '# API Gateway throttling',
  'DefaultRouteThrottling:',
  '  BurstLimit: 5000',
  '  RateLimit: 1000 (req/s)',
  '# Authorizers:',
  'JWT: Cognito / custom Lambda',
  '# Integrations:',
  'Lambda, HTTP, AWS_PROXY',
  '# Stage: dev → staging → prod',
];

export default {
  id: 'apigw',
  label: 'API Gateway',
  icon: '🚪',
  build: buildAPIGWSteps,
  code: CODE,
  language: 'YAML/CLI',
  metrics: [
    { key: 'requests',  label: 'Requests',  max: 10,  color: 'var(--node-default)' },
    { key: 'throttled', label: 'Throttled', max: 5,   color: 'var(--pod-crash)' },
    { key: 'p50ms',     label: 'P50 (ms)',  max: 100, unit: 'ms', color: 'var(--pod-running)' },
  ],
};

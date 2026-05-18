import { snap, node } from './shared.js';

/* ── SCENARIO 5: Microservices + Circuit Breaker ── */
function buildMicroservicesSteps() {
  const steps = [];
  const svc = (id, label, x, y, extra = {}) => node(id, label, 'server', x, y, extra);
  const pkt = (from, to, label, type = 'request') => ({ from, to, label, type, id: `${from}-${to}-${Date.now() + Math.random()}` });
  const s = {
    nodes: [
      node('client',  'Client',       'client',  60,  190),
      node('gateway', 'API Gateway',  'lb',      190, 190),
      svc('auth',     'Auth Svc',             320, 100),
      svc('order',    'Order Svc',            320, 190),
      svc('payment',  'Payment Svc',          320, 280),
      svc('inventory','Inventory Svc',        470, 140),
      svc('notify',   'Notify Svc',           470, 240),
      node('db',      'PostgreSQL',   'db',    610, 190),
    ],
    edges: [
      { from: 'client',    to: 'gateway' },
      { from: 'gateway',   to: 'auth' },
      { from: 'gateway',   to: 'order' },
      { from: 'order',     to: 'payment' },
      { from: 'order',     to: 'inventory' },
      { from: 'order',     to: 'notify' },
      { from: 'payment',   to: 'db' },
      { from: 'inventory', to: 'db' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, failures: 0, circuitOpen: 0 },
  };

  snap(steps, s, 'Microservices: API Gateway routes to Auth, Order, Payment, Inventory, Notify services.', 1);

  // Happy path
  s.nodes.find((n) => n.id === 'client').state = 'active';
  s.nodes.find((n) => n.id === 'gateway').state = 'active';
  s.packets = [pkt('client', 'gateway', 'POST /order')];
  s.metrics.requests = 1;
  s.events.push({ type: 'ok', msg: 'Client → API Gateway: POST /orders' });
  snap(steps, s, 'Client places order. API Gateway authenticates via Auth service first.', 2);

  // Auth + Order
  s.nodes.find((n) => n.id === 'auth').state = 'active';
  s.nodes.find((n) => n.id === 'order').state = 'active';
  s.packets = [pkt('gateway', 'auth', 'JWT?'), pkt('gateway', 'order', 'create')];
  s.events.push({ type: 'ok', msg: 'Auth validates JWT. Order service creates order.' });
  snap(steps, s, 'Auth validates JWT token. Order service receives request, calls Payment and Inventory.', 3);

  // Fan-out to payment + inventory + notify
  ['payment','inventory','notify'].forEach((id) => { s.nodes.find((n) => n.id === id).state = 'active'; });
  s.packets = [pkt('order','payment','charge'), pkt('order','inventory','reserve'), pkt('order','notify','email')];
  s.events.push({ type: 'ok', msg: 'Order fans out: Payment charged, Inventory reserved, Notify dispatched' });
  snap(steps, s, 'Order service fans out. Payment charges card, Inventory reserves stock, Notify sends email.', 4);

  // Payment fails — circuit opens
  s.nodes.find((n) => n.id === 'payment').state = 'error';
  s.metrics.failures = 3; s.metrics.circuitOpen = 1;
  s.packets = [];
  s.events.push({ type: 'error', msg: 'Payment Svc: 3 consecutive failures → Circuit Breaker OPEN!' });
  snap(steps, s, 'Payment service fails 3 times. Circuit Breaker OPENS. No more calls to Payment for 30s.', 5);

  // Circuit half-open
  s.nodes.find((n) => n.id === 'payment').state = 'warn';
  s.events.push({ type: 'warn', msg: 'Circuit HALF-OPEN: probe request sent to Payment' });
  snap(steps, s, 'After 30s: Circuit goes HALF-OPEN. Single probe request sent. If success → CLOSED.', 6);

  // Circuit closes
  s.nodes.find((n) => n.id === 'payment').state = 'active';
  s.metrics.circuitOpen = 0;
  s.nodes.find((n) => n.id === 'db').state = 'active';
  s.events.push({ type: 'ok', msg: 'Payment recovered. Circuit CLOSED. Normal operation resumed.' });
  snap(steps, s, 'Payment healthy. Circuit CLOSED. Retry queue drains. Service mesh logs span traces.', 7);

  return steps;
}

const CODE = [
  '# Circuit Breaker (Resilience4j)',
  'CircuitBreaker cb = factory.create("svc");',
  'cb.onError(OPEN after 5 fails)',
  'cb.onSuccess(HALF_OPEN → CLOSED)',
  '',
  '# Service Mesh (Istio)',
  'kubectl apply -f virtualservice.yaml',
  'retries: 3, timeout: 5s',
  'destinationRule: LEAST_CONN',
  '# Observability: traces via Jaeger',
];

export default {
  id: 'microservices',
  label: 'Microservices',
  icon: '🔌',
  build: buildMicroservicesSteps,
  code: CODE,
  language: 'nginx/JS/shell',
  metrics: [
    { key: 'requests',     label: 'Requests',    max: 10, color: 'var(--node-default)' },
    { key: 'failures',     label: 'Failures',    max: 5,  color: 'var(--pod-crash)' },
    { key: 'circuitOpen',  label: 'Circuit Open',max: 1,  color: 'var(--node-comparing)', warn: 50 },
  ],
};

import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../../../sd-types';
const _mk = createNodeFactory(ICONS);
const clientNode = _mk('client');
const gatewayNode = _mk('gateway');
const serviceNode = _mk('service');
const dbNode = _mk('db');

/* ─────────────────────────────────────────────────────────────────────────────
   Microservices + Circuit Breaker
   Layout: Client (x≈60) · Gateway (x≈190) · Core Svcs (x≈320) · Domain Svcs (x≈470) · DB (x≈610)
───────────────────────────────────────────────────────────────────────────── */
function buildMicroservicesSteps() {
  const steps = [];
  const s = {
    nodes: [
      clientNode ('client',    'Client',        60,  190, { desc: 'Web/mobile app — sends requests to API Gateway' }),
      gatewayNode('gateway',   'API Gateway',   190, 190, { desc: 'Rate limiting · Auth delegation · Request routing' }),
      serviceNode('auth',      'Auth Svc',      320, 100, { icon: '🔐', desc: 'JWT validation · OAuth2 · token introspection' }),
      serviceNode('order',     'Order Svc',     320, 190, { icon: '📦', desc: 'Orchestrates payment + inventory + notifications' }),
      serviceNode('payment',   'Payment Svc',   320, 280, { icon: '💳', desc: 'Stripe integration · idempotency keys · retry logic' }),
      serviceNode('inventory', 'Inventory Svc', 470, 140, { icon: '📊', desc: 'Stock reservation · decrement on order completion' }),
      serviceNode('notify',    'Notify Svc',    470, 240, { icon: '🔔', desc: 'Email/SMS/push via SendGrid + Twilio' }),
      dbNode     ('db',        'PostgreSQL',    610, 190, { desc: 'Sharded by customer_id · 2 read replicas' }),
    ],
    edges: [
      { from: 'client',    to: 'gateway',   protocol: 'HTTPS' },
      { from: 'gateway',   to: 'auth',      protocol: 'gRPC' },
      { from: 'gateway',   to: 'order',     protocol: 'gRPC' },
      { from: 'order',     to: 'payment',   protocol: 'gRPC' },
      { from: 'order',     to: 'inventory', protocol: 'gRPC' },
      { from: 'order',     to: 'notify',    protocol: 'Kafka', async: true },
      { from: 'payment',   to: 'db',        protocol: 'SQL' },
      { from: 'inventory', to: 'db',        protocol: 'SQL' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, failures: 0, circuitOpen: 0 },
  };

  snap(steps, s, 'Microservices: API Gateway routes to Auth, Order, Payment, Inventory, Notify. Each service owns its domain.', 1);

  s.nodes.find((svc) => svc.id === 'client').state = 'active';
  s.nodes.find((svc) => svc.id === 'gateway').state = 'active';
  s.packets = [packet('client', 'gateway', 'POST /orders')];
  s.metrics.requests = 1;
  s.events.push({ type: 'ok', msg: 'Client → API Gateway: POST /orders' });
  snap(steps, s, 'Client places order. API Gateway authenticates via Auth service first.', 2);

  s.nodes.find((svc) => svc.id === 'auth').state = 'active';
  s.nodes.find((svc) => svc.id === 'order').state = 'active';
  s.packets = [packet('gateway', 'auth', 'JWT?'), packet('gateway', 'order', 'create')];
  s.events.push({ type: 'ok', msg: 'Auth validates JWT. Order service creates order.' });
  snap(steps, s, 'Auth validates JWT token. Order service receives request, calls Payment and Inventory.', 3);

  ['payment','inventory','notify'].forEach((id) => { s.nodes.find((svc) => svc.id === id).state = 'active'; });
  s.packets = [packet('order','payment','charge'), packet('order','inventory','reserve'), packet('order','notify','email')];
  s.events.push({ type: 'ok', msg: 'Order fans out: Payment charged, Inventory reserved, Notify dispatched' });
  snap(steps, s, 'Order service fans out. Payment charges card, Inventory reserves stock, Notify sends email async.', 4);

  s.nodes.find((svc) => svc.id === 'payment').state = 'error';
  s.metrics.failures = 3; s.metrics.circuitOpen = 1;
  s.packets = [];
  s.events.push({ type: 'error', msg: 'Payment Svc: 3 consecutive failures → Circuit Breaker OPEN!' });
  snap(steps, s, 'Payment service fails 3 times. Circuit Breaker OPENS. No more calls to Payment for 30s.', 5);

  s.nodes.find((svc) => svc.id === 'payment').state = 'warn';
  s.events.push({ type: 'warn', msg: 'Circuit HALF-OPEN: probe request sent to Payment' });
  snap(steps, s, 'After 30s: Circuit goes HALF-OPEN. Single probe request sent. If success → CLOSED.', 6);

  s.nodes.find((svc) => svc.id === 'payment').state = 'active';
  s.metrics.circuitOpen = 0;
  s.nodes.find((svc) => svc.id === 'db').state = 'active';
  s.events.push({ type: 'ok', msg: 'Payment recovered. Circuit CLOSED. Normal operation resumed.' });
  snap(steps, s, 'Payment healthy. Circuit CLOSED. Retry queue drains. Service mesh logs distributed traces.', 7);

  return steps;
}

const CODE = [
  '// Circuit Breaker Pattern (Resilience4j)',
  'CircuitBreaker cb = CircuitBreakerFactory',
  '  .create("payment", config);',
  '',
  'config.setFailureThreshold(3);',
  'config.setWaitDurationInOpenState(30s);',
  'config.setSlowCallRateThreshold(50%);',
  '',
  '// States: CLOSED (normal) -> OPEN',
  '// (failures) -> HALF_OPEN (probe) -> CLOSED',
  '',
  '// Service Mesh (Istio VirtualService)',
  'retries: {attempts: 3, perTryTimeout: 5s}',
  'loadBalancer: {simple: LEAST_CONN}',
  'timeout: 30s',
  '// Distributed traces: Jaeger/Zipkin',
];

const LAYERS = [
  { label: 'Client',          x1: 5,   x2: 130, color: 'rgba(100,140,255,0.06)', border: 'rgba(100,140,255,0.30)' },
  { label: 'Gateway',         x1: 140, x2: 258, color: 'rgba(255,160,50,0.06)',  border: 'rgba(255,160,50,0.35)'  },
  { label: 'Core Services',   x1: 268, x2: 408, color: 'rgba(60,200,120,0.06)',  border: 'rgba(60,200,120,0.28)'  },
  { label: 'Domain Services', x1: 418, x2: 548, color: 'rgba(80,190,220,0.06)',  border: 'rgba(80,190,220,0.28)'  },
  { label: 'Storage',         x1: 558, x2: 670, color: 'rgba(220,90,90,0.06)',   border: 'rgba(220,90,90,0.28)'   },
];

export default {
  id: 'microservices',
  label: 'Microservices',
  icon: '🔌',
  layers: LAYERS,
  build: buildMicroservicesSteps,
  code: CODE,
  language: 'Java/JavaScript',
  metrics: [
    { key: 'requests',    label: 'Requests',     max: 10, color: 'var(--node-default)' },
    { key: 'failures',    label: 'Failures',     max: 5,  color: 'var(--pod-crash)' },
    { key: 'circuitOpen', label: 'Circuit Open', max: 1,  color: 'var(--node-comparing)', warn: 50 },
  ],
};

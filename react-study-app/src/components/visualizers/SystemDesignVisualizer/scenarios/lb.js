import { snap, node, packet } from './shared.js';

/* ────────────────────────────────────────────
   SCENARIO 1 — Load Balancer (Round-Robin)
   ──────────────────────────────────────────── */
function buildLBSteps() {
  const steps = [];
  const s = {
    nodes: [
      node('client', 'Client', 'client', 80, 160),
      node('lb', 'Load Balancer', 'lb', 270, 160),
      node('s1', 'Server 1', 'server', 470, 60, { load: 0, healthy: true }),
      node('s2', 'Server 2', 'server', 470, 160, { load: 0, healthy: true }),
      node('s3', 'Server 3', 'server', 470, 260, { load: 0, healthy: true }),
    ],
    edges: [
      { from: 'client', to: 'lb' },
      { from: 'lb', to: 's1' },
      { from: 'lb', to: 's2' },
      { from: 'lb', to: 's3' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, s1: 0, s2: 0, s3: 0, failed: 0 },
    activeEdge: null,
    algo: 'Round-Robin',
  };

  snap(steps, s, 'Load balancer sits in front of 3 servers. Round-robin distributes requests evenly.', 1);

  // Request 1 → s1
  s.nodes[0].state = 'active';
  s.nodes[1].state = 'active';
  s.packets = [packet('client', 'lb', 'GET /api', 'request')];
  s.events.push({ type: 'info', msg: 'Client → LB: GET /api (request 1)' });
  snap(steps, s, 'Request arrives at Load Balancer. Round-robin: next = Server 1.', 2);

  s.packets = [packet('lb', 's1', 'GET /api', 'request')];
  s.activeEdge = 'lb-s1';
  s.nodes[2].state = 'active';
  s.nodes[2].load = 1;
  s.metrics.requests = 1; s.metrics.s1 = 1;
  s.events.push({ type: 'ok', msg: 'LB → Server 1 (round 1)' });
  snap(steps, s, 'LB routes to Server 1. Server processes request.', 3);

  s.packets = [packet('s1', 'client', '200 OK', 'response')];
  s.nodes[2].load = 0;
  s.events.push({ type: 'ok', msg: 'Server 1 → Client: 200 OK' });
  snap(steps, s, 'Server 1 responds 200 OK. Round-robin counter advances.', 4);

  // Request 2 → s2
  s.packets = [packet('lb', 's2', 'GET /api', 'request')];
  s.activeEdge = 'lb-s2';
  s.nodes[3].state = 'active';
  s.nodes[3].load = 1;
  s.metrics.requests = 2; s.metrics.s2 = 1;
  s.events.push({ type: 'ok', msg: 'LB → Server 2 (round 2)' });
  snap(steps, s, 'Request 2 → Server 2. Even distribution across all servers.', 3);

  // Request 3 → s3
  s.packets = [packet('lb', 's3', 'GET /api', 'request')];
  s.activeEdge = 'lb-s3';
  s.nodes[4].state = 'active';
  s.nodes[4].load = 1;
  s.metrics.requests = 3; s.metrics.s3 = 1;
  s.events.push({ type: 'ok', msg: 'LB → Server 3 (round 3)' });
  snap(steps, s, 'Request 3 → Server 3. One full cycle complete.', 3);

  // S2 goes down
  s.packets = [];
  s.nodes[3].state = 'error';
  s.nodes[3].healthy = false;
  s.activeEdge = null;
  s.events.push({ type: 'error', msg: 'Server 2 health check FAIL — marking unhealthy' });
  snap(steps, s, 'Server 2 fails health check. LB marks it UNHEALTHY. Removes from rotation.', 6);

  // Request 4 skips s2
  s.packets = [packet('lb', 's1', 'GET /api', 'request')];
  s.activeEdge = 'lb-s1';
  s.nodes[2].load = 1;
  s.metrics.requests = 4; s.metrics.s1 = 2;
  s.events.push({ type: 'warn', msg: 'Skipping Server 2 (unhealthy). Routing to Server 1.' });
  snap(steps, s, 'LB skips Server 2. Routes to Server 1. Zero downtime for clients.', 7);

  return steps;
}

const CODE = [
  '# Nginx round-robin config',
  'upstream backend {',
  '  server s1.internal:8080;',
  '  server s2.internal:8080;',
  '  server s3.internal:8080;',
  '}',
  '# Health check',
  'server { ... }',
  'location / {',
  '  proxy_pass http://backend;',
  '}',
];

export default {
  id: 'lb',
  label: 'Load Balancer',
  icon: '⚖️',
  build: buildLBSteps,
  code: CODE,
  language: 'nginx/JS/shell',
  metrics: [
    { key: 'requests', label: 'Requests', max: 10, color: 'var(--node-default)' },
    { key: 's1',       label: 'S1 load',  max: 5,  color: 'var(--pod-running)' },
    { key: 's2',       label: 'S2 load',  max: 5,  color: 'var(--node-comparing)' },
  ],
};

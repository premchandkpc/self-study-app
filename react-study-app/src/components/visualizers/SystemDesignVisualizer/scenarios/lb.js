import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../sd-types';
const _mk = createNodeFactory(ICONS);
const clientNode = _mk('client');
const lbNode = _mk('lb');
const serverNode = _mk('server');

/* ─────────────────────────────────────────────────────────────────────────────
   Load Balancer — Round-Robin with health checks
   Layout: Client (x≈80) · Load Balancer (x≈270) · Servers (x≈470)
───────────────────────────────────────────────────────────────────────────── */
function buildLBSteps() {
  const steps = [];
  const s = {
    nodes: [
      clientNode('client', 'Client',        80,  160, { desc: 'HTTP client — sends requests to the load balancer' }),
      lbNode    ('lb',     'Load Balancer', 270, 160, { desc: 'Round-robin · Health check every 5s · Removes unhealthy backends' }),
      serverNode('s1',     'Server 1',      470, 60,  { desc: 'Stateless app server · handles GET /api', load: 0, healthy: true }),
      serverNode('s2',     'Server 2',      470, 160, { desc: 'Stateless app server · handles GET /api', load: 0, healthy: true }),
      serverNode('s3',     'Server 3',      470, 260, { desc: 'Stateless app server · handles GET /api', load: 0, healthy: true }),
    ],
    edges: [
      { from: 'client', to: 'lb', protocol: 'HTTP/2' },
      { from: 'lb', to: 's1', protocol: 'HTTP' },
      { from: 'lb', to: 's2', protocol: 'HTTP' },
      { from: 'lb', to: 's3', protocol: 'HTTP' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, s1: 0, s2: 0, s3: 0, failed: 0 },
  };

  snap(steps, s, 'Load balancer sits in front of 3 servers. Round-robin distributes requests evenly. Health checks run every 5s.', 1);

  s.nodes[0].state = 'active';
  s.nodes[1].state = 'active';
  s.packets = [packet('client', 'lb', 'GET /api', 'request')];
  s.events.push({ type: 'info', msg: 'Client → LB: GET /api (request 1)' });
  snap(steps, s, 'Request arrives at Load Balancer. Round-robin: next = Server 1.', 2);

  s.packets = [packet('lb', 's1', 'GET /api', 'request')];
  s.nodes[2].state = 'active';
  s.nodes[2].load = 1;
  s.metrics.requests = 1; s.metrics.s1 = 1;
  s.events.push({ type: 'ok', msg: 'LB → Server 1 (round 1)' });
  snap(steps, s, 'LB routes to Server 1. Server processes request.', 3);

  s.packets = [packet('s1', 'client', '200 OK', 'response')];
  s.nodes[2].load = 0;
  s.events.push({ type: 'ok', msg: 'Server 1 → Client: 200 OK' });
  snap(steps, s, 'Server 1 responds 200 OK. Round-robin counter advances.', 4);

  s.packets = [packet('lb', 's2', 'GET /api', 'request')];
  s.nodes[3].state = 'active';
  s.nodes[3].load = 1;
  s.metrics.requests = 2; s.metrics.s2 = 1;
  s.events.push({ type: 'ok', msg: 'LB → Server 2 (round 2)' });
  snap(steps, s, 'Request 2 → Server 2. Even distribution across all servers.', 5);

  s.packets = [packet('lb', 's3', 'GET /api', 'request')];
  s.nodes[4].state = 'active';
  s.nodes[4].load = 1;
  s.metrics.requests = 3; s.metrics.s3 = 1;
  s.events.push({ type: 'ok', msg: 'LB → Server 3 (round 3)' });
  snap(steps, s, 'Request 3 → Server 3. One full cycle complete.', 6);

  s.packets = [];
  s.nodes[3].state = 'error';
  s.nodes[3].healthy = false;
  s.events.push({ type: 'error', msg: 'Server 2 health check FAIL — marking unhealthy' });
  snap(steps, s, 'Server 2 fails health check. LB marks it UNHEALTHY. Removes from rotation.', 7);

  s.packets = [packet('lb', 's1', 'GET /api', 'request')];
  s.nodes[2].load = 1;
  s.metrics.requests = 4; s.metrics.s1 = 2;
  s.events.push({ type: 'warn', msg: 'Skipping Server 2 (unhealthy). Routing to Server 1.' });
  snap(steps, s, 'LB skips Server 2. Routes to Server 1. Zero downtime for clients.', 8);

  return steps;
}

const CODE = [
  '# Nginx Round-Robin Load Balancer',
  'upstream backend {',
  '  server s1.internal:8080 max_fails=3 fail_timeout=5s;',
  '  server s2.internal:8080 max_fails=3 fail_timeout=5s;',
  '  server s3.internal:8080 max_fails=3 fail_timeout=5s;',
  '}',
  'server {',
  '  listen 80;',
  '  location / {',
  '    proxy_pass http://backend;',
  '    proxy_set_header Host $host;',
  '    proxy_connect_timeout 5s;',
  '    proxy_read_timeout 30s;',
  '  }',
  '}',
  '# Algorithms: round-robin, least_conn, ip_hash, random, weighted',
];

const LAYERS = [
  { label: 'Client',        x1: 18,  x2: 148, color: 'rgba(100,140,255,0.06)', border: 'rgba(100,140,255,0.30)' },
  { label: 'Load Balancer', x1: 158, x2: 378, color: 'rgba(255,160,50,0.06)',  border: 'rgba(255,160,50,0.35)'  },
  { label: 'Servers',       x1: 388, x2: 560, color: 'rgba(60,200,120,0.06)',  border: 'rgba(60,200,120,0.28)'  },
];

export default {
  id: 'lb',
  label: 'Load Balancer',
  icon: '⚖️',
  layers: LAYERS,
  build: buildLBSteps,
  code: CODE,
  language: 'nginx',
  metrics: [
    { key: 'requests', label: 'Requests', max: 10, color: 'var(--node-default)' },
    { key: 's1',       label: 'S1 load',  max: 5,  color: 'var(--pod-running)' },
    { key: 's2',       label: 'S2 load',  max: 5,  color: 'var(--node-comparing)' },
  ],
};

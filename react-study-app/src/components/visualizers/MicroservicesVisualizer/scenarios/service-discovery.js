import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../sd-types';

const _mk = createNodeFactory(ICONS);
const appNode = _mk('service');
const apiNode = _mk('api');

function buildDiscoverySteps() {
  const steps = [];
  const s = {
    nodes: [
      apiNode('client', 'Client', 80, 150, { desc: 'Lookup: where is order-service?' }),
      apiNode('consul', 'Consul Registry', 250, 150, { desc: 'Stores service locations' }),
      appNode('order1', 'Order-v1 (10.0.1.2:8080)', 400, 80, { desc: 'Healthy' }),
      appNode('order2', 'Order-v2 (10.0.1.3:8080)', 400, 150, { desc: 'Healthy' }),
      appNode('order3', 'Order-v3 (10.0.1.4:8080)', 400, 220, { desc: 'Down (health check failed)' }),
    ],
    edges: [
      { from: 'client', to: 'consul', protocol: 'query' },
      { from: 'consul', to: 'order1', protocol: 'health' },
      { from: 'consul', to: 'order2', protocol: 'health' },
      { from: 'consul', to: 'order3', protocol: 'health' },
    ],
    packets: [],
    events: [],
    metrics: { healthy: 2, unhealthy: 1, discovery_time: 0 },
  };

  snap(steps, s, 'Service Discovery: Dynamic registration. Health checks. Load balancing. Auto failover.', 1);

  s.nodes[1].state = 'active';
  s.nodes[0].state = 'active';
  s.packets = [packet('client', 'consul', 'GET /v1/catalog/service/order-service')];
  s.metrics.discovery_time = 5;
  s.events.push({ type: 'info', msg: 'Client queries Consul: "Give me all healthy order-service instances."' });
  snap(steps, s, 'Client queries Consul Registry for order-service. Response: 3 instances (but one unhealthy).', 2);

  s.nodes[1].state = 'active';
  s.nodes[2].state = 'active';
  s.nodes[3].state = 'active';
  s.nodes[4].state = 'idle';
  s.packets = [packet('consul', 'order1', 'GET /health'), packet('consul', 'order2', 'GET /health'), packet('consul', 'order3', 'GET /health')];
  s.metrics.healthy = 2;
  s.metrics.unhealthy = 1;
  s.events.push({ type: 'info', msg: 'Health checks run every 10s. Order-v1: PASS. Order-v2: PASS. Order-v3: FAIL.' });
  snap(steps, s, 'Consul health checks: Order-v1 & v2 healthy. Order-v3 timeout (pod crashed). Marked unhealthy.', 3);

  s.packets = [packet('consul', 'client', 'response: [10.0.1.2:8080, 10.0.1.3:8080]')];
  s.events.push({ type: 'ok', msg: 'Consul returns only healthy instances (excludes v3). Client round-robins between v1 & v2.' });
  snap(steps, s, 'Consul returns only healthy IPs: [10.0.1.2:8080, 10.0.1.3:8080]. Automatic failover.', 4);

  s.nodes[0].state = 'active';
  s.nodes[2].state = 'active';
  s.packets = [packet('client', 'order1', 'POST /order (direct RPC)')];
  s.events.push({ type: 'ok', msg: 'Client calls Order-v1 directly. Response in 50ms.' });
  snap(steps, s, 'Client connects to Order-v1. Works normally. No awareness of v3 being down.', 5);

  s.nodes[4].state = 'active';
  s.events.push({ type: 'info', msg: 'Order-v3 recovers. Self-registers with Consul. Passes health check.' });
  snap(steps, s, 'Order-v3 pod restarts, self-registers. Health check passes. Rejoins pool.', 6);

  s.nodes[1].state = 'active';
  s.metrics.healthy = 3;
  s.metrics.unhealthy = 0;
  s.events.push({ type: 'ok', msg: 'v3 now in healthy list. Load balancing: 1/3 traffic to each. Auto scaling works.' });
  snap(steps, s, 'Discovery update: [10.0.1.2, 10.0.1.3, 10.0.1.4] all healthy. Traffic distributed 1:1:1.', 7);

  return steps;
}

const CODE = [
  '// Consul service discovery',
  'const consul = require("consul");',
  'const client = new consul.Consul();',
  '',
  '// Service registration (on startup)',
  'client.agent.service.register({',
  '  id: "order-v1-" + process.env.HOSTNAME,',
  '  name: "order-service",',
  '  address: "10.0.1.2",',
  '  port: 8080,',
  '  check: {',
  '    http: "http://10.0.1.2:8080/health",',
  '    interval: "10s",',
  '    timeout: "5s"',
  '  }',
  '});',
  '',
  '// Service discovery (client-side)',
  'const services = await client.health.service({',
  '  service: "order-service",',
  '  passing: true // Only healthy',
  '});',
  '',
  'const service = services[Math.floor(Math.random() * services.length)];',
  'const response = await fetch(`http://${service.Service.Address}:${service.Service.Port}/order`);',
];

export default {
  id: 'service-discovery',
  label: 'Service Discovery & Health Checks',
  icon: '🔍',
  build: buildDiscoverySteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'healthy', label: 'Healthy', max: 5, color: 'var(--pod-running)' },
    { key: 'unhealthy', label: 'Unhealthy', max: 5, color: 'var(--pod-crash)' },
    { key: 'discovery_time', label: 'Discovery (ms)', max: 50, color: 'var(--node-default)' },
  ],
  codeNotes: [
    { title: 'Service Registration', content: 'On startup, service registers: name, IP, port, health endpoint. Auto-deregistered on shutdown.' },
    { title: 'Health Checks', content: 'HTTP endpoint (200=healthy). Run every 10s. 2 failures = unhealthy. 2 passes = healthy again. Configurable thresholds.' },
    { title: 'Client-Side Discovery', content: 'Query registry (Consul, Eureka, etcd). Cache results 30s. Fallback to DNS if registry down.' },
    { title: 'Load Balancing', content: 'Round-robin, random, least-connections. Client-side (app logic) or server-side (LB).' },
  ],
  tradeoffs: [
    { pro: 'Automatic failover on pod crash', con: 'Health check delay: ~30s to detect failure (3 failures × 10s).' },
    { pro: 'Dynamic scaling: add pod = auto included', con: 'Client-side discovery = stale cache. Up to 30s lag.' },
    { pro: 'No manual DNS updates needed', con: 'Registry as SPOF. Consul down = lookups fail (need fallback).' },
    { pro: 'Works across regions/clouds', con: 'Network latency for registry query. Add caching (local resolvers).' },
  ],
  bestPractices: [
    'Health check: test actual dependency. E.g., GET /health tests DB connectivity, not just "app running".',
    'Health check interval: 10s-30s balance. Too fast = overhead. Too slow = long recovery time.',
    'Cache: client-side cache 30-60s. Use TTL from registry. Avoid thundering herd on registry.',
    'Fallback: if registry unavailable, use last-known IPs or hardcoded defaults. Better than no service.',
    'Deregistration: graceful shutdown must deregister from registry before terminating. Prevents 5xx to clients.',
  ],
};

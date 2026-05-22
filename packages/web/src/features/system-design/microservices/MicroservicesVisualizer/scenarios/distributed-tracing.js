import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../../../sd-types';

const _mk = createNodeFactory(ICONS);
const apiNode = _mk('api');
const serviceNode = _mk('service');
const dbNode = _mk('db');

function buildTracingSteps() {
  const steps = [];
  const s = {
    nodes: [
      apiNode('client', 'Client', 80, 150, { desc: 'HTTP request with trace ID' }),
      apiNode('api', 'API Gateway', 250, 80, { desc: 'Starts span: gateway-process' }),
      serviceNode('user', 'User Service', 250, 160, { desc: 'Starts child span: user-lookup' }),
      serviceNode('order', 'Order Service', 250, 240, { desc: 'Starts child span: order-query' }),
      dbNode('db', 'PostgreSQL', 420, 200, { desc: 'DB query span' }),
    ],
    edges: [
      { from: 'client', to: 'api', protocol: 'trace' },
      { from: 'api', to: 'user', protocol: 'trace' },
      { from: 'api', to: 'order', protocol: 'trace' },
      { from: 'order', to: 'db', protocol: 'trace' },
    ],
    packets: [],
    events: [],
    metrics: { spans: 0, latency_ms: 0, depth: 0 },
  };

  snap(steps, s, 'Distributed Tracing: Track request across services. Trace ID = unique request. Each service creates span.', 1);

  s.nodes[0].state = 'active';
  s.nodes[1].state = 'active';
  s.packets = [packet('client', 'api', 'GET /user/123 (trace:abc123)')];
  s.metrics.spans = 1;
  s.events.push({ type: 'info', msg: 'Client → API: GET /user/123. Trace ID: abc123 (128-bit random)' });
  snap(steps, s, 'Client initiates request. Trace ID generated. Propagated in HTTP headers.', 2);

  s.nodes[1].state = 'active';
  s.packets = [packet('api', 'user', 'lookup user_id=123 (span:span-user-1)')];
  s.metrics.spans = 2;
  s.metrics.latency_ms = 5;
  s.events.push({ type: 'info', msg: 'API Gateway creates span. Calls User Service. Passes trace context.' });
  snap(steps, s, 'API Gateway creates span: gateway-process (t=0ms). Calls User Service with trace ID.', 3);

  s.nodes[2].state = 'active';
  s.packets.push(packet('api', 'order', 'get_orders (span:span-order-1)'));
  s.metrics.spans = 3;
  s.metrics.latency_ms = 8;
  s.events.push({ type: 'info', msg: 'API calls 2 services in parallel. User Service: span-user-1. Order Service: span-order-1.' });
  snap(steps, s, 'API calls both User & Order services in parallel. Each creates child span. Both inherit trace ID.', 4);

  s.nodes[3].state = 'active';
  s.packets = [packet('order', 'db', 'SELECT * FROM orders (span:span-db-1)')];
  s.metrics.spans = 4;
  s.metrics.latency_ms = 25;
  s.metrics.depth = 3;
  s.events.push({ type: 'info', msg: 'Order Service queries DB. DB span: span-db-1. Latency: 20ms.' });
  snap(steps, s, 'Order Service hits PostgreSQL. DB creates span. Latency tracked: 20ms query time.', 5);

  s.nodes[2].state = 'idle';
  s.nodes[3].state = 'idle';
  s.nodes[4].state = 'idle';
  s.metrics.latency_ms = 32;
  s.packets = [packet('order', 'api', 'response (order data)'), packet('user', 'api', 'response (user data)')];
  s.events.push({ type: 'ok', msg: 'Both services respond. Spans closed. Total latency: 32ms. Jaeger/Zipkin aggregates.' });
  snap(steps, s, 'Both services respond. Spans closed with end time. Trace complete. Total: 32ms.', 6);

  s.nodes[1].state = 'idle';
  s.packets = [packet('api', 'client', 'response (user + orders)')];
  s.metrics.latency_ms = 35;
  s.events.push({ type: 'ok', msg: 'Trace complete. Total: 35ms. Breakdown: Gateway(1ms) + User(3ms) + Order+DB(20ms) + network(11ms).' });
  snap(steps, s, 'Final response sent. Trace uploaded to Jaeger. Query: WHERE trace_id=abc123. Full waterfall visible.', 7);

  return steps;
}

const CODE = [
  '// Jaeger/OpenTelemetry distributed tracing',
  'const tracer = initTracer("api-gateway");',
  '',
  'app.get("/user/:id", (req, res) => {',
  '  const span = tracer.startSpan("gateway-process");',
  '  const traceId = span.spanContext().traceId;',
  '',
  '  // Propagate trace ID to downstream',
  '  const userSpan = tracer.startSpan("user-lookup", {',
  '    childOf: span',
  '  });',
  '  const userData = await userService.get(id, {',
  '    "uber-trace-id": traceId // Pass in header',
  '  });',
  '  userSpan.finish();',
  '',
  '  span.finish(); // Total latency recorded',
  '});',
];

export default {
  id: 'distributed-tracing',
  label: 'Distributed Tracing',
  icon: '📍',
  build: buildTracingSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'spans', label: 'Spans', max: 5, color: 'var(--node-default)' },
    { key: 'latency_ms', label: 'Latency (ms)', max: 50, color: 'var(--pod-running)' },
    { key: 'depth', label: 'Depth', max: 5, color: 'var(--node-comparing)' },
  ],
  codeNotes: [
    { title: 'Trace ID', content: '128-bit random ID. Follows request across all services. Propagated via HTTP headers (Jaeger, B3, W3C).' },
    { title: 'Span Hierarchy', content: 'Parent span (API) creates child spans (services). Each span: start time, end time, duration, tags, logs. Hierarchical view in Jaeger UI.' },
    { title: 'Sampling Strategy', content: 'Sample 1% of traces by default (high volume). Adaptive sampling: sample errors 100%, slow requests more. Config via Jaeger agent.' },
    { title: 'Context Propagation', content: 'HTTP middleware injects/extracts trace context. gRPC uses metadata. Async: store in context vars or thread-local.' },
  ],
  tradeoffs: [
    { pro: 'Find latency bottlenecks across service mesh', con: 'Overhead: span creation + sampling decision ~1-2ms per request.' },
    { pro: 'Debugging distributed failures easy', con: 'Storage: millions of traces = 100GB+/day (retention 7d = 700GB).' },
    { pro: 'Automatic context propagation libraries', con: 'Requires instrumentation of all services. Legacy systems hard.' },
    { pro: 'Standard: OpenTelemetry widely adopted', con: 'Configuration complex (sampling, exporters, filters).' },
  ],
  bestPractices: [
    'Sample strategically: 100% on errors, 10% on slow (>1s), 0.1% on fast. Reduce storage 100x.',
    'Add custom tags: user_id, customer_tier, feature_flag. Filter traces by business context.',
    'Monitor trace completeness: alert if <95% of spans captured (dropped by network congestion).',
    'Use local tracing first (log structured, add trace_id). Jaeger for cross-service correlation.',
    'Retention: keep traces 7d by default. Costs ~$0.05/million traces (Jaeger self-hosted ~$5k/month storage).',
  ],
};

import { snap, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../../sd-types';

const _mk = createNodeFactory(ICONS);
const appNode = _mk('service');
const monNode = _mk('api');

function buildObservabilitySteps() {
  const steps = [];
  const s = {
    nodes: [
      appNode('app1', 'Service A', 150, 150, { desc: 'Emits metrics, logs, traces' }),
      appNode('app2', 'Service B', 300, 150, { desc: 'High latency detected' }),
      appNode('app3', 'Service C', 450, 150, { desc: 'Normal operation' }),
      monNode('prometheus', 'Prometheus', 150, 300, { desc: 'Scrapes /metrics every 15s' }),
      monNode('loki', 'Loki', 300, 300, { desc: 'Ingests logs via Promtail' }),
      monNode('tempo', 'Tempo', 450, 300, { desc: 'Stores traces, searches by trace_id' }),
    ],
    edges: [
      { from: 'prometheus', to: 'app1', protocol: 'scrape' },
      { from: 'prometheus', to: 'app2', protocol: 'scrape' },
      { from: 'prometheus', to: 'app3', protocol: 'scrape' },
      { from: 'loki', to: 'app1', protocol: 'logs' },
      { from: 'loki', to: 'app2', protocol: 'logs' },
      { from: 'tempo', to: 'app2', protocol: 'traces' },
    ],
    packets: [],
    events: [],
    metrics: { metrics: 0, logs: 0, traces: 0, alerts: 0 },
  };

  snap(steps, s, 'Observability: Three pillars. Metrics (time-series), Logs (events), Traces (requests). Combined = full visibility.', 1);

  s.nodes[0].state = 'active';
  s.nodes[3].state = 'active';
  s.packets = [packet('prometheus', 'app1', 'GET /metrics')];
  s.metrics.metrics = 1;
  s.events.push({ type: 'info', msg: 'Prometheus scrapes app1:/metrics. Collects: request_count, latency_p99, errors, cpu, memory.' });
  snap(steps, s, 'Prometheus scrapes metrics every 15s. Service A: 1000 req/s, p99=45ms, error_rate=0.1%.', 2);

  s.nodes[1].state = 'active';
  s.nodes[3].state = 'active';
  s.packets = [packet('prometheus', 'app2', 'GET /metrics')];
  s.metrics.metrics = 2;
  s.events.push({ type: 'warn', msg: 'Service B: 500 req/s, p99=250ms (⚠️ elevated!), error_rate=2% (⚠️ high!).' });
  snap(steps, s, 'Service B anomaly detected: p99 latency 5x higher, error rate 20x. Alert triggered.', 3);

  s.nodes[0].state = 'active';
  s.nodes[4].state = 'active';
  s.packets = [packet('loki', 'app1', 'POST /loki/push (log: handled request)')];
  s.metrics.logs = 1;
  s.events.push({ type: 'info', msg: 'Logs ingested: timestamp, level, msg, trace_id. Indexed by service, level, error.' });
  snap(steps, s, 'Loki collects logs. Service A: [INFO] user_id=42 action=login. [DEBUG] cache_hit=true.', 4);

  s.nodes[1].state = 'active';
  s.nodes[4].state = 'active';
  s.packets = [packet('loki', 'app2', 'POST /loki/push (log: ERROR)')];
  s.metrics.logs = 2;
  s.events.push({ type: 'error', msg: 'Service B logs: [ERROR] db connection pool exhausted. timeout=5s.' });
  snap(steps, s, 'Service B error logs appear in Loki. Query: {service="service-b"} |= "pool exhausted".', 5);

  s.nodes[1].state = 'active';
  s.nodes[5].state = 'active';
  s.packets = [packet('tempo', 'app2', 'POST /tempo/push (trace)')];
  s.metrics.traces = 1;
  s.metrics.alerts = 1;
  s.events.push({ type: 'error', msg: 'Trace shows: API → Order Service (50ms) → DB (200ms). DB pool timeout.' });
  snap(steps, s, 'Tempo traces correlate: latency spike = DB pool exhaustion (not code bug).', 6);

  s.nodes[3].state = 'idle';
  s.nodes[4].state = 'idle';
  s.nodes[5].state = 'idle';
  s.events.push({ type: 'ok', msg: 'Alert fired: Service B p99 > 200ms AND error_rate > 1%. Action: scale up DB connections.' });
  snap(steps, s, 'Alert: metrics + logs + traces tell full story. Root cause = DB connection pool. Fix = add replicas.', 7);

  return steps;
}

const CODE = [
  '// Prometheus metrics (Micrometer)',
  'const httpRequestDuration = new Histogram({',
  '  name: "http_request_duration_ms",',
  '  help: "HTTP request latency",',
  '  buckets: [10,50,100,250,500,1000]',
  '});',
  '',
  'app.use((req, res) => {',
  '  const start = Date.now();',
  '  res.on("finish", () => {',
  '    httpRequestDuration',
  '      .labels(req.method, req.path, res.status)',
  '      .observe(Date.now() - start);',
  '  });',
  '});',
  '',
  '// Logs (structured via pino)',
  'logger.info({ trace_id, user_id, action }, "processed");',
  '',
  '// Traces (OpenTelemetry)',
  'tracer.startSpan("db_query", span => {',
  '  span.setTag("db.statement", sql);',
  '});',
];

export default {
  id: 'observability',
  label: 'Observability (Metrics+Logs+Traces)',
  icon: '👁️',
  build: buildObservabilitySteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'metrics', label: 'Metrics', max: 3, color: 'var(--node-default)' },
    { key: 'logs', label: 'Logs', max: 3, color: 'var(--pod-running)' },
    { key: 'traces', label: 'Traces', max: 3, color: 'var(--node-comparing)' },
    { key: 'alerts', label: 'Alerts', max: 3, color: 'var(--pod-crash)' },
  ],
  codeNotes: [
    { title: 'Metrics = Time-Series', content: 'CPU%, latency, request count. Queryable: PromQL. Good for: trends, anomalies, alerting rules.' },
    { title: 'Logs = Structured Events', content: 'JSON logs with timestamp, service, trace_id. Indexed. Good for: debugging, searching error context.' },
    { title: 'Traces = Request Flow', content: 'Span tree. Good for: finding latency bottleneck (which service slow?), latency correlation.' },
    { title: 'Correlation', content: 'Same trace_id appears in metrics, logs, traces. Clicking alert → finds traces → finds logs.' },
  ],
  tradeoffs: [
    { pro: 'Metrics small (~1KB/service/min), cheap to store', con: 'Lose detail; need logs/traces to debug.' },
    { pro: 'Logs human-readable, full context', con: 'High cardinality kills storage (~1TB/day per 100 services).' },
    { pro: 'Traces pinpoint latency exactly', con: 'Storage expensive (~100GB/day). Sampling required.' },
    { pro: 'All three together = full observability', con: 'Complex setup (Prometheus + Loki + Tempo = 3 separate systems).' },
  ],
  bestPractices: [
    'Metrics: keep 15-30d history. Use Prometheus + Grafana. Alert on p99 latency, error_rate, saturation (4 golden signals).',
    'Logs: JSON structured logs. Add trace_id to every log. Use Loki (cheap, good for labels) or ELK (expensive, more powerful).',
    'Traces: sample 10% of requests. Use Jaeger or Tempo. Correlate: hover metric alert → fetch traces → search logs.',
    'Stack: Prometheus (metrics) + Loki (logs) + Tempo (traces) = open-source full stack. Grafana UI unifies all three.',
    'Cost optimization: metrics 1% -> logs 10% -> traces 100% (inverted from cost). Start with metrics, add logs/traces as needed.',
  ],
};

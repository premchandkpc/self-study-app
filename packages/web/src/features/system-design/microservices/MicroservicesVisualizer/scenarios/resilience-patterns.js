import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../../sd-types';

const _mk = createNodeFactory(ICONS);
const appNode = _mk('service');

function buildResilienceSteps() {
  const steps = [];
  const s = {
    nodes: [
      appNode('caller', 'API Gateway', 100, 150, { desc: 'Calls Order Service' }),
      appNode('order', 'Order Service', 300, 80, { desc: 'Healthy' }),
      appNode('payment', 'Payment Service', 300, 220, { desc: 'Timing out' }),
      appNode('bulkhead', 'Thread Pool', 500, 150, { desc: 'Bulkhead: 10 threads' }),
    ],
    edges: [
      { from: 'caller', to: 'order', protocol: 'call' },
      { from: 'order', to: 'payment', protocol: 'call' },
      { from: 'order', to: 'bulkhead', protocol: 'isolate' },
    ],
    packets: [],
    events: [],
    metrics: { calls: 0, timeouts: 0, bulkhead_full: 0, circuit_state: 0 },
  };

  snap(steps, s, 'Resilience Patterns: Timeout, Retry, Bulkhead, Circuit Breaker, Fallback. Prevent cascading.', 1);

  s.nodes[0].state = 'active';
  s.nodes[1].state = 'active';
  s.packets = [packet('caller', 'order', 'create_order')];
  s.metrics.calls = 1;
  s.events.push({ type: 'info', msg: 'API → Order Service: healthy, responds in 50ms.' });
  snap(steps, s, 'Step 1: Normal call. Timeout: 5s (default).', 2);

  s.nodes[1].state = 'active';
  s.nodes[2].state = 'active';
  s.packets = [packet('order', 'payment', 'charge($99)')];
  s.events.push({ type: 'info', msg: 'Order calls Payment Service.' });
  snap(steps, s, 'Order Service calls Payment. Payment slow (network congestion).', 3);

  s.nodes[2].state = 'error';
  s.metrics.timeouts = 1;
  s.events.push({ type: 'error', msg: 'Timeout! Payment took 6s, timeout=5s. Retry logic kicks in.' });
  snap(steps, s, 'Timeout triggered (5s exceeded). Exponential backoff: retry in 100ms (Jitter).', 4);

  s.packets = [packet('order', 'payment', 'charge($99) [retry 1]')];
  s.metrics.calls = 2;
  s.events.push({ type: 'info', msg: 'Retry 1: exponential backoff. Still slow.' });
  snap(steps, s, 'Retry 1 fails. Exponential backoff: 100ms → 200ms → 400ms. Max 3 retries.', 5);

  s.metrics.calls = 3;
  s.events.push({ type: 'error', msg: 'All retries failed. Circuit Breaker opens (fail count > 5).' });
  snap(steps, s, 'Circuit Breaker OPEN. 5+ failures in 10s window. Fast-fail mode activated.', 6);

  s.nodes[1].state = 'active';
  s.nodes[3].state = 'active';
  s.metrics.bulkhead_full = 0;
  s.packets = [packet('order', 'bulkhead', 'isolate call')];
  s.events.push({ type: 'info', msg: 'Bulkhead: allocate 1 thread from pool of 10. Protect main thread pool.' });
  snap(steps, s, 'Bulkhead isolation: Payment calls use separate thread pool (10 threads). Main unaffected.', 7);

  s.metrics.bulkhead_full = 1;
  s.events.push({ type: 'warn', msg: 'Bulkhead full (10 Payment calls active). New calls rejected immediately (fail-fast).' });
  snap(steps, s, 'Bulkhead saturated. New Payment calls rejected. Caller gets 429 (Too Many Requests) fast.', 8);

  s.packets = [packet('order', 'order', 'fallback: use_cache')];
  s.events.push({ type: 'ok', msg: 'Fallback: use cached order data. Circuit open → fallback triggered.' });
  snap(steps, s, 'Fallback activated: return cached response. Better than error to user.', 9);

  s.nodes[2].state = 'idle';
  s.nodes[1].state = 'idle';
  s.events.push({ type: 'ok', msg: 'Payment recovers. Circuit closes after 30s (half-open). Tests succeed. CLOSED again.' });
  snap(steps, s, 'Recovery: Payment latency back to normal. Circuit closes. Full traffic restored.', 10);

  return steps;
}

const CODE = [
  '// Resilience4j Java',
  'final CircuitBreaker cb = CircuitBreaker.ofDefaults("payment");',
  'final Retry retry = Retry.ofDefaults("payment");',
  '',
  'final Supplier<String> supplier = () -> {',
  '  Duration timeout = Duration.ofSeconds(5);',
  '  return TimeLimiter.of(timeout)',
  '    .executeFuture(() => paymentService.charge(99));',
  '};',
  '',
  'String result = Decorators.ofSupplier(supplier)',
  '  .withCircuitBreaker(cb)',
  '  .withRetry(retry)',
  '  .withFallback(asList(IOException.class),',
  '    () => getCachedPrice())',
  '  .withBulkhead(Bulkhead.ofDefaults("payment"))',
  '  .get();',
];

export default {
  id: 'resilience-patterns',
  label: 'Resilience Patterns',
  icon: '🛡️',
  build: buildResilienceSteps,
  code: CODE,
  language: 'Java',
  metrics: [
    { key: 'calls', label: 'Total Calls', max: 5, color: 'var(--node-default)' },
    { key: 'timeouts', label: 'Timeouts', max: 5, color: 'var(--pod-crash)' },
    { key: 'bulkhead_full', label: 'Bulkhead %', max: 100, unit: '%', color: 'var(--node-comparing)' },
    { key: 'circuit_state', label: 'Circuit', max: 2, color: 'var(--pod-running)' },
  ],
  codeNotes: [
    { title: 'Timeout', content: 'Max wait time (5s). Prevents threads hanging forever. Paired with retry backoff.' },
    { title: 'Retry + Backoff', content: 'Exponential: 100ms → 200ms → 400ms. Jitter (random ±10%) prevents thundering herd.' },
    { title: 'Circuit Breaker', content: 'CLOSED (normal) → OPEN (fail fast) → HALF_OPEN (test). Opens after N failures or error%. Reopens after 30s.' },
    { title: 'Bulkhead', content: 'Separate thread pool for risky calls. 10 threads for Payment. Failures isolated; main pool unaffected.' },
    { title: 'Fallback', content: 'Return cached, stale data, or default on failure. Better UX than error. Requires stale-allowed data.' },
  ],
  tradeoffs: [
    { pro: 'Prevents cascading failures', con: 'Adds latency (retry backoff, circuit check = ~1-10ms overhead).' },
    { pro: 'System survives downstream failure', con: 'Fallback data stale. Users may see old prices, cached results.' },
    { pro: 'Bulkhead isolation protects resources', con: 'Requires separate thread pool tuning. Too many pools = memory overhead.' },
    { pro: 'Circuit breaker fast-fails', con: 'False positives: temporary network hiccup = open circuit, rejects valid requests.' },
  ],
  bestPractices: [
    'Timeout = p99 latency + 2 * std_dev. For 99th percentile 200ms: set timeout 500-1000ms. Too short = false failures.',
    'Retry: exponential backoff. Max 3 retries. Jitter to prevent thundering herd. Not idempotent calls.',
    'Bulkhead: pool_size = expected_concurrent_calls + 2. Monitor utilization. Alert if >80%.',
    'Circuit breaker: open on 50% error rate or 10 failures in 10s. Half-open after 30s. Test 1 request to recover.',
    'Fallback: cache TTL = longest acceptable staleness. E.g., user profile cache 1h, product price 5min, stock 30s.',
  ],
};

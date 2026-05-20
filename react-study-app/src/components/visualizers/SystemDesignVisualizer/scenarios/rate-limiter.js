import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../sd-types';
const _mk = createNodeFactory(ICONS);
const clientNode = _mk('client');
const gatewayNode = _mk('gateway');
const cacheNode = _mk('cache');
const serviceNode = _mk('service');

/* ─────────────────────────────────────────────────────────────────────────────
   Rate Limiting — token bucket, sliding window, fixed window strategies
   Layout: Clients (x≈80) · Rate Limiter (x≈220) · Service (x≈380)
───────────────────────────────────────────────────────────────────────────── */
function buildRateLimiterSteps() {
  const steps = [];
  const s = {
    nodes: [
      clientNode ('client_a',  'Client A',          80,  100, { desc: 'Premium tier: 1000 req/min' }),
      clientNode ('client_b',  'Client B',          80,  250, { desc: 'Standard tier: 100 req/min' }),
      gatewayNode('limiter',   'Rate Limiter',      220, 175, { desc: 'Redis token bucket (quota check)' }),
      cacheNode  ('redis',     'Redis',             340, 175, { desc: 'Per-user token count & refill rate' }),
      serviceNode('api',       'API Server',        460, 175, { desc: 'Protected by rate limiter' }),
    ],
    edges: [
      { from: 'client_a', to: 'limiter', protocol: 'HTTP', desc: 'GET /api/data (user_id=1)' },
      { from: 'client_b', to: 'limiter', protocol: 'HTTP', desc: 'GET /api/data (user_id=2)' },
      { from: 'limiter',  to: 'redis',   protocol: 'Redis', desc: 'INCR quota:user_id' },
      { from: 'limiter',  to: 'api',     protocol: 'HTTP' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, allowed: 0, rejected: 0 },
  };

  snap(steps, s, 'Rate Limiter: Token Bucket algo. Clients get refillable quota. Exceeded → 429 Too Many Requests.', 1);

  s.nodes.find((n) => n.id === 'client_a').state = 'active';
  s.nodes.find((n) => n.id === 'limiter').state = 'active';
  s.packets = [packet('client_a', 'limiter', 'req #1')];
  s.metrics.requests = 1;
  s.metrics.allowed = 1;
  s.events.push({ type: 'ok', msg: 'Client A request 1/1000. Check Redis: tokens=999. Allowed. ✓' });
  snap(steps, s, 'Client A (premium, 1000/min quota). Check redis:quota:user_1 → 999 tokens left. Request → API.', 2);

  s.nodes.find((n) => n.id === 'client_b').state = 'active';
  s.packets = [packet('client_b', 'limiter', 'req #1')];
  s.metrics.requests = 2;
  s.metrics.allowed = 2;
  s.events.push({ type: 'ok', msg: 'Client B request 1/100. Check Redis: tokens=99. Allowed. ✓' });
  snap(steps, s, 'Client B (standard, 100/min quota). Check redis:quota:user_2 → 99 tokens. Request → API.', 3);

  // Rapid requests from Client B
  for (let i = 2; i <= 10; i++) {
    s.packets = [packet('client_b', 'limiter', `req #${i}`)];
    s.metrics.requests = 10 + i;
    if (i < 10) {
      s.metrics.allowed = 2 + (i - 1);
      s.events = [{ type: 'ok', msg: `Client B request ${i}/100. tokens=${100 - i}. Allowed. ✓` }];
    }
  }
  snap(steps, s, 'Client B fires 10 requests. Quota depletes: 100 → 90 tokens per request.', 4);

  s.nodes.find((n) => n.id === 'client_b').state = 'error';
  s.packets = [packet('client_b', 'limiter', 'req #101')];
  s.metrics.rejected = 1;
  s.events = [{ type: 'error', msg: 'Client B request 101/100. Quota exceeded! tokens=-1. 429 Too Many Requests.' }];
  snap(steps, s, 'Client B exhausts quota (100 requests in burst). Request 101 → 429. Backoff required.', 5);

  s.nodes.find((n) => n.id === 'client_a').state = 'idle';
  s.nodes.find((n) => n.id === 'client_b').state = 'warn';
  s.packets = [];
  s.events = [
    { type: 'warn', msg: 'Token refill: Every 1 second, +1.67 tokens/sec (100 tokens/min ÷ 60)' },
    { type: 'info', msg: 'Client B: Wait 60s for full refill, or implement exponential backoff' },
  ];
  snap(steps, s, 'Token refill: Standard tier refills 100/60 = 1.67 tokens per second. Client B must wait or retry.', 6);

  s.nodes.find((n) => n.id === 'client_b').state = 'active';
  s.metrics.allowed = 3;
  s.events = [{ type: 'ok', msg: 'After 60s: tokens refilled. Client B can retry.' }];
  snap(steps, s, 'After 60 seconds: tokens fully refilled. Client B retry succeeds. Tier-based quotas enable fair usage.', 7);

  return steps;
}

const CODE = [
  '// Token Bucket using Redis Lua Script',
  'const RATE_LIMIT_SCRIPT = `',
  '  local key = KEYS[1]',
  '  local limit = tonumber(ARGV[1])',
  '  local refill = tonumber(ARGV[2])',
  '  local now = tonumber(ARGV[3])',
  '  local last = redis.call("HGET", key, "t")',
  '  local tokens = tonumber(',
  '    redis.call("HGET", key, "n") or limit)',
  '  if last then',
  '    tokens = min(limit, tokens + ',
  '      refill * (now - last) / 1000)',
  '  end',
  '  if tokens >= 1 then',
  '    redis.call("HMSET", key, "n", tokens-1, ',
  '      "t", now)',
  '    return 1',
  '  end',
  '  return 0',
  '`',
  '// Tier-based quotas: premium 1000/min, std 100/min',
  '// Algorithms: token-bucket, sliding-window, fixed-window',
];

const LAYERS = [
  { label: 'Clients',       x1: 5,   x2: 140, color: 'rgba(100,140,255,0.06)', border: 'rgba(100,140,255,0.30)' },
  { label: 'Rate Limit',    x1: 150, x2: 310, color: 'rgba(255,160,50,0.06)',  border: 'rgba(255,160,50,0.35)'  },
  { label: 'Backend',       x1: 330, x2: 520, color: 'rgba(60,200,120,0.06)',  border: 'rgba(60,200,120,0.28)'  },
];

export default {
  id: 'rate-limiter',
  label: 'Rate Limiter',
  icon: '⏱️',
  layers: LAYERS,
  build: buildRateLimiterSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'requests', label: 'Total Req',  max: 200, color: 'var(--node-default)' },
    { key: 'allowed',  label: 'Allowed',    max: 150, color: 'var(--pod-running)' },
    { key: 'rejected', label: 'Rejected',   max: 50,  color: 'var(--pod-crash)' },
  ],
};

import { snap, node, packet } from './shared.js';

/* ────────────────────────────────────────────
   SCENARIO 3 — CDN
   ──────────────────────────────────────────── */
function buildCDNSteps() {
  const steps = [];
  const s = {
    nodes: [
      node('c1', 'Client (NYC)', 'client', 60, 100),
      node('c2', 'Client (LON)', 'client', 60, 220),
      node('edge', 'CDN Edge\n(Cloudflare)', 'cdn', 280, 160, { cached: false, ttl: 0, hit: 0, miss: 0 }),
      node('origin', 'Origin Server', 'server', 500, 160, { load: 0 }),
    ],
    edges: [
      { from: 'c1', to: 'edge' },
      { from: 'c2', to: 'edge' },
      { from: 'edge', to: 'origin' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, edgeHits: 0, originHits: 0, savedMs: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'CDN edge node sits geographically close to users. Origin server is far.', 1);

  // Cold request — cache miss at edge
  s.nodes[0].state = 'active';
  s.packets = [packet('c1', 'edge', 'GET /hero.jpg', 'request')];
  s.metrics.requests = 1;
  s.events.push({ type: 'info', msg: 'NYC client requests /hero.jpg' });
  snap(steps, s, 'First request: GET /hero.jpg. Edge checks cache… COLD MISS.', 2);

  s.packets = [packet('edge', 'origin', 'GET /hero.jpg', 'request')];
  s.activeEdge = 'edge-origin';
  s.nodes[3].state = 'active';
  s.nodes[3].load = 1;
  s.events.push({ type: 'warn', msg: 'Cache MISS → forward to origin (120ms)' });
  s.metrics.originHits = 1;
  snap(steps, s, 'Cache miss → edge fetches from origin. High latency: 120ms round-trip.', 3);

  s.nodes[2].cached = true;
  s.nodes[2].ttl = 3600;
  s.packets = [packet('origin', 'c1', '/hero.jpg (4MB)', 'response')];
  s.nodes[3].load = 0;
  s.events.push({ type: 'ok', msg: 'Edge caches /hero.jpg (TTL 3600s)' });
  snap(steps, s, 'Edge caches content with TTL=1hr. Future requests served locally.', 4);

  // Second request — cache HIT at edge
  s.nodes[1].state = 'active';
  s.packets = [packet('c2', 'edge', 'GET /hero.jpg', 'request')];
  s.metrics.requests = 2;
  snap(steps, s, 'London client requests same asset. Edge checks cache…', 2);

  s.nodes[2].state = 'ok';
  s.nodes[2].hit = 1;
  s.packets = [packet('edge', 'c2', '/hero.jpg (cache)', 'response')];
  s.events.push({ type: 'ok', msg: 'Cache HIT! Edge serves in 8ms (vs 120ms origin)' });
  s.metrics.edgeHits = 1;
  s.metrics.savedMs = 112;
  snap(steps, s, 'EDGE CACHE HIT! Served in 8ms. Origin not contacted. 112ms saved.', 5);

  // Multiple requests cached
  s.metrics.requests = 10;
  s.metrics.edgeHits = 9;
  s.metrics.originHits = 1;
  s.metrics.savedMs = 9 * 112;
  s.events.push({ type: 'ok', msg: '10 requests: 9 cache hits (90% hit rate)' });
  snap(steps, s, '90% cache hit rate. Origin handles only 10% of traffic. Massive cost saving.', 6);

  // Cache invalidation
  s.nodes[2].cached = false;
  s.nodes[2].ttl = 0;
  s.nodes[2].state = 'warn';
  s.events.push({ type: 'warn', msg: 'Cache purge: /hero.jpg invalidated (new deploy)' });
  snap(steps, s, 'Deploy new version: CDN cache purged. Next request fetches fresh from origin.', 7);

  return steps;
}

const CODE = [
  '# CDN cache control',
  'Cache-Control: public, max-age=3600',
  '# Invalidation',
  'curl -X POST cdn/purge \\',
  '  -d "url=/hero.jpg"',
  '# Edge config (Cloudflare)',
  'cache_ttl: 3600',
  'stale_while_revalidate: 60',
  'cache_key: host+url',
];

export default {
  id: 'cdn',
  label: 'CDN',
  icon: '🌐',
  build: buildCDNSteps,
  code: CODE,
  language: 'nginx/JS/shell',
  metrics: [
    { key: 'requests', label: 'Requests',  max: 10,   color: 'var(--node-default)' },
    { key: 'edgeHits', label: 'Edge Hits', max: 10,   color: 'var(--pod-running)' },
    { key: 'savedMs',  label: 'Saved(ms)', max: 1200, unit: 'ms', color: 'var(--node-comparing)' },
  ],
};

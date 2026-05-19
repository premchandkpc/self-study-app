import { snap, packet, clientNode, serverNode, cdnNode } from './shared.js';

/* ─────────────────────────────────────────────────────────────────────────────
   CDN — Edge caching with TTL and cache invalidation
   Layout: Clients (x≈60) · CDN Edge (x≈280) · Origin (x≈500)
───────────────────────────────────────────────────────────────────────────── */
function buildCDNSteps() {
  const steps = [];
  const s = {
    nodes: [
      clientNode('c1',     'Client (NYC)',          60,  100, { desc: 'NYC user — geographically close to CDN edge node' }),
      clientNode('c2',     'Client (LON)',          60,  220, { desc: 'London user — same CDN edge, different origin region' }),
      cdnNode   ('edge',   'CDN Edge\n(Cloudflare)', 280, 160, { desc: 'Cloudflare PoP · TTL-based cache · MISS→fetch origin', cached: false, ttl: 0, hit: 0, miss: 0 }),
      serverNode('origin', 'Origin Server',         500, 160, { desc: 'Origin — authoritative content source · ~120ms round-trip from edge', load: 0 }),
    ],
    edges: [
      { from: 'c1',   to: 'edge',   protocol: 'HTTPS' },
      { from: 'c2',   to: 'edge',   protocol: 'HTTPS' },
      { from: 'edge', to: 'origin', protocol: 'HTTPS' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, edgeHits: 0, originHits: 0, savedMs: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'CDN edge node sits geographically close to users. Origin server is far away (~120ms round-trip).', 1);

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
  snap(steps, s, 'Edge caches content with TTL=1hr. Future requests served locally — no origin hit.', 4);

  s.nodes[1].state = 'active';
  s.packets = [packet('c2', 'edge', 'GET /hero.jpg', 'request')];
  s.metrics.requests = 2;
  snap(steps, s, 'London client requests same asset. Edge checks cache…', 5);

  s.nodes[2].state = 'ok';
  s.nodes[2].hit = 1;
  s.packets = [packet('edge', 'c2', '/hero.jpg (cache)', 'response')];
  s.events.push({ type: 'ok', msg: 'Cache HIT! Edge serves in 8ms (vs 120ms origin)' });
  s.metrics.edgeHits = 1;
  s.metrics.savedMs = 112;
  snap(steps, s, 'EDGE CACHE HIT! Served in 8ms. Origin not contacted. 112ms saved.', 5);

  s.metrics.requests = 10;
  s.metrics.edgeHits = 9;
  s.metrics.originHits = 1;
  s.metrics.savedMs = 9 * 112;
  s.events.push({ type: 'ok', msg: '10 requests: 9 cache hits (90% hit rate)' });
  snap(steps, s, '90% cache hit rate. Origin handles only 10% of traffic. Massive cost saving.', 6);

  s.nodes[2].cached = false;
  s.nodes[2].ttl = 0;
  s.nodes[2].state = 'warn';
  s.events.push({ type: 'warn', msg: 'Cache purge: /hero.jpg invalidated (new deploy)' });
  snap(steps, s, 'Deploy new version: CDN cache purged via API. Next request fetches fresh from origin.', 7);

  return steps;
}

const CODE = [
  '# CDN cache control headers',
  'Cache-Control: public, max-age=3600',
  '# Invalidation via API',
  'curl -X POST cdn/purge \\',
  '  -d "url=/hero.jpg"',
  '# Edge config (Cloudflare)',
  'cache_ttl: 3600',
  'stale_while_revalidate: 60',
  'cache_key: host+url',
];

const LAYERS = [
  { label: 'Clients',  x1: 5,   x2: 165, color: 'rgba(100,140,255,0.06)', border: 'rgba(100,140,255,0.30)' },
  { label: 'CDN Edge', x1: 175, x2: 385, color: 'rgba(255,160,50,0.06)',  border: 'rgba(255,160,50,0.35)'  },
  { label: 'Origin',   x1: 395, x2: 580, color: 'rgba(60,200,120,0.06)',  border: 'rgba(60,200,120,0.28)'  },
];

export default {
  id: 'cdn',
  label: 'CDN',
  icon: '🌐',
  layers: LAYERS,
  build: buildCDNSteps,
  code: CODE,
  language: 'HTTP/nginx',
  metrics: [
    { key: 'requests', label: 'Requests',  max: 10,   color: 'var(--node-default)' },
    { key: 'edgeHits', label: 'Edge Hits', max: 10,   color: 'var(--pod-running)' },
    { key: 'savedMs',  label: 'Saved(ms)', max: 1200, unit: 'ms', color: 'var(--node-comparing)' },
  ],
};

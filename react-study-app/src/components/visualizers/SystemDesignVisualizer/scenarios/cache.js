import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../sd-types';
const _mk = createNodeFactory(ICONS);
const clientNode = _mk('client');
const serverNode = _mk('server');
const cacheNode = _mk('cache');
const dbNode = _mk('db');

/* ─────────────────────────────────────────────────────────────────────────────
   Cache (Redis LRU) — cache-aside pattern
   Layout: Client (x≈60) · App Server (x≈220) · Redis + DB (x≈400)
───────────────────────────────────────────────────────────────────────────── */
function buildCacheSteps() {
  const steps = [];
  const s = {
    nodes: [
      clientNode('client', 'Client',      60,  150, { desc: 'Requests user data via app server' }),
      serverNode('app',    'App Server',  220, 150, { desc: 'Cache-aside: check Redis first, fall back to DB on miss' }),
      cacheNode ('cache',  'Redis Cache', 400, 60,  { desc: 'Redis LRU · capacity=3 · allkeys-lru eviction · ~1ms latency', capacity: 3, entries: [] }),
      dbNode    ('db',     'PostgreSQL',  400, 240, { desc: 'PostgreSQL — source of truth · ~20ms read latency' }),
    ],
    edges: [
      { from: 'client', to: 'app',   protocol: 'HTTP' },
      { from: 'app',    to: 'cache', protocol: 'Redis' },
      { from: 'app',    to: 'db',    protocol: 'SQL' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, hits: 0, misses: 0, hitRate: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'Cache-aside pattern: app checks Redis first, falls back to PostgreSQL on miss.', 1);

  s.nodes[0].state = 'active';
  s.nodes[1].state = 'active';
  s.packets = [packet('client', 'app', 'GET user:1', 'request')];
  s.metrics.requests = 1;
  snap(steps, s, 'Client requests user:1. App checks Redis cache first.', 2);

  s.packets = [packet('app', 'cache', 'GET user:1', 'request')];
  s.activeEdge = 'app-cache';
  s.nodes[2].state = 'active';
  snap(steps, s, 'Cache lookup: user:1. Not found — CACHE MISS.', 3);

  s.packets = [packet('app', 'db', 'SELECT * WHERE id=1', 'request')];
  s.activeEdge = 'app-db';
  s.nodes[3].state = 'active';
  s.events.push({ type: 'warn', msg: 'Cache MISS user:1 → fallback to DB' });
  s.metrics.misses = 1;
  snap(steps, s, 'Cache miss → query PostgreSQL. Slower path. Latency: ~20ms.', 4);

  s.nodes[2].entries = [{ key: 'user:1', ttl: 300 }];
  s.nodes[2].state = 'ok';
  s.events.push({ type: 'ok', msg: 'user:1 stored in Redis (TTL 300s)' });
  s.packets = [packet('db', 'app', '{id:1, name:"Alice"}', 'response')];
  snap(steps, s, 'DB returns data. App stores in Redis with TTL=300s for future requests.', 5);

  s.nodes[0].state = 'active';
  s.packets = [packet('app', 'cache', 'GET user:1', 'request')];
  s.activeEdge = 'app-cache';
  s.metrics.requests = 2; s.metrics.hits = 1;
  s.metrics.hitRate = 50;
  snap(steps, s, 'Same request again: user:1. Check Redis…', 3);

  s.nodes[2].state = 'ok';
  s.packets = [packet('cache', 'app', '{id:1, name:"Alice"}', 'response')];
  s.events.push({ type: 'ok', msg: 'Cache HIT user:1 — served from Redis in ~1ms' });
  snap(steps, s, 'CACHE HIT! Served from Redis. No DB query. Latency: ~1ms vs 20ms.', 6);

  s.nodes[2].entries = [{ key: 'user:1', ttl: 290 }, { key: 'user:2', ttl: 300 }, { key: 'user:3', ttl: 300 }];
  s.metrics.requests = 4; s.metrics.hits = 3; s.metrics.hitRate = 75;
  s.events.push({ type: 'info', msg: 'Cache full (capacity=3)' });
  snap(steps, s, 'Cache at capacity (3 entries). Next insert triggers LRU eviction.', 7);

  s.nodes[2].entries = [{ key: 'user:2', ttl: 270 }, { key: 'user:3', ttl: 290 }, { key: 'user:4', ttl: 300 }];
  s.events.push({ type: 'warn', msg: 'LRU evict: user:1 (least recently used)' });
  snap(steps, s, 'user:4 inserted. LRU evicts user:1 (oldest access). Cache stays bounded.', 8);

  return steps;
}

const CODE = [
  '// Cache-aside pattern',
  'async get(key) {',
  '  let val = await redis.get(key);',
  '  if (val) return val; // HIT',
  '  val = await db.query(key); // MISS',
  '  await redis.set(key, val, { EX: 300 });',
  '  return val;',
  '}',
  '// LRU: maxmemory-policy',
  '// allkeys-lru',
];

const LAYERS = [
  { label: 'Client',     x1: 5,   x2: 132, color: 'rgba(100,140,255,0.06)', border: 'rgba(100,140,255,0.30)' },
  { label: 'App Server', x1: 142, x2: 308, color: 'rgba(255,160,50,0.06)',  border: 'rgba(255,160,50,0.35)'  },
  { label: 'Data Layer', x1: 318, x2: 480, color: 'rgba(60,200,120,0.06)',  border: 'rgba(60,200,120,0.28)'  },
];

export default {
  id: 'cache',
  label: 'Caching',
  icon: '💾',
  layers: LAYERS,
  build: buildCacheSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'requests', label: 'Requests', max: 10,  color: 'var(--node-default)' },
    { key: 'hitRate',  label: 'Hit Rate', max: 100, unit: '%', color: 'var(--pod-running)' },
    { key: 'misses',   label: 'Misses',   max: 5,   color: 'var(--pod-crash)' },
  ],
};

export function buildSDSteps(scenario = 'lb') {
  if (scenario === 'lb')    return buildLBSteps();
  if (scenario === 'cache') return buildCacheSteps();
  if (scenario === 'cdn')   return buildCDNSteps();
  if (scenario === 'raft')  return buildRaftSteps();
  return buildLBSteps();
}

function snap(steps, state, narration, codeLine = null) {
  steps.push({ ...JSON.parse(JSON.stringify(state)), narration, codeLine, complexity: { ops: steps.length + 1, label: 'distributed', space: 'O(nodes)' } });
}

/* ── helpers ── */
const node   = (id, label, type, x, y, extra = {}) => ({ id, label, type, x, y, state: 'idle', ...extra });
const packet = (from, to, label, type = 'request') => ({ from, to, label, type, id: `${from}-${to}-${Math.random().toString(36).slice(2,6)}` });

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

/* ────────────────────────────────────────────
   SCENARIO 2 — Cache (Redis LRU)
   ──────────────────────────────────────────── */
function buildCacheSteps() {
  const steps = [];
  const s = {
    nodes: [
      node('client', 'Client', 'client', 60, 150),
      node('app', 'App Server', 'server', 220, 150),
      node('cache', 'Redis Cache', 'cache', 400, 60, { capacity: 3, entries: [] }),
      node('db', 'PostgreSQL', 'db', 400, 240, {}),
    ],
    edges: [
      { from: 'client', to: 'app' },
      { from: 'app', to: 'cache' },
      { from: 'app', to: 'db' },
    ],
    packets: [],
    events: [],
    metrics: { requests: 0, hits: 0, misses: 0, hitRate: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'Cache-aside pattern: app checks Redis first, falls back to PostgreSQL.', 1);

  // Request user:1 — cache miss
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

  // Request user:1 again — cache HIT
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

  // Fill cache — LRU eviction
  s.nodes[2].entries = [{ key: 'user:1', ttl: 290 }, { key: 'user:2', ttl: 300 }, { key: 'user:3', ttl: 300 }];
  s.metrics.requests = 4; s.metrics.hits = 3; s.metrics.hitRate = 75;
  s.events.push({ type: 'info', msg: 'Cache full (capacity=3)' });
  snap(steps, s, 'Cache at capacity (3 entries). Next insert triggers LRU eviction.', 7);

  s.nodes[2].entries = [{ key: 'user:2', ttl: 270 }, { key: 'user:3', ttl: 290 }, { key: 'user:4', ttl: 300 }];
  s.events.push({ type: 'warn', msg: 'LRU evict: user:1 (least recently used)' });
  snap(steps, s, 'user:4 inserted. LRU evicts user:1 (oldest access). Cache stays bounded.', 8);

  return steps;
}

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

/* ────────────────────────────────────────────
   SCENARIO 4 — Raft Consensus
   ──────────────────────────────────────────── */
function buildRaftSteps() {
  const steps = [];

  const makeNode = (id, label, role, x, y) =>
    ({ id, label, type: 'raft', role, x, y, state: 'idle', term: 0, voted: false, log: [] });

  const s = {
    nodes: [
      makeNode('n0', 'Node 0', 'follower', 310, 50),
      makeNode('n1', 'Node 1', 'follower', 510, 200),
      makeNode('n2', 'Node 2', 'follower', 420, 350),
      makeNode('n3', 'Node 3', 'follower', 200, 350),
      makeNode('n4', 'Node 4', 'follower', 110, 200),
    ],
    edges: [
      { from: 'n0', to: 'n1' }, { from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' }, { from: 'n4', to: 'n0' },
      { from: 'n0', to: 'n2' }, { from: 'n0', to: 'n3' }, { from: 'n1', to: 'n4' },
    ],
    packets: [],
    events: [],
    metrics: { term: 0, leader: 'none', committed: 0, nodes: 5 },
    activeEdge: null,
  };

  snap(steps, s, 'Raft: 5 nodes, all followers. No leader. Cluster starts election.', 1);

  // Election timeout — n0 becomes candidate
  s.nodes[0].role = 'candidate';
  s.nodes[0].state = 'active';
  s.nodes[0].term = 1;
  s.metrics.term = 1;
  s.events.push({ type: 'info', msg: 'Node 0 election timeout → becomes Candidate (term 1)' });
  snap(steps, s, 'Node 0 election timeout fires. Increments term to 1. Sends RequestVote to all peers.', 2);

  // RequestVote broadcast
  s.packets = ['n1','n2','n3','n4'].map((to) => packet('n0', to, 'RequestVote(1)', 'replication'));
  s.events.push({ type: 'info', msg: 'Node 0 broadcasts RequestVote(term=1)' });
  snap(steps, s, 'RequestVote RPC sent to all 4 peers. Each follower grants vote if term > their term.', 3);

  // Votes granted
  ['n1','n2','n3','n4'].forEach((id, i) => {
    s.nodes[i + 1].voted = true;
    s.nodes[i + 1].term = 1;
  });
  s.packets = ['n1','n2','n3','n4'].map((from) => packet(from, 'n0', 'VoteGranted', 'replication'));
  s.events.push({ type: 'ok', msg: '4/4 votes granted → Node 0 wins majority (5/2+1=3)' });
  snap(steps, s, 'Node 0 wins 4 votes (needs 3 for majority of 5). Elected LEADER.', 4);

  // n0 becomes leader
  s.nodes[0].role = 'leader';
  s.nodes[0].state = 'ok';
  s.packets = [];
  s.metrics.leader = 'Node 0';
  s.events.push({ type: 'ok', msg: 'Node 0 elected Leader (term 1). Sends heartbeats.' });
  snap(steps, s, 'Node 0 is Leader. Sends periodic heartbeats (AppendEntries RPC) to prevent re-election.', 5);

  // Log replication — client write
  s.nodes[0].log = [{ idx: 1, cmd: 'SET x=42', committed: false }];
  s.packets = ['n1','n2','n3','n4'].map((to) => packet('n0', to, 'AppendEntries[SET x=42]', 'replication'));
  s.events.push({ type: 'info', msg: 'Client write: SET x=42. Leader appends to log.' });
  snap(steps, s, 'Client sends SET x=42. Leader appends to local log, replicates to followers.', 6);

  // Majority ACK
  ['n1','n2'].forEach((id) => {
    const n = s.nodes.find((nd) => nd.id === id);
    n.log = [{ idx: 1, cmd: 'SET x=42', committed: false }];
  });
  s.events.push({ type: 'ok', msg: 'Majority (3 nodes) replicated. Leader commits.' });
  snap(steps, s, 'Majority (n0+n1+n2 = 3) acknowledged. Leader commits entry. Durable.', 7);

  s.nodes[0].log[0].committed = true;
  s.metrics.committed = 1;
  s.events.push({ type: 'ok', msg: 'Entry committed. Respond to client: success.' });
  snap(steps, s, 'Entry committed across majority. Client gets success. Eventual consistency for remaining followers.', 8);

  // Leader failure
  s.nodes[0].role = 'follower';
  s.nodes[0].state = 'error';
  s.metrics.leader = 'none';
  s.events.push({ type: 'error', msg: 'Node 0 crashes! New election triggered.' });
  snap(steps, s, 'Node 0 (Leader) crashes. Followers detect missing heartbeat. New election starts.', 9);

  // n1 wins new election
  s.nodes[1].role = 'candidate';
  s.nodes[1].term = 2;
  s.metrics.term = 2;
  snap(steps, s, 'Node 1 times out first → becomes candidate (term 2). Wins election. Cluster recovers.', 10);

  return steps;
}

/* ── CODE panels ── */
export const SD_CODE = {
  lb: [
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
  ],
  cache: [
    '// Cache-aside pattern',
    'async get(key) {',
    '  let val = await redis.get(key);',
    '  if (val) return val; // HIT',
    '  val = await db.query(key); // MISS',
    '  await redis.set(key, val, { EX: 300 });',
    '  return val;',
    '}',
    '// LRU eviction: maxmemory-policy',
    '// allkeys-lru',
  ],
  cdn: [
    '# CDN cache control',
    'Cache-Control: public, max-age=3600',
    '# Invalidation',
    'curl -X POST cdn/purge \\',
    '  -d "url=/hero.jpg"',
    '# Edge config (Cloudflare)',
    'cache_ttl: 3600',
    'stale_while_revalidate: 60',
    'cache_key: host+url',
  ],
  raft: [
    '// Raft leader election',
    'if (electionTimeout) {',
    '  term++; role = CANDIDATE;',
    '  broadcast(RequestVote{term});',
    '}',
    '// Log replication',
    'if (leader) {',
    '  log.append(entry);',
    '  broadcast(AppendEntries);',
    '  if (majority_ack) commit();',
    '}',
  ],
};

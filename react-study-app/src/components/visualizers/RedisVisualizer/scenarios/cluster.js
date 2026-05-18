import { snap } from './shared';

function buildClusterSteps() {
  const steps = [];

  const makeState = () => ({
    nodes: [
      { id: 'M1', role: 'master',  slots: [0, 5460],    keys: 0,  state: 'ok', replicaOf: null },
      { id: 'M2', role: 'master',  slots: [5461, 10922], keys: 0,  state: 'ok', replicaOf: null },
      { id: 'M3', role: 'master',  slots: [10923, 16383], keys: 0, state: 'ok', replicaOf: null },
      { id: 'R1', role: 'replica', slots: [0, 5460],    keys: 0,  state: 'ok', replicaOf: 'M1' },
      { id: 'R2', role: 'replica', slots: [5461, 10922], keys: 0,  state: 'ok', replicaOf: 'M2' },
      { id: 'R3', role: 'replica', slots: [10923, 16383], keys: 0, state: 'ok', replicaOf: 'M3' },
    ],
    hashSlot: null,
    key: null,
    targetNode: null,
    events: [],
    metrics: { totalKeys: 0, activeNodes: 6, failovers: 0 },
    vars: { key: '', slot: 0, node: '', replicas: 1 },
  });

  const s = makeState();

  snap(steps, s, 'Redis Cluster: 3 masters + 3 replicas. Hash slots 0-16383 evenly distributed. Each key maps to a slot via CRC16.', 1, 'O(1) routing');

  // Show slot distribution
  s.events.push({ type: 'info', msg: 'M1: slots 0-5460 | M2: slots 5461-10922 | M3: slots 10923-16383' });
  snap(steps, s, 'Slot distribution: M1 owns 5461 slots, M2 owns 5462 slots, M3 owns 5461 slots. Balanced shard ring.', 2, 'O(1) routing');

  // Key routing: user:42
  s.key = 'user:42';
  s.hashSlot = 7483;
  s.events.push({ type: 'info', msg: 'HASH_SLOT("user:42") = CRC16("user:42") % 16384 = 7483' });
  s.vars = { key: 'user:42', slot: 7483, node: '', replicas: 1 };
  snap(steps, s, 'SET user:42 → compute hash slot: CRC16("user:42") % 16384 = 7483. Which node owns slot 7483?', 3, 'O(1) hash');

  s.targetNode = 'M2';
  s.nodes[1].state = 'active';
  s.events.push({ type: 'ok', msg: 'Slot 7483 → M2 (slots 5461-10922)' });
  s.vars = { key: 'user:42', slot: 7483, node: 'M2', replicas: 1 };
  snap(steps, s, 'Slot 7483 falls in M2 range (5461-10922). Client routes SET command directly to M2. No proxy needed!', 4, 'O(1) routing');

  s.nodes[1].keys += 1;
  s.metrics.totalKeys = 1;
  snap(steps, s, 'Key "user:42" stored on M2. R2 (replica of M2) asynchronously replicates the write.', 5, 'O(1) write');

  s.nodes[1].state = 'ok';
  s.nodes[4].state = 'active';
  snap(steps, s, 'R2 replicates M2\'s data. Replication is asynchronous — R2 handles read traffic to scale reads.', 6, 'O(1) replicate');
  s.nodes[4].state = 'ok';

  // More keys
  s.key = 'session:tok1';
  s.hashSlot = 12439;
  s.targetNode = 'M3';
  s.nodes[2].state = 'active';
  s.events.push({ type: 'info', msg: 'HASH_SLOT("session:tok1") = 12439 → M3' });
  s.vars = { key: 'session:tok1', slot: 12439, node: 'M3', replicas: 1 };
  snap(steps, s, 'SET session:tok1 → slot 12439 → M3. Each key independently routed to correct shard.', 7, 'O(1) routing');

  s.nodes[2].keys += 1;
  s.metrics.totalKeys = 2;
  s.nodes[2].state = 'ok';

  s.key = 'counter:hits';
  s.hashSlot = 2017;
  s.targetNode = 'M1';
  s.nodes[0].state = 'active';
  s.events.push({ type: 'info', msg: 'HASH_SLOT("counter:hits") = 2017 → M1' });
  s.vars = { key: 'counter:hits', slot: 2017, node: 'M1', replicas: 1 };
  snap(steps, s, 'INCR counter:hits → slot 2017 → M1. Cluster scales horizontally: more masters = more throughput.', 8, 'O(1) routing');

  s.nodes[0].keys += 1;
  s.metrics.totalKeys = 3;
  s.nodes[0].state = 'ok';

  // Failover simulation
  s.nodes[1].state = 'down';
  s.events.push({ type: 'error', msg: '⚠ M2 node down! Cluster detects failure via gossip protocol.' });
  s.vars = { key: 'user:42', slot: 7483, node: 'M2 (DOWN)', replicas: 1 };
  snap(steps, s, 'M2 goes down! Cluster gossip protocol detects failure within seconds. Failover to R2 begins.', 9, 'O(1) detect');

  s.nodes[1].state = 'down';
  s.nodes[4].role = 'master';
  s.nodes[4].state = 'ok';
  s.metrics.activeNodes = 6;
  s.metrics.failovers = 1;
  s.events.push({ type: 'ok', msg: 'R2 promoted to master! Slot range 5461-10922 now served by R2.' });
  s.vars = { key: 'user:42', slot: 7483, node: 'R2 (promoted)', replicas: 0 };
  snap(steps, s, 'R2 promoted to master. Slots 5461-10922 now served by R2. Zero data loss for acknowledged writes. Automatic failover!', 10, 'O(1) failover');

  return steps;
}

export const CLUSTER_CODE = [
  '# Create cluster (3 masters + 3 replicas)',
  'redis-cli --cluster create \\',
  '  127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 \\',
  '  127.0.0.1:7004 127.0.0.1:7005 127.0.0.1:7006 \\',
  '  --cluster-replicas 1',
  '',
  '# Hash slot formula',
  'slot = CRC16(key) % 16384',
  '',
  '# Key routing (client handles this)',
  '# redis-py / Jedis cluster client',
  'cluster.set("user:42", "Alice")',
  '# Client computes slot=7483 → connects to M2',
  '',
  '# Hash tags for co-location',
  '# {user}.session and {user}.profile → same slot',
  'SET {user:42}.name "Alice"',
  'SET {user:42}.age  "30"',
  '',
  '# Check cluster status',
  'CLUSTER INFO',
  'CLUSTER NODES',
  'CLUSTER KEYSLOT user:42   # → 7483',
];

export default {
  id: 'cluster',
  label: 'Redis Cluster',
  icon: '🌐',
  build: buildClusterSteps,
  code: CLUSTER_CODE,
  language: 'Redis',
  metrics: [
    { key: 'totalKeys',   label: 'Total Keys',   max: 10, color: 'var(--node-active)' },
    { key: 'activeNodes', label: 'Active Nodes', max: 6,  color: 'var(--pod-running)' },
    { key: 'failovers',   label: 'Failovers',    max: 3,  color: 'var(--pod-crash)', warn: 30, critical: 60 },
  ],
};

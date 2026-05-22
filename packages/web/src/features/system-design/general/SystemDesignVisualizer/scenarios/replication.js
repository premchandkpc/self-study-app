import { snap, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../../sd-types';
const _mk = createNodeFactory(ICONS);
const clientNode = _mk('client');
const dbNode = _mk('db');

/* ─────────────────────────────────────────────────────────────────────────────
   Database Replication — master-slave read scaling
   Layout: Client (x≈100) · Master (x≈250) · Replicas (x≈400+)
───────────────────────────────────────────────────────────────────────────── */
function buildReplicationSteps() {
  const steps = [];
  const s = {
    nodes: [
      clientNode ('client',    'Client',            100,  190, { desc: 'Writes to master, reads from replicas' }),
      dbNode     ('master',    'Master (Primary)',  250,  190, { desc: 'Single source of truth, logs all writes' }),
      dbNode     ('replica_1', 'Replica 1',         400,  80,  { desc: 'Read-only, applies binlog' }),
      dbNode     ('replica_2', 'Replica 2',         400,  300, { desc: 'Read-only, applies binlog' }),
    ],
    edges: [
      { from: 'client',    to: 'master',    protocol: 'SQL', desc: 'INSERT/UPDATE/DELETE' },
      { from: 'client',    to: 'replica_1', protocol: 'SQL', desc: 'SELECT (read-only)' },
      { from: 'client',    to: 'replica_2', protocol: 'SQL', desc: 'SELECT (read-only)' },
      { from: 'master',    to: 'replica_1', protocol: 'Binlog', async: true, desc: 'Replication lag: 100ms' },
      { from: 'master',    to: 'replica_2', protocol: 'Binlog', async: true, desc: 'Replication lag: 100ms' },
    ],
    packets: [],
    events: [],
    metrics: { writes: 0, reads: 0, replicationLag: 0 },
  };

  snap(steps, s, 'Master-Slave Replication: Master accepts writes, replicas handle reads. Asynchronous binlog streaming.', 1);

  s.nodes.find((n) => n.id === 'client').state = 'active';
  s.nodes.find((n) => n.id === 'master').state = 'active';
  s.packets = [packet('client', 'master', 'INSERT user')];
  s.metrics.writes = 1;
  s.events.push({ type: 'ok', msg: 'Write: INSERT INTO users VALUES(...). Master commits to disk.' });
  snap(steps, s, 'Client writes to master. Master persists to binlog. Returns immediately (durability via WAL).', 2);

  s.nodes.find((n) => n.id === 'replica_1').state = 'active';
  s.nodes.find((n) => n.id === 'replica_2').state = 'active';
  s.packets = [
    packet('master', 'replica_1', 'binlog'),
    packet('master', 'replica_2', 'binlog'),
  ];
  s.metrics.replicationLag = 100;
  s.events.push({ type: 'ok', msg: 'Binlog streamed to replicas asynchronously. Lag: 100ms.' });
  snap(steps, s, 'Replicas read master binlog. Apply writes (INSERT) to own copy. Lag = network latency + apply time.', 3);

  s.packets = [];
  s.nodes.find((n) => n.id === 'replica_1').state = 'active';
  s.metrics.reads = 2;
  s.events.push({ type: 'ok', msg: 'Read load balances to replicas. Replica 1: SELECT * FROM users (O(log n))' });
  snap(steps, s, 'Client reads from replica 1. No contention with writes on master. Read scaling = add replicas.', 4);

  s.nodes.find((n) => n.id === 'replica_2').state = 'active';
  s.metrics.reads = 4;
  s.events.push({ type: 'ok', msg: 'High traffic: Both replicas serving reads. Write throughput unaffected.' });
  snap(steps, s, 'Multiple replicas balance read load. Write throughput limited by master only. 100x read scaling typical.', 5);

  s.nodes.find((n) => n.id === 'replica_1').state = 'error';
  s.nodes.find((n) => n.id === 'master').state = 'warn';
  s.packets = [];
  s.metrics.replicationLag = 5000;
  s.events.push({ type: 'error', msg: 'Replica 1 lagged: 5 seconds behind master. Network issue detected.' });
  snap(steps, s, 'Network lag detected. Replica 1 falls 5 seconds behind. Stale reads possible. Client should use master for recent data.', 6);

  s.nodes.find((n) => n.id === 'replica_1').state = 'active';
  s.nodes.find((n) => n.id === 'master').state = 'active';
  s.metrics.replicationLag = 50;
  s.events.push({ type: 'ok', msg: 'Replica 1 caught up. Lag: 50ms. Both replicas healthy.' });
  snap(steps, s, 'Replica recovered. Reads resume. Replication lag < 100ms = acceptable for eventual consistency.', 7);

  return steps;
}

const CODE = [
  '// Master: Write-ahead logging (WAL)',
  'BEGIN;',
  'INSERT INTO users VALUES(42, "Alice", NOW());',
  'INSERT INTO audit_log VALUES(...);',
  'COMMIT; -- flush to disk + binlog',
  '',
  '// Binlog format (statement/row/mixed)',
  '// Format: WRITE_ROWS_EVENT',
  'table_id=5, flags=STMT_END_F',
  'columns_before_image=[id, name, created_at]',
  'row_data=[42, "Alice", 1716205800]',
  '',
  '// Replica: Single-threaded or parallel apply',
  'IO_THREAD: fetch binlog from master',
  'SQL_THREAD: apply to local DB',
  '',
  '// Monitoring',
  'SHOW SLAVE STATUS \\G',
  '-- Seconds_Behind_Master: 0.05 sec',
  '-- Relay_Log_Pos: 1234567',
];

const LAYERS = [
  { label: 'Application',     x1: 5,   x2: 150, color: 'rgba(100,140,255,0.06)', border: 'rgba(100,140,255,0.30)' },
  { label: 'Master',          x1: 160, x2: 310, color: 'rgba(255,160,50,0.06)',  border: 'rgba(255,160,50,0.35)'  },
  { label: 'Replicas (RO)',   x1: 350, x2: 520, color: 'rgba(60,200,120,0.06)',  border: 'rgba(60,200,120,0.28)'  },
];

export default {
  id: 'replication',
  label: 'Database Replication',
  icon: '🔄',
  layers: LAYERS,
  build: buildReplicationSteps,
  code: CODE,
  language: 'SQL',
  metrics: [
    { key: 'writes',           label: 'Writes/sec',  max: 100, color: 'var(--pod-crash)' },
    { key: 'reads',            label: 'Reads/sec',   max: 500, color: 'var(--pod-running)' },
    { key: 'replicationLag',   label: 'Lag (ms)',    max: 5000, color: 'var(--node-comparing)' },
  ],
  codeNotes: [
    { title: 'Binlog Streaming', content: 'Master writes all changes to binlog (binary transaction log). Replicas pull via IO_THREAD, apply via SQL_THREAD. Asynchronous: master doesn\'t wait for replica ACK.' },
    { title: 'Replication Lag', content: 'Typical: <100ms (network round-trip). Under heavy load: 5-30s possible. Lag = IO_THREAD lag + SQL_THREAD lag. IO fast, SQL single-threaded = bottleneck.' },
    { title: 'Write-Ahead Logging (WAL)', content: 'Master commits to binlog BEFORE returning success. Durable on disk in ~1-10ms. Replicas apply same writes; ordering preserved via GTIDs.' },
    { title: 'GTID vs Binlog File+Position', content: 'GTIDs (Global Transaction ID) track universally; enables multi-master, easy failover. Binlog position is fragile: sync fails if positions mismatch.' },
  ],
  tradeoffs: [
    { pro: 'Asynchronous replication = master not blocked', con: 'Replica crash-safe but replica data can lag 10s+. Failover to stale replica = recent writes lost.' },
    { pro: 'Read scaling: 1 master + 10 replicas = 100x read throughput', con: 'Writes still single-threaded on master. Write scaling needs sharding.' },
    { pro: 'Simple operational model; mature tooling (Percona XtraBackup)', con: 'Manual failover needed; no automatic detection of best replica to promote.' },
    { pro: 'Works across data centers', con: 'Lag grows with network distance. Remote replica: 100ms+ lag (2PC worse: 500ms round-trip).' },
  ],
  bestPractices: [
    'Use GTIDs (MySQL 5.6+) over binlog file+position. Enables easier replication setup and failover automation.',
    'Monitor SHOW SLAVE STATUS \\G; alert if Seconds_Behind_Master > 10s. Lag >30s indicates replica overload or network issue.',
    'Set innodb_flush_log_at_trx_commit = 1 for durability (sync every commit). Safer than setting=2 (fsync every second).',
    'On replica, set read_only=1 to prevent accidental writes. Require SUPER privilege to disable (protects against accidents).',
    'For failover, promote replica with least lag. Parallel replication (slave_parallel_workers=8) helps SQL_THREAD keep up; requires MySQL 5.7+.',
  ],
};


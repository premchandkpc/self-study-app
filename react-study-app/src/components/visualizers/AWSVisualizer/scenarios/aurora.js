import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildAuroraSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('client', 'Client App', 'client', 30, 210, { desc: 'Application connecting to the database. Read-heavy workload with dashboards and reports.' }),
      svc('lambda', 'Lambda', 'lambda', 180, 210, { desc: 'Serverless compute connecting to Aurora via RDS Proxy. No DB passwords in code — uses IAM auth.', runtime: 'nodejs20.x', mem: 512 }),
      svc('proxy', 'RDS Proxy', 'db', 330, 210, { desc: 'Connection pool between Lambda and Aurora. Maintains warm connections, prevents "too many connections" errors. Handles IAM auth, credentials rotation.', poolSize: 100, engine: 'Aurora MySQL' }),
      svc('writer', 'Writer (Primary)', 'db', 480, 120, { desc: 'Handles all write operations. Auto-healing hardware. If fails, Aurora auto-failover promotes a reader in ~30s. No data loss.', instanceClass: 'db.r6g.large', vcpu: 2, ram: 16, storage: '100GB Aurora' }),
      svc('reader', 'Reader (Replica)', 'db', 480, 280, { desc: 'Read-only endpoint. Aurora supports up to 15 readers. Auto-scales read traffic. Reader endpoint DNS round-robins across all replicas.', instances: 3, storage: 'shared with writer' }),
      svc('cw', 'CloudWatch', 'server', 630, 60, { desc: 'Enhanced Monitoring + Performance Insights. OS-level metrics every second. Query execution plans. Top SQL by load in real time.', metrics: '50+ OS metrics', retention: '2 years' }),
      svc('s3', 'Backup S3', 'server', 630, 340, { desc: 'Automatic backups to S3. Retention up to 35 days. Manual snapshots kept indefinitely. Backtrack lets you rewind in-place without restoring from backup.', retention: '35d auto + manual' }),
    ],
    edges: [
      { from: 'client', to: 'lambda' },
      { from: 'lambda', to: 'proxy' },
      { from: 'proxy', to: 'writer' },
      { from: 'proxy', to: 'reader' },
      { from: 'writer', to: 'reader' },
      { from: 'writer', to: 'cw' },
      { from: 'writer', to: 's3' },
    ],
    packets: [],
    events: [],
    metrics: { connections: 0, queries: 0, readLatency: 0, writeLatency: 0, failovers: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'Aurora: AWS-managed relational database. MySQL/PostgreSQL compatible. 6 copies across 3 AZs. Storage auto-scales 10GB-128TB. Failover ~30s with no data loss.', 1);

  s.nodes[0].state = 'active';
  s.packets = [pkt('client', 'lambda', 'SELECT * FROM orders')];
  s.events.push({ type: 'info', msg: 'Client request arrives at Lambda. Lambda connects to RDS Proxy via IAM auth.' });
  snap(steps, s, 'Client sends read query. Lambda connects to RDS Proxy using IAM database authentication — no DB password stored in code. Proxy authenticates and returns a pooled connection.', 2);

  s.packets = [pkt('lambda', 'proxy', 'connect via IAM auth'), pkt('proxy', 'reader', 'SELECT')];
  s.nodes[3].state = 'active';
  s.metrics.connections = 1;
  s.events.push({ type: 'ok', msg: 'Proxy checks read/write. SELECT → Reader endpoint (replica).' });
  snap(steps, s, 'RDS Proxy routes SELECT queries to the Reader endpoint. Aurora load-balances across up to 15 replicas. Read replicas share the same storage volume as writer — zero replication lag.', 3);

  s.packets = [];
  s.metrics.queries = 5;
  s.metrics.readLatency = 3;
  s.events.push({ type: 'ok', msg: 'Reader returns results in 3ms. Aurora storage reads from local cache (warm buffer pool).' });
  snap(steps, s, 'Aurora storage: 6 copies across 3 AZs. Storage node layer auto-repairs corrupted pages. Quorum reads mean consistent data. Read replicas don\'t write — they just serve reads from the shared storage volume.', 4);

  s.packets = [pkt('lambda', 'proxy', 'INSERT INTO orders'), pkt('proxy', 'writer', 'INSERT')];
  s.nodes[3].state = 'error';
  s.events.push({ type: 'warn', msg: 'WRITE → Writer endpoint (primary). Writer failure simulation incoming.' });
  snap(steps, s, 'INSERT goes to Writer endpoint. The primary instance handles all DDL/DML. Aurora writes to 4/6 storage copies before acknowledging (quorum write). If the writer crashes next step → auto-failover.', 5);

  s.nodes[3].state = 'idle';
  s.nodes[4].state = 'active';
  s.metrics.failovers = 1;
  s.events.push({ type: 'error', msg: 'Writer instance fails! Aurora detects within 1s. Failover starts — reader promoted to writer in ~30s.' });
  snap(steps, s, 'Writer instance crashes. Aurora DB cluster detects failure. Failover: the highest-priority reader is promoted to writer. DNS endpoint updates automatically. Client connections drop briefly then reconnect. No data loss — storage is shared and durable.', 6);

  s.nodes[3].state = 'active';
  s.nodes[4].state = 'idle';
  s.events.push({ type: 'ok', msg: 'New writer active. Failover completed (~30s). Old writer becomes new reader after recovery.' });
  snap(steps, s, 'Failover complete. Former reader is now the writer. Old writer comes back as a reader. Application reconnects and continues. Aurora typical failover: 30s average. Compare to EBS-based RDS MySQL: 1-2 minutes.', 7);

  s.nodes[5].state = 'active';
  s.events.push({ type: 'info', msg: 'Performance Insights: top SQL = "SELECT * FROM orders" 45% of load. Average active sessions: 2.3.' });
  snap(steps, s, 'Performance Insights: visualize DB load in real time. Top SQL by load. Average active sessions. Wait events (CPU, IO, lock, commit). Identify bottlenecks instantly without custom monitoring. Free with Enhanced Monitoring.', 8);

  s.packets = [pkt('writer', 's3', 'snapshot', 'response')];
  s.events.push({ type: 'ok', msg: 'Automated backup to S3. Point-in-time recovery to any second within retention period (1-35 days).' });
  snap(steps, s, 'Aurora backs up automatically to S3 every 5 minutes. No performance impact. Restore to any point in time within retention (1-35 days). Cross-region snapshot copy for DR. Backtrack: rewind cluster in-place to a specific time without restoring from backup.', 9);

  s.nodes[6].state = 'active';
  s.events.push({ type: 'ok', msg: 'Global Database: 1s replication to secondary region. 1-click promote for regional failover. RTO <1min.' });
  snap(steps, s, 'Aurora Global Database: primary region replicates to up to 5 secondary regions with ~1s lag (tests show 200-800ms typically). For cross-region DR: promote secondary to primary in <1min. Writes continue in secondary after promotion.', 10);

  s.packets = [];
  s.events.push({ type: 'info', msg: 'Cluster auto-scaling: storage grows from 10GB to 128TB. No downtime. Pay only for storage used. IOPS: up to 256K.' });
  snap(steps, s, 'Aurora storage features: auto-scaling 10GB-128TB (no fragmentation, no downtime). IOPS burstable to 256K. Storage compression (inline). Encryption at rest (KMS) and in transit (TLS). Zero-ETL integration with Redshift for analytics queries.', 11);

  s.events.push({ type: 'info', msg: 'RDS Proxy connection pooling: Lambda reuses 20 connections instead of creating 1000+ per scale event. Prevents connection storms.' });
  snap(steps, s, 'RDS Proxy benefits: Lambda scales to 1000 concurrent → without proxy = 1000+ connections to DB (too many). With proxy: Lambda connects locally to proxy, proxy maintains a small warm pool (e.g., 20 connections). No more "too many connections" errors. IAM auth eliminates DB passwords. Proxy is also AZ-aware — routes to same AZ.', 12);

  s.metrics.queries = 50;
  s.events.push({ type: 'ok', msg: 'Key Aurora features: 6-copy storage, 15 read replicas, 30s failover, Global DB, Backtrack, Performance Insights, zero-ETL Redshift.' });
  snap(steps, s, 'Aurora summary: MySQL/PostgreSQL compatibility, 6 copies across 3 AZs for durability, up to 15 read replicas with zero lag, failover in ~30s, auto-scaling storage 10GB-128TB, Global DB for multi-region DR. Use Aurora for production relational workloads. Use RDS for simpler, smaller, or non-MySQL/Postgres workloads.', 13);

  return steps;
}

const CODE = [
  '# Create Aurora MySQL cluster',
  'aws rds create-db-cluster',
  '  --db-cluster-identifier mycluster',
  '  --engine aurora-mysql',
  '  --engine-version 8.0.mysql_aurora.3.05.0',
  '  --master-username admin',
  '  --master-user-password ********',
  '  --backup-retention-period 35',
  '  --storage-encrypted',
  '  --db-subnet-group-name my-subnet-group',
  '# Create writer instance',
  'aws rds create-db-instance',
  '  --db-instance-identifier mycluster-writer',
  '  --db-cluster-identifier mycluster',
  '  --db-instance-class db.r6g.large',
  '  --engine aurora-mysql',
  '# Create 2 reader instances',
  'aws rds create-db-instance',
  '  --db-instance-identifier mycluster-reader-1',
  '  --db-cluster-identifier mycluster',
  '  --db-instance-class db.r6g.large',
  '  --engine aurora-mysql',
  '  --promotion-tier 1',
  '# Set up RDS Proxy',
  'aws rds create-db-proxy',
  '  --db-proxy-name myproxy',
  '  --engine-family MYSQL',
  '  --auth "[{AuthScheme: SECRETS,SecretArn: arn:aws:secretsmanager:...}]"',
  '  --role-arn arn:aws:iam::...:role/rds-proxy-role',
  '# Performance Insights',
  'aws rds create-db-instance',
  '  --enable-performance-insights',
  '  --performance-insights-retention-period 7',
  '# Failover: promote reader to writer',
  'aws rds failover-db-cluster',
  '  --db-cluster-identifier mycluster',
  '  --target-db-instance-identifier mycluster-reader-1',
  '# Pricing (Aurora MySQL, db.r6g.large, us-east-1)',
  '# Writer: $0.274/hr  Readers: $0.274/hr each',
  '# Storage: $0.10/GB/month  I/O: $0.20/1M requests',
  '# Free backup storage: 100% of DB size',
];

export default {
  id: 'aurora',
  label: 'Aurora / RDS',
  icon: '🗄️',
  build: buildAuroraSteps,
  code: CODE,
  language: 'AWS CLI',
  metrics: [
    { key: 'connections', label: 'Connections', max: 50, color: 'var(--node-default)' },
    { key: 'queries', label: 'Queries', max: 50, color: 'var(--pod-running)' },
    { key: 'readLatency', label: 'Read (ms)', max: 50, unit: 'ms', color: 'var(--node-comparing)' },
    { key: 'writeLatency', label: 'Write (ms)', max: 100, unit: 'ms', color: 'var(--kafka-producer)' },
    { key: 'failovers', label: 'Failovers', max: 5, color: 'var(--pod-crash)' },
  ],
  topicContent: {
    concept: [
      { title: 'Shared Storage Architecture', content: 'Aurora separates compute from storage. All instances share the same storage volume with 6 copies across 3 AZs, allowing zero-lag replicas.' },
      { title: 'Failover and High Availability', content: 'Aurora auto-failover promotes a reader to writer in ~30s with no data loss. The cluster endpoint DNS updates automatically.' },
    ],
    why: ['Database reliability is the backbone of most applications — Aurora\'s 6-copy storage and 30s failover provide enterprise-grade durability without the operational overhead.'],
    interview: [
      { question: 'How is Aurora different from standard RDS MySQL/PostgreSQL?', answer: 'Aurora separates compute from storage with 6 copies across 3 AZs. Storage auto-scales 10GB-128TB. Replicas have zero replication lag (shared storage). Failover is ~30s vs 1-2 minutes for RDS.', followUps: ['What happens to data during an Aurora failover?', 'How many read replicas does Aurora support?'] },
      { question: 'What is Aurora Global Database?', answer: 'Replicates data to up to 5 secondary regions with ~1s lag. Secondary region can be promoted to primary in <1min for cross-region disaster recovery.', followUps: ['How does Global Database replication work?', 'What is the typical RPO for Global Database?'] },
    ],
    gotcha: ['Aurora read replicas share the same storage as the writer — they do NOT add write throughput. Write IOPS are limited by the primary instance.', 'RDS Proxy is strongly recommended with Lambda — without it, Lambda concurrency can exhaust Aurora\'s connection pool with "too many connections" errors.'],
    tradeoffs: [
      { pro: 'MySQL/PostgreSQL compatibility with 5x better performance and similar pricing to commercial databases.', con: 'Not all MySQL/PostgreSQL features are supported (e.g., MyISAM engine, some PL/pgSQL extensions).' },
      { pro: 'Auto-scaling storage and 15 read replicas provide enormous headroom for growth.', con: 'Aurora is more expensive than standard RDS for small workloads with storage under 100GB.' },
    ],
  },
};

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
      { title: 'Shared Storage Architecture — how Aurora separates compute from storage', content: 'Aurora decouples the database compute layer from the storage layer. The storage subsystem is a separate distributed system that maintains six copies of your data across three Availability Zones, with 4 out of 6 copies needed for writes (quorum) and 3 out of 6 for reads. This architecture allows Aurora to have up to 15 read replicas that share the same storage volume with zero replication lag since no data copying between replicas is needed. Storage automatically scales from 10GB up to 128TB in 10GB increments with no downtime, and you only pay for the storage you actually use.' },
      { title: 'Failover and High Availability — sub-minute recovery', content: 'Aurora performs automatic failover in approximately 30 seconds when the primary instance fails. During failover, the cluster endpoint DNS is automatically updated to point to the promoted reader instance, and a new reader is created to replace the promoted one. The shared storage architecture ensures no data loss during failover because all data is already durable in the storage layer across six copies. Failover priority is controlled by promotion tiers — the reader with the lowest tier number is promoted first. You can also trigger manual failover for planned maintenance with zero data loss.' },
      { title: 'Deep — Aurora storage, replication, and Global Database internals', content: 'Aurora\'s storage subsystem handles replication, backup, and recovery transparently. Each 10GB segment of data is replicated six times across three AZs, with continuous backup to S3 every 5 minutes with no performance impact. The writer sends only redo log records to the storage layer, not full data pages — this reduces network traffic by orders of magnitude compared to standard MySQL replication. Read replicas consume the same redo log stream to maintain their buffer cache. Aurora Global Database extends this architecture across regions with dedicated physical replication channels that achieve ~200-800ms typical lag to up to 5 secondary regions, with the ability to promote a secondary to primary in under 1 minute for cross-region disaster recovery. Backtrack rewinds the cluster in-place to a specific point in time without restoring from backup, enabling rapid recovery from user errors like accidental table drops.' },
    ],
    why: [
      'Database reliability is the backbone of most applications — Aurora\'s six-copy storage architecture and automatic failover in 30 seconds provide enterprise-grade durability without the operational overhead of traditional database clustering. A single Aurora cluster automatically handles replication, backup, patching, and failover, eliminating months of DBA effort for high-availability database infrastructure.',
      'Aurora\'s auto-scaling storage from 10GB to 128TB with zero downtime means you never need to perform manual database migrations to increase storage capacity. The pay-per-use storage model with burstable IOPS to 256K eliminates over-provisioning and right-sizing exercises. Combined with up to 15 read replicas that share the same storage with zero lag, Aurora supports read-heavy workloads that would require multiple independent read replicas in standard MySQL or PostgreSQL.',
      'RDS Proxy is strongly recommended for Lambda and high-concurrency workloads to prevent connection exhaustion. Lambda functions can create hundreds of connections per second during scale events, quickly exhausting the Aurora connection pool. RDS Proxy maintains a warm connection pool of typically 20-50 connections, multiplexes across Lambda invocations, and supports IAM database authentication to eliminate hardcoded passwords.',
    ],
    interview: [
      { q: 'How is Aurora different from standard RDS MySQL or PostgreSQL?', a: 'Aurora fundamentally separates compute from storage — all instances (writer and up to 15 readers) share the same distributed storage volume with six copies across three Availability Zones. This means read replicas have zero replication lag since no data copying is required — they read from the same storage. Standard RDS MySQL uses EBS-based storage where each instance has its own volume and replicas use asynchronous binlog replication with lag up to seconds or minutes. Aurora\'s storage auto-scales from 10GB to 128TB with no downtime, while standard RDS requires manual storage modifications. Failover in Aurora takes about 30 seconds versus 1-2 minutes for standard RDS because Aurora\'s cluster endpoint DNS updates automatically and the promoted reader already has the current data. Aurora also provides 5x better throughput than standard MySQL on the same hardware due to its optimized storage engine and redo-log-only write path.', followUps: ['What happens to data during an Aurora failover?', 'How many read replicas does Aurora support and how do they differ from standard RDS replicas?'] },
      { q: 'What is Aurora Global Database and when would you use it?', a: 'Aurora Global Database replicates data from a primary region to up to five secondary regions using dedicated physical replication channels that bypass the normal database engine, achieving typical lag of 200-800 milliseconds. The secondary regions are fully readable and can be promoted to primary in under one minute for planned failover or disaster recovery. Use Global Database for cross-region disaster recovery with Recovery Point Objective measured in seconds rather than minutes, global applications that need readers close to users in multiple continents, and zero-data-loss migration between regions. After promotion, the new primary region accepts writes independently — unlike asynchronous replication solutions, there is no split-brain risk because promotion is a controlled operation. Global Database storage is billed separately per region at standard Aurora storage rates.', followUps: ['How does Global Database replication work under the hood?', 'What is the typical RPO and RTO for Global Database?', 'Can you write to secondary regions in Global Database?'] },
      { q: 'How does RDS Proxy work with Aurora and why is it essential for serverless architectures?', a: 'RDS Proxy sits between your application (especially Lambda functions) and the Aurora database, maintaining a pool of warm database connections. When Lambda scales to hundreds of concurrent invocations, each invocation would typically create a new database connection — quickly exhausting Aurora\'s connection limit (which is tied to instance memory). RDS Proxy multiplexes these connections: hundreds of Lambda invocations share a pool of typically 20-50 persistent connections. The proxy handles connection pooling, IAM database authentication (eliminating database passwords), and transaction pooling. It also supports prepared statement caching for frequently executed queries. RDS Proxy is highly available with deployment across multiple Availability Zones and failover in about 30 seconds during database failover — applications reconnect to the proxy rather than directly to the database, simplifying connection management during failover scenarios.', followUps: ['How does RDS Proxy handle IAM authentication?', 'What happens to in-flight transactions during a failover with RDS Proxy?'] },
    ],
    gotcha: [
      'Aurora read replicas share the same storage as the writer — they do NOT add write throughput. Write IOPS are limited by the primary instance\'s database engine, and the shared storage architecture means that a large write operation on the primary can affect read latency on all replicas simultaneously. If you need more write throughput, you must scale up the writer instance class.',
      'RDS Proxy is strongly recommended with Lambda, but adds approximately 5-10ms of latency per query. Without it, Lambda concurrency can exhaust Aurora\'s connection pool with too-many-connections errors that cascade into application failures. The proxy also requires a subnet in each AZ and has its own cost (~$0.015 per hour per AZ).',
      'Aurora Serverless v1 pauses after 5 minutes of inactivity — the first query after an idle period triggers a cold start that can take 30-60 seconds. V2 eliminates this with continuous scaling but requires a minimum ACU setting that may be higher than v1\'s zero-compute pause capability.',
      'Backtrack only works within a configurable backtrack window (default 24 hours, max 72 hours) and consumes additional storage for the undo records. It is not a replacement for backups — you still need automated backups for point-in-time recovery beyond the backtrack window.',
    ],
    tradeoffs: [
      { pro: 'MySQL and PostgreSQL compatibility with 5x better performance than standard MySQL on equivalent hardware, auto-scaling storage, and enterprise-grade durability with six copies across three AZs.', con: 'Not all MySQL and PostgreSQL features are supported — MyISAM engine is not available, some PL/pgSQL extensions like PostGIS have limited Aurora support, and deprecated MySQL features like the old password algorithm are removed. Test application compatibility before migrating.' },
      { pro: 'Auto-scaling storage from 10GB to 128TB with no downtime and pay-per-use pricing eliminates storage capacity planning and over-provisioning waste. Up to 15 read replicas with zero replication lag provide enormous read throughput headroom for demanding workloads.', con: 'Aurora is more expensive than standard RDS for small workloads with storage under 100GB. The minimum storage allocation and I/O costs ($0.20 per 1 million requests) mean that small databases cost significantly more than equivalent standard RDS instances.' },
      { pro: 'Aurora Global Database provides cross-region disaster recovery with sub-second lag and sub-minute failover, enabling global applications and compliance with data sovereignty requirements across up to five secondary regions.', con: 'Global Database adds complexity — storage costs double because data is stored in both regions, cross-region data transfer charges apply, and application code must handle read replicas in secondary regions with potential lag during failover scenarios.' },
    ],
  },
};

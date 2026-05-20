import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildS3Steps() {
  const steps = []; const s = {
    nodes: [
      svc('client',     'App Client',            'client',  30,  170),
      svc('s3',         'S3: my-app-assets',     'server',  230, 170, { bucket: 'my-app-assets', objects: 0, size: '10TiB', region: 'us-east-1' }),
      svc('cf',         'CloudFront CDN',         'apigw',   430, 90,  { pops: 450 }),
      svc('glacier',    'S3 Glacier\n(Archive)',  'db',      430, 280, { retrievalMin: 5 }),
      svc('athena',     'Athena\n(SQL on S3)',    'lambda',  630, 170),
      svc('replica',    'S3 Replication\n(eu-west-1)', 'server', 630, 70),
    ],
    edges: [
      { from: 'client', to: 's3' },
      { from: 'client', to: 'cf' },
      { from: 'cf',     to: 's3' },
      { from: 's3',     to: 'glacier' },
      { from: 'athena', to: 's3' },
      { from: 's3',     to: 'replica' },
    ],
    packets: [], events: [],
    metrics: { objects: 0, requests: 0, cacheHit: 0, storageClass: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'S3 = Simple Storage Service. Object storage — NOT a file system, NOT block storage. Each file (object) stored in a bucket with a key (path), value (data), metadata (content-type, tags), and version ID. Durability: 99.999999999% (11 9s) — only 1 object lost per 10 trillion objects. Think of it as a global key-value store for files.', 1);

  s.events.push({ type: 'info', msg: 'PUT /my-app-assets/logo.png | Content-Type: image/png | Content-Length: 1MiB | Tags: type=logo,env=prod' });
  s.packets = [pkt('client', 's3', 'PUT /logo.png (1MiB)', 'request')];
  s.nodes[1].objects = 1;
  snap(steps, s, 'PUT object: upload logo.png to bucket. S3 stores as object with key="logo.png". Each object has: key (path-like), value (0 bytes to 5TiB), metadata (Content-Type, Cache-Control, custom), tags (up to 10 key-value pairs for cost tracking + access control). Bucket properties: versioned or non-versioned, encrypted (SSE-S3/KMS/C), public-blocked (default — public access OFF by default, great security default).', 2);

  s.nodes[1].objects = 1;
  s.packets = [];
  s.events.push({ type: 'ok', msg: '✅ ETag: "abc123" (MD5 + part count for multipart). VersionId: "v1". Stored across ≥3 AZs in us-east-1.' });
  snap(steps, s, 'S3 automatically replicates data across ≥3 Availability Zones (in the region). 99.99% availability, 99.999999999% durability. ETag = MD5 hash of the object (for large multipart uploads: MD5 of part hashes + "-partCount"). Use ETag to check integrity. VersionId = unique version identifier (only when versioning enabled). S3 returns HTTP 200 with ETag and VersionId. Large uploads (>100MB): use multipart upload (parallel parts, faster + retryable).', 3);

  s.packets = [pkt('client', 's3', 'GET /logo.png (range: bytes=0-1023)', 'request')];
  s.packets = [pkt('s3', 'client', '200 OK (1024 bytes, ETag: abc123)', 'response')];
  s.metrics.requests = 1;
  snap(steps, s, 'GET object: reads data. Supports Range header (partial reads → only download what you need, great for resumable downloads + video streaming). Also supports: GET with If-Modified-Since (conditional, returns 304 Not Modified), GET with If-Match (only if ETag matches), GET with byte-range for parallel chunked downloads. SelectObjectContent: run SQL queries against CSV/JSON/Parquet objects directly from S3 — no server needed.', 4);

  s.packets = [pkt('client', 's3', 'presigned GET /logo.png?expires=3600&sig=xxx', 'request')];
  s.events.push({ type: 'info', msg: 'Presigned URL: generated with IAM credentials, valid 1h. Anyone with URL can download. No AWS auth required.' });
  snap(steps, s, 'Presigned URL: you create a signed URL with your IAM credentials + an expiration time (default 3600s, max 7d for STS, 7d for IAM user). Anyone with the URL can perform the specified action (GET or PUT) — no AWS credentials needed. Use cases: private image hosting (generate per-user URLs), direct browser uploads to S3 (PUT presigned URL avoids uploading through your server), CDN private content origin. The URL is cryptographically signed — tampering invalidates it.', 5);

  s.nodes[1].objects = 3;
  s.events.push({ type: 'ok', msg: '🔒 Versioning ON: 3 versions of logo.png. Delete → creates DeleteMarker (hidden version). Restore: delete DeleteMarker.' });
  snap(steps, s, 'S3 Versioning: when enabled, every modification creates a new version (not an overwrite). Old versions are retained and accessible. Delete behavior: creates a DeleteMarker (a "tombstone" version) — the object appears deleted but all versions remain. To truly restore: delete the DeleteMarker. Use cases: recover from accidental deletion, roll back to previous version, audit all changes. Versioning can\'t be disabled once enabled — only suspended (existing versions stay). Lifecycle: automatically expire old versions to Glacier or delete.', 6);

  s.events.push({ type: 'ok', msg: 'Lifecycle rule: 30d → S3 Standard-IA (infrequent access), 90d → Glacier (archive), 365d → Expire (delete).' });
  s.nodes[3].state = 'active';
  s.metrics.storageClass = 1;
  snap(steps, s, 'S3 Lifecycle: automated rules to transition or expire objects. Standard (frequent access) → Standard-IA (infrequent, cheaper storage + retrieval fee) → One Zone-IA (single AZ, cheaper, for non-critical) → Glacier Instant (archive, instant access) → Glacier Flexible (1-5 min retrieval) → Glacier Deep Archive (12h retrieval, cheapest). Rules by prefix (logs/* → Glacier after 30d) or tags (env=logs → IA after 7d). Expiration: permanently delete old versions or incomplete multipart uploads (save cost on abandoned uploads).', 7);

  s.nodes[2].state = 'active';
  s.packets = [pkt('client', 'cf', 'GET /logo.png', 'request')];
  s.packets = [pkt('cf', 's3', 'origin fetch → cache at edge', 'request')];
  s.metrics.requests = 2; s.metrics.cacheHit = 1;
  s.events.push({ type: 'ok', msg: 'CloudFront: first request fetches from S3 origin. Cached at 450+ edge PoPs globally. Subsequent: 15ms from edge.' });
  snap(steps, s, 'CloudFront CDN: content cached at AWS edge locations (450+ Points of Presence). How it works: 1) Request hits closest edge, 2) Cache miss → edge fetches from S3 origin, 3) Cache hit → served directly from edge (15ms vs 200ms). Origin Access Control (OAC): restrict S3 bucket access to CloudFront only (no direct S3 access). Signed URLs/Cookies: serve private content through CloudFront. Custom error pages: show friendly 404 pages. Lambda@Edge: run code at edge (A/B testing, URL rewrite, header injection, auth validation).', 8);

  s.nodes[4].state = 'active';
  s.packets = [pkt('athena', 's3', 'SELECT * FROM orders WHERE total > 100 LIMIT 10', 'request')];
  s.events.push({ type: 'ok', msg: 'Athena: SQL query on S3 data. Serverless — pay per TB scanned. Supports CSV, JSON, Parquet, ORC.' });
  snap(steps, s, 'Amazon Athena: run SQL queries directly on S3 data. No servers, no ETL, no loading. Pay $5/TB scanned (can be reduced by using columnar formats like Parquet, compressing data, partitioning). Uses: ad-hoc analytics, log analysis, query CloudTrail logs, data lake. Glue Data Catalog: define table schema (point to S3 path + file format). Parquet files + partition pruning can reduce scans by 90%. Best practice: convert data to Parquet + partition by date for cost-effective querying.', 9);

  s.nodes[5].state = 'active';
  s.events.push({ type: 'info', msg: 'Cross-Region Replication (CRR): my-app-assets → us-east-1 → eu-west-1. Async, encrypts in transit + at rest.' });
  snap(steps, s, 'S3 Replication: automatically replicate objects to another bucket (same or different region). CRR (Cross-Region): replicate to another region for lower latency or DR. SRR (Same-Region): replicate within region for log aggregation or data consolidation. Requirements: source bucket versioning enabled, destination bucket versioning enabled, IAM role with permissions. Replicates new objects after replication rule is enabled. Can replicate existing objects (with S3 Batch Replication). Realtime Time Control (RTC): replicate 99.99% of objects within 15min (extra cost).', 10);

  s.events.push({ type: 'ok', msg: 'Object Lock (WORM): write-once-read-many. Governance mode (can override with s3:BypassGovernanceRetention), Compliance mode (no one can override, not even root).' });
  snap(steps, s, 'S3 Object Lock (WORM): prevent objects from being deleted or overwritten for a fixed period. Use cases: regulatory compliance (SEC 17a-4, FINRA), audit logs, legal holds. Two modes: Governance (admins with special permission can override — good for internal compliance), Compliance (ABSOLUTELY no one can override — not even root account, use for strict regulatory requirements). Retention period: days/years. Legal Hold: prevents deletion indefinitely (no expiration, used for legal investigations).', 11);

  s.events.push({ type: 'info', msg: 'Access Points: Internet-facing (IWAC) and VPC-only. Block public access, enforce VPC origin, limit to specific VPC + endpoint.' });
  snap(steps, s, 'S3 Access Points: named network endpoints attached to buckets. Each access point has its own policy + network controls. Types: Internet-facing (requires IAM auth + bucket policy), VPC-only (only accessible from inside specified VPCs — no internet exposure!). VPC endpoint: Gateway Endpoint (free, within VPC only for S3/DynamoDB) or Interface Endpoint (powered by PrivateLink, costs, for on-premise + VPC). Multi-Region Access Points: single global endpoint that routes requests to nearest replicated bucket (active-passive failover).', 12);

  s.events.push({ type: 'info', msg: 'SSE-S3 (AWS managed: AES-256, free), SSE-KMS (customer managed CMK: $0.03/request + key cost, audit trail), SSE-C (customer provided key — you manage, AWS does encrypt/decrypt).' });
  snap(steps, s, 'S3 encryption options: SSE-S3 = AES-256 managed by AWS, free, default, most common. SSE-KMS = customer-managed KMS key, extra security + audit trail (CloudTrail key usage), additional cost per API call ($0.03/10K requests). SSE-C = you provide encryption key, AWS does the encryption/decryption, you must manage keys. TLS/HTTPS: always use HTTPS (not HTTP). Default encryption setting on bucket: enforce SSE-S3 or SSE-KMS for all objects. Bucket policies can require encryption: "s3:x-amz-server-side-encryption": "aws:kms".', 13);

  s.events.push({ type: 'ok', msg: 'Event notifications: S3 → SQS, SNS, Lambda. Trigger on ObjectCreated, ObjectRemoved, RestoreObject, Replication.' });
  snap(steps, s, 'S3 Event Notifications: automatically trigger actions on bucket events. Event types: s3:ObjectCreated:* (Put, Post, Copy, MultipartUpload), s3:ObjectRemoved:* (Delete, DeleteMarker), s3:ObjectRestore:* (Restore initiated/completed), s3:Replication:* (Replication events). Destinations: SQS (durable queue), SNS (fan out), Lambda (process immediately). Use cases: auto-generate thumbnails on image upload, trigger ETL on data arrival, invalidate CloudFront cache on object update. EventBridge: advanced S3 events with rules, filtering, multiple targets.', 14);

  s.result = 'S3: PUT with versioning → Lifecycle → Presigned URL → CloudFront CDN → Replication → Object Lock → Notifications.';
  snap(steps, s, 'Key takeaways: 1) S3 is NOT a file system — object storage with flat namespace. 2) 11 9s durability — designed for data durability, not instant consistency (read-after-write consistency for PUT of new objects, eventual for overwrite PUT + DELETE). 3) Use presigned URLs for temporary access without AWS credentials. 4) Lifecycle + Glacier for cost optimization. 5) CloudFront + OAC for secure fast delivery. 6) Object Lock for regulatory WORM compliance. 7) Event notifications for automated workflows. 8) Access Points + VPC endpoints for network isolation. 9) Encryption: default to SSE-S3, use SSE-KMS when needed.', 15);

  return steps;
}

const CODE = [
  '# Upload and download',
  'aws s3 cp logo.png s3://my-app-assets/logo.png',
  'aws s3 cp s3://my-app-assets/logo.png ./',
  '# Presigned URL (valid 1h)',
  'aws s3 presign s3://my-app-assets/logo.png --expires-in 3600',
  '# Lifecycle policy (JSON → apply)',
  'aws s3api put-bucket-lifecycle-configuration \\',
  '  --bucket my-app-assets \\',
  '  --lifecycle-configuration file://lifecycle.json',
  '# Athena query on S3',
  'aws athena start-query-execution \\',
  '  --query-string "SELECT * FROM orders LIMIT 10" \\',
  '  --result-configuration OutputLocation=s3://results/',
  '# Cross-region replication',
  'aws s3api put-bucket-replication \\',
  '  --bucket my-app-assets \\',
  '  --replication-configuration file://replication.json',
  '# Enable versioning',
  'aws s3api put-bucket-versioning \\',
  '  --bucket my-app-assets --versioning-configuration Status=Enabled',
  '# CloudFront invalidation',
  'aws cloudfront create-invalidation \\',
  '  --distribution-id E123 --paths "/*"',
];

export default {
  id: 's3', label: 'S3', icon: '🗄️',
  build: buildS3Steps, code: CODE, language: 'CLI',
  metrics: [
    { key: 'requests',      label: 'Requests',      max: 5,  color: 'var(--node-default)' },
    { key: 'objects',       label: 'Objects',       max: 5,  color: 'var(--node-path)' },
    { key: 'cacheHit',      label: 'Edge Hits',     max: 5,  color: 'var(--pod-running)' },
    { key: 'storageClass',  label: 'Tiered',        max: 3,  color: 'var(--node-comparing)' },
  ],
};

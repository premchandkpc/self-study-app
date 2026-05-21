import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildS3Steps() {
  const steps = []; const s = {
    nodes: [
      svc('client',    'App Client',         'client',  30, 190, { desc: 'Application uploading/downloading objects. Uses AWS SDK or presigned URLs. Reads/writes via HTTP REST API.', sdk: 'aws-sdk-v3' }),
      svc('s3',        'S3: my-app-assets',  'server',  230, 190, { bucket: 'my-app-assets', objects: 0, size: '10TiB', region: 'us-east-1', desc: 'Object storage bucket. Stores files as key-value objects. 99.999999999% durability across ≥3 AZs. Max object size: 5TiB. Flat namespace (no folders — just prefix).', storageClass: 'Standard', versioning: 'Enabled' }),
      svc('cf',        'CloudFront CDN',     'apigw',   430, 100, { pops: 450, desc: 'AWS CDN at 450+ edge locations. Caches content at edge for fast delivery (15ms). Supports OAC (Origin Access Control) to restrict S3 direct access. Signed URLs/Cookies for private content.', cacheHitRate: '85%' }),
      svc('glacier',   'S3 Glacier\n(Archive)', 'db',  430, 280, { retrievalMin: 5, desc: 'Archive storage class. Cheap (~$1/TB/month). Retrieval: Flexible (1-5min) or Deep Archive (12h). Lifecycle auto-transitions objects from Standard after N days.', retrievalCost: '$0.01/GB' }),
      svc('athena',    'Athena\n(SQL on S3)', 'lambda', 630, 100, { desc: 'Serverless SQL query service. Query S3 data directly — no ETL, no loading. Pay $5/TB scanned. Supports: CSV, JSON, Parquet, ORC. Use Glue Data Catalog for schema.', pricing: '$5/TB scanned' }),
      svc('replica',   'S3 Replication\n(eu-west-1)', 'server', 630, 280, { desc: 'Cross-Region Replication (CRR). Async copy to another region for DR. Also Same-Region (SRR) for log aggregation. Requires versioning enabled on both buckets.', rto: '<15min' }),
      svc('batch',     'S3 Batch\nOperations', 'server', 630, 400, { desc: 'Perform bulk actions on millions of objects. Actions: copy, invoke Lambda, restore from Glacier, set tags, set ACL. S3 Batch Job — specify manifest (CSV of object keys).', job: 'inventory-based' }),
    ],
    edges: [
      { from: 'client', to: 's3' }, { from: 'client', to: 'cf' }, { from: 'cf', to: 's3' },
      { from: 's3', to: 'glacier' }, { from: 'athena', to: 's3' }, { from: 's3', to: 'replica' },
    ],
    packets: [], events: [],
    metrics: { objects: 0, requests: 0, cacheHit: 0, storageClass: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'S3 = Simple Storage Service. Object storage — NOT a file system, NOT block storage. Each file (object) stored in a bucket with a key (path), value (data), metadata (content-type, tags), and version ID. Durability: 99.999999999% (11 9s) — only 1 object lost per 10 trillion objects. Think of it as a global key-value store for files.', 1);

  s.events.push({ type: 'info', msg: 'PUT /my-app-assets/logo.png | Content-Type: image/png | Content-Length: 1MiB | Tags: type=logo,env=prod' });
  s.packets = [pkt('client', 's3', 'PUT /logo.png (1MiB)', 'request')]; s.nodes[1].objects = 1;
  snap(steps, s, 'PUT object: upload logo.png to bucket. S3 stores as object with key="logo.png". Each object has: key (path-like), value (0 bytes to 5TiB), metadata (Content-Type, Cache-Control, custom), tags (up to 10 key-value pairs for cost tracking + access control). Bucket properties: versioned or non-versioned, encrypted (SSE-S3/KMS/C), public-blocked (default — public access OFF by default, great security default).', 2);

  s.packets = [];
  s.events.push({ type: 'ok', msg: '✅ ETag: "abc123" (MD5 + part count for multipart). VersionId: "v1". Stored across ≥3 AZs in us-east-1.' });
  snap(steps, s, 'S3 automatically replicates data across ≥3 Availability Zones (in the region). 99.99% availability, 99.999999999% durability. ETag = MD5 hash of the object (for large multipart uploads: MD5 of part hashes + "-partCount"). Use ETag to check integrity. VersionId = unique version identifier (only when versioning enabled). S3 returns HTTP 200 with ETag and VersionId. Large uploads (>100MB): use multipart upload (parallel parts, faster + retryable).', 3);

  s.packets = [pkt('client', 's3', 'GET /logo.png (range: bytes=0-1023)', 'request')];
  s.packets = [pkt('s3', 'client', '200 OK (1024 bytes, ETag: abc123)', 'response')]; s.metrics.requests = 1;
  snap(steps, s, 'GET object: reads data. Supports Range header (partial reads → only download what you need, great for resumable downloads + video streaming). Also supports: GET with If-Modified-Since (conditional, returns 304 Not Modified), GET with If-Match (only if ETag matches), GET with byte-range for parallel chunked downloads. SelectObjectContent: run SQL queries against CSV/JSON/Parquet objects directly from S3 — no server needed.', 4);

  s.packets = [pkt('client', 's3', 'presigned GET /logo.png?expires=3600&sig=xxx', 'request')];
  s.events.push({ type: 'info', msg: 'Presigned URL: generated with IAM credentials, valid 1h. Anyone with URL can download. No AWS auth required.' });
  snap(steps, s, 'Presigned URL: you create a signed URL with your IAM credentials + an expiration time (default 3600s, max 7d for STS, 7d for IAM user). Anyone with the URL can perform the specified action (GET or PUT) — no AWS credentials needed. Use cases: private image hosting (generate per-user URLs), direct browser uploads to S3 (PUT presigned URL avoids uploading through your server), CDN private content origin.', 5);

  s.nodes[1].objects = 3;
  s.events.push({ type: 'ok', msg: '🔒 Versioning ON: 3 versions of logo.png. Delete → creates DeleteMarker (hidden version). Restore: delete DeleteMarker.' });
  snap(steps, s, 'S3 Versioning: when enabled, every modification creates a new version (not an overwrite). Old versions are retained and accessible. Delete behavior: creates a DeleteMarker (a "tombstone" version) — the object appears deleted but all versions remain. To truly restore: delete the DeleteMarker. Use cases: recover from accidental deletion, roll back to previous version, audit all changes. Versioning can\'t be disabled once enabled — only suspended (existing versions stay). Lifecycle: automatically expire old versions to Glacier or delete.', 6);

  s.events.push({ type: 'ok', msg: 'Lifecycle rule: 30d → S3 Standard-IA, 90d → Glacier, 365d → Expire (delete).' });
  s.nodes[3].state = 'active'; s.metrics.storageClass = 1;
  snap(steps, s, 'S3 Lifecycle: automated rules to transition or expire objects. Standard (frequent) → Standard-IA (infrequent, cheaper storage + retrieval fee) → One Zone-IA (single AZ, cheaper, for non-critical) → Glacier Instant (archive, instant access) → Glacier Flexible (1-5 min retrieval) → Glacier Deep Archive (12h retrieval, cheapest). Rules by prefix (logs/* → Glacier after 30d) or tags (env=logs → IA after 7d). Expiration: permanently delete old versions or incomplete multipart uploads.', 7);

  s.nodes[2].state = 'active';
  s.packets = [pkt('client', 'cf', 'GET /logo.png', 'request')]; s.packets = [pkt('cf', 's3', 'origin fetch → cache at edge', 'request')];
  s.metrics.requests = 2; s.metrics.cacheHit = 1;
  s.events.push({ type: 'ok', msg: 'CloudFront: first request fetches from S3 origin. Cached at 450+ edge PoPs globally. Subsequent: 15ms from edge.' });
  snap(steps, s, 'CloudFront CDN: content cached at AWS edge locations (450+ Points of Presence). How it works: 1) Request hits closest edge, 2) Cache miss → edge fetches from S3 origin, 3) Cache hit → served directly from edge (15ms vs 200ms). Origin Access Control (OAC): restrict S3 bucket access to CloudFront only (no direct S3 access). Signed URLs/Cookies: serve private content through CloudFront. Lambda@Edge: run code at edge.', 8);

  s.nodes[4].state = 'active';
  s.packets = [pkt('athena', 's3', 'SELECT * FROM orders WHERE total > 100 LIMIT 10', 'request')];
  s.events.push({ type: 'ok', msg: 'Athena: SQL query on S3 data. Serverless — pay per TB scanned. Supports CSV, JSON, Parquet, ORC.' });
  snap(steps, s, 'Amazon Athena: run SQL queries directly on S3 data. No servers, no ETL, no loading. Pay $5/TB scanned (can be reduced by using columnar formats like Parquet, compressing data, partitioning). Uses: ad-hoc analytics, log analysis, query CloudTrail logs, data lake. Glue Data Catalog: define table schema (point to S3 path + file format). Parquet files + partition pruning can reduce scans by 90%. Best practice: convert data to Parquet + partition by date for cost-effective querying.', 9);

  s.nodes[5].state = 'active';
  s.events.push({ type: 'info', msg: 'Cross-Region Replication (CRR): my-app-assets → us-east-1 → eu-west-1. Async, encrypts in transit + at rest.' });
  snap(steps, s, 'S3 Replication: automatically replicate objects to another bucket (same or different region). CRR (Cross-Region): replicate to another region for lower latency or DR. SRR (Same-Region): replicate within region for log aggregation or data consolidation. Requirements: source bucket versioning enabled, destination bucket versioning enabled, IAM role with permissions. Replicates new objects after replication rule is enabled. Realtime Time Control (RTC): replicate 99.99% of objects within 15min (extra cost).', 10);

  s.events.push({ type: 'ok', msg: 'S3 Transfer Acceleration: uses CloudFront edge locations for upload. Fast upload from distant locations. Pay per GB transferred.' });
  snap(steps, s, 'S3 Transfer Acceleration: speed up uploads by routing through AWS edge locations instead of direct to S3. How: upload → nearest CloudFront edge → optimized AWS backbone → S3 bucket. Benefits: faster uploads from distant locations (up to 500% improvement for intercontinental). Enable per-bucket (one-click). Pricing: per GB uploaded through accelerated endpoint. Use for: large uploads from global users (photos, videos, backups), mobile app uploads from anywhere. Test: `aws s3 cp largefile s3://bucket/ --endpoint-url https://bucket.s3-accelerate.amazonaws.com`.', 11);

  s.nodes[6].state = 'active';
  s.events.push({ type: 'ok', msg: 'S3 Batch Operations: invoke Lambda on 1M objects. Restore Glacier objects, copy to another bucket, replace tags.' });
  snap(steps, s, 'S3 Batch Operations: perform bulk actions on billions of objects. Use cases: restore all archived objects from Glacier (batch restore), encrypt existing objects (add SSE-KMS), add/update tags on all objects, copy objects to another bucket. How: create manifest (list of object keys from S3 Inventory), choose operation (copy, invoke Lambda, restore, set tags), set completion report. S3 handles retries, progress tracking, and reporting. Example: restore 10M Glacier objects for analytics. No custom scripts needed.', 12);

  s.events.push({ type: 'info', msg: 'S3 Storage Lens: dashboard for storage usage + activity across ALL buckets. Default: free (metrics, 14d retention). Advanced: paid (60d, contextual recommendations).' });
  snap(steps, s, 'S3 Storage Lens: centralized dashboard showing storage usage and activity across ALL S3 buckets in your organization. Default (free): 14 days of metrics — bucket count, object count, storage by class, data transfer. Advanced (paid): contextual recommendations (find unused buckets, optimize storage class), 60-day retention, organization-level aggregation. Identify: most expensive buckets, fastest-growing prefixes, unused buckets, objects not accessed in 90+ days (candidates for Glacier). Accessible via S3 console or S3 Storage Lens API.', 13);

  s.events.push({ type: 'ok', msg: 'S3 Object Lambda: Lambda transforms data on-the-fly during GET. Redact PII, resize images, convert format. No client changes needed.' });
  snap(steps, s, 'S3 Object Lambda: transform S3 objects on-the-fly when retrieved. How: create S3 Object Lambda Access Point → associate Lambda function → client GETs object → Lambda receives object → transforms → returns modified object. Use cases: redact PII (credit cards, SSN), resize images (thumbnail version), convert format (CSV → JSON), inject watermark, add data row/column. Client does NOT know about the transformation — same S3 API, transparent. No separate storage for transformed objects. Key for compliance + data privacy.', 14);

  s.events.push({ type: 'info', msg: 'Encryption: SSE-S3 (AES-256, free), SSE-KMS ($0.03/10K req, audit logging), SSE-C (your key, you manage). Default encrypt: ON.' });
  snap(steps, s, 'S3 encryption: SSE-S3 = AES-256 managed by AWS, free, default. SSE-KMS = customer-managed KMS key, extra security + audit trail (CloudTrail key usage), extra cost ($0.03/10K requests). SSE-C = you provide encryption key, AWS does the encryption/decryption, you must manage keys. Bucket policies can require encryption: "s3:x-amz-server-side-encryption": "aws:kms". Enable default encryption at bucket level. In-transit: use HTTPS (not HTTP).', 15);

  s.events.push({ type: 'ok', msg: 'Event notifications: S3 → SQS, SNS, Lambda. EventBridge: advanced rules + filtering + multiple targets.' });
  snap(steps, s, 'S3 Event Notifications: automatically trigger actions on bucket events. Event types: ObjectCreated (Put, Post, Copy, MultipartUpload), ObjectRemoved (Delete, DeleteMarker), RestoreObject, Replication. Destinations: SQS (durable), SNS (fan-out), Lambda (process). EventBridge integration: advanced event routing with rules, filtering, up to 5 targets per rule, custom event buses. Use: auto-thumbnail on image upload, trigger ETL on data arrival, invalidate CloudFront cache on update.', 16);

  s.result = 'S3: PUT with versioning → Lifecycle → Presigned URL → CloudFront → Replication → Object Lock → Notifications.';
  snap(steps, s, 'Key takeaways: 1) 11 9s durability — designed for data durability. 2) Use presigned URLs for temporary access. 3) Lifecycle + Glacier for cost optimization. 4) CloudFront + OAC for secure fast delivery. 5) Object Lock for WORM compliance. 6) Event notifications for automated workflows. 7) S3 Object Lambda for data transformation at read time. 8) Transfer Acceleration for fast global uploads. 9) SSE-S3 default encryption. 10) Storage Lens for cost analysis. 11) S3 is strongly consistent (read-after-write for PUT + DELETE since Dec 2020).', 17);

  return steps;
}

const CODE = [
  '# Upload and download',
  'aws s3 cp logo.png s3://my-app-assets/',
  'aws s3 cp s3://my-app-assets/logo.png ./',
  '# Presigned URL (valid 1h)',
  'aws s3 presign s3://my-app-assets/logo.png --expires-in 3600',
  '# Lifecycle policy',
  'aws s3api put-bucket-lifecycle-configuration --bucket my-app-assets',
  '  --lifecycle-configuration file://lifecycle.json',
  '# Athena query on S3',
  'aws athena start-query-execution --query-string "SELECT * FROM orders LIMIT 10"',
  '# Cross-region replication',
  'aws s3api put-bucket-replication --bucket my-app-assets --replication-configuration file://rep.json',
  '# Transfer Acceleration',
  'aws s3api put-bucket-accelerate-configuration --bucket my-app-assets --accelerate-configuration Status=Enabled',
  '# Object Lambda Access Point',
  'aws s3control create-access-point --bucket my-app-assets --name redact-ap',
  '# Inventory (for Batch Ops)',
  'aws s3api put-bucket-inventory-configuration --bucket my-app-assets --id weekly --inventory-configuration file://inv.json',
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
  topicContent: {
    concept: [
      { title: 'Object Storage Model — how S3 stores data', content: 'S3 is object storage, not a file system or block storage. Each object consists of a key (the path-like identifier like photos/logo.png), the value (data from 0 bytes to 5 terabytes), metadata (Content-Type, Content-Disposition, Cache-Control, custom headers), tags (up to 10 key-value pairs for cost allocation and access control), and a version ID (when versioning is enabled). The namespace is flat — there are no real folders, just prefix-based grouping where the console simulates folder structure using delimiter / on keys. S3 is strongly consistent for all GET, PUT, LIST, and DELETE operations since December 2020 — read-after-write consistency means you can immediately read an object after writing it, and immediately see its absence after deletion.' },
      { title: 'Storage Classes and Lifecycle Management', content: 'S3 offers 15 storage classes optimized for different access patterns and cost profiles. Standard (frequent access, 99.99% availability), Standard-IA (infrequent access, lower storage cost but per-GB retrieval fee), One Zone-IA (single AZ, lower cost but no multi-AZ durability), Glacier Instant Retrieval (archive with millisecond access), Glacier Flexible Retrieval (1-5 minutes retrieval, lowest storage cost for archives), and Glacier Deep Archive (12 hours retrieval, cheapest at ~$1/TB/month). S3 Lifecycle policies automatically transition objects between classes based on age, prefix, or tags without any application code changes — for example, move logs to Standard-IA after 30 days, transition to Glacier after 90 days, and permanently delete after 365 days. Lifecycle also expires incomplete multipart uploads and old object versions.' },
      { title: 'Deep — S3 replication, presigned URLs, Object Lambda, and security architecture', content: 'S3 Cross-Region Replication (CRR) and Same-Region Replication (SRR) automatically replicate objects to another bucket using versioning-enabled source and destination buckets. CRR enables lower latency access for global users and cross-region disaster recovery with Replication Time Control (RTC) guaranteeing 99.99% of objects replicated within 15 minutes. Presigned URLs grant temporary access to specific objects without requiring AWS credentials — generated by signing a request with IAM credentials and an expiration time, they allow anyone with the URL to perform the specified action (GET or PUT) for the duration. Presigned URLs enable direct browser uploads to S3 without proxying through an application server. S3 Object Lambda transforms data on-the-fly when retrieved — the Lambda function receives the object from S3, transforms it (redact PII, resize image, convert format), and returns the modified object to the requester, all transparently without the client knowing transformation occurred. S3\'s security architecture includes Block Public Access at account and bucket level, bucket policies for resource-based access control, IAM policies for identity-based control, access control lists (legacy), VPC endpoints for private access without internet, and object ownership controls.' },
    ],
    why: [
      'S3 is the foundation of cloud storage with 99.999999999% durability and 99.99% availability. Eleven nines of durability means statistically only one object is lost per 10 trillion objects stored — making S3 the most durable storage service in any cloud. Understanding S3\'s storage classes, security controls, and event-driven features is critical for cost-effective, secure, and automated data management at any scale.',
      'S3 storage classes and lifecycle management enable tiered storage strategies that automatically optimize costs without any application changes. Data that is rarely accessed can be automatically moved from Standard ($0.023/GB) to Glacier Deep Archive ($0.001/GB) — a 23x cost reduction — while still being available for retrieval when needed. Combined with S3 Storage Lens for organization-wide usage analytics, teams can identify cost optimization opportunities across billions of objects.',
      'S3 event notifications enable event-driven workflows by automatically triggering SQS, SNS, Lambda, or EventBridge on object creation, deletion, or restoration events. This powers auto-thumbnail generation on image upload, automated ETL pipeline triggers on data arrival, and real-time log processing — all without polling or custom infrastructure. S3 EventBridge integration provides advanced filtering, multiple targets per rule, and retry/DLQ support for production event processing.',
    ],
    interview: [
      { q: 'How does S3 achieve 99.999999999% durability and what is the difference between durability and availability?', a: 'S3 achieves 11 nines of durability by automatically replicating each object across a minimum of three Availability Zones within the region using erasure coding and CRC checksums. Each object is broken into multiple data and parity shards distributed across independent storage systems — S3 can reconstruct the object even if multiple shards are lost. Durability measures the likelihood of data loss — 99.999999999% means the expected annual loss rate is 0.000000001% of objects, or 1 object lost per 10 trillion objects stored. Availability measures the likelihood the service is accessible — S3 Standard offers 99.99% availability, meaning up to approximately 53 minutes of downtime per year. These are different metrics: your data is virtually guaranteed to survive (durability), but you might not be able to access it temporarily (availability). S3 One Zone-IA stores data in a single AZ with 99.5% availability and 99.999999999% durability within that single AZ — but if the AZ is destroyed, all data is lost despite the high durability number, because durability is computed within the AZ\'s infrastructure, not across AZs.', followUps: ['What is the difference between durability and availability in S3?', 'How does S3 One Zone-IA affect the practical durability guarantee?'] },
      { q: 'How do you secure data in S3 and what are the recommended security controls?', a: 'S3 security follows a defense-in-depth approach with multiple layers. First, enable Block Public Access at the account level (a setting that overrides all bucket policies and ACLs to prevent any public access — this is enabled by default for all new accounts since April 2023). Second, use bucket policies and IAM policies for access control — bucket policies grant cross-account access and service-level access (like CloudFront via Origin Access Control), while IAM policies grant user and role access. Use IAM Access Analyzer to identify buckets shared with external principals. Third, enable encryption — SSE-S3 provides AES-256 encryption at no additional cost, SSE-KMS provides customer-managed keys with separate permissions and CloudTrail audit logging for key usage ($0.03 per 10,000 requests), and SSE-C lets you provide your own encryption keys. Fourth, enable versioning to protect against accidental deletions and overwrites — deleted objects become delete markers rather than permanent deletions, and you can restore any version. Fifth, use S3 Object Lock for Write-Once-Read-Many compliance — objects can be set with retention periods (compliance or governance mode) that prevent deletion or modification even by root users. Sixth, enable S3 Access Logs or AWS CloudTrail data events to audit all bucket access. Seventh, use VPC endpoints (Gateway or Interface) to restrict access to your VPC without internet exposure. Eighth, implement S3 bucket policies with conditions requiring encryption in transit (aws:SecureTransport) and at rest (s3:x-amz-server-side-encryption).', followUps: ['What is the difference between SSE-S3 and SSE-KMS?', 'How does S3 Access Analyzer help identify security issues?', 'What is S3 Object Lock and how does it support WORM compliance?'] },
      { q: 'How does S3 Cross-Region Replication work and what are its use cases?', a: 'S3 Cross-Region Replication (CRR) automatically and asynchronously replicates objects from a source bucket in one region to a destination bucket in a different region. Both buckets must have versioning enabled. When a new object is created in the source bucket or an existing object is updated, S3 replicates it to the destination bucket within typically 15 minutes (guaranteed within 15 minutes for RTC — Replication Time Control — at additional cost). S3 replicates object data, metadata, and tags by default, but not object ACLs or bucket-level settings. Use CRR for compliance (meet data residency requirements by replicating to a specific region), lower latency (keep data close to global users), disaster recovery (maintain a copy in another region for account-level recovery), and operational efficiency (process data in a different region for cost or performance reasons). Same-Region Replication (SRR) works identically but within the same region, useful for consolidating logs from multiple accounts into a single logging bucket, or synchronizing data between production and test environments. CRR/SRR only replicate objects created AFTER the replication rule is enabled — existing objects are not replicated automatically. Use S3 Batch Replication to backfill existing objects. Replication also supports delete marker replication (optional), replica modification sync, and owner override.', followUps: ['What is Replication Time Control and when should you use it?', 'Can CRR replicate existing objects?', 'What is the difference between CRR and S3 Batch Replication?'] },
    ],
    gotcha: [
      'S3 is strongly consistent for all GET, PUT, LIST, and DELETE operations since December 2020 — but only within a single AWS region. Cross-region operations WILL have eventual consistency. If you write to us-east-1 and read from eu-west-1, you may not see the latest object until replication completes. Always design your application logic to handle cross-region replication lag for CRR scenarios.',
      'S3 Transfer Acceleration costs per GB transferred through CloudFront edge locations — for small files (under 1GB) or when the client is geographically close to the S3 bucket region, Transfer Acceleration can actually cost MORE than the benefit it provides. Always test with `s3-accelerate-speedtest` before enabling it globally, and consider it only for large uploads (100MB+) from distant locations.',
      'S3 event notifications are best-effort — they do NOT guarantee delivery. If the notification destination (SQS, SNS, Lambda) is unavailable or throttled, the notification is dropped. For guaranteed delivery, use S3 EventBridge integration which supports retries, dead letter queues, and multiple targets per rule at a small additional cost per event.',
      'Multipart uploads in S3 can leave incomplete upload parts that accumulate and incur storage costs indefinitely. Always configure an S3 Lifecycle policy to expire incomplete multipart uploads after a reasonable period (e.g., 7 days) to prevent orphaned parts from accumulating storage charges, especially in production environments with large file uploads.',
    ],
    tradeoffs: [
      { pro: '99.999999999% durability, unlimited storage, 99.99% availability, and 15 storage classes for granular cost optimization from frequently accessed data to deep archive. S3 is the most durable and widely adopted object storage service in any cloud.', con: 'No file system locking or concurrent write coordination — if two clients write to the same key simultaneously, the last writer wins and the first write is silently overwritten. Use S3 Versioning or S3 Object Lock for scenarios requiring overwrite protection or multi-writer coordination.' },
      { pro: 'Event notifications to SQS, SNS, Lambda, and EventBridge enable event-driven workflows that automatically process data when it arrives — no polling, no custom infrastructure, no idle cost. This powers serverless image processing, ETL pipelines, and automated data classification at any scale.', con: 'Standard event notifications are best-effort with no retry mechanism — if the destination is unavailable, the event is lost. For production event processing, use EventBridge integration with retries and DLQ at additional cost, or build idempotent processing that can re-scan for missed events using S3 Inventory.' },
      { pro: 'Comprehensive security controls including Block Public Access, bucket policies and IAM, encryption (SSE-S3, SSE-KMS, SSE-C), VPC endpoints, Object Lock for WORM compliance, and Access Analyzer for detecting unintended public access — providing defense-in-depth for data protection at every layer.', con: 'The complexity of S3 security controls can lead to misconfigurations — overly permissive bucket policies, disabled encryption, or public access to sensitive data are common security incidents. AWS recommends using IAM Access Analyzer for continuous monitoring and automated policy validation to detect misconfigurations before they become breaches.' },
    ],
  },
};

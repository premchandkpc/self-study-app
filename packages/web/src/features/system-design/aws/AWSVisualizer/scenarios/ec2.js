import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildEC2Steps() {
  const steps = []; const s = {
    nodes: [
      svc('dev',  'Developer',        'client',  30, 200, { desc: 'Engineer with AWS CLI + SSH key. Launches instances, manages config via console or IaC. Uses key pair (.pem) for SSH access.' }),
      svc('ec2',  'EC2 Instance',     'server',  230, 190, { state: 'stopped', type: 't3.medium', vcpu: 2, ram: 4, ena: true, desc: 'Virtual server. t3.medium = 2vCPU + 4GiB RAM. Nitro-based (EBS optimized, 5Gbps networking). Burstable CPU credits (t3 family).', arch: 'x86_64', tenancy: 'default' }),
      svc('ebs',  'EBS gp3\n30GiB',   'db',      430, 270, { iops: 3000, throughput: 125, snapshots: 0, desc: 'Block storage volume attached over network. gp3 = 3000 IOPS baseline (free). Can burst to 16K IOPS. Max throughput: 1000 MB/s. Snapshot to S3 for backup.', volumeType: 'gp3', encrypted: true }),
      svc('eni',  'ENI (eth0)\nSG',   'apigw',   430, 140, { sg: ['web-sg:80,443', 'ssh-sg:22'], publicIp: '54.123.45.67', desc: 'Elastic Network Interface — virtual NIC. Primary ENI (eth0) attached at launch. Security groups = virtual firewall. Attach additional ENIs for multi-home networking.', privateIp: '10.0.1.5' }),
      svc('ami',  'AMI\n(amzn2-ami)', 'lambda',  630, 80,  { desc: 'Amazon Machine Image — frozen OS snapshot. Contains: OS, kernel, pre-installed packages, config. Create custom "Golden AMI" for consistent launches. AMI = EBS snapshot + metadata.', source: 'amzn2-ami-kernel-5.10', region: 'us-east-1' }),
      svc('asg',  'Auto Scaling\nGroup','server', 630, 220, { minSize: 1, maxSize: 5, desired: 2, desc: 'Manages EC2 fleet. Maintains desired instance count. Auto-replaces unhealthy instances (ALB health check). Scales based on CPU/memory/queue depth. Launch Template = instance config.', scalingPolicy: 'CPU > 70% → +1' }),
      svc('alb',  'ALB\n(Target Group)','apigw',  630, 350, { desc: 'Application Load Balancer. Distributes traffic across ASG instances. Health checks (HTTP /health → 200). Path-based routing. Stickiness (session affinity). Connection draining.', scheme: 'internet-facing' }),
    ],
    edges: [
      { from: 'dev', to: 'ec2' }, { from: 'ec2', to: 'ebs' }, { from: 'ec2', to: 'eni' },
      { from: 'ami', to: 'ec2' }, { from: 'asg', to: 'ec2' }, { from: 'alb', to: 'ec2' },
    ],
    packets: [], events: [],
    metrics: { instances: 0, cpu: 0, ebsIO: 0, ebsSnap: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'EC2 = virtual server in the cloud. Pick OS (AMI), CPU/RAM (instance type), storage (EBS), network (ENI + SG). Pay per second (or per hour for older instances). Think of it as renting a computer in AWS\'s data center — but you can resize, snapshot, and automate everything.', 1);

  s.events.push({ type: 'info', msg: 'aws ec2 run-instances --image-id ami-0abc --instance-type t3.medium --key-name my-key --security-group-ids sg-123' });
  snap(steps, s, 'Launch instance: choose AMI (Amazon Linux 2, Ubuntu 22.04, Windows Server 2022 — pre-configured OS images), instance type (t3.medium = 2 vCPU + 4 GiB RAM), key pair (.pem for SSH), security groups (virtual firewall — like a host-based firewall rule set), subnet (which AZ in your VPC). Instance types: t (burstable, credits), m (general), c (compute), r (memory), i (storage), g (GPU).', 2);

  s.nodes[1].state = 'pending';
  s.events.push({ type: 'info', msg: '⏳ PENDING: AWS finds a host with capacity. State transitions: pending → running → (eventually) stopped/terminated.' });
  snap(steps, s, 'AWS PENDING phase: 1) Find physical host with free capacity, 2) Allocate instance slot, 3) Attach ENI (Elastic Network Interface — your network card in the cloud), 4) Create and attach EBS root volume (copied from AMI snapshot), 5) Boot the OS. Takes 30s-3min depending on instance type and AZ availability. User data script: runs at first boot (pass cloud-init script to customize the instance).', 3);

  s.nodes[1].state = 'running'; s.metrics.instances = 1; s.metrics.cpu = 15; s.nodes[3].state = 'active';
  s.events.push({ type: 'ok', msg: 'RUNNING. Public IP: 54.123.45.67. Private IP: 10.0.1.5 (VPC internal). Key pair: my-key.pem' });
  s.packets = [pkt('dev', 'eni', 'SSH (port 22): chmod 400 key.pem; ssh -i key.pem ec2-user@54.123.45.67', 'request')];
  s.packets = [pkt('eni', 'dev', 'ec2-user@ip-10-0-1-5 ~$ _', 'response')];
  snap(steps, s, 'Instance RUNNING. SSH with key pair (.pem file). Security groups: ssh-sg allows port 22 from YOUR IP only (not 0.0.0.0/0 — that\'s insecure). web-sg allows 80/443 from 0.0.0.0/0. Public IP assigned from AWS pool (changes on stop/start unless Elastic IP). Private IP: stays until termination, used for internal VPC communication. Instance metadata: curl http://169.254.169.254/latest/meta-data/ (gives instance ID, region, IAM role, etc. — no need to hardcode these).', 4);

  s.events.push({ type: 'ok', msg: 'IMDSv2: session-oriented (PUT + GET). Requires token for metadata access. Prevents SSRF attacks. Default on all new EC2.' });
  snap(steps, s, 'IMDSv2 (Instance Metadata Service v2): enhanced security vs IMDSv1. v1: GET http://169.254.169.254/latest/meta-data (any process, no auth). v2: PUT http://169.254.169.254/latest/api/token (returns token), GET with X-aws-ec2-metadata-token header. Token TTL: 6h (configurable 1s-6h). Prevents SSRF attacks (common web vulnerability where malicious site tricks server to fetch internal metadata). Default for all new EC2 instances since 2024. Enable via account setting or per-instance metadata options.', 5);

  s.packets = [];
  s.events.push({ type: 'warn', msg: 'STOP → compute released. EBS volumes persist. Public IP returned to pool. No EC2 charges.' });
  s.nodes[1].state = 'stopped'; s.nodes[3].state = 'idle';
  s.nodes[1].type = 't3.medium (stopped)';
  snap(steps, s, 'STOP: instance stops. EBS volume data persists (root + attached volumes). Public IP released (gone forever). Private IP preserved (unless you stopped and started in a different AZ within VPC). Charges: NO EC2 compute cost. Yes: EBS storage (gb-month), Elastic IP (if not attached to running instance — small charge). Use stop for: development instances overnight, cost savings on non-production.', 6);

  s.events.push({ type: 'warn', msg: 'START → new host. NEW public IP (54.99.88.77). Same EBS volumes, same private IP. Data intact.' });
  s.nodes[1].state = 'running'; s.nodes[1].type = 't3.medium'; s.nodes[3].state = 'active'; s.nodes[3].publicIp = '54.99.88.77'; s.metrics.cpu = 5;
  s.events.push({ type: 'ok', msg: 'New public IP assigned (use Elastic IP for static IP). EBS volumes reattached, data intact.' });
  snap(steps, s, 'START: AWS allocates new host (possibly different physical machine). Same EBS volumes reattached. NEW public IP. Elastic IP (EIP): allocate a static public IP and associate to instance. EIP stays yours until you release it. Free if associated to a running instance. If not associated: $0.005/hr (small charge to prevent hoarding). Elastic IP is Region-level — can move between instances in same region.', 7);

  s.nodes[1].state = 'stopped';
  s.events.push({ type: 'warn', msg: 'HIBERNATE: RAM (4GiB) persisted to EBS root volume. Boot faster (skip OS init). Enable at launch only.' });
  snap(steps, s, 'HIBERNATE: instance stops, RAM contents saved to EBS root volume (encrypted at rest). On start: RAM loaded back, processes resume where they left off — no OS boot, no app restart. Limits: only on-demand instances, max 150 GiB RAM, not all instance families, must have encrypted EBS. After hibernate: instance in STOPPED state — no compute charges, boot takes ~30s vs 2min for full cold boot.', 8);

  s.nodes[1].state = 'running'; s.events.push({ type: 'ok', msg: 'Golden AMI: create custom AMI from configured instance (patched, apps installed). Launch new instances from AMI instantly.' });
  s.nodes[4].state = 'active'; s.packets = [pkt('ec2', 'ami', 'CreateImage: ami-0golden', 'request')];
  snap(steps, s, 'Golden AMI: create a custom AMI from a configured EC2 instance. Why: pre-install packages, apply security patches, configure app settings. Result: new instances launch fully configured in seconds (no user data script needed). AMI lifecycle: CreateImage → register → share with other accounts/copy to other regions. AMI = snapshot of EBS root volume + instance metadata (kernel, RAM disk, block device mapping). Used by Auto Scaling to launch consistent instances.', 9);

  s.nodes[5].state = 'active'; s.events.push({ type: 'info', msg: 'Launch Template + Auto Scaling Group: min=1, max=5, desired=2. ALB health check → if unhealthy, ASG terminates + replaces.' });
  snap(steps, s, 'Launch Template: versioned instance configuration template (AMI, type, SG, key pair, user data). Auto Scaling Group: manages EC2 fleet — maintains desired count, replaces unhealthy instances, scales based on policies. ALB Target Group: ASG registers new instances automatically, ALB health checks (HTTP /health endpoint), if instance unhealthy → ASG terminates and spawns new one. Scaling policies: target tracking (keep CPU at 50%), step scaling (add 2 when CPU > 70%), scheduled scaling (more before peak hours).', 10);

  s.nodes[6].state = 'active'; s.packets = [pkt('alb', 'ec2', 'health check: GET /health → 200 OK', 'request')]; s.metrics.instances = 2;
  s.events.push({ type: 'ok', msg: 'ALB registered instance. Cross-zone LB distributes traffic evenly. SG allows LB traffic on port 80/443.' });
  snap(steps, s, 'ALB (Application Load Balancer): distributes incoming traffic across EC2 instances. Path-based routing: /api/* → backend, /* → frontend. Host-based routing: api.myapp.com → backend, app.myapp.com → frontend. Stickiness (session affinity): same client → same instance for session state. Connection draining: stops sending new requests to deregistering instance, waits for in-flight requests to complete. SG best practice: web-sg allows traffic from ALB SG only (not from 0.0.0.0/0).', 11);

  s.events.push({ type: 'ok', msg: 'AWS Systems Manager (SSM): connect via Session Manager (no SSH, no open ports). Patch compliance via Patch Manager. Run commands via Run Command.' });
  snap(steps, s, 'AWS Systems Manager (SSM): manage EC2 fleet at scale without opening SSH ports. Session Manager: click "Connect" in console → browser-based shell (no bastion host needed, no SSH key, no public IP). Patch Manager: scan for missing patches, auto-apply, generate compliance reports. Run Command: execute script on 100s of instances simultaneously. Inventory: collect OS, apps, services, patches across fleet. Requires: SSM Agent (pre-installed on Amazon Linux 2/2023), IAM role (AmazonSSMManagedInstanceCore).', 12);

  s.events.push({ type: 'info', msg: 'Capacity Reservation: reserve EC2 capacity in a specific AZ for 1yr/3yr. Guaranteed compute when you need it. Combined with Savings Plan.' });
  snap(steps, s, 'Capacity Reservations: guarantee EC2 capacity in a specific AZ for critical workloads. On-Demand Capacity Reservation: no commitment, but capacity is reserved (pay for it regardless of usage). Regional Capacity Reservation: capacity in any AZ in the region, more flexible. Use cases: disaster recovery (ensure capacity before failover), high-stakes events (Black Friday, product launches), regulatory compliance (data must stay in specific AZ). Combine with Savings Plan (discount compute commitment) + Capacity Reservation (guaranteed capacity).', 13);

  s.events.push({ type: 'ok', msg: 'EC2 Fleet: launch mix of on-demand + spot across instance types. Use cheapest available. Simplify scaling diverse instances.' });
  snap(steps, s, 'EC2 Fleet: launch a mix of on-demand and spot instances across multiple instance types in a single API call. Strategies: lowestPrice (launch cheapest), diversified (spread across types for availability), capacityOptimized (pick best capacity pool). Use cases: large-scale workloads (ML training, rendering), cost optimization (spot + diversified reduces interruption), multi-inst-type workloads. Fleet replaces the need for multiple ASGs for different instance types. Integrated with Spot in diversified mode — if one spot pool is reclaimed, others still run.', 14);

  s.nodes[1].state = 'running'; s.metrics.ebsSnap = 1;
  s.events.push({ type: 'info', msg: 'EBS snapshot: point-in-time backup stored in S3 (incremental — only changed blocks). Restore volume from snapshot.' });
  snap(steps, s, 'EBS snapshots: incremental backups stored in S3. First snapshot: full copy. Subsequent: only changed blocks (fast, cheap). Create before high-risk operations (kernel upgrade). Lifecycle Manager: automated snapshot schedules (every 24h, retain 7 days). Restore: create new EBS volume from snapshot (in any AZ). Cross-region copy: copy snapshot to another region for DR. Fast Snapshot Restore: pre-warm snapshot for instant volume creation (extra cost). Encryption: enable by default at account level — all volumes encrypted with KMS key.', 15);

  s.result = 'EC2 lifecycle: LAUNCH→RUNNING→STOP/START (new IP)/HIBERNATE/TERMINATE. ASG for HA + scaling.';
  snap(steps, s, 'Pricing: On-Demand (per second, no commitment). Reserved (1-3 yr, up to 72% off). Savings Plan (compute usage commit, up to 66%). Spot (up to 90% off, interruptible). Dedicated Host (physical server, BYOL). Dedicated Instance (single-tenant hardware, AWS managed). Nitro System (modern EC2): bare metal-like performance, ENA (25 Gbps networking), EBS optimized, Nitro Security Chip (hardware-isolated, includes instance root volume encryption key).', 16);

  return steps;
}

const CODE = [
  '# Launch EC2 (Amazon Linux 2, t3.micro)',
  'aws ec2 run-instances --image-id ami-0abc --instance-type t3.micro --key-name my-key',
  '# Stop/Start/Terminate',
  'aws ec2 stop-instances --instance-ids i-123',
  'aws ec2 start-instances --instance-ids i-123',
  'aws ec2 terminate-instances --instance-ids i-123',
  '# Create AMI (golden image)',
  'aws ec2 create-image --instance-id i-123 --name "my-app-v1"',
  '# Launch Template + Auto Scaling',
  'aws ec2 create-launch-template --launch-template-name my-template',
  'aws autoscaling create-auto-scaling-group --auto-scaling-group-name my-asg \\',
  '  --launch-template LaunchTemplateName=my-template --min-size 1 --max-size 5',
  '# SSM Session Manager (no SSH needed)',
  'aws ssm start-session --target i-123',
  '# EC2 Fleet (spot + on-demand mix)',
  'aws ec2 create-fleet --launch-template-config-overrides file://overrides.json',
  '# Capacity Reservation',
  'aws ec2 create-capacity-reservation --instance-type t3.micro --availability-zone us-east-1a',
];

export default {
  id: 'ec2', label: 'EC2', icon: '🖥️',
  build: buildEC2Steps, code: CODE, language: 'CLI',
  metrics: [
    { key: 'instances', label: 'Instances', max: 5,  color: 'var(--node-default)' },
    { key: 'cpu',       label: 'CPU %',     max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
    { key: 'ebsSnap',   label: 'Snapshots', max: 3,  color: 'var(--node-path)' },
  ],
  topicContent: {
    concept: [
      { title: 'EC2 Instance Lifecycle — from launch to termination', content: 'EC2 instances move through distinct states: PENDING (AWS allocates resources and boots the OS), RUNNING (instance is operational and you are billed), STOPPING/STOPPED (compute resources released, EBS persists, public IP changes unless Elastic IP), and TERMINATED (instance destroyed, EBS deleted by default). HIBERNATE saves RAM contents to the encrypted EBS root volume, allowing faster resume because the OS does not need to reboot and applications do not need to restart. Instance metadata at http://169.254.169.254 provides instance identity, IAM role credentials, and user data without hardcoding configuration.' },
      { title: 'Instance Types and Families — choosing the right compute', content: 'AWS offers instance families optimized for different workloads: t (burstable with CPU credits for variable workloads), m (general purpose balanced CPU/memory), c (compute-optimized for batch and gaming), r/x (memory-optimized for databases and caching), i/d (storage-optimized with high local SSD IOPS), p/g (GPU for ML and rendering), and inf/trn (AI inference and training). Within each family, sizes scale roughly 2x in both vCPU and memory. The Nitro System powers modern instances with dedicated hardware for networking (ENA up to 100 Gbps), EBS (dedicated bandwidth), and security (Nitro Security Chip).' },
      { title: 'Deep — EC2 networking, storage, and placement groups', content: 'EC2 networking uses Elastic Network Interfaces (ENIs) — each instance has a primary ENI (eth0) and can attach additional ENIs for multi-homed architectures. Security Groups act as instance-level firewalls with allow rules only. EBS volumes are network-attached block storage with gp3 (3000 IOPS baseline, burst to 16K), io2 (provisioned IOPS up to 64K for critical workloads), and st1/sc1 (throughput-optimized for big data). Instance store volumes provide temporary, high-performance local storage that persists only during instance lifetime. Placement Groups offer three strategies: Cluster (low-latency 10 Gbps within single AZ), Spread (individual hardware per instance for HA), and Partition (groups of instances per partition for large distributed workloads like HDFS and Cassandra).' },
    ],
    why: [
      'EC2 is the foundation of AWS compute — understanding instance lifecycle, storage options, Auto Scaling, and networking is essential for designing cost-effective, resilient architectures. EC2 provides the broadest operating system support (Linux, Windows, macOS), the widest variety of compute options (from t2.nano at $0.0058/hr to p4de.24xlarge at $31.58/hr for ML), and the most flexible pricing models of any AWS compute service.',
      'The EC2 pricing model directly affects application architecture and infrastructure cost. On-Demand (pay per second, no commitment) suits variable workloads and new applications. Reserved Instances and Savings Plans (1-3 year commitment, up to 72% discount) provide the best unit economics for steady-state workloads. Spot (up to 90% discount) enables massive cost reduction for fault-tolerant, stateless, and flexible workloads. Understanding when to use each model is a top-tier infrastructure skill.',
      'Auto Scaling Groups combined with ALB health checks provide production-grade high availability without manual intervention. ASGs maintain desired instance count, automatically replace failed instances, distribute instances across Availability Zones, and integrate with Elastic Load Balancing for traffic distribution. This eliminates the need for manual failover procedures and 24/7 infrastructure operations for compute capacity management.',
    ],
    interview: [
      { q: 'What happens when you stop and start an EC2 instance, and when would you use stop versus terminate?', a: 'When you stop an EC2 instance, the instance transitions to a new physical host on the next start. The EBS root and attached volumes persist with all data intact. The private IP address is preserved if the instance starts in the same Availability Zone, but the public IP address changes unless you have associated an Elastic IP. You are not charged for EC2 compute while the instance is stopped, but you continue paying for EBS storage and any allocated Elastic IPs. Instance store volumes lose all data on stop because they are physically attached to the host. Use stop for cost savings on development instances overnight or during weekends, or when you need to change instance type (can only be done while stopped). Use terminate when the instance is no longer needed — this deletes all attached EBS volumes by default and releases all associated resources. Hibernate is a variation of stop that persists RAM contents to the encrypted EBS root volume, enabling faster resume — ideal for long-running in-memory applications that take minutes to start up.', followUps: ['What happens to instance store volumes on stop?', 'Can you change instance type while stopped and what are the limitations?'] },
      { q: 'How does EC2 Auto Scaling work and what are the different scaling policies?', a: 'EC2 Auto Scaling uses Auto Scaling Groups (ASGs) that reference a Launch Template defining the instance configuration (AMI, instance type, security groups, key pair, user data, IAM role). The ASG maintains a desired instance count within configurable minimum and maximum limits. Three scaling methods are available: target tracking scaling (simplest — you set a target metric like average CPU at 50% and ASG adjusts capacity automatically, suitable for most workloads), step scaling (you define CloudWatch alarm thresholds and specify how many instances to add or remove, like add 2 when CPU exceeds 70% and add 4 when CPU exceeds 90%), and scheduled scaling (you define recurring schedules for predictable traffic patterns like scaling up to 20 instances at 8 AM and scaling down to 5 at 6 PM). The ASG integrates with ALB target groups — new instances are automatically registered, and unhealthy instances (detected by ALB health checks) are terminated and replaced. Scale-in protection can prevent ASG from terminating specific instances during scale-in events.', followUps: ['What is the difference between scale-out and scale-up?', 'How do you handle graceful shutdown during scale-in events?'] },
      { q: 'What is the difference between EBS, instance store, and EFS for EC2 storage?', a: 'EBS (Elastic Block Store) provides persistent, network-attached block storage volumes that survive instance stop and terminate (with the DeleteOnTermination flag). EBS volumes can be detached from one instance and attached to another, and support snapshots to S3 for backup. gp3 volumes provide 3000 IOPS baseline at no extra cost with burst capability to 16K IOPS. io2 Block Express volumes provide up to 256K IOPS for latency-sensitive workloads. Instance store provides temporary, physically attached SSD storage with extremely high IOPS — but data is lost on stop, hibernate, or terminate. Instance store is ideal for temporary data like caches, buffers, and scratch data, or for workloads like Hadoop and Cassandra that replicate data across instances. EFS (Elastic File System) provides a fully managed NFS file system that can be mounted by multiple EC2 instances across Availability Zones simultaneously. EFS is more expensive than EBS but enables shared file storage for WordPress, content management systems, and home directories. The choice depends on persistence requirements, performance needs, and whether shared access across instances is needed.', followUps: ['Can you recover data from an instance store volume after a stop?', 'How do EBS snapshots work and what is the difference between EBS and EFS pricing?'] },
    ],
    gotcha: [
      'Instance store volumes lose all data on stop, hibernate, or terminate — they are physically attached to the host server and do not survive instance transitions. Always use EBS volumes for any data that must persist. Many production incidents have been caused by teams unaware that their local SSD data disappeared on instance stop.',
      'T2 and T3 burstable instances accumulate CPU credits when idle and consume them when active. When credits are exhausted, CPU throttles to the baseline rate (e.g., t3.medium baseline is 20% of a vCPU). Workloads consistently above the baseline will see severe performance degradation after credits are depleted. Use unlimited mode (T3/T4g only) for short bursts above baseline with a small surcharge, or choose M5/C5/R5 instances for sustained CPU workloads.',
      'Public IP addresses are released when an instance stops and are assigned a new one on start — if your application or DNS records reference the public IP, it breaks on every stop/start cycle. Always use Elastic IPs for production instances that need a fixed public address, and always use DNS names (CNAME or ALIAS) rather than hardcoded IPs in application configuration.',
      'Security group rules are stateful — if you allow inbound on port 443, the outbound response is automatically allowed regardless of outbound rules. However, if you initiate an outbound connection, you must also allow the inbound return traffic explicitly (stateful only applies to established connections). This asymmetry confuses many engineers troubleshooting connectivity issues.',
    ],
    tradeoffs: [
      { pro: 'Complete control over the operating system, kernel, software stack, and configuration — you can install anything, customize the kernel, use custom AMIs, and configure the OS exactly to your requirements with no platform limitations.', con: 'Full operational responsibility for OS patching, security hardening, backup configuration, capacity planning, and instance lifecycle management. EC2 requires significantly more operational expertise than serverless alternatives like Lambda or container platforms like ECS Fargate.' },
      { pro: 'The widest variety of instance types of any cloud provider — from burstable T4g for low-cost web servers to GPU-powered P5 for ML training and Nitro-based M7g for general-purpose — enabling fine-grained cost and performance optimization for every workload type.', con: 'Over-provisioning is common and expensive, especially with Reserved Instances that commit to a specific instance type. Rightsizing requires continuous monitoring with tools like AWS Compute Optimizer and may require instance type changes that involve downtime or migration effort.' },
      { pro: 'Flexible pricing models including On-Demand (no commitment), Reserved Instances and Savings Plans (up to 72% discount), Spot (up to 90% discount), and Dedicated Hosts (for BYOL and compliance), allowing cost optimization across diverse workload patterns.', con: 'Spot instances can be interrupted with a 2-minute warning, requiring applications to be designed for interruption handling. Reserved Instances lock you into specific instance families and regions, limiting architectural flexibility. Managing a mix of pricing models increases operational complexity.' },
    ],
  },
};

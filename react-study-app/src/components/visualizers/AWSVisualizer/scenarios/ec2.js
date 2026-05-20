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
      { title: 'EC2 Instance Lifecycle', content: 'Launch (PENDING → RUNNING), STOP (compute released, EBS persists), HIBERNATE (RAM saved to EBS), TERMINATE (destroyed). Public IP changes on stop/start unless using Elastic IP.' },
      { title: 'Instance Types and Families', content: 't (burstable), m (general), c (compute), r (memory), i (storage), g (GPU). Choose based on workload — CPU-bound, memory-bound, or I/O-bound.' },
    ],
    why: ['EC2 is the foundation of AWS compute — understanding instance lifecycle, storage options, and Auto Scaling is essential for designing cost-effective, resilient architectures.'],
    interview: [
      { question: 'What happens when you stop and start an EC2 instance?', answer: 'The instance moves to a new physical host. EBS volumes persist with data intact. Private IP is preserved (if same AZ), but public IP changes unless using an Elastic IP. No EC2 compute charge while stopped.', followUps: ['What happens to instance store volumes on stop?', 'Can you change instance type while stopped?'] },
      { question: 'How does EC2 Auto Scaling work?', answer: 'Auto Scaling Groups maintain desired instance count using Launch Templates. They auto-replace unhealthy instances via ALB health checks and scale based on policies (target tracking, step scaling, scheduled).', followUps: ['What is the difference between scale-out and scale-up?', 'How do you handle graceful shutdown during scale-in?'] },
    ],
    gotcha: ['Instance store volumes lose data on stop/termination — they are ephemeral. Always use EBS for persistent data.', 't2/t3 burstable instances accumulate CPU credits. When credits are exhausted, CPU throttles to baseline — workloads above baseline will see performance degradation.'],
    tradeoffs: [
      { pro: 'Complete control over the OS, kernel, and software — install anything, configure everything, no platform limitations.', con: 'Full operational responsibility — patching, security, backups, and capacity planning are your problem, not AWS\'s.' },
      { pro: 'Wide variety of instance types and pricing models (On-Demand, Reserved, Spot) allows fine-grained cost optimization.', con: 'Over-provisioning is common and expensive. Rightsizing requires continuous monitoring and instance type changes.' },
    ],
  },
};

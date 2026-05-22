import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildECSSteps() {
  const steps = []; const s = {
    nodes: [
      svc('dev',         'Developer / CI',    'client', 30, 170, { desc: 'Developer pushing code. CI pipeline builds Docker image, pushes to ECR, updates ECS service with new task definition.' }),
      svc('ecsCluster',  'ECS Cluster',       'server', 230, 170, { desc: 'Logical grouping of resources (EC2 instances or Fargate tasks). Cluster = namespace for services. Default VPC cluster auto-created. Key setting: Container Insights (metrics + logs per container).', containerInsights: true }),
      svc('ec2Launch',   'EC2 Launch Type\n(Container Instance)', 'server', 430, 70, { desc: 'EC2-based ECS. You manage EC2 instances (patching, scaling, AMI). Each instance runs ECS Agent + Docker daemon. More control, more management. Good for: GPU workloads, large data sets, compliance.', instanceType: 'm5.large', os: 'ECS-optimized Amazon Linux 2' }),
      svc('fargate',     'Fargate Launch\nType', 'server', 430, 240, { desc: 'Serverless ECS — no EC2 management. AWS manages infrastructure (CPU, memory, networking, patching). Pay per vCPU + GB per second. Good for: most workloads, bursty traffic, no server team.', platformVersion: '1.4' }),
      svc('ecr',         'ECR\n(Docker Registry)', 'db', 430, 400, { desc: 'Elastic Container Registry. Store, sign, scan, deploy container images. Integrated with ECS (no secrets needed). Image scanning for CVEs. Lifecycle rules to expire old images.', scanOnPush: true }),
      svc('alb',         'ALB\n(Target Group)', 'apigw', 630, 170, { desc: 'Application Load Balancer. Distributes traffic across ECS tasks (via dynamic host port mapping). Health checks per container. Path-based routing to different services.', scheme: 'internet-facing' }),
      svc('cwLogs',      'CloudWatch\nLogs',    'lambda', 630, 320, { desc: 'Container logs collected by awslogs driver. Each task has its own log stream (stdout + stderr). Metrics from Container Insights (CPU, memory, network per task/service/cluster).', retention: 90 }),
    ],
    edges: [
      { from: 'dev', to: 'ecr' }, { from: 'dev', to: 'ecsCluster' },
      { from: 'ecsCluster', to: 'ec2Launch' }, { from: 'ecsCluster', to: 'fargate' },
      { from: 'ecr', to: 'ec2Launch' }, { from: 'ecr', to: 'fargate' },
      { from: 'alb', to: 'fargate' }, { from: 'alb', to: 'ec2Launch' },
      { from: 'fargate', to: 'cwLogs' }, { from: 'ec2Launch', to: 'cwLogs' },
    ],
    packets: [], events: [],
    metrics: { tasks: 0, running: 0, cpu: 0, memory: 0, deploys: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'ECS = Elastic Container Service. Run Docker containers at scale with AWS. Two launch types: EC2 (you manage the servers) and Fargate (serverless, no server management). Both run in an ECS Cluster. ECS is regional — resources live in a single region. Key concepts: Task Definition (JSON recipe for a container), Task (running instance), Service (keep N tasks running), Cluster (group of resources).', 1);

  s.events.push({ type: 'info', msg: 'Dockerfile → build → push to ECR → create Task Definition → deploy to Service. CI/CD can automate all steps.' });
  s.packets = [pkt('dev', 'ecr', 'docker push myapp:latest', 'request')];
  s.metrics.deploys = 1;
  snap(steps, s, 'Container workflow: 1) Write Dockerfile, 2) Build image (docker build -t myapp .), 3) Push to ECR (docker push), 4) Create/update Task Definition referencing image, 5) Deploy to ECS Service. ECS Fargate: no Docker daemon to manage — AWS runs your container on shared infrastructure. ECS EC2: ECS Agent on each EC2 manages container lifecycle. Both use the same Task Definition format.', 2);

  s.nodes[3].state = 'active';
  s.events.push({ type: 'ok', msg: 'Fargate task definition: {"family":"myapp","containerDefinitions":[{"name":"web","image":"myapp:latest","portMappings":[{"containerPort":3000}]}],"requiresCompatibilities":["FARGATE"],"networkMode":"awsvpc","cpu":"512","memory":"1024"}' });
  snap(steps, s, 'Task Definition = blueprint for your container. JSON format. Key fields: family (logical name), containerDefinitions (array: name, image, portMappings, environment, secrets, logConfiguration, healthCheck), requiresCompatibilities (FARGATE or EC2), networkMode (awsvpc — each task gets its own ENI + IP), cpu/memory (Fargate: 256-16384 CPU units, 512-122880 MB). Task definition is versioned (revision:1, revision:2). Your Service points to family:revision. Updates: create new revision, update service.', 3);

  s.packets = [pkt('ecsCluster', 'fargate', 'RunTask: 2 tasks (512 CPU, 1024MB)', 'request')];
  s.nodes[2].state = 'active'; s.metrics.tasks = 2; s.metrics.running = 2; s.metrics.cpu = 25; s.metrics.memory = 30;
  s.events.push({ type: 'ok', msg: 'Service created: desiredCount=2, minHealthyPercent=100, maxPercent=200. Rolling update strategy.' });
  snap(steps, s, 'ECS Service = keeps N tasks running. Desired count: target number of tasks. Rolling update: minHealthyPercent + maxPercent control deployment — e.g., min=100, max=200 means 2 tasks min healthy during update, 4 max total (creates 2 new, waits for them to be healthy, then stops 2 old). Health check: ALB target group health check (HTTP /health) or ECS service health check. Auto-restarts: if task fails, ECS replaces it (respawning loop). Service Auto Scaling: based on CPU, memory, ALB request count, or custom metrics (target tracking).', 4);

  s.events.push({ type: 'info', msg: 'Task placement strategies (EC2): binpack (densest — cost), spread (across AZs — HA), distinctInstance (1 per host — best for log collectors).' });
  snap(steps, s, 'Task placement strategies (EC2 launch type only — Fargate spreads automatically). BINPACK: pack tasks on as few instances as possible (cheapest, less EC2 cost). SPREAD: spread across AZs and instances (best for high availability). DISTINCT_INSTANCE: max 1 task per instance (use for log agents, monitoring agents). Combined strategies: first spread across AZs, then binpack within each AZ. ECS Scheduler decides where to place tasks based on: CPU/memory available, port conflicts, placement constraints (instance attributes like instanceType, availabilityZone).', 5);

  s.events.push({ type: 'ok', msg: 'Fargate vs EC2: Fargate (pay per task, no EC2 management). EC2 (pay per EC2, more control, GPU support, data volumes). Spot: up to 70% cheaper.' });
  snap(steps, s, 'Fargate launch type: AWS manages EC2 instances — no patching, no scaling, no AMI updates. Pay per container resources (vCPU + GB per second, ~$0.04048/vCPU-hr + $0.004445/GB-hr). Min 1s, 15min minimum billing. EC2 launch type: you manage EC2 instances (ASG, patching, instance types). Pay for EC2 instances (regardless of how many tasks run). Use EC2 for: GPU (p3/p4/g5), large memory (>120GB), Windows containers, need to optimize cost for stable high-volume workloads. Spot Fargate (up to 70% off): Fargate Spot — interruptions possible, use for fault-tolerant / stateless workloads.', 6);

  s.nodes[5].state = 'active';
  s.packets = [pkt('alb', 'fargate', 'GET / → port 3000 (dynamic host port)', 'request')];
  s.packets = [pkt('fargate', 'alb', '200 OK: index.html', 'response')];
  s.metrics.running = 2;
  s.events.push({ type: 'ok', msg: 'ALB → Fargate task. Dynamic port mapping: ALB maps host_port:0 → container:3000. Each task gets unique port from ephemeral range.' });
  snap(steps, s, 'ALB integration with ECS: each task gets a dynamic host port (port 0 = AWS assigns). ALB target group uses "instance" mode: register EC2 instance + port. Or "ip" mode (Fargate): register ENI IP + container port. Health check path: configure per target group (HTTP /health → 200). Stickiness: session affinity (cookie-based). Path-based routing: /api/* → backend service, /* → frontend service. Host-based routing: api.example.com → backend. Security group: allow from ALB SG on ephemeral ports.', 7);

  s.nodes[6].state = 'active';
  s.packets = [pkt('fargate', 'cwLogs', '{"msg":"request served","user":42,"duration":23}', 'request')];
  s.events.push({ type: 'ok', msg: 'Container logs: awslogs driver sends stdout/stderr → CloudWatch Logs. Container Insights: CPU, memory, network per task.' });
  snap(steps, s, 'Logging: ECS uses awslogs Docker log driver. Configuration in Task Definition: "logConfiguration":{"logDriver":"awslogs","options":{"awslogs-group":"/ecs/myapp","awslogs-region":"us-east-1","awslogs-stream-prefix":"web"}}. Each task gets its own log stream. Container Insights: metrics per task (CPU, memory, network, disk). Enable at cluster level. View in CloudWatch Container Insights dashboard. Map of running tasks with resource usage. Filter: which tasks are CPU-bound, memory-bound. ECS Exec: ssh into running container (aws ecs execute-command).', 8);

  s.nodes[3].state = 'error';
  s.metrics.running = 1; s.metrics.cpu = 0;
  s.events.push({ type: 'error', msg: '💥 Fargate task resource exhaustion: OutOfMemoryError (1024MB limit). Task fails. ECS service replaces it: desiredCount restored.' });
  snap(steps, s, 'Failure scenario: container exceeds memory limit (hard limit set in Task Definition: 1024 MB). Linux OOM killer terminates the container. ECS marks task as STOPPED (exit code 137 = SIGKILL). ECS Service detects task count < desiredCount → starts replacement task immediately. Event: ECS service event "service myapp has started 1 tasks". CloudWatch alarm: create metric filter for OOM errors. Best practice: set softLimit (allow bursting if host has capacity) + hardLimit (hard stop). Monitor MemoryReservation (soft) vs Memory (hard).', 9);

  s.nodes[3].state = 'active'; s.metrics.running = 2; s.metrics.cpu = 15;
  s.events.push({ type: 'ok', msg: 'Task replaced (2 running). Service auto-heals: desiredCount always maintained. Event logged: "service myapp has stopped 1 tasks", "service myapp has started 1 tasks".' });
  snap(steps, s, 'Self-healing: ECS Service maintains desiredCount forever — always replacing failed tasks. This is the fundamental HA property. Scale-in protection: prevent ECS from terminating a specific task (e.g., long-running job). ECS manages the lifecycle: PENDING → RUNNING → STOPPED. Replacement strategy: if rolling update is active, ECS follows min/max percent rules. For Fargate: replacement may start faster (AWS manages capacity). For EC2: replacement depends on instance capacity (if full, ASG may need to scale first).', 10);

  s.events.push({ type: 'info', msg: 'Service Auto Scaling: target tracking → CPU 50% (scale out when sustained). Min=2, Max=10. Cooldown: 60s between scale events.' });
  snap(steps, s, 'Service Auto Scaling: Application Auto Scaling integrated with ECS. Target tracking: simplest — "keep CPU at 50%" or "keep ALB request count at 1000". Step scaling: scale out +2 when CPU > 70%, scale in -1 when CPU < 30%. Scheduled scaling: scale up before known traffic spikes (e.g., Black Friday). Cooldown period: prevents rapid oscillations (default 300s). Requires IAM role: ecsAutoscaleRole. GetServiceStatistics: monitor scaling activities. Enable on Service update. Combined with CloudWatch alarms for advanced logic.', 11);

  s.nodes[3].state = 'active';
  s.events.push({ type: 'ok', msg: 'App Mesh sidecar: Envoy proxy runs alongside app container. Service-to-service traffic encrypted, observable, routed. Canary deployments at mesh level.' });
  snap(steps, s, 'AWS App Mesh: service mesh for ECS/EC2/EKS/K8s. Sidecar pattern: Envoy proxy runs as sidecar container in same task. App communicates via localhost: proxy intercepts, encrypts, routes, and observes. Features: traffic routing (canary v1 → 90%, v2 → 10%), circuit breaking, retries, timeouts, metrics (HTTP, gRPC, TCP metrics → CloudWatch), distributed tracing (X-Ray), mutual TLS. Enables: blue-green deployment with fine-grained traffic shifting, fault injection testing (Chaos Engineering), observability without code changes. Task Definition: add "envoy" container from App Mesh image.', 12);

  s.nodes[4].state = 'active';
  s.events.push({ type: 'info', msg: 'ECR image scan: CRITICAL CVE found in base image (openssl CVE-2024-...). Push fixed image → update Task Definition → rolling update.' });
  snap(steps, s, 'ECR image scanning: CVE scanning on push. Two modes: Basic (free, Common Vulnerabilities and Exposures) and Enhanced (Amazon Inspector, $ per scan — deeper, network reachability). Findings in ECR console + AWS Inspector. Fix: rebuild image with patched base image → push new tag → update Task Definition revision → ECS rolling update replaces running tasks. ECR lifecycle policy: auto-delete old untagged images ("expireUntaggedImages": {"countNumber": 30}). Repo per app: separate repository for each application (clear permissions + lifecycle).', 13);

  s.events.push({ type: 'ok', msg: 'ECS Exec: aws ecs execute-command --cluster MyCluster --task abc123 --container web --interactive --command "/bin/sh". No SSH, no bastion, no public IP. Uses SSM Session Manager.' });
  snap(steps, s, 'ECS Exec: interactive shell into running container without SSH keys or open ports. How it works: ECS Agent + SSM Agent + Session Manager plugin. Prerequisites: EnableExecuteCommand in Service/Task, IAM permissions (ecs:ExecuteCommand, ssm:StartSession). Security: audit via CloudTrail (who accessed which container, when). No need for SSH daemon in container (smaller, more secure). Use for: debugging, database migrations, one-off commands. Limits: not supported with AWS Graviton for execute-command (check AWS docs).', 14);

  s.events.push({ type: 'info', msg: 'Secrets injection: Task Definition references SSM Parameter Store or Secrets Manager. Environment variable populated at task start. No secrets in code.' });
  snap(steps, s, 'Secrets injection: reference AWS Secrets Manager or SSM Parameter Store in Task Definition. Example: "secrets":[{"name":"DB_PASSWORD","valueFrom":"arn:aws:ssm:us-east-1:123:parameter/db-password"}]. At task start, ECS fetches the secret and injects as environment variable. Benefits: no secrets in Dockerfile, no secrets in task definition JSON, rotation handled by Secrets Manager, CloudTrail audit of secret access. EFS integration: mount EFS filesystem to Fargate tasks — shared persistent storage across tasks (use cases: WordPress uploads, file processing, shared config). Requires: EFS in same VPC + access point.', 15);

  s.result = 'ECS: Task Definition → Service (N tasks) → Fargate/EC2. Auto-heals, auto-scales. ALB + Container Insights + ECS Exec.';
  snap(steps, s, 'Key takeaways: 1) Fargate = serverless containers (no EC2 management). 2) EC2 launch type = more control, GPU support. 3) Task Definition is the unit of deployment (versioned). 4) Service maintains desired count (self-healing). 5) Rolling update with min/max percent (zero-downtime deploys). 6) ALB + dynamic port mapping. 7) Container Insights for monitoring. 8) ECS Exec for debugging. 9) App Mesh for service mesh. 10) Secrets injection from SSM/Secrets Manager. 11) EFS integration for persistent storage. 12) Spot Fargate for cost savings.', 16);

  return steps;
}

const CODE = [
  '# Create ECR repo and push image',
  'aws ecr create-repository --repository-name myapp --image-scanning-configuration scanOnPush=true',
  'aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123.dkr.ecr.us-east-1.amazonaws.com',
  'docker build -t myapp .',
  'docker tag myapp:latest 123.dkr.ecr.us-east-1.amazonaws.com/myapp:latest',
  'docker push 123.dkr.ecr.us-east-1.amazonaws.com/myapp:latest',
  '# Register Task Definition (Fargate)',
  `aws ecs register-task-definition --family myapp --requires-compatibilities FARGATE \\
    --network-mode awsvpc --cpu 512 --memory 1024 --execution-role-arn ecsTaskRole \\
    --container-definitions '[{"name":"web","image":"myapp:latest","portMappings":[{"containerPort":3000}],"logConfiguration":{"logDriver":"awslogs","options":{"awslogs-group":"/ecs/myapp","awslogs-region":"us-east-1","awslogs-stream-prefix":"web"}}}]'`,
  '# Create ECS Service (Fargate)',
  `aws ecs create-service --cluster MyCluster --service-name myapp-service \\
    --task-definition myapp:1 --desired-count 2 --launch-type FARGATE \\
    --network-configuration "awsvpcConfiguration={subnets=[subnet-123],securityGroups=[sg-123],assignPublicIp=ENABLED}" \\
    --load-balbers targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=web,containerPort=3000`,
  '# Update service (rolling update)',
  'aws ecs update-service --cluster MyCluster --service myapp-service --task-definition myapp:2',
  '# Auto Scaling (target tracking)',
  `aws application-autoscaling register-scalable-target --service-namespace ecs \\
    --resource-id service/MyCluster/myapp-service --scalable-dimension ecs:service:DesiredCount --min-capacity 2 --max-capacity 10`,
  `aws application-autoscaling put-scaling-policy --policy-name cpu50 --service-namespace ecs \\
    --resource-id service/MyCluster/myapp-service --scalable-dimension ecs:service:DesiredCount \\
    --policy-type TargetTrackingScaling \\
    --target-tracking-scaling-policy-configuration file://cpu50.json`,
  '# ECS Exec into running container',
  'aws ecs execute-command --cluster MyCluster --task abc123 --container web --interactive --command "/bin/sh"',
  '# ECR image scan',
  'aws ecr start-image-scan --repository-name myapp --image-id imageTag=latest',
  '# List running tasks',
  'aws ecs list-tasks --cluster MyCluster --service-name myapp-service',
  '# Task Definition JSON (snippet)',
  'secrets: [{ name: "DB_PASSWORD", valueFrom: "arn:aws:ssm:.../db-password" }]',
  'efsVolumeConfig: { fileSystemId: fs-123, rootDirectory: "/data" }',
];

export default {
  id: 'ecs', label: 'ECS', icon: '🐳',
  build: buildECSSteps, code: CODE, language: 'CLI',
  metrics: [
    { key: 'tasks',   label: 'Tasks (total)',  max: 10,  color: 'var(--node-default)' },
    { key: 'running', label: 'Running',         max: 5,   color: 'var(--pod-running)' },
    { key: 'cpu',     label: 'CPU %',           max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
    { key: 'memory',  label: 'Memory %',        max: 100, unit: '%', color: 'var(--pod-crash)', warn: 75, critical: 90 },
    { key: 'deploys', label: 'Deployments',     max: 5,   color: 'var(--node-path)' },
  ],
  topicContent: {
    concept: [
      { title: 'ECS Launch Types — Fargate vs EC2', content: 'Fargate is serverless container compute — AWS manages the underlying EC2 instances, you define CPU and memory per task, and you pay per vCPU-hour and GB-hour consumed. EC2 launch type gives you full control over the container instances including the ability to use GPU instances (p3, p4, g5), large memory configurations (up to 24TB with i3.metal), and cost optimization through Reserved Instances and Spot pricing for steady-state workloads.' },
      { title: 'Task Definitions and Services', content: 'A Task Definition is a JSON blueprint that defines your container configuration — the Docker image, CPU and memory limits, port mappings, environment variables, secrets references, log configuration, and health check settings. An ECS Service maintains a desired count of running tasks from a specific Task Definition revision, automatically replacing failed tasks (self-healing), distributing them across Availability Zones, and integrating with ALB target groups for traffic routing. Services support rolling updates controlled by minHealthyPercent and maxPercent parameters to achieve zero-downtime deployments.' },
      { title: 'Deep — ECS Architecture and Networking', content: 'ECS leverages the AWS Nitro system for networking — each Fargate task or EC2 container instance gets its own Elastic Network Interface with a private IP from your VPC subnet. Tasks communicate within the VPC natively, and security groups control traffic per task (Fargate) or per instance (EC2). The ECS cluster is a regional construct that can span multiple Availability Zones. The ECS scheduler (for EC2) uses binpack, spread, or distinct-instance placement strategies to decide where to run tasks based on CPU, memory, port availability, and custom attributes. Fargate tasks are scheduled by AWS\'s internal orchestrator which spreads tasks across AZs automatically and handles underlying host management transparently.' },
    ],
    why: [
      'Container orchestration eliminates the works-on-my-machine problem and enables consistent deployments across dev, staging, and production environments by packaging the application with all its dependencies in a Docker image. ECS on AWS provides the deepest integration with the AWS ecosystem — ALB for traffic distribution, CloudWatch Container Insights for per-task monitoring, ECR for image storage and vulnerability scanning, and App Mesh for service-to-service networking and observability.',
      'ECS Fargate eliminates entire categories of operational work including OS patching, instance capacity planning, AMI management, and Docker daemon maintenance. Teams can focus on building and deploying containers without a dedicated infrastructure team. For steady-state high-volume workloads, the EC2 launch type with Reserved Instances or Savings Plans provides 40-60% cost reduction compared to Fargate, making it the economical choice for predictable, always-on services.',
      'ECS provides built-in self-healing and auto-scaling that respond to application demand in real time. The ECS Service scheduler maintains the desired task count indefinitely, automatically replacing failed tasks due to OOM, hardware failure, or application crashes. Service Auto Scaling with target tracking adjusts capacity based on CPU, memory, or ALB request count per target, enabling applications to handle traffic spikes without manual intervention.',
    ],
    interview: [
      { q: 'What is the difference between ECS Fargate and ECS EC2 launch types?', a: 'Fargate is serverless — AWS manages all infrastructure including patching, capacity, and networking. You define CPU and memory per task and pay per vCPU-hour and GB-hour consumed with no minimum billing for short tasks. EC2 launch type requires you to manage EC2 instances including OS patching, instance type selection, Auto Scaling Groups, and capacity planning. EC2 gives you access to GPU instances for ML workloads, large memory configurations up to 24TB, and cost savings of 40-60% through Reserved Instances or Savings Plans for steady-state workloads. Fargate Spot offers up to 70% discount for interruptible workloads, identical to EC2 Spot but without managing spot instance lifecycle.', followUps: ['When would you choose EC2 over Fargate?', 'How does Spot pricing work with Fargate and what workloads are suitable?'] },
      { q: 'How does ECS Service Auto Scaling work?', a: 'ECS uses Application Auto Scaling which integrates with CloudWatch alarms. Three scaling methods are available: target tracking (simplest — you set a target value like CPU at 50% and ECS maintains it automatically), step scaling (you define CloudWatch alarm thresholds and specify how many tasks to add or remove at each level, like add 2 tasks when CPU exceeds 70%), and scheduled scaling (you define recurring schedules for predictable traffic patterns like scaling up before Black Friday). The cooldown period prevents rapid scaling oscillations. For Fargate, scaling is faster because no EC2 instances need to be launched. During rolling updates, minHealthyPercent and maxPercent control the deployment speed and safety — for example, min=100 and max=200 means ECS starts new tasks before stopping old ones, ensuring zero downtime.', followUps: ['What happens during a rolling update with minHealthyPercent and maxPercent?', 'How does ECS handle a task that fails immediately after starting?'] },
      { q: 'How does ECS networking work with ALB and dynamic port mapping?', a: 'ECS uses the awsvpc network mode by default for Fargate and optionally for EC2, which gives each task its own Elastic Network Interface and private IP address from the VPC subnet. With Fargate, port mapping is straightforward because each task has its own ENI and ALB can target the container port directly on the task\'s IP. For EC2 launch type, dynamic port mapping allows multiple tasks on the same EC2 instance — the ECS agent assigns a unique high-port (from the ephemeral range) to each task\'s container port, and the ALB target group registers the instance IP plus that dynamic port. The ALB security group must allow traffic on the full ephemeral port range (32768-65535). ECS manages the registration and deregistration of targets in the ALB target group as tasks start and stop.', followUps: ['How does dynamic port mapping work on EC2 launch type?', 'What security group rules are needed for ECS with ALB?'] },
    ],
    gotcha: [
      'Fargate tasks have a hard memory limit defined in the Task Definition — if the container exceeds this limit, the Linux OOM killer terminates it with exit code 137. ECS immediately replaces the task, but this creates a restart loop if the memory issue is persistent. Always set both soft limits (CPU and memory reservation) below hard limits and monitor MemoryReservation and Memory metrics in CloudWatch.',
      'ECS Exec requires the SSM Agent and the AmazonECSExecRole IAM policy — it is not available for all Fargate platform versions (requires 1.4.0+) and does not work with Graviton-based tasks in some configurations. Additionally, EnableExecuteCommand must be set at service or task creation time and cannot be added later without recreating the service.',
      'Task Definition revisions are immutable — you cannot edit a published revision, only create a new one. Environment variables, secrets, and container configurations are frozen at revision creation. This means any configuration change requires a new revision and a service update, which triggers a rolling deployment.',
      'Placement constraints for EC2 launch type can cause unexpected deployment failures. If you use distinctInstance placement (one task per instance) and have fewer instances than desired tasks, ECS will leave tasks in PENDING state until you add more instances. Similarly, spread across AZs requires at least one instance in each AZ for the scheduler to place tasks.',
    ],
    tradeoffs: [
      { pro: 'Deep AWS integration with ALB for traffic distribution, CloudWatch Container Insights for per-task monitoring, ECR for image storage and vulnerability scanning, App Mesh for service mesh, and Secrets Manager for secret injection — all with minimal configuration and no additional tooling needed.', con: 'Vendor lock-in is significant — ECS is AWS-only. Migrating to another cloud provider or on-premises requires rewriting deployment manifests for Kubernetes or alternative orchestrators. Use ECS if you are all-in on AWS; consider EKS for multi-cloud portability.' },
      { pro: 'Fargate eliminates all infrastructure management overhead including OS patching, Docker daemon maintenance, instance type selection, capacity planning, and Auto Scaling Group configuration. Teams deploy containers without needing a dedicated infrastructure operations team.', con: 'Fargate costs more per unit of compute for steady-state workloads compared to EC2 with Reserved Instances or Savings Plans. For a service running 24/7 for a year, Fargate can be 30-60% more expensive than the equivalent EC2 Reserved Instance configuration.' },
      { pro: 'ECS integrates natively with AWS IAM roles at the task level (task role), giving each container its own AWS credentials with least-privilege permissions. No access keys to manage, no secrets in environment variables for AWS SDK access.', con: 'ECS lacks the rich ecosystem of Kubernetes — no built-in service mesh (requires App Mesh), no native ingress controller (requires ALB), and no community extensions like cert-manager, Prometheus Operator, or Istio without significant custom setup.' },
    ],
  },
};

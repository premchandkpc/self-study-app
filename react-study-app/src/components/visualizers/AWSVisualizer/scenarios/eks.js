import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildEKSSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('alb',     'ALB\n(Load Balancer)', 'apigw',  50,  180),
      svc('eks',     'EKS\nControl Plane',   'server', 230, 180, { nodes: 0, pods: 0, version: '1.28' }),
      svc('ng1',     'Node Group 1\n(t3.xl)', 'server', 430, 80,  { nodes: 2, cpu: 20, type: 'on-demand', maxSize: 5 }),
      svc('ng2',     'Node Group 2\n(t3.2xl)','server', 430, 230, { nodes: 1, cpu: 10, type: 'spot', maxSize: 3 }),
      svc('ecr',     'ECR Registry',           'db',     630, 100),
      svc('fargate', 'Fargate Profile\n(serverless)', 'lambda', 630, 280, { pods: 0 }),
      svc('irsa',    'IAM Roles\nfor SA',      'server', 630, 400),
    ],
    edges: [
      { from: 'alb',  to: 'eks' },
      { from: 'eks',  to: 'ng1' },
      { from: 'eks',  to: 'ng2' },
      { from: 'eks',  to: 'ecr' },
      { from: 'eks',  to: 'fargate' },
      { from: 'irsa', to: 'ng1' },
    ],
    packets: [], events: [],
    metrics: { nodes: 3, pods: 0, cpu: 15, cost: 0, fargatePods: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'EKS = managed Kubernetes on AWS. AWS runs the control plane (API server, etcd, scheduler) for free. You pay only for worker nodes (EC2) and Fargate pods. Same Kubernetes API — works with kubectl, Helm, ArgoCD.', 1);

  s.events.push({ type: 'ok', msg: 'kubectl apply -f deployment.yaml → EKS API server → scheduler → node binding' });
  s.packets = [pkt('eks', 'ecr', 'pull: my-app:v1.2 (500MiB image)', 'request')];
  s.nodes.find(n => n.id === 'ng1').pods = 2;
  s.nodes.find(n => n.id === 'ng1').cpu = 35;
  s.metrics.pods = 2; s.metrics.cpu = 35;
  s.events.push({ type: 'ok', msg: 'Scheduler placed 2 pods on ng1 (t3.xl: 4vCPU, 16GiB RAM). Image pulled from ECR (cached on node).' });
  snap(steps, s, 'Deployment: kubectl apply → EKS API server receives the deployment manifest → scheduler picks node with sufficient resources → kubelet pulls image from ECR → container runtime starts pods. Node selection based on: resource requests/limits, nodeSelector, affinity/anti-affinity, taints/tolerations. ECR image pull: first time pulls full image, subsequent pulls use cached layers.', 2);

  s.events.push({ type: 'info', msg: 'NodeGroup1: on-demand (2 nodes, t3.xl). NodeGroup2: spot (1 node, t3.2xl). Spot = 60-90% cheaper but can be reclaimed.' });
  snap(steps, s, 'EKS node groups: managed EC2 Auto Scaling groups. On-demand: reliable, full price. Spot: 60-90% cheaper but AWS can reclaim with 2min notice. Best practice: on-demand for critical workloads (control plane, databases), spot for stateless batch/workers. Use `topology.kubernetes.io/zone` labels for multi-AZ spread. EKS supports nodes in 3 AZs for HA.', 3);

  s.packets = [pkt('alb', 'eks', 'Ingress: app.mycompany.com → Service', 'request')];
  s.nodes[0].state = 'active';
  s.events.push({ type: 'ok', msg: 'AWS Load Balancer Controller: detects Ingress resource, provisions ALB, creates TargetGroup per service' });
  snap(steps, s, 'AWS Load Balancer Controller (formerly ALB Ingress Controller): watches for Kubernetes Ingress resources → provisions ALB in AWS. Path-based routing: /api/* → backend service, /* → frontend service. Per-path TargetGroups. Controller also handles NLB for TCP/UDP traffic (Service type=LoadBalancer). SSL termination at ALB with ACM certificates. Annotations: alb.ingress.kubernetes.io/scheme=internet-facing, alb.ingress.kubernetes.io/listen-ports=[{"HTTP": 80}, {"HTTPS": 443}]', 4);

  s.nodes.find(n => n.id === 'ng1').cpu = 85;
  s.metrics.cpu = 85;
  s.events.push({ type: 'warn', msg: 'CPU 85% on ng1 → Cluster Autoscaler triggers ASG scale-out (+1 t3.xl). karpenter could do it in 60s.' });
  snap(steps, s, 'Cluster Autoscaler: detects pending pods (node has no capacity) → scales ASG up. Takes ~2-5min for EC2 to join. Karpenter (newer, faster alternative): watches for pending pods → provisions optimal EC2 directly (not through ASG). Launches in ~60s. Supports: instance diversification (t3, t4g, m6i), spot + on-demand mix, custom provisioning specs. Gradual replacement of Cluster Autoscaler.', 5);

  s.nodes.find(n => n.id === 'ng1').nodes = 3;
  s.nodes.find(n => n.id === 'ng1').cpu = 48;
  s.metrics.nodes = 4; s.metrics.cpu = 48; s.metrics.cost = 2;
  s.events.push({ type: 'ok', msg: 'New node joined. Karpenter launched c6i.xl (cheaper than t3 for this workload). Pods scheduled.' });
  snap(steps, s, 'Scale-out complete. New EC2 node (possibly different type — Karpenter picks optimal). Pending pods are scheduled. Existing pods unaffected — only new pods land on the new node. Cluster Autoscaler scales down after 10+ min of low utilization. Pod Disruption Budgets (PDBs): control how many pods can be down during voluntary disruptions (node drain, upgrades). Essential for HA workloads.', 6);

  s.nodes.find(n => n.id === 'fargate').state = 'active';
  s.nodes.find(n => n.id === 'fargate').pods = 3;
  s.metrics.fargatePods = 3;
  s.events.push({ type: 'ok', msg: 'Fargate: 3 pods run without EC2 nodes. Each pod = 1 microVM. Pay per vCPU + memory per second.' });
  snap(steps, s, 'EKS Fargate: each pod runs in its own microVM. No EC2 nodes to manage, no scaling, no patching. Use for: batch jobs, CI/CD runners, infrequent workloads, workloads requiring strong isolation. Limitations: no DaemonSets, no privileged containers, no hostNetwork. Selector: namespace + label match → pods go to Fargate vs EC2. Pricing: per vCPU + per GB memory per second (with 1min minimum).', 7);

  s.nodes.find(n => n.id === 'irsa').state = 'active';
  s.events.push({ type: 'info', msg: 'IRSA: IAM Role for Service Account. Pod gets temporary AWS credentials via OIDC provider. No long-lived keys in pods!' });
  snap(steps, s, 'IRSA (IAM Roles for Service Accounts): pod gets AWS credentials via OIDC federation. How: 1) Create IAM role with trust policy allowing EKS OIDC provider. 2) Annotate K8s serviceAccount with role ARN. 3) EKS pod webhook injects AWS env vars + projected volume. 4) AWS SDK inside pod assumes the role → temporary credentials. No hardcoded secrets! Each serviceAccount gets different permissions (least privilege).', 8);

  s.events.push({ type: 'ok', msg: 'EBS CSI Driver: Pod claims 50GiB gp3 via PVC → EBS volume auto-created and attached to node. Cross-AZ failover: use EFS (NFS).' });
  snap(steps, s, 'EBS CSI Driver: provides persistent storage for EKS. PVC (PersistentVolumeClaim) → EBS volume created and attached to node. Supports: gp3 (general purpose, 3000 IOPS baseline), io2 (provisioned IOPS up to 64K). Limitation: EBS is AZ-specific (us-east-1a) — pod can only use EBS in the same AZ. For cross-AZ: use EFS (NFS, shared across AZs) or S3 (object storage). EBS CSI supports volume snapshots + cross-AZ restore.', 9);

  s.events.push({ type: 'warn', msg: 'Cluster upgrade: 1.27 → 1.28. Control plane upgraded first, then nodes (mutable). Skip only 1 minor version max.' });
  snap(steps, s, 'EKS version upgrades: AWS manages control plane upgrade (API server + etcd). Node groups: upgrade manually (new AMI) or use managed node group update. Rules: can only skip 1 minor version at a time (1.27→1.28, not 1.27→1.29). Test addon compatibility: CoreDNS, kube-proxy, VPC CNI, AWS LB Controller. Use `eksctl upgrade cluster` or eksctl managed nodegroup upgrade. Plan for deprecations: API versions removed after several releases.', 10);

  s.result = 'EKS: managed control plane → EC2/Fargate workers → ALB → IRSA → EBS → Karpenter auto-scale.';
  snap(steps, s, 'Key takeaways: 1) AWS Load Balancer Controller for ALB/NLB ingress. 2) Karpenter over Cluster Autoscaler (faster, cheaper). 3) IRSA for pod-level AWS permissions (never use instance role for everything). 4) Fargate for burst/serverless workloads. 5) EBS CSI for persistent storage (AZ limited — use EFS for multi-AZ). 6) VPC CNI assigns real ENI + IP per pod — native VPC networking (no overlay, no encapsulation). 7) Security: Security Groups per Pod (feature), network policies (Calico or native). Cost: no control plane charge, pay for nodes + EBS + LB.', 11);

  return steps;
}

const CODE = [
  '# Create EKS cluster',
  'eksctl create cluster \\',
  '  --name prod --region us-east-1 \\',
  '  --nodegroup-name ng-1 \\',
  '  --node-type t3.xlarge \\',
  '  --nodes 3 --nodes-min 1 --nodes-max 10',
  '# Karpenter provisioner',
  'eksctl create cluster --karpenter',
  '# Fargate profile',
  'eksctl create fargateprofile \\',
  '  --cluster prod --name fp-default',
  '# IAM Role for ServiceAccount',
  'eksctl create iamserviceaccount \\',
  '  --name my-sa --namespace default',
  '  --cluster prod',
  '  --attach-policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
];

export default {
  id: 'eks',
  label: 'EKS',
  icon: '☸️',
  build: buildEKSSteps,
  code: CODE,
  language: 'YAML/CLI',
  metrics: [
    { key: 'nodes',       label: 'Nodes',        max: 6,   color: 'var(--node-default)' },
    { key: 'pods',        label: 'Pods',         max: 10,  color: 'var(--pod-running)' },
    { key: 'cpu',         label: 'CPU %',        max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
    { key: 'fargatePods', label: 'Fargate Pods', max: 5,   color: 'var(--node-path)' },
  ],
};

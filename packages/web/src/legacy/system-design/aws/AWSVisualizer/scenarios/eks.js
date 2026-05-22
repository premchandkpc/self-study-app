import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildEKSSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('alb',     'ALB\n(Load Balancer)', 'apigw',  50,  190, { desc: 'AWS Application Load Balancer. Provisions automatically via AWS Load Balancer Controller watching Ingress resources. Handles SSL, path-based routing, health checks.', scheme: 'internet-facing', ssl: 'ACM cert' }),
      svc('eks',     'EKS\nControl Plane',   'server', 230, 190, { nodes: 0, pods: 0, version: '1.28', desc: 'Managed Kubernetes control plane. AWS runs API server + etcd for free. You only pay for worker nodes and Fargate pods. Supports 1.27→1.28', apiserver: 'k8s.io/api', region: 'us-east-1' }),
      svc('ng1',     'Node Group\n(t3.xl OD)', 'server', 430, 80,  { nodes: 2, cpu: 20, type: 'on-demand', maxSize: 5, desc: 'On-demand EC2 node group. Managed ASG. Runs critical workloads. Reliable, full price. 2 x t3.xlarge (4vCPU, 16GiB each).', arch: 'x86_64', ami: 'Amazon Linux 2' }),
      svc('ng2',     'Node Group\n(t3.2xl Spot)', 'server', 430, 240, { nodes: 1, cpu: 10, type: 'spot', maxSize: 3, desc: 'Spot EC2 node group. 60-90% cheaper than on-demand. AWS can reclaim with 2min notice. Use for stateless workers.', arch: 'x86_64', savings: '70%' }),
      svc('ecr',     'ECR Registry',        'db',     630, 100, { desc: 'Elastic Container Registry. Stores Docker images. Pulled by nodes on pod schedule. Supports: scanning, cross-region replication, tag immutability.', images: 42, scan: 'Enhanced' }),
      svc('fargate', 'Fargate Profile\n(serverless)', 'lambda', 630, 280, { pods: 0, desc: 'Run pods without managing EC2. Each pod = 1 microVM. Pay per vCPU+mem per second. Use for: batch, CI/CD, burst. No DaemonSets or privileged containers.', arch: 'x86_64 + arm64' }),
      svc('karpenter','Karpenter\n(Auto-provisioner)', 'server', 630, 400, { desc: 'Kubernative node provisioning (by AWS). Faster than CA (~60s). Chooses optimal EC2 instance for pod requirements. Supports spot diversification.', launches: '60s', instanceTypes: '20+' }),
    ],
    edges: [
      { from: 'alb', to: 'eks' }, { from: 'eks', to: 'ng1' }, { from: 'eks', to: 'ng2' },
      { from: 'eks', to: 'ecr' }, { from: 'eks', to: 'fargate' }, { from: 'karpenter', to: 'ng1' },
    ],
    packets: [], events: [],
    metrics: { nodes: 3, pods: 0, cpu: 15, cost: 0, fargatePods: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'EKS = managed Kubernetes on AWS. AWS runs the control plane (API server, etcd, scheduler) for free. You pay only for worker nodes (EC2) and Fargate pods. Same Kubernetes API — works with kubectl, Helm, ArgoCD.', 1);

  s.events.push({ type: 'ok', msg: 'kubectl apply -f deployment.yaml → EKS API server → scheduler → node binding' });
  s.packets = [pkt('eks', 'ecr', 'pull: my-app:v1.2 (500MiB image)', 'request')];
  s.nodes.find(n => n.id === 'ng1').pods = 2; s.nodes.find(n => n.id === 'ng1').cpu = 35;
  s.metrics.pods = 2; s.metrics.cpu = 35;
  s.events.push({ type: 'ok', msg: 'Scheduler placed 2 pods on ng1 (t3.xl: 4vCPU, 16GiB RAM). Image pulled from ECR (cached on node).' });
  snap(steps, s, 'Deployment: kubectl apply → EKS API server receives the deployment manifest → scheduler picks node with sufficient resources → kubelet pulls image from ECR → container runtime starts pods. Node selection based on: resource requests/limits, nodeSelector, affinity/anti-affinity, taints/tolerations. ECR image pull: first time pulls full image, subsequent pulls use cached layers.', 2);

  s.events.push({ type: 'info', msg: 'NodeGroup1: on-demand (2 nodes, t3.xl). NodeGroup2: spot (1 node, t3.2xl). Spot = 60-90% cheaper but can be reclaimed.' });
  snap(steps, s, 'EKS node groups: managed EC2 Auto Scaling groups. On-demand: reliable, full price. Spot: 60-90% cheaper but AWS can reclaim with 2min notice. Best practice: on-demand for critical workloads (control plane, databases), spot for stateless batch/workers. Use `topology.kubernetes.io/zone` labels for multi-AZ spread. EKS supports nodes in 3 AZs for HA.', 3);

  s.packets = [pkt('alb', 'eks', 'Ingress: app.mycompany.com → Service', 'request')];
  s.nodes[0].state = 'active';
  s.events.push({ type: 'ok', msg: 'AWS Load Balancer Controller: detects Ingress resource, provisions ALB, creates TargetGroup per service' });
  snap(steps, s, 'AWS Load Balancer Controller (formerly ALB Ingress Controller): watches for Kubernetes Ingress resources → provisions ALB in AWS. Path-based routing: /api/* → backend service, /* → frontend service. Per-path TargetGroups. Controller also handles NLB for TCP/UDP traffic (Service type=LoadBalancer). SSL termination at ALB with ACM certificates. Annotations: alb.ingress.kubernetes.io/scheme, alb.ingress.kubernetes.io/listen-ports.', 4);

  s.nodes.find(n => n.id === 'ng1').cpu = 85; s.metrics.cpu = 85;
  s.events.push({ type: 'warn', msg: 'CPU 85% on ng1 → Karpenter triggers scale-out. Launches c6i.xl (cheaper). ~60s to join.' });
  s.nodes.find(n => n.id === 'karpenter').state = 'active';
  s.packets = [pkt('karpenter', 'ng1', 'provision c6i.xl', 'request')];
  snap(steps, s, 'Karpenter (vs Cluster Autoscaler): CA detects pending pods → ASG scale-up (2-5min). Karpenter watches for pending pods → directly provisions EC2 instance via AWS API (~60s). Advantages: faster, chooses optimal instance type (not fixed ASG), supports spot+on-demand mix, reduces cost by right-sizing. Karpenter uses Provisioner CRD: constraints (arch, capacity type, ttl). Replaces CA for new clusters.', 5);

  s.nodes.find(n => n.id === 'ng1').nodes = 3; s.nodes.find(n => n.id === 'ng1').cpu = 48;
  s.metrics.nodes = 4; s.metrics.cpu = 48; s.metrics.cost = 2;
  s.events.push({ type: 'ok', msg: 'New node joined. Pending pods scheduled. Karpenter will scale-down after low utilization period.' });
  snap(steps, s, 'Scale-out complete. New EC2 node provisioned by Karpenter. Pending pods scheduled. Existing pods unaffected. Karpenter handles scale-down: TTLSecondsAfterEmpty (default 30s) → node drained → terminated. Pod Disruption Budgets (PDBs): control how many pods can be down during voluntary disruptions (node drain, upgrades). Essential for HA workloads — minAvailable or maxUnavailable.', 6);

  s.nodes.find(n => n.id === 'fargate').state = 'active'; s.nodes.find(n => n.id === 'fargate').pods = 3;
  s.metrics.fargatePods = 3;
  s.events.push({ type: 'ok', msg: 'Fargate: 3 pods run without EC2 nodes. Each pod = 1 microVM. Pay per vCPU + memory per second.' });
  snap(steps, s, 'EKS Fargate: each pod runs in its own microVM. No EC2 nodes to manage, no scaling, no patching. Use for: batch jobs, CI/CD runners, infrequent workloads, workloads requiring strong isolation. Limitations: no DaemonSets, no privileged containers, no hostNetwork. Selector: namespace + label match → pods go to Fargate vs EC2. Pricing: per vCPU + per GB memory per second (with 1min minimum).', 7);

  s.events.push({ type: 'info', msg: 'IRSA: IAM Role for Service Account. Pod gets temporary AWS credentials via OIDC provider. No long-lived keys in pods!' });
  snap(steps, s, 'IRSA (IAM Roles for Service Accounts): pod gets AWS credentials via OIDC federation. How: 1) Create IAM role with trust policy allowing EKS OIDC provider. 2) Annotate K8s serviceAccount with role ARN. 3) EKS pod webhook injects AWS env vars + projected volume. 4) AWS SDK inside pod assumes the role → temporary credentials. No hardcoded secrets! Each serviceAccount gets different permissions (least privilege).', 8);

  s.events.push({ type: 'ok', msg: 'EBS CSI Driver: Pod claims 50GiB gp3 via PVC → EBS volume auto-created and attached to node. Cross-AZ failover: use EFS (NFS).' });
  snap(steps, s, 'EBS CSI Driver: provides persistent storage for EKS. PVC (PersistentVolumeClaim) → EBS volume created and attached to node. Supports: gp3 (general purpose, 3000 IOPS baseline), io2 (provisioned IOPS up to 64K). Limitation: EBS is AZ-specific (us-east-1a) — pod can only use EBS in the same AZ. For cross-AZ: use EFS (NFS, shared across AZs) or S3 (object storage). EBS CSI supports volume snapshots + cross-AZ restore.', 9);

  s.events.push({ type: 'info', msg: 'Bottlerocket OS: container-optimized Linux by AWS. Minimal, immutable, atomic updates. Reduces attack surface. Default for EKS managed node groups.' });
  snap(steps, s, 'Bottlerocket OS: AWS-built Linux distribution JUST for containers. Minimal: only packages needed to run containers. Immutable: root filesystem read-only (no SSH by default). Atomic updates: update downloads as single image, reboots into new version. Security: reduced attack surface, no package manager. Default AMI for EKS managed node groups. Debug: use `sheltie` (admin container) for troubleshooting. Also supported: Amazon Linux 2 (traditional), Ubuntu, Windows Server.', 10);

  s.events.push({ type: 'warn', msg: 'Network Policy: Calico or Cilium. Default: all pods can talk to all pods. Policy: "default-deny ingress" → only allow from specific pods.' });
  snap(steps, s, 'Network Policies: Kubernetes-native firewall for pods. Default: ALL pods can communicate with ALL pods (no isolation). Policy: define ingress/egress rules per pod selectors. EKS supports: Calico (Tigera operator), Cilium (eBPF-based, better performance), AWS VPC CNI network policies (newer). Example: deny-all-ingress → allow from frontend pods → deny all others. Required for: PCI-DSS, HIPAA compliance, multi-tenant environments.', 11);

  s.events.push({ type: 'ok', msg: 'Graviton (ARM): c6g.xl (ARM) vs c5.xl (x86). 20% cheaper, 20% better perf. Need arm64 Docker images. AL2/AMIs available.' });
  snap(steps, s, 'EKS with Graviton (AWS ARM): 20% cost savings + better performance for most workloads. Use multi-arch Docker images (manifest lists) to run on both x86 + ARM nodes. NodeGroups: mix x86 + ARM node groups. Pod nodeSelector: kubernetes.io/arch: amd64 or arm64. Many containers already support ARM (nginx, Node.js, Python, Go). For custom apps: rebuild Docker images for arm64. Cost: c6g.large ~$0.068/hr vs c5.large ~$0.085/hr.', 12);

  s.events.push({ type: 'warn', msg: 'Cluster upgrade: 1.27 → 1.28. Control plane upgraded first, then nodes (mutable). Skip only 1 minor version max.' });
  snap(steps, s, 'EKS version upgrades: AWS manages control plane upgrade (API server + etcd). Node groups: upgrade manually (new AMI) or use managed node group update. Rules: can only skip 1 minor version at a time (1.27→1.28, not 1.27→1.29). Test addon compatibility: CoreDNS, kube-proxy, VPC CNI, AWS LB Controller. Use `eksctl upgrade cluster` or eksctl managed nodegroup upgrade. Plan for deprecations: API versions removed after several releases.', 13);

  s.result = 'EKS: managed control plane → EC2/Fargate workers → ALB → IRSA → EBS → Karpenter auto-scale.';
  snap(steps, s, 'Key takeaways: 1) AWS Load Balancer Controller for ALB/NLB ingress. 2) Karpenter over Cluster Autoscaler (faster, cheaper). 3) IRSA for pod-level AWS permissions (never use instance role for everything). 4) Fargate for burst/serverless workloads. 5) EBS CSI for persistent storage (AZ limited — use EFS for multi-AZ). 6) VPC CNI assigns real ENI + IP per pod — native VPC networking (no overlay, no encapsulation). 7) Security: Security Groups per Pod (feature), network policies (Calico or native). Cost: no control plane charge, pay for nodes + EBS + LB.', 14);

  return steps;
}

const CODE = [
  '# Create EKS cluster',
  'eksctl create cluster --name prod --region us-east-1 \\',
  '  --nodegroup-name ng-1 --node-type t3.xlarge \\',
  '  --nodes 3 --nodes-min 1 --nodes-max 10',
  '# Karpenter provisioner',
  'eksctl create cluster --karpenter',
  '# Fargate profile',
  'eksctl create fargateprofile --cluster prod --name fp-default',
  '# IAM Role for ServiceAccount',
  'eksctl create iamserviceaccount --name my-sa --namespace default \\',
  '  --cluster prod --attach-policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
  '# Network Policy (Calico)',
  'kubectl apply -f https://raw.githubusercontent.com/aws/amazon-vpc-cni-k8s/master/config/master/calico-operator.yaml',
  '# Bottlerocket node group',
  'eksctl create nodegroup --cluster prod --node-type c6g.xlarge',
  '  --node-ami-family Bottlerocket --managed',
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
  topicContent: {
    concept: [
      { title: 'EKS Architecture — managed control plane, self-managed or Fargate workers', content: 'EKS runs the Kubernetes control plane across multiple Availability Zones for high availability — the API server, etcd cluster, and core controllers are managed by AWS at no extra cost (you only pay for worker resources). Worker nodes can be EC2 instances in managed node groups (on-demand or Spot, multiple instance types, automatic updates) or Fargate pods (each pod is a microVM, no node management needed, pay per vCPU and memory per second). The standard Kubernetes API is fully compatible — every kubectl command, Helm chart, and ArgoCD application works identically on EKS as on any other Kubernetes distribution. EKS supports the latest three Kubernetes minor versions and provides managed add-ons for CoreDNS, kube-proxy, VPC CNI, and AWS Load Balancer Controller.' },
      { title: 'Karpenter vs Cluster Autoscaler — node provisioning comparison', content: 'Karpenter is AWS\'s next-generation Kubernetes node provisioner that directly launches EC2 instances via the AWS API for pending pods, completing node provisioning in approximately 60 seconds. It dynamically selects the optimal instance type for each pod\'s resource requirements (CPU, memory, GPU, architecture), supports both on-demand and Spot with diversification strategies, and automatically consolidates workloads onto fewer instances during low utilization. Cluster Autoscaler (CA) works with existing Auto Scaling Groups and has a fundamentally different approach — it detects pending pods and adjusts the ASG desired count, which triggers the ASG to launch a new instance via a launch template. CA is limited to the fixed instance types and node group configuration defined in the launch template. Karpenter reduces node provisioning time from 2-5 minutes (CA) to ~60 seconds, reduces costs by selecting cheaper spot instance types dynamically, and simplifies operations by eliminating ASG and launch template management.' },
      { title: 'Deep — EKS networking with VPC CNI, IRSA, and security', content: 'EKS uses the Amazon VPC Container Networking Interface (CNI) plugin which gives each pod a real VPC IP address from the subnet CIDR range — no overlay network, no encapsulation, no NAT. This means pods communicate using standard VPC routing, security groups can be applied to individual pods (Security Groups per Pod feature), and VPC Flow Logs capture pod-level traffic. The VPC CNI works by attaching an Elastic Network Interface to each worker node and assigning secondary IP addresses from the ENI to pods. The number of pods per node is limited by the instance type\'s ENI count and the number of IPs per ENI. IRSA (IAM Roles for Service Accounts) provides pod-level AWS credentials via OIDC federation — the EKS cluster has an OIDC provider URL, IAM roles are created with trust policies allowing the OIDC provider to issue tokens for specific service accounts, and the EKS Pod Identity webhook injects AWS environment variables (AWS_ROLE_ARN, AWS_WEB_IDENTITY_TOKEN_FILE) into pods. EKS supports network policies through Calico (installed as a DaemonSet) or Cilium (eBPF-based, better performance) to enforce pod-level ingress and egress rules — without these, all pods can communicate with all other pods by default.' },
    ],
    why: [
      'EKS provides managed Kubernetes on AWS without the operational burden of running the control plane yourself. AWS handles API server high availability, etcd backup and recovery, control plane patching, and certificate rotation. This eliminates the most complex and failure-prone part of running Kubernetes while maintaining 100% API compatibility with upstream Kubernetes — enabling workload portability across on-prem, EKS, and other Kubernetes distributions.',
      'EKS integrates deeply with AWS services through native controllers and CNI plugins. The AWS Load Balancer Controller automatically provisions ALB and NLB for Kubernetes Ingress and LoadBalancer Services. EBS CSI Driver provides persistent storage with volume snapshots and cross-AZ restore. EFS CSI Driver enables shared file storage across pods. IRSA provides pod-level IAM roles through OIDC, eliminating long-term AWS credentials in pods. This integration is significantly more seamless than self-managed Kubernetes on AWS.',
      'Karpenter dramatically simplifies node management compared to traditional Cluster Autoscaler with multiple node groups. With Karpenter, you define a single Provisioner resource (or a few) that specifies pod requirements (architecture, instance size range, capacity type) — Karpenter automatically selects the cheapest and most appropriate instance type for each pod. This eliminates the need to maintain separate node groups for different instance families, purchase options, and availability zones.',
    ],
    interview: [
      { q: 'How does pod networking work in EKS with the VPC CNI plugin?', a: 'EKS uses the Amazon VPC CNI plugin instead of overlay networking (like Flannel or Calico in non-AWS Kubernetes). The VPC CNI gives each pod a real VPC IP address from the subnet CIDR range — pods appear as regular network interfaces in your VPC and can communicate using standard VPC routing, security groups, and VPC Flow Logs. The VPC CNI works by attaching an Elastic Network Interface to each worker node at launch time, then assigning secondary IP addresses from that ENI to individual pods. When a pod is scheduled on a node, the CNI plugin creates a virtual Ethernet interface pair (veth) connecting the pod\'s network namespace to the node, and assigns one of the ENI\'s secondary IPs to the pod. The number of pods a node can support is determined by the instance type\'s maximum ENIs multiplied by the number of IP addresses per ENI — for example, a t3.medium supports 3 ENIs with 6 IPs each, for a maximum of 17 pods per node (one IP per pod, minus the node\'s IP). When a node exhausts its available ENI IPs, the VPC CNI can attach additional ENIs to the node (up to the instance type\'s ENI limit) or the node simply cannot schedule more pods. Security Groups per Pod is a feature that allows assigning different security groups to individual pods on the same node, enabling fine-grained network isolation between microservices running on the same instance.', followUps: ['What happens when a node runs out of available ENI IP addresses?', 'How does Security Groups per Pod work and what are its requirements?'] },
      { q: 'What is IRSA and why is it important for EKS security?', a: 'IRSA stands for IAM Roles for Service Accounts — it gives each Kubernetes pod its own AWS IAM role through OIDC federation, eliminating the need to hardcode AWS access keys or use a shared node instance role. The mechanism works as follows: when you create an EKS cluster, AWS automatically creates an OIDC provider URL for the cluster. You create an IAM role with a trust policy that allows the OIDC provider to issue tokens for a specific Kubernetes service account (by namespace and service account name). In Kubernetes, you annotate the service account with the IAM role ARN (eks.amazonaws.com/role-arn). The EKS Pod Identity webhook (a mutating admission webhook running in the cluster) intercepts pod creation requests for annotated service accounts and injects two environment variables (AWS_ROLE_ARN and AWS_WEB_IDENTITY_TOKEN_FILE) and a volume mount containing the OIDC token. The AWS SDK in the pod automatically detects these environment variables, reads the OIDC token, calls STS AssumeRoleWithWebIdentity to get temporary credentials, and uses those credentials for all AWS API calls. The credentials are automatically rotated before expiry. IRSA is important because it provides least-privilege permissions per microservice, eliminates long-term credentials in pods, and provides CloudTrail audit trail of which service account performed which AWS API action. Without IRSA, all pods on a node share the node instance role, violating least privilege and making audit difficult.', followUps: ['How does the OIDC provider work with EKS?', 'What is the difference between IRSA and instance profile-based access for pods?'] },
      { q: 'What is Karpenter and why is it replacing Cluster Autoscaler for new EKS clusters?', a: 'Karpenter is an open-source, Kubernetes-native node provisioning project by AWS that directly watches for pending pods and provisions the optimal EC2 instance type via the AWS API. When a pod cannot be scheduled due to insufficient resources, Karpenter evaluates the pod\'s resource requests, nodeSelector, affinity rules, and topology spread constraints, then selects the most appropriate and cost-effective EC2 instance type (e.g., c6i.large with Graviton preference, or a mix of Spot and On-Demand) and launches it directly — the new node joins the cluster within approximately 60 seconds. Cluster Autoscaler (CA) has a different architecture — it watches for pending pods and adjusts the desired count of an Auto Scaling Group, which triggers the ASG to launch a new instance from a fixed launch template. This process takes 2-5 minutes and is limited to the instance types and configuration defined in the launch template. Karpenter\'s advantages include faster provisioning (60s vs 2-5min), optimal instance type selection (not fixed to one type per node group), support for Spot diversification across multiple instance types (reducing interruption impact), automatic node consolidation (terminates under-utilized nodes and reschedules pods to reduce cluster cost), and simplified operations (no ASGs or launch templates to manage). Karpenter uses a Provisioner CRD where you define constraints like max cpu/memory, instance category exclusions, ttl for empty nodes, and capacity type preferences.', followUps: ['How does Karpenter choose which instance type to launch?', 'How does Karpenter handle Spot interruptions?', 'Can Karpenter and Cluster Autoscaler run together?'] },
    ],
    gotcha: [
      'EBS volumes are AZ-specific — a pod using an EBS PVC can only run on a node in the SAME Availability Zone where the volume was created. If the node in that AZ fails and the pod needs to reschedule, the PVC cannot attach to a node in a different AZ. Use EFS (NFS-based, cross-AZ) or S3 (object storage) for workloads requiring cross-AZ persistent storage or use EBS CSI snapshots to restore the volume in another AZ.',
      'Default network policy in EKS allows ALL traffic between ALL pods across the cluster — there is no isolation. You MUST install a network policy engine (Calico via Tigera operator or Cilium via Helm) and define policies for production compliance requirements like PCI-DSS and HIPAA. Without network policies, a compromised pod in the frontend namespace can freely communicate with database pods in the backend namespace.',
      'EKS Fargate pods have significant limitations compared to EC2-backed pods: no DaemonSets (you cannot run node-level agents like monitoring, logging, or security scanners), no privileged containers, no hostNetwork or hostPort, no GPU or inference hardware support, and no emptyDir volumes backed by instance store. Fargate is suitable for batch jobs and stateless workloads but cannot run the full Kubernetes workload spectrum.',
      'EKS control plane upgrades can only skip ONE minor version at a time (e.g., 1.27 to 1.28, not 1.27 to 1.29). You must also test managed addon compatibility (CoreDNS, kube-proxy, VPC CNI, AWS LB Controller) before each upgrade. AWS deprecates API versions over time — a manifest that works on 1.27 may fail on 1.28 if it uses a deprecated API version. Use `kubectl convert` or `pluto` to detect deprecated APIs before upgrading.',
    ],
    tradeoffs: [
      { pro: 'Standard Kubernetes API ensures workload portability — Helm charts, operators, and YAML manifests work identically on EKS, self-managed Kubernetes, and other conformant distributions like AKS and GKE, enabling multi-cloud and hybrid deployment strategies without code changes.', con: 'EKS control plane upgrades require careful planning — only one minor version skip is allowed, managed add-ons must be tested for compatibility, and API deprecations can break manifests that have not been updated. You must stay current with upstream Kubernetes release cadence.' },
      { pro: 'Fargate for EKS enables running pods without managing any EC2 nodes — ideal for burst workloads, batch jobs, CI/CD runners, and infrequent processing where node management overhead is not justified. Each pod gets strong isolation in its own microVM.', con: 'Fargate pods have significant limitations — no DaemonSets, no privileged containers, no GPU support, no hostNetwork, and higher per-pod cost for steady-state 24/7 workloads compared to EC2-backed pods using Reserved Instances or Savings Plans. Fargate is not a full EC2 replacement for all pod types.' },
      { pro: 'AWS Load Balancer Controller integrates seamlessly with Kubernetes Ingress and Service resources — creating ALB for HTTP traffic, NLB for TCP/UDP, with automatic target group management, SSL termination via ACM, and path-based routing — without manual AWS resource creation.', con: 'VPC CNI limits pod density per node based on ENI/IP capacity of the instance type — a t3.medium can only run 17 pods while an m5.large can run 29 pods, which is lower than overlay-based CNIs that can run 100+ pods per node. For high pod density (100+ pods/node), consider using a different CNI plugin like Cilium or Calico with overlay mode on EKS.' },
    ],
  },
};

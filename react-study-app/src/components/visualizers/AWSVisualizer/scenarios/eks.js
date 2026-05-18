import { snap, svc, pkt } from './shared';

function buildEKSSteps() {
  const steps = [];
  const s = {
    nodes: [
      svc('alb',    'ALB\n(Load Balancer)', 'apigw',  60,  180),
      svc('eks',    'EKS Control Plane',    'server',  240, 180, { nodes: 0, pods: 0 }),
      svc('ng1',    'Node Group 1\n(t3.xl)', 'server', 440, 100, { nodes: 2, cpu: 20 }),
      svc('ng2',    'Node Group 2\n(t3.2xl)','server', 440, 260, { nodes: 1, cpu: 10 }),
      svc('ecr',    'ECR Registry',          'db',      620, 180),
    ],
    edges: [
      { from: 'alb',  to: 'eks' },
      { from: 'eks',  to: 'ng1' },
      { from: 'eks',  to: 'ng2' },
      { from: 'eks',  to: 'ecr' },
    ],
    packets: [],
    events: [],
    metrics: { nodes: 3, pods: 0, cpu: 15, cost: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'EKS: managed Kubernetes. AWS manages control plane. You manage worker nodes.', 1);

  s.events.push({ type: 'info', msg: 'kubectl apply -f deployment.yaml' });
  s.packets = [pkt('eks', 'ecr', 'pull app:v1.2', 'request')];
  s.nodes[2].pods = 2;
  s.metrics.pods = 2;
  s.events.push({ type: 'ok', msg: 'Pods scheduled on NodeGroup1 (more free resources)' });
  snap(steps, s, 'Deploy: EKS scheduler pulls image from ECR, places 2 pods on NodeGroup1.', 3);

  // ALB Ingress
  s.packets = [pkt('alb', 'eks', 'ingress route', 'request')];
  s.nodes[0].state = 'active';
  s.events.push({ type: 'ok', msg: 'AWS ALB Ingress Controller: ALB created, routes to pods via NodePort' });
  snap(steps, s, 'ALB Ingress Controller provisions AWS Application Load Balancer. External traffic routed.', 5);

  // Cluster Autoscaler
  s.nodes[2].cpu = 85;
  s.metrics.cpu = 85;
  s.events.push({ type: 'warn', msg: 'CPU 85% on NodeGroup1 → Cluster Autoscaler triggers EC2 scale-out' });
  snap(steps, s, 'CPU 85%. Cluster Autoscaler requests new EC2 from Auto Scaling Group. ~2min to join.', 6);

  s.nodes[2].nodes = 3;
  s.nodes[2].cpu = 42;
  s.metrics.nodes = 4; s.metrics.cpu = 42; s.metrics.cost = 3;
  s.events.push({ type: 'ok', msg: 'New node joined. Pods rescheduled. CPU normalized.' });
  snap(steps, s, 'New EC2 node joined EKS. Pending pods scheduled. Load distributed. Cost: +$3/hr.', 7);

  // Fargate option
  s.events.push({ type: 'info', msg: 'Fargate profile: run pods serverless — no EC2 management' });
  snap(steps, s, 'EKS Fargate: run pods without managing EC2 nodes. AWS provisions microVM per pod. Pay per vCPU+mem.', 8);

  return steps;
}

const CODE = [
  '# EKS cluster creation',
  'eksctl create cluster \\',
  '  --name prod \\',
  '  --nodegroup-name ng-1 \\',
  '  --nodes 3 --nodes-min 1 \\',
  '  --nodes-max 10',
  '# Fargate profile',
  'eksctl create fargateprofile \\',
  '  --cluster prod --name fp-default',
];

export default {
  id: 'eks',
  label: 'EKS',
  icon: '☸️',
  build: buildEKSSteps,
  code: CODE,
  language: 'YAML/CLI',
  metrics: [
    { key: 'nodes', label: 'Nodes', max: 6,   color: 'var(--node-default)' },
    { key: 'pods',  label: 'Pods',  max: 10,  color: 'var(--pod-running)' },
    { key: 'cpu',   label: 'CPU %', max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
  ],
};

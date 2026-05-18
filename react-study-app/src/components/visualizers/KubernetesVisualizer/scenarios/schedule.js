import { snap, makePod, makeNode } from './shared';

function buildScheduleSteps() {
  const steps = [];
  const s = {
    nodes: [makeNode('node-1', 20, 30), makeNode('node-2', 10, 15)],
    pods: [],
    events: [],
    metrics: { pods: 0, nodes: 2, cpu: 15, restarts: 0 },
  };

  snap(steps, s, 'Cluster ready. 2 worker nodes. No pods scheduled yet.', 1);

  // User applies deployment
  s.events.push({ type: 'info', msg: 'kubectl apply -f deployment.yaml' });
  snap(steps, s, 'kubectl apply: Deployment created. API Server receives spec.', 2);

  // Scheduler picks node
  s.events.push({ type: 'info', msg: 'Scheduler: node-1 wins (more free resources)' });
  snap(steps, s, 'Scheduler evaluates nodes. node-1 has more free CPU/Mem → wins.', 4);

  // Pod pending → running on node-1
  s.pods.push(makePod('web-abc', 'node-1', 'pending'));
  s.metrics.pods = 1;
  snap(steps, s, 'Pod web-abc: PENDING. kubelet on node-1 pulling image.', 5);

  s.pods[0].state = 'running';
  s.pods[0].ready = true;
  s.nodes[0].cpu += 30;
  s.nodes[0].mem += 40;
  s.metrics.cpu = 25;
  snap(steps, s, 'Pod web-abc: RUNNING. Container started. Readiness probe passed.', 7);

  // Schedule 2nd pod
  s.pods.push(makePod('web-def', 'node-2', 'pending'));
  s.metrics.pods = 2;
  snap(steps, s, 'Scheduler places web-def on node-2 (load balancing).', 4);

  s.pods[1].state = 'running';
  s.pods[1].ready = true;
  s.nodes[1].cpu += 30;
  s.nodes[1].mem += 40;
  s.metrics.cpu = 30;
  snap(steps, s, 'Both pods RUNNING. Service routes traffic to both endpoints.', 7);

  // Delete pod
  s.pods[0].state = 'terminating';
  snap(steps, s, 'kubectl delete pod web-abc: TERMINATING. Graceful shutdown (30s).', 9);

  s.pods.splice(0, 1);
  s.metrics.pods = 1;
  s.events.push({ type: 'warn', msg: 'ReplicaSet: desired=2, actual=1. Creating replacement.' });
  snap(steps, s, 'Pod deleted. ReplicaSet detects drift: 2 desired, 1 actual. Reschedules.', 10);

  return steps;
}

export const K8S_CODE_SCHEDULE = [
  '# Apply deployment',
  'kubectl apply -f deployment.yaml',
  '# Scheduler algorithm:',
  '  filter(nodes, pod.resources)',
  '  score(nodes) → pick best',
  '  bind(pod, node)',
  '# kubelet starts pod',
  '  pullImage(), startContainer()',
  '  livenessProbe(), readinessProbe()',
  '# ReplicaSet controller',
  '  watch(pods); reconcile(desired, actual)',
];

export default {
  id: 'schedule',
  label: 'Scheduling',
  icon: '📅',
  build: buildScheduleSteps,
  code: K8S_CODE_SCHEDULE,
  language: 'YAML/Shell',
  metrics: [
    { key: 'pods',     label: 'Pods',     max: 8,   color: 'var(--pod-running)' },
    { key: 'cpu',      label: 'CPU avg',  max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
    { key: 'restarts', label: 'Restarts', max: 10,  color: 'var(--pod-crash)', warn: 30, critical: 60 },
  ],
};

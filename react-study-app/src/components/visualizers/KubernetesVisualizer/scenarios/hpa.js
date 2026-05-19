import { snap, makePod, makeNode } from '@/core/utils/scenarioShared';

function buildHPASteps() {
  const steps = [];
  const s = {
    nodes: [makeNode('node-1', 10, 20), makeNode('node-2', 10, 20)],
    pods: [makePod('api-1', 'node-1', 'running'), makePod('api-2', 'node-2', 'running')],
    hpa: { min: 2, max: 6, current: 2, target: 2, cpuTarget: 50 },
    metrics: { pods: 2, nodes: 2, cpu: 10, restarts: 0 },
    events: [],
  };
  s.pods.forEach((p) => (p.ready = true));

  snap(steps, s, 'HPA watching. 2 pods. CPU avg 10%. Target: 50%. Scale condition: not met.', 1);

  // Traffic spike
  s.metrics.cpu = 85;
  s.nodes.forEach((n) => (n.cpu = 85));
  s.events.push({ type: 'warn', msg: 'CPU spike! avg=85%. HPA threshold exceeded.' });
  snap(steps, s, '🔥 Traffic spike! CPU: 85%. HPA triggers scale-out decision.', 3);

  // HPA math: ceil(2 * 85/50) = 4
  s.hpa.target = 4;
  snap(steps, s, 'HPA formula: ceil(2 × 85/50) = 4 pods. Scaling 2 → 4.', 4);

  // Add 2 more pods
  for (const [id, node] of [['api-3', 'node-1'], ['api-4', 'node-2']]) {
    s.pods.push(makePod(id, node, 'pending'));
    s.hpa.current = s.pods.length;
    s.metrics.pods = s.pods.length;
    snap(steps, s, `Pod ${id}: PENDING on ${node}.`, 5);

    const p = s.pods[s.pods.length - 1];
    p.state = 'running';
    p.ready = true;
    snap(steps, s, `Pod ${id}: RUNNING. Load distributed.`, 7);
  }

  // CPU drops
  s.metrics.cpu = 22;
  s.nodes.forEach((n) => (n.cpu = 22));
  snap(steps, s, 'CPU drops to 22% with 4 pods. Traffic absorbed. System stable.', 8);

  // Scale-in (cooldown)
  s.events.push({ type: 'info', msg: 'Cooldown 5min. Stabilize before scale-in.' });
  snap(steps, s, 'HPA cooldown (5min). Prevents thrashing. Watching CPU…', 9);

  s.hpa.target = 2;
  s.pods = s.pods.slice(0, 2);
  s.hpa.current = 2;
  s.metrics.pods = 2;
  snap(steps, s, 'Scale-in: 4 → 2 pods. Cooldown expired. Traffic low.', 10);

  return steps;
}

export const K8S_CODE_HPA = [
  '# HPA controller loop',
  'desiredReplicas = ceil(',
  '  currentReplicas *',
  '  (currentMetric / desiredMetric)',
  ');',
  '# Scale out if cpu > target',
  'if (cpu > hpa.targetCPU)',
  '  scaleDeployment(+pods)',
  '# Scale in with cooldown',
  'if (cpu < target && cooldown)',
  '  scaleDeployment(-pods)',
];

export default {
  id: 'hpa',
  label: 'HPA Scale',
  icon: '📈',
  build: buildHPASteps,
  code: K8S_CODE_HPA,
  language: 'YAML/Shell',
  metrics: [
    { key: 'pods',     label: 'Pods',     max: 8,   color: 'var(--pod-running)' },
    { key: 'cpu',      label: 'CPU avg',  max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
    { key: 'restarts', label: 'Restarts', max: 10,  color: 'var(--pod-crash)' },
  ],
};

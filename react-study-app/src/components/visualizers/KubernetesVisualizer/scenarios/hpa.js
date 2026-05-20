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
  topicContent: {
    concept: [
      { title: 'Horizontal Pod Autoscaler', content: 'HPA automatically scales the number of pod replicas based on observed CPU, memory, or custom metrics. It runs as a control loop (default sync period: 15s) and adjusts the replicas field of Deployments or StatefulSets.' },
      { title: 'HPA Formula', content: 'desiredReplicas = ceil(currentReplicas × (currentMetricValue / targetMetricValue)). This ensures proportional scaling. Cooldown periods (default 5min scale-up, 3min scale-down) prevent thrashing.' },
      { title: 'Custom and External Metrics', content: 'Beyond CPU/Memory, HPA supports custom metrics from Prometheus (via prometheus-adapter) and external metrics (SQS queue depth, Kafka lag) via adapters. This enables event-driven scaling.' },
    ],
    why: ['HPA is essential for handling traffic spikes without over-provisioning. It reduces cloud costs by scaling down during low traffic and maintains availability by scaling up under load.'],
    interview: [
      { question: 'How does HPA handle metrics from multiple pods?', answer: 'HPA aggregates metrics across all pods in the target. For CPU/Memory, it takes the average utilization across pods. The formula computes desired replicas based on the ratio of current average to target. Individual pod failures are smoothed out by averaging.', followUps: ['What happens when metrics are not available?', 'How does HPA interact with cluster autoscaler?'] },
      { question: 'What is the cooldown delay and why is it needed?', answer: 'Cooldown prevents thrashing (rapid scaling up and down) by forcing HPA to wait before reversing a scaling decision. Default: scale-up immediately (or 3min with --horizontal-pod-autoscaler-upscale-delay), scale-down after 5min. This avoids oscillations caused by metric sampling noise.', followUps: ['How do you tune cooldown values for bursty workloads?', 'Can HPA scale to zero replicas?'] },
    ],
    gotcha: ['HPA default behavior with missing metrics can cause unexpected behavior — if metrics are unavailable, HPA may scale aggressively or not at all depending on configuration.', 'HPA + Cluster Autoscaler interaction: HPA requests more pods, but if nodes lack capacity, pods stay Pending. Cluster Autoscaler then adds nodes. Without CA, HPA cannot scale beyond node capacity — a common production surprise.'],
    tradeoffs: [
      { pro: 'Automatic elasticity reduces manual intervention during traffic spikes', con: 'Reactive scaling has lag — traffic may be dropped during the scale-up window' },
      { pro: 'Cost savings through scale-down during low traffic periods', con: 'Thrashing risk if cooldown and metric thresholds are not properly tuned' },
    ],
  },
};

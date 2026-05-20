import { snap, makePod, makeNode } from '@/core/utils/scenarioShared';

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
  topicContent: {
    concept: [
      { title: 'Scheduler Filtering and Scoring', content: 'The Kubernetes scheduler uses a two-phase algorithm: Filtering (predicates) removes nodes that cannot run the pod (resource constraints, taints, node selectors). Scoring (priorities) ranks remaining nodes to pick the best fit.' },
      { title: 'Scheduling Cycle', content: 'The scheduler watches the API server for unscheduled pods (spec.nodeName empty). It runs filter → score → bind cycles. The default scheduler (kube-scheduler) is extensible via scheduling profiles and plugins.' },
      { title: 'Binding and kubelet Handshake', content: 'After bind, the kubelet on the chosen node takes over: pulling images, starting containers, and running probes. The scheduler does not re-evaluate until the pod is deleted or rescheduled.' },
    ],
    why: ['Scheduling efficiency determines cluster resource utilization. Poor scheduling decisions lead to imbalanced node loads, resource fragmentation, and unnecessary cloud costs from over-provisioned clusters.'],
    interview: [
      { question: 'What are the default scheduler predicates and priorities?', answer: 'Default predicates include PodFitsResources (CPU/mem), PodFitsHost (node selector), PodToleratesNodeTaints (taints), CheckNodeUnschedulable (cordon). Default priorities include LeastRequestedPriority (favor less loaded), BalancedResourceAllocation (favor balanced CPU/mem), NodeAffinityPriority. Modern kube-scheduler uses a plugin-based configurable framework.', followUps: ['How does the scheduler handle pod affinity and anti-affinity?', 'What is the difference between required and preferred scheduling constraints?'] },
      { question: 'What happens when no node can fit a pod?', answer: 'The pod stays in Pending state. The scheduler continuously retries. Common causes: insufficient CPU/memory, node selector mismatch, taints without tolerations, or resource quotas exceeded. Check pod events (kubectl describe pod) for the scheduling error.', followUps: ['How does resource fragmentation occur and how do you prevent it?', 'What role does the Descheduler play in cluster optimization?'] },
    ],
    gotcha: ['Resource requests != limits — the scheduler only considers requests for admission. A pod with small requests but large limits can overcommit a node and cause CPU throttling or OOM.', 'Node taints and tolerations are evaluated at scheduling time only. Adding a taint to an already-scheduled node does not evict pods unless the taint has NoExecute effect.'],
    tradeoffs: [
      { pro: 'Efficient resource bin-packing maximizes cluster utilization', con: 'Scheduler does not reassess decisions — initially uneven spreads persist until pods are deleted' },
      { pro: 'Extensible plugin architecture supports custom scheduling policies', con: 'Advanced scheduling (affinity, topology spread) increases scheduling latency' },
    ],
  },
};

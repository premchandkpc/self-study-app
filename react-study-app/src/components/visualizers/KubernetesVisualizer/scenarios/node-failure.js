import { snap, makePod, makeNode } from '@/core/utils/scenarioShared';

function buildNodeFailureSteps() {
  const steps = [];
  const s = {
    nodes: [
      makeNode('node-1', 30, 50),
      makeNode('node-2', 20, 35),
      makeNode('node-3', 15, 25),
    ],
    pods: [
      makePod('app-a', 'node-1', 'running'),
      makePod('app-b', 'node-1', 'running'),
      makePod('app-c', 'node-2', 'running'),
    ],
    metrics: { pods: 3, nodes: 3, cpu: 30, restarts: 0 },
    events: [],
    taints: {},
    tolerations: [],
  };
  s.pods.forEach((p) => (p.ready = true));

  snap(steps, s, '3-node cluster. app-a, app-b on node-1. app-c on node-2. All nodes Ready. Heartbeat every 10s.', 1);

  s.events.push({ type: 'info', msg: 'NodeLifecycleController checks node conditions: Ready, DiskPressure, MemoryPressure, NetworkUnavailable' });
  snap(steps, s, 'Node conditions: Ready=True, DiskPressure=False, MemoryPressure=False, NetworkUnavailable=False. node-monitor-period=5s.', 2);

  s.nodes[0].cpu = 0;
  s.events.push({ type: 'error', msg: 'node-1 heartbeat stopped. NodeLifecycleController detects missing heartbeats.' });
  snap(steps, s, 'node-1 heartbeat fails. NodeLifecycleController waits node-monitor-grace-period=40s before marking NotReady.', 3);

  s.events.push({ type: 'warn', msg: 'node-1: NotReady after 40s grace period. Condition=False.' });
  s.nodes[0].condition = 'NotReady';
  snap(steps, s, '40s elapsed. node-1 marked NotReady. Taint applied: node.kubernetes.io/unreachable:NoExecute.', 4);

  s.events.push({ type: 'warn', msg: 'Starting pod-eviction-timeout=5min. Taint toleration on pods checked.' });
  snap(steps, s, 'Taint NoExecute on node-1. DaemonSet pods tolerate unreachable. Regular pods have 5min toleration seconds.', 5);

  s.events.push({ type: 'error', msg: '5min expired. Evicting app-a, app-b from node-1.' });
  s.pods[0].state = 'evicted';
  s.pods[1].state = 'evicted';
  s.pods[0].ready = false;
  s.pods[1].ready = false;
  snap(steps, s, 'pod-eviction-timeout=5min reached. NodeLifecycleController evicts pods. app-a, app-b evicted from node-1.', 6);

  s.events.push({ type: 'info', msg: 'Scheduler reschedules evicted pods to healthy nodes.' });
  s.pods[0].state = 'running';
  s.pods[0].node = 'node-2';
  s.pods[0].ready = true;
  s.pods[1].state = 'running';
  s.pods[1].node = 'node-3';
  s.pods[1].ready = true;
  s.metrics.cpu = 55;
  snap(steps, s, 'app-a rescheduled on node-2. app-b rescheduled on node-3. PodDisruptionBudget may block eviction if configured.', 7);

  s.events.push({ type: 'info', msg: 'node-1 repaired. cordon + drain for maintenance.' });
  snap(steps, s, 'kubectl cordon node-1 (mark unschedulable). kubectl drain node-1 (evict gracefully). kubectl taint nodes node-1 key=value:NoSchedule.', 8);

  return steps;
}

export const K8S_CODE_NODE_FAILURE = [
  '# Check node conditions',
  'kubectl describe node node-1 | grep Conditions',
  '# Cordon (mark unschedulable)',
  'kubectl cordon node-1',
  '# Drain (evict pods gracefully)',
  'kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data',
  '# Taint nodes',
  'kubectl taint nodes node-1 key=value:NoSchedule',
  '# Tolerations in pod spec',
  'tolerations:',
  '  - key: "node.kubernetes.io/unreachable"',
  '    operator: "Exists"',
  '    effect: "NoExecute"',
  '    tolerationSeconds: 300',
  '# Pod Disruption Budget',
  'kubectl create pdb app-pdb --selector=app=app-a --min-available=1',
  '# Watch node',
  'kubectl get nodes -w',
  '# Uncordon after repair',
  'kubectl uncordon node-1',
];

export default {
  id: 'node-failure',
  label: 'Node Failure',
  icon: '💥',
  build: buildNodeFailureSteps,
  code: K8S_CODE_NODE_FAILURE,
  language: 'YAML/Shell',
  metrics: [
    { key: 'pods', label: 'Pods', max: 8, color: 'var(--pod-running)' },
    { key: 'cpu', label: 'CPU avg', max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
    { key: 'nodes', label: 'Nodes', max: 3, color: 'var(--node-ok)' },
  ],
  topicContent: {
    concept: [
      { title: 'Node Lifecycle Controller', content: 'The NodeLifecycleController monitors node heartbeats (node-status-update-frequency). If heartbeats stop, it waits node-monitor-grace-period (default 40s) before marking the node NotReady.' },
      { title: 'Pod Eviction Timeline', content: 'When a node is unreachable, taint node.kubernetes.io/unreachable:NoExecute is applied. Pods have default tolerationSeconds=300 (5min) before eviction. DaemonSet pods tolerate unreachable by default.' },
      { title: 'PodDisruptionBudget (PDB)', content: 'PDB limits how many pods can be evicted simultaneously during node failures or voluntary disruptions. minAvailable and maxUnavailable protect application availability during maintenance.' },
    ],
    why: ['Node failures are inevitable in production. Understanding the eviction timeline and PDB configuration is essential for maintaining application availability during infrastructure outages.'],
    interview: [
      { question: 'What is the full sequence of events when a node loses network connectivity?', answer: 'After ~40s (node-monitor-grace-period) of missed heartbeats, the node is marked NotReady. The taint node.kubernetes.io/unreachable:NoExecute is applied. Pods without matching tolerations are evicted after tolerationSeconds (default 300s). The scheduler then reschedules evicted pods to healthy nodes.', followUps: ['How does kubectl drain differ from an unplanned node failure?', 'What happens to pods on a cordoned node?'] },
      { question: 'How does PodDisruptionBudget interact with node failures?', answer: 'PDB protects against voluntary disruptions (drain, maintenance), but node failures are involuntary — PDB may be temporarily violated. However, the eviction API respects PDB for voluntary drains, blocking eviction if it would violate minAvailable.', followUps: ['What is the difference between NoSchedule, PreferNoSchedule, and NoExecute taint effects?'] },
    ],
    gotcha: ['kubectl drain does not evict mirror pods (static pods) or DaemonSet pods unless --ignore-daemonsets is used. Unrecognized pods will cause drain to hang.', 'EmptyDir data is lost on pod eviction to another node. StatefulSets with local data must use PVCs with ReadWriteMany or remote storage for data persistence during rescheduling.'],
    tradeoffs: [
      { pro: 'Automatic pod rescheduling ensures self-healing', con: 'Eviction delay (5min default) may be too long for critical workloads' },
      { pro: 'PDB protects application availability during maintenance', con: 'PDB can block node drains indefinitely if min-available is not met' },
    ],
  },
};

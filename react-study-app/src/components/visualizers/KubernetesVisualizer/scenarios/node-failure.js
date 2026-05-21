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
      { title: 'What happens when a node fails in simple terms?', content: 'When a Kubernetes node goes offline (network failure, hardware crash, OOM), the NodeLifecycleController detects the missed heartbeats after 40 seconds and marks the node NotReady. A taint is applied to prevent new scheduling, and pods get a 5-minute grace period before being evicted and rescheduled on healthy nodes. This self-healing mechanism ensures applications survive infrastructure failures.' },
      { title: 'How node failure recovery works — core mechanics', content: 'The NodeLifecycleController checks node conditions (Ready, DiskPressure, MemoryPressure, NetworkUnavailable) via heartbeats every node-status-update-frequency (default 5s). After node-monitor-grace-period (40s) of missed heartbeats, the node transitions to NotReady. A taint node.kubernetes.io/unreachable:NoExecute is applied with default tolerationSeconds=300. After 5 minutes, pods without matching tolerations are evicted and the scheduler finds new placements.' },
      { title: 'Deep — taints, tolerations & pod eviction', content: 'Three taint effects exist: NoSchedule (prevents new scheduling), PreferNoSchedule (soft preference), and NoExecute (evicts existing pods). DaemonSet pods and kube-system pods have built-in tolerations for unreachable nodes with infinite tolerationSeconds. The NoExecute taint with tolerationSeconds is evaluated per pod — pods that tolerate the taint with sufficient tolerationSeconds remain on the failed node and will run when it rejoins.' },
      { title: 'PodDisruptionBudget & voluntary disruptions', content: 'PDB (PodDisruptionBudget) limits how many pods can be down simultaneously during voluntary disruptions like kubectl drain or cluster upgrades. minAvailable (e.g., 2) or maxUnavailable (e.g., 1) protects application quorum. For involuntary node failures, PDB may be temporarily violated because forced evictions do not check PDB — but voluntary drains respect PDB and block eviction if it would violate the budget.' },
    ],
    why: [
      'Node failures are inevitable in any production cluster — hardware dies, kernels panic, networking partitions. The 5-minute default eviction delay is a critical tuning parameter. For latency-sensitive workloads, reducing tolerationSeconds to 60s may be necessary, but too aggressive eviction causes cascading rescheduling storms when a node briefly hiccups.',
      'Understanding the difference between involuntary (node failure) and voluntary (drain, upgrade) disruptions is essential for SREs. PodDisruptionBudget protects against voluntary disruptions but cannot prevent availability loss from involuntary failures unless multi-AZ replicas are configured with anti-affinity rules.',
      'The eviction timeline has four distinct phases: heartbeat detection (5s interval), grace period (40s before NotReady), toleration window (default 300s before eviction), and rescheduling. Misconfiguring any of these parameters causes either premature evictions or delayed recovery, both of which reduce application availability during real incidents.',
    ],
    interview: [
      { question: 'Walk through the complete sequence when a node suddenly loses network connectivity in a production cluster.', answer: 'Phase 1 (0-5s): Node sends heartbeat via node-status-update-frequency — kubelet posts Node status to API server every 5s. Phase 2 (5-40s): Heartbeats stop. NodeLifecycleController waits node-monitor-grace-period (default 40s) before acting. Phase 3 (~40s): Node marked NotReady. Taint node.kubernetes.io/unreachable:NoExecute applied automatically. Existing pods continue running. Phase 4 (40s-5min): Scheduler avoids the node. DaemonSet pods tolerate unreachable with infinite tolerationSeconds. Regular pods have 300s tolerationSeconds. Phase 5 (5min): Pods exceeding tolerationSeconds are evicted — the kubelet on the failed node cannot evict, so the NodeLifecycleController marks them for deletion and the scheduler creates replacement pods on healthy nodes. Phase 6: Replacements enter Pending, get scheduled, pull images, start, and pass readiness probes.', followUps: ['What happens to static pods and mirror pods during node failure?', 'How does the taint-based eviction interact with PDB for stateful workloads?'] },
      { question: 'How do you safely perform node maintenance without causing application downtime?', answer: 'First cordon the node (kubectl cordon node-1) to mark it unschedulable — no new pods are scheduled but existing pods continue running. Then drain the node (kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data) which evicts pods gracefully with a termination grace period, respecting PDB constraints. The --ignore-daemonsets flag is required because DaemonSet pods cannot be evicted via drain. The --delete-emptydir-data flag acknowledges that emptyDir data will be lost. If PDB constraints prevent eviction of a critical pod, drain hangs until the PDB is adjusted or the pod is manually deleted. After maintenance, kubectl uncordon node-1 re-enables scheduling.', followUps: ['What happens if you drain a node with a PodDisruptionBudget that cannot be satisfied?', 'How do you handle node maintenance for nodes running etcd or other control-plane components?'] },
      { question: 'What is the difference between NoSchedule, PreferNoSchedule, and NoExecute taint effects, and when should each be used?', answer: 'NoSchedule prevents the scheduler from placing new pods on the node but does NOT evict existing pods. Use for planned maintenance where you want existing workloads to continue. PreferNoSchedule is a soft version — the scheduler tries to avoid the node but may schedule there if no other option. Use for cost optimization or gradual node draining. NoExecute evicts existing pods (unless they have matching tolerations with tolerationSeconds) AND prevents new scheduling. Use for emergency situations where the node must be emptied immediately (disk pressure, security incident). The node.kubernetes.io/unreachable:NoExecute taint applied during node failures is an automatic NoExecute taint with default tolerationSeconds=300 for regular pods.', followUps: ['How do DaemonSet tolerations differ from regular pod tolerations?', 'Can you add custom taints to trigger application-specific scheduling logic?'] },
    ],
    gotcha: [
      'kubectl drain does NOT evict mirror pods (static pods managed by kubelet) or DaemonSet pods unless you specify --ignore-daemonsets. It also hangs indefinitely on pods not managed by a ReplicaSet, Job, or StatefulSet — unmanaged pods must be deleted manually or drain gets stuck. Always review pod ownership before draining.',
      'EmptyDir data is permanently lost on pod eviction because EmptyDir is tied to the node\'s life. When a pod is rescheduled to a different node after eviction, the new EmptyDir starts empty. StatefulSets with local data must use PVCs backed by network-attached storage (EBS, GCE PD) or distributed filesystems for data persistence across rescheduling events.',
      'The 5-minute default eviction delay (tolerationSeconds=300) can be catastrophically long for latency-sensitive workloads. A production incident requiring node draining means waiting 5 minutes before pods even start rescheduling. Set tolerationSeconds lower (60-120s) for critical workloads, but beware of brief node hiccups causing unnecessary rescheduling storms.',
      'PodDisruptionBudget can block kubectl drain indefinitely. If minAvailable is set to N and fewer than N replicas are healthy, drain refuses to evict any pods. During a cluster upgrade or node maintenance, this can stall operations for hours. Always set PDB with care — minAvailable: 2 on a 3-replica deployment means only 1 pod can be down, which may prevent any single node from being drained if it runs more than one replica.',
    ],
    tradeoffs: [
      { pro: 'Automatic pod rescheduling restores service without manual intervention — evicted pods are rescheduled to healthy nodes by the default scheduler. Combined with Cluster Autoscaler, the cluster can even provision new nodes if existing healthy nodes lack capacity, providing fully automated infrastructure recovery.', con: 'The default 5-minute eviction delay is too slow for critical workloads during production incidents. Reducing tolerationSeconds to 30-60s speeds recovery but risks cascading rescheduling storms during brief node hiccups (e.g., kernel thread hang, brief network partition). Finding the right balance requires workload-specific tuning.' },
      { pro: 'PodDisruptionBudget protects application availability during voluntary maintenance like node drains and cluster upgrades. With PDB, you can safely perform infrastructure maintenance on live clusters knowing that at least N replicas remain available, preventing full application outages during operator actions.', con: 'PDB can block node drains indefinitely if the budget cannot be met. A misconfigured PDB (minAvailable equal to total replicas) combined with a node drain essentially deadlocks operations — no pod can be evicted without violating the budget, but the drain cannot complete without evicting pods. The only resolution is manual PDB deletion or forceful pod eviction.' },
      { pro: 'Taints and tolerations provide powerful scheduling control — you can dedicate nodes to specific workloads (NoSchedule), isolate GPUs for ML training, separate production from staging, or reserve nodes for system components. The admission-time check prevents unwanted workloads from landing on specialized hardware.', con: 'The three-tier taint system (NoSchedule, PreferNoSchedule, NoExecute) has subtle interactions. Adding a NoExecute taint to a node with running workloads causes immediate pod eviction — a potentially catastrophic operation for critical services. There is no dry-run mode for taint operations, and kubectl taint does not warn before applying NoExecute with production pods on the node.' },
    ],
  },
};

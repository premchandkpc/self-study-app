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
      { title: 'What is Kubernetes scheduling in simple terms?', content: 'The Kubernetes scheduler is the component that decides which node runs each new pod. Think of it as a hotel front desk assigning guests (pods) to rooms (nodes) based on room availability (resources), guest preferences (node selectors), and any restrictions (taints/tolerations). The scheduler watches for unscheduled pods, finds the best node for each one, and binds them together.' },
      { title: 'How scheduling works — core mechanics', content: 'The scheduling cycle has three phases: Filter (predicates) removes nodes that cannot run the pod — resource constraints (CPU/mem requests), node selectors, taints, and port conflicts all eliminate nodes. Score (priorities) ranks the remaining nodes based on factors like least requested resources, balanced CPU/memory allocation, and affinity rules. Bind assigns the pod to the highest-scoring node by writing spec.nodeName to the API. The entire cycle takes ~100ms per pod in a cluster of hundreds of nodes.' },
      { title: 'Deep — scheduling framework', content: 'Modern Kubernetes uses a plugin-based scheduling framework (kube-scheduler v1.19+) that replaces the legacy predicate/priority system. Plugins implement extension points: PreFilter, Filter, PostFilter, PreScore, Score, NormalizeScore, Reserve, Permit, PreBind, Bind, and PostBind. Each plugin runs at specific points in the scheduling cycle. Common plugins: NodeResourcesFit, NodeName, NodeUnschedulable, TaintToleration, InterPodAffinity, PodTopologySpread, VolumeBinding, and ImageLocality. The framework enables custom scheduling policies without forking the scheduler.' },
      { title: 'Advanced scheduling: affinity, anti-affinity & topology spread', content: 'Pod affinity schedules pods near each other (same node, zone, or topology domain) for low latency or data locality. Pod anti-affinity spreads pods across failure domains for high availability. Required rules must be satisfied (hard constraint), preferred rules are weighted (soft constraint). TopologySpreadConstraints distribute pods evenly across zones, hosts, or any topology key, preventing over-concentration of replicas in a single failure domain. These constraints are evaluated during the Filter and Score phases respectively.' },
    ],
    why: [
      'Scheduling efficiency directly determines cluster resource utilization and cloud costs. A scheduler that distributes pods evenly across nodes maximizes the useful work per node. Poor scheduling decisions create resource fragmentation — scattered pods leaving unusable gaps of CPU on one node and memory on another, requiring more nodes overall and increasing cloud costs by 20-40%.',
      'The scheduler considers only resource REQUESTS, not LIMITS — a pod requesting 100m CPU but limited to 2000m can cause severe overcommit. If the scheduler places too many such pods on one node based on their small requests, the node becomes CPU-throttled when they all spike. Understanding this request vs limits distinction is critical for preventing noisy-neighbor scenarios.',
      'Scheduling decisions are permanent for the pod\'s lifetime — the scheduler does not reassess or migrate pods to better nodes after initial placement. Uneven resource distribution persists until pods are deleted or rescheduled. This makes initial scheduling quality critical and demonstrates the importance of tools like the Descheduler, which can evict poorly-placed pods to trigger re-scheduling.',
    ],
    interview: [
      { question: 'Walk through the complete scheduling cycle step by step, including all filter and score plugins.', answer: '1. Watch phase: kube-scheduler watches the API server via informers for pods with spec.nodeName empty (unscheduled pods). Pods enter scheduling queue with priority ordering. 2. Filter phase: Plugins run sequentially — NodeResourcesFit (checks if pod\'s resource requests fit node\'s allocatable), NodeName (matches nodeSelector), NodeUnschedulable (skips cordoned nodes), TaintToleration (checks pod tolerations match node taints), InterPodAffinity (required rules), PodTopologySpread (required rules), VolumeBinding (checks PVC availability and volume topology). Nodes failing any filter are removed. 3. Score phase: Each remaining node is scored 0-100 by plugins — NodeResourcesFit scores based on least allocated or most allocated resources (configurable), InterPodAffinity scores preferred rules, PodTopologySpread scores preferred rules, ImageLocality scores higher for nodes with the pod image already pulled. Scores are summed with per-plugin weights. 4. NormalizeScore: Raw scores are normalized to 0-100 range. 5. Reserve phase: Resources are tentatively reserved on the winning node to prevent race conditions. 6. Permit phase: If configured, a Permit plugin (e.g., for multi-scheduler coordination) can approve, deny, or delay the binding. 7. Bind phase: The scheduler writes spec.nodeName to the API, which commits the pod to the node. 8. PostBind phase: Cleanup — metrics collected, reserved resources finalized. The kubelet then takes over with image pulling and container start.', followUps: ['How does the scheduler handle pod priority and preemption?', 'What is the scheduler\'s queue sort strategy and how does it affect scheduling fairness?'] },
      { question: 'How does pod affinity and anti-affinity work, and what is the performance impact of evaluating these constraints?', answer: 'Pod affinity (spec.affinity.podAffinity) attracts pods to nodes already running certain other pods — e.g., schedule a cache pod on the same node as the frontend pod. Pod anti-affinity (spec.affinity.podAntiAffinity) repels pods from nodes running certain pods — e.g., spread replicas across different nodes for high availability. RequiredDuringScheduling rules are hard constraints that the scheduler must satisfy — if no node meets the requirement, the pod stays Pending. PreferredDuringScheduling rules are soft constraints scored during the Score phase. The performance impact of affinity evaluation is significant: the scheduler must query the pod-to-node mapping for every pod matching the affinity label, which is O(pods × nodes) in worst case. For large clusters (5000+ pods), extensive use of required anti-affinity across all pods can increase scheduling latency by 10x or more. PodTopologySpread is a more scalable alternative that distributes pods based on zone/node skew without per-pod label matching.', followUps: ['How does topology spread differ from anti-affinity in terms of scheduling guarantees?', 'What is node-level topological domain ordering?'] },
      { question: 'What happens when no node can schedule a pod, and how do you debug scheduling failures?', answer: 'The pod remains in Pending state indefinitely. The scheduler continues trying every 30s (or when cluster state changes), returning a FailedScheduling event explaining the failure. Common causes: insufficient CPU/memory on any node (check allocatable vs requests), nodeSelector or node affinity mismatch (check pod spec labels), taints without tolerations (kubectl describe nodes shows taints), PVC not found or not bound (check PVC status), or port conflicts on the host (hostPort collision). Debug with kubectl describe pod <pod> to see Events showing FailedScheduling with the specific reason, kubectl get events --field-selector involvedObject.kind=Pod to see all scheduling events, and kubectl describe node <node> to see allocatable resources. For complex failures, check the kube-scheduler logs for detailed evaluation chains showing which plugins failed for which nodes.', followUps: ['How does resource fragmentation occur and how do you prevent it with resource quotas and limit ranges?', 'What role does the Descheduler play in fixing suboptimal scheduling decisions after the fact?'] },
    ],
    gotcha: [
      'The scheduler only considers resource REQUESTS for admission, not LIMITS. A pod requesting 100m CPU but with a 4000m limit can overcommit a node by 40x relative to its request. When the pod actually uses 4 CPUs, it throttles neighboring pods. Always set requests accurately to what the pod needs, and use LimitRanges to enforce request:limit ratios at the namespace level.',
      'Node taints are evaluated only at scheduling time — adding a new NoSchedule taint to an already-scheduled node does NOT evict existing pods. Only NoExecute taints trigger eviction. This surprises operators who add a maintenance taint expecting the node to drain automatically. Use kubectl taint with NoExecute or cordon + drain for maintenance scenarios.',
      'The scheduler does NOT re-evaluate or migrate pods after initial placement. If you add resources to a node, remove taints, or add a new node with abundant capacity, existing poorly-placed pods stay where they are. The Descheduler (k8s-descheduler) addresses this by evicting pods based on policies like HighNodeUtilization, LowNodeUtilization, RemoveDuplicates, and PodLifeTime, triggering re-scheduling to better nodes.',
      'Resource fragmentation occurs when pods with asymmetric CPU/memory ratios are placed on nodes. A node with 2 CPU and 8GB memory may be unschedulable for new pods if existing pods consume all the CPU (2 CPU) but leave 6GB memory unused — no new pod can fit the CPU gap even though abundant memory remains. Using BinPacking strategies and the Descheduler\'s Defragmentation policy can mitigate this over time.',
    ],
    tradeoffs: [
      { pro: 'Efficient resource bin-packing maximizes cluster utilization — the scheduler packs pods onto nodes to minimize the number of active nodes needed. Combined with Cluster Autoscaler, this ensures the cluster runs on the minimum number of nodes required for the current workload, significantly reducing cloud infrastructure costs during low-traffic periods.', con: 'The scheduler makes a one-time placement decision and never reassesses — initially uneven pod spreads persist indefinitely until pods are manually deleted or the Descheduler is used. A pod placed on a heavily loaded node during a temporary traffic spike stays there even after the spike passes, leading to long-term resource imbalance that degrades cluster efficiency over time.' },
      { pro: 'The extensible plugin-based scheduling framework (v1.19+) supports custom scheduling policies without forking kube-scheduler. Operators can write custom plugins for workload-specific bin-packing (e.g., score GPU nodes higher for ML pods), integrate with external schedulers via the scheduler extender, or configure multiple scheduling profiles for different workload classes in the same cluster.', con: 'Advanced scheduling constraints (affinity, anti-affinity, topology spread, custom plugins) increase scheduling latency proportionally to cluster size. A 5000-node cluster with extensive inter-pod affinity rules may take 5-10x longer to schedule each pod compared to basic resource-fit scheduling. This latency affects pod startup time during scale-up events and can delay recovery during node failures.' },
      { pro: 'PodTopologySpreadConstraints provide fine-grained control over pod distribution across failure domains (zones, hosts). Required constraints guarantee at most N pods in any topology domain, preventing all replicas from landing in the same availability zone. This is essential for multi-AZ high availability in production deployments.', con: 'Topology spread constraints add complexity to the scoring phase — the scheduler must compute the skew for every topology domain across all pods matching the selector, which is O(pods × domains) in evaluation cost. Enforcing tight maxSkew=1 across zones with anti-affinity can prevent scheduling entirely if the number of replicas exceeds the number of zones (e.g., 4 replicas across 3 AZs with maxSkew=1 is impossible to satisfy).' },
    ],
  },
};

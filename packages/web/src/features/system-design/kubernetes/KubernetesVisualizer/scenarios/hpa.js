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
      { title: 'What is HPA in simple terms?', content: 'The Horizontal Pod Autoscaler (HPA) automatically adjusts the number of pod replicas based on real-time CPU, memory, or custom metrics. When traffic spikes and CPU usage rises, HPA spins up more pods to share the load. When traffic drops, it scales down to save resources. Think of it as automatic cruise control for your application\'s capacity.' },
      { title: 'How HPA works — core mechanics', content: 'HPA runs as a controller loop in kube-controller-manager with a default sync period of 15s. It queries the metrics-server for CPU/memory utilization, computes desiredReplicas = ceil(currentReplicas × (currentMetric / targetMetric)), and updates the target Deployment or StatefulSet\'s replicas field. Scale-up happens immediately, but scale-down waits a cooldown period (default 5min) to prevent thrashing — rapid fluctuations in replica count caused by metric sampling noise.' },
      { title: 'Deep — custom & external metrics', content: 'Beyond standard CPU/memory, HPA supports custom metrics from the custom.metrics.k8s.io API (Prometheus via prometheus-adapter) and external metrics from the external.metrics.k8s.io API (SQS queue depth, Kafka lag, HTTP request rate). These enable event-driven scaling — a deployment can scale based on the number of messages in an SQS queue, requests per second on an Ingress, or any business metric exposed by the application. Multiple metrics can be combined; HPA picks the metric that yields the highest desired replica count.' },
      { title: 'HPA + Cluster Autoscaler interaction', content: 'HPA and Cluster Autoscaler work in tandem: HPA decides how many replicas are needed, Cluster Autoscaler ensures there are enough nodes to run them. When HPA scales up but existing nodes lack capacity, new pods stay Pending. Cluster Autoscaler detects pending pods, provisions new nodes from the cloud provider, and the scheduler places the pods. Without Cluster Autoscaler, HPA is limited to the fixed node capacity — a common production surprise during traffic spikes.' },
    ],
    why: [
      'HPA is the primary mechanism for handling unpredictable traffic patterns in production. Without HPA, teams either over-provision (wasting significant cloud costs during low traffic) or under-provision (causing degraded performance or outages during traffic spikes). HPA eliminates the guesswork by matching capacity to demand in real-time.',
      'The reactive nature of HPA means there is always a lag between traffic spike and scale-up — the first surge of requests hits the existing replicas before HPA detects the increase, computes desired replicas, and the new pods start. Understanding this timing gap is critical for workloads with sudden traffic surges (flash crowds, batch job completions, marketing events).',
      'Custom and external metrics enable scaling on business-relevant signals rather than CPU/memory proxies. For example, scaling a video transcoding service based on queue depth rather than CPU prevents premature scale-down when pods are CPU-idle but the queue is growing. This metric selection is one of the most impactful tuning decisions for HPA effectiveness.',
    ],
    interview: [
      { question: 'Walk through the HPA control loop: what happens when a deployment experiences a traffic spike that doubles CPU utilization?', answer: '1. The HPA controller (part of kube-controller-manager) runs every 15s by default. 2. It queries the metrics-server API for CPU utilization of all pods matching the HPA\'s label selector. 3. It computes the average CPU utilization across all pods — say it was 30% and spiked to 85%. 4. It applies the formula: desiredReplicas = ceil(2 × (85 / 50)) = ceil(2 × 1.7) = 4. The target CPU was set to 50%. 5. It compares the result (4) with the current replicas (2) and the HPA limits (min=2, max=10). 6. It updates the target Deployment\'s spec.replicas from 2 to 4 via the scale subresource. 7. The Deployment controller creates a new ReplicaSet with 4 replicas — 2 new pods enter Pending state. 8. The scheduler places them, kubelets pull images and start containers, readiness probes pass. 9. On the next sync cycle (15s later), HPA recomputes with 4 pods — CPU load is now distributed across 4 pods, average drops below target. 10. During scale-down waiting cooldown (default 5min), HPA does not reduce replicas even if CPU is low to avoid thrashing. After cooldown, if CPU remains below 50% for the entire window, HPA scales back down.', followUps: ['How does the HPA handle a pod that has no CPU metric due to a crash or startup delay?', 'What behavior changes with the --horizontal-pod-autoscaler-upscale-delay flag?'] },
      { question: 'How do you configure HPA with custom metrics from Prometheus via prometheus-adapter?', answer: '1. Deploy prometheus-adapter which implements the custom.metrics.k8s.io API. 2. Configure adapter\'s config with metric discovery rules — convert Prometheus metrics to Kubernetes custom metrics with appropriate labels. Example: convert http_requests_total{namespace,deployment} to a custom metric. 3. Install the metrics-server (required for CPU/memory HPA even with custom metrics). 4. Create HPA YAML with spec.metrics[].type: Pods (pods metric, averaged across pods), Object (single object metric), or External (cluster-wide external metric). 5. For Pods type: resource.name: requests-per-second, target.type: AverageValue, target.averageValue: 1000. The prometheus-adapter queries Prometheus, aggregates the metric per pod, and surfaces it via the custom metrics API. HPA\'s behavior field (v2beta2+) configures scale-up/down policies: stabilizationWindowSeconds, selectPolicy (Max, Min, or Disabled), and policies[] for fine-grained control.', followUps: ['How does the HPA handle multiple metrics — which one takes precedence?', 'What is the behavior field in HPA v2 and how do you configure aggressive scale-up with conservative scale-down?'] },
      { question: 'How does HPA interact with the Kubernetes scheduler during scale-up when the cluster has no available capacity?', answer: 'When HPA increases the replica count, the Deployment controller creates new pods that enter Pending state if no node has enough free resources. The scheduler retries every 30s but cannot place pods without sufficient CPU/memory. The Cluster Autoscaler (if deployed) detects pending pods, calls the cloud provider\'s API to add nodes (e.g., EC2 instances via Auto Scaling Group), waits for the node to become Ready, and the scheduler places the pending pods. Without Cluster Autoscaler, pods remain Pending indefinitely — the deployment is stuck at less than desired replicas, causing degraded performance or downtime. Key tuning: set appropriate PodDisruptionBudget to prevent scale-down from evicting critical pods; configure Cluster Autoscaler with appropriate min/max node counts to avoid runaway cloud costs; and set buffer overhead in node resource allocation (reserved resources for kubelet, OS, DaemonSets) so that new pods have room when nodes join.', followUps: ['How does the --horizontal-pod-autoscaler-cpu-initialization-period flag affect HPA behavior during pod startup?', 'Can HPA scale to zero replicas, and what controllers support this?'] },
    ],
    gotcha: [
      'HPA behavior with missing metrics is unpredictable — if the metrics-server is down or pods have not reported CPU metrics yet (during the initialization period), HPA may scale aggressively to max replicas or refuse to scale at all depending on configuration. The --horizontal-pod-autoscaler-cpu-initialization-period flag (default 5min) ignores CPU metrics during pod startup to prevent premature scaling decisions based on noisy initial data.',
      'HPA + Cluster Autoscaler interaction is critical but often misunderstood: HPA can request more replicas, but if the cluster lacks node capacity, pods stay Pending and the application remains overloaded. Cluster Autoscaler detects pending pods and provisions new nodes, but this takes 3-10 minutes depending on cloud provider. During this window, the application runs at insufficient capacity. Pre-warming node pools or using over-provisioning with PDBs can mitigate this.',
      'HPA uses the average utilization across all pods — one pod with very high CPU can skew the average and trigger false scale-ups if other pods are near-idle. Conversely, one failed pod not reporting metrics reduces the average, potentially preventing scale-up when it is actually needed. Always ensure all pods report metrics reliably, and consider using percentiles (via custom metrics) instead of averages for spiky workloads.',
      'The behavior field (HPA v2) defaults may not match your workload\'s needs. Default scale-up is immediate but scale-down has a 5-minute stabilization window. For bursty workloads, you may need faster scale-up (behavior with scaleUp policies: periodSeconds: 15, type: Percent, value: 100) or slower scale-down (extend stabilizationWindowSeconds). Misconfigured behavior is a common cause of either thrashing or slow response to load changes.',
    ],
    tradeoffs: [
      { pro: 'Automatic elasticity reduces manual intervention during traffic spikes — HPA scales up within seconds of detecting increased load. Combined with Cluster Autoscaler, the entire infrastructure expands and contracts automatically in response to traffic patterns, eliminating the need for on-call engineers to manually add replicas during traffic events.', con: 'Reactive scaling has inherent lag — the 15s sync interval plus pod startup time (10-60s for image pull + readiness probe) means traffic may be dropped or experience degraded latency during the scale-up window. Pre-warming pods or using predictive scaling (e.g., Cron-based HPA adjustments for known traffic patterns) can reduce but not eliminate this window.' },
      { pro: 'Significant cost savings through scale-down during low traffic periods — many production workloads run at 20-30% capacity during off-peak hours. HPA automatically reduces replicas to match demand, potentially cutting infrastructure costs by 50-70% for variable-traffic services compared to static over-provisioning.', con: 'Thrashing risk exists if cooldown and metric thresholds are not properly tuned. A workload with oscillating CPU (processing a batch every 30s that spikes CPU then drops) can cause HPA to scale up and down repeatedly, creating unnecessary pod churn, increasing API server load, and potentially incurring startup cost for each new pod (e.g., database connection pool warming, cache filling).' },
      { pro: 'Custom and external metrics enable scaling on business-relevant signals — a video transcoding service scales on queue depth, a webhook handler scales on request latency, a Kafka consumer scales on consumer lag. This provides more accurate scaling triggers than CPU/memory which are proxies, not direct measures of workload demand.', con: 'Custom metrics add significant operational complexity — deploying and configuring prometheus-adapter, writing metric discovery rules, debugging why a custom metric is not showing up in the HPA\'s target list, and monitoring the HPA\'s metric availability. The additional infrastructure (Prometheus, adapter) must be maintained and scaled independently of the application.' },
    ],
  },
};

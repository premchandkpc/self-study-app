export function buildK8sSteps(scenario = 'schedule') {
  if (scenario === 'schedule') return buildScheduleSteps();
  if (scenario === 'hpa')      return buildHPASteps();
  if (scenario === 'rolling')  return buildRollingSteps();
  if (scenario === 'crash')    return buildCrashSteps();
  if (scenario === 'services') return buildServicesSteps();
  return buildScheduleSteps();
}

/* ── Shared helpers ── */
const makePod = (id, node, state = 'pending') => ({
  id, node, state, age: 0, ready: false, restarts: 0,
});

const makeNode = (id, cpu = 0, mem = 0) => ({ id, cpu, mem, maxCpu: 100, maxMem: 100 });

function snap(steps, state, narration, codeLine = null) {
  steps.push({
    ...JSON.parse(JSON.stringify(state)),
    narration,
    codeLine,
    complexity: { ops: steps.length + 1, label: 'O(pods)', space: 'O(nodes)' },
  });
}

/* ── SCENARIO 1: Pod Scheduling ── */
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

/* ── SCENARIO 2: HPA Scaling ── */
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

/* ── SCENARIO 3: Rolling Deployment ── */
function buildRollingSteps() {
  const steps = [];
  const s = {
    nodes: [makeNode('node-1'), makeNode('node-2'), makeNode('node-3')],
    pods: [
      { ...makePod('v1-a', 'node-1', 'running'), version: 'v1', ready: true },
      { ...makePod('v1-b', 'node-2', 'running'), version: 'v1', ready: true },
      { ...makePod('v1-c', 'node-3', 'running'), version: 'v1', ready: true },
    ],
    metrics: { pods: 3, nodes: 3, cpu: 20, restarts: 0 },
    events: [],
    deployVersion: 'v1',
  };

  snap(steps, s, 'v1: 3/3 pods running. Ready to rolling-deploy v2.', 1);

  s.events.push({ type: 'info', msg: 'kubectl set image deployment/app app=app:v2' });
  s.deployVersion = 'v2 rolling...';
  snap(steps, s, 'Rolling update started. maxSurge=1, maxUnavailable=0.', 2);

  for (let i = 0; i < 3; i++) {
    // new v2 pod surge
    const newPod = { ...makePod(`v2-${String.fromCharCode(97 + i)}`, s.nodes[i].id, 'pending'), version: 'v2', ready: false };
    s.pods.push(newPod);
    s.metrics.pods = s.pods.length;
    snap(steps, s, `Surge: v2 pod on ${s.nodes[i].id}: PENDING (pulling image).`, 3);

    newPod.state = 'running';
    newPod.ready = true;
    snap(steps, s, `v2 pod RUNNING, readiness probe passed. Old v1 pod can be terminated.`, 5);

    // terminate old v1
    const oldIdx = s.pods.findIndex((p) => p.version === 'v1');
    s.pods[oldIdx].state = 'terminating';
    snap(steps, s, `v1-${String.fromCharCode(97 + i)}: TERMINATING. Graceful shutdown. No downtime.`, 6);

    s.pods.splice(oldIdx, 1);
    s.metrics.pods = s.pods.length;
  }

  s.deployVersion = 'v2';
  snap(steps, s, '✅ Rolling deploy complete. 3/3 pods on v2. Zero downtime.', 8);
  return steps;
}

/* ── SCENARIO 4: CrashLoopBackoff ── */
function buildCrashSteps() {
  const steps = [];
  const s = {
    nodes: [makeNode('node-1')],
    pods: [makePod('crash-pod', 'node-1', 'pending')],
    metrics: { pods: 1, nodes: 1, cpu: 5, restarts: 0 },
    events: [],
    deployVersion: 'v1',
  };

  snap(steps, s, 'Pod scheduled on node-1. kubelet starts container.', 1);

  const pod = s.pods[0];
  pod.state = 'running';
  snap(steps, s, 'Container started. Running initialization…', 2);

  for (let i = 1; i <= 4; i++) {
    pod.state = 'error';
    pod.restarts = i;
    s.metrics.restarts = i;
    s.events.push({ type: 'error', msg: `Container exited (code=1). Restart #${i}` });
    snap(steps, s, `❌ Container crashed (exit code 1). Restart #${i}. Backoff: ${2 ** (i - 1) * 10}s.`, 4);

    if (i < 4) {
      pod.state = 'running';
      snap(steps, s, `Backoff wait done. Container restarted. Attempt ${i + 1}…`, 2);
    }
  }

  pod.state = 'crashloopbackoff';
  s.events.push({ type: 'error', msg: 'CrashLoopBackOff: max backoff 5min reached.' });
  snap(steps, s, '⚠ CrashLoopBackOff. Kubernetes waiting 5min before next retry. Check logs.', 6);

  return steps;
}

export const K8S_CODE = {
  schedule: [
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
  ],
  hpa: [
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
  ],
  rolling: [
    '# Rolling update',
    'kubectl set image deploy/app app=v2',
    '# Strategy:',
    'maxSurge: 1        # +1 new pod',
    'maxUnavailable: 0  # no downtime',
    '# For each old pod:',
    '  createNewPod(v2)',
    '  waitReady()',
    '  terminateOld(v1)',
    '# Zero-downtime deploy',
  ],
  crash: [
    '# Pod restart policy',
    'restartPolicy: Always',
    '# CrashLoopBackOff',
    'backoff: 10s → 20s → 40s',
    '         → 80s → 160s → 5min',
    '# Debug commands:',
    'kubectl logs <pod> --previous',
    'kubectl describe pod <pod>',
    'kubectl exec -it <pod> -- sh',
  ],
  services: [
    '# ClusterIP (internal)',
    'spec:',
    '  type: ClusterIP',
    '  selector: app=web',
    '  ports: [{port:80, targetPort:8080}]',
    '',
    '# NodePort (external dev)',
    'spec:',
    '  type: NodePort',
    '  nodePort: 30080',
    '',
    '# LoadBalancer (cloud)',
    'spec:',
    '  type: LoadBalancer',
    '  # cloud provisions ELB/GLB',
  ],
};

/* ── SCENARIO 5: Services (ClusterIP / NodePort / LoadBalancer) ── */
function buildServicesSteps() {
  const steps = [];
  const snap = (s, narration, codeLine = null) => {
    steps.push({ ...JSON.parse(JSON.stringify(s)), narration, codeLine, complexity: { ops: steps.length + 1, label: 'networking', space: 'O(pods)' } });
  };

  const s = {
    nodes: [makeNode('node-1', 30, 40), makeNode('node-2', 25, 35)],
    pods: [
      { id: 'web-1', node: 'node-1', state: 'running', restarts: 0, version: 'v1', serviceType: 'web' },
      { id: 'web-2', node: 'node-2', state: 'running', restarts: 0, version: 'v1', serviceType: 'web' },
      { id: 'db-1',  node: 'node-1', state: 'running', restarts: 0, version: 'v1', serviceType: 'db' },
    ],
    services: [
      { id: 'web-svc', type: 'ClusterIP', selector: 'app=web', ip: '10.96.0.1', port: 80, endpoints: ['web-1','web-2'] },
    ],
    events: [],
    metrics: { pods: 3, cpu: 30, restarts: 0, services: 1 },
  };

  snap(s, 'Two worker nodes, 3 pods. No Service yet — pods only reachable by pod IP (ephemeral).', 1);

  // ClusterIP
  s.events.push({ type: 'info', msg: 'kubectl apply -f clusterip.yaml → Service created' });
  snap(s, 'ClusterIP Service created. Virtual IP 10.96.0.1. kube-proxy adds iptables rules on every node.', 2);

  // Internal request
  s.events.push({ type: 'ok', msg: 'Pod-to-pod: curl web-svc:80 → kube-proxy load-balances to web-1 or web-2' });
  snap(s, 'Internal client hits ClusterIP. kube-proxy round-robins across endpoints. Service discovery via DNS.', 3);

  // NodePort
  s.services.push({ id: 'web-nodeport', type: 'NodePort', selector: 'app=web', ip: '10.96.0.2', port: 30080, endpoints: ['web-1','web-2'] });
  s.metrics.services = 2;
  s.events.push({ type: 'info', msg: 'NodePort: port 30080 open on EVERY node IP' });
  snap(s, 'NodePort exposes port 30080 on all node IPs. External access: <nodeIP>:30080. Dev/staging use only.', 4);

  // LoadBalancer
  s.services.push({ id: 'web-lb', type: 'LoadBalancer', selector: 'app=web', ip: '34.120.1.100', port: 80, endpoints: ['web-1','web-2'] });
  s.metrics.services = 3;
  s.events.push({ type: 'ok', msg: 'Cloud provisions ELB/GLB. External IP: 34.120.1.100' });
  snap(s, 'LoadBalancer Service: cloud controller provisions external load balancer with public IP.', 5);

  // Web-2 crashes — service automatically removes from endpoints
  s.pods[1].state = 'error';
  s.services[0].endpoints = ['web-1'];
  s.services[1].endpoints = ['web-1'];
  s.services[2].endpoints = ['web-1'];
  s.metrics.pods = 2;
  s.events.push({ type: 'warn', msg: 'web-2 crashes. Endpoint controller removes it from all Services.' });
  snap(s, 'web-2 fails readinessProbe. Removed from Service endpoints automatically. Traffic to web-1 only.', 6);

  return steps;
}

export const SCENARIOS = [
  {
    id: 'schedule',
    label: 'Scheduling',
    icon: '📅',
    build: buildScheduleSteps,
    code: K8S_CODE.schedule,
    language: 'YAML/Shell',
    metrics: [
      { key: 'pods',     label: 'Pods',     max: 8,   color: 'var(--pod-running)' },
      { key: 'cpu',      label: 'CPU avg',  max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
      { key: 'restarts', label: 'Restarts', max: 10,  color: 'var(--pod-crash)', warn: 30, critical: 60 },
    ],
  },
  {
    id: 'hpa',
    label: 'HPA Scale',
    icon: '📈',
    build: buildHPASteps,
    code: K8S_CODE.hpa,
    language: 'YAML/Shell',
    metrics: [
      { key: 'pods',     label: 'Pods',     max: 8,   color: 'var(--pod-running)' },
      { key: 'cpu',      label: 'CPU avg',  max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
      { key: 'restarts', label: 'Restarts', max: 10,  color: 'var(--pod-crash)' },
    ],
  },
  {
    id: 'rolling',
    label: 'Rolling',
    icon: '🔄',
    build: buildRollingSteps,
    code: K8S_CODE.rolling,
    language: 'YAML/Shell',
    metrics: [
      { key: 'pods',     label: 'Pods',     max: 8,  color: 'var(--pod-running)' },
      { key: 'cpu',      label: 'CPU avg',  max: 100, unit: '%', color: 'var(--node-comparing)' },
      { key: 'restarts', label: 'Restarts', max: 10, color: 'var(--pod-crash)' },
    ],
  },
  {
    id: 'crash',
    label: 'Crash Loop',
    icon: '💥',
    build: buildCrashSteps,
    code: K8S_CODE.crash,
    language: 'YAML/Shell',
    metrics: [
      { key: 'pods',     label: 'Pods',     max: 8,  color: 'var(--pod-running)' },
      { key: 'cpu',      label: 'CPU avg',  max: 100, unit: '%', color: 'var(--node-comparing)' },
      { key: 'restarts', label: 'Restarts', max: 20, color: 'var(--pod-crash)', warn: 30, critical: 60 },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    icon: '🔗',
    build: buildServicesSteps,
    code: K8S_CODE.services,
    language: 'YAML/Shell',
    metrics: [
      { key: 'pods',     label: 'Pods',     max: 8, color: 'var(--pod-running)' },
      { key: 'cpu',      label: 'CPU avg',  max: 100, unit: '%', color: 'var(--node-comparing)' },
      { key: 'services', label: 'Services', max: 5, color: 'var(--node-default)' },
    ],
  },
];

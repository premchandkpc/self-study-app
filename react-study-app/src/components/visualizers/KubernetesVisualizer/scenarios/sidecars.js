import { snap, makePod, makeNode } from '@/core/utils/scenarioShared';

function buildSidecarSteps() {
  const steps = [];
  const s = {
    nodes: [makeNode('node-1', 25, 40)],
    pods: [makePod('app', 'node-1', 'running')],
    metrics: { pods: 1, nodes: 1, cpu: 25, restarts: 0 },
    events: [],
    sidecars: [],
  };
  s.pods[0].ready = true;
  s.pods[0].version = 'v1';

  s.sidecars.push({ name: 'app', image: 'my-app:1.0', volume: '/var/log/app', state: 'running' });
  snap(steps, s, 'Main app container starts. Listens on :8080. Writes logs to /var/log/app.', 1);

  s.sidecars.push({ name: 'envoy-proxy', image: 'envoyproxy/envoy:v1.28', volume: '/var/log/envoy', state: 'running' });
  s.events.push({ type: 'info', msg: 'Envoy sidecar injected — intercepts traffic via iptables' });
  snap(steps, s, 'Envoy sidecar injected into same pod. Same network ns, same IP. Handles ingress/egress traffic.', 2);

  s.events.push({ type: 'ok', msg: 'Sidecar and app share emptyDir volume for log shipping' });
  s.sidecars.push({ name: 'log-agent', image: 'fluentd:v1.16', volume: '/var/log/app:/shared', state: 'running' });
  snap(steps, s, 'Sidecar pattern: Fluentd log agent shares emptyDir volume with app. Ships logs to stdout/Central.', 3);

  s.events.push({ type: 'info', msg: 'Init container runs first — config generation' });
  snap(steps, s, 'Init container (init-config) runs before app/sidecar. Generates envoy.yaml from ConfigMap/Secrets.', 4);

  s.events.push({ type: 'info', msg: 'Ambassador: sidecar proxies to external databases' });
  s.sidecars.push({ name: 'adapter', image: 'prometheus-adapter:v0.11', volume: '/metrics', state: 'running' });
  snap(steps, s, 'Adapter pattern: sidecar transforms app metrics to Prometheus format. Ambassador: proxy sidecar routes db traffic.', 5);

  s.events.push({ type: 'ok', msg: 'Resource limits applied per container — QoS guaranteed' });
  s.metrics.cpu = 45;
  s.metrics.pods = 1;
  snap(steps, s, 'Multi-container pod: same lifecycle, same IP, same volume. Resource limits per container. QoS class: Guaranteed.', 6);

  return steps;
}

export const K8S_CODE_SIDECARS = [
  '# Sidecar pod spec',
  'apiVersion: v1',
  'kind: Pod',
  'metadata:',
  '  name: app-with-sidecar',
  'spec:',
  '  initContainers:',
  '    - name: init-config',
  '      image: busybox',
  '      command: ["sh", "-c", "echo config > /etc/envoy/envoy.yaml"]',
  '  containers:',
  '    - name: main-app',
  '      image: my-app:1.0',
  '      volumeMounts:',
  '        - name: shared-logs',
  '          mountPath: /var/log/app',
  '    - name: envoy-proxy',
  '      image: envoyproxy/envoy:v1.28',
  '      ports:',
  '        - containerPort: 9901',
  '  volumes:',
  '    - name: shared-logs',
  '      emptyDir: {}',
  '# Check sidecars',
  'kubectl get pods -o wide',
  'kubectl describe pod app-with-sidecar',
  'kubectl logs app-with-sidecar -c envoy-proxy',
];

export default {
  id: 'sidecars',
  label: 'Sidecar Pattern',
  icon: '🔌',
  build: buildSidecarSteps,
  code: K8S_CODE_SIDECARS,
  language: 'YAML/Shell',
  metrics: [
    { key: 'pods', label: 'Pods', max: 4, color: 'var(--pod-running)' },
    { key: 'cpu', label: 'CPU avg', max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
    { key: 'restarts', label: 'Restarts', max: 10, color: 'var(--pod-crash)' },
  ],
  topicContent: {
    concept: [
      { title: 'Sidecar Pattern', content: 'A sidecar is an additional container running in the same pod as the main application. It shares the pod\'s network namespace, IP, and storage volumes, but has its own resource limits and lifecycle.' },
      { title: 'Common Sidecar Roles', content: 'Service mesh proxies (Envoy/Istio), log shippers (Fluentd/Filebeat), metrics adapters, and configuration reloaders are typical sidecar implementations.' },
      { title: 'Init Containers vs Sidecars', content: 'Init containers run to completion before app containers start, making them ideal for setup tasks. Sidecars run alongside the main container for ongoing support functions.' },
    ],
    why: ['Sidecars decouple cross-cutting concerns (observability, networking, security) from application code, allowing teams to update infrastructure without modifying the application image.'],
    interview: [
      { question: 'How does a sidecar proxy like Envoy intercept traffic in a pod?', answer: 'Envoy uses iptables rules injected by an init container to redirect all inbound/outbound traffic. Since containers share the same network namespace, Envoy can capture and route traffic transparently without application changes.', followUps: ['What is the difference between sidecar and ambassador patterns?', 'How do you debug traffic issues in a multi-container pod?'] },
      { question: 'What are the resource implications of using sidecars?', answer: 'Each sidecar consumes CPU and memory from the pod\'s resource quota. Over-provisioning sidecars can lead to OOM kills or throttling of the main application. Use VPA or careful resource profiling per container.', followUps: ['How do you monitor per-container resource usage?', 'What tools exist for managing sidecar injection at scale?'] },
    ],
    gotcha: ['kubectl logs requires -c flag to specify the container name in multi-container pods — forgetting it returns an error. Many troubleshooters waste time on this.', 'Sidecar restart restarts the entire pod since containers share the pod lifecycle. A crashing sidecar triggers pod restart, affecting the main app even if healthy.'],
    tradeoffs: [
      { pro: 'Clean separation of concerns — app image unchanged', con: 'Increased pod resource consumption and startup time' },
      { pro: 'Transparent traffic management without code changes', con: 'Debugging complexity: needing to exec into specific containers and parse inter-container networking' },
    ],
  },
};

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
      { title: 'What is the Sidecar pattern in simple terms?', content: 'A sidecar is an extra helper container that runs alongside your main application container inside the same Kubernetes pod. Think of it like a motorcycle sidecar — attached to the main vehicle, sharing its resources, but serving a different purpose. All containers in a pod share the same network namespace (same IP), storage volumes, and lifecycle — they start and stop together as a unit.' },
      { title: 'How sidecars work — core mechanics', content: 'Sidecars share the pod\'s network namespace, so they can intercept traffic via iptables rules (service mesh proxies like Envoy) or read/write shared volumes (log shippers like Fluentd). Each container in the pod has its own resource limits, image, and restart policy. The kubelet manages all containers in the pod as a single unit — if any container crashes, the entire pod restarts (depending on restartPolicy).' },
      { title: 'Init containers vs sidecars', content: 'Init containers run sequentially to completion before any app containers start — they are ideal for setup tasks like generating config files or waiting for dependencies. Sidecars run concurrently with the main container for ongoing support. Since Kubernetes 1.28, restartable init containers blur this line by allowing init containers to run sidecar-style with their own restart policy, useful for tools that need to start before the app but stay running.' },
      { title: 'Deep — sidecar injection mechanisms & patterns', content: 'Sidecars are injected manually in the pod spec or automatically via mutating admission webhooks (Istio, Linkerd). The webhook intercepts Pod CREATE requests, mutates the spec to add the sidecar container, and often adds an init container to set up iptables redirection rules. Common patterns include: ambassador (proxy traffic to external systems), adapter (transform app output for external interfaces), and init+sidecar combo for config generation plus runtime support.' },
    ],
    why: [
      'Sidecars decouple cross-cutting concerns like observability, networking, and security from application code. Teams can update Envoy, Fluentd, or metrics adapters independently without rebuilding or redeploying the application image, enabling separate lifecycle management for infrastructure concerns from business logic.',
      'In service mesh architectures, sidecar proxies provide mTLS encryption, traffic shifting for canary deployments, automatic retries, circuit breaking, and distributed tracing without any application changes. This is critical for polyglot environments where embedding these capabilities in each language or framework would be prohibitively expensive.',
      'Sidecars enable graduated feature rollout for platform teams — a new logging agent, proxy version, or metrics adapter can be tested on a subset of workloads via namespace or label selectors before organization-wide rollout. This minimizes the blast radius of infrastructure changes and allows safe A/B testing of platform components in production.',
    ],
    interview: [
      { question: 'How does a sidecar proxy like Envoy intercept inbound and outbound traffic in a pod?', answer: 'Envoy uses iptables rules injected by an init container running with NET_ADMIN capability. The init container installs rules to redirect all inbound traffic to Envoy\'s listener port and all outbound traffic through Envoy\'s egress port. Since all containers in a pod share the same network namespace, Envoy sees every packet regardless of which container sends or receives it. This transparent interception requires no application code changes — the app continues sending to localhost or its normal destination while Envoy handles the actual routing, mTLS termination, and load balancing.', followUps: ['What happens if the iptables init container fails?', 'How does this differ from the ambassador pattern where the proxy is explicitly addressed?'] },
      { question: 'What are the CPU and memory implications of running sidecar proxies in production?', answer: 'Each sidecar typically consumes 50-200m CPU and 50-256MB memory depending on configuration and traffic volume. Envoy with full mTLS, access logging, and distributed tracing can use 300m+ CPU under high throughput. Since containers share the pod\'s cgroup, a sidecar that exceeds its memory limit causes an OOM kill, which restarts the entire pod. You must profile sidecar resource usage independently from the main app — use sidecar-specific resource requests/limits and monitor per-container metrics via cadvisor or the metrics-server.', followUps: ['How do you right-size sidecar resource limits?', 'What tools exist for managing sidecar injection at scale without namespace-wide webhooks?'] },
      { question: 'How does the sidecar lifecycle differ from init containers, and when would you use restartable init containers?', answer: 'Traditional init containers run to completion sequentially and exit before any app container starts — they are ideal for one-time setup like generating configs or waiting on dependencies. Sidecars run concurrently with the main container and stay alive for the pod\'s lifetime. Kubernetes 1.28+ introduced restartable init containers with restartPolicy: Always, which start before app containers but can restart independently. Use restartable init containers when you need a tool (like a config reloader) to start before the app but restart without cycling the main container, or for ordered startup where the sidecar must be ready before the main application initializes.', followUps: ['How do startup probes work across init containers and sidecars?', 'What happens to volume mounts owned by init containers when they exit?'] },
    ],
    gotcha: [
      'kubectl logs fails with an error in multi-container pods unless you specify -c <container-name>. Many engineers troubleshooting a pod forget the -c flag and waste time thinking the pod has no logs. Always use kubectl logs <pod> -c <container> or kubectl logs <deployment> --all-containers in newer versions.',
      'A crashing sidecar provokes a full pod restart because all containers in a pod share the same lifecycle. If your log shipper has a memory leak and gets OOMKilled, the main application container restarts too — even if the app itself is perfectly healthy. This coupling is the #1 production surprise with sidecars.',
      'Resource limits apply per container, not per pod — but the pod\'s cgroup is shared. If the sidecar\'s CPU limit is set too low and the main container is also consuming CPU, both get throttled under the pod-level cgroup pressure. Always profile and set resource requests/limits independently for each container in a multi-container pod.',
      'Mutating admission webhooks for sidecar injection (Istio, Linkerd) can conflict with other mutating webhooks. Webhooks execute in a specific order defined by kube-apiserver flags. If a namespace-labeling webhook runs after the sidecar injector, the sidecar may skip pods in namespaces that should have been included, or worse, the pod creation can fail entirely due to conflicting mutations.',
    ],
    tradeoffs: [
      { pro: 'Sidecars cleanly separate cross-cutting concerns from application code — infrastructure teams update proxies, log shippers, or metrics adapters independently. The application image stays unchanged, simplifying CI/CD pipelines and reducing regression risk. This enables true separation of concerns between platform and product teams.', con: 'Each sidecar adds CPU, memory, and ephemeral storage consumption to the pod\'s resource quota. A pod with 3 sidecars can double resource consumption per replica, significantly increasing cluster costs and node pressure. Careful per-container resource profiling is essential to avoid either waste or OOM kills.' },
      { pro: 'Transparent traffic interception via sidecar proxies provides mTLS, retries, circuit breaking, traffic splitting, and distributed tracing without any application code changes. This enables consistent security and reliability policy across a polyglot microservices architecture spanning multiple languages and frameworks.', con: 'Debugging multi-container pods is substantially harder. kubectl exec requires -c flags, network issues require tracing through iptables rules that transparently redirect traffic, logs from different containers must be correlated, and the pod-level restart policy means a sidecar crash interrupts the main application. Operational complexity grows with each added sidecar.' },
      { pro: 'Mutating admission webhook injection (Istio, Linkerd) enables org-wide policy enforcement without developer involvement or pod spec changes. Platform teams can enforce mTLS, select proxy versions, configure observability exports, and inject custom sidecars across all namespaces from a single webhook configuration.', con: 'Webhook-based injection adds latency to every pod creation and is a critical single point of failure — if the webhook service is down, no pods can be created in the cluster. Multiple mutating webhooks with conflicting modifications can cause subtle injection bugs, and webhook ordering is difficult to debug without enabling verbose kube-apiserver audit logging.' },
    ],
  },
};

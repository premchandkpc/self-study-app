import { snap, makePod, makeNode } from '@/core/utils/scenarioShared';

function buildDnsSteps() {
  const steps = [];
  const s = {
    nodes: [makeNode('node-1', 8, 12), makeNode('node-2', 12, 16)],
    pods: [
      makePod('frontend', 'node-1', 'running'),
      makePod('api-svc-dns', 'node-1', 'running'),
      makePod('backend', 'node-2', 'running'),
      makePod('coredns-1', 'node-1', 'running'),
      makePod('coredns-2', 'node-2', 'running'),
    ],
    metrics: { pods: 5, nodes: 2, cpu: 8, restarts: 0 },
    events: [],
    dnsLookups: [],
  };
  s.pods.forEach((p) => (p.ready = true));

  s.events.push({ type: 'info', msg: 'App queries service via DNS name: my-svc.namespace.svc.cluster.local' });
  s.dnsLookups.push({ query: 'my-svc.namespace.svc.cluster.local', result: null, type: 'full' });
  snap(steps, s, 'Frontend pod issues DNS lookup for my-svc.namespace.svc.cluster.local (FQDN).', 1);

  s.events.push({ type: 'info', msg: 'ndots:5 → pods search domain appended before external DNS fallback' });
  s.dnsLookups.push({ query: 'my-svc', result: '10.96.0.1', type: 'cluster' });
  snap(steps, s, 'ndots:5 rule — query tried with cluster search domains first. Resolves to ClusterIP.', 2);

  s.events.push({ type: 'ok', msg: 'CoreDNS watches EndpointSlice API, returns backend pod IPs' });
  s.dnsLookups.push({ query: 'my-svc.namespace.svc.cluster.local', result: '10.96.0.1 (ClusterIP)', type: 'resolved' });
  snap(steps, s, 'CoreDNS pod watches k8s API for Service/EndpointSlice changes. Returns A/AAAA records.', 3);

  s.events.push({ type: 'info', msg: 'Stub domain configured: custom-db.internal → external nameserver' });
  s.dnsLookups.push({ query: 'db.custom-db.internal', result: '10.0.0.53', type: 'stub' });
  snap(steps, s, 'Stub domains in CoreDNS ConfigMap forward custom zones to external nameservers.', 4);

  s.events.push({ type: 'info', msg: 'External DNS — Route53 integration syncs Ingress to public DNS' });
  s.dnsLookups.push({ query: 'app.example.com', result: '203.0.113.42 (ELB)', type: 'external' });
  snap(steps, s, 'ExternalDNS controller watches Ingress resources, syncs to Route53 for public resolution.', 5);

  s.events.push({ type: 'ok', msg: 'DNS caching via node-local-dns — ndots:5 optimized' });
  s.metrics.cpu = 5;
  snap(steps, s, 'NodeLocal DNSCache runs as DaemonSet. Caches cluster DNS. Reduces CoreDNS load. ndots:5 avoids unnecessary upstream lookups.', 6);

  return steps;
}

export const K8S_CODE_DNS = [
  '# CoreDNS ConfigMap',
  'ConfigMap/coredns:',
  '  Corefile: |',
  '    .:53 {',
  '      kubernetes cluster.local in-addr.arpa ip6.arpa',
  '      pods insecure',
  '      prometheus :9153',
  '      forward . /etc/resolv.conf',
  '      cache 30',
  '    }',
  '# Test DNS',
  'kubectl run dnsutils --image=gcr.io/kubernetes-e2e-test-images/dnsutils:latest',
  'kubectl exec dnsutils -- nslookup kubernetes.default.svc.cluster.local',
  '# Stub domain',
  'kubectl edit configmap coredns -n kube-system',
  '# External DNS (Route53)',
  'kubectl annotate ingress my-ingress "external-dns.alpha.kubernetes.io/hostname=app.example.com"',
];

export default {
  id: 'dns',
  label: 'DNS Resolution',
  icon: '🌐',
  build: buildDnsSteps,
  code: K8S_CODE_DNS,
  language: 'YAML/Shell',
  metrics: [
    { key: 'pods', label: 'Pods', max: 10, color: 'var(--pod-running)' },
    { key: 'cpu', label: 'CPU avg', max: 100, unit: '%', color: 'var(--node-comparing)' },
    { key: 'restarts', label: 'Restarts', max: 10, color: 'var(--pod-crash)' },
  ],
  topicContent: {
    concept: [
      { title: 'Cluster DNS Architecture', content: 'CoreDNS runs as a deployment in kube-system, serving as the cluster DNS. Each pod\'s /etc/resolv.conf points to the CoreDNS Service IP (typically 10.96.0.10).' },
      { title: 'DNS Resolution Flow', content: 'Pods resolve service names via FQDN (my-svc.namespace.svc.cluster.local) or short names. ndots:5 controls when search domains are appended before external DNS fallback.' },
      { title: 'Custom DNS Configuration', content: 'CoreDNS behavior is configured via a Corefile ConfigMap. Stub domains, forwarders, and caching policies are all customizable without redeploying CoreDNS.' },
    ],
    why: ['DNS is the backbone of service discovery in Kubernetes — broken DNS means broken inter-service communication. Misconfigured ndots or CoreDNS resource limits are a top cause of cluster instability.'],
    interview: [
      { question: 'How does DNS resolution work for a pod trying to reach another service?', answer: 'The pod\'s /etc/resolv.conf has nameserver set to CoreDNS ClusterIP, a search path of <namespace>.svc.cluster.local svc.cluster.local cluster.local, and ndots:5. Queries with fewer than 5 dots check search domains first; with 5+ dots the query is tried as-is first.', followUps: ['What is ndots and how does it affect DNS queries?', 'How can you optimize DNS for high-traffic clusters?'] },
      { question: 'What happens when CoreDNS goes down?', answer: 'Existing connections continue, but new service discovery fails. All pod-to-service DNS lookups time out. NodeLocal DNSCache can mitigate this by caching DNS records locally on each node.', followUps: ['How do you monitor CoreDNS health?', 'What is NodeLocal DNSCache and how does it work?'] },
    ],
    gotcha: ['CoreDNS pods may be evicted under memory pressure — always set resource limits and requests. A single CoreDNS replica can become a bottleneck under high query volume.', 'Changing the Corefile ConfigMap triggers a CoreDNS reload only if the ConfigMap is mounted as a volume; simply editing it via kubectl does NOT auto-reload CoreDNS without a sidecar or manual restart.'],
    tradeoffs: [
      { pro: 'Automatic service discovery without hardcoded IPs', con: 'DNS caching can lead to stale records during rapid rollouts' },
      { pro: 'Highly configurable via Corefile plugins', con: 'Complex DNS configurations increase debugging difficulty when resolution fails' },
    ],
  },
};

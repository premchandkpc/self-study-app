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
      { title: 'What is Kubernetes DNS in simple terms?', content: 'Kubernetes DNS is like a phonebook for your cluster — when one pod wants to talk to another service, it looks up the name instead of guessing an IP address. CoreDNS, the built-in DNS server, automatically knows every Service\'s name and IP by watching the Kubernetes API. Every pod is configured to use CoreDNS for name resolution, making service discovery seamless and dynamic.' },
      { title: 'How DNS resolution works — core mechanics', content: 'When a pod queries a service name like my-svc, the request goes to CoreDNS which checks its in-memory zone database populated from the Kubernetes API. The query goes through the ndots:5 rule — names with fewer than 5 dots get search domains appended (<namespace>.svc.cluster.local, svc.cluster.local, cluster.local) before external fallback. CoreDNS returns the ClusterIP which kube-proxy translates to healthy pod IPs via iptables rules.' },
      { title: 'Deep — CoreDNS plugin chain & internals', content: 'CoreDNS processes every query through a plugin chain defined in the Corefile. The kubernetes plugin implements the Kubernetes DNS spec by watching Services and EndpointSlice resources to serve A, AAAA, and SRV records from memory. The forward plugin handles external resolution, cache plugin reduces upstream load, and prometheus exports metrics. Plugin ordering is critical — placing forward before kubernetes silently leaks cluster queries upstream.' },
      { title: 'NodeLocal DNSCache & stub domains', content: 'NodeLocal DNSCache runs as a DaemonSet, caching cluster DNS responses locally on each node using a static link-local IP (169.254.20.10). It reduces CoreDNS query volume by 50-70% and avoids conntrack issues with UDP DNS traffic. Stub domains configure CoreDNS to forward specific zones (e.g., db.internal) to custom nameservers, essential for hybrid cloud setups with private DNS.' },
    ],
    why: [
      'DNS is the backbone of service discovery — broken DNS means broken inter-service communication. Misconfigured ndots or CoreDNS CPU limits are among the top causes of cluster instability. A brief DNS outage cascades to every pod-to-service communication in the cluster, making DNS reliability a non-negotiable production concern for any Kubernetes SRE.',
      'Egress DNS filtering and stub domains are critical for hybrid cloud deployments where databases or legacy services live outside Kubernetes. Without proper stub domain configuration in the Corefile, queries for internal zones leak to upstream resolvers and fail with NXDOMAIN, causing hard-to-diagnose connectivity failures that look like network issues.',
      'DNS performance directly impacts application latency — every service call requires at least one DNS lookup unless cached. Under high query volume (1000+ QPS per node), CoreDNS CPU and memory spike dramatically. Engineers must understand ndots tuning, cache sizing, and NodeLocal DNSCache to prevent DNS from becoming a bottleneck during traffic spikes.',
    ],
    interview: [
      { question: 'Explain the full DNS resolution flow when pod A queries pod B\'s service name.', answer: 'Pod A\'s application calls my-svc. The glibc resolver in the pod checks /etc/resolv.conf which points nameserver to CoreDNS ClusterIP (10.96.0.10) with search domains <namespace>.svc.cluster.local, svc.cluster.local, cluster.local and ndots:5. Since my-svc has fewer than 5 dots, the resolver appends search domains: my-svc.default.svc.cluster.local is tried first. CoreDNS\'s kubernetes plugin matches this against its in-memory zone db and returns the ClusterIP (10.96.0.1). kube-proxy DNATs the ClusterIP to a healthy backend pod IP via iptables random selection.', followUps: ['How does the search domain order affect resolution latency?', 'What happens if the query has exactly 5 or more dots?'] },
      { question: 'What are the different DNS policies available for pods and when would you use each?', answer: 'Default — inherits the node\'s DNS resolution but appends cluster search domains. ClusterFirstWithHostNet — uses cluster DNS even with hostNetwork:true, needed for network plugins or monitoring agents. None — requires a complete dnsConfig spec, giving full control over nameservers and search domains. ClusterFirst (default) is correct for most workloads. Default is useful for hostNetwork pods that should bypass cluster DNS. None is used for advanced scenarios like custom DNS resolvers or multi-cluster service discovery.', followUps: ['What happens with dnsPolicy: None if you omit required fields?', 'How does the node\'s /etc/resolv.conf affect pod DNS?'] },
      { question: 'How does CoreDNS handle a Service with no ready endpoints?', answer: 'CoreDNS returns NXDOMAIN for queries to a Service that has no ready endpoints because the kubernetes plugin checks endpoint readiness. This is controlled by the kubernetes plugin\'s endpoint_pod_names option. If all pods backing a Service are unhealthy or terminating, DNS returns NXDOMAIN even though the Service object exists. This is important for blue/green deployments where old pods drain — DNS stops resolving to terminating pods before kube-proxy removes the iptables rules, preventing traffic to shutting-down containers during the graceful termination window.', followUps: ['How does headless Service DNS resolution differ from ClusterIP?', 'What are SRV records used for in Kubernetes DNS?'] },
    ],
    gotcha: [
      'CoreDNS pods can be evicted under node memory pressure since they run as a Deployment, not a DaemonSet with guaranteed QoS. Always set resource requests/limits on CoreDNS — without them, a single replica can become a bottleneck under high query volume and get OOMKilled during traffic spikes.',
      'Editing the Corefile ConfigMap does NOT auto-reload CoreDNS unless the ConfigMap is mounted as a volume in the pod. Simply running kubectl edit configmap coredns -n kube-system changes etcd but CoreDNS continues using the old config. You need a reloader sidecar or kubectl rollout restart -n kube-system deployment/coredns to pick up changes.',
      'kubectl exec and kubectl run debugging sessions use the node\'s /etc/resolv.conf, not the pod\'s DNS policy. DNS lookups from an interactive shell behave differently than the actual application. Always exec into the actual running container and check its /etc/resolv.conf rather than debugging DNS from a separate debug pod.',
      'Setting dnsPolicy: None without a complete dnsConfig spec causes the pod to fail creation with a validation error — you must provide nameserver, searches, and options fields explicitly. A common mistake is providing only a custom nameserver without the cluster search domains, which breaks all internal service discovery for that pod.',
    ],
    tradeoffs: [
      { pro: 'Automatic service discovery eliminates hardcoded IPs and enables seamless pod rescheduling. When a pod restarts on a different node or gets a new IP, DNS resolves to the new address without any client configuration changes. This is fundamental to Kubernetes\' dynamic scheduling model.', con: 'DNS caching trades freshness for performance. CoreDNS\'s default 30s cache TTL means DNS can serve stale IPs during rapid rollouts or blue/green deployments, causing temporary routing to old pods. Setting TTL too low increases CoreDNS load; setting it too high delays traffic cutover during deployments.' },
      { pro: 'The Corefile plugin architecture makes CoreDNS highly extensible — operators add custom plugins for weighted load balancing, query filtering, Prometheus metrics export, or rate limiting without forking or rebuilding CoreDNS. The prometheus plugin is essential for monitoring DNS performance.', con: 'Complex Corefile configurations are notoriously hard to debug. A single misordered plugin (e.g., forward before kubernetes) silently breaks cluster DNS by routing all queries upstream. There is no built-in Corefile validator, and CoreDNS error messages during reload are cryptic — often just failing to start without indicating which plugin chain is wrong.' },
      { pro: 'NodeLocal DNSCache reduces CoreDNS query volume by ~50-70% by caching DNS responses locally on each node via a DaemonSet. It avoids UDP conntrack race conditions with high connection counts and improves DNS resolution latency from ~5ms to sub-millisecond for cached entries.', con: 'NodeLocal DNSCache adds significant operational complexity — it binds a static link-local IP (169.254.20.10) on each node that may conflict with existing networking. Misconfiguration of the node-local-dns ConfigMap can cause complete DNS resolution failure across the entire node, affecting all pods. It also doubles the memory footprint for DNS caching.' },
    ],
  },
};

import { makeNode } from '@/core/utils/scenarioShared';

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

export const K8S_CODE_SERVICES = [
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
];

export default {
  id: 'services',
  label: 'Services',
  icon: '🔗',
  build: buildServicesSteps,
  code: K8S_CODE_SERVICES,
  language: 'YAML/Shell',
  metrics: [
    { key: 'pods',     label: 'Pods',     max: 8, color: 'var(--pod-running)' },
    { key: 'cpu',      label: 'CPU avg',  max: 100, unit: '%', color: 'var(--node-comparing)' },
    { key: 'services', label: 'Services', max: 5, color: 'var(--node-default)' },
  ],
  topicContent: {
    concept: [
      { title: 'What are Kubernetes Services in simple terms?', content: 'A Kubernetes Service provides a stable network endpoint for a set of pods that come and go. Since pod IPs change on every restart, scale-up, or reschedule, you cannot hardcode pod IPs. A Service assigns a virtual IP (ClusterIP) or DNS name that stays constant, and kube-proxy routes traffic from that stable address to currently healthy pods matching the Service label selector.' },
      { title: 'How Services work — core mechanics', content: 'Each Service has a label selector that matches a set of pods. The EndpointSlice controller watches pods matching the selector and maintains a list of healthy pod IPs. kube-proxy runs on every node and programs network rules (iptables, IPVS, or eBPF) to DNAT the Service ClusterIP to one of the backing pod IPs. Traffic is distributed across pods using random selection (iptables) or weighted round-robin (IPVS).' },
      { title: 'Deep — Service types & kube-proxy modes', content: 'ClusterIP (default): virtual IP reachable only within the cluster. NodePort: ClusterIP + a high port (30000-32767) on every node IP for external access. LoadBalancer: NodePort + cloud load balancer provisioning (AWS NLB, GCE GLB). ExternalName: DNS CNAME alias — returns a DNS name instead of proxying traffic. kube-proxy modes: iptables (default, kernel NAT, O(1) per rule, scales to ~5000 Services), IPVS (kernel-level load balancer, weighted routing, handles 10000+ Services), and userspace (deprecated).' },
      { title: 'EndpointSlice & health-based routing', content: 'The EndpointSlice controller watches pod readiness and lifecycle events. When a pod fails its readiness probe or is terminated, the controller removes its IP from all EndpointSlice entries within seconds. kube-proxy watches EndpointSlice changes and updates the kernel NAT tables accordingly. This ensures traffic is never forwarded to unhealthy pods. The EndpointSlice API splits endpoints into smaller slices (max 100 per slice) for better scalability.' },
    ],
    why: [
      'Services are the fundamental networking abstraction in Kubernetes — without them, inter-service communication breaks on every pod restart, scale-up, or reschedule because pod IPs are ephemeral. A Service guarantees a stable IP and DNS name that survives the complete churn of underlying pods.',
      'Understanding the three Service types (ClusterIP, NodePort, LoadBalancer) is essential for designing secure and cost-effective network architectures. Each type serves a different purpose: ClusterIP for internal microservice communication, NodePort for dev access without cloud LB costs, and LoadBalancer for production external traffic with automatic cloud LB provisioning.',
      'The kube-proxy mode choice (iptables vs IPVS) has significant performance implications at scale. In clusters with 5000+ Services, iptables rule chains become slow to update (linear traversal per packet). IPVS uses hash tables for O(1) lookup, making it the recommended mode for large clusters. eBPF-based solutions (Cilium) offer even better performance by bypassing iptables entirely.',
    ],
    interview: [
      { question: 'Explain exactly how ClusterIP works under the hood — from pod creation to packet delivery.', answer: 'When a Service is created, the API server assigns a ClusterIP from the Service CIDR range (default 10.96.0.0/12). The EndpointSlice controller watches for pods matching the Service label selector and writes their ready IPs into EndpointSlice objects. kube-proxy watches both Services and EndpointSlices — for each Service, it installs iptables rules: a PREROUTING rule to intercept packets destined for the ClusterIP, and DNAT rules to rewrite the destination IP to one of the backing pod IPs. The DNAT is random (iptables stateless) or weighted (IPVS). When a pod behind the Service crashes, the EndpointSlice controller detects the readiness probe failure within seconds, removes the pod IP from the EndpointSlice, and kube-proxy updates the iptables rules to stop sending traffic to the failed pod. Existing connections to the failed pod are terminated — there is no connection draining in native kube-proxy (service mesh handles this).', followUps: ['How does kube-proxy handle traffic in iptables vs IPVS mode at scale?', 'What happens to an in-flight TCP connection when the backend pod is terminated?'] },
      { question: 'How do you achieve session stickiness (sticky sessions) with Kubernetes Services?', answer: 'Sticky sessions are configured via service.spec.sessionAffinity: ClientIP with sessionAffinityConfig.clientIP.timeoutSeconds (default 10800 = 3 hours). When enabled, kube-proxy hashes the client IP and routes all requests from the same client to the same pod. However, this has significant limitations: 1) If the target pod restarts or scales down, the sticky session breaks and the client is re-routed to a different pod. 2) The affinity is per-client-IP, so all requests from behind a NAT gateway land on the same pod, causing uneven load distribution. 3) externalTrafficPolicy: Local preserves the real client IP (rather than the node IP) for proper affinity, but traffic may be unevenly distributed if pods are not on every node. For proper session persistence across pod restarts, use an external session store (Redis) or a service mesh with cookie-based affinity rather than relying on kube-proxy ClientIP affinity.', followUps: ['What is the difference between externalTrafficPolicy: Cluster and externalTrafficPolicy: Local?', 'How do you preserve the real client IP address with a LoadBalancer Service?'] },
      { question: 'How do you handle gRPC load balancing with Kubernetes Services, and why is ClusterIP problematic?', answer: 'Standard ClusterIP Services use kube-proxy connection-level load balancing — each TCP connection is routed to a single backend pod. gRPC typically uses long-lived HTTP/2 connections that multiplex many RPCs over a single TCP connection. With default Service routing, all gRPC calls on one connection go to the same pod, defeating load balancing. Solutions include: 1) Headless Service with DNS-based round-robin and client-side load balancing (gRPC-lb policy, looked up via DNS and connecting to each pod IP individually). 2) Service mesh (Istio, Linkerd) that provides L7 load balancing by understanding HTTP/2 and gRPC, splitting requests across pods at the RPC level rather than the connection level. 3) A dedicated L7 proxy (Envoy, NGINX) as an intermediary that terminates gRPC connections and proxies each RPC to different backends. Option 1 is simplest for gRPC-aware clients; option 2 is best for polyglot environments with multiple protocols.', followUps: ['How does a headless Service differ from a ClusterIP Service in DNS resolution?', 'What is the difference between gRPC load balancing with a service mesh vs client-side load balancing?'] },
    ],
    gotcha: [
      'NodePort ports must be in the 30000-32767 range by default — many users set nodePort: 8080 and wonder why the Service is unreachable. The kube-apiserver --service-node-port-range flag can extend the range, but it must match the cloud firewall rules and security group configurations.',
      'externalTrafficPolicy: Local preserves the real client IP by not SNAT-ing traffic, but it causes uneven load distribution — only nodes running the target pod receive traffic. If you have 3 pods on 2 out of 10 nodes, only those 2 nodes get traffic through the load balancer. Use externalTrafficPolicy: Cluster (default) for even distribution but lose client IP (all traffic appears to come from node IPs).',
      'Creating a Service without a matching selector creates an orphan Service with no endpoints. This is sometimes intentional (for manually managed endpoints), but more often it is a typo in the label selector causing the Service to route nowhere. Always verify selector labels match pod labels after creating a Service.',
      'kube-proxy iptables mode uses random forwarding — not round-robin. In IPVS mode, you can configure scheduling algorithms: rr (round-robin), lc (least connection), dh (destination hashing), sh (source hashing), and sed (shortest expected delay). The default IPVS scheduler is rr if not specified.',
    ],
    tradeoffs: [
      { pro: 'Stable virtual IP decouples clients from ephemeral pod IPs — pods can be destroyed, rescheduled, and scaled without clients ever needing to update their connection configuration. Service DNS names work across namespaces (<service>.<namespace>.svc.cluster.local) enabling cross-namespace service discovery without hardcoded addresses.', con: 'Each Service adds iptables rules on every node — in clusters with 5000+ Services, the iptables rule chain update becomes a performance bottleneck (O(n) traversal per packet). IPVS mode solves this with O(1) hash table lookups but requires the ip_vs kernel module and additional configuration.' },
      { pro: 'Multiple Service types support diverse access patterns: ClusterIP for internal microservice communication, NodePort for dev/staging external access without cloud LB costs, LoadBalancer for production traffic with automatic cloud LB provisioning, and ExternalName for integrating external legacy services via DNS aliases.', con: 'ClusterIP Services cannot handle L7-aware load balancing for protocols like gRPC that multiplex many requests over a single connection. Without a service mesh or headless Service with client-side LB, gRPC traffic is routed to a single backend per connection, defeating load balancing. Native Services operate at L4 only.' },
      { pro: 'The EndpointSlice controller automatically removes unhealthy pods from Service endpoints within seconds of readiness probe failure. This health-based routing ensures production Services never direct traffic to crashing or unresponsive pods, providing basic circuit-breaking behavior without additional configuration.', con: 'There is no connection draining in native kube-proxy — when a pod is terminated, existing TCP connections to that pod are immediately broken. For graceful shutdown, the pod must handle SIGTERM correctly and the application should drain connections within the terminationGracePeriodSeconds. This requires application-level awareness and is not handled by the Service abstraction itself.' },
    ],
  },
};

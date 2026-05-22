import { snap, makePod, makeNode } from '@/core/utils/scenarioShared';

function buildIngressSteps() {
  const steps = []; const s = {
    nodes: [makeNode('node-1', 30, 50), makeNode('node-2', 20, 30)],
    pods: [makePod('api-v1-abc', 'node-1', 'running'), makePod('web-v1-def', 'node-2', 'running')],
    events: [], metrics: { pods: 2, nodes: 2, cpu: 15, restarts: 0 },
    ingressRules: [
      { host: 'app.example.com', path: '/api/*', svc: 'api-svc', port: 80, tls: false, backend: 'api-v1-abc', active: false },
      { host: 'app.example.com', path: '/web/*', svc: 'web-svc', port: 80, tls: false, backend: 'web-v1-def', active: false },
    ],
  };

  snap(steps, s, 'Cluster with 2 services: api-svc (backend) and web-svc (frontend). No Ingress yet.', 1);

  s.events.push({ type: 'info', msg: 'kubectl apply -f ingress.yaml' });
  snap(steps, s, 'Ingress resource created. nginx-ingress-controller watches Ingress API.', 2);

  s.events.push({ type: 'ok', msg: 'Ingress Controller: reconciled rules → nginx.conf reloaded' });
  snap(steps, s, 'Ingress Controller detects new Ingress. Generates nginx config, reloads. LB provisions (cloud: ALB/GLB).', 3);

  s.events.push({ type: 'info', msg: '🌐 Client → app.example.com/api/users → Ingress → /api/* → api-svc:80 → api-v1-abc' });
  s.ingressRules[0].active = true;
  snap(steps, s, 'Client request to app.example.com/api/users. Host header = app.example.com → Ingress matches. Path /api/users matches /api/* → route to api-svc:80 → api-v1-abc.', 4);

  s.ingressRules[0].active = false; s.ingressRules[1].active = true;
  s.events.push({ type: 'info', msg: '🌐 Client → app.example.com/web/home → Ingress → /web/* → web-svc:80 → web-v1-def' });
  snap(steps, s, 'Path-based routing: /api/* → api-svc, /web/* → web-svc. Ingress Controller updates nginx location blocks. NO new Service needed for routing.', 5);

  s.events.push({ type: 'ok', msg: '🔒 TLS: cert-manager issued Let\'s Encrypt cert. Ingress spec.tls[].hosts=app.example.com' });
  snap(steps, s, 'TLS termination: Ingress spec.tls[].secretName: app-tls. cert-manager provisions cert. ClusterIssuer: letsencrypt-prod. Ingress terminates TLS, backend gets plain HTTP.', 6);

  s.ingressRules[0].active = false; s.ingressRules[1].active = false;
  s.events.push({ type: 'info', msg: '📊 Annotations: ingress.kubernetes.io/rewrite-target, rate-limiting, whitelist' });
  snap(steps, s, 'Ingress annotations: rewrite-target (/api/v1 → /v1), rate-limit (10rps), whitelist (office IP), cors, auth-url (OAuth proxy). Ingress v1: spec.ingressClassName=nginx.', 7);

  s.result = 'Ingress: external → path-based → Service → Pods. TLS termination at LB. No NodePort needed.';
  snap(steps, s, 'Ingress benefits: single public IP for multiple services, path-based routing, TLS termination, annotations for advanced traffic management. Alternatives: HAProxy, Traefik, Istio Gateway, AWS ALB Ingress Controller.', 8);
  return steps;
}

export const K8S_CODE_INGRESS = [
  'apiVersion: networking.k8s.io/v1',
  'kind: Ingress',
  'metadata:',
  '  annotations:',
  '    nginx.ingress.kubernetes.io/rewrite-target: /$2',
  'spec:',
  '  ingressClassName: nginx',
  '  tls:',
  '  - hosts: [app.example.com]',
  '    secretName: app-tls',
  '  rules:',
  '  - host: app.example.com',
  '    http:',
  '      paths:',
  '      - path: /api(/|$)(.*)',
  '        pathType: Prefix',
  '        backend:',
  '          service:',
  '            name: api-svc',
  '            port: 80',
];

export default {
  id: 'ingress', label: 'Ingress', icon: '🌐',
  build: buildIngressSteps, code: K8S_CODE_INGRESS, language: 'YAML',
  metrics: [
    { key: 'pods', label: 'Pods', max: 8, color: 'var(--pod-running)' },
    { key: 'cpu', label: 'CPU avg', max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
  ],
  topicContent: {
    concept: [
      { title: 'What is an Ingress in simple terms?', content: 'An Ingress is like a smart traffic cop for your cluster — it directs external HTTP/HTTPS traffic to the right internal services based on the URL path and hostname. Instead of creating an expensive cloud load balancer for every service, a single Ingress handles routing, TLS termination, and can apply traffic policies like rate limiting, authentication, and CORS headers.' },
      { title: 'How Ingress works — core mechanics', content: 'An Ingress resource is a declaration of routing rules (host + path → service:port). The Ingress Controller (nginx-ingress, AWS ALB Ingress Controller, Traefik, or Istio Gateway) is a pod that watches for Ingress resources via the Kubernetes API. When a new Ingress is created, the controller updates its reverse proxy configuration (e.g., nginx.conf) and reloads without downtime. The cloud load balancer (if applicable) points to the Ingress Controller pods, which terminate TLS and route to backend Services.' },
      { title: 'Deep — Ingress controllers & annotations', content: 'Ingress Controllers are not built into Kubernetes — you must install one (nginx-ingress is the most popular). The Ingress resource spec defines host, path (Exact, Prefix, or ImplementationSpecific), and backend service. Annotations provide controller-specific features: rewrite-target (path rewriting), rate-limiting (10rps per IP), cors, auth-url (OAuth proxy), whitelist-source-range, and upstream-timeout. Since Kubernetes 1.19, spec.ingressClassName replaces the deprecated kubernetes.io/ingress.class annotation.' },
      { title: 'TLS termination & cert-manager', content: 'Ingress TLS termination happens at the controller level — the Ingress resource references a Secret containing the TLS certificate and key, and the controller terminates HTTPS before forwarding plain HTTP to backend Services. cert-manager automates certificate lifecycle: it watches Ingress spec.tls[], requests certificates via ACME (Let\'s Encrypt) using HTTP-01 or DNS-01 challenges, stores them as Secrets, and auto-renews before expiry (typically 30 days).' },
    ],
    why: [
      'Ingress provides a single public entry point for all services, reducing cloud load balancer costs from one LB per service to one LB per Ingress controller. In a cluster with 20 services, this saves 19 cloud LBs — a significant cost reduction in any cloud provider. Combined with NodePort elimination, it also reduces the node port range exhaustion risk.',
      'TLS certificate management with cert-manager automates what was previously a manual, error-prone process. Auto-renewal, wildcard certificates via DNS-01 challenges, and integration with ClusterIssuers make HTTPS the default rather than an afterthought. Without automation, certificates expire regularly and cause production outages during the renewal window.',
      'Ingress annotations enable sophisticated Layer 7 traffic management — rate limiting protects backends from abuse, OAuth authentication gates access, request rewriting supports API versioning, and CORS headers enable cross-origin web apps. These capabilities would otherwise require a dedicated reverse proxy deployment or code-level changes in every service.',
    ],
    interview: [
      { question: 'Explain path-based routing with Ingress, including the different pathTypes and how rewrite-target annotation works.', answer: 'The Ingress spec defines rules mapping hostnames and paths to backend Services. Three pathTypes: Exact matches the path exactly (/api matches only /api), Prefix matches by prefix segments (/api matches /api, /api/v1, /api/v2 but NOT /api-extra), and ImplementationSpecific delegates matching to the controller. The nginx-ingress rewrite-target annotation rewrites the URL path before forwarding to the backend — e.g., rewrite-target: /$2 with path /api(/|$)(.*) captures the part after /api/ and forwards it as the root path. Without rewrite-target, a request to /api/users is forwarded as /api/users to the backend, which may 404 if the backend expects /users. The Gateway API (replacement for Ingress in future Kubernetes) uses HTTPRoute resources with more explicit filter and rewrite rules, addressing Ingress\'s limitation of relying on controller-specific annotations for basic functionality.', followUps: ['What is the difference between Ingress v1 and the Gateway API?', 'How do you handle path-based routing across multiple namespaces?'] },
      { question: 'How does cert-manager automate TLS certificate provisioning with Let\'s Encrypt?', answer: 'cert-manager uses CRDs: ClusterIssuer (cluster-wide certificate authority configuration), Issuer (namespace-scoped), and Certificate (request for a certificate). When an Ingress with spec.tls is created, cert-manager\'s ingress-shim component automatically creates a Certificate resource. The Certificate controller uses the ClusterIssuer (e.g., letsencrypt-prod with HTTP-01 solver) to request a certificate via ACME protocol. For HTTP-01, cert-manager modifies the Ingress to add a challenge path, the ACME server validates by making a request to the domain, and cert-manager stores the issued certificate in the specified Secret. DNS-01 challenges use a DNS provider\'s API to add a TXT record for validation — this supports wildcard certificates (*.example.com) but requires cloud provider credentials (Route53, CloudDNS, Azure DNS). cert-manager auto-renews certificates when they are 30 days from expiry (configurable via renewBefore).', followUps: ['What happens to traffic when a Let\'s Encrypt certificate fails to renew?', 'How do you monitor cert-manager\'s certificate expiry status?'] },
      { question: 'How does the Ingress Controller handle sticky sessions and canary deployments?', answer: 'Sticky sessions (session affinity) are handled via controller-specific annotations. For nginx-ingress: nginx.ingress.kubernetes.io/affinity: cookie with affinity-mode: persistent and session-cookie-name: INGRESSCOOKIE. This sets a cookie on the client\'s first request that pinpoints the upstream pod — subsequent requests with the cookie go to the same backend pod. For canary deployments, nginx-ingress supports nginx.ingress.kubernetes.io/canary: true with canary-weight: 10 (10% traffic) or canary-by-header: X-Canary (header-based routing). The canary annotation routes a percentage of traffic to the canary Service while the main Ingress continues routing to the stable Service. This enables gradual traffic shifting without duplicating Ingress resource definitions. Note that Gateway API\'s HTTPRoute provides native traffic splitting via spec.rules[].backendRefs[].weight, which is cleaner than annotation-based canary configuration.', followUps: ['How does the Ingress Controller maintain session affinity when pods scale up or down?', 'What are the limitations of annotation-based canary deployments compared to service mesh traffic shifting?'] },
    ],
    gotcha: [
      'Ingress Controllers are NOT installed by default — many users create Ingress resources and spend hours debugging why nothing works, only to discover they never deployed an Ingress Controller. Most managed Kubernetes (EKS, AKS, GKE) require manual installation of the controller. Always verify the controller is running (kubectl get pods -n ingress-nginx) before creating Ingress resources.',
      'Path rewriting with nginx-ingress is a common source of 404 errors. The path /api/users forwarded without rewrite-target becomes /api/users on the backend, but if the backend expects /users, all requests 404. The rewrite-target annotation with regex capture groups is controller-specific and error-prone — incorrect regex silently drops or misroutes traffic. Always test path rewriting with a debug backend that logs the full request URL before deploying to production.',
      'Ingress Controllers on cloud providers (AWS ALB, GCE Ingress) provision actual cloud load balancers that have associated costs — even if no traffic is flowing. Creating 10 Ingress resources with an ALB controller creates 10 ALBs, costing hundreds of dollars per month. The nginx-ingress controller uses a single cloud LB for all Ingress resources, making it far more cost-effective for multi-service clusters.',
      'TLS certificate renewal failures are silent — cert-manager retries but does not notify. If the DNS challenge fails because the DNS provider access key expired, or the HTTP-01 challenge fails because port 80 is not reachable, the certificate expires silently. Monitor Certificate resources for Ready=False status and set up alerts (kube-prometheus-stack includes cert-manager metrics) to detect expiring certificates before they cause production outages.',
    ],
    tradeoffs: [
      { pro: 'Single public endpoint for all services dramatically reduces cloud LB costs — one ALB/NLB for the nginx-ingress controller instead of one per Service. Combined with cert-manager for automated TLS, Ingress provides enterprise-grade HTTP routing with minimal cloud infrastructure overhead.', con: 'Layer 7 routing adds latency compared to direct L4 Service LoadBalancer — each request passes through the Ingress Controller pod, which terminates TLS, parses headers, applies rate limits, and proxies to the backend. For latency-critical workloads (<5ms), this overhead may be significant. TLS termination CPU usage on the Ingress Controller can also become a bottleneck at high throughput.' },
      { pro: 'Rich annotation ecosystem enables rate limiting, OAuth authentication, request rewriting, CORS, whitelisting, and circuit breaking — all configured via annotations on the Ingress resource. These features eliminate the need for a separate reverse proxy or API gateway deployment.', con: 'Annotations are entirely controller-specific — migrating from nginx-ingress to Traefik or ALB Ingress Controller requires rewriting every annotation. There is no Ingress annotation standard. This vendor lock-in makes Ingress controller migration a significant undertaking, especially in clusters with hundreds of Ingress resources using dozens of different annotations.' },
      { pro: 'cert-manager integration automates TLS certificate lifecycle — issuance, renewal, and Secret management. Combined with ClusterIssuer and DNS-01 challenges, wildcard certificates for all subdomains are fully automated with no manual renewal steps. This makes HTTPS the default in clusters with cert-manager.', con: 'HTTP-01 challenges require external network access to the challenge endpoint on port 80, which fails behind internal-only load balancers or in air-gapped environments. DNS-01 challenges require cloud provider DNS API credentials with zone-write permissions — a security concern if the Ingress controller is compromised. Both challenge types add complexity to the initial certificate issuance that can fail in non-standard network configurations.' },
    ],
  },
};

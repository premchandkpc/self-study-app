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
      { title: 'Ingress vs Service', content: 'Ingress operates at Layer 7 (HTTP/HTTPS), providing path- and host-based routing, TLS termination, and name-based virtual hosting. Services operate at Layer 4 (TCP/UDP) and are the underlying routing target for Ingress.' },
      { title: 'Ingress Controller', content: 'The Ingress resource is just a declaration; the Ingress Controller (nginx, ALB, Traefik, HAProxy, Istio) watches for Ingress resources and configures the actual reverse proxy or load balancer.' },
      { title: 'TLS Termination', content: 'Ingress terminates TLS at the edge, forwarding plain HTTP to backend Services. Certificates are stored in Secrets. cert-manager can automate certificate provisioning via Let\'s Encrypt.' },
    ],
    why: ['Ingress provides a single entry point for multiple services with minimal cloud costs (one LB vs one per Service), simplifies certificate management, and enables advanced traffic control through annotations.'],
    interview: [
      { question: 'How does path-based routing work in Ingress?', answer: 'The Ingress resource defines rules mapping hostnames and paths to backend Services. The Ingress Controller translates these into reverse proxy config (e.g., nginx.conf location blocks). Path matching supports Exact, Prefix, and ImplementationSpecific pathTypes.', followUps: ['What is the difference between an Ingress and a Gateway API?', 'How do you handle path rewriting with Ingress?'] },
      { question: 'How does cert-manager integrate with Ingress for TLS?', answer: 'cert-manager watches Ingress resources for spec.tls[]. It uses the configured ClusterIssuer (e.g., letsencrypt-prod) to request certificates via ACME protocol, stores them as Secrets, and auto-renews before expiry. The Ingress Controller uses the Secret as the TLS certificate.', followUps: ['What happens when a certificate expires?', 'How do you handle wildcard certificates with cert-manager?'] },
    ],
    gotcha: ['Ingress controllers are not automatically deployed — most clusters need manual installation. Many users create Ingress resources but wonder why nothing works: the controller is missing.', 'Path rewriting caveat: /api/users to /users requires rewrite-target annotation. Without it, the full original path is forwarded to the backend, causing 404 errors.'],
    tradeoffs: [
      { pro: 'Single public endpoint for multiple services reduces cloud load balancer costs', con: 'L7 routing adds latency compared to direct L4 load balancing' },
      { pro: 'Rich annotation ecosystem for rate limiting, auth, and CORS', con: 'Annotations are controller-specific, making migration between controllers time-consuming' },
    ],
  },
};

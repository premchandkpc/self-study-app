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
};

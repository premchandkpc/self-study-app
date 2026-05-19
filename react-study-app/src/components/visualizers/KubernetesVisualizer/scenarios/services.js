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
};

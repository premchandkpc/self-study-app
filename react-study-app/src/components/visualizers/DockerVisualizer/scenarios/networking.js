import { snap } from '@/core/utils/scenarioShared';

function buildNetworkingSteps() {
  const steps = [];

  const makeContainer = (id, ip, port, name) => ({
    id, name, ip, port, state: 'stopped',
  });

  const s = {
    host: { ip: '192.168.1.10', ports: [] },
    bridge: { name: 'docker0', subnet: '172.17.0.0/16', state: 'up' },
    containers: [
      makeContainer('c1', '172.17.0.2', 80,   'web'),
      makeContainer('c2', '172.17.0.3', 5432, 'db'),
      makeContainer('c3', '172.17.0.4', 6379, 'cache'),
    ],
    packet: null,
    events: [],
    metrics: { containers: 0, ports: 0, network: 0 },
    vars: { network: 'bridge', containerIP: '172.17.0.2', hostPort: 8080, containerPort: 80 },
  };

  snap(steps, s, 'Docker bridge network. Each container gets its own virtual network interface.', 1);

  // Start bridge
  s.bridge.state = 'up';
  s.events.push({ msg: 'Bridge docker0 (172.17.0.0/16) active', type: 'ok' });
  s.metrics.network = 1;
  snap(steps, s, 'docker0 bridge interface created on host. Acts as virtual switch for containers.', 2);

  // Start containers one by one
  for (let i = 0; i < s.containers.length; i++) {
    s.containers[i].state = 'running';
    s.metrics.containers = i + 1;
    s.events.push({ msg: `${s.containers[i].name} → ${s.containers[i].ip}:${s.containers[i].port}`, type: 'ok' });
    s.vars = {
      network: 'bridge',
      containerIP: s.containers[i].ip,
      hostPort: 8080 + i,
      containerPort: s.containers[i].port,
    };
    snap(steps, s, `Container '${s.containers[i].name}' assigned IP ${s.containers[i].ip} on bridge network.`, 4);
  }

  // Port mapping
  s.host.ports = [
    { hostPort: 8080, container: 'web',   containerPort: 80 },
    { hostPort: 5433, container: 'db',    containerPort: 5432 },
  ];
  s.metrics.ports = s.host.ports.length;
  s.events.push({ msg: 'Port mapping: host:8080 → web:80', type: 'info' });
  s.events.push({ msg: 'Port mapping: host:5433 → db:5432', type: 'info' });
  s.vars = { network: 'bridge', containerIP: '172.17.0.2', hostPort: 8080, containerPort: 80 };
  snap(steps, s, 'Port mappings: host:8080 → web:80. iptables rules created on host.', 6);

  // Packet flow: external request
  s.packet = { from: 'external', to: 'web', stage: 'host', data: 'HTTP GET /' };
  s.events.push({ msg: 'External request → host:8080', type: 'info' });
  snap(steps, s, 'Request arrives at host:8080. NAT rule routes to container 172.17.0.2:80.', 7);

  s.packet = { from: 'host', to: 'web', stage: 'bridge', data: 'HTTP GET /' };
  snap(steps, s, 'Packet crosses bridge docker0 to container web at 172.17.0.2.', 8);

  s.packet = { from: 'web', to: 'db', stage: 'inter-container', data: 'SQL query' };
  s.events.push({ msg: 'web → db (172.17.0.3:5432)', type: 'info' });
  snap(steps, s, 'Container-to-container: web queries db directly via bridge (172.17.0.3:5432).', 9);

  s.packet = null;
  s.events.push({ msg: 'All containers communicating on bridge', type: 'ok' });
  snap(steps, s, 'Bridge network established. Containers isolated from host but reachable via port mappings.', 11);

  return steps;
}

export const NETWORKING_CODE = [
  '# Create custom bridge network',
  'docker network create my-net',
  '',
  '# Run with port mapping',
  'docker run -d \\',
  '  --name web \\',
  '  --network my-net \\',
  '  -p 8080:80 \\',
  '  nginx:latest',
  '',
  '# Containers reach each other by name',
  'docker run --network my-net \\',
  '  curlimages/curl curl http://web:80',
  '',
  '# Inspect network',
  "docker network inspect my-net",
];

export default {
  id: 'networking',
  label: 'Container Network',
  icon: '🌐',
  build: buildNetworkingSteps,
  code: NETWORKING_CODE,
  language: 'bash',
  metrics: [
    { key: 'containers', label: 'Containers', max: 5, color: 'var(--pod-running)' },
    { key: 'ports',      label: 'Port Maps',  max: 5, color: 'var(--node-active)' },
    { key: 'network',    label: 'Networks',   max: 3, color: 'var(--node-comparing)' },
  ],
  topicContent: {
    concept: [
      { title: 'ELI5 — Kid-friendly analogy', content: 'A bridge network is like a party with name tags. Each container gets its own "name tag" (IP address). They can talk to each other directly by name (DNS). Port mapping is like a front desk — outside guests talk to the front desk (host port), who forwards them to the right room.' },
      { title: 'Core — How it works', content: 'Docker creates a virtual bridge (docker0) on the host. Each container gets a veth pair — one end in the container namespace, the other plugged into the bridge. Traffic is NAT-ted through iptables rules for external access. `-p hostPort:containerPort` creates DNAT rules. Containers on the same user-defined bridge can resolve each other by name via embedded DNS at 127.0.0.11.' },
    ],
    why: ['Use user-defined bridge networks instead of the default docker0 bridge for DNS-based service discovery. With the default bridge, containers can only connect via IP, not name.'],
    interview: [
      { question: 'How does Docker DNS resolution work?', answer: 'Docker embeds a DNS resolver at 127.0.0.11 inside each container. Containers on user-defined networks are registered by container name, so they can reach each other by name. The default bridge does not support this.', followUps: ['What about `--link` (legacy)?', 'How does Swarm/Kubernetes handle DNS?'] },
      { question: 'What is the difference between bridge, host, and overlay network drivers?', answer: 'Bridge: isolated per-host, containers get their own network stack. Host: shares host network stack, no isolation — faster but less secure. Overlay: spans multiple Docker hosts, used by Swarm, encapsulates traffic with VXLAN.', followUps: ['When would you use host networking?', 'How does overlay encryption work?'] },
    ],
    gotcha: ['Publishing a port (`-p`) opens a hole in the host firewall via iptables. Running with `--network host` bypasses Docker iptables management entirely.', 'Removing a network does not clean up existing iptables rules. Manually flush them or restart Docker.'],
    tradeoffs: [
      { pro: 'Bridge isolation prevents containers from seeing host network', con: 'NAT adds slight latency to external traffic' },
      { pro: 'User-defined networks enable automatic DNS resolution', con: 'Each network adds overhead — avoid creating hundreds per host' },
    ],
  },
};

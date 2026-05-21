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
      { title: 'What is Docker networking in simple terms?', content: 'Docker networks connect containers so they can talk to each other and to the outside world. Each container gets a virtual network interface with its own IP address, like each computer in an office gets its own network cable. Port mapping lets external traffic reach specific containers, like a receptionist directing visitors to the right office room.' },
      { title: 'How Docker networking works — core mechanics', content: 'Docker creates a virtual Linux bridge (docker0) on the host. Each container gets a veth pair — one end inside the container namespace, the other plugged into the bridge. Traffic between containers is switched at layer 2 on the bridge. `-p hostPort:containerPort` creates iptables DNAT rules routing external traffic to containers. Containers on the same user-defined bridge resolve each other by name via embedded DNS at 127.0.0.11.' },
      { title: 'Deep — internals & architecture', content: 'Docker networking uses iptables DNAT rules in the PREROUTING chain to translate host ports to container IPs — `-p 8080:80` rewrites destination from host:8080 to container-ip:80. Outbound traffic uses MASQUERADE (SNAT) so container packets egress with the host IP. Veth pairs function as virtual patch cables connecting the container\'s network namespace to the Linux bridge. The bridge uses MAC learning to forward frames only to the correct interface rather than flooding all ports. For multi-host communication, overlay networks encapsulate packets with VXLAN (UDP port 4789), adding a 50-byte header for tunneling across physical hosts.' },
    ],
    why: [
      'Always use user-defined bridge networks instead of the default docker0 bridge — they provide automatic DNS resolution by container name, making service discovery reliable. The default bridge only supports IP-based communication, which breaks when containers are recreated with different IPs.',
      'Expose only the minimum required ports with `-p`. Every published port is an iptables DNAT rule that increases the host attack surface. Backend services like databases and caches should run on internal-only networks without any published ports.',
      'Segment your application into multiple Docker networks: one public-facing network for web servers, one internal network for databases and caches. This limits blast radius — if a web container is compromised, the attacker cannot directly reach the database network.',
    ],
    interview: [
      { q: 'How does embedded DNS resolution work in Docker?', a: 'Docker runs a DNS resolver at 127.0.0.11 inside each container\'s network namespace. When a container on a user-defined network tries to resolve a hostname, the query hits this resolver which checks its internal registry mapping container names to IPs. The default bridge network does not support DNS-based resolution — containers on it can only communicate by IP address. User-defined bridges also support `--alias` for custom DNS names and `--link` for legacy compatibility, though links are deprecated.', followUps: ['What happens to DNS when a container restarts (IP changes)?', 'Can you use custom DNS servers with Docker DNS?', 'How does Docker DNS handle round-robin across multiple containers with the same alias?'] },
      { q: 'What is the difference between bridge, host, and overlay network drivers?', a: 'Bridge mode creates an isolated network namespace with a private IP on a virtual bridge — containers get their own network stack with NAT for external access. Host mode removes network isolation entirely — the container shares the host\'s network stack, providing maximum performance but zero security boundary between container and host traffic. Overlay networks span multiple Docker hosts using VXLAN encapsulation, enabling containers on different physical machines to communicate as if on the same layer 2 network. Overlay is used by Docker Swarm and requires a key-value store (consul, etcd) or Swarm mode for control plane synchronization.', followUps: ['When would you choose host networking over bridge?', 'How does overlay encryption (IPSec) impact performance?', 'Can you mix network drivers in a single docker-compose stack?'] },
      { q: 'How does Docker implement port publishing at the iptables level?', a: 'When you run `-p 8080:80/tcp`, Docker inserts a DNAT rule in the PREROUTING chain of the nat table: all TCP packets destined for host port 8080 have their destination rewritten to the container\'s IP on port 80. Docker also adds a corresponding DNAT rule in the DOCKER chain (a user-defined chain inserted into PREROUTING and FORWARD) for incoming traffic, and a MASQUERADE (SNAT) rule for outbound traffic so packets leaving the container appear with the host IP. This is why containers can initiate outbound connections but the host cannot directly reach containers by IP — the return traffic needs the SNAT mapping to route back correctly.', followUps: ['Does Docker manage iptables rules for UDP ports the same way?', 'What happens to iptables rules when the Docker daemon restarts?', 'How does Docker-proxy (userland proxy) differ from iptables-only forwarding?'] },
    ],
    gotcha: [
      'Publishing a port with `-p` creates iptables DNAT rules that open holes in the host firewall. The `--network host` mode bypasses Docker\'s iptables management entirely, exposing all container ports directly on the host with no protection — use it only when you understand the security implications.',
      'Deleting a Docker network does not clean up stale iptables rules created by port publishing. If you remove and recreate a network with the same port mappings, conflicting DNAT rules can cause routing failures or traffic blackholes until the Docker daemon restarts or you manually flush iptables.',
      'Containers on the default bridge network cannot resolve each other by DNS name — only by IP. This is the most common source of confusing connectivity issues when engineers migrate from docker-compose (which creates a user-defined network automatically) to raw `docker run` commands.',
      'Publishing a privileged port (below 1024) works seamlessly on macOS but requires root on Linux. Docker on Linux uses the docker-proxy process for userland port forwarding, and that process must run as root to bind to privileged ports. Rootless Docker cannot publish privileged ports without additional capability configuration.',
    ],
    tradeoffs: [
      { pro: 'Bridge mode provides network isolation — containers cannot access the host\'s network interfaces or sniff host traffic without explicit port mappings and network namespace access.', con: 'NAT translation adds per-packet processing overhead for external traffic. The iptables DNAT/SNAT rules introduce microsecond-level latency on each packet crossing the bridge boundary.' },
      { pro: 'User-defined bridge networks provide automatic DNS resolution by container name, eliminating the need for hardcoded IPs and making service discovery resilient to container recreation.', con: 'Each Docker network consumes an iptables chain and a virtual bridge interface. Creating hundreds of networks degrades iptables rule-matching performance and increases kernel memory usage for bridge FDB tables.' },
      { pro: 'Overlay networks with VXLAN encapsulation enable multi-host communication without modifying the physical network infrastructure, treating all Docker hosts as a single flat network.', con: 'VXLAN adds ~50 bytes of encapsulation overhead per packet, reducing the effective MTU to 1450 bytes. Encryption (IPSec) further increases CPU usage and packet processing latency for inter-host traffic.' },
    ],
  },
};

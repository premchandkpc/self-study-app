import { snap } from './shared';

function buildLoadBalancerSteps() {
  const steps = [];

  const makeServer = (id, conns = 0, weight = 1) => ({
    id, connections: conns, weight, active: false, requests: 0,
  });

  const s = {
    algorithm: 'round-robin',
    servers: [makeServer('S1'), makeServer('S2'), makeServer('S3')],
    rrIndex: 0,
    requestCount: 0,
    events: [],
    metrics: { requests: 0, distributed: 0, imbalance: 0 },
    vars: { algorithm: 'round-robin', server: 'S1', connections: { S1: 0, S2: 0, S3: 0 }, request: 0 },
    activeServer: null,
    activeRequest: null,
  };

  snap(steps, s, 'Load Balancer distributes traffic across 3 servers. Compare algorithms.', 1);

  // === Round Robin ===
  s.algorithm = 'round-robin';
  s.events.push({ msg: 'Algorithm: Round Robin', type: 'info' });
  snap(steps, s, 'Round Robin: Distribute requests evenly in cyclic order. Simple, no state.', 2);

  const rrTargets = ['S1', 'S2', 'S3', 'S1', 'S2', 'S3'];
  for (const target of rrTargets) {
    s.requestCount++;
    s.metrics.requests++;
    s.rrIndex = (s.rrIndex + 1) % 3;

    s.servers.forEach((srv) => { srv.active = false; });
    const srv = s.servers.find((x) => x.id === target);
    srv.active = true;
    srv.connections++;
    srv.requests++;
    s.metrics.distributed++;
    s.activeServer = target;
    s.activeRequest = s.requestCount;
    s.vars = {
      algorithm: 'round-robin',
      server: target,
      connections: { S1: s.servers[0].connections, S2: s.servers[1].connections, S3: s.servers[2].connections },
      request: s.requestCount,
    };
    s.events.push({ msg: `Req #${s.requestCount} → ${target} (RR)`, type: 'ok' });
    snap(steps, s, `Round Robin: Request #${s.requestCount} → ${target}. Equal distribution.`, 4);
  }

  s.servers.forEach((srv) => { srv.active = false; });
  s.events.push({ msg: 'RR: S1=2, S2=2, S3=2 (perfect balance)', type: 'ok' });
  snap(steps, s, 'Round Robin complete. Perfect balance: 2 requests each. Best for equal-cost requests.', 5);

  // === Least Connections ===
  s.algorithm = 'least-connections';
  s.servers = [makeServer('S1', 3), makeServer('S2', 1), makeServer('S3', 4)];
  s.requestCount = 6;
  s.events.push({ msg: 'Algorithm: Least Connections', type: 'info' });
  s.vars = {
    algorithm: 'least-connections',
    server: 'S2',
    connections: { S1: 3, S2: 1, S3: 4 },
    request: 7,
  };
  snap(steps, s, 'Least Connections: Current connections — S1:3, S2:1, S3:4. Route to S2 (fewest).', 7);

  const lcRequests = [7, 8, 9];
  for (const reqNum of lcRequests) {
    const minSrv = s.servers.reduce((a, b) => a.connections < b.connections ? a : b);
    s.servers.forEach((srv) => { srv.active = false; });
    minSrv.active = true;
    minSrv.connections++;
    minSrv.requests++;
    s.requestCount++;
    s.metrics.requests++;
    s.activeServer = minSrv.id;
    s.activeRequest = reqNum;
    s.vars = {
      algorithm: 'least-connections',
      server: minSrv.id,
      connections: { S1: s.servers[0].connections, S2: s.servers[1].connections, S3: s.servers[2].connections },
      request: reqNum,
    };
    s.events.push({ msg: `Req #${reqNum} → ${minSrv.id} (least: ${minSrv.connections - 1})`, type: 'ok' });
    snap(steps, s, `Least Connections: Req #${reqNum} → ${minSrv.id} (fewest active connections).`, 8);
  }

  s.servers.forEach((srv) => { srv.active = false; });
  snap(steps, s, 'Least Connections adapts to server load. Better for long-lived connections.', 9);

  // === IP Hash ===
  s.algorithm = 'ip-hash';
  s.servers = [makeServer('S1'), makeServer('S2'), makeServer('S3')];
  s.events.push({ msg: 'Algorithm: IP Hash (sticky sessions)', type: 'info' });
  snap(steps, s, 'IP Hash: Route by hash(clientIP). Same client always hits same server.', 11);

  const ipRequests = [
    { ip: '10.0.0.1', server: 'S1' },
    { ip: '10.0.0.2', server: 'S3' },
    { ip: '10.0.0.1', server: 'S1' }, // same IP → same server
    { ip: '10.0.0.3', server: 'S2' },
    { ip: '10.0.0.2', server: 'S3' }, // same IP → same server
  ];

  for (const req of ipRequests) {
    s.requestCount++;
    s.metrics.requests++;
    s.servers.forEach((srv) => { srv.active = false; });
    const srv = s.servers.find((x) => x.id === req.server);
    srv.active = true;
    srv.connections++;
    srv.requests++;
    s.activeServer = req.server;
    s.vars = {
      algorithm: 'ip-hash',
      server: req.server,
      connections: { S1: s.servers[0].connections, S2: s.servers[1].connections, S3: s.servers[2].connections },
      request: s.requestCount,
    };
    s.events.push({ msg: `${req.ip} → ${req.server} (hash sticky)`, type: 'ok' });
    snap(steps, s, `IP Hash: ${req.ip} → ${req.server}. Same IP always routes to same server (session affinity).`, 13);
  }

  s.servers.forEach((srv) => { srv.active = false; });
  s.events.push({ msg: 'IP Hash: session affinity maintained', type: 'ok' });
  snap(steps, s, 'IP Hash complete. Client 10.0.0.1 always hits S1, 10.0.0.2 always hits S3.', 14);

  return steps;
}

export const LB_CODE = [
  '// Nginx Round Robin (default)',
  'upstream backend {',
  '    server s1.example.com;',
  '    server s2.example.com;',
  '    server s3.example.com;',
  '}',
  '',
  '// Least Connections',
  'upstream backend {',
  '    least_conn;',
  '    server s1.example.com;',
  '    server s2.example.com;',
  '}',
  '',
  '// IP Hash (sticky sessions)',
  'upstream backend {',
  '    ip_hash;',
  '    server s1.example.com;',
  '    server s2.example.com;',
  '}',
];

export default {
  id: 'load-balancer',
  label: 'Load Balancer Algorithms',
  icon: '⚖️',
  build: buildLoadBalancerSteps,
  code: LB_CODE,
  language: 'nginx',
  metrics: [
    { key: 'requests',    label: 'Requests',    max: 20, color: 'var(--node-active)' },
    { key: 'distributed', label: 'Distributed', max: 10, color: 'var(--pod-running)' },
    { key: 'imbalance',   label: 'Imbalance',   max: 5,  color: 'var(--node-comparing)' },
  ],
};

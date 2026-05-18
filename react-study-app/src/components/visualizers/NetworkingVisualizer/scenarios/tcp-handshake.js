import { snap } from './shared';

function buildTcpHandshakeSteps() {
  const steps = [];

  const s = {
    client: { state: 'CLOSED', seq: 1000, ack: 0 },
    server: { state: 'LISTEN', seq: 2000, ack: 0 },
    packets: [],
    events: [],
    metrics: { rtt: 0, packets: 0, bytes: 0 },
    vars: { clientSeq: 1000, serverSeq: 2000, state: 'CLOSED', acked: 0 },
    phase: 'idle',
  };

  snap(steps, s, 'TCP 3-Way Handshake. Client wants to connect to server. Server is LISTEN.', 1);

  // SYN
  s.client.state = 'SYN_SENT';
  s.packets = [{ from: 'client', to: 'server', label: 'SYN', seq: 1000, ack: 0, flags: 'SYN', active: true }];
  s.events.push({ msg: 'Client → SYN seq=1000', type: 'info' });
  s.metrics.packets++;
  s.vars = { clientSeq: 1000, serverSeq: 2000, state: 'SYN_SENT', acked: 0 };
  s.phase = 'handshake';
  snap(steps, s, '1. Client sends SYN (seq=1000). Wants to establish connection.', 3);

  // SYN-ACK
  s.server.state = 'SYN_RCVD';
  s.packets = [{ from: 'server', to: 'client', label: 'SYN-ACK', seq: 2000, ack: 1001, flags: 'SYN+ACK', active: true }];
  s.events.push({ msg: 'Server ← SYN-ACK seq=2000 ack=1001', type: 'ok' });
  s.metrics.packets++;
  s.vars = { clientSeq: 1001, serverSeq: 2000, state: 'SYN_RCVD', acked: 1001 };
  snap(steps, s, '2. Server replies SYN-ACK (seq=2000, ack=1001). Acknowledges client ISN.', 5);

  // ACK
  s.client.state = 'ESTABLISHED';
  s.server.state = 'ESTABLISHED';
  s.client.seq = 1001;
  s.server.ack = 1001;
  s.client.ack = 2001;
  s.packets = [{ from: 'client', to: 'server', label: 'ACK', seq: 1001, ack: 2001, flags: 'ACK', active: true }];
  s.events.push({ msg: 'Client → ACK ack=2001. Connection ESTABLISHED', type: 'ok' });
  s.metrics.packets++;
  s.metrics.rtt = 1;
  s.vars = { clientSeq: 1001, serverSeq: 2001, state: 'ESTABLISHED', acked: 2001 };
  snap(steps, s, '3. Client sends ACK (ack=2001). Connection established. 1 RTT for handshake.', 7);

  // Data transfer
  s.packets = [{ from: 'client', to: 'server', label: 'DATA', seq: 1001, ack: 2001, flags: 'PSH+ACK', active: true }];
  s.events.push({ msg: 'HTTP GET / (PSH+ACK)', type: 'info' });
  s.metrics.packets++;
  s.metrics.bytes += 512;
  s.vars = { clientSeq: 1513, serverSeq: 2001, state: 'ESTABLISHED', acked: 2001 };
  snap(steps, s, 'Data transfer: Client sends HTTP GET (512 bytes). PSH flag — push to app.', 9);

  s.packets = [{ from: 'server', to: 'client', label: 'DATA+ACK', seq: 2001, ack: 1513, flags: 'PSH+ACK', active: true }];
  s.events.push({ msg: 'Server ← HTTP 200 OK (PSH+ACK)', type: 'ok' });
  s.metrics.packets++;
  s.metrics.bytes += 2048;
  s.vars = { clientSeq: 1513, serverSeq: 4049, state: 'ESTABLISHED', acked: 1513 };
  snap(steps, s, 'Server responds with HTTP 200 OK (2KB). ACKs client data.', 11);

  // Teardown
  s.client.state = 'FIN_WAIT_1';
  s.packets = [{ from: 'client', to: 'server', label: 'FIN', seq: 1513, ack: 4049, flags: 'FIN+ACK', active: true }];
  s.events.push({ msg: 'Client → FIN. Initiating teardown.', type: 'warn' });
  s.metrics.packets++;
  s.vars = { clientSeq: 1513, serverSeq: 4049, state: 'FIN_WAIT_1', acked: 4049 };
  s.phase = 'teardown';
  snap(steps, s, 'Teardown: Client sends FIN. Half-close — server can still send.', 13);

  s.server.state = 'CLOSE_WAIT';
  s.client.state = 'FIN_WAIT_2';
  s.packets = [{ from: 'server', to: 'client', label: 'ACK', seq: 4049, ack: 1514, flags: 'ACK', active: true }];
  s.events.push({ msg: 'Server ACKs FIN', type: 'info' });
  s.metrics.packets++;
  snap(steps, s, 'Server ACKs client FIN. Server enters CLOSE_WAIT.', 14);

  s.server.state = 'LAST_ACK';
  s.packets = [{ from: 'server', to: 'client', label: 'FIN', seq: 4049, ack: 1514, flags: 'FIN+ACK', active: true }];
  s.events.push({ msg: 'Server → FIN', type: 'warn' });
  s.metrics.packets++;
  snap(steps, s, 'Server sends FIN. Both sides now want to close.', 15);

  s.client.state = 'TIME_WAIT';
  s.server.state = 'CLOSED';
  s.packets = [{ from: 'client', to: 'server', label: 'ACK', seq: 1514, ack: 4050, flags: 'ACK', active: true }];
  s.events.push({ msg: 'Client → ACK. TIME_WAIT (2*MSL)', type: 'ok' });
  s.metrics.packets++;
  snap(steps, s, 'Client sends final ACK. Enters TIME_WAIT (2×MSL = 60s) then CLOSED.', 16);

  s.client.state = 'CLOSED';
  s.packets = [];
  s.events.push({ msg: 'Connection fully closed', type: 'ok' });
  s.vars = { clientSeq: 1514, serverSeq: 4050, state: 'CLOSED', acked: 4050 };
  snap(steps, s, `Connection closed. ${s.metrics.packets} packets, ${s.metrics.bytes} bytes transferred.`, 17);

  return steps;
}

export const TCP_CODE = [
  '// TCP 3-Way Handshake',
  'Socket socket = new Socket();',
  '',
  '// SYN: client ISN=1000',
  'socket.connect(serverAddr, port);',
  '// → SYN seq=1000',
  '',
  '// SYN-ACK: server ISN=2000',
  '// ← SYN+ACK seq=2000 ack=1001',
  '',
  '// ACK: connection established',
  '// → ACK ack=2001',
  '',
  '// Data transfer',
  'OutputStream out = socket.getOutputStream();',
  'out.write(httpRequest);      // PSH+ACK',
  '',
  '// Teardown (4-way)',
  'socket.close();              // FIN',
  '// ← ACK → FIN ← ACK',
];

export default {
  id: 'tcp-handshake',
  label: 'TCP Handshake',
  icon: '🤝',
  build: buildTcpHandshakeSteps,
  code: TCP_CODE,
  language: 'Java',
  metrics: [
    { key: 'rtt',     label: 'RTTs',    max: 5,    color: 'var(--node-active)' },
    { key: 'packets', label: 'Packets', max: 20,   color: 'var(--node-comparing)' },
    { key: 'bytes',   label: 'Bytes',   max: 4096, color: 'var(--pod-running)' },
  ],
};

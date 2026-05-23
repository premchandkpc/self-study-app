import { snap } from '@/core/utils/scenarioShared';

function buildTlsSteps() {
  const steps = [];

  const makeRecord = (from, to, label, detail) => ({
    from, to, label, detail, active: false,
  });

  const s = {
    client: { state: 'CLOSED', random: null },
    server: { state: 'CLOSED', random: null },
    records: [],
    events: [],
    metrics: { rtt: 0, records: 0, cipher: 'NONE' },
    vars: { version: '1.2', cipher: 'NONE', resumed: false, certSize: 0 },
    phase: 'idle',
    cipher: null,
    sessionId: null,
  };

  snap(steps, s, 'TLS 1.2 Handshake. Client wants secure channel over established TCP.', 1);

  // ClientHello
  s.client.state = 'HELLO_SENT';
  s.records = [makeRecord('client', 'server', 'ClientHello', 'TLS 1.2, cipher suites, random')];
  s.events.push({ msg: 'Client → ClientHello (supported versions, cipher suites)', type: 'info' });
  s.metrics.records++;
  s.vars = { version: '1.2', cipher: 'NONE', resumed: false, certSize: 0 };
  s.phase = 'handshake';
  snap(steps, s, '1. Client sends ClientHello. Includes TLS 1.2, 16+ cipher suites, 32-byte random.', 2);

  // ServerHello
  s.server.state = 'HELLO_RCVD';
  s.records = [
    makeRecord('client', 'server', 'ClientHello', 'TLS 1.2, cipher suites, random'),
    makeRecord('server', 'client', 'ServerHello', 'TLS 1.2, TLS_ECDHE_RSA_WITH_AES_128_GCM', true),
  ];
  s.events.push({ msg: 'Server → ServerHello (TLS_ECDHE_RSA_WITH_AES_128_GCM)', type: 'ok' });
  s.metrics.records++;
  s.vars = { version: '1.2', cipher: 'TLS_ECDHE_RSA_WITH_AES_128_GCM', resumed: false, certSize: 0 };
  snap(steps, s, '2. Server picks TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256. Includes its random.', 3);

  // Certificate
  s.records = [
    makeRecord('client', 'server', 'ClientHello', ''),
    makeRecord('server', 'client', 'ServerHello', ''),
    makeRecord('server', 'client', 'Certificate', 'X.509 chain (2.4 KB)', true),
  ];
  s.events.push({ msg: 'Server → Certificate (RSA 2048, 2.4 KB chain)', type: 'info' });
  s.metrics.records++;
  s.vars = { version: '1.2', cipher: 'TLS_ECDHE_RSA_WITH_AES_128_GCM', resumed: false, certSize: 2400 };
  snap(steps, s, '3. Server sends X.509 certificate chain. Client validates against CA store.', 4);

  // ServerKeyExchange + ServerHelloDone
  s.records = [
    makeRecord('client', 'server', 'ClientHello', ''),
    makeRecord('server', 'client', 'ServerHello', ''),
    makeRecord('server', 'client', 'Certificate', ''),
    makeRecord('server', 'client', 'ServerKeyExchange', 'ECDHE params + signature', true),
  ];
  s.events.push({ msg: 'Server → ServerKeyExchange (ECDHE public key, signature)', type: 'info' });
  s.events.push({ msg: 'Server → ServerHelloDone', type: 'info' });
  s.metrics.records += 2;
  snap(steps, s, '4. Server sends ECDHE params (pubkey, sig) and says hello done.', 5);

  // ClientKeyExchange
  s.client.state = 'KEY_EXCHANGE';
  s.records = [
    makeRecord('client', 'server', 'ClientHello', ''),
    makeRecord('server', 'client', 'ServerHello', ''),
    makeRecord('server', 'client', 'Certificate', ''),
    makeRecord('server', 'client', 'ServerKeyExchange', ''),
    makeRecord('client', 'server', 'ClientKeyExchange', 'ECDHE pubkey + premaster', true),
  ];
  s.events.push({ msg: 'Client → ClientKeyExchange (ECDHE public key)', type: 'ok' });
  s.metrics.records++;
  snap(steps, s, '5. Client sends ECDHE public key. Both sides compute same premaster secret.', 6);

  // ChangeCipherSpec + Finished (client)
  s.client.state = 'FINISHED_SENT';
  s.records = [
    makeRecord('client', 'server', 'ClientHello', ''),
    makeRecord('server', 'client', 'ServerHello', ''),
    makeRecord('server', 'client', 'Certificate', ''),
    makeRecord('server', 'client', 'ServerKeyExchange', ''),
    makeRecord('client', 'server', 'ClientKeyExchange', ''),
    makeRecord('client', 'server', 'ChangeCipherSpec', '→ encrypted', true),
  ];
  s.events.push({ msg: 'Client → ChangeCipherSpec (now encrypting)', type: 'ok' });
  s.metrics.records++;
  snap(steps, s, '6. Client sends ChangeCipherSpec. All subsequent messages encrypted.', 7);

  s.records = [
    makeRecord('client', 'server', 'ClientHello', ''),
    makeRecord('server', 'client', 'ServerHello', ''),
    makeRecord('server', 'client', 'Certificate', ''),
    makeRecord('server', 'client', 'ServerKeyExchange', ''),
    makeRecord('client', 'server', 'ClientKeyExchange', ''),
    makeRecord('client', 'server', 'ChangeCipherSpec', ''),
    makeRecord('client', 'server', 'Finished', '🔒 encrypted verify', true),
  ];
  s.events.push({ msg: 'Client → Finished (encrypted handshake hash verify)', type: 'ok' });
  s.metrics.records++;
  snap(steps, s, '7. Client sends Finished — encrypted hash of all handshake messages.', 8);

  // ChangeCipherSpec + Finished (server)
  s.server.state = 'FINISHED_RCVD';
  s.records = [
    makeRecord('client', 'server', 'ClientHello', ''),
    makeRecord('server', 'client', 'ServerHello', ''),
    makeRecord('server', 'client', 'Certificate', ''),
    makeRecord('server', 'client', 'ServerKeyExchange', ''),
    makeRecord('client', 'server', 'ClientKeyExchange', ''),
    makeRecord('client', 'server', 'ChangeCipherSpec', ''),
    makeRecord('client', 'server', 'Finished', ''),
    makeRecord('server', 'client', 'ChangeCipherSpec', '← encrypted', true),
  ];
  s.events.push({ msg: 'Server → ChangeCipherSpec (now encrypting)', type: 'ok' });
  s.metrics.records++;
  snap(steps, s, '8. Server sends ChangeCipherSpec. Now both sides encrypt.', 9);

  s.records = [
    makeRecord('client', 'server', 'ClientHello', ''),
    makeRecord('server', 'client', 'ServerHello', ''),
    makeRecord('server', 'client', 'Certificate', ''),
    makeRecord('server', 'client', 'ServerKeyExchange', ''),
    makeRecord('client', 'server', 'ClientKeyExchange', ''),
    makeRecord('client', 'server', 'ChangeCipherSpec', ''),
    makeRecord('client', 'server', 'Finished', ''),
    makeRecord('server', 'client', 'ChangeCipherSpec', ''),
    makeRecord('server', 'client', 'Finished', '🔒 encrypted verify', true),
  ];
  s.events.push({ msg: 'Server → Finished (verified. Handshake complete!)', type: 'ok' });
  s.metrics.records++;
  snap(steps, s, '9. Server sends Finished. Client verifies. Handshake complete!', 10);

  // Secure connection established
  s.client.state = 'ESTABLISHED';
  s.server.state = 'ESTABLISHED';
  s.metrics.rtt = 2;
  s.cipher = 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256';
  s.records = [
    makeRecord('client', 'server', 'ClientHello', ''),
    makeRecord('server', 'client', 'ServerHello', ''),
    makeRecord('server', 'client', 'Certificate', ''),
    makeRecord('server', 'client', 'ServerKeyExchange', ''),
    makeRecord('client', 'server', 'ClientKeyExchange', ''),
    makeRecord('client', 'server', 'ChangeCipherSpec', ''),
    makeRecord('client', 'server', 'Finished', ''),
    makeRecord('server', 'client', 'ChangeCipherSpec', ''),
    makeRecord('server', 'client', 'Finished', ''),
    makeRecord('client', 'server', 'App Data', '🔒 GET / (encrypted)', true),
  ];
  s.events.push({ msg: '🔒 TLS established. Client sends encrypted HTTP GET.', type: 'ok' });
  s.metrics.records++;
  s.vars = { version: '1.2', cipher: 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256', resumed: false, certSize: 2400 };
  s.phase = 'established';
  snap(steps, s, '🔒 TLS 1.2 established (2 RTTs total: TCP 1 + TLS 2). Encrypted HTTP flows.', 11);

  return steps;
}

export const TLS_CODE = [
  '// TLS 1.2 Handshake',
  '',
  '// 1. ClientHello',
  '//    → version, cipher suites, random',
  '// 2. ServerHello',
  '//    ← chosen cipher, random',
  '// 3. Certificate',
  '//    ← X.509 cert chain',
  '// 4. ServerKeyExchange',
  '//    ← ECDHE params, signature',
  '// 5. ClientKeyExchange',
  '//    → ECDHE public key',
  '// 6. ChangeCipherSpec + Finished',
  '//    → encrypted handshake verify',
  '// 7. ChangeCipherSpec + Finished',
  '//    ← encrypted handshake verify',
  '// 8. Application Data',
  '//    ↔ encrypted HTTP/TLS record',
  '',
  '# Inspect TLS connection',
  'openssl s_client -connect example.com:443 -tls1_2',
  '',
  '# View certificate chain',
  'echo | openssl s_client -showcerts -connect example.com:443 2>/dev/null',
  '',
  '# TLS 1.3 (faster, 1-RTT)',
  'openssl s_client -connect example.com:443 -tls1_3',
];

export default {
  id: 'tls-handshake',
  label: 'TLS Handshake',
  icon: '🔒',
  build: buildTlsSteps,
  code: TLS_CODE,
  language: 'bash',
  metrics: [
    { key: 'rtt',     label: 'RTTs',    max: 3,    color: 'var(--node-active)' },
    { key: 'records', label: 'Records', max: 15,   color: 'var(--node-comparing)' },
    { key: 'cipher',  label: 'Cipher',  max: 1,    color: 'var(--pod-running)', format: 'text' },
  ],
};

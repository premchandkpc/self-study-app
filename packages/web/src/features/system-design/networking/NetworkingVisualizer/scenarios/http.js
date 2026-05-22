import { snap } from '@/core/utils/scenarioShared';

function buildHttpSteps() {
  const steps = [];

  const makeRequest = (id, resource, status = 'pending', stream = null) => ({
    id, resource, status, stream,
  });

  const s = {
    version: '1.1',
    http1Requests: [],
    http2Streams: [],
    connection: { open: false, multiplexed: false },
    events: [],
    metrics: { rtt: 0, requests: 0, pipelined: 0 },
    vars: { version: '1.1', streams: 1, pipelined: false, requests: 3, rtt: 300 },
    phase: 'idle',
  };

  snap(steps, s, 'HTTP/1.1 vs HTTP/2: Compare how multiple requests are handled on one connection.', 1);

  // === HTTP/1.1 Phase ===
  s.version = '1.1';
  s.connection = { open: false, multiplexed: false };
  s.phase = 'http1';
  snap(steps, s, 'HTTP/1.1: Sequential requests. Each request waits for the previous response.', 2);

  s.connection.open = true;
  s.events.push({ msg: 'HTTP/1.1: TCP connection established', type: 'ok' });
  snap(steps, s, 'TCP connection opened. HTTP/1.1 allows only 1 in-flight request at a time.', 3);

  const http1Resources = ['/index.html', '/style.css', '/app.js'];
  for (const res of http1Resources) {
    s.http1Requests.push(makeRequest(s.http1Requests.length + 1, res, 'pending'));
    s.metrics.requests++;
    s.events.push({ msg: `GET ${res}`, type: 'info' });
    s.vars = { version: '1.1', streams: 1, pipelined: false, requests: s.metrics.requests, rtt: 300 };
    snap(steps, s, `HTTP/1.1: GET ${res} sent. Must wait for response before next request.`, 4);

    const idx = s.http1Requests.length - 1;
    s.http1Requests[idx].status = 'active';
    snap(steps, s, `Waiting for response to ${res}...`, 5);

    s.http1Requests[idx].status = 'done';
    s.metrics.rtt++;
    s.events.push({ msg: `200 OK ${res}`, type: 'ok' });
    snap(steps, s, `Response received. RTT: ${s.metrics.rtt * 300}ms. Next request can proceed.`, 6);
  }

  s.events.push({ msg: `HTTP/1.1 total: ${s.metrics.rtt} RTTs = ${s.metrics.rtt * 300}ms`, type: 'warn' });
  snap(steps, s, `HTTP/1.1: All 3 requests done sequentially. Total: ${s.metrics.rtt} RTTs (${s.metrics.rtt * 300}ms).`, 7);

  // === HTTP/2 Phase ===
  s.version = '2';
  s.http1Requests = [];
  s.http2Streams = [];
  s.connection = { open: false, multiplexed: true };
  s.metrics.rtt = 0;
  s.metrics.requests = 0;
  s.phase = 'http2';
  snap(steps, s, 'HTTP/2: Multiplexed streams. All requests in parallel over one connection.', 9);

  s.connection.open = true;
  s.events.push({ msg: 'HTTP/2: TLS + ALPN negotiated. h2 protocol.', type: 'ok' });
  snap(steps, s, 'HTTP/2 negotiated via ALPN in TLS handshake. Single connection.', 10);

  // All requests sent simultaneously
  const http2Resources = ['/index.html', '/style.css', '/app.js'];
  for (const res of http2Resources) {
    const streamId = s.http2Streams.length * 2 + 1; // odd stream IDs for client
    s.http2Streams.push({ id: streamId, resource: res, status: 'active' });
    s.metrics.requests++;
  }
  s.events.push({ msg: 'Streams 1,3,5 multiplexed in parallel', type: 'ok' });
  s.vars = { version: '2', streams: 3, pipelined: false, requests: 3, rtt: 300 };
  snap(steps, s, 'HTTP/2: 3 streams sent concurrently (stream IDs 1, 3, 5). No head-of-line blocking.', 11);

  // Responses interleaved
  s.http2Streams[1].status = 'done';
  s.events.push({ msg: 'Stream 3: 200 OK /style.css (smallest)', type: 'ok' });
  snap(steps, s, 'style.css arrives first (smallest). Other streams still in-flight.', 12);

  s.http2Streams[0].status = 'done';
  s.events.push({ msg: 'Stream 1: 200 OK /index.html', type: 'ok' });
  snap(steps, s, 'index.html arrives. Streams can complete in any order.', 13);

  s.http2Streams[2].status = 'done';
  s.events.push({ msg: 'Stream 5: 200 OK /app.js', type: 'ok' });
  s.metrics.rtt = 1;
  snap(steps, s, 'All responses received in 1 RTT! HTTP/2 multiplexing = 3× faster.', 14);

  s.events.push({ msg: `HTTP/2 total: 1 RTT = 300ms vs ${http1Resources.length * 300}ms`, type: 'ok' });
  s.vars = { version: '2', streams: 3, pipelined: false, requests: 3, rtt: 300 };
  snap(steps, s, `HTTP/2 completes in 1 RTT (300ms) vs HTTP/1.1's ${http1Resources.length} RTTs (${http1Resources.length * 300}ms).`, 15);

  return steps;
}

export const HTTP_CODE = [
  '// HTTP/1.1 — sequential',
  'fetch("/index.html")          // wait...',
  '  .then(() => fetch("/style.css"))   // wait...',
  '  .then(() => fetch("/app.js"));     // wait...',
  '// Total: 3 RTTs',
  '',
  '// HTTP/2 — multiplexed',
  'Promise.all([',
  '  fetch("/index.html"),  // stream 1',
  '  fetch("/style.css"),   // stream 3',
  '  fetch("/app.js"),      // stream 5',
  ']);',
  '// Total: 1 RTT (all parallel)',
  '',
  '// HTTP/2 features:',
  '// - Binary framing (not text)',
  '// - Header compression (HPACK)',
  '// - Server Push',
  '// - Stream prioritization',
];

export default {
  id: 'http',
  label: 'HTTP/1 vs HTTP/2',
  icon: '🌐',
  build: buildHttpSteps,
  code: HTTP_CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'rtt',      label: 'RTTs',     max: 5, color: 'var(--node-comparing)', warn: 50, critical: 80 },
    { key: 'requests', label: 'Requests', max: 6, color: 'var(--node-active)' },
    { key: 'pipelined', label: 'Parallel', max: 3, color: 'var(--pod-running)' },
  ],
};

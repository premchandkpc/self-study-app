import { snap } from './shared';

const COMMAND_LIST = ['SET key1 v1', 'SET key2 v2', 'GET key1', 'INCR counter', 'LPUSH queue task1'];
const RTT_PER_CMD = 100; // ms simulated

function buildPipelineSteps() {
  const steps = [];

  const s = {
    mode: 'sequential',
    commands: COMMAND_LIST.map((cmd, i) => ({
      id: i,
      cmd,
      latency: RTT_PER_CMD,
      sent: false,
      received: false,
      waitingRTT: false,
    })),
    totalRtt: 0,
    connections: 0,
    events: [],
    metrics: { totalRtt: 0, savings: 0, commandsDone: 0 },
    vars: { mode: 'sequential', commands: 5, totalRtt: 0, savings: 0 },
  };

  snap(steps, s, 'Redis Pipelining demo. 5 commands to execute. Sequential mode: 1 RTT per command.', 1, 'O(n) sequential');

  // Sequential mode
  s.events.push({ type: 'warn', msg: 'Sequential: each command waits for response before next' });
  snap(steps, s, 'Sequential (no pipeline): each command requires 1 round-trip. Total RTT = N × 100ms = 500ms.', 2, 'O(n) RTT');

  for (let i = 0; i < s.commands.length; i++) {
    s.commands[i].sent = true;
    s.connections += 1;
    s.events.push({ type: 'info', msg: `→ ${s.commands[i].cmd}` });
    snap(steps, s, `Send command ${i + 1}: "${s.commands[i].cmd}". Waiting for response (100ms RTT)...`, 3, 'O(1) send');

    s.commands[i].waitingRTT = true;
    snap(steps, s, `Network round-trip in progress. Client blocked waiting. No other commands can be sent!`, 3, 'O(1) wait');

    s.commands[i].waitingRTT = false;
    s.commands[i].received = true;
    s.totalRtt += RTT_PER_CMD;
    s.metrics.totalRtt = s.totalRtt;
    s.metrics.commandsDone = i + 1;
    s.vars = { mode: 'sequential', commands: 5, totalRtt: s.totalRtt, savings: 0 };
    s.events.push({ type: 'ok', msg: `← Response received for: ${s.commands[i].cmd}` });
    snap(steps, s, `Response received! RTT so far: ${s.totalRtt}ms. ${i + 1}/${s.commands.length} done.`, 4, 'O(1) recv');
  }

  snap(steps, s, `Sequential complete! Total RTT: ${s.totalRtt}ms (${s.commands.length} × 100ms). Very slow for bulk operations!`, 5, 'O(n) sequential');

  // Switch to pipeline mode
  s.mode = 'pipeline';
  s.commands.forEach((c) => { c.sent = false; c.received = false; c.waitingRTT = false; });
  s.totalRtt = 0;
  s.connections = 0;
  s.metrics.totalRtt = 0;
  s.metrics.commandsDone = 0;
  s.vars = { mode: 'pipeline', commands: 5, totalRtt: 0, savings: 0 };
  s.events.push({ type: 'info', msg: 'Switching to PIPELINE mode' });
  snap(steps, s, 'Pipeline mode: batch ALL commands into a single network request. Client sends without waiting for responses.', 6, 'O(1) pipeline');

  // Send all commands at once
  s.commands.forEach((c) => { c.sent = true; });
  s.connections = 1;
  s.events.push({ type: 'ok', msg: '→ Sent all 5 commands in one batch (1 TCP write)' });
  s.vars = { mode: 'pipeline', commands: 5, totalRtt: 0, savings: 0 };
  snap(steps, s, 'All 5 commands sent in a single burst! Only 1 TCP round-trip needed. Server queues and executes them in order.', 7, 'O(n) batch send');

  // Single RTT for all
  s.commands.forEach((c) => { c.waitingRTT = true; });
  snap(steps, s, 'Server processes all 5 commands sequentially (still single-threaded), then sends all responses in one batch.', 8, 'O(1) single RTT');

  s.commands.forEach((c) => { c.waitingRTT = false; c.received = true; });
  s.totalRtt = RTT_PER_CMD; // Only 1 RTT!
  s.metrics.totalRtt = s.totalRtt;
  s.metrics.commandsDone = 5;
  const savings = ((COMMAND_LIST.length * RTT_PER_CMD - RTT_PER_CMD) / (COMMAND_LIST.length * RTT_PER_CMD)) * 100;
  s.metrics.savings = Math.round(savings);
  s.vars = { mode: 'pipeline', commands: 5, totalRtt: s.totalRtt, savings: s.metrics.savings };
  s.events.push({ type: 'ok', msg: `← All 5 responses received in 100ms (1 RTT)!` });
  snap(steps, s, `Pipeline complete! Total RTT: ${s.totalRtt}ms vs sequential 500ms. ${s.metrics.savings}% savings! Throughput: 5x improvement.`, 9, 'O(1) pipeline');

  snap(steps, s, 'Pipelining key insight: network latency, not Redis processing, is the bottleneck. Pipeline eliminates wait time between commands.', 10, 'O(n/batch) pipeline');

  return steps;
}

export const PIPELINE_CODE = [
  '# Sequential (slow) — 5 × RTT',
  'client.set("key1", "v1")   # wait 100ms',
  'client.set("key2", "v2")   # wait 100ms',
  'client.get("key1")          # wait 100ms',
  'client.incr("counter")      # wait 100ms',
  'client.lpush("queue","t1")  # wait 100ms',
  '# Total: ~500ms',
  '',
  '# Pipeline (fast) — 1 RTT',
  'pipe = client.pipeline()',
  'pipe.set("key1", "v1")',
  'pipe.set("key2", "v2")',
  'pipe.get("key1")',
  'pipe.incr("counter")',
  'pipe.lpush("queue", "task1")',
  'results = pipe.execute()',
  '# Total: ~100ms (5× faster!)',
  '',
  '# Transaction pipeline (atomic)',
  'with client.pipeline() as pipe:',
  '  pipe.multi()              # MULTI',
  '  pipe.set("k", "v")',
  '  pipe.incr("cnt")',
  '  pipe.execute()            # EXEC',
];

export default {
  id: 'pipeline',
  label: 'Pipelining',
  icon: '⚡',
  build: buildPipelineSteps,
  code: PIPELINE_CODE,
  language: 'Python',
  metrics: [
    { key: 'totalRtt',       label: 'Total RTT (ms)', max: 500, unit: 'ms', color: 'var(--node-comparing)', warn: 60, critical: 80 },
    { key: 'savings',        label: 'RTT Saved %',    max: 100, unit: '%',  color: 'var(--pod-running)' },
    { key: 'commandsDone',   label: 'Commands Done',  max: 5,               color: 'var(--node-active)' },
  ],
};

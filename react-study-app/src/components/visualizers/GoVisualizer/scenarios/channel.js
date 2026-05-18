import { snap, G_STATES, goroutine, channel } from './shared';

function buildChannelSteps() {
  const steps = [];
  const s = {
    goroutines: [
      goroutine('producer', 'send loop'),
      goroutine('consumer', 'recv loop'),
    ],
    channels: [channel('ch', 3)],
    output: [],
    events: [],
    metrics: { sent: 0, received: 0, blocked: 0 },
  };

  snap(steps, s, 'Buffered channel ch (cap=3). Producer sends, Consumer receives.', 1);

  // Send 1
  s.goroutines[0].state = G_STATES.RUNNING;
  s.channels[0].items = [1];
  s.metrics.sent = 1;
  s.events.push({ type: 'ok', msg: 'ch <- 1 (buf: [1], len=1/3)' });
  snap(steps, s, 'Producer: ch <- 1. Non-blocking (buffer has space). len=1, cap=3.', 3);

  // Send 2, 3
  s.channels[0].items = [1, 2, 3];
  s.metrics.sent = 3;
  s.events.push({ type: 'ok', msg: 'ch <- 2, ch <- 3 (buf full: [1,2,3])' });
  snap(steps, s, 'Producer sends 2 and 3. Buffer FULL (len=3, cap=3).', 3);

  // Producer blocks on send 4
  s.goroutines[0].state = G_STATES.WAITING;
  s.channels[0].senders = ['producer (4)'];
  s.metrics.blocked = 1;
  s.events.push({ type: 'warn', msg: 'ch <- 4 BLOCKS — buffer full! Producer suspended.' });
  snap(steps, s, 'ch <- 4 blocks. Buffer full. Producer WAITING until consumer reads.', 4);

  // Consumer reads 1
  s.goroutines[1].state = G_STATES.RUNNING;
  s.channels[0].items = [2, 3, 4];
  s.channels[0].senders = [];
  s.goroutines[0].state = G_STATES.RUNNING;
  s.metrics.received = 1; s.metrics.blocked = 0; s.metrics.sent = 4;
  s.output.push('recv: 1');
  s.events.push({ type: 'ok', msg: 'Consumer reads 1. Producer unblocked, 4 enters buffer.' });
  snap(steps, s, 'Consumer receives 1. Buffer opens slot. Producer unblocked, sends 4.', 5);

  // Drain channel
  s.channels[0].items = [];
  s.goroutines[0].state = G_STATES.DEAD;
  s.goroutines[1].state = G_STATES.RUNNING;
  s.output = ['recv: 1', 'recv: 2', 'recv: 3', 'recv: 4'];
  s.metrics.received = 4;
  s.events.push({ type: 'ok', msg: 'close(ch) — consumer drains remaining, detects close.' });
  snap(steps, s, 'Producer closes channel. Consumer drains all values via range loop. Clean shutdown.', 7);

  // Zero-value on closed
  s.events.push({ type: 'warn', msg: 'v, ok := <-ch → ok=false (closed + empty)' });
  snap(steps, s, 'Receive from closed empty channel: returns zero-value, ok=false. Use ok to detect close.', 8);

  return steps;
}

const CODE = [
  'ch := make(chan int, 3) // buffered',
  '',
  'go func() {',
  '  for i := 1; i <= 4; i++ {',
  '    ch <- i  // blocks if full',
  '  }',
  '  close(ch)',
  '}()',
  'for v := range ch { // drain',
  '  fmt.Println(v)',
  '}',
];

export default {
  id: 'channel',
  label: 'Channels',
  icon: '📡',
  build: buildChannelSteps,
  code: CODE,
  language: 'Go',
  layout: 'runtime',
  metrics: [
    { key: 'sent',     label: 'Sent',     max: 10, color: 'var(--node-default)' },
    { key: 'received', label: 'Received', max: 10, color: 'var(--pod-running)' },
    { key: 'blocked',  label: 'Blocked',  max: 3,  color: 'var(--pod-crash)' },
  ],
};

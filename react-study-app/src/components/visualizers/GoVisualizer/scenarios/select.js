import { snap, G_STATES, goroutine, channel } from './shared';

function buildSelectSteps() {
  const steps = [];
  const s = {
    goroutines: [goroutine('main', 'select loop')],
    channels: [
      channel('work', 1),
      channel('done', 0),
      channel('timeout', 0),
    ],
    output: [],
    events: [],
    metrics: { loops: 0, selected: 0, timeouts: 0 },
    selected: null,
  };

  snap(steps, s, 'select waits on multiple channels simultaneously. First ready wins.', 1);

  // work arrives
  s.goroutines[0].state = G_STATES.WAITING;
  s.events.push({ type: 'info', msg: 'main goroutine: entering select { ... }' });
  snap(steps, s, 'Goroutine enters select. Blocked waiting on work, done, or timeout channels.', 2);

  s.channels[0].items = ['job#1'];
  s.selected = 'work';
  s.goroutines[0].state = G_STATES.RUNNING;
  s.output.push('processing job#1');
  s.metrics.loops = 1; s.metrics.selected = 1;
  s.events.push({ type: 'ok', msg: 'case job := <-work: selected! processing job#1' });
  snap(steps, s, 'work channel has data → case work selected. Goroutine processes job.', 3);

  // Timeout fires
  s.channels[0].items = [];
  s.selected = null;
  s.goroutines[0].state = G_STATES.WAITING;
  s.events.push({ type: 'info', msg: 'select again — no work ready, waiting...' });
  snap(steps, s, 'Next iteration: no work. select blocks. time.After(1s) running.', 4);

  s.channels[2].items = ['tick'];
  s.selected = 'timeout';
  s.goroutines[0].state = G_STATES.RUNNING;
  s.metrics.loops = 2; s.metrics.timeouts = 1;
  s.events.push({ type: 'warn', msg: 'case <-time.After(1s): timeout selected!' });
  snap(steps, s, 'Timeout fires after 1s. case timeout selected. Non-blocking pattern.', 5);

  // done signal
  s.channels[2].items = [];
  s.channels[1].items = ['signal'];
  s.selected = 'done';
  s.goroutines[0].state = G_STATES.DEAD;
  s.metrics.loops = 3;
  s.events.push({ type: 'ok', msg: 'case <-done: shutdown signal received. exit.' });
  snap(steps, s, 'done channel signaled (context.Cancel). Goroutine exits cleanly. Context pattern.', 6);

  return steps;
}

const CODE = [
  'for {',
  '  select {',
  '  case job := <-work:',
  '    process(job)',
  '  case <-time.After(1 * time.Second):',
  '    fmt.Println("timeout")',
  '  case <-ctx.Done():',
  '    return // shutdown',
  '  }',
  '}',
];

export default {
  id: 'select',
  label: 'Select',
  icon: '🔀',
  build: buildSelectSteps,
  code: CODE,
  language: 'Go',
  layout: 'runtime',
  metrics: [
    { key: 'loops',    label: 'Loops',    max: 5, color: 'var(--node-default)' },
    { key: 'selected', label: 'Selected', max: 5, color: 'var(--pod-running)' },
    { key: 'timeouts', label: 'Timeouts', max: 3, color: 'var(--node-comparing)' },
  ],
};

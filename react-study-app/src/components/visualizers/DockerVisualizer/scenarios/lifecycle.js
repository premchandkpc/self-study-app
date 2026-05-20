import { snap } from '@/core/utils/scenarioShared';

function buildLifecycleSteps() {
  const steps = [];

  const s = {
    container: { id: 'abc123', state: 'none', pid: null, uptime: '0s', memory: '0MB', cpu: '0%' },
    processes: [],
    events: [],
    metrics: { uptime: 0, memory: 0, cpu: 0 },
    vars: { state: 'none', pid: null, uptime: '0s', memory: '0MB', cpu: '0%' },
  };

  snap(steps, s, 'Container lifecycle begins. Docker pulls image if not cached locally.', 1);

  // CREATED
  s.container.state = 'created';
  s.events.push({ msg: '$ docker create myapp:1.0', type: 'info' });
  s.events.push({ msg: 'Container abc123 created', type: 'ok' });
  s.vars = { state: 'created', pid: null, uptime: '0s', memory: '0MB', cpu: '0%' };
  snap(steps, s, 'CREATED: Container filesystem allocated. Not yet started.', 2);

  // RUNNING
  s.container.state = 'running';
  s.container.pid = 1;
  s.container.uptime = '0s';
  s.container.memory = '64MB';
  s.container.cpu = '1.2%';
  s.processes = [
    { pid: 1, cmd: 'node server.js', status: 'S' },
    { pid: 15, cmd: 'npm start', status: 'S' },
  ];
  s.events.push({ msg: '$ docker start abc123', type: 'info' });
  s.events.push({ msg: 'PID 1: node server.js', type: 'ok' });
  s.metrics.memory = 64;
  s.metrics.cpu = 1;
  s.vars = { state: 'running', pid: 1, uptime: '2m', memory: '128MB', cpu: '0.5%' };
  snap(steps, s, 'RUNNING: PID 1 spawned. Container is live. Port 3000 exposed.', 4);

  s.container.uptime = '2m';
  s.container.memory = '128MB';
  s.container.cpu = '0.5%';
  s.metrics.uptime = 120;
  s.metrics.memory = 128;
  snap(steps, s, 'Container healthy. Serving traffic. Memory usage stable at 128MB.', 5);

  // PAUSED
  s.container.state = 'paused';
  s.container.cpu = '0%';
  s.events.push({ msg: '$ docker pause abc123', type: 'warn' });
  s.events.push({ msg: 'SIGSTOP sent to all processes', type: 'warn' });
  s.metrics.cpu = 0;
  s.vars = { state: 'paused', pid: 1, uptime: '2m', memory: '128MB', cpu: '0%' };
  snap(steps, s, 'PAUSED: SIGSTOP sent. Processes frozen. Memory retained. CPU = 0%.', 7);

  // RUNNING again
  s.container.state = 'running';
  s.container.cpu = '0.5%';
  s.events.push({ msg: '$ docker unpause abc123', type: 'ok' });
  s.events.push({ msg: 'SIGCONT — processes resumed', type: 'ok' });
  s.metrics.cpu = 1;
  s.vars = { state: 'running', pid: 1, uptime: '5m', memory: '128MB', cpu: '0.5%' };
  snap(steps, s, 'RUNNING: Container unpaused. Processes resumed from exact freeze point.', 9);

  // STOPPED
  s.container.state = 'stopped';
  s.container.pid = null;
  s.container.cpu = '0%';
  s.container.memory = '0MB';
  s.processes = [];
  s.events.push({ msg: '$ docker stop abc123', type: 'warn' });
  s.events.push({ msg: 'SIGTERM → grace period → SIGKILL', type: 'warn' });
  s.metrics.memory = 0;
  s.metrics.cpu = 0;
  s.vars = { state: 'stopped', pid: null, uptime: '5m', memory: '0MB', cpu: '0%' };
  snap(steps, s, 'STOPPED: SIGTERM sent. After 10s grace, SIGKILL. Filesystem preserved.', 11);

  // REMOVED
  s.container.state = 'removed';
  s.events.push({ msg: '$ docker rm abc123', type: 'info' });
  s.events.push({ msg: 'Container + writable layer deleted', type: 'ok' });
  s.vars = { state: 'removed', pid: null, uptime: '5m', memory: '0MB', cpu: '0%' };
  snap(steps, s, 'REMOVED: Container and its writable layer deleted. Image layers intact.', 13);

  return steps;
}

export const LIFECYCLE_CODE = [
  '# Container lifecycle commands',
  'docker pull myapp:1.0         # fetch image',
  'docker create myapp:1.0       # CREATED',
  'docker start <container_id>   # RUNNING',
  '',
  'docker pause <id>             # PAUSED (SIGSTOP)',
  'docker unpause <id>           # RUNNING',
  '',
  '# Graceful stop',
  'docker stop <id>              # SIGTERM → SIGKILL',
  '',
  '# Remove container (not image)',
  'docker rm <id>',
  '',
  '# One-shot run+remove',
  'docker run --rm myapp:1.0',
];

export default {
  id: 'lifecycle',
  label: 'Container Lifecycle',
  icon: '🔄',
  build: buildLifecycleSteps,
  code: LIFECYCLE_CODE,
  language: 'bash',
  metrics: [
    { key: 'uptime',  label: 'Uptime (s)', max: 300, color: 'var(--pod-running)' },
    { key: 'memory',  label: 'Memory MB',  max: 256, color: 'var(--node-active)' },
    { key: 'cpu',     label: 'CPU %',      max: 10,  color: 'var(--node-comparing)' },
  ],
  topicContent: {
    concept: [
      { title: 'ELI5 — Kid-friendly analogy', content: 'A container is like a takeout box. You create the box, put food in it and start "eating" (running), can pause and put it in the fridge, then either stop (lunch break) or throw the box away entirely. The recipe (image) stays on the shelf.' },
      { title: 'Core — How it works', content: 'Docker uses namespaces (PID, net, mount, user, uts, ipc) and cgroups to isolate processes. `docker create` allocates a writable layer on top of image layers. `docker start` spawns PID 1 inside the namespace. `docker pause` sends SIGSTOP to freeze all threads. `docker stop` sends SIGTERM then SIGKILL after grace period. `docker rm` deletes the writable layer only.' },
    ],
    why: ['Production containers should use `docker stop` with a proper grace period to let processes clean up. Never `docker kill` unless a container hangs beyond the timeout.'],
    interview: [
      { question: 'What happens when you run `docker run --rm`?', answer: 'It creates, starts, and when the container exits, automatically removes the writable layer. Useful for ephemeral tasks.', followUps: ['What happens to the image layers?', 'When is the removal triggered?'] },
      { question: 'How does Docker handle zombie processes?', answer: 'PID 1 inside the container is responsible for reaping zombies. If your app doesn\'t handle SIGCHLD, zombies accumulate. Use a minimal init like tini or dumb-init.', followUps: ['What happens if PID 1 exits?', 'What is the --init flag?'] },
    ],
    gotcha: ['Pausing a container freezes all processes via SIGSTOP, which cannot be caught or ignored — even background threads freeze.', 'A stopped container\'s writable layer persists. Use `docker rm -v` to also remove anonymous volumes.'],
    tradeoffs: [
      { pro: 'Fast startup (milliseconds) compared to VMs', con: 'Weaker isolation than VMs — shares host kernel' },
      { pro: 'Ephemeral containers keep hosts clean', con: 'Ephemeral containers lose logs on exit without volume mounts' },
    ],
  },
};

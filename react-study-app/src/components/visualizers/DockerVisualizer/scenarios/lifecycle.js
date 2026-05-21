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
      { title: 'What is Container Lifecycle in simple terms?', content: 'A container goes through distinct phases: created, running, paused, stopped, and removed. Each phase represents a different operational state with specific resource usage and behavior. Think of it like an app on your phone — you install it (create), open it (start), put it in the background (pause), close it (stop), and delete it (remove). Understanding these states is critical for debugging and managing containers in production.' },
      { title: 'How Container Lifecycle works — core mechanics', content: 'Docker uses Linux namespaces for isolation and cgroups for resource control. `docker create` allocates a writable layer on the image filesystem. `docker start` spawns PID 1 inside the namespace. `docker pause` sends SIGSTOP freezing all threads instantly. `docker stop` sends SIGTERM then SIGKILL after configurable grace period. `docker rm` removes only the writable layer, preserving image layers for reuse.' },
      { title: 'Deep — internals & architecture', content: 'Linux namespaces provide containers with isolated views: PID namespace hides host processes, network namespace gives independent interfaces and routing tables, mount namespace separates filesystem mounts, and user namespace maps container root to unprivileged UID outside. Cgroups control CPU shares, memory limits, and I/O bandwidth per container. The combination enables lightweight virtualization by sharing the host kernel while preventing processes in one container from observing or affecting processes in another, all without hypervisor overhead.' },
    ],
    why: [
      'Production containers must use `docker stop` with adequate grace period (10-30s) to enable clean shutdown — processes flush buffers, close sockets, release locks. `docker kill` bypasses this entirely causing potential data corruption. Always configure SIGTERM handlers in your application for graceful termination.',
      'Always set `--memory` and `--cpus` limits on production containers. Without resource caps, a memory leak in one container triggers host OOM killer which may kill unrelated containers. Limits prevent noisy-neighbor problems and ensure predictable performance across multi-tenant hosts.',
      'Use `--restart unless-stopped` for long-running services — it automatically recovers from crashes while respecting manual stops. Unlike `always`, it will not restart a container you deliberately stopped for maintenance or database migrations, preventing accidental re-entry into bad states.',
    ],
    interview: [
      { q: 'What happens exactly when you run `docker run --rm`?', a: 'Docker creates a container from the image, starts it inside the isolated namespace, and monitors the main process. When that process exits, Docker automatically removes the writable layer and anonymous volumes. Image layers stay cached for future use. This is ideal for batch jobs, CI build steps, or tests where cleanup overhead is unwanted and no container state needs to persist after execution.', followUps: ['Does `--rm` work with `docker run -d` detached mode?', 'What happens to named volumes with `--rm`?', 'When exactly is the removal triggered — at process exit or after restart policy retries?'] },
      { q: 'How does Docker manage zombie processes inside containers?', a: 'PID 1 inside a container must reap orphaned child processes (zombies) by handling SIGCHLD. Many applications (Node.js, Python, Java) do not implement this behavior, causing zombies to accumulate in the process table until the PID limit is exhausted. Docker provides the `--init` flag that runs tini as PID 1, a minimal init that handles signal forwarding and automatic zombie reaping. Alternatively you can use dumb-init or configure your base image with a proper init system like supervisord.', followUps: ['Why does PID 1 behave differently in containers than on a regular Linux host?', 'Can zombie processes in one container affect other containers or the host?', 'What signal does `--init` forward differently than your app handling it directly?'] },
      { q: 'What are the differences between `docker stop`, `docker kill`, and `docker restart`?', a: '`docker stop` sends SIGTERM (customizable via `--stop-signal`) and waits up to the timeout (`-t 10` by default) for graceful shutdown. If the process has not exited within the timeout, Docker escalates to SIGKILL. `docker kill` sends the specified signal immediately (default SIGKILL) without any grace period — the process has zero chance to flush buffers, close sockets, or release file locks. `docker restart` executes a stop (with full SIGTERM to SIGKILL sequence) followed immediately by a start, preserving the container ID and configuration. In production always prefer `docker stop` to allow connection draining and data persistence; reserve `docker kill` only for containers that are truly unresponsive beyond the stop timeout.', followUps: ['Can you configure different stop signals per container?', 'Does `docker kill` affect named or anonymous volumes differently than stop?', 'What happens to network connections during the stop grace period?'] },
    ],
    gotcha: [
      '`docker pause` sends SIGSTOP which cannot be caught, blocked, or ignored by any process — even garbage collectors, health check threads, and database checkpoint processes freeze instantly. Network connections remain open but time out on the remote end, potentially causing upstream retries and cascading failures in distributed systems.',
      'A stopped container\'s writable layer and anonymous volumes persist indefinitely until explicitly removed with `docker rm -v`. Running `docker ps -a` reveals all stopped containers; over months they can consume gigabytes of disk. Use `docker container prune` or set up automated cleanup jobs.',
      '`docker exec` fails immediately on paused containers. You cannot debug, inspect, or snapshot a paused container without unpausing it first. This can be problematic during incident response if a container has been paused automatically by orchestration tools.',
      'The `--rm` flag explicitly prevents `docker commit`. Starting a container with `--rm` means it self-destructs on exit, so any attempt to create an image snapshot with `docker commit` fails because the container ID no longer exists. This surprises engineers who try to debug a crash by committing the container after it exits.',
    ],
    tradeoffs: [
      { pro: 'Containers start in milliseconds compared to VMs which require hypervisor boot, kernel init, and hardware initialization. This enables rapid scaling, fast rollouts, and efficient CI/CD pipelines where containers are created and destroyed frequently.', con: 'Containers share the host kernel, providing weaker isolation than VMs. A kernel-level exploit like Dirty Pipe or Dirty COW can compromise all containers on the host. For strict multi-tenant security boundaries, VMs or gVisor/Kata Containers are preferred.' },
      { pro: 'Cgroup resource limits prevent any single container from starving the host or creating noisy-neighbor problems in multi-tenant environments, ensuring predictable performance for all workloads.', con: 'Setting appropriate resource limits requires thorough profiling under production load. Overly restrictive limits cause OOM kills and throttling; limits set too high (or omitted) defeat the purpose of isolation. Getting this wrong in production causes hard-to-diagnose performance issues.' },
      { pro: 'Lifecycle commands (pause, unpause) enable fine-grained operational control — useful for checkpointing, freeze-thaw migrations, or temporarily halting workloads without resource deallocation.', con: 'Pausing a container does not free memory or CPU resources — frozen processes still hold their allocated memory and open file descriptors. For actual resource reclamation, you must stop the container rather than pausing it.' },
    ],
  },
};

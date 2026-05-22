import { snap } from '@/core/utils/scenarioShared';

function buildSchedulerSteps() {
  const steps = [];

  const s = {
    processes: [],
    readyQueue: [],
    currentProcess: null,
    gantt: [],
    events: [],
    metrics: { throughput: 0, avgWait: 0, avgTurnaround: 0, contextSwitches: 0 },
    vars: { algo: 'FCFS', quantum: 4, processCount: 0 },
  };

  snap(steps, s, 'CPU Scheduler: manages process execution on single core. FCFS + Round Robin.', 1);

  const procs = [
    { id: 'P1', state: 'ready', burst: 8, remaining: 8, arrival: 0 },
    { id: 'P2', state: 'ready', burst: 4, remaining: 4, arrival: 1 },
    { id: 'P3', state: 'ready', burst: 9, remaining: 9, arrival: 2 },
    { id: 'P4', state: 'ready', burst: 5, remaining: 5, arrival: 3 },
  ];

  s.processes = procs.map((p) => ({ ...p }));
  s.readyQueue = ['P1', 'P2', 'P3', 'P4'];
  s.vars = { algo: 'FCFS', quantum: 4, processCount: 4 };
  s.events.push({ msg: '4 processes arrive in ready queue', type: 'info' });
  snap(steps, s, 'READY QUEUE: Processes arrive. FCFS: P1 runs first (arrived at t=0).', 2);

  // P1 runs (FCFS) — 8ms burst
  s.currentProcess = 'P1';
  s.processes = s.processes.map((p) =>
    p.id === 'P1' ? { ...p, state: 'running', remaining: 4 } : p
  );
  s.readyQueue = ['P2', 'P3', 'P4'];
  s.gantt.push({ pid: 'P1', start: 0, end: 4 });
  s.metrics.contextSwitches = 1;
  s.events.push({ msg: 'P1 scheduled — runs 4ms (quantum)', type: 'ok' });
  snap(steps, s, 'P1 runs for time quantum 4ms. Round Robin preempts after quantum.', 3);

  // P1 preempted, P2 runs
  s.currentProcess = 'P2';
  s.processes = s.processes.map((p) =>
    p.id === 'P2' ? { ...p, state: 'running', remaining: 0 } : p.id === 'P1' ? { ...p, state: 'ready' } : p
  );
  s.readyQueue = ['P3', 'P4', 'P1'];
  s.gantt.push({ pid: 'P2', start: 4, end: 8 });
  s.metrics.contextSwitches = 2;
  s.events.push({ msg: 'P1 preempted (quantum expired). P2 runs next.', type: 'warn' });
  snap(steps, s, 'CONTEXT SWITCH: P1 saved to ready queue. P2 (burst=4) runs to completion.', 4);

  // P2 done, P3 runs
  s.currentProcess = 'P3';
  s.processes = s.processes.map((p) =>
    p.id === 'P3' ? { ...p, state: 'running', remaining: 5 } : p.id === 'P2' ? { ...p, state: 'terminated' } : p
  );
  s.readyQueue = ['P4', 'P1'];
  s.gantt.push({ pid: 'P2', start: 4, end: 8 });
  s.gantt.push({ pid: 'P3', start: 8, end: 12 });
  s.metrics.contextSwitches = 3;
  s.events.push({ msg: 'P2 completed. Turnaround: 7ms', type: 'ok' });
  snap(steps, s, 'P2 terminates. P3 runs. Ready queue: P4, P1 (round robin order).', 5);

  // P3 preempted, P4 runs, then P1, then P3 completes
  s.currentProcess = 'P4';
  s.processes = s.processes.map((p) =>
    p.id === 'P4' ? { ...p, state: 'running', remaining: 1 } : p.id === 'P3' ? { ...p, state: 'ready', remaining: 5 } : p
  );
  s.readyQueue = ['P1', 'P3'];
  s.gantt.push({ pid: 'P4', start: 12, end: 16 });
  s.metrics.contextSwitches = 4;
  s.events.push({ msg: 'P3 preempted at quantum.', type: 'warn' });
  snap(steps, s, 'P3 preempted. P4 runs (remaining 1ms).', 6);

  // P4 done, P1 finishes, P3 finishes
  s.currentProcess = 'P1';
  s.processes = s.processes.map((p) =>
    p.id === 'P1' ? { ...p, state: 'running', remaining: 0 } : p.id === 'P4' ? { ...p, state: 'terminated' } : p
  );
  s.readyQueue = ['P3'];
  s.gantt.push({ pid: 'P1', start: 16, end: 20 });
  snap(steps, s, 'P4 terminates. P1 resumes (remaining 4ms) and completes.', 7);

  s.currentProcess = 'P3';
  s.processes = s.processes.map((p) =>
    p.id === 'P3' ? { ...p, state: 'running', remaining: 0 } : p.id === 'P1' ? { ...p, state: 'terminated' } : p
  );
  s.readyQueue = [];
  s.gantt.push({ pid: 'P3', start: 20, end: 25 });
  snap(steps, s, 'P3 resumes and completes. All processes terminated.', 8);

  // Final stats
  s.currentProcess = null;
  s.processes = s.processes.map((p) => ({ ...p, state: 'terminated' }));
  s.metrics.throughput = 4;
  s.metrics.avgWait = 5;
  s.metrics.avgTurnaround = 11;
  s.metrics.contextSwitches = 5;
  s.events.push({ msg: 'All done. Avg turnaround: 11ms, throughput: 4 processes', type: 'ok' });
  snap(steps, s, 'SUMMARY: 4 processes completed. Avg waiting time: 5ms. Avg turnaround: 11ms. Context switches: 5.', 9);

  return steps;
}

export const SCHEDULER_CODE = [
  '// FCFS + Round Robin Scheduler (C pseudocode)',
  'struct process { int pid; int burst; int remaining; int state; };',
  '',
  'void schedule(struct process procs[], int n) {',
  '  queue ready = init_queue();',
  '  int quantum = 4;  // time slice in ms',
  '  int time = 0;',
  '',
  '  // Add all to ready queue',
  '  for (int i = 0; i < n; i++)',
  '    enqueue(&ready, &procs[i]);',
  '',
  '  while (!is_empty(ready)) {',
  '    struct process *p = dequeue(&ready);',
  '    int run = min(p->remaining, quantum);',
  '    p->remaining -= run;',
  '    time += run;',
  '    context_switch();',
  '',
  '    if (p->remaining > 0)',
  '      enqueue(&ready, p);  // preempted',
  '    else',
  '      terminate(p);       // done',
  '  }',
  '}',
];

export default {
  id: 'scheduler',
  label: 'CPU Scheduler',
  icon: '\u23f1\ufe0f',
  build: buildSchedulerSteps,
  code: SCHEDULER_CODE,
  language: 'c',
  metrics: [
    { key: 'throughput', label: 'Throughput', max: 10, color: 'var(--pod-running)' },
    { key: 'avgWait', label: 'Avg Wait (ms)', max: 15, color: 'var(--node-comparing)' },
    { key: 'avgTurnaround', label: 'Avg Turnaround (ms)', max: 20, color: 'var(--node-active)' },
    { key: 'contextSwitches', label: 'Ctx Switches', max: 10, color: 'var(--kafka-producer)' },
  ],
  topicContent: {
    concept: [
      { title: 'What is a CPU scheduler in simple terms?', content: 'A CPU scheduler decides which process runs on the CPU at any given moment. Think of it as a traffic cop directing cars (processes) through a single-lane tunnel (the CPU core). First-Come First-Served (FCFS) runs processes in arrival order, like a single checkout line. Round Robin gives each process a short time slice before rotating to the next, like a round-robin tournament where everyone gets a turn.' },
      { title: 'How CPU scheduling works — core mechanics', content: 'The scheduler maintains a ready queue of runnable processes. On each scheduling decision (timer interrupt, I/O wait, process exit), it selects the next process using a policy. FCFS is non-preemptive — once a process gets the CPU, it runs until it blocks or terminates. Round Robin is preemptive — after a fixed quantum (e.g., 4ms), the running process is forcibly moved to the back of the queue and the next one starts. Context switches save the PCB (program counter, registers, memory map) of the outgoing process and restore the incoming one.' },
      { title: 'Deep — internals & architecture', content: 'Linux CFS uses a red-black tree keyed by vruntime (virtual runtime) for O(log n) scheduling. Each process\'s vruntime advances at a rate proportional to its priority weight — higher priority tasks have slower vruntime growth and stay leftmost. The scheduler picks the leftmost node on each tick. CFS targets a scheduling latency (default 6ms) and divides it proportionally. Real-time schedulers (SCHED_FIFO, SCHED_RR) bypass CFS entirely with static priorities and no fairness guarantees.' },
    ],
    why: [
      'In production, scheduler choice directly impacts tail latency. A poorly tuned quantum causes 99th-percentile latency spikes in latency-sensitive services like Redis or NGINX. Web servers rely on CFS to balance interactive vs batch workloads automatically.',
      'Container orchestration (Kubernetes) enforces CPU limits via CFS quota and period. A container exceeding its quota is throttled, not killed. Understanding vruntime is essential for diagnosing CPU throttling in noisy-neighbor scenarios on shared Kubernetes nodes.',
      'Real-time systems (automotive, avionics, robotics) require predictable scheduling like rate-monotonic (RM) or earliest-deadline-first (EDF) to guarantee deadlines. A missed deadline can cause system failure, so schedulability analysis is performed offline using worst-case execution time (WCET).',
    ],
    interview: [
      { q: 'What is the convoy effect in FCFS scheduling?', a: 'A CPU-bound process runs first, forcing short I/O-bound processes to wait in the ready queue. I/O devices sit idle because no process is issuing I/O. When the CPU-bound process finally blocks on I/O, all the I/O-bound processes burst at once, causing device contention and poor utilization. CPU utilization drops significantly during the convoy.', followUps: ['How does Round Robin fix the convoy effect?', 'What is the optimal quantum for a given workload?'] },
      { q: 'How does the Linux CFS scheduler work?', a: 'CFS uses a red-black tree of tasks keyed by vruntime (virtual runtime). It picks the leftmost node (smallest vruntime) as the next task to run. Task priority is modeled via a weight value that scales vruntime — a higher priority task has a heavier weight, so its vruntime advances more slowly, keeping it leftmost. CFS aims for perfect fairness where each task gets an equal proportion of CPU time over any scheduling window.', followUps: ['What is the nice value and how does it affect vruntime?', 'How does CFS handle tasks that wake from sleep?'] },
      { q: 'What is the difference between preemptive and non-preemptive scheduling?', a: 'Non-preemptive (cooperative) scheduling lets a process run until it voluntarily yields the CPU — simple to implement but vulnerable to runaway processes that starve others by never yielding. Preemptive scheduling uses a timer interrupt to forcibly switch processes at quantum expiry or priority change. Most modern OS kernels use preemptive scheduling for responsiveness, and the kernel itself runs preemptible (CONFIG_PREEMPT) to reduce latency in interrupt handlers and system calls.', followUps: ['What is kernel preemption and why does it matter?', 'How does preemption affect spinlock safety in the kernel?'] },
    ],
    gotcha: [
      'Quantum too small → excessive context switching overhead (thrashing). Quantum too large → RR degenerates to FCFS with poor response time. The sweet spot depends on hardware: 4-8ms is typical for general-purpose systems.',
      'Priority inversion: a low-priority thread holding a lock blocks a higher-priority thread. Solved by priority inheritance (pthreads, Linux rt-mutex). This was the root cause of the Mars Pathfinder reset bug in 1997.',
      'CFS vruntime is 64-bit and can theoretically wrap around — Linux handles this by checking signed difference, but a process sleeping for years could briefly get infinite CPU on wakeup before its vruntime catches up.',
      'Scheduler determinism degrades under load: timer interrupt jitter from TSC calibration and CPU idle states causes small quantum variance that amplifies into measurable latency jitter in high-frequency trading workloads.',
    ],
    tradeoffs: [
      { pro: 'FCFS is simple, starvation-free, and has minimal scheduling overhead — ideal for batch systems where all jobs are CPU-bound and arrival order does not affect user experience.', con: 'The convoy effect destroys I/O throughput, it is poor for interactive workloads, and no preemption means a runaway process freezes the entire system until it yields.' },
      { pro: 'Round Robin provides fair CPU distribution, excellent response time for short processes, and preemption prevents any single process from monopolizing the core.', con: 'Context switch overhead adds latency, quantum tuning is a black art (too small causes thrash, too large hurts interactivity), and average turnaround time is higher than FCFS for CPU-bound jobs.' },
      { pro: 'Priority-based scheduling (MLFQ) uses multiple queues with different quanta, I/O-bound processes get high priority naturally, and feedback aging prevents starvation of low-priority tasks.', con: 'Complex to tune (number of queues, boost intervals, quantum per level), priority inversion requires inheritance protocols, and workload-specific performance can regress unexpectedly when the process mix changes.' },
    ],
  },
};

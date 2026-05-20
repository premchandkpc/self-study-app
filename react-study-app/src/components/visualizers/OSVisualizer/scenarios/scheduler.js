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
      { title: 'ELI5 — Kid-friendly analogy', content: 'CPU scheduler is like a movie theater with one screen. When many movies want to play, the scheduler decides which one runs next, for how long, and in what order. FCFS = first ticket holder goes first. Round Robin = each movie gets 10 minutes before the next one gets a turn.' },
      { title: 'Core — How it works', content: 'The CPU scheduler manages process execution on a single core. FCFS (First-Come First-Served) runs processes in arrival order, minimizing overhead but causing convoy effect. Round Robin assigns a fixed time quantum (e.g., 4ms); after quantum expires, the process is preempted and enqueued back. Context switches save/restore PCB state.' },
    ],
    why: ['In production, choosing the wrong scheduler can make your server feel sluggish under load. Web servers use O(1) or CFS (Completely Fair Scheduler) to balance interactive vs batch workloads.'],
    interview: [
      { question: 'What is the convoy effect in FCFS scheduling?', answer: 'A CPU-bound process runs first, forcing short I/O-bound processes to wait. I/O devices sit idle, then all I/O processes burst at once, causing device contention. CPU utilization drops.', followUps: ['How does Round Robin fix this?', 'What is the optimal quantum?'] },
      { question: 'How does the Linux CFS scheduler work?', answer: 'CFS uses a red-black tree of tasks keyed by vruntime (virtual runtime). It picks the leftmost node (smallest vruntime). Task priority is modeled via weight that scales vruntime. It aims for perfect fairness (ideal multitasking).', followUps: ['What is nice value?', 'How does CFS handle sleepers?'] },
    ],
    gotcha: ['Quantum too small → excessive context switching overhead (thrashing). Quantum too large → RR degenerates to FCFS with poor response time.', 'Priority inversion: a low-priority thread holding a lock blocks a higher-priority thread. Solved by priority inheritance (pthreads, Linux rt-mutex).'],
    tradeoffs: [
      { pro: 'FCFS: simple, starvation-free, minimal overhead', con: 'convoy effect, poor for interactive workloads, no preemption' },
      { pro: 'Round Robin: fair, good response time, preemptive', con: 'context switch overhead, quantum tuning needed, higher average turnaround' },
    ],
  },
};

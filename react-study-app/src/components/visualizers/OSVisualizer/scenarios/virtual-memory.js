import { snap } from '@/core/utils/scenarioShared';

function buildVirtualMemorySteps() {
  const steps = [];

  const s = {
    processes: [],
    physFrames: [],
    swap: [],
    events: [],
    metrics: { pageFaults: 0, swapIn: 0, swapOut: 0, memUsage: 0, activeProcs: 0 },
    vars: { totalVA: '16GB', physMem: '4GB', swapSize: '8GB', faultRate: '0%' },
  };

  snap(steps, s, 'Virtual Memory: each process sees 4GB private address space. Physical memory is shared.', 1);

  s.physFrames = [
    { id: 0, state: 'free', pid: null },
    { id: 1, state: 'free', pid: null },
    { id: 2, state: 'free', pid: null },
    { id: 3, state: 'free', pid: null },
  ];
  s.vars = { totalVA: '4GB/process', physMem: '4 physical frames', swapSize: '8GB', faultRate: '0%' };
  s.events.push({ msg: 'Physical memory: 4 frames. Each process has 4GB virtual space.', type: 'info' });
  snap(steps, s, '4 physical frames available. OS will use swap file when memory overcommits.', 1);

  // Process A starts
  s.processes = [{ id: 'A', vpn: 0, state: 'active' }];
  s.physFrames[0] = { id: 0, state: 'used', pid: 'A' };
  s.metrics.memUsage = 25;
  s.metrics.activeProcs = 1;
  s.events.push({ msg: 'Process A starts. Gets frame 0.', type: 'ok' });
  snap(steps, s, 'Process A allocated frame 0 for its first page. Memory usage: 25%.', 2);

  // Process B starts
  s.processes = [
    { id: 'A', vpn: 0, state: 'active' },
    { id: 'A', vpn: 1, state: 'active' },
    { id: 'B', vpn: 0, state: 'active' },
  ];
  s.physFrames[1] = { id: 1, state: 'used', pid: 'A' };
  s.physFrames[2] = { id: 2, state: 'used', pid: 'B' };
  s.metrics.memUsage = 75;
  s.metrics.activeProcs = 2;
  s.events.push({ msg: 'Process B starts. Gets frame 2.', type: 'ok' });
  snap(steps, s, 'Process B allocated. A has 2 frames, B has 1. 3 of 4 frames used.', 3);

  // Process C starts — need swap
  s.processes = [
    { id: 'A', vpn: 0, state: 'active' },
    { id: 'A', vpn: 1, state: 'active' },
    { id: 'B', vpn: 0, state: 'active' },
    { id: 'C', vpn: 0, state: 'active' },
  ];
  s.physFrames[3] = { id: 3, state: 'used', pid: 'C' };
  s.metrics.memUsage = 100;
  s.metrics.activeProcs = 3;
  s.events.push({ msg: 'Process C starts. All 4 frames in use.', type: 'warn' });
  snap(steps, s, 'Process C starts. All frames full. Next page request will need page fault + swap.', 4);

  // Page fault — swap out A's page, swap in C's page
  s.processes.push({ id: 'C', vpn: 1, state: 'fault' });
  s.swap.push({ id: 0, pid: 'A', vpn: 1 });
  s.physFrames[1] = { id: 1, state: 'swapped', pid: null };
  s.physFrames = s.physFrames.map((f) =>
    f.id === 1 ? { ...f, state: 'used', pid: 'C' } : f
  );
  s.processes = s.processes.map((p) =>
    p.id === 'C' && p.vpn === 1 ? { ...p, state: 'active' } : p
  );
  s.metrics.pageFaults = 1;
  s.metrics.swapOut = 1;
  s.metrics.swapIn = 1;
  s.vars = { totalVA: '4GB/process', physMem: '4/4 frames', swapSize: '8GB used: 1 page', faultRate: '25%' };
  s.events.push({ msg: 'PAGE FAULT: C needs VPN 1 → no free frame', type: 'error' });
  s.events.push({ msg: 'SWAP OUT: A VPN 1 → swap file (LRU victim)', type: 'warn' });
  s.events.push({ msg: 'SWAP IN: C VPN 1 → frame 1', type: 'ok' });
  snap(steps, s, 'DEMAND PAGING: C accesses VPN 1 → page fault. LRU victim = A VPN 1 (swapped out). Frame reassigned to C.', 5);

  // Thrashing
  s.processes.push({ id: 'D', vpn: 0, state: 'fault' });
  s.events.push({ msg: 'Process D starts. No free frames.', type: 'warn' });
  s.events.push({ msg: 'WARNING: 4 processes competing for 4 frames. High fault rate.', type: 'error' });
  s.metrics.activeProcs = 4;
  s.metrics.pageFaults = 3;
  s.vars = { totalVA: '4GB/process', physMem: '4/4 frames', swapSize: '8GB used: 3 pages', faultRate: '75%' };
  snap(steps, s, 'THRASHING: Too many processes. Page fault rate spikes. CPU spends time swapping instead of executing.', 6);

  s.events.push({ msg: `Stats: ${s.metrics.pageFaults} page faults, ${s.metrics.swapIn} swap in, ${s.metrics.swapOut} swap out`, type: 'info' });
  snap(steps, s, 'SUMMARY: Virtual memory enables overcommit. Demand paging loads pages on fault. Thrashing occurs when working set > RAM.', 7);

  return steps;
}

export const VM_CODE = [
  '// Virtual memory: demand paging',
  'void handle_page_fault(uint64_t vpn, struct process *proc) {',
  '  struct frame *frame = find_free_frame();',
  '',
  '  if (!frame) {',
  '    // No free frame — swap out a victim (LRU)',
  '    frame = lru_victim();',
  '    swap_out(frame->pid, frame->vpn);  // to swap file',
  '  }',
  '',
  '  // Load page from swap file (or disk)',
  '  swap_in(proc, vpn, frame);',
  '  proc->page_table[vpn].valid = 1;',
  '  proc->page_table[vpn].pfn = frame->id;',
  '}',
  '',
  '// Each process sees 4GB contiguous space',
  '// Physical memory: 4GB shared across all',
  '// Swap file: 8GB on disk',
];

export default {
  id: 'virtual-memory',
  label: 'Virtual Memory',
  icon: '\U0001f9e0',
  build: buildVirtualMemorySteps,
  code: VM_CODE,
  language: 'c',
  metrics: [
    { key: 'pageFaults', label: 'Page Faults', max: 10, color: 'var(--pod-crash)' },
    { key: 'swapIn', label: 'Swap In', max: 10, color: 'var(--pod-running)' },
    { key: 'swapOut', label: 'Swap Out', max: 10, color: 'var(--node-comparing)' },
    { key: 'memUsage', label: 'Mem Usage %', max: 100, color: 'var(--node-active)' },
    { key: 'activeProcs', label: 'Active Procs', max: 10, color: 'var(--kafka-producer)' },
  ],
  topicContent: {
    concept: [
      { title: 'ELI5 — Kid-friendly analogy', content: 'Virtual memory is like a hotel with a reservation system. Each guest (process) thinks they have their own suite (4GB address space). But the hotel only has 10 rooms (physical RAM). The front desk (OS) shuffles guests between rooms and storage (swap file). When a guest needs a room that\'s in storage, the desk swaps someone else out (page fault).' },
      { title: 'Core — How it works', content: 'Each process has a private virtual address space backed by physical frames and swap space. Demand paging loads pages lazily — only when accessed. When physical memory is full, a page replacement algorithm (LRU, Clock, etc.) evicts a victim page to swap. Thrashing occurs when the working set of all processes exceeds RAM.' },
    ],
    why: ['Virtual memory enables overcommit: you can run processes whose total virtual size exceeds physical RAM. It provides isolation (one process cannot read another\s memory) and simplifies memory management (contiguous virtual addresses despite fragmented physical).'],
    interview: [
      { question: 'What is thrashing and how do you prevent it?', answer: 'Thrashing: high page fault rate because the working set exceeds physical memory. CPU spends most time swapping in/out instead of executing. Prevention: working set model (OS tracks active pages per process), adjust degree of multiprogramming, or use memory pressure signals (Linux OOM killer, early page reclaim).', followUps: ['How does the working set model work?', 'What is the difference between thrashing and aging?'] },
      { question: 'How does demand paging differ from prepaging?', answer: 'Demand paging: load a page only when a fault occurs — lazy, minimal startup cost, but incurs faults on first access. Prepaging: predict and load pages before they are needed — reduces faults but may waste I/O on unused pages. Modern OSes use demand paging with clustered page faults (readahead).', followUps: ['How does Linux readahead work?', 'When is prepaging beneficial?'] },
    ],
    gotcha: ['Swap is NOT a replacement for RAM. Thrashing can make a system completely unresponsive — the CPU is 99% busy swapping. The fix is reducing multiprogramming, not adding more swap.', 'Anonymous pages (heap, stack) must be swapped to swap space. File-backed pages (mmap of a file) can be evicted directly — no swap needed, just re-read from disk.'],
    tradeoffs: [
      { pro: 'Demand paging — fast startup, efficient use of RAM', con: 'page fault latency on first access, unpredictable' },
      { pro: 'Prepaging/readahead — fewer faults, sequential perf', con: 'wasted I/O if pages not used, harder to tune' },
    ],
  },
};

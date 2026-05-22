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
  icon: 'U0001f9e0',
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
      { title: 'What is virtual memory in simple terms?', content: 'Virtual memory gives each process the illusion of having a large, private, contiguous address space (e.g., 4GB) while physical RAM is much smaller and shared. The OS maps virtual pages to physical frames on demand. When RAM fills up, unused pages are moved to a swap file on disk. This enables running more and larger programs than physical memory alone would allow.' },
      { title: 'How virtual memory works — core mechanics', content: 'Each process has a page table mapping virtual pages to physical frames. Demand paging loads pages lazily — only when the process accesses them (page fault). When physical memory is full, a page replacement algorithm (LRU, Clock) selects a victim page to evict to swap. The working set model tracks which pages each process actively uses. Thrashing occurs when total working set exceeds RAM, causing constant paging.' },
      { title: 'Deep — internals & architecture', content: 'Linux uses the MMU notifier and reverse mapping (rmap) to track which PTEs point to each physical page for efficient reclaim. The kernel\'s page reclaim path (kswapd) wakes when free memory drops below watermark and evicts pages using a Clock variant. Memory cgroups (cgroups v1/v2) enforce per-container limits with reclaim priority defined by swappiness. Overcommit heuristics allow allocating more virtual memory than exists, betting not all pages will be touched simultaneously.' },
    ],
    why: [
      'Virtual memory enables overcommit — you can run processes whose total virtual size exceeds physical RAM. It provides isolation (one process cannot read another\'s memory) and simplifies memory management by presenting contiguous virtual addresses despite fragmented physical memory.',
      'Java, .NET, and Go runtimes rely on virtual memory for garbage collection — marking bits and card tables are stored in mapped memory regions. The GC assumes a flat address space and lets the OS handle physical fragmentation transparently.',
      'Database engines (PostgreSQL shared_buffers, MySQL InnoDB buffer pool) use mmap with huge pages to reduce TLB pressure on multi-GB working sets. This directly impacts query throughput by 15-30% on memory-bound workloads.',
    ],
    interview: [
      { q: 'What is thrashing and how do you prevent it?', a: 'Thrashing occurs when the combined working set of all running processes exceeds physical RAM, causing a constant stream of page faults. The CPU spends most of its time swapping pages in and out instead of executing instructions, bringing system throughput to near zero. Prevention strategies include the working set model (OS tracks active pages per process and limits multiprogramming), adjusting the degree of multiprogramming, and using memory pressure signals like the Linux OOM killer or early page reclaim thresholds.', followUps: ['How does the working set model determine the optimal number of processes?', 'What is the difference between thrashing and normal page aging?'] },
      { q: 'How does demand paging differ from prepaging?', a: 'Demand paging loads a page only when a page fault occurs — it is lazy, has minimal startup cost, but incurs faults on every first access to each page. Prepaging predicts which pages will be needed and loads them before they are accessed — it reduces faults but may waste I/O bandwidth on pages that are evicted before use. Modern OSes use demand paging as the baseline with clustered page faults (readahead) for sequential access patterns, combining the benefits of both approaches.', followUps: ['How does Linux readahead detect sequential access patterns?', 'When is prepaging clearly beneficial over demand paging?'] },
      { q: 'How does the Linux OOM killer decide which process to kill?', a: 'When memory is exhausted and swap is full, the OOM killer selects a victim using a badness score (oom_score) based on several factors: process size (RSS + swap), CPU time consumed, runtime duration, whether it is a root or user process, and child process count. The score can be manually adjusted via oom_score_adj. The heuristic favors killing the largest memory consumer to free the most memory quickly, but it avoids killing init, kernel threads, or processes that are already dumping core.', followUps: ['What is oom_score_adj used for in production deployments?', 'How does cgroup memory limit enforcement trigger OOM within a container?'] },
    ],
    gotcha: [
      'Swap is NOT a replacement for RAM. Thrashing can make a system completely unresponsive — the CPU is 99% busy swapping. The fix is reducing multiprogramming, not adding more swap space.',
      'Anonymous pages (heap, stack) must be swapped to swap space. File-backed pages (mmap of a file) can be evicted directly without swap — just re-read from disk when needed again, which is faster than swap I/O.',
      'Memory overcommit can cause the OOM killer to terminate processes even when total allocated virtual memory is far below RAM+swap — the kernel overcommits assuming not all pages are touched simultaneously, and a worst-case workload can violate this assumption.',
      'Zswap and zram compress swapped pages in RAM before writing to disk, reducing swap I/O at the cost of CPU compression cycles. They help on systems with limited disk I/O but can cause latency spikes under heavy memory pressure when compression falls behind.',
    ],
    tradeoffs: [
      { pro: 'Demand paging provides fast process startup with no preloading, efficient RAM utilization because only active pages are resident, and enables overcommit for better resource utilization.', con: 'Page fault latency on first access to each page causes unpredictable slowdowns, and streaming through large datasets triggers many faults that degrade throughput.' },
      { pro: 'Prepaging and readahead reduce fault rates for sequential access patterns like file reads and binary loading, improving throughput by 2-5x on large sequential workloads.', con: 'Wasted I/O bandwidth if prefetched pages are evicted before use, and aggressive readahead pollutes the page cache with cold data that evicts hot pages.' },
      { pro: 'Memory compaction and transparent huge pages (THP) reduce TLB misses and page walk depth by promoting 4KB pages to 2MB or 1GB pages for better TLB coverage.', con: 'Compaction CPU cost can cause latency spikes of hundreds of milliseconds, and defragmentation failures trigger costly synchronous reclaim under memory pressure.' },
    ],
  },
};

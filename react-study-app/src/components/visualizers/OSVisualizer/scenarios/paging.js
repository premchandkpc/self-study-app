import { snap } from '@/core/utils/scenarioShared';

function buildPagingSteps() {
  const steps = [];

  const s = {
    pageTable: [],
    tlb: [],
    tlbHit: true,
    steps: [],
    events: [],
    metrics: { pageFaults: 0, tlbHits: 0, tlbMisses: 0, pageTableSize: 0 },
    vars: { vpn: '', pfn: '', offset: '', tlbResult: '' },
  };

  snap(steps, s, 'Paging: MMU translates virtual addresses to physical using page table + TLB.', 1);

  s.pageTable = [
    { vpn: 0, pfn: 3, valid: true, dirty: false },
    { vpn: 1, pfn: 7, valid: true, dirty: false },
    { vpn: 2, pfn: 1, valid: true, dirty: true },
    { vpn: 3, pfn: 0, valid: false, dirty: false },
  ];
  s.tlb = [
    { vpn: 0, pfn: 3 },
    { vpn: 1, pfn: 7 },
  ];
  s.metrics.pageTableSize = 4;
  s.events.push({ msg: 'Page table loaded: 4 entries. TLB primed with 2 entries.', type: 'info' });
  snap(steps, s, 'MMU initialized. TLB caches recent translations. Page table in memory.', 1);

  // TLB HIT
  s.steps = [
    { type: 'cpu-issue', vpn: 0, pfn: null },
    { type: 'tlb-lookup', vpn: 0, pfn: 3 },
    { type: 'tlb-hit', vpn: 0, pfn: 3 },
  ];
  s.tlbHit = true;
  s.metrics.tlbHits = 1;
  s.vars = { vpn: '0', pfn: '3', offset: '0x1A4', tlbResult: 'HIT' };
  s.events.push({ msg: 'CPU issues VA 0x01A4 → VPN 0, offset 0x1A4', type: 'info' });
  s.events.push({ msg: 'TLB HIT: VPN 0 → PFN 3', type: 'ok' });
  snap(steps, s, 'TLB HIT: VPN 0 found in TLB. Physical address = PFN 3 + offset 0x1A4. Fast path (~1 cycle).', 2);

  // TLB MISS
  s.steps = [
    { type: 'cpu-issue', vpn: 2, pfn: null },
    { type: 'tlb-lookup', vpn: 2, pfn: null },
    { type: 'tlb-miss', vpn: 2, pfn: null },
    { type: 'page-walk', vpn: 2, pfn: 1 },
  ];
  s.tlbHit = false;
  s.metrics.tlbMisses = 1;
  s.vars = { vpn: '2', pfn: '1', offset: '0x0B8', tlbResult: 'MISS → page walk' };
  s.events.push({ msg: 'CPU issues VA 0x20B8 → VPN 2, offset 0x0B8', type: 'info' });
  s.events.push({ msg: 'TLB MISS: VPN 2 not in TLB. Walking page table...', type: 'warn' });
  snap(steps, s, 'TLB MISS: VPN 2 not cached. MMU walks page table in memory (4-level radix tree).', 3);

  s.tlb.push({ vpn: 2, pfn: 1 });
  s.metrics.tlbHits = 1;
  s.vars = { vpn: '2', pfn: '1', offset: '0x0B8', tlbResult: 'MISS → walk → PFN 1' };
  s.events.push({ msg: 'Page walk complete: VPN 2 → PFN 1 (valid, dirty)', type: 'ok' });
  s.events.push({ msg: 'TLB updated with VPN 2 → PFN 1 (LRU eviction)', type: 'info' });
  snap(steps, s, 'Page walk succeeded. Entry cached in TLB. Physical address = PFN 1 + offset 0x0B8.', 4);

  // PAGE FAULT
  s.steps = [
    { type: 'cpu-issue', vpn: 3, pfn: null },
    { type: 'tlb-lookup', vpn: 3, pfn: null },
    { type: 'tlb-miss', vpn: 3, pfn: null },
    { type: 'page-walk', vpn: 3, pfn: 0 },
    { type: 'page-fault', vpn: 3, pfn: null },
  ];
  s.vars = { vpn: '3', pfn: '-', offset: '0x0D0', tlbResult: 'PAGE FAULT' };
  s.events.push({ msg: 'CPU issues VA 0x30D0 → VPN 3, offset 0x0D0', type: 'info' });
  s.events.push({ msg: 'TLB MISS → page walk → VPN 3 valid=0', type: 'warn' });
  s.events.push({ msg: 'PAGE FAULT! VPN 3 not in physical memory.', type: 'error' });
  snap(steps, s, 'PAGE FAULT: VPN 3 valid bit = 0. MMU raises exception. OS handles: swap in from disk.', 5);

  // Page replacement — LRU
  s.pageTable[3] = { vpn: 3, pfn: 7, valid: true, dirty: false };
  s.tlb.push({ vpn: 3, pfn: 7 });
  s.steps.push({ type: 'swap-in', vpn: 3, pfn: 7 });
  s.metrics.pageFaults = 1;
  s.metrics.tlbMisses = 2;
  s.vars = { vpn: '3', pfn: '7', offset: '0x0D0', tlbResult: 'FAULT → swapped in → PFN 7' };
  s.events.push({ msg: 'OS swaps in page from disk → PFN 7 assigned', type: 'ok' });
  s.events.push({ msg: 'Page table updated: VPN 3 → PFN 7, valid=1', type: 'ok' });
  snap(steps, s, 'PAGE FAULT HANDLED: OS reads from swap. Page table updated. Retry instruction.', 6);

  s.events.push({ msg: `Final state: ${s.metrics.tlbHits} hits, ${s.metrics.tlbMisses} misses, ${s.metrics.pageFaults} fault`, type: 'info' });
  snap(steps, s, 'SUMMARY: TLB hit ratio = 50%. Page faults = 1. Page replacement policy: LRU.', 7);

  return steps;
}

export const PAGING_CODE = [
  '// MMU address translation (pseudocode)',
  'struct pt_entry { uint64_t pfn; bool valid; bool dirty; };',
  '',
  'uint64_t translate(uint64_t va) {',
  '  uint64_t vpn = va >> 12;        // extract VPN',
  '  uint64_t offset = va & 0xFFF;   // page offset (4KB)',
  '',
  '  // TLB lookup (fast path)',
  '  if (tlb_lookup(vpn, &pfn))',
  '    return (pfn << 12) | offset;  // TLB hit',
  '',
  '  // Page table walk (slow path)',
  '  struct pt_entry *pte = walk_page_table(vpn);',
  '',
  '  if (!pte->valid) {',
  '    handle_page_fault(vpn);        // trap to OS',
  '    pte = walk_page_table(vpn);    // retry after swap',
  '  }',
  '',
  '  tlb_insert(vpn, pte->pfn);      // cache it',
  '  return (pte->pfn << 12) | offset;',
  '}',
];

export default {
  id: 'paging',
  label: 'Paging & TLB',
  icon: '\U0001f4c4',
  build: buildPagingSteps,
  code: PAGING_CODE,
  language: 'c',
  metrics: [
    { key: 'tlbHits', label: 'TLB Hits', max: 10, color: 'var(--pod-running)' },
    { key: 'tlbMisses', label: 'TLB Misses', max: 10, color: 'var(--node-comparing)' },
    { key: 'pageFaults', label: 'Page Faults', max: 5, color: 'var(--pod-crash)' },
    { key: 'pageTableSize', label: 'PT Entries', max: 10, color: 'var(--node-active)' },
  ],
  topicContent: {
    concept: [
      { title: 'What is paging in simple terms?', content: 'Paging is a memory management scheme that lets programs use more memory than physically available. The virtual address space is divided into fixed-size pages (typically 4KB). The MMU translates virtual addresses to physical frames using a page table. A TLB caches recent translations for speed. When a page is not in RAM, a page fault occurs and the OS loads it from disk (swap).' },
      { title: 'How paging works — core mechanics', content: 'The MMU splits a virtual address into a virtual page number (VPN) and offset. The TLB is checked first — if it has the VPN→PFN mapping, the physical address is formed in ~1 cycle. On a TLB miss, the MMU walks the multi-level page table in memory (4 loads on x86-64). If the page table entry is invalid (valid bit = 0), a page fault exception is raised. The OS swaps in the page from disk, updates the page table, and retries the faulting instruction.' },
      { title: 'Deep — internals & architecture', content: 'x86-64 uses a 4-level radix tree (PML4 → PDPT → PD → PT) with 48-bit virtual addresses. Each level indexes 9 bits (512 entries). A TLB miss costs 4-12 memory references depending on cache state. Modern CPUs have split TLBs (L1 instruction/data: 64 entries each, L2 unified: ~1500 entries) and support 2MB (huge) and 1GB (gigantic) pages to reduce walk depth. Nested paging (EPT/NPT) adds a second layer of page tables for virtualized guests, multiplying walk cost.' },
    ],
    why: [
      'Paging lets each process see a contiguous address space while physical memory is fragmented. Without it, memory protection, sharing, and overcommit would be impossible. TLB misses cost 10-100 cycles; page faults cost millions — understanding the hierarchy is critical for performance tuning.',
      'Database systems (PostgreSQL, MySQL) use huge pages to reduce TLB misses for multi-GB buffer pools. A 32GB buffer pool with 4KB pages requires 8M TLB entries; with 2MB pages it needs only 16K — a 500x reduction in TLB pressure that directly improves query throughput.',
      'Cloud providers rely on nested paging (EPT on Intel, NPT on AMD) for VM memory virtualization. Without hardware-assisted nested paging, every guest page walk would require 24+ memory accesses, causing severe performance degradation in virtualized environments.',
    ],
    interview: [
      { q: 'What is the difference between a TLB miss and a page fault?', a: 'A TLB miss occurs when the translation for a virtual address is not cached in the TLB, but the page table entry is valid and the page is in physical memory. The MMU walks the page table to find the mapping and caches it in the TLB — cost is about 10-100 cycles. A page fault occurs when the page table entry is invalid (valid bit = 0), meaning the page is not in physical memory. The OS must swap the page in from disk — cost is about 10 million cycles.', followUps: ['What is a major vs minor page fault?', 'How does a TLB shootdown synchronize TLBs across cores?'] },
      { q: 'How do multi-level page tables save memory compared to a flat page table?', a: 'A flat page table for 32-bit address space with 4KB pages requires 2^20 entries × 4 bytes = 4MB per process — allocated upfront regardless of actual usage. Multi-level page tables (4-level radix tree on x86-64) only allocate top-level entries (PML4) and lower levels for regions that are actually mapped. Unused virtual address ranges have null pointers in the top-level table, consuming zero memory for the lower levels.', followUps: ['What is the overhead of walking a 4-level page table on a TLB miss?', 'How do huge pages reduce walk depth?'] },
      { q: 'What is a TLB shootdown and when does it occur?', a: 'A TLB shootdown is the process of invalidating TLB entries across all CPU cores when a page table mapping changes (e.g., munmap, mprotect, page migration). The OS sends an inter-processor interrupt (IPI) to each core, which executes a TLB flush for the affected address space. On large machines with hundreds of cores, broadcast IPIs cause significant overhead. Modern kernels use lazy TLB invalidation (flush on next context switch) and per-CPU TLB flush vectors to mitigate the cost.', followUps: ['What is lazy TLB invalidation?', 'How does ASID (Address Space Identifier) reduce shootdown frequency?'] },
    ],
    gotcha: [
      'TLB coverage is limited — a small TLB can only cache a fraction of the working set. Large working sets cause frequent TLB misses regardless of the replacement algorithm, making page size the dominant factor.',
      'Page table walk on x86-64 uses 4 memory loads per walk (L4→L3→L2→L1). A TLB miss is actually 4-5 cache misses, not a single memory access. This makes TLB misses expensive even without a page fault.',
      'Self-modifying code and JIT compilers (V8, JVM) trigger frequent TLB shootdowns because modified pages need permission changes, causing IPI storms on large multi-socket systems.',
      'Meltdown/Spectre vulnerabilities exploited TLB behavior: speculative execution could access kernel pages cached in the TLB even when user-mode page tables (KPTI) should have prevented it, leaking kernel memory across privilege boundaries.',
    ],
    tradeoffs: [
      { pro: 'Large pages (2MB/1GB) dramatically improve TLB coverage, reduce page walks, and lower TLB miss rates for big-memory applications like databases and VMs.', con: 'Increased internal fragmentation (worst case: 1GB wasted per mapping), harder physical memory allocation requiring contiguous 2MB chunks, and higher swap I/O overhead per page.' },
      { pro: 'Small pages (4KB) provide fine-grained allocation reducing waste, simpler memory management with no fragmentation issues, and smaller per-page swap I/O cost.', con: 'More TLB entries needed to cover the same working set, deeper page walks from more entries, and higher TLB miss rates causing performance degradation for large heaps.' },
      { pro: 'Transparent Huge Pages (THP) automatically promote 4KB to 2MB pages without application changes, providing most huge-page benefits transparently to unmodified applications.', con: 'The khugepaged daemon adds CPU overhead, memory compaction for defragmentation can cause latency spikes of hundreds of milliseconds, and some applications see worse performance due to increased page fault latency.' },
    ],
  },
};

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
      { title: 'ELI5 — Kid-friendly analogy', content: 'Paging is like a library with limited shelf space. Books (pages) live in storage (disk). When you want a book, the librarian (MMU) checks the catalog (page table). If the book is on a shelf (RAM), you get it fast. If not, the librarian fetches it from storage (page fault). The TLB is a sticky note of recent books you checked.' },
      { title: 'Core — How it works', content: 'The MMU translates virtual addresses into physical ones by splitting the VA into VPN (virtual page number) and offset. The TLB caches VPN→PFN mappings for fast translation (~1 cycle). On a TLB miss, the MMU walks the multi-level page table in memory. On a page fault (invalid PTE), the OS traps, swaps in from disk, and retries.' },
    ],
    why: ['Paging lets each process see a contiguous 4GB address space while physical memory is fragmented and shared. Without it, memory protection, sharing, and overcommit would be impossible. TLB misses cost 10-100 cycles; page faults cost millions.'],
    interview: [
      { question: 'What is the difference between a TLB miss and a page fault?', answer: 'TLB miss: translation not cached but the page is in memory. Walk page table → cache in TLB. Cost: ~10 cycles. Page fault: page not in physical memory (valid bit = 0). OS must swap in from disk. Cost: ~10M cycles. TLB misses are fast; page faults are slow.', followUps: ['What is a major vs minor page fault?', 'How does a TLB shootdown work?'] },
      { question: 'How do multi-level page tables save memory?', answer: 'Instead of one flat page table per process (4MB for 32-bit, 4KB pages), multi-level tables only allocate entries for used regions. A 4-level radix tree (x86-64) has top-level entries allocated on demand. Unused ranges have null pointers and consume no memory.', followUps: ['What is the overhead of walking a 4-level page table?', 'How does huge pages (2MB/1GB) help?'] },
    ],
    gotcha: ['TLB coverage: a small TLB can only cache a fraction of the working set. Large working sets cause frequent misses regardless of algorithm.', 'Page table walk on x86-64 uses 4 memory loads per walk (L4→L3→L2→L1). A TLB miss is actually 4-5 cache misses, not 1.'],
    tradeoffs: [
      { pro: 'Large pages (2MB) — better TLB coverage, faster walks', con: 'internal fragmentation, harder memory management' },
      { pro: 'Small pages (4KB) — fine-grained allocation, less waste', con: 'more TLB entries needed, deeper page walks' },
    ],
  },
};

import { snap } from '@/core/utils/scenarioShared';

function buildVolatileSteps() {
  const steps = [];

  const s = {
    threads: [
      { id: 'Main', state: 'running', cacheLine: { val: '' }, action: '' },
      { id: 'Worker', state: 'new', cacheLine: { val: '' }, action: '' },
    ],
    mainMemory: { val: '' },
    happensBefore: [],
    events: [],
    metrics: { writes: 0, reads: 0, barriers: 0 },
    vars: { sharedVal: '', mainVal: '', thread1Cache: '', thread2Cache: '', issue: '' },
  };

  snap(steps, s, 'Two threads share a boolean flag "running = true". Without volatile, Worker may cache the flag and never see Main update it.', 1);

  s.mainMemory.val = 'true';
  s.threads[0].cacheLine = { val: 'true' };
  s.threads[0].action = 'writes running=true';
  s.vars = { sharedVal: 'running=true', mainVal: 'true', thread1Cache: 'true', thread2Cache: '', issue: 'visibility' };
  snap(steps, s, 'Main thread writes running = true. Without volatile, the value may stay in Main\'s CPU cache. Worker thread may still read stale value from its own cache.', 2);

  s.threads[1].state = 'running';
  s.threads[1].cacheLine = { val: '' };
  s.threads[1].action = 'reads running → ∅ (cached stale)';
  s.threads[0].action = 'running = true (in cache)';
  s.vars = { sharedVal: 'running=?', mainVal: 'true', thread1Cache: 'true', thread2Cache: '∅ (stale)', issue: 'Worker sees false!' };
  snap(steps, s, 'Worker thread reads "running": reads from its own CPU cache line → sees old value "" (stale). Main thread\'s write is invisible. This is the CPU cache coherence problem.', 3);

  s.events.push({ msg: 'CPU cache coherence: write not propagated', type: 'warn' });
  s.events.push({ msg: 'Without volatile → infinite loop!', type: 'error' });
  snap(steps, s, 'Worker keeps looping because it never sees "running = false". Classic concurrency bug. volatile keyword prevents this.', 4);

  s.happensBefore.push({ from: 'Main', to: 'Worker', type: 'volatile-write→volatile-read' });
  s.events.push({ msg: 'volatile: memory barrier inserted', type: 'info' });
  s.events.push({ msg: 'store-load barrier: flush cache to main memory', type: 'ok' });
  s.metrics.barriers = 1;
  s.vars = { sharedVal: 'running=true (volatile)', mainVal: 'true', thread1Cache: 'true', thread2Cache: '', issue: 'volatile fixes visibility' };
  snap(steps, s, 'volatile running → JVM inserts a memory barrier (store-load) on write. Main thread\'s write flushes cache to main memory. Worker\'s volatile read reads from main memory, not cache.', 5);

  s.mainMemory.val = 'false';
  s.threads[0].cacheLine = { val: 'false' };
  s.threads[0].action = 'writes running=false';
  s.threads[1].cacheLine = { val: 'false' };
  s.threads[1].action = 'reads running → false (from main memory)';
  s.events.push({ msg: 'volatile write → happens-before → volatile read', type: 'ok' });
  s.events.push({ msg: 'Worker sees change, exits loop', type: 'ok' });
  s.metrics.writes = 2;
  s.metrics.reads = 2;
  s.vars = { sharedVal: 'running=false', mainVal: 'false', thread1Cache: 'false', thread2Cache: 'false', issue: 'visibility guaranteed' };
  snap(steps, s, 'Main writes running=false (volatile). Memory barrier: cache flushed. Worker reads running → sees false (happens-before guaranteed). Worker exits. volatile ensures visibility but NOT atomicity. For atomicity + visibility, use synchronized or AtomicBoolean.', 6);

  return steps;
}

const VOLATILE_CODE = [
  'class Runner {',
  '  volatile boolean running = true;',
  '',
  '  void stop() { running = false; }  // volatile write → barrier',
  '',
  '  void run() {',
  '    while (running) {  // volatile read → from main memory',
  '      // work...',
  '    }',
  '  }',
  '}',
  '',
  '// volatile guarantees:',
  '//   ✓ visibility (writes seen by other threads)',
  '//   ✗ atomicity (++count still needs sync)',
  '//   ✗ mutual exclusion',
  '',
  '// Memory barrier types:',
  '//   volatile write → StoreLoad barrier',
  '//   volatile read  → LoadLoad + LoadStore',
  '',
  '// double-checked locking:',
  '//   private volatile Singleton instance;',
  '//   if (instance == null) { synchronized(...)',
  '//   if (instance == null) instance = new... }',
];

export default {
  id: 'volatile',
  label: 'Volatile',
  icon: '\u26A1',
  build: buildVolatileSteps,
  code: VOLATILE_CODE,
  language: 'Java',
  metrics: [
    { key: 'writes', label: 'Volatile Writes', max: 3, color: 'var(--node-active)' },
    { key: 'reads', label: 'Volatile Reads', max: 3, color: 'var(--pod-running)' },
    { key: 'barriers', label: 'Barriers', max: 2, color: 'var(--node-comparing)' },
  ],
  topicContent: {
    concept: [
      { title: 'ELI5 — Whiteboard vs Sticky Notes', content: 'Two workers share a whiteboard (main memory), but each has sticky notes (CPU cache). If they write on sticky note only, other worker sees old whiteboard value. volatile says: always write to whiteboard. synchronized says: only one worker at whiteboard at a time.' },
      { title: 'Core — Visibility & Ordering', content: 'JMM: volatile guarantees (1) Visibility — write immediately visible to all threads (bypasses CPU caches). (2) Ordering — memory barriers prevent reordering across volatile access. Does NOT guarantee atomicity for compound ops. volatile int x; x++ is still 3 ops (read-increment-write) and can race. Use AtomicInteger for compound ops.' },
      { title: 'Edge — Happens-Before Rules', content: 'volatile write happens-before volatile read. Key HB rules: (1) Program order. (2) Monitor unlock => lock. (3) volatile write => read. (4) Thread.start() => first action. (5) Last action => Thread.join(). HB is transitive. Double-checked locking ONLY safe with volatile field (Java 5+).' },
      { title: 'Deep — Memory Barriers', content: 'volatile write inserts StoreStore + StoreLoad barriers. volatile read inserts LoadLoad + LoadStore. x86 TSO means only StoreLoad needed in practice (~40 cycles). ARM needs explicit dmb instruction. VarHandle exposes acquire/release/opaque/plain memory order for lock-free structures.' },
    ],
    why: [
      'JMM bugs are hardest to reproduce — appear only on multi-core under load, disappear with debuggers, differ across JVM versions and CPU architectures.',
      'Every senior Java engineer must reason about visibility and happens-before.',
      'Double-checked locking with volatile is the canonical singleton pattern for thread-safe lazy initialization.',
    ],
    interview: [
      { question: 'What does volatile guarantee and NOT guarantee?', answer: 'Guarantees: (1) Visibility — write immediately visible. (2) Ordering — memory barriers prevent reordering. Does NOT guarantee: atomicity for compound ops. volatile int x; x++ still races. Use AtomicInteger for atomic compound ops.', followUps: ['What memory barriers does volatile insert?', 'Is double-checked locking safe with volatile?'] },
      { question: 'Explain happens-before in JMM.', answer: 'If A happens-before B, all effects of A visible to B. Key rules: (1) Program order (same thread). (2) Monitor unlock => lock. (3) volatile write => read. (4) Thread.start() => first action. (5) Last action => Thread.join(). HB is transitive. Without HB, JVM may cache stale values or reorder stores.', followUps: ['Can visibility exist without happens-before?', 'What is a data race?'] },
      { question: 'When is double-checked locking safe?', answer: 'Only when instance field is volatile. Without volatile, JVM may reorder: (1) allocate memory, (2) publish reference, (3) initialize fields. Second thread sees non-null but uninitialized object. volatile adds StoreStore before store and StoreLoad after — prevents publish before init.', followUps: ['What alternative avoids locking?', 'Enum singleton vs volatile DCL?'] },
    ],
    gotcha: [
      'volatile on long/double: reads/writes NOT atomic on 32-bit JVMs without volatile.',
      'volatile does NOT prevent StoreLoad reordering on ARM. x86 does automatically (TSO), ARM needs explicit dmb instruction.',
      'Double-checked locking without volatile: JIT/CPU may publish reference before object fully initialized.',
      'Piggybacking happens-before: write x, then write volatile flag; read volatile flag, then read x — x visibility guaranteed even though x is non-volatile.',
      'ThreadLocal does NOT provide happens-before between threads. Each thread\'s ThreadLocal is private.',
      'AtomicReference.set() has volatile semantics. lazySet() has only release semantics (no StoreLoad fence — cheaper).',
    ],
    tradeoffs: [
      { pro: 'Zero-overhead read in x86 TSO (no extra fence)', con: 'Write costs StoreLoad fence (~40 cycles)' },
      { pro: 'Simple, lightweight visibility guarantee', con: 'No atomicity for compound ops — easy to misuse' },
      { pro: 'VarHandle: fine-grained acquire/release control', con: 'synchronized still needed for critical sections' },
    ],
  },
};

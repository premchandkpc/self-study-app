import { snap } from '@/core/utils/scenarioShared';

function simpleHash(key, cap) {
  let h = 0;
  for (let i = 0; i < String(key).length; i++) h = (h * 31 + String(key).charCodeAt(i)) >>> 0;
  return h % cap;
}
function entry(key, val, state = 'idle') { return { key, val, state }; }

// ConcurrentHashMap: 4 segments, each with 4 buckets
function makeCHM() {
  return {
    collectionType: 'concurrenthashmap',
    segments: Array.from({ length: 4 }, (_, i) => ({
      id: i, locked: null,
      buckets: Array.from({ length: 4 }, () => []),
    })),
    size: 0,
    threads: [],
    ops: [],
    exception: null,
  };
}

function chmPut(s, key, val) {
  const globalHash = simpleHash(key, 16);
  const segIdx = Math.floor(globalHash / 4);
  const bucketIdx = globalHash % 4;
  const seg = s.segments[segIdx];
  const chain = seg.buckets[bucketIdx];
  const existing = chain.findIndex(e => e.key === key);
  if (existing >= 0) seg.buckets[bucketIdx][existing] = { ...seg.buckets[bucketIdx][existing], val, state: 'updated' };
  else { seg.buckets[bucketIdx] = [...chain, entry(key, val, 'new')]; s.size++; }
  return { segIdx, bucketIdx };
}

function resetCHM(s) {
  s.segments = s.segments.map(seg => ({
    ...seg, locked: null,
    buckets: seg.buckets.map(b => b.map(e => ({ ...e, state: 'idle' }))),
  }));
  s.threads = s.threads.map(t => ({ ...t, state: 'idle', segment: -1, action: '' }));
}

// CopyOnWriteArrayList helpers
function makeCOW(initial = []) {
  return {
    collectionType: 'copyonwritearraylist',
    main: initial.map(v => ({ val: v, state: 'idle' })),
    copy: null,
    threads: [],
    ops: [],
    exception: null,
  };
}

// ── Flow: ConcurrentHashMap concurrent segment-level locking ─────────────────
function buildCHMFlow() {
  const steps = [];
  const s = makeCHM();

  s.threads = [
    { id: 'T1', name: 'Thread-1', state: 'idle', segment: -1, action: '' },
    { id: 'T2', name: 'Thread-2', state: 'idle', segment: -1, action: '' },
    { id: 'T3', name: 'Thread-3', state: 'idle', segment: -1, action: '' },
  ];

  snap(steps, s, 'ConcurrentHashMap (Java 7: 16 segments each with lock). Puts to different segments proceed in parallel. No global lock.', 0);

  // T1 locks segment 0
  s.threads[0].state = 'running'; s.threads[0].action = 'put("a", 1)'; s.threads[0].segment = 0;
  s.segments[0].locked = 'T1';
  const { segIdx: si1, bucketIdx: bi1 } = chmPut(s, 'a', 1);
  s.segments[si1].buckets[bi1][s.segments[si1].buckets[bi1].length - 1].state = 'new';
  snap(steps, s, 'T1: put("a", 1). Hashes to segment[0]. Lock segment[0] (ReentrantLock). Other segments remain FREE.', 1);

  // T2 locks segment 2 — NO conflict
  s.threads[1].state = 'running'; s.threads[1].action = 'put("m", 2)'; s.threads[1].segment = 2;
  s.segments[2].locked = 'T2';
  const { segIdx: si2, bucketIdx: bi2 } = chmPut(s, 'm', 2);
  s.segments[si2].buckets[bi2][s.segments[si2].buckets[bi2].length - 1].state = 'new';
  snap(steps, s, 'T2: put("m", 2). Hashes to segment[2]. Locks segment[2]. T1 still holds segment[0]. Both execute in PARALLEL! No contention.', 2);

  // T3 tries same segment as T1
  s.threads[2].state = 'waiting'; s.threads[2].action = 'put("b", 3) → waiting for seg[0]'; s.threads[2].segment = 0;
  s.ops.push({ msg: 'T3: hashes to seg[0], already locked by T1!', type: 'warn' });
  snap(steps, s, 'T3: put("b", 3). Also hashes to segment[0]. T1 holds lock → T3 BLOCKS. Only 1-in-16 chance of conflict (1 segment = 1/16 of keyspace).', 3);

  // T1 unlocks
  s.segments[0].locked = null; s.threads[0].state = 'idle'; s.threads[0].action = 'done';
  s.threads[2].state = 'running'; s.threads[2].action = 'acquired seg[0]'; s.threads[2].segment = 0;
  s.segments[0].locked = 'T3';
  const { segIdx: si3, bucketIdx: bi3 } = chmPut(s, 'b', 3);
  snap(steps, s, 'T1 releases seg[0] lock. T3 acquires it, puts "b". Java 8: no segments — per-bucket CAS + synchronized on first node. Even lower contention.', 4);

  resetCHM(s);
  s.ops = [
    { msg: 'Java 7: 16 segment ReentrantLocks', type: 'ok' },
    { msg: 'Java 8: CAS + synchronized(bucket-head)', type: 'ok' },
    { msg: 'put/get fully concurrent', type: 'ok' },
  ];
  snap(steps, s, 'Java 8 CHM: read (get) is fully lock-free. Write uses CAS for empty bucket, synchronized(firstNode) for non-empty. Size uses LongAdder (distributed counters, low contention).', 5);
  return steps;
}

// ── Flow: CopyOnWriteArrayList snapshot semantics ────────────────────────────
function buildCOWFlow() {
  const steps = [];
  const s = makeCOW([10, 20, 30]);

  s.threads = [
    { id: 'T1', name: 'Thread-1 (reader)', state: 'running', reading: true, writing: false, pos: 0 },
    { id: 'T2', name: 'Thread-2 (writer)', state: 'idle', reading: false, writing: false, pos: -1 },
  ];
  snap(steps, s, 'CopyOnWriteArrayList: write creates new copy, readers see consistent snapshot. Read-heavy workloads.', 0);

  s.main = s.main.map((x, i) => ({ ...x, state: i === 0 ? 'active' : 'idle' }));
  snap(steps, s, 'T1: reading main array. Iterates without lock. Snapshot: [10, 20, 30]. No CME possible!', 1);

  s.threads[1].state = 'running'; s.threads[1].writing = true;
  s.copy = s.main.map((x) => ({ ...x, state: 'copying' }));
  s.ops.push({ msg: 'T2: write → Arrays.copyOf() creating new array', type: 'ok' });
  snap(steps, s, 'T2: add(40). Acquires ReentrantLock (exclusive). Creates copy of main array. O(n) copy.', 2);

  s.copy = [...s.copy.map(x => ({ ...x, state: 'idle' })), { val: 40, state: 'new' }];
  snap(steps, s, 'T2: adds 40 to copy. Main array UNCHANGED. T1 still reads original [10, 20, 30] snapshot.', 3);

  s.main = [...s.copy]; s.copy = null; s.threads[1].writing = false;
  s.ops.push({ msg: 'T2: swap copy → main (volatile write)', type: 'ok' });
  snap(steps, s, 'T2: swap reference: main = copy (volatile write → visible to all threads). Lock released. New readers see [10, 20, 30, 40]. T1 still on old snapshot.', 4);

  s.threads[0].state = 'idle'; s.threads[0].reading = false;
  s.main = s.main.map(x => ({ ...x, state: 'idle' }));
  snap(steps, s, 'T1 iterator finishes on old snapshot [10,20,30]. Never throws CME. Trade-off: O(n) write, stale reads during write. Use for read-heavy, write-rare scenarios.', 5);
  return steps;
}

// ── Edge: CHM null + size() inconsistency, COW stale reads ───────────────────
function buildEdgeCases() {
  const steps = [];
  const s = makeCHM();

  snap(steps, s, 'ConcurrentHashMap edge cases: null key/value, size() approximation, Java 7 vs Java 8 differences.', 0);

  snap(steps, s, 'chm.put(null, val) → NullPointerException! CHM does NOT allow null keys or null values. HashMap allows null.', 1);
  s.exception = { type: 'NullPointerException', msg: 'ConcurrentHashMap key or value cannot be null' };
  snap(steps, s, '💥 NPE: CHM bans null to eliminate ambiguity — null key/value would make thread-safe get() ambiguous (is absent or is null?). Use Optional or sentinel values.', 2);

  s.exception = null;
  s.ops = [{ msg: 'size() is approximate under concurrency', type: 'warn' }];
  snap(steps, s, 'CHM.size(): iterates LongAdder cells and sums them. Approximate — another thread may modify between reads. Use mappingCount() for long. Neither is strongly consistent.', 3);

  s.ops = [
    { msg: 'computeIfAbsent() is atomic', type: 'ok' },
    { msg: 'putIfAbsent() vs compute() tradeoffs', type: 'ok' },
  ];
  snap(steps, s, 'Atomic compound ops: computeIfAbsent(key, fn) — compute and put atomically, avoids check-then-act race. putIfAbsent(k,v), merge(k,v,fn), compute(k,fn) all atomic per entry.', 4);

  const cows = makeCOW([1, 2, 3]);
  snap(steps, { ...cows, threads: [], ops: [{ msg: 'COW: stale reads during write window', type: 'warn' }] }, 'CopyOnWriteArrayList: during O(n) copy, readers see stale data. Large lists: copy takes milliseconds → writes rare, reads must tolerate stale. Not suitable for frequently-updated large lists.', 5);
  return steps;
}

// ── Exception/Comparison: HashMap vs CHM thread safety ───────────────────────
function buildComparison() {
  const steps = [];
  const s = makeCHM();

  snap(steps, s, 'Thread-safety comparison: HashMap vs Hashtable vs synchronized vs ConcurrentHashMap.', 0);

  s.ops = [{ msg: 'HashMap: no sync → data race → infinite loop (Java 6)', type: 'warn' }];
  snap(steps, s, 'HashMap: NEVER share across threads. Concurrent resize in Java 6 → infinite loop. Java 8: no infinite loop but still lost updates, wrong size().', 1);

  s.ops = [{ msg: 'Hashtable: full sync, every method, coarse-grain', type: 'warn' }];
  snap(steps, s, 'Hashtable: every method synchronized(this). Only one thread at a time — terrible throughput. Legacy (JDK 1.0). Never use.', 2);

  s.ops = [{ msg: 'synchronizedMap: same as Hashtable overhead', type: 'warn' }];
  snap(steps, s, 'Collections.synchronizedMap(map): wraps each method with synchronized(mutex). Iteration still needs external sync. Same coarse-grain problem.', 3);

  s.ops = [
    { msg: 'CHM Java 7: 16 segment locks', type: 'ok' },
    { msg: 'CHM Java 8: CAS + bucket sync', type: 'ok' },
    { msg: 'CHM: reads lock-free, writes fine-grained', type: 'ok' },
  ];
  snap(steps, s, 'ConcurrentHashMap Java 8: reads are fully lock-free (volatile). Writes: CAS for empty bucket, synchronized on single bucket node for collision. 16x+ throughput vs synchronizedMap.', 4);

  s.ops = [
    { msg: 'Read-heavy: CHM > synMap 10x+', type: 'ok' },
    { msg: 'Write-heavy: CHM still wins (fine-grained)', type: 'ok' },
    { msg: 'Sorted+concurrent: ConcurrentSkipListMap', type: 'ok' },
  ];
  snap(steps, s, 'Decision guide: unsorted concurrent → ConcurrentHashMap. Sorted concurrent → ConcurrentSkipListMap. Rarely-written set → CopyOnWriteArraySet. Producer/consumer → BlockingQueue.', 5);
  return steps;
}

export const CONCURRENT_SCENARIOS = [
  { id: 'chm-flow', label: 'ConcurrentHashMap segment locks', icon: '🔐', collectionType: 'concurrent', category: 'flow', build: buildCHMFlow, code: ['ConcurrentHashMap<K,V> chm = new ConcurrentHashMap<>();', '// Java 7: 16 segments, per-segment ReentrantLock', '// Java 8: CAS + synchronized(bucket)', 'chm.computeIfAbsent(k, fn); // atomic'], language: 'Java' },
  { id: 'cow-flow', label: 'CopyOnWriteArrayList snapshot', icon: '📸', collectionType: 'concurrent', category: 'flow', build: buildCOWFlow, code: ['CopyOnWriteArrayList<T> list = new CopyOnWriteArrayList<>();', '// Write: lock + Arrays.copyOf() + swap ref', '// Read: lock-free snapshot — no CME!', '// Use: read-heavy, write-rare'], language: 'Java' },
  { id: 'concurrent-edge', label: 'Null + size() + stale reads', icon: '⚠️', collectionType: 'concurrent', category: 'edge', build: buildEdgeCases, code: ['chm.put(null, v);   // 💥 NPE! No null in CHM', 'chm.size();          // approximate, not atomic', 'chm.mappingCount();  // long, better for large maps', 'chm.computeIfAbsent(k, fn); // atomic, no race'], language: 'Java' },
  { id: 'concurrent-comparison', label: 'HashMap vs Hashtable vs CHM', icon: '⚡', collectionType: 'concurrent', category: 'concurrency', build: buildComparison, code: ['// NEVER: HashMap across threads', '// AVOID: Hashtable (coarse lock, legacy)', '// OK:    Collections.synchronizedMap()', '// BEST:  ConcurrentHashMap (fine-grained CAS)'], language: 'Java' },
];

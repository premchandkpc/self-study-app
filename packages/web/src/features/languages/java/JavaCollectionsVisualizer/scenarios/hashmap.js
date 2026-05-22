import { snap } from '@/core/utils/scenarioShared';

function entry(key, val, hash, state = 'idle') { return { key, val, hash, state }; }

function simpleHash(key, capacity) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % capacity;
}

function makeHM(capacity = 8) {
  return {
    collectionType: 'hashmap',
    buckets: Array.from({ length: capacity }, () => []),
    capacity, size: 0,
    threshold: Math.floor(capacity * 0.75),
    activeBucket: -1, activeHash: -1,
    ops: [], exception: null, resizing: false,
    threads: [],
  };
}

function hmPut(s, key, val) {
  const hash = simpleHash(key, s.capacity);
  s.activeBucket = hash;
  s.activeHash = hash;
  const chain = s.buckets[hash];
  const existing = chain.findIndex(e => e.key === key);
  if (existing >= 0) {
    s.buckets[hash][existing] = { ...s.buckets[hash][existing], val, state: 'updated' };
    s.ops = [...s.ops, { msg: `put("${key}",${val}) → update bucket[${hash}]`, type: 'ok' }].slice(-5);
  } else {
    s.buckets = s.buckets.map((b, i) => i === hash ? [...b, entry(key, val, hash, 'new')] : b);
    s.size++;
    s.ops = [...s.ops, { msg: `put("${key}",${val}) → bucket[${hash}]${chain.length > 0 ? ' COLLISION' : ''}`, type: chain.length > 0 ? 'warn' : 'ok' }].slice(-5);
  }
}

function resetHM(s) {
  s.activeBucket = -1; s.activeHash = -1;
  s.buckets = s.buckets.map(b => b.map(e => ({ ...e, state: 'idle' })));
}

// ── Flow: put/hash/get/collision ─────────────────────────────────────────────
function buildFlowBasic() {
  const steps = [];
  const s = makeHM(8);
  snap(steps, s, 'HashMap created. capacity=8, loadFactor=0.75. threshold=6. Array of 8 bucket chains.', 0);

  const puts = [['apple', 1], ['banana', 2], ['cherry', 3]];
  for (const [k, v] of puts) {
    const h = simpleHash(k, 8);
    s.activeBucket = h;
    snap(steps, s, `put("${k}", ${v}). hash("${k}") = ${h}. Bucket[${h}].`, 1);
    hmPut(s, k, v);
    snap(steps, s, `Entry stored at bucket[${h}]. O(1) average.`, 2);
    resetHM(s);
  }

  // get
  const gk = 'banana';
  const gh = simpleHash(gk, 8);
  s.activeBucket = gh;
  s.buckets[gh] = s.buckets[gh].map(e => ({ ...e, state: e.key === gk ? 'active' : 'idle' }));
  snap(steps, s, `get("${gk}"). hash("${gk}") = ${gh}. Walk bucket[${gh}] chain. equals("${gk}") match → return ${s.buckets[gh].find(e => e.key === gk)?.val}.`, 3);
  resetHM(s);

  // collision: pick two keys that hash to same bucket
  const ck = 'kiwi'; const ch = simpleHash(ck, 8);
  s.activeBucket = ch;
  snap(steps, s, `put("${ck}", 4). hash = ${ch}. Bucket[${ch}] already has entry. → COLLISION! Append to chain.`, 4);
  hmPut(s, ck, 4);
  snap(steps, s, `Collision handled via chaining. Bucket[${ch}] is now a linked chain of ${s.buckets[ch].length} entries. get() walks chain using equals().`, 5);
  resetHM(s);

  s.ops.push({ msg: 'O(1) avg put/get. O(n) worst with all collisions', type: 'ok' });
  snap(steps, s, 'HashMap: O(1) avg put/get. Worst case O(n) if all keys hash to same bucket (hash storm). Java 8+: chains >8 entries convert to TreeNode O(log n).', 6);
  return steps;
}

// ── Edge: resize/rehash at 75% load factor ───────────────────────────────────
function buildEdgeResize() {
  const steps = [];
  const s = makeHM(4); // small for demo
  snap(steps, s, 'HashMap capacity=4, threshold=3 (0.75×4). Fill to threshold → watch resize+rehash.', 0);

  const keys = ['a', 'b', 'c'];
  for (const k of keys) {
    hmPut(s, k, k.charCodeAt(0));
    resetHM(s);
    snap(steps, s, `put("${k}"). size=${s.size}/${s.capacity}. threshold=${s.threshold}. ${s.size >= s.threshold ? '⚠️ Will resize on next put!' : 'OK.'}`, 1);
  }

  // trigger resize
  s.resizing = true;
  s.ops.push({ msg: 'put("d") → size > threshold → resize!', type: 'warn' });
  snap(steps, s, 'size (3) ≥ threshold (3). put("d") triggers resize! newCapacity = 4 × 2 = 8. All entries must be rehashed.', 2);

  const oldBuckets = s.buckets.map(b => b.map(e => ({ ...e, state: 'copying' })));
  s.capacity = 8;
  s.threshold = Math.floor(8 * 0.75);
  s.buckets = Array.from({ length: 8 }, () => []);
  for (const b of oldBuckets) for (const e of b) {
    const newH = simpleHash(e.key, 8);
    s.buckets[newH] = [...s.buckets[newH], { ...e, hash: newH, state: 'rehashed' }];
  }
  snap(steps, s, 'Rehashing: all entries recomputed with new capacity 8. Each key may land in different bucket. O(n) cost.', 3);

  s.resizing = false;
  resetHM(s);
  hmPut(s, 'd', 100);
  resetHM(s);
  snap(steps, s, `put("d") succeeds. capacity=${s.capacity}, size=${s.size}, threshold=${s.threshold}. Resize amortized across many puts.`, 4);

  s.ops.push({ msg: 'new HashMap<>(initialCapacity) avoids resizes', type: 'ok' });
  snap(steps, s, 'Tip: new HashMap<>(expectedSize / 0.75 + 1) pre-allocates optimal capacity. Avoids O(n) rehash overhead.', 5);
  return steps;
}

// ── Concurrency: race condition + infinite loop ──────────────────────────────
function buildConcurrencyRace() {
  const steps = [];
  const s = makeHM(4);
  for (const k of ['a', 'b', 'c']) { hmPut(s, k, 1); resetHM(s); }

  s.threads = [
    { id: 'T1', name: 'Thread-1', state: 'running', action: 'put("x", 1)' },
    { id: 'T2', name: 'Thread-2', state: 'running', action: 'put("y", 2)' },
  ];
  snap(steps, s, 'Two threads concurrently calling put() on same HashMap. NOT thread-safe. size approaching threshold.', 0);

  snap(steps, s, 'Both threads check: size (3) ≥ threshold (3). Both decide to resize simultaneously!', 1);
  s.threads[0].action = 'resizing: newTable[8]';
  s.threads[1].action = 'resizing: newTable[8]';
  s.resizing = true;
  snap(steps, s, 'Both threads allocate new tables. Java 6: concurrent transfer of entries during resize creates circular reference in linked list.', 2);

  s.threads[0].action = 'transfer: e.next = e (LOOP!)';
  s.exception = { type: 'InfiniteLoop', msg: 'Circular linked list in bucket! CPU 100% forever.' };
  snap(steps, s, '💀 Java 6 BUG: Concurrent resize creates circular linked list. get() spins forever — CPU pegged at 100%. Fixed in Java 8 (head insertion → tail insertion).', 3);

  s.exception = null; s.resizing = false;
  s.threads[0].action = 'put("x", 1) lost update!';
  s.threads[1].action = 'put("y", 2) OK';
  snap(steps, s, 'Even in Java 8+: data races cause lost updates, stale reads, incorrect size counter. Never use HashMap across threads without synchronization.', 4);

  resetHM(s);
  s.ops = [
    { msg: 'Fix: ConcurrentHashMap (lock-striped, no resize race)', type: 'ok' },
    { msg: 'Fix: Collections.synchronizedMap()', type: 'ok' },
    { msg: 'Fix: Guava Cache / Caffeine (read-heavy)', type: 'ok' },
  ];
  snap(steps, s, 'Fixes: ConcurrentHashMap (segment/bucket-level locking, Java 8 CAS-based). Collections.synchronizedMap() coarser. Immutable maps for read-only.', 5);
  return steps;
}

// ── Exception: CME + null key + key mutation ─────────────────────────────────
function buildExceptions() {
  const steps = [];
  const s = makeHM(8);
  for (const k of ['x', 'y']) { hmPut(s, k, 1); resetHM(s); }

  snap(steps, s, 'HashMap exceptions: CME during entrySet iteration, null key behavior, mutable key mutation.', 0);

  // null key
  s.activeBucket = 0;
  s.buckets[0] = [entry('null', 99, 0, 'new')];
  s.size++;
  snap(steps, s, 'put(null, 99). HashMap ALLOWS null key! Stored at bucket[0] by convention. Only one null key allowed.', 1);
  resetHM(s);

  // CME
  snap(steps, s, 'for (Map.Entry e : map.entrySet()) { map.put("z", 3); } → modCount changes during iteration.', 2);
  s.exception = { type: 'ConcurrentModificationException', msg: 'Structural modification during entrySet iteration' };
  s.buckets = s.buckets.map(b => b.map(e => ({ ...e, state: 'error' })));
  snap(steps, s, '💥 ConcurrentModificationException: put/remove during entrySet/keySet/values iteration. Use iterator.remove() or collect to separate list then modify.', 3);

  // mutable key
  s.exception = null;
  resetHM(s);
  s.activeBucket = 2;
  s.buckets[2] = [entry('mutableObj{id=1}', 'val', 2, 'active')];
  snap(steps, s, 'Mutable key: map.put(obj, "val"). obj.id=1. hashCode()=hash1 → bucket[2].', 4);

  s.buckets[2][0].state = 'error';
  s.ops = [{ msg: 'obj.id changed → hashCode changed!', type: 'warn' }];
  snap(steps, s, '⚠️ obj.id mutated → hashCode changes. map.get(obj) now computes different hash → MISS. Key is "lost" in wrong bucket. Use immutable keys (String, Integer, UUID).', 5);

  resetHM(s);
  s.ops = [
    { msg: 'Use immutable keys: String, Integer, UUID', type: 'ok' },
    { msg: 'Override equals+hashCode correctly', type: 'ok' },
  ];
  snap(steps, s, 'Rule: map keys must be immutable with stable hashCode + correct equals(). Violating this "loses" entries silently.', 6);
  return steps;
}

export const HASHMAP_SCENARIOS = [
  { id: 'hm-flow', label: 'put/hash/get/collision', icon: '🗺️', collectionType: 'hashmap', category: 'flow', build: buildFlowBasic, code: ['Map<K,V> map = new HashMap<>();', 'map.put(k, v);  // hash(k) % cap → bucket', 'map.get(k);     // hash → chain walk', '// Collision: chain grows in bucket'], language: 'Java' },
  { id: 'hm-edge-resize', label: 'Resize at 75% Load Factor', icon: '⚡', collectionType: 'hashmap', category: 'edge', build: buildEdgeResize, code: ['// resize when size > capacity * 0.75', '// newCapacity = oldCapacity * 2', '// All entries rehashed — O(n)', 'new HashMap<>(expectedSize / 0.75 + 1)'], language: 'Java' },
  { id: 'hm-concurrency', label: 'Race Condition + Infinite Loop', icon: '🧵', collectionType: 'hashmap', category: 'concurrency', build: buildConcurrencyRace, code: ['// NEVER share HashMap across threads!', '// Java 6: resize → circular list → infinite loop', '// Java 8+: still lost updates, wrong size', 'ConcurrentHashMap<K,V> chm = new ConcurrentHashMap<>();'], language: 'Java' },
  { id: 'hm-exception', label: 'CME + Null Key + Mutable Key', icon: '💥', collectionType: 'hashmap', category: 'exception', build: buildExceptions, code: ['map.put(null, v);  // OK — null key allowed', '// CME: put() during entrySet iteration', '// Mutable key: hashCode changes → entry lost!', '// Use String/Integer/UUID as keys'], language: 'Java' },
];

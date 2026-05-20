import { snap } from '@/core/utils/scenarioShared';

function entry(key, hash, state = 'idle') { return { key, hash, state }; }
function simpleHash(key, capacity) {
  let h = 0;
  for (let i = 0; i < String(key).length; i++) h = (h * 31 + String(key).charCodeAt(i)) >>> 0;
  return h % capacity;
}
function makeHS(capacity = 8) {
  return {
    collectionType: 'hashset', buckets: Array.from({ length: capacity }, () => []),
    capacity, size: 0, threshold: Math.floor(capacity * 0.75),
    activeBucket: -1, ops: [], exception: null,
  };
}
function hsAdd(s, key) {
  const h = simpleHash(key, s.capacity);
  s.activeBucket = h;
  const exists = s.buckets[h].some(e => e.key === key);
  if (exists) {
    s.buckets[h] = s.buckets[h].map(e => e.key === key ? { ...e, state: 'duplicate' } : e);
    s.ops = [...s.ops, { msg: `add(${key}) → duplicate! false`, type: 'warn' }].slice(-5);
    return false;
  }
  s.buckets = s.buckets.map((b, i) => i === h ? [...b, entry(key, h, 'new')] : b);
  s.size++;
  s.ops = [...s.ops, { msg: `add(${key}) → bucket[${h}] true`, type: 'ok' }].slice(-5);
  return true;
}
function resetHS(s) { s.activeBucket = -1; s.buckets = s.buckets.map(b => b.map(e => ({ ...e, state: 'idle' }))); }

// ── Flow: add/contains/remove/iteration ──────────────────────────────────────
function buildFlowBasic() {
  const steps = [];
  const s = makeHS(8);
  snap(steps, s, 'HashSet created. Backed by HashMap internally. HashMap<K, DUMMY_VALUE>. capacity=8, loadFactor=0.75.', 0);

  for (const k of ['apple', 'banana', 'cherry']) {
    hsAdd(s, k);
    snap(steps, s, `add("${k}") → hash=${s.activeBucket}. Returns true (new entry). Backed HashMap puts K→PRESENT.`, 1);
    resetHS(s);
  }

  // duplicate detection
  s.activeBucket = simpleHash('banana', 8);
  const dupResult = hsAdd(s, 'banana');
  snap(steps, s, `add("banana") again. hash=${s.activeBucket}. Found existing entry with equals("banana")=true. Returns false. Set unchanged.`, 2);
  resetHS(s);

  // contains
  const ck = 'cherry';
  const ch = simpleHash(ck, 8);
  s.activeBucket = ch;
  s.buckets[ch] = s.buckets[ch].map(e => ({ ...e, state: e.key === ck ? 'active' : 'idle' }));
  snap(steps, s, `contains("${ck}"). hash=${ch} → bucket[${ch}]. Walk chain, equals("${ck}") matches → true. O(1) avg.`, 3);
  resetHS(s);

  // remove
  const rk = 'banana'; const rh = simpleHash(rk, 8);
  s.activeBucket = rh;
  s.buckets[rh] = s.buckets[rh].map(e => ({ ...e, state: e.key === rk ? 'removed' : 'idle' }));
  snap(steps, s, `remove("${rk}"). Removes from bucket[${rh}]. HashMap.remove(K) returns PRESENT. size-- → ${s.size - 1}.`, 4);
  s.buckets[rh] = s.buckets[rh].filter(e => e.key !== rk); s.size--;
  resetHS(s);
  snap(steps, s, `"banana" removed. size=${s.size}. Iteration order NOT guaranteed — depends on bucket distribution.`, 5);
  return steps;
}

// ── Edge: equals/hashCode contract violation ──────────────────────────────────
function buildEdgeContract() {
  const steps = [];
  const s = makeHS(8);

  snap(steps, s, 'HashSet depends entirely on correct equals() + hashCode(). Violations cause subtle, hard-to-debug bugs.', 0);

  // hash collision with different keys
  s.buckets[3] = [entry('cat', 3, 'idle'), entry('act', 3, 'idle')];
  s.size = 2;
  snap(steps, s, '"cat" and "act" both hash to bucket[3] (collision). But equals("cat","act")=false → both stored. Chain grows.', 1);

  // hashCode violated
  s.activeBucket = 5;
  s.buckets[5] = [entry('{"id":1}', 5, 'new')];
  s.size++;
  snap(steps, s, 'add(obj1) where obj1.id=1. hashCode=5. Stored at bucket[5].', 2);

  s.activeBucket = 2;
  s.buckets[2] = [entry('{"id":1}', 2, 'new')];
  s.size++;
  s.ops = [{ msg: 'obj2 equals obj1 but different hashCode!', type: 'warn' }];
  snap(steps, s, 'add(obj2) where obj2.id=1. obj2.equals(obj1)=true BUT obj2.hashCode()=2 ≠ 5. HashSet stores BOTH! Violates Set contract.', 3);

  s.exception = { type: 'CONTRACT_VIOLATION', msg: 'equals=true but hashCode differs → duplicate elements in Set!' };
  s.buckets[5][0].state = 'error'; s.buckets[2][0].state = 'error';
  snap(steps, s, '💥 Contract Violation: if a.equals(b) then a.hashCode() MUST == b.hashCode(). Violating this corrupts Set semantics silently.', 4);

  s.exception = null;
  resetHS(s);
  s.ops = [
    { msg: 'equals=true → must have same hashCode', type: 'ok' },
    { msg: 'hashCode same does NOT require equals=true', type: 'ok' },
    { msg: 'Use @Override + IDE generation or Lombok', type: 'ok' },
  ];
  snap(steps, s, 'Rule: equals(true) → same hashCode (REQUIRED). Same hashCode → equals(true) is NOT required (just performance). Always @Override both.', 5);
  return steps;
}

// ── Concurrency: CME ─────────────────────────────────────────────────────────
function buildConcurrencyCME() {
  const steps = [];
  const s = makeHS(8);
  for (const k of ['a', 'b', 'c', 'd']) { hsAdd(s, k); resetHS(s); }
  s.ops = [];

  s.threads = [
    { id: 'T1', name: 'Thread-1', state: 'running', action: 'for(String s : set)' },
    { id: 'T2', name: 'Thread-2', state: 'waiting', action: 'idle' },
  ];
  snap(steps, s, 'HashSet with 4 elements. T1 iterating with enhanced for-loop. T2 will modify.', 0);

  s.threads[0].action = 'next() → "a" ✓';
  s.buckets = s.buckets.map(b => b.map(e => ({ ...e, state: e.key === 'a' ? 'active' : 'idle' })));
  snap(steps, s, 'T1: next() → "a". Iterator checks modCount. OK so far.', 1);

  s.threads[1].state = 'running'; s.threads[1].action = 'set.add("z")';
  hsAdd(s, 'z'); resetHS(s);
  s.ops = [{ msg: 'T2: add("z") → modCount++', type: 'warn' }];
  snap(steps, s, 'T2: set.add("z"). Structural modification → modCount incremented. Iterator expectedModCount now stale.', 2);

  s.threads[0].action = 'next() → CME!'; s.threads[1].state = 'idle';
  s.exception = { type: 'ConcurrentModificationException', msg: 'modCount mismatch in HashSet iterator' };
  s.buckets = s.buckets.map(b => b.map(e => ({ ...e, state: 'error' })));
  snap(steps, s, '💥 ConcurrentModificationException! Same fail-fast as HashMap iterator. HashSet iterator is backed by HashMap.entrySet() iterator.', 3);

  s.exception = null; resetHS(s);
  s.ops = [
    { msg: 'Fix: Collections.synchronizedSet()', type: 'ok' },
    { msg: 'Fix: CopyOnWriteArraySet (small sets, read-heavy)', type: 'ok' },
    { msg: 'Fix: ConcurrentHashMap.newKeySet()', type: 'ok' },
  ];
  snap(steps, s, 'Thread-safe alternatives: Collections.synchronizedSet(), CopyOnWriteArraySet (snapshot reads), ConcurrentHashMap.newKeySet() (best for concurrent access).', 4);
  return steps;
}

// ── Exception: mutable object in set, null, TreeSet ClassCast ────────────────
function buildExceptions() {
  const steps = [];
  const s = makeHS(8);

  snap(steps, s, 'HashSet pitfalls: mutable object changes hash after insertion, null handling, LinkedHashSet ordering.', 0);

  s.activeBucket = 3;
  s.buckets[3] = [entry('obj{x=1}', 3, 'new')];
  s.size++;
  snap(steps, s, 'add(obj) where obj.x=1. hashCode=3. Stored at bucket[3]. contains(obj)=true.', 1);
  resetHS(s);

  s.activeBucket = 3;
  s.buckets[3][0].state = 'active';
  snap(steps, s, 'Now obj.x = 5. hashCode recomputes to 7 (different bucket!). contains(obj) checks bucket[7] → not found!', 2);

  s.activeBucket = 7;
  s.buckets[3][0].state = 'orphan';
  s.ops = [{ msg: 'contains(obj) → false! Entry orphaned in bucket[3]', type: 'warn' }];
  snap(steps, s, '⚠️ Object "orphaned": stored at bucket[3], but now hashes to bucket[7]. contains()=false, remove()=false. Memory leak in set! Use immutable objects as set elements.', 3);

  resetHS(s);
  s.buckets[0] = [entry('null', 0, 'new')]; s.size++;
  s.ops = [{ msg: 'add(null) → OK. One null allowed', type: 'ok' }];
  snap(steps, s, 'HashSet.add(null) → allowed! One null per set. Stored at bucket[0] (null hashes to 0).', 4);

  s.ops = [
    { msg: 'TreeSet: sorted but null → NPE!', type: 'warn' },
    { msg: 'LinkedHashSet: insertion-order iteration', type: 'ok' },
    { msg: 'EnumSet: ultra-fast bit-vector for enums', type: 'ok' },
  ];
  snap(steps, s, 'Set variants: LinkedHashSet (insertion-order), TreeSet (sorted, no null), EnumSet (fastest for enums). TreeSet.add(null) → NullPointerException.', 5);
  return steps;
}

export const HASHSET_SCENARIOS = [
  { id: 'hs-flow', label: 'add/contains/remove', icon: '🔵', collectionType: 'hashset', category: 'flow', build: buildFlowBasic, code: ['Set<T> set = new HashSet<>();', 'set.add(x);        // true if new, false if dup', 'set.contains(x);   // O(1) hash lookup', 'set.remove(x);     // O(1) find + remove'], language: 'Java' },
  { id: 'hs-edge', label: 'equals/hashCode contract', icon: '⚠️', collectionType: 'hashset', category: 'edge', build: buildEdgeContract, code: ['// RULE: equals(true) → same hashCode!', '// hashCode same ≠ equals(true)', '@Override equals() + hashCode()', '// Use @EqualsAndHashCode (Lombok)'], language: 'Java' },
  { id: 'hs-concurrency', label: 'ConcurrentModificationException', icon: '🧵', collectionType: 'hashset', category: 'concurrency', build: buildConcurrencyCME, code: ['// HashSet backed by HashMap — same CME rules', 'Set<T> safe = Collections.synchronizedSet(set);', 'Set<T> cow = new CopyOnWriteArraySet<>();', 'Set<T> chm = ConcurrentHashMap.newKeySet();'], language: 'Java' },
  { id: 'hs-exception', label: 'Mutable element + Null + Variants', icon: '💥', collectionType: 'hashset', category: 'exception', build: buildExceptions, code: ['// Mutable element: hashCode changes → orphaned', 'set.add(null);     // OK in HashSet', '// TreeSet.add(null) → 💥 NPE!', '// LinkedHashSet: ordered iteration'], language: 'Java' },
];

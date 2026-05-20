import { snap } from '@/core/utils/scenarioShared';

function cell(val, state = 'idle') { return { val, state }; }

function makeAL(capacity = 10) {
  return {
    collectionType: 'arraylist',
    cells: Array.from({ length: capacity }, () => cell(null, 'null')),
    size: 0, capacity, ops: [], exception: null,
    threads: [], iterPos: -1, modCount: 0, iterModCount: 0,
  };
}

function alAdd(s, val) {
  s.cells = s.cells.map((c, i) => i === s.size ? cell(val, 'new') : c);
  s.size++;
  s.modCount++;
  s.ops = [...s.ops, { msg: `add(${val}) → index ${s.size - 1}`, type: 'ok' }].slice(-5);
}

function resetStates(s) {
  s.cells = s.cells.map((c, i) => ({ val: c.val, state: i < s.size ? 'idle' : 'null' }));
}

// ── Flow: Add / Remove / Get ─────────────────────────────────────────────────
function buildFlowBasic() {
  const steps = [];
  const s = makeAL(10);
  snap(steps, s, 'ArrayList created. capacity=10, size=0. Internal Object[] pre-allocated on heap.', 0);

  for (const v of [42, 17, 88, 5, 63]) {
    alAdd(s, v);
    snap(steps, s, `add(${v}) → O(1) amortized. Writes at index ${s.size-1}. size=${s.size}/${s.capacity}.`, 1);
    resetStates(s);
  }

  const gi = 2;
  s.cells = s.cells.map((c, i) => ({ ...c, state: i === gi ? 'active' : i < s.size ? 'idle' : 'null' }));
  snap(steps, s, `get(${gi}) → ${s.cells[gi].val}. Direct index into array. O(1). No traversal.`, 2);
  resetStates(s);

  s.cells = s.cells.map((c, i) => ({ ...c, state: i === 1 ? 'active' : i < s.size ? 'idle' : 'null' }));
  snap(steps, s, 'remove(index=1): must shift elements [2..4] left. O(n) worst case.', 3);
  s.cells = s.cells.map((c, i) => ({
    ...c, state: i === 1 ? 'removed' : i > 1 && i < s.size ? 'shifting' : i < s.size ? 'idle' : 'null',
  }));
  snap(steps, s, 'Elements [88, 5, 63] shifting left one position to fill gap. System.arraycopy().', 3);

  const removed = s.cells[1].val;
  for (let i = 1; i < s.size - 1; i++) s.cells[i] = cell(s.cells[i + 1].val, 'idle');
  s.cells[s.size - 1] = cell(null, 'null');
  s.size--; s.modCount++;
  s.ops.push({ msg: `remove(1) → ${removed}, shifted ${s.size - 1} elements`, type: 'warn' });
  resetStates(s);
  snap(steps, s, `Done. Removed ${removed}. size=${s.size}. Prefer LinkedList for frequent mid-list removes.`, 4);

  s.ops.push({ msg: 'add O(1) amortized | get O(1) | remove O(n)', type: 'ok' });
  snap(steps, s, 'Summary: O(1) amortized add-end, O(1) index get, O(n) remove/insert at middle. Cache-friendly contiguous memory.', 5);
  return steps;
}

// ── Edge: Internal array resize ──────────────────────────────────────────────
function buildEdgeResize() {
  const steps = [];
  const s = makeAL(4);
  snap(steps, s, 'ArrayList capacity=4 (demo). Java default=10. Watch what happens when capacity exhausted.', 0);

  for (let i = 0; i < 4; i++) {
    alAdd(s, (i + 1) * 10);
    resetStates(s);
    snap(steps, s, `add(${(i+1)*10}) size=${s.size}/${s.capacity}. ${s.size < s.capacity ? 'Space OK.' : '⚠️ FULL! Next add triggers resize.'}`, 1);
  }

  s.ops.push({ msg: 'size==capacity → resize triggered!', type: 'warn' });
  snap(steps, s, 'Capacity FULL. add(50) triggers grow(). newCapacity = old + (old >> 1) = 4 + 2 = 6. ~1.5× growth.', 2);

  const newCap = s.capacity + (s.capacity >> 1);
  const existing = s.cells.slice(0, s.size).map(c => ({ val: c.val, state: 'copying' }));
  s.capacity = newCap;
  s.cells = [...existing, ...Array.from({ length: newCap - s.size }, () => cell(null, 'null'))];
  snap(steps, s, `Arrays.copyOf() allocates new Object[${newCap}], copies ${s.size} elements. O(n) cost — rare, amortized to O(1) per add.`, 3);

  s.cells = s.cells.map(c => ({ ...c, state: c.val !== null ? 'idle' : 'null' }));
  alAdd(s, 50);
  snap(steps, s, `add(50) succeeds. size=${s.size}, capacity=${s.capacity}. Old array GC'd.`, 4);
  resetStates(s);

  s.ops.push({ msg: 'ensureCapacity(n) avoids repeated resizes', type: 'ok' });
  snap(steps, s, 'Performance tip: new ArrayList<>(expectedN) or ensureCapacity(n) avoids repeated O(n) copies. Critical for >10k elements.', 5);
  return steps;
}

// ── Concurrency: ConcurrentModificationException ─────────────────────────────
function buildConcurrencyCME() {
  const steps = [];
  const s = makeAL(8);
  for (const v of [10, 20, 30, 40, 50]) { s.cells[s.size] = cell(v, 'idle'); s.size++; }
  s.modCount = 0; s.ops = [];

  s.threads = [
    { id: 'T1', name: 'Thread-1', state: 'running', action: 'starting iterator' },
    { id: 'T2', name: 'Thread-2', state: 'waiting', action: 'idle' },
  ];
  snap(steps, s, 'ArrayList (5 elements, no sync). T1 will iterate, T2 will add. modCount=0.', 0);

  s.iterPos = 0; s.iterModCount = 0;
  s.threads[0].action = 'it = list.iterator(); // captures modCount=0';
  s.cells = s.cells.map((c, i) => ({ ...c, state: i < s.size ? (i === 0 ? 'active' : 'idle') : 'null' }));
  snap(steps, s, 'T1: iterator = list.iterator(). Captures expectedModCount=0. FAIL-FAST: checks modCount each next().', 1);

  s.iterPos = 1;
  s.threads[0].action = 'it.next() → 10 ✓';
  s.cells = s.cells.map((c, i) => ({ ...c, state: i < s.size ? (i === 1 ? 'active' : i === 0 ? 'visited' : 'idle') : 'null' }));
  snap(steps, s, 'T1: next() → 10. modCount(0) == expectedModCount(0) ✓. Advances cursor to index 1.', 2);

  s.threads[1].state = 'running'; s.threads[1].action = 'list.add(99)';
  s.cells[s.size] = cell(99, 'new'); s.size++; s.modCount++;
  s.ops = [{ msg: 'T2: list.add(99) → modCount=1', type: 'warn' }];
  snap(steps, s, 'T2: list.add(99). modCount incremented to 1. Iterator still holds expectedModCount=0. ← DANGER', 3);

  s.threads[0].action = 'it.next() → CME!'; s.threads[1].state = 'idle';
  s.exception = { type: 'ConcurrentModificationException', msg: 'modCount(1) != expectedModCount(0)' };
  s.cells = s.cells.map(c => ({ ...c, state: 'error' }));
  snap(steps, s, '💥 ConcurrentModificationException! modCount(1) ≠ expectedModCount(0). Iterator rejects — better a crash than silent data corruption.', 4);

  s.exception = null;
  s.ops = [
    { msg: 'Fix 1: CopyOnWriteArrayList (reads snapshot)', type: 'ok' },
    { msg: 'Fix 2: synchronized(list) { ... }', type: 'ok' },
    { msg: 'Fix 3: iterator.remove() inside loop', type: 'ok' },
    { msg: 'Fix 4: list.removeIf(predicate)', type: 'ok' },
  ];
  s.cells = s.cells.map((c, i) => ({ ...c, state: i < s.size ? 'idle' : 'null' }));
  snap(steps, s, 'Fixes: CopyOnWriteArrayList (snapshot reads), synchronized block, Collections.synchronizedList(), or iterator.remove() for safe removal.', 5);
  return steps;
}

// ── Exception: OOB + Null + subList ─────────────────────────────────────────
function buildExceptionOOB() {
  const steps = [];
  const s = makeAL(8);
  for (const v of [1, 2, 3]) { s.cells[s.size] = cell(v, 'idle'); s.size++; }
  s.ops = [];

  snap(steps, s, 'ArrayList size=3. Exploring exception scenarios: OOB, null, unboxing, subList pitfalls.', 0);

  s.cells = s.cells.map((c, i) => ({ ...c, state: i < s.size ? 'idle' : 'null' }));
  snap(steps, s, 'list.get(5) on size=3 list. Index 5 ≥ size 3 → bounds check fails.', 1);
  s.exception = { type: 'IndexOutOfBoundsException', msg: 'Index: 5, Size: 3' };
  s.cells = s.cells.map(c => ({ ...c, state: c.val !== null ? 'error' : 'null' }));
  snap(steps, s, '💥 IndexOutOfBoundsException: "Index: 5, Size: 3". Also: get(-1), set(n,x) n≥size, add(n,x) n>size.', 2);

  s.exception = null;
  s.cells = s.cells.map((c, i) => ({ ...c, state: i < s.size ? 'idle' : 'null' }));
  s.cells[s.size] = { val: null, state: 'null-elem' }; s.size++;
  s.ops = [{ msg: 'add(null) → OK. ArrayList allows null', type: 'ok' }];
  snap(steps, s, 'list.add(null) succeeds! ArrayList permits null elements. size=4. index 3 holds null.', 3);

  s.cells = s.cells.map((c, i) => ({ ...c, state: i < s.size ? (i === 3 ? 'active' : 'idle') : 'null' }));
  snap(steps, s, 'List<Integer> stores Integer objects (boxed). int x = list.get(3) → unboxing null Integer → NPE!', 4);
  s.exception = { type: 'NullPointerException', msg: 'Cannot unbox null Integer to int' };
  snap(steps, s, '💥 NullPointerException: unboxing null. Fix: Integer x = list.get(3); then null check. Or Optional.ofNullable(list.get(3)).', 5);

  s.exception = null;
  resetStates(s);
  s.cells = s.cells.map((c, i) => ({ ...c, state: i >= 1 && i <= 2 ? 'window' : i < s.size ? 'idle' : 'null' }));
  s.ops = [{ msg: 'subList(1,3) is a view, not a copy!', type: 'warn' }];
  snap(steps, s, 'list.subList(1,3) returns a view backed by original. Modifying subList ↔ modifies original. Serialize original after → CME! Use new ArrayList<>(subList(1,3)) for safe copy.', 6);
  return steps;
}

export const ARRAYLIST_SCENARIOS = [
  { id: 'al-flow', label: 'Add/Remove/Get', icon: '📋', collectionType: 'arraylist', category: 'flow', build: buildFlowBasic, code: ['List<T> list = new ArrayList<>();', 'list.add(42);      // O(1) amortized', 'list.get(2);       // O(1) by index', 'list.remove(1);    // O(n) — shifts'], language: 'Java' },
  { id: 'al-edge-resize', label: 'Capacity Resize', icon: '⚡', collectionType: 'arraylist', category: 'edge', build: buildEdgeResize, code: ['// newCap = old + (old >> 1)  ~1.5x', '// Arrays.copyOf() → O(n) copy', 'new ArrayList<>(100); // pre-alloc', 'list.ensureCapacity(n);'], language: 'Java' },
  { id: 'al-concurrency', label: 'ConcurrentModificationException', icon: '🧵', collectionType: 'arraylist', category: 'concurrency', build: buildConcurrencyCME, code: ['Iterator<T> it = list.iterator();', 'list.add(x);   // another thread/code', 'it.next();     // 💥 CME! modCount changed', '// Fix: CopyOnWriteArrayList'], language: 'Java' },
  { id: 'al-exception', label: 'OOB + Null + subList', icon: '💥', collectionType: 'arraylist', category: 'exception', build: buildExceptionOOB, code: ['list.get(5);        // 💥 IOOBE if ≥ size', 'list.add(null);     // OK — null allowed', 'int x = list.get(3); // 💥 NPE if null', 'list.subList(1,3);  // view, not copy!'], language: 'Java' },
];

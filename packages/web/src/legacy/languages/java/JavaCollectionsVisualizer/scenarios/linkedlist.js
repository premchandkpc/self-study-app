import { snap } from '@/core/utils/scenarioShared';

let _id = 0;
function makeNode(val, state = 'idle') { return { id: _id++, val, prev: null, next: null, state }; }
function makeLL() {
  _id = 0;
  return { collectionType: 'linkedlist', nodes: [], head: null, tail: null, cursor: null, size: 0, ops: [], exception: null, threads: [] };
}
function llAddLast(s, val) {
  const n = makeNode(val);
  if (s.tail === null) { n.id = _id++; s.nodes = [n]; s.head = n.id; s.tail = n.id; }
  else {
    const tail = s.nodes.find(x => x.id === s.tail);
    n.id = _id++;
    tail.next = n.id; n.prev = tail.id;
    s.nodes = [...s.nodes, n]; s.tail = n.id;
  }
  s.size++;
  s.ops = [...s.ops, { msg: `addLast(${val})`, type: 'ok' }].slice(-5);
}
function llAddFirst(s, val) {
  const n = makeNode(val);
  n.id = _id++;
  if (s.head === null) { s.nodes = [n]; s.head = n.id; s.tail = n.id; }
  else {
    const head = s.nodes.find(x => x.id === s.head);
    n.next = head.id; head.prev = n.id;
    s.nodes = [n, ...s.nodes]; s.head = n.id;
  }
  s.size++;
  s.ops = [...s.ops, { msg: `addFirst(${val})`, type: 'ok' }].slice(-5);
}
function resetLL(s) { s.nodes = s.nodes.map(n => ({ ...n, state: 'idle' })); s.cursor = null; }

// ── Flow: addFirst/addLast/traverse/removeFirst ──────────────────────────────
function buildFlowBasic() {
  _id = 0;
  const steps = [];
  const s = makeLL();
  snap(steps, s, 'LinkedList created. Doubly-linked. head=null, tail=null. No internal array. Nodes allocated on heap.', 0);

  llAddLast(s, 10);
  s.nodes[s.nodes.length - 1].state = 'new';
  snap(steps, s, 'addLast(10). First node. head=node(10), tail=node(10). O(1): tail pointer updated directly.', 1);

  for (const v of [20, 30, 40]) {
    resetLL(s);
    llAddLast(s, v);
    s.nodes[s.nodes.length - 1].state = 'new';
    snap(steps, s, `addLast(${v}). O(1): new node, tail.next = node, tail = node. No shifting needed.`, 1);
  }

  resetLL(s);
  llAddFirst(s, 5);
  s.nodes[0].state = 'new';
  snap(steps, s, 'addFirst(5). O(1): new node, node.next = head, head = node. Doubly-linked: head.prev = node.', 2);

  // traverse
  resetLL(s);
  for (let i = 0; i < s.nodes.length; i++) {
    s.nodes = s.nodes.map((n, idx) => ({ ...n, state: idx === i ? 'active' : idx < i ? 'visited' : 'idle' }));
    s.cursor = s.nodes[i].id;
    snap(steps, s, `Traverse: visit node(${s.nodes[i].val}). O(n) traversal — no random access. Must walk from head.`, 3);
  }

  // removeFirst
  resetLL(s);
  s.nodes[0].state = 'removed';
  const removedVal = s.nodes[0].val;
  snap(steps, s, `removeFirst() → ${removedVal}. O(1): head = head.next, head.prev = null. Old node GC'd.`, 4);
  s.nodes = s.nodes.slice(1);
  if (s.nodes.length > 0) { s.nodes[0].prev = null; s.head = s.nodes[0].id; }
  s.size--;
  resetLL(s);
  s.ops.push({ msg: `removeFirst() → ${removedVal}`, type: 'ok' });
  snap(steps, s, `size=${s.size}. LinkedList: O(1) add/remove at head/tail, O(n) get by index (no random access).`, 5);
  return steps;
}

// ── Edge: empty list, single node, get(n) cost ───────────────────────────────
function buildEdgeCases() {
  _id = 0;
  const steps = [];
  const s = makeLL();
  snap(steps, s, 'Empty LinkedList. Edge cases: peek on empty, single-node remove, expensive get(index).', 0);

  snap(steps, s, 'peekFirst() on empty → returns null (no exception). pollFirst() → null. getFirst() → NoSuchElementException!', 1);
  s.exception = { type: 'NoSuchElementException', msg: 'getFirst() on empty LinkedList' };
  snap(steps, s, '💥 NoSuchElementException: getFirst()/getLast()/removeFirst()/removeLast() on empty list. Use peekFirst()/pollFirst() which return null.', 2);

  s.exception = null;
  llAddLast(s, 42);
  s.nodes[0].state = 'new';
  snap(steps, s, 'Single-element list. head == tail == node(42). Both prev and next are null.', 3);

  resetLL(s);
  s.nodes[0].state = 'removed';
  snap(steps, s, 'remove() on single-element list. head = null, tail = null. List becomes empty again.', 4);
  s.nodes = []; s.head = null; s.tail = null; s.size = 0;
  snap(steps, s, 'List empty again. head=null, tail=null. No memory leak — GC collects node.', 5);

  // expensive get(index)
  for (const v of [1, 2, 3, 4, 5, 6]) llAddLast(s, v);
  resetLL(s);
  snap(steps, s, 'get(index) on LinkedList: must walk from head (or tail if index > size/2). O(n) worst case.', 6);
  for (let i = 0; i <= 3; i++) {
    s.nodes = s.nodes.map((n, idx) => ({ ...n, state: idx === i ? 'active' : idx < i ? 'visited' : 'idle' }));
    snap(steps, s, `get(3): walking to index ${i}. ${i < 3 ? 'Not there yet...' : 'Found! But O(n) cost.'}`, 7);
  }
  s.ops.push({ msg: 'Use ArrayList if frequent get(index)', type: 'warn' });
  resetLL(s);
  snap(steps, s, 'Takeaway: LinkedList.get(i) = O(n). Use ArrayList for random access. LinkedList shines at add/remove at ends as Deque.', 8);
  return steps;
}

// ── Concurrency: unsynchronized concurrent modification ──────────────────────
function buildConcurrencyUnsafe() {
  _id = 0;
  const steps = [];
  const s = makeLL();
  for (const v of [10, 20, 30]) llAddLast(s, v);
  resetLL(s);

  s.threads = [
    { id: 'T1', name: 'Thread-1', state: 'running', action: 'iterating' },
    { id: 'T2', name: 'Thread-2', state: 'running', action: 'addLast(99)' },
  ];
  snap(steps, s, 'Two threads, no synchronization. T1 iterating, T2 adding concurrently. LinkedList is NOT thread-safe.', 0);

  s.nodes = s.nodes.map((n, i) => ({ ...n, state: i === 0 ? 'active' : 'idle' }));
  s.threads[0].action = 'it.next() → 10 ✓';
  snap(steps, s, 'T1: next() → 10. Reads first node. modCount check passes (both share modCount=0 at this point).', 1);

  s.threads[1].action = 'addLast(99): creating new node';
  const newNode = { id: _id++, val: 99, prev: s.tail, next: null, state: 'new' };
  snap(steps, s, 'T2: addLast(99). Allocates new Node. About to update tail.next and tail pointer. Race with T1.', 2);

  s.nodes = [...s.nodes, newNode];
  const tailNode = s.nodes.find(n => n.id === s.tail);
  if (tailNode) tailNode.next = newNode.id; newNode.prev = s.tail; s.tail = newNode.id; s.size++;
  s.threads[1].action = 'addLast done';
  snap(steps, s, 'T2: tail updated. But T1 iterator expected size=3, now sees size=4. Internal state inconsistent.', 3);

  s.exception = { type: 'ConcurrentModificationException', msg: 'Structural modification during iteration' };
  s.nodes = s.nodes.map(n => ({ ...n, state: 'error' }));
  snap(steps, s, '💥 ConcurrentModificationException when T1 calls next(). Fail-fast iterator detects concurrent modification.', 4);

  s.exception = null;
  resetLL(s);
  s.ops = [
    { msg: 'Fix: Collections.synchronizedList()', type: 'ok' },
    { msg: 'Fix: ConcurrentLinkedDeque (lock-free)', type: 'ok' },
  ];
  snap(steps, s, 'Fixes: Collections.synchronizedList(new LinkedList<>()) for external sync. ConcurrentLinkedDeque for lock-free concurrent use as Deque.', 5);
  return steps;
}

// ── Exception: NoSuchElement, StackOverflow via recursion ────────────────────
function buildExceptions() {
  _id = 0;
  const steps = [];
  const s = makeLL();
  snap(steps, s, 'LinkedList exception scenarios: NoSuchElement, null handling, using as Stack pitfalls.', 0);

  snap(steps, s, 'Queue ops: remove() on empty → NoSuchElementException. poll() → null (safe). Always prefer poll().', 1);
  s.exception = { type: 'NoSuchElementException', msg: 'Queue.remove() on empty deque' };
  snap(steps, s, '💥 NoSuchElementException: remove() family throws on empty. poll/peek family returns null. Never use remove() without isEmpty() check.', 2);

  s.exception = null;
  for (const v of [1, 2, 3]) llAddLast(s, v);
  resetLL(s);
  s.nodes[1].state = 'active';
  snap(steps, s, 'listIterator(index) O(n) to reach index. Removing while iterating forward: use iterator.remove() not list.remove().', 3);

  s.exception = { type: 'UnsupportedOperationException', msg: 'Cannot set() on ListIterator without previous/next call' };
  snap(steps, s, '💥 UnsupportedOperationException: calling listIterator.set() before any next()/previous() call. Must call next/previous first.', 4);

  s.exception = null;
  resetLL(s);
  s.ops = [
    { msg: 'poll() > remove() for queue ops', type: 'ok' },
    { msg: 'LinkedList implements Deque — use as ArrayDeque alternative', type: 'ok' },
    { msg: 'ArrayDeque is faster (no null-check overhead)', type: 'warn' },
  ];
  snap(steps, s, 'Prefer ArrayDeque over LinkedList as a Deque/Stack. ArrayDeque: faster, cache-friendly, no node allocation overhead. Use LinkedList when null elements needed in queue.', 5);
  return steps;
}

export const LINKEDLIST_SCENARIOS = [
  { id: 'll-flow', label: 'Add/Remove/Traverse', icon: '🔗', collectionType: 'linkedlist', category: 'flow', build: buildFlowBasic, code: ['LinkedList<T> ll = new LinkedList<>();', 'll.addFirst(x);   // O(1)', 'll.addLast(x);    // O(1)', 'll.get(i);        // O(n) — no random access'], language: 'Java' },
  { id: 'll-edge', label: 'Empty List + get(n) cost', icon: '⚠️', collectionType: 'linkedlist', category: 'edge', build: buildEdgeCases, code: ['ll.peekFirst();   // null if empty (safe)', 'll.getFirst();    // 💥 NoSuchElement if empty', 'll.get(3);        // O(n) walk from head/tail', '// Use ArrayList for random access'], language: 'Java' },
  { id: 'll-concurrency', label: 'Unsynchronized Concurrent Modify', icon: '🧵', collectionType: 'linkedlist', category: 'concurrency', build: buildConcurrencyUnsafe, code: ['// NOT thread-safe!', 'List<T> safe = Collections.synchronizedList(new LinkedList<>());', '// Or: ConcurrentLinkedDeque', '// for lock-free concurrent deque'], language: 'Java' },
  { id: 'll-exception', label: 'NoSuchElement + Iterator pitfalls', icon: '💥', collectionType: 'linkedlist', category: 'exception', build: buildExceptions, code: ['ll.remove();    // 💥 NoSuchElement if empty', 'll.poll();      // null if empty (safe)', '// Prefer ArrayDeque over LinkedList', '// ArrayDeque faster, no node overhead'], language: 'Java' },
];

import { snap, makeList } from './shared';

const VALUES = [1, 2, 3, 4, 5];

const CODE = [
  'function reverseList(head) {',
  '  let prev = null, curr = head;',
  '  while (curr !== null) {',
  '    const next = curr.next;',
  '    curr.next = prev;',
  '    prev = curr;',
  '    curr = next;',
  '  }',
  '  return prev; // new head',
  '}',
];

function build() {
  const steps = [];

  function mkNodes(prevIdx, currIdx, nextIdx, doneSet = new Set()) {
    return makeList(VALUES).map((n, i) => ({
      ...n,
      state:
        i === prevIdx ? 'prev' :
        i === currIdx ? 'curr' :
        i === nextIdx ? 'next' :
        doneSet.has(i) ? 'visited' : 'idle',
    }));
  }

  // reversed arrows: nextIdx tracks logical reversed links
  // We track the actual reversed state separately
  const reversed = new Array(VALUES.length).fill(-1); // reversed[i] = previous node index (-1 = null)
  const origNext = VALUES.map((_, i) => (i < VALUES.length - 1 ? i + 1 : -1));

  let prev = -1, curr = 0;

  const s = {
    nodes: mkNodes(-1, curr, curr < VALUES.length - 1 ? curr + 1 : -1),
    reversed,
    origNext: [...origNext],
    pointers: { prev: null, curr: VALUES[curr], next: VALUES[curr + 1] ?? null },
    vars: { prev: null, curr: VALUES[curr], next: VALUES[curr + 1] ?? null },
    complexity: { ops: 0, label: 'O(n)', space: 'O(1)' },
  };

  snap(steps, s, `Start: prev=null, curr=${VALUES[curr]}. Reverse singly linked list iteratively.`, 1);

  const doneSet = new Set();
  let ops = 0;

  while (curr !== -1) {
    const next = origNext[curr];
    ops++;

    // save next, redirect curr.next → prev
    reversed[curr] = prev;

    const nextVal = next !== -1 ? VALUES[next] : null;
    const prevVal = prev !== -1 ? VALUES[prev] : null;

    s.nodes = mkNodes(prev, curr, next, doneSet);
    s.reversed = [...reversed];
    s.pointers = { prev: prevVal, curr: VALUES[curr], next: nextVal };
    s.vars = { prev: prevVal, curr: VALUES[curr], next: nextVal };
    s.complexity = { ops, label: 'O(n)', space: 'O(1)' };
    snap(steps, s, `curr=${VALUES[curr]}: save next=${nextVal ?? 'null'}, point curr→prev=${prevVal ?? 'null'}`, 3);

    doneSet.add(curr);
    prev = curr;
    curr = next;
  }

  // Final reversed list
  const finalNodes = makeList([...VALUES].reverse()).map((n) => ({ ...n, state: 'done' }));
  s.nodes = finalNodes;
  s.reversed = reversed;
  s.vars = { prev: VALUES[prev], curr: null, next: null };
  s.complexity = { ops, label: 'O(n)', space: 'O(1)' };
  snap(steps, s, `Done! List reversed: [${[...VALUES].reverse().join(' → ')}]. New head=${VALUES[prev]}.`, 8);

  return steps;
}

export default {
  id: 'reverse',
  label: 'Reverse List',
  icon: '↩️',
  build,
  code: CODE,
  language: 'javascript',
  metrics: [],
};

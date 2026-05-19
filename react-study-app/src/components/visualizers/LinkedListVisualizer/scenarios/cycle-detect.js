import { snap } from './shared';

// List: 1→2→3→4→5→3 (cycle back to index 2)
const VALUES   = [1, 2, 3, 4, 5];
const CYCLE_TO = 2; // index that node 5 points back to

const CODE = [
  'function hasCycle(head) {',
  '  let slow = head, fast = head;',
  '  while (fast && fast.next) {',
  '    slow = slow.next;',
  '    fast = fast.next.next;',
  '    if (slow === fast) return true;',
  '  }',
  '  return false;',
  '}',
];

function build() {
  const steps = [];

  // Node list with cycle arrow info
  function mkNodes(slowIdx, fastIdx) {
    return VALUES.map((val, i) => ({
      id: i,
      val,
      state: i === slowIdx && i === fastIdx ? 'meet' :
             i === slowIdx ? 'slow' :
             i === fastIdx ? 'fast' : 'idle',
      nextIdx: i < VALUES.length - 1 ? i + 1 : CYCLE_TO,
      hasCycleArrow: i === VALUES.length - 1, // last node has back-edge
    }));
  }

  let slow = 0, fast = 0;

  const s = {
    nodes: mkNodes(slow, fast),
    cycleTarget: CYCLE_TO,
    vars: { slow: VALUES[slow], fast: VALUES[fast], hasCycle: false },
    complexity: { ops: 0, label: 'O(n)', space: 'O(1)' },
  };

  snap(steps, s, `Floyd's Cycle Detection. List has cycle: node ${VALUES[VALUES.length - 1]} → node ${VALUES[CYCLE_TO]}. slow=fast=head.`, 1);

  let ops = 0;
  // Simulate with a cap to avoid infinite loop in build
  for (let iter = 0; iter < 10; iter++) {
    const prevSlow = slow;
    const prevFast = fast;
    const nextSlow = VALUES.length - 1 === slow ? CYCLE_TO : slow + 1;
    const fastNext1 = VALUES.length - 1 === fast ? CYCLE_TO : fast + 1;
    const nextFast = VALUES.length - 1 === fastNext1 ? CYCLE_TO : fastNext1 + 1;

    slow = nextSlow;
    fast = nextFast;
    ops++;

    const meet = slow === fast;
    s.nodes = mkNodes(slow, fast);
    s.vars = { iter: iter + 1, slow: VALUES[slow], fast: VALUES[fast], slowIdx: slow, fastIdx: fast, hasCycle: meet };
    s.complexity = { ops, label: 'O(n)', space: 'O(1)' };

    if (meet) {
      snap(steps, s, `Slow=${VALUES[slow]} meets Fast=${VALUES[fast]} at node ${VALUES[slow]}! Cycle detected!`, 5);
      break;
    }

    snap(steps, s, `slow→${VALUES[slow]}, fast→${VALUES[fast]}. No meet yet.`, 3);
  }

  // Final summary
  const finalNodes = mkNodes(-1, -1).map((n) => ({ ...n, state: n.id === CYCLE_TO ? 'visited' : 'idle' }));
  s.nodes = finalNodes;
  s.vars = { slow: VALUES[slow], fast: VALUES[fast], hasCycle: true };
  s.complexity = { ops, label: 'O(n)', space: 'O(1)' };
  snap(steps, s, `Cycle confirmed! Floyd's algorithm O(n) time, O(1) space — no extra set needed.`, 6);

  return steps;
}

export default {
  id: 'cycle-detect',
  label: 'Cycle Detection',
  icon: '🔁',
  build,
  code: CODE,
  language: 'javascript',
  metrics: [],
};

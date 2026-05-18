export function buildJVMSteps() {
  const steps = [];

  const fresh = () => ({
    eden: [],
    survivor0: [],
    survivor1: [],
    oldGen: [],
    metaspace: [],
    stack: [],
    gcEvent: null,
    stopTheWorld: false,
    metrics: { heapUsed: 0, gcCount: 0, gcPause: 0 },
  });

  let s = fresh();

  function snap(narration, codeLine = null) {
    steps.push({
      ...JSON.parse(JSON.stringify(s)),
      narration,
      codeLine,
      complexity: { ops: steps.length + 1, label: 'GC cycle', space: 'O(heap)' },
    });
  }

  // Metaspace: class loading
  s.metaspace = [
    { id: 'App',    size: 1, age: 0 },
    { id: 'String', size: 1, age: 0 },
    { id: 'List',   size: 1, age: 0 },
  ];
  snap('Classloader loads App, String, List into Metaspace.', 1);

  // Stack frames
  s.stack = [{ frame: 'main()', active: true }, { frame: 'run()', active: false }];
  snap('Thread stack: main() calls run(). Stack frames pushed.', 3);

  // Allocate objects in Eden
  for (let i = 1; i <= 4; i++) {
    s.eden.push({ id: `obj${i}`, size: 1, age: 0, reachable: i <= 2 });
    s.metrics.heapUsed += 10;
    snap(`new Object() → obj${i} allocated in Eden. Heap: ${s.metrics.heapUsed}MB.`, 6);
  }

  snap('Eden filling up. 4 objects: obj1-obj2 reachable, obj3-obj4 unreachable (garbage).', 7);

  // Minor GC triggered
  s.gcEvent = 'minor';
  s.stopTheWorld = false;
  s.metrics.gcCount += 1;
  s.metrics.gcPause = 8;
  snap('⚡ Minor GC triggered! Eden full. Mark-and-sweep begins (concurrent).', 9);

  // Sweep dead objects
  s.eden = s.eden.filter((o) => o.reachable);
  s.gcEvent = 'sweep';
  snap('GC sweeps obj3, obj4 (unreachable). Freed 20MB. Survivors promoted.', 10);

  // Promote survivors to S0
  s.survivor0 = s.eden.map((o) => ({ ...o, age: o.age + 1 }));
  s.eden = [];
  s.gcEvent = null;
  s.stopTheWorld = false;
  snap('Survivors obj1, obj2 → age=1 → moved to Survivor S0.', 12);

  // Allocate more
  for (let i = 5; i <= 7; i++) {
    s.eden.push({ id: `obj${i}`, size: 1, age: 0, reachable: i === 5 });
    s.metrics.heapUsed += 10;
    snap(`obj${i} allocated in Eden.`, 6);
  }

  // Another Minor GC
  s.gcEvent = 'minor';
  s.metrics.gcCount += 1;
  s.metrics.gcPause = 6;
  snap('⚡ Minor GC #2! Eden filling again. Concurrent marking starts.', 9);

  s.eden = s.eden.filter((o) => o.reachable);
  s.survivor1 = [
    ...s.survivor0.map((o) => ({ ...o, age: o.age + 1 })),
    ...s.eden.map((o) => ({ ...o, age: 1 })),
  ];
  s.survivor0 = [];
  s.eden = [];
  s.gcEvent = null;
  snap('Survivors flip: S0→S1. obj1,obj2 age=2, obj5 age=1. S0 cleared.', 13);

  // Tenure threshold — promote old objects
  const tenured = s.survivor1.filter((o) => o.age >= 2);
  s.oldGen = tenured.map((o) => ({ ...o }));
  s.survivor1 = s.survivor1.filter((o) => o.age < 2);
  s.metrics.heapUsed += 20;
  snap('obj1, obj2 (age≥2) tenured → promoted to Old Generation.', 15);

  // Full GC (stop-the-world)
  s.gcEvent = 'full';
  s.stopTheWorld = true;
  s.metrics.gcCount += 1;
  s.metrics.gcPause = 200;
  snap('⚠ Full GC! Old Gen pressure. STOP-THE-WORLD pause: 200ms. App frozen.', 18);

  s.oldGen = s.oldGen.filter((o) => o.reachable);
  s.stopTheWorld = false;
  s.gcEvent = null;
  s.metrics.heapUsed = Math.max(0, s.metrics.heapUsed - 30);
  snap('Full GC complete. Old Gen compacted. Heap freed. App resumes.', 20);

  snap(`JVM summary: ${s.metrics.gcCount} GC cycles, ${s.metrics.gcPause}ms max pause, ${s.metrics.heapUsed}MB heap.`, 22);

  return steps;
}

export const JVM_CODE = [
  '// ClassLoader',
  'Class.forName("App");              // Metaspace',
  '',
  '// Thread stack frames',
  'public static void main(String[] a) {',
  '  run();',
  '  Object o = new Object();        // → Eden',
  '  // ... allocate more objects',
  '  // Eden fills → Minor GC',
  '  //   mark reachable (roots)',
  '  //   sweep unreachable',
  '  //   copy survivors → S0/S1',
  '  //   age++ per GC cycle',
  '  //   age >= threshold → Old Gen',
  '  //   Old Gen pressure → Full GC',
  '  //   Full GC = stop-the-world',
  '  //   compact Old Gen',
  '  //   resume application',
  '  // ZGC / Shenandoah: concurrent',
  '  // < 1ms pauses, no STW',
  '}',
];

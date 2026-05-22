import { snap } from '@/core/utils/scenarioShared';

function buildStringPoolSteps() {
  const steps = [];

  const s = {
    stringPool: [],
    variables: [],
    heap: [],
    events: [],
    metrics: { interns: 0, heapRefs: 0, savings: 0 },
    vars: { poolSize: 0, heapCount: 0, action: '' },
  };

  s.vars = { poolSize: 0, heapCount: 0, action: 'init pool' };
  snap(steps, s, 'String pool (interned strings) lives in heap (pre-Java 7: PermGen). Empty at start.', 1);

  s.stringPool = [
    { literal: 'hello', address: '0x1001', references: 1, interned: true },
  ];
  s.variables = [
    { name: 's1', value: '"hello"', stackFrame: 'main' },
  ];
  s.events.push({ msg: 'String s1 = "hello" — literal → pool', type: 'info' });
  s.metrics.interns = 1;
  s.vars = { poolSize: 1, heapCount: 0, action: '"hello" added to pool' };
  snap(steps, s, 'String s1 = "hello": string literal → JVM checks pool. No existing entry → creates "hello" in pool. s1 references pool address 0x1001.', 2);

  s.variables.push(
    { name: 's2', value: '"hello"', stackFrame: 'main' },
  );
  s.stringPool[0].references = 2;
  s.events.push({ msg: 'String s2 = "hello" — reuse pool ref', type: 'ok' });
  s.vars = { poolSize: 1, heapCount: 0, action: '"hello" reused — 2 references' };
  snap(steps, s, 'String s2 = "hello": same literal → JVM finds "hello" in pool → s2 gets same address 0x1001. Both s1 and s2 refer to same object. s1 == s2 is true.', 3);

  s.variables.push(
    { name: 's3', value: 'new String("hello")', stackFrame: 'main' },
  );
  s.heap.push(
    { address: '0x2001', value: '"hello"', gen: 'eden' },
  );
  s.events.push({ msg: 'String s3 = new String("hello") — heap obj', type: 'warn' });
  s.metrics.heapRefs = 1;
  s.vars = { poolSize: 1, heapCount: 1, action: 'new String → heap, NOT pool' };
  snap(steps, s, 'String s3 = new String("hello"): "new" always creates a new object on heap (eden). s3 != s1 even though they have same value. Two objects now.', 4);

  s.variables.push(
    { name: 's4', value: 's3.intern() → pool 0x1001', stackFrame: 'main' },
  );
  s.events.push({ msg: 's3.intern() — returns pool reference', type: 'info' });
  s.events.push({ msg: 's4 == s1: true (both pool)', type: 'ok' });
  s.vars = { poolSize: 1, heapCount: 1, action: '.intern() returns pool ref 0x1001' };
  snap(steps, s, 's3.intern(): checks pool → "hello" exists → returns pool address 0x1001. s4 = s3.intern() so s4 == s1 is true. Heap object at 0x2001 is now eligible for GC.', 5);

  s.stringPool.push(
    { literal: 'hello world', address: '0x1002', references: 1, interned: true },
  );
  s.events.push({ msg: 'String concat: javac uses StringBuilder', type: 'info' });
  s.events.push({ msg: 'G1 string deduplication may merge duplicates', type: 'ok' });
  s.metrics.interns = 2;
  s.vars = { poolSize: 2, heapCount: 1, action: '"hello world" added' };
  snap(steps, s, 'String concatenation like "hello" + " world" → javac translates to StringBuilder.append(). G1 GC can deduplicate identical heap strings to pool references, reducing memory.', 6);

  return steps;
}

const STRINGPOOL_CODE = [
  'String s1 = "hello";                // → pool (0x1001)',
  'String s2 = "hello";                // → pool (same)',
  'String s3 = new String("hello");    // → heap (0x2001)',
  '',
  'System.out.println(s1 == s2);       // true (same pool ref)',
  'System.out.println(s1 == s3);       // false',
  '',
  'String s4 = s3.intern();            // → pool (0x1001)',
  'System.out.println(s1 == s4);       // true',
  '',
  '// G1 GC string deduplication:',
  '// -XX:+UseStringDeduplication',
  '',
  '// Pre-Java 7: pool in PermGen',
  '// Java 7+: pool moved to heap',
  '// String immutability enables safe sharing',
];

export default {
  id: 'stringpool',
  label: 'String Pool',
  icon: '\uD83E\uDDF5',
  build: buildStringPoolSteps,
  code: STRINGPOOL_CODE,
  language: 'Java',
  metrics: [
    { key: 'interns', label: 'Pool Entries', max: 5, color: 'var(--node-active)' },
    { key: 'heapRefs', label: 'Heap Strings', max: 3, color: 'var(--node-comparing)' },
    { key: 'savings', label: 'Savings', max: 5, color: 'var(--pod-running)' },
  ],
  topicContent: {
    concept: [
      { title: 'ELI5 — Library Card Catalog', content: 'Library has a master card catalog. Instead of writing same book info 100 times, you just point to the master card. Strings work the same way — pool stores one copy, everyone points to it.' },
      { title: 'Core — Pool Internals', content: 'String Pool (interned string table) is a hash table in the JVM heap (moved from PermGen to heap in Java 7+). String literals auto-interned — JVM checks pool before creating new object. String.intern() manually adds heap strings to pool. Two interned strings with same content share one object — == comparison works.' },
      { title: 'Edge — new String vs Literal', content: 'new String("x") always creates a new heap object outside the pool. String literals at compile time fold into pool entries. Runtime concatenation (var + "lo") creates new heap String via StringBuilder. Always use .equals() for content comparison, never ==.' },
      { title: 'Deep — Performance & Tuning', content: 'Pool default capacity: -XX:StringTableSize=65536. Tune with prime numbers. Java 8u20+: G1 String Deduplication (-XX:+UseG1GC -XX:+UseStringDeduplication) deduplicates strings during GC automatically. Pre-Java 7 pool in PermGen caused OOM with aggressive intern(). Java 7+ pool on heap — GC collects unused interned strings.' },
    ],
    why: [
      'String is the most common Java object. Without pooling, every identical literal creates redundant heap objects.',
      'Understanding intern behavior prevents subtle == vs .equals() bugs in production.',
      'Helps tune memory for string-heavy workloads (log parsing, XML/JSON processing).',
    ],
    interview: [
      { question: 'Where does the String Pool live in Java 7+ vs Java 6?', answer: 'Java 6: pool in PermGen (fixed size, OOM risk with aggressive intern()). Java 7+: pool moved to regular heap. GC can collect unused interned strings. This fixed PermGen OOM but means pool entries can be GCd if no references exist.', followUps: ['What is -XX:StringTableSize?', 'How to view pool stats?'] },
      { question: 'Why does new String("hello") not use the pool?', answer: 'new String() ALWAYS allocates a fresh heap object. The literal "hello" still creates/reuses a pool entry, but the new String wraps a copy of the char[]. Two objects for same content: one in pool, one on heap. s1 == s3 is false, s1.equals(s3) is true.', followUps: ['How many objects does new String("x") create?', 'When would you intentionally use new String()?'] },
      { question: 'When would you call String.intern() in production?', answer: 'Deduplicating strings from parsing (huge XML/JSON where same strings repeat millions of times). String keys read from files with high repetition. After Java 8u20, G1 String Deduplication does this automatically during GC — no intern() call needed. In Java 6, aggressive intern() in a loop can OOM PermGen.', followUps: ['What is the performance cost of intern()?', 'Does G1 dedup work for all GCs?'] },
    ],
    gotcha: [
      '== compares references, not content — always use .equals() or Objects.equals()',
      'new String("x") creates TWO objects: one in pool (the literal), one on heap',
      'String.format() / StringBuilder always produce heap strings — never pooled',
      'Java 6: pool in PermGen => OutOfMemoryError:PermGen with too many intern() calls',
      'Compile-time concatenation ("hel" + "lo") folds to pool entry. Runtime concatenation (var + "lo") uses StringBuilder => heap string',
    ],
    tradeoffs: [
      { pro: 'Memory deduplication — same string content = one object', con: 'Pool has overhead — hash table entries for every distinct string' },
      { pro: 'Pool lookup O(1) — hash table', con: 'Aggressive intern() can leak memory (pre-Java 7: PermGen; Java 7+: heap but still overhead)' },
      { pro: 'String literals automatically pooled — zero effort', con: 'Pool tuning requires -XX:StringTableSize flag knowledge' },
    ],
  },
};

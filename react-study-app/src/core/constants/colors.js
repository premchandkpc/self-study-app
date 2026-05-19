export const NODE_COLORS = {
  DEFAULT:   'var(--node-default)',
  ACTIVE:    'var(--node-active)',
  VISITED:   'var(--node-visited)',
  COMPARING: 'var(--node-comparing)',
  BLOCKED:   'var(--node-blocked)',
  DONE:      'var(--node-done)',
  PENDING:   'var(--node-pending)',
};

export const EDGE_COLORS = {
  DEFAULT: 'var(--edge-default)',
  ACTIVE:  'var(--edge-active)',
  FLOW:    'var(--edge-flow)',
  ERROR:   'var(--edge-error)',
};

export const COMPLEXITY_COLORS = {
  'O(1)':       'var(--complexity-best)',
  'O(log n)':   'var(--complexity-good)',
  'O(n)':       'var(--complexity-ok)',
  'O(n log n)': 'var(--complexity-ok)',
  'O(n²)':      'var(--complexity-bad)',
  'O(2^n)':     'var(--complexity-worst)',
  'O(n!)':      'var(--complexity-worst)',
};

export const KAFKA_COLORS = {
  PRODUCER:  'var(--kafka-producer)',
  BROKER:    'var(--kafka-broker)',
  CONSUMER:  'var(--kafka-consumer)',
  LAG:       'var(--kafka-lag)',
  PARTITION: 'var(--kafka-partition)',
};

export const K8S_COLORS = {
  RUNNING:     'var(--pod-running)',
  PENDING:     'var(--pod-pending)',
  CRASH:       'var(--pod-crash)',
  TERMINATING: 'var(--pod-terminating)',
};

export const JVM_COLORS = {
  EDEN:      'var(--heap-eden)',
  SURVIVOR:  'var(--heap-survivor)',
  OLD:       'var(--heap-old)',
  METASPACE: 'var(--metaspace)',
  GC_SWEEP:  'var(--gc-sweep)',
};

export const CELL_COLORS = {
  idle:      'var(--node-default)',
  active:    'var(--node-active)',
  window:    'var(--node-comparing)',
  left:      'var(--node-active)',
  right:     'var(--pod-crash)',
  found:     'var(--node-visited)',
  visited:   'var(--text-muted)',
  removing:  'var(--pod-crash)',
  adding:    'var(--node-active)',
  done:      'var(--node-done)',
  comparing: 'var(--node-comparing)',
  sorted:    'var(--pod-running)',
  pivot:     'var(--kafka-producer)',
};

export const DSA_NODE_COLORS = {
  default:   'var(--node-default)',
  active:    'var(--node-active)',
  visited:   'var(--node-visited)',
  comparing: 'var(--node-comparing)',
  done:      'var(--node-done)',
  curr:      'var(--node-active)',
  prev:      'var(--node-comparing)',
  next:      'var(--kafka-producer)',
  idle:      'var(--node-default)',
  slow:      'var(--node-comparing)',
  fast:      'var(--pod-crash)',
  meet:      'var(--node-visited)',
};

export const GRAPH_NODE_COLORS = {
  default:  'var(--node-default)',
  active:   'var(--node-active)',
  visiting: 'var(--node-comparing)',
  visited:  'var(--node-visited)',
  done:     'var(--node-done)',
};

export const SYSTEM_NODE_META = {
  client:  { fill: 'var(--node-default)',    icon: '\u{1F464}' },
  server:  { fill: 'var(--node-visited)',    icon: '\u{1F5A5}' },
  lb:      { fill: 'var(--node-comparing)',  icon: '\u{2696}' },
  cache:   { fill: 'var(--node-blocked)',    icon: '\u{1F4BE}' },
  db:      { fill: 'var(--pod-crash)',       icon: '\u{1F5C4}' },
  cdn:     { fill: 'var(--kafka-producer)',  icon: '\u{1F310}' },
  queue:   { fill: 'var(--node-comparing)',  icon: '\u{1F4E8}' },
  worker:  { fill: 'var(--node-visited)',    icon: '\u{2699}' },
  pod:     { fill: 'var(--pod-running)',     icon: '\u{1F4E6}' },
  broker:  { fill: 'var(--kafka-producer)',  icon: '\u{1F4E1}' },
  default: { fill: 'var(--node-default)',    icon: '\u{25CF}' },
};

export const TECH_BOX_META = {
  thread:    { fill: 'var(--node-active)',    icon: '\u{1F9F5}' },
  goroutine: { fill: 'var(--node-active)',    icon: '\u{1F439}' },
  heap:      { fill: 'var(--pod-crash)',      icon: '\u{1F4E6}' },
  stack:     { fill: 'var(--node-visited)',   icon: '\u{1F4CB}' },
  channel:   { fill: 'var(--kafka-producer)', icon: '\u{1F4E1}' },
  mutex:     { fill: 'var(--node-comparing)', icon: '\u{1F512}' },
  process:   { fill: 'var(--node-default)',   icon: '\u{2699}' },
  gc:        { fill: 'var(--node-done)',      icon: '\u{267B}' },
  eden:      { fill: 'var(--node-active)',    icon: '\u{1F331}' },
  survivor:  { fill: 'var(--node-comparing)', icon: '\u{1F504}' },
  old:       { fill: 'var(--node-done)',      icon: '\u{1F3DB}' },
  default:   { fill: 'var(--node-default)',   icon: '\u{25A3}' },
};

export const STATE_COLORS = {
  active:  'var(--node-active)',
  ok:      'var(--pod-running)',
  error:   'var(--pod-crash)',
  warn:    'var(--node-comparing)',
  blocked: 'var(--pod-crash)',
  waiting: 'var(--node-comparing)',
  running: 'var(--pod-running)',
  done:    'var(--node-done)',
};

export const PKT_COLORS = {
  request:     'var(--node-active)',
  response:    'var(--pod-running)',
  replication: 'var(--node-comparing)',
  event:       'var(--kafka-producer)',
  default:     'var(--node-active)',
};

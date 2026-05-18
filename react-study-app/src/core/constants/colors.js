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

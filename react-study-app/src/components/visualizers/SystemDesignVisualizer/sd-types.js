/* Shared node type definitions — single source of truth for icons and colors.
   Imported by both sd scenarios (via shared.js) and CanvasTemplate renderer. */

export const ICONS = {
  client:  '💻',
  server:  '🖥',
  gateway: '🛡️',
  lb:      '⚖️',
  cache:   '⚡',
  redis:   '⚡',
  db:      '🐘',
  broker:  '📨',
  cdn:     '🌐',
  service: '⚙️',
  raft:    '⬡',
  pod:     '📦',
  worker:  '⚙️',
  queue:   '📬',
};

export const NODE_COLORS = {
  client:  'var(--node-default)',
  server:  'var(--node-visited)',
  lb:      'var(--node-comparing)',
  cache:   'var(--node-blocked)',
  redis:   'var(--node-blocked)',
  db:      'var(--pod-crash)',
  cdn:     'var(--kafka-producer)',
  queue:   'var(--node-comparing)',
  worker:  'var(--node-visited)',
  pod:     'var(--pod-running)',
  broker:  'var(--kafka-producer)',
  gateway: 'var(--node-active)',
  service: 'var(--node-visited)',
  raft:    'var(--node-visited)',
};

import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../sd-types';

const _mk = createNodeFactory(ICONS);
const appNode = _mk('service');
const apiNode = _mk('api');

function buildConfigSteps() {
  const steps = [];
  const s = {
    nodes: [
      appNode('service', 'Order Service', 150, 150, { desc: 'In-memory config cache' }),
      apiNode('etcd', 'etcd Config Store', 350, 150, { desc: 'Source of truth (v=/config/order/db_pool=50)' }),
      appNode('feature', 'Feature Flags', 550, 150, { desc: 'Feature A: 10% rollout, Feature B: 100%' }),
    ],
    edges: [
      { from: 'service', to: 'etcd', protocol: 'watch' },
      { from: 'service', to: 'feature', protocol: 'check' },
    ],
    packets: [],
    events: [],
    metrics: { config_version: 1, features_enabled: 1, rollout_percent: 10 },
  };

  snap(steps, s, 'Config Management: Centralized configs, feature flags, dynamic reload. Zero downtime.', 1);

  s.nodes[0].state = 'active';
  s.nodes[1].state = 'active';
  s.packets = [packet('service', 'etcd', 'WATCH /config/order/*')];
  s.metrics.config_version = 1;
  s.events.push({ type: 'info', msg: 'Service watches etcd for config changes. Loads: db_pool=50, timeout=5s, cache_ttl=3600s.' });
  snap(steps, s, 'Service starts. Watches etcd for config updates. Current: db_pool=50, timeout=5s.', 2);

  s.nodes[0].state = 'active';
  s.packets = [packet('feature', 'service', 'check feature_flag:fast_checkout')];
  s.events.push({ type: 'info', msg: 'Checks feature flag: fast_checkout is 10% rollout. User_ID%100 < 10? YES → show feature.' });
  snap(steps, s, 'Feature flag check: fast_checkout at 10% rollout. User 5 gets feature. User 99 doesn\'t.', 3);

  s.nodes[1].state = 'active';
  s.packets = [packet('etcd', 'service', 'CONFIG_UPDATE: db_pool=100')];
  s.metrics.config_version = 2;
  s.events.push({ type: 'info', msg: 'Operator updates config in etcd: db_pool=50 → 100. Webhook notifies service.' });
  snap(steps, s, 'Config change: db_pool increased 50 → 100. Etcd sends watch notification.', 4);

  s.nodes[0].state = 'active';
  s.events.push({ type: 'ok', msg: 'Service reloads config in memory. New connections use db_pool=100. No restart needed!' });
  snap(steps, s, 'Service reloads config. Connection pool resize: 50 → 100. Graceful, no downtime.', 5);

  s.nodes[2].state = 'active';
  s.packets = [packet('etcd', 'feature', 'FLAG_UPDATE: fast_checkout=50%')];
  s.metrics.rollout_percent = 50;
  s.events.push({ type: 'info', msg: 'Feature flag rollout increased: 10% → 50%. Gradual canary deployment.' });
  snap(steps, s, 'Feature flag rollout: 10% → 50%. No code deploy. Just config change. Canary test successful.', 6);

  s.nodes[2].state = 'active';
  s.packets = [packet('feature', 'service', 'fast_checkout=ENABLED (50% users)')];
  s.metrics.rollout_percent = 50;
  s.metrics.features_enabled = 1;
  s.events.push({ type: 'ok', msg: 'More users see feature. Metrics: conversion_rate=+2% (success!). Increase to 100%.' });
  snap(steps, s, 'Rollout success: 50% users, metrics good. Increase to 100%.', 7);

  s.nodes[2].state = 'active';
  s.metrics.rollout_percent = 100;
  s.events.push({ type: 'ok', msg: 'Feature flag: 100% rollout. All users get fast_checkout. Kill legacy code in next deploy.' });
  snap(steps, s, 'Full rollout: 100%. All users on feature. Legacy code removed in next deploy.', 8);

  return steps;
}

const CODE = [
  '// Config management with etcd + feature flags',
  'const etcd = require("etcd3");',
  'const client = new etcd.Etcd3();',
  '',
  '// Watch config',
  'const watcher = client.watch()',
  '  .prefix("/config/order")',
  '  .create();',
  '',
  'watcher.on("change", (event) => {',
  '  if (event.type === "PUT") {',
  '    const [, , key, value] = event.value();',
  '    CONFIG[key] = value;', // Reload in-memory
  '    logger.info("Config updated", {key, value});',
  '  }',
  '});',
  '',
  '// Feature flags (LaunchDarkly, Unleash, custom)',
  'const isFlagEnabled = (flag, userId) => {',
  '  const config = FLAGS[flag];',
  '  return (userId % 100) < config.rollout_percent;',
  '};',
  '',
  'app.get("/checkout", (req, res) => {',
  '  if (isFlagEnabled("fast_checkout", req.user.id)) {',
  '    // New code path',
  '  } else {',
  '    // Legacy path',
  '  }',
  '});',
];

export default {
  id: 'config-management',
  label: 'Config Management & Feature Flags',
  icon: '⚙️',
  build: buildConfigSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'config_version', label: 'Config Version', max: 5, color: 'var(--node-default)' },
    { key: 'features_enabled', label: 'Features', max: 10, color: 'var(--pod-running)' },
    { key: 'rollout_percent', label: 'Rollout %', max: 100, unit: '%', color: 'var(--node-comparing)' },
  ],
  codeNotes: [
    { title: 'Centralized Config', content: 'Single source of truth (etcd, Consul, S3). Watch for changes. Reload in-memory. No restart needed.' },
    { title: 'Config Versioning', content: 'Each change = new version. Rollback: revert to old version. Audit trail.' },
    { title: 'Feature Flags', content: 'Boolean or percentage-based rollout. User ID hashing: (user_id % 100) < rollout_percent = consistent across requests.' },
    { title: 'Canary Deployment', content: 'Roll out 5% → 10% → 50% → 100% based on metrics. Kill feature if bad metrics detected.' },
  ],
  tradeoffs: [
    { pro: 'Dynamic config reload = zero downtime', con: 'Complexity: race conditions on reload. Test thoroughly.' },
    { pro: 'Feature flags enable AB testing', con: 'Dead code accumulates. Must remove flags after 1-2 months.' },
    { pro: 'Canary safe: rollback immediately', con: 'Data/schema changes still need deployments. Config alone not enough.' },
    { pro: 'Operator-friendly: no engineers needed', con: 'Wrong config = outage. Need validation + staging.' },
  ],
  bestPractices: [
    'Validate config on load: schema check, bounds check. E.g., db_pool ∈ [1,1000]. Invalid = reject, log error.',
    'Feature flag TTL: remove old flags monthly. Too many flags = confusion. Use dashboards to track active flags.',
    'Canary: 5% → 10% → 50% → 100%. Each step: wait 24h, monitor error_rate, p99_latency, business metrics.',
    'Fallback: if etcd down, use cached config. Don\'t fail on config load. Better to use stale config than crash.',
    'Audit: log all config changes + who changed it. For security: restrict etcd access to ops team only.',
  ],
};

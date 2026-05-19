import { snap, makePod, makeNode } from '@/core/utils/scenarioShared';

function buildRollingSteps() {
  const steps = [];
  const s = {
    nodes: [makeNode('node-1'), makeNode('node-2'), makeNode('node-3')],
    pods: [
      { ...makePod('v1-a', 'node-1', 'running'), version: 'v1', ready: true },
      { ...makePod('v1-b', 'node-2', 'running'), version: 'v1', ready: true },
      { ...makePod('v1-c', 'node-3', 'running'), version: 'v1', ready: true },
    ],
    metrics: { pods: 3, nodes: 3, cpu: 20, restarts: 0 },
    events: [],
    deployVersion: 'v1',
  };

  snap(steps, s, 'v1: 3/3 pods running. Ready to rolling-deploy v2.', 1);

  s.events.push({ type: 'info', msg: 'kubectl set image deployment/app app=app:v2' });
  s.deployVersion = 'v2 rolling...';
  snap(steps, s, 'Rolling update started. maxSurge=1, maxUnavailable=0.', 2);

  for (let i = 0; i < 3; i++) {
    // new v2 pod surge
    const newPod = { ...makePod(`v2-${String.fromCharCode(97 + i)}`, s.nodes[i].id, 'pending'), version: 'v2', ready: false };
    s.pods.push(newPod);
    s.metrics.pods = s.pods.length;
    snap(steps, s, `Surge: v2 pod on ${s.nodes[i].id}: PENDING (pulling image).`, 3);

    newPod.state = 'running';
    newPod.ready = true;
    snap(steps, s, `v2 pod RUNNING, readiness probe passed. Old v1 pod can be terminated.`, 5);

    // terminate old v1
    const oldIdx = s.pods.findIndex((p) => p.version === 'v1');
    s.pods[oldIdx].state = 'terminating';
    snap(steps, s, `v1-${String.fromCharCode(97 + i)}: TERMINATING. Graceful shutdown. No downtime.`, 6);

    s.pods.splice(oldIdx, 1);
    s.metrics.pods = s.pods.length;
  }

  s.deployVersion = 'v2';
  snap(steps, s, '✅ Rolling deploy complete. 3/3 pods on v2. Zero downtime.', 8);
  return steps;
}

export const K8S_CODE_ROLLING = [
  '# Rolling update',
  'kubectl set image deploy/app app=v2',
  '# Strategy:',
  'maxSurge: 1        # +1 new pod',
  'maxUnavailable: 0  # no downtime',
  '# For each old pod:',
  '  createNewPod(v2)',
  '  waitReady()',
  '  terminateOld(v1)',
  '# Zero-downtime deploy',
];

export default {
  id: 'rolling',
  label: 'Rolling',
  icon: '🔄',
  build: buildRollingSteps,
  code: K8S_CODE_ROLLING,
  language: 'YAML/Shell',
  metrics: [
    { key: 'pods',     label: 'Pods',     max: 8,  color: 'var(--pod-running)' },
    { key: 'cpu',      label: 'CPU avg',  max: 100, unit: '%', color: 'var(--node-comparing)' },
    { key: 'restarts', label: 'Restarts', max: 10, color: 'var(--pod-crash)' },
  ],
};

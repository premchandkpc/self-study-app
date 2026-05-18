import { snap, makePod, makeNode } from './shared';

function buildCrashSteps() {
  const steps = [];
  const s = {
    nodes: [makeNode('node-1')],
    pods: [makePod('crash-pod', 'node-1', 'pending')],
    metrics: { pods: 1, nodes: 1, cpu: 5, restarts: 0 },
    events: [],
    deployVersion: 'v1',
  };

  snap(steps, s, 'Pod scheduled on node-1. kubelet starts container.', 1);

  const pod = s.pods[0];
  pod.state = 'running';
  snap(steps, s, 'Container started. Running initialization…', 2);

  for (let i = 1; i <= 4; i++) {
    pod.state = 'error';
    pod.restarts = i;
    s.metrics.restarts = i;
    s.events.push({ type: 'error', msg: `Container exited (code=1). Restart #${i}` });
    snap(steps, s, `❌ Container crashed (exit code 1). Restart #${i}. Backoff: ${2 ** (i - 1) * 10}s.`, 4);

    if (i < 4) {
      pod.state = 'running';
      snap(steps, s, `Backoff wait done. Container restarted. Attempt ${i + 1}…`, 2);
    }
  }

  pod.state = 'crashloopbackoff';
  s.events.push({ type: 'error', msg: 'CrashLoopBackOff: max backoff 5min reached.' });
  snap(steps, s, '⚠ CrashLoopBackOff. Kubernetes waiting 5min before next retry. Check logs.', 6);

  return steps;
}

export const K8S_CODE_CRASH = [
  '# Pod restart policy',
  'restartPolicy: Always',
  '# CrashLoopBackOff',
  'backoff: 10s → 20s → 40s',
  '         → 80s → 160s → 5min',
  '# Debug commands:',
  'kubectl logs <pod> --previous',
  'kubectl describe pod <pod>',
  'kubectl exec -it <pod> -- sh',
];

export default {
  id: 'crash',
  label: 'Crash Loop',
  icon: '💥',
  build: buildCrashSteps,
  code: K8S_CODE_CRASH,
  language: 'YAML/Shell',
  metrics: [
    { key: 'pods',     label: 'Pods',     max: 8,  color: 'var(--pod-running)' },
    { key: 'cpu',      label: 'CPU avg',  max: 100, unit: '%', color: 'var(--node-comparing)' },
    { key: 'restarts', label: 'Restarts', max: 20, color: 'var(--pod-crash)', warn: 30, critical: 60 },
  ],
};

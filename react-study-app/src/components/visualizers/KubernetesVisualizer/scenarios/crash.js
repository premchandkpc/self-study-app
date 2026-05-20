import { snap, makePod, makeNode } from '@/core/utils/scenarioShared';

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
  topicContent: {
    concept: [
      { title: 'CrashLoopBackOff', content: 'When a container repeatedly crashes (exit code != 0), Kubernetes enters CrashLoopBackOff state. Backoff doubles: 10s, 20s, 40s, 80s, 160s, then maxes at 5min. This prevents rapid restart cycling that would overwhelm the kubelet.' },
      { title: 'Restart Policy', content: 'Pod spec has restartPolicy: Always (default), OnFailure, or Never. For jobs/cronjobs, OnFailure or Never is appropriate. For deployments, Always ensures self-healing.' },
    ],
    why: ['Crash loops are the most common pod issue. Understanding backoff behavior, log retrieval, and debugging techniques is essential for reducing MTTR (Mean Time to Recovery).'],
    interview: [
      { question: 'Why does Kubernetes use exponential backoff for restarts?', answer: 'To prevent resource exhaustion from rapid container restarts. Without backoff, a crashing container could generate thousands of restart attempts per minute, wasting CPU, disk I/O (pulling images), and API server resources on the failed container.', followUps: ['How do you view logs from a crashed container?', 'How can you manually reset the CrashLoopBackOff timer?'] },
      { question: 'What are common causes of container crashes?', answer: 'Missing environment variables, failed dependency checks (database unreachable), disk space exhaustion, out-of-memory errors (OOMKilled), misconfigured startup commands, application bugs, and invalid config files mounted from ConfigMaps.', followUps: ['What is the difference between OOMKilled and CrashLoopBackOff?', 'How do liveness and readiness probes interact with crash loops?'] },
    ],
    gotcha: ['kubectl logs shows current container logs — use kubectl logs pod-name --previous to see logs from the PREVIOUS (crashed) container instance, which contains the crash error.', 'A pod can appear Running but still be crash-looping if the restart count is high. Check kubectl get pods -w for restart count increases — the state shows CrashLoopBackOff only after backoff exceeds.'],
    tradeoffs: [
      { pro: 'Automatic restart provides self-healing without manual intervention', con: 'Exponential backoff delays recovery — a crashing pod may be unavailable for 5+ minutes' },
      { pro: 'Configurable restart policy per workload type', con: 'Always restart policy can mask underlying issues, causing silent data corruption' },
    ],
  },
};

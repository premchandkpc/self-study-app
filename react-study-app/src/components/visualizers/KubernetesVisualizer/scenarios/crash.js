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
      { title: 'What is CrashLoopBackOff in simple terms?', content: 'CrashLoopBackOff is Kubernetes\' way of saying "your container keeps crashing, so I\'m going to wait longer between each restart attempt." When a container exits with a non-zero code, Kubernetes restarts it according to the restart policy. After each crash, the backoff delay doubles: 10s, 20s, 40s, 80s, 160s, then maxes at 5 minutes. This prevents a continuously crashing container from overwhelming the kubelet with restart attempts.' },
      { title: 'How crash loop detection works — core mechanics', content: 'The kubelet checks the container\'s exit code — any non-zero code is a failure. After each crash, kubelet increments the restart count in the pod status and applies exponential backoff before the next restart. The backoff timer resets after the container runs successfully for 10 minutes. CrashLoopBackOff state appears when the backoff window grows large enough that the container is visibly unavailable for extended periods.' },
      { title: 'Deep — restart policy & probe interactions', content: 'restartPolicy: Always (default for Deployments) restarts regardless of exit code. OnFailure restarts only on non-zero exits. Never never restarts. Liveness probes interact with restart policy — a failed liveness probe triggers a container restart regardless of exit code, resetting the backoff timer. Readiness probes do NOT trigger restarts — they only control service endpoint inclusion. A container can be crash-looping due to failed liveness probes (process running but unresponsive) rather than process exit.' },
      { title: 'OOMKilled vs CrashLoopBackOff', content: 'OOMKilled (exit code 137) means the container exceeded its memory limit and was killed by the kernel OOM killer. CrashLoopBackOff can occur with any exit code (1, 137, 139 for segfault, 143 for SIGTERM). OOMKilled requires increasing memory limits or fixing memory leaks; non-OOM crashes require log analysis. The two frequently co-occur — a pod that gets OOMKilled then restarts, crashes again, and enters CrashLoopBackOff.' },
    ],
    why: [
      'Crash loops are the most common pod issue in production — misconfigured environment variables, missing dependency checks, and memory limits that are too low account for the majority of crash loop causes. Understanding the backoff pattern, log retrieval, and probe interaction is essential for reducing MTTR (Mean Time to Recovery) from minutes to seconds.',
      'The exponential backoff mechanism is specifically designed to prevent resource exhaustion on the node. Without it, a single misconfigured container could generate thousands of restart attempts per minute, consuming CPU cycles for container creation, disk I/O for image pulls, API server writes for status updates, and etcd storage for event records — rapidly degrading the health of the entire node.',
      'Crash loop debugging requires a systematic approach: check exit code (kubectl describe pod), review previous container logs (kubectl logs --previous), verify environment variables and ConfigMaps, test the container image locally, and check resource limits vs actual usage. Mastering this diagnostic flow is a core skill for any Kubernetes operator responding to production incidents.',
    ],
    interview: [
      { question: 'Explain the exact backoff algorithm Kubernetes uses for CrashLoopBackOff and how the timer resets.', answer: 'Kubernetes uses exponential backoff starting at 10s after the first restart, then doubling: 20s, 40s, 80s, 160s, and finally capping at 300s (5 minutes) maximum. The formula is: backoff = min(2^(n-1) × 10, 300) where n is the restart count. The kubelet tracks backoff per container using a sliding window — if the container runs successfully (exit code 0 and no startup/liveness probe failures) for more than 10 minutes, the backoff counter resets to 0 and the next restart starts at 10s again. This prevents a temporarily misconfigured container from suffering permanently long backoff. The backoff only applies to the kubelet\'s internal restart logic — manually deleting the pod resets the counter because it creates a fresh pod instance on the API server, starting with backoff=0 from the kubelet\'s perspective.', followUps: ['Does CrashLoopBackOff affect rolling updates — can a deployment roll forward if old pods are crash-looping?', 'How do you manually reset the CrashLoopBackOff timer without deleting the pod?'] },
      { question: 'How do liveness and readiness probes interact with crash loops, and what debugging approach would you take for a pod in CrashLoopBackOff?', answer: 'Liveness probes detect when a process is running but unresponsive — a failed liveness probe (e.g., HTTP health endpoint returning 5xx or timing out) causes kubelet to restart the container, incrementing the restart counter and potentially triggering CrashLoopBackOff. Readiness probes do NOT cause restarts — they only remove the pod from Service endpoints. A pod can have its readiness probe failing but never enter CrashLoopBackOff. Debugging approach: 1) kubectl describe pod to check exit code, restart count, and last probe status. 2) kubectl logs <pod> --previous to see the PREVIOUS container instance\'s logs (critical — current container logs are empty if it crashed at startup). 3) Check environment variables and ConfigMaps/Secrets referenced by the pod for typos or missing values. 4) kubectl exec into the container image locally to reproduce the startup error. 5) Check resource limits — if exit code is 137 (SIGKILL), the container is being OOMKilled. 6) Check events (kubectl get events --field-selector involvedObject.name=<pod>) for probe failure details.', followUps: ['How does a liveness probe with an incorrect initialDelaySeconds affect crash loop behavior?', 'What is the difference between exit code 137 (OOMKilled) and exit code 139 (segfault) in terms of debugging approach?'] },
      { question: 'How do you handle a database migration container that crashes during startup due to missing schema — should you use a different restart policy?', answer: 'For job-type workloads (database migrations, batch processing), restartPolicy: OnFailure or Never is appropriate. OnFailure restartPolicy restarts the container only if it exits with a non-zero code — useful for transient failures like network timeouts connecting to the database. Never is appropriate when you want to inspect the failed container\'s state without automatic retries. For database migrations specifically, use an init container or Job with restartPolicy: OnFailure and backoffLimit: 5 (limits retries to prevent infinite crash loops). The migration container should also implement idempotency checks (IF NOT EXISTS patterns) so re-runs do not corrupt the schema. If using a Deployment for the migration, restartPolicy: Always (the default) would cause the migration container to restart forever, attempting failed migrations every 5 minutes in CrashLoopBackOff — a dangerous pattern that can corrupt databases if migrations are not idempotent.', followUps: ['How do Job backoffLimit and activeDeadlineSeconds parameters limit crash loops differently from the kubelet\'s built-in backoff?', 'What is the TTL-after-finished controller and how does it clean up failed Jobs?'] },
    ],
    gotcha: [
      'kubectl logs <pod> shows logs from the CURRENT running container instance — which may be empty if the container crashed at startup. Use kubectl logs <pod> --previous to see logs from the PREVIOUS (crashed) container instance, which contains the actual error causing the crash. This is the single most important debugging flag for crash loops.',
      'A pod can appear in Running state while actively crash-looping — the CrashLoopBackOff state only appears once the backoff interval exceeds a threshold. Watch kubectl get pods -w for restart count increases in the RESTARTS column. A pod showing Running with RESTARTS: 15 and a 5-minute backoff is effectively down even though the status says Running.',
      'A misconfigured ConfigMap or Secret mounting an invalid file can cause a container to crash before it writes anything to stdout — leaving no logs in either the current or previous container. In this case, the crash happens during filesystem setup, before the application process starts. Debug by checking the pod\'s events for volume mount errors and verifying the ConfigMap data structure matches the mount path.',
      'Deleting a pod in CrashLoopBackOff resets the backoff timer — the new pod starts with backoff=0. Aggressive pod deletion by automation tools can mask crash loops. If your CI/CD automatically deletes and recreates crashing pods, the backoff never accumulates and the crash loop never surfaces as CrashLoopBackOff, hiding the issue from monitoring systems that alert on that state.',
    ],
    tradeoffs: [
      { pro: 'Automatic restart provides self-healing — a container that crashes due to a transient error (network timeout, database connection pool exhaustion) restarts and recovers without any human intervention. The exponential backoff ensures the node does not waste resources on rapidly restarting a persistently failing container, protecting other pods on the same node from noisy-neighbor container churn.', con: 'Exponential backoff delays recovery for persistently failing containers — max backoff of 5 minutes means a misconfigured application can be down for 5+ minutes before the next restart attempt. During this time, the pod is effectively dead: it is removed from Service endpoints, and traffic is redirected to other replicas. If no healthy replicas exist, the application experiences full downtime.' },
      { pro: 'Configurable restartPolicy per workload type (Always, OnFailure, Never) allows workload-appropriate behavior. CronJobs and Jobs use OnFailure or Never to avoid infinite restart loops for tasks that should fail permanently after exhausting retries. Deployments use Always for automatic self-healing of long-running services.', con: 'Always restart policy can mask underlying issues indefinitely. A container that crashes due to a persistent database schema mismatch restarts forever without ever succeeding, consuming node resources indefinitely. The only indication of the problem is the RESTARTS column and events — no alert fires unless explicitly configured. This can lead to silent data corruption if the crashed process had partially written state before exiting.' },
      { pro: 'The CrashLoopBackOff mechanism integrates with pod eviction and lifecycle — a pod in CrashLoopBackOff triggers event records, increments restart counters visible in monitoring, and can be caught by pod disruption budgets and anti-affinity rules. This enables operators to build monitoring alerts on restart count thresholds (e.g., >5 restarts in 10 minutes → PagerDuty).', con: 'There is no built-in mechanism to permanently stop crashing containers. A pod that has been crash-looping for days with the max 5-minute backoff continues indefinitely, consuming CPU, memory, and ephemeral storage for container filesystem layers. Without manual intervention (fixing the issue or deleting the pod), the resource waste accumulates indefinitely across every restart.' },
    ],
  },
};

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
  topicContent: {
    concept: [
      { title: 'What are rolling updates in simple terms?', content: 'A rolling update replaces pods of an old application version with new ones one by one, keeping the application available throughout the process. Instead of killing all old pods and starting new ones (which causes downtime), Kubernetes creates new pods alongside old ones, waits for them to become healthy, then terminates the old pods. This ensures zero downtime during deployments.' },
      { title: 'How rolling updates work — core mechanics', content: 'When kubectl set image triggers an update, the Deployment controller creates a new ReplicaSet for the new version. It then scales the new ReplicaSet up (creating new pods) while scaling the old ReplicaSet down (terminating old pods) according to the strategy parameters. At each step, the controller waits for the new pods to pass their readiness probes before proceeding to the next batch. If new pods fail to become ready, the update pauses automatically.' },
      { title: 'Deep — maxSurge, maxUnavailable & rollback', content: 'maxSurge (default 25%, rounded up) controls how many extra pods can be created above the desired replica count — e.g., maxSurge=1 on a 3-replica deployment allows 4 pods during update. maxUnavailable (default 25%, rounded up) controls how many pods can be unavailable — maxUnavailable=0 means all 3 replicas must stay serving throughout the update. The Deployment stores revision history (default 10 revisions) enabling kubectl rollout undo to revert to any previous revision by switching between ReplicaSets.' },
      { title: 'Progressive delivery & advanced strategies', content: 'Beyond basic rolling updates, Kubernetes supports: 1) Blue/green deployments — create the new version as a separate Service and switch traffic via label selector update. 2) Canary deployments — route a percentage of traffic to the new version using Ingress weights or service mesh traffic shifting. 3) A/B testing — route traffic based on headers or cookies using service mesh or Istio VirtualService. These advanced patterns build on the same ReplicaSet mechanism but add traffic management layers.' },
    ],
    why: [
      'Zero-downtime deployments are critical for production services — even a few seconds of downtime during deployments can cause revenue loss, failed transactions, and user frustration. Understanding rolling update strategy parameters is essential for balancing deployment speed against safety in production environments.',
      'Misconfigured rolling update parameters are a common cause of stalled deployments. Setting maxUnavailable=0 with insufficient cluster capacity (no room for surge pods) or PDB constraints that block pod termination can cause deployments to hang indefinitely, requiring manual intervention. Engineers must understand how these parameters interact with Cluster Autoscaler and PodDisruptionBudget.',
      'Rollback capability via revision history is a critical safety net. The default of 10 stored revisions consumes minimal etcd storage but enables quick recovery from bad deployments. kubectl rollout history, rollout undo, and the --to-revision flag provide operators with surgical rollback capabilities without needing to rebuild or redeploy previous versions.',
    ],
    interview: [
      { question: 'Walk through the exact process of a rolling update with maxSurge=1 and maxUnavailable=0 on a 5-replica deployment.', answer: '1. User runs kubectl set image deployment/app app=v2. 2. The Deployment controller detects the change in pod template hash, creates a new ReplicaSet (rs-v2) with desired=0. 3. The old ReplicaSet (rs-v1) has desired=5, current=5, ready=5. 4. maxSurge=1 allows 1 extra pod above 5 (total max 6). maxUnavailable=0 means at least 5 pods must be ready. 5. Controller scales rs-v2 up by 1 (desired=1) → pod v2-1 created, PENDING, then RUNNING after readiness probe. 6. Now 6 pods total (5 v1 + 1 v2), 6 ready. Controller scales rs-v1 down by 1 (desired=4) → terminates one v1 pod gracefully (SIGTERM, terminationGracePeriodSeconds). 7. Now 5 pods total (4 v1 + 1 v2), 5 ready. Controller repeats: scale rs-v2 up by 1 → 5 v1 + 2 v2 = 7 total. Wait for ready. Scale rs-v1 down → 3 v1 + 2 v2 = 5 total. 8. This continues until rs-v1 reaches desired=0 and rs-v2 reaches desired=5. 9. rs-v1 is retained with desired=0 for rollback. The entire process guarantees that at least 5 replicas are always serving traffic — no downtime. If a new pod fails its readiness probe, the update pauses: rs-v2 does not scale up further, and old pods continue serving.', followUps: ['What happens if cluster capacity cannot accommodate the surge pods?', 'How does the readiness probe failure handling differ between liveness and readiness during rolling updates?'] },
      { question: 'How do you rollback a failed deployment, and what mechanisms ensure the rollback itself is safe?', answer: 'kubectl rollout undo deployment/app rolls back to the previous revision. The Deployment controller achieves rollback by setting the pod template to the previous revision\'s template — this triggers a new rolling update in the reverse direction. For precise rollback: kubectl rollout undo deployment/app --to-revision=3 rolls back to revision 3 specifically. kubectl rollout history deployment/app lists all revisions with their change-cause annotations. The rollback itself uses the same rolling update strategy (maxSurge/maxUnavailable) — it is just as safe as the forward deployment. The ReplicaSet for the target revision must still exist — if it was pruned by revisionHistoryLimit (default 10), the rollback creates a new ReplicaSet with the old pod template rather than reusing the original. The annotation kubernetes.io/change-cause captures the reason for each revision via kubectl annotate or --record (deprecated). During rollback, new pods are created with the old template while current-version pods are terminated — same zero-downtime guarantees apply.', followUps: ['What happens if the old ReplicaSet was already scaled to zero and pruned?', 'How do you prevent automatic rollback of a deployment that is still starting up?'] },
      { question: 'How do PodDisruptionBudgets interact with rolling updates, and what happens when a PDB blocks the update?', answer: 'PDB (PodDisruptionBudget) constrains voluntary pod disruptions, which includes the pod terminations during a rolling update. If a PDB with minAvailable: 4 is applied to a 5-replica deployment, the rolling update cannot terminate more than 1 pod at a time (5 - 4 = 1 max unavailable). During the update, when the Deployment controller tries to scale down the old ReplicaSet, the eviction API checks the PDB — if terminating the pod would violate minAvailable, the eviction is rejected. The Deployment controller retries with exponential backoff. This can cause the rolling update to stall indefinitely if the PDB setting conflicts with the maxUnavailable parameter. For example, maxUnavailable=0 with PDB minAvailable=5 on a 5-replica deployment is safe. But maxUnavailable=1 with PDB minAvailable=5 means the PDB prevents any pod termination (since 4 < 5), and the update cannot proceed. Solution: ensure PDB minAvailable ≤ desiredReplicas - maxUnavailable. For StatefulSets, the same PDB interaction applies but the update is ordered (pod-0, pod-1, ...) and the controller does not proceed until the current pod is healthy.', followUps: ['How does the rolling update of a StatefulSet differ from a Deployment?', 'What is the partitioned rolling update strategy for StatefulSets?'] },
    ],
    gotcha: [
      'Setting maxUnavailable=0 with maxSurge=0 causes the Deployment controller to stall — it cannot create new pods (maxSurge=0 means no extra pods allowed) and cannot terminate old pods (maxUnavailable=0 means no pods can be down). The deployment is stuck with no way to make progress until one of the parameters is changed. Always ensure at least one of these is non-zero.',
      'Rolling updates depend entirely on readiness probes to determine if a new pod is healthy. A misconfigured readiness probe that always returns 200 (even when the app is not ready) causes the update to proceed and serve traffic to pods that are not actually ready — potentially serving broken code to a subset of users. Always implement meaningful readiness probes that check actual application health.',
      'The revisionHistoryLimit defaults to 10 — ReplicaSets beyond this limit are automatically deleted. If you need to rollback to a revision whose ReplicaSet was pruned, the rollback recreates the old template as a new ReplicaSet, which works but loses the exact history of the original ReplicaSet (including its scale-up history and pod creation timestamps). For critical deployments, set revisionHistoryLimit higher or use external deployment history tracking.',
      'kubectl rollout status deployment/app watches the rollout progress but exits with an error if the rollout is paused or stalled — it does not wait indefinitely. In automation scripts, use kubectl rollout status --watch=true --timeout=5m to ensure the rollout completes or fails within the timeout. Without --watch=true, the command may exit prematurely during long image pull times.',
    ],
    tradeoffs: [
      { pro: 'Zero-downtime deployments with automatic rollback — if new pods fail readiness probes, the deployment pauses and old pods continue serving traffic. A failed deployment can be rolled back instantly with kubectl rollout undo, using the same safe rolling process. This enables confident, frequent deployments to production.', con: 'Rolling updates are slower than Recreate — a deployment with 10 replicas, maxSurge=1, and maxUnavailable=0 takes at least 10 sequential cycles of create-wait-readiness-terminate. With 30s image pull and 10s readiness probe, a 10-replica rolling update takes ~7 minutes. For large deployments, this delays rollouts significantly.' },
      { pro: 'Progressive traffic shifting catches issues with minimal blast radius — at most maxSurge new pods serve traffic at any point during the update. If the new version has a bug, only a fraction of traffic is affected before the update pauses. This makes rolling updates safer than blue/green deployments where the entire new version is exposed at once after the switch.', con: 'Multiple versions running simultaneously doubles resource consumption during the update (old + new pods coexisting). For resource-constrained clusters with tight node capacity, maxSurge=25% may not be feasible. Setting maxSurge too low to fit cluster capacity may cause rollout stalls, requiring careful coordination between deployment strategy and Cluster Autoscaler configuration.' },
      { pro: 'ReplicaSet-based revision history enables precise, surgical rollbacks — kubectl rollout undo deployment/app --to-revision=N returns to any previous revision without rebuilding images or modifying CI/CD pipelines. This is invaluable for rapid incident response when a recent deployment introduces a regression that was not caught in staging.', con: 'Revision history consumes API server and etcd storage. Each ReplicaSet (even scaled to 0) stores the full pod template. With very frequent deployments and the default revisionHistoryLimit of 10, this is negligible. But setting revisionHistoryLimit to 100+ with daily deployments to 50+ microservices can consume significant etcd storage and slow down API list operations on ReplicaSets.' },
    ],
  },
};

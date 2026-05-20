import { snap, makePod, makeNode } from '@/core/utils/scenarioShared';

function buildConfigSteps() {
  const steps = []; const s = {
    nodes: [makeNode('node-1', 20, 30), makeNode('node-2', 10, 15)],
    pods: [], events: [], metrics: { pods: 0, nodes: 2, cpu: 10, restarts: 0 },
    configEntries: [
      { kind: 'ConfigMap', name: 'app-config', data: [{ key: 'APP_ENV', val: 'production' }, { key: 'LOG_LEVEL', val: 'info' }, { key: 'MAX_CONNECTIONS', val: '100' }] },
      { kind: 'Secret', name: 'db-secret', data: [{ key: 'password', val: '(base64-encoded)', masked: true }] },
    ],
  };

  snap(steps, s, 'Application needs config: APP_ENV, LOG_LEVEL, DB password. Options: hardcode (bad), env vars (better), ConfigMaps + Secrets (best).', 1);

  s.events.push({ type: 'info', msg: 'kubectl create configmap app-config --from-file=app.properties' });
  snap(steps, s, 'ConfigMap created: stores non-sensitive config as key-value pairs or files. Stored in etcd. Max 1MiB per ConfigMap.', 2);

  s.events.push({ type: 'ok', msg: '🔒 kubectl create secret generic db-secret --from-literal=password=xxx' });
  s.configEntries[1].data[0].masked = true;
  snap(steps, s, 'Secret created: base64-encoded (NOT encrypted). Values are base64 obfuscated. Use SealedSecrets, External Secrets Operator, or cloud KMS for real encryption.', 3);

  s.pods.push(makePod('app-v1', 'node-1', 'pending'));
  s.events.push({ type: 'info', msg: 'Pod spec: envFrom[configMapRef], env[secretRef]' });
  snap(steps, s, 'Pod created. Deployment spec references: envFrom.configMapRef.name=app-config, env.valueFrom.secretKeyRef.name=db-secret. Kubelet reads ConfigMaps/Secrets from API Server at pod creation.', 4);

  s.pods[0].state = 'running';
  s.metrics.pods = 1;
  s.events.push({ type: 'ok', msg: 'Pod running with: APP_ENV=production, LOG_LEVEL=info, DB_PASSWORD (masked)' });
  snap(steps, s, 'Pod running. ConfigMap values injected as env vars: APP_ENV=production, LOG_LEVEL=info. Secret injected as DB_PASSWORD (never printed in logs).', 5);

  s.events.push({ type: 'info', msg: 'kubectl edit configmap app-config → set LOG_LEVEL=debug' });
  snap(steps, s, 'ConfigMap updated! BUT running pods don\'t auto-refresh. Need: new deployment, envFrom with reloader, or mounted volume (subPath).', 6);

  s.events.push({ type: 'warn', msg: 'Mounted volumes update without restart! Env vars do NOT.' });
  snap(steps, s, 'Key difference: ENV VAR injection → static at pod start. VOLUME mount → symlink swap updates content (configmap refresh ~60s). For env vars: restart pod (kubectl rollout restart).', 7);

  s.result = 'ConfigMap for non-sensitive config. Secret for sensitive data. Mount as env or volume.';
  snap(steps, s, 'Best practices: 1) Small ConfigMaps (keep <1MiB). 2) Secrets: use External Secrets Operator + AWS/GCP/Azure KMS. 3) Immutable ConfigMaps for performance (mutating triggers restart). 4) Mount as volumes for live updates. 5) Don\'t commit Secret YAML to git.', 8);
  return steps;
}

export const K8S_CODE_CONFIG = [
  'apiVersion: v1',
  'kind: ConfigMap',
  'metadata:',
  '  name: app-config',
  'data:',
  '  APP_ENV: production',
  '  LOG_LEVEL: info',
  '---',
  'apiVersion: v1',
  'kind: Secret',
  'metadata:',
  '  name: db-secret',
  'type: Opaque',
  'data:',
  '  password: c3VwZXJzZWNyZXQ=',
  '---',
  '# Pod referencing both',
  'spec:',
  '  containers:',
  '  - envFrom:',
  '    - configMapRef:',
  '        name: app-config',
  '    env:',
  '    - name: DB_PASSWORD',
  '      valueFrom:',
  '        secretKeyRef:',
  '          name: db-secret',
  '          key: password',
];

export default {
  id: 'config', label: 'ConfigMaps & Secrets', icon: '🔧',
  build: buildConfigSteps, code: K8S_CODE_CONFIG, language: 'YAML',
  metrics: [
    { key: 'pods', label: 'Pods', max: 8, color: 'var(--pod-running)' },
    { key: 'cpu', label: 'CPU avg', max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
  ],
  topicContent: {
    concept: [
      { title: 'ConfigMap', content: 'ConfigMap stores non-sensitive configuration as key-value pairs or files. It is stored in etcd (max 1MiB per ConfigMap). Pods consume it via environment variables, command-line arguments, or volume mounts.' },
      { title: 'Secret', content: 'Secret is similar to ConfigMap but stores sensitive data (passwords, tokens, keys). Values are base64-encoded, NOT encrypted. For real encryption, use SealedSecrets, External Secrets Operator, or cloud KMS integration.' },
      { title: 'Update Propagation', content: 'Env var injections from ConfigMaps/Secrets are static — they only update on pod restart. Volume mounts update dynamically (~60s propagation delay) via symlink swaps.' },
    ],
    why: ['ConfigMaps and Secrets separate configuration from application code, enabling immutable container images and environment-specific deployments without rebuilding images.'],
    interview: [
      { question: 'What is the difference between env var and volume mount for ConfigMap consumption?', answer: 'Env vars are set at pod creation and never update — changes to the ConfigMap require a pod restart. Volume mounts create files that update via symlink swap (kubelet syncs every ~60s). Volume mounts also handle large config files better but require the application to watch for file changes.', followUps: ['How does the Reloader sidecar handle ConfigMap updates?', 'What is the 1MiB limit and how to work around it?'] },
      { question: 'How do you securely manage Secrets in a GitOps workflow?', answer: 'Never commit raw Secret YAMLs to git. Use SealedSecrets (SealedSecret CRD encrypts secrets for git), External Secrets Operator (syncs from AWS Secrets Manager/GCP Secret Manager), or Bitnami\'s Kubeseal. The controller decrypts at runtime into native Secret objects.', followUps: ['What is the difference between Opaque and dockerconfigjson Secret types?', 'How does encryption at rest work for etcd Secrets?'] },
    ],
    gotcha: ['kubectl get secret shows values as base64 — any user with read access to Secrets in the namespace can decode them. Use RBAC to restrict Secret access to only necessary service accounts.', 'ConfigMap/Secret updates via env vars do NOT propagate to running pods. This leads to the infamous "I updated the ConfigMap but my app still sees old values" bug. Always restart pods after updating env-sourced config.'],
    tradeoffs: [
      { pro: 'Decouples config from code — single image deploys to any environment', con: 'ConfigMap updates via env vars require pod restart, complicating CD pipelines' },
      { pro: 'Secrets can be integrated with external KMS for strong encryption', con: 'Base64-only encoding by default means anyone with etcd access can read secrets' },
    ],
  },
};

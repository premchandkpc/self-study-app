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
      { title: 'What are ConfigMaps and Secrets in simple terms?', content: 'ConfigMaps and Secrets are Kubernetes objects that separate configuration from container images. A ConfigMap stores non-sensitive settings like environment names or log levels, while a Secret stores sensitive data like passwords and API keys. Instead of baking config into your Docker image (which requires rebuilds for every environment change), you inject it at runtime — one image deploys to dev, staging, and production with different ConfigMaps.' },
      { title: 'How ConfigMaps and Secrets work — core mechanics', content: 'Both are stored in etcd: ConfigMaps in plain text, Secrets in base64 (NOT encrypted — just obfuscated). Pods consume them via environment variables (envFrom.configMapRef or env.valueFrom.secretKeyRef) or volume mounts (volumes[].configMap/secret). Env vars are injected at pod creation and are immutable for the pod\'s lifetime. Volume mounts create files that update dynamically via symlink swap with ~60s kubelet sync delay.' },
      { title: 'Deep — update propagation & immutable ConfigMaps', content: 'Env var injection happens once at pod start — changes to the source ConfigMap/Secret are never seen by running pods. Volume mounts use a symlink swap mechanism (kubelet atomically swaps a symlink to a new directory when content changes) with a default sync period of ~60s. Since Kubernetes 1.21, ConfigMaps can be marked immutable (immutable: true), which prevents updates but dramatically reduces API server load because no watch-based sync is needed. Immutable ConfigMaps are ideal for configuration that does not change during the cluster\'s lifetime.' },
      { title: 'Secret management in production', content: 'Production Secret management uses external tools: SealedSecrets (SealedSecret CRD encrypts Secrets for safe git storage), External Secrets Operator (syncs from AWS Secrets Manager, GCP Secret Manager, Azure Key Vault), and cloud KMS integration for etcd encryption at rest. Never commit raw Secret YAMLs to git — base64 is not encryption, and anyone with read access to the namespace or etcd can decode Secret values using base64 -d.' },
    ],
    why: [
      'ConfigMaps and Secrets enable immutable container images — the same image promotes through dev, staging, and production with different configurations injected at deploy time. This eliminates the rebuild-for-every-environment antipattern, ensures the exact same artifact is tested and released, and enables GitOps workflows where config changes are separate from code changes.',
      'The env var vs volume mount update behavior is one of the most misunderstood Kubernetes concepts. Engineers frequently update a ConfigMap and wonder why their application still sees old values — because env vars never update at runtime. Understanding this distinction is essential for designing config update strategies that match application reload behavior.',
      'Secret security in Kubernetes has a layered model: base64 (obfuscation, not encryption) → RBAC (restrict access) → encryption at rest (etcd encryption with KMS) → external Secret stores (AWS Secrets Manager, Vault). Most production breaches involving Secrets occur because teams stop at base64 and do not implement the remaining layers, leaving credentials accessible to anyone with namespace read access or etcd database access.',
    ],
    interview: [
      { question: 'Explain the differences between consuming configuration via environment variables versus volume mounts, and when to use each approach.', answer: 'Environment variables are set at pod creation and NEVER change for the pod\'s lifetime — updating the ConfigMap has no effect on running pods; you must delete and recreate pods (e.g., kubectl rollout restart deployment). Env vars are simple, work with any application framework without code changes, and are good for small config values (flags, feature toggles, env names). Volume mounts create files in the pod\'s filesystem that kubelet updates dynamically via atomic symlink swap — the kubelet polls the API server every ~60s (configurable via --sync-frequency) and swaps the symlink when content changes. Volume mounts are better for larger config files (JSON, YAML, XML config files), certificate bundles, and any configuration where the application watches for file changes. However, volume mounts require the application to detect and reload file changes — frameworks like Spring Cloud Kubernetes, Consul Template, or custom file watchers handle this. Use env vars for simple values that rarely change and tolerate restarts; use volume mounts for complex configs or when you need live updates without pod restarts.', followUps: ['How does the Reloader sidecar work to trigger pod restarts on ConfigMap changes?', 'Can you mix both env var and volume mount consumption from the same ConfigMap?'] },
      { question: 'How do you securely manage Secrets in a GitOps workflow with tools like ArgoCD or Flux?', answer: 'Never commit raw Secret manifests to git — they contain decoded sensitive data. Three main approaches: 1) SealedSecrets by Bitnami — a SealedSecret CRD is committed to git, the SealedSecret controller in the cluster decrypts it into a native Secret using asymmetric encryption (the controller holds the private key, the public key can safely be in git). 2) External Secrets Operator (ESO) — an ExternalSecret CRD references a secret in AWS Secrets Manager, GCP Secret Manager, or Azure Key Vault; ESO syncs the value into a native Secret inside the cluster. 3) SOPS with Mozilla sops — encrypts Secret YAMLs with age, PGP, or cloud KMS; decryption happens at apply time via a sops-compatible tool or CI/CD pipeline. The kubectl-neat tool strips managed fields from Secrets for cleaner git diffs. Encrypting Secrets at rest in etcd using KMS (--encryption-provider-config) adds a security layer but does not replace GitOps encryption.', followUps: ['How does etcd encryption at rest work with the --encryption-provider-config flag?', 'What is the difference between Opaque, dockerconfigjson, and tls Secret types?'] },
      { question: 'What is the 1MiB ConfigMap limit and how do you handle configuration that exceeds it?', answer: 'ConfigMaps have a hard 1MiB size limit enforced by the API server — any ConfigMap larger than 1MiB is rejected with a validation error. This limit exists to prevent etcd bloat. Workarounds include: 1) Split configuration across multiple ConfigMaps and mount each into the pod. 2) Store large configs in external storage (S3, GCS) and have the application fetch them at startup via an init container. 3) Use a volume mount from a PVC that stores the large config. 4) Build the config into the container image (defeats the purpose of ConfigMaps, but works for truly static files). The --max-request-bytes flag on kube-apiserver can increase the limit, but this is strongly discouraged as it increases etcd pressure and slows down the entire API server.', followUps: ['Does the 1MiB limit apply to Secrets as well?', 'How do you monitor ConfigMap sizes in production?'] },
    ],
    gotcha: [
      'kubectl get secret my-secret -o yaml shows values as base64-encoded strings — any user with RBAC read access to Secrets in the namespace can decode them with echo <value> | base64 -d. This is not encryption, it is obfuscation. Use RBAC to strictly limit Secret read access to only service accounts that genuinely need it.',
      'ConfigMap and Secret updates via env vars NEVER propagate to running pods. This is the single most common Kubernetes configuration gotcha — engineers update a ConfigMap and spend hours debugging why the app still sees old values. After updating env-sourced config, you must trigger a pod restart (kubectl rollout restart deployment or helm upgrade with new revision). Tools like Reloader, Keel, and Stakater Reloader automate this by watching for ConfigMap changes and triggering rolling restarts.',
      'Secrets mounted as volume files are WORLD-READABLE (0644) by default inside the pod. Any process in the container can read the secret file regardless of the application\'s intended access. The pod-level securityContext can set defaultMode to restrict permissions (e.g., defaultMode: 0400), but many users forget this, leaving database passwords readable by any process in the container.',
      'Deleting a ConfigMap or Secret that is referenced by a running pod does NOT immediately affect the pod — env vars are already injected, and volume mount files are already on disk. However, if the pod restarts or the ReplicaSet creates a replacement, the new pod will fail to start because it references a missing ConfigMap or Secret. Always use immutable ConfigMaps or ensure graceful migration when removing configuration objects.',
    ],
    tradeoffs: [
      { pro: 'ConfigMaps decouple configuration from container images — a single immutable image deploys to dev, staging, and production with different ConfigMaps. This eliminates rebuild-for-every-environment, ensures the exact same artifact is tested in CI and deployed to production, and simplifies rollbacks (just change the ConfigMap reference in the Deployment).', con: 'Env var-based ConfigMap updates require pod restarts, complicating CD pipelines. A Helm upgrade that changes an env var triggers a rolling restart, which may cause brief connection draining or disruption for long-running connections. Tools like Reloader add complexity to what should be a simple config update flow.' },
      { pro: 'Secrets integrate with external KMS providers (AWS KMS, GCP Cloud KMS, Azure Key Vault) for encryption at rest in etcd. Combined with External Secrets Operator, sensitive credentials never touch git or CI/CD artifacts — they are synced directly from the cloud secrets manager into the cluster at runtime.', con: 'Base64-only encoding by default means anyone with access to etcd data (backups, snapshots, direct etcd access) can read all Secrets in the cluster. Without encryption at rest and strict RBAC on Secret resources, a compromised etcd backup file leaks every password, token, and key in the entire cluster.' },
      { pro: 'Immutable ConfigMaps (immutable: true) dramatically reduce API server load — since the content never changes, kubelet does not need to watch for updates, eliminating the watch overhead on the API server and etcd. This is a significant scalability improvement for large clusters with thousands of ConfigMaps.', con: 'Immutable ConfigMaps cannot be updated — they must be deleted and recreated with a new name, and all pod references must be updated to point to the new name. This adds friction to configuration workflows and requires deployment changes (or a tool like Reloader) to point to the new immutable ConfigMap name after recreation.' },
    ],
  },
};

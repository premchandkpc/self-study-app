import { snap, makePod, makeNode } from '@/core/utils/scenarioShared';

function buildStorageSteps() {
  const steps = []; const s = {
    nodes: [makeNode('node-1', 30, 50)],
    pods: [], events: [], metrics: { pods: 0, nodes: 1, cpu: 10, restarts: 0 },
    storageEntries: [
      { kind: 'StorageClass', name: 'standard', provisioner: 'ebs.csi.aws.com', reclaimPolicy: 'Delete', active: false },
      { kind: 'PVC', name: 'data-pvc', status: 'Pending', storageClass: 'standard', request: '10Gi', active: false },
      { kind: 'PV', name: 'pvc-xyz', status: 'Available', cap: '10Gi', node: 'node-1', active: false },
    ],
  };

  snap(steps, s, 'Stateful app (MySQL) needs persistent storage. PV = cluster resource. PVC = request. StorageClass = dynamic provisioner.', 1);

  s.events.push({ type: 'info', msg: 'kubectl apply -f pvc.yaml → PersistentVolumeClaim: data-pvc' });
  s.storageEntries[1].active = true;
  snap(steps, s, 'PVC created: data-pvc, request 10Gi, storageClass: standard. Status: Pending. No PV bound yet.', 2);

  s.events.push({ type: 'ok', msg: 'StorageClass "standard" detects PVC. Provisioner: ebs.csi.aws.com → CreateVolume' });
  s.storageEntries[0].active = true;
  snap(steps, s, 'StorageClass "standard" (default): provisioner=ebs.csi.aws.com. Dynamic provisioning triggers: CSI driver calls CreateVolume on EBS. reclaimPolicy=Delete (auto-delete PV+EBS when PVC deleted).', 3);

  s.storageEntries[0].active = false; s.storageEntries[2].active = true;
  s.storageEntries[2].status = 'Bound'; s.storageEntries[1].status = 'Bound';
  s.events.push({ type: 'ok', msg: 'PV "pvc-xyz" created (10Gi EBS gp3). Bound to PVC "data-pvc".' });
  snap(steps, s, 'PV provisioned: 10Gi EBS gp3 volume. BOUND to PVC data-pvc. Status→Bound. PV reclaimPolicy=Delete (auto-delete on PVC deletion).', 4);

  s.pods.push(makePod('mysql-0', 'node-1', 'pending'));
  s.metrics.pods = 1;
  s.events.push({ type: 'info', msg: 'Pod spec: volumes[].persistentVolumeClaim.claimName=data-pvc' });
  snap(steps, s, 'Pod mysql-0 spec references PVC data-pvc via persistentVolumeClaim. Kubelet binds the volume to node. CSI driver: AttachDisk (EBS → EC2), Mount (ext4 → /var/lib/mysql).', 5);

  s.pods[0].state = 'running';
  s.events.push({ type: 'ok', msg: 'MySQL running. Data persists at /var/lib/mysql on EBS volume.' });
  snap(steps, s, 'Pod running with EBS volume mounted at /var/lib/mysql. Data persists across pod restarts (recreates on same node). PVC protects data from pod deletion.', 6);

  s.events.push({ type: 'warn', msg: 'kubectl delete pod mysql-0 → new pod on node-2? YES! EBS detached/reattached.' });
  snap(steps, s, 'Pod deleted. StatefulSet creates replacement on node-2. Kubelet detaches EBS from node-1, attaches to node-2. Data intact! PVC remains Bound (not affected). CSI: ControllerPublishVolume → NodeStageVolume → NodePublishVolume.', 7);

  s.result = 'StorageClass (dynamic) → PVC (request) → PV (bind) → Pod (mount). Data survives pod restarts.';
  snap(steps, s, 'Full chain: StorageClass (ebs.csi.aws.com) → PVC (10Gi, standard) → PV (EBS gp3, Bound) → Pod (mount /var/lib/mysql). CSI driver handles: CreateVolume → AttachDisk → Mount. Retain vs Delete: Retain keeps EBS after PVC delete. Reclaim: manually recover data from EBS.', 8);
  return steps;
}

export const K8S_CODE_STORAGE = [
  'apiVersion: storage.k8s.io/v1',
  'kind: StorageClass',
  'provisioner: ebs.csi.aws.com',
  'parameters:',
  '  type: gp3',
  'reclaimPolicy: Delete',
  '---',
  'apiVersion: v1',
  'kind: PersistentVolumeClaim',
  'spec:',
  '  storageClassName: standard',
  '  accessModes: [ReadWriteOnce]',
  '  resources:',
  '    requests:',
  '      storage: 10Gi',
  '---',
  '# Pod using PVC',
  'spec:',
  '  containers:',
  '  - volumeMounts:',
  '    - name: data',
  '      mountPath: /var/lib/mysql',
  '  volumes:',
  '  - name: data',
  '    persistentVolumeClaim:',
  '      claimName: data-pvc',
];

export default {
  id: 'storage', label: 'PV / PVC / StorageClass', icon: '💾',
  build: buildStorageSteps, code: K8S_CODE_STORAGE, language: 'YAML',
  metrics: [
    { key: 'pods', label: 'Pods', max: 8, color: 'var(--pod-running)' },
    { key: 'cpu', label: 'CPU avg', max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
  ],
};

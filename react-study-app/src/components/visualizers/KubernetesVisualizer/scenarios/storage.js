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
  topicContent: {
    concept: [
      { title: 'What is Kubernetes storage in simple terms?', content: 'Kubernetes storage separates the concept of storage from pods. A PersistentVolume (PV) is a piece of storage in the cluster (like an AWS EBS volume), and a PersistentVolumeClaim (PVC) is a request for storage (like an order form). StorageClasses define how storage is dynamically provisioned — when a PVC asks for storage, the StorageClass\'s provisioner creates the actual volume automatically.' },
      { title: 'How PV/PVC binding works — core mechanics', content: 'When a PVC is created with a specific storage class and size, the CSI driver provisions a new PV matching those requirements. The PVC binds to the PV in a 1:1 relationship — once bound, the PV is reserved exclusively for that PVC. A pod references the PVC via persistentVolumeClaim in its volumes spec. At pod creation, the CSI driver attaches the volume to the node, formats/mounts the filesystem, and bind-mounts it at the pod\'s mountPath.' },
      { title: 'Deep — CSI driver architecture', content: 'The Container Storage Interface (CSI) decouples storage logic from Kubernetes core via three phases: ControllerPublishVolume (CSI driver attaches the volume to the node via cloud API), NodeStageVolume (formats filesystem and mounts it globally on the node), and NodePublishVolume (bind-mounts to the pod\'s mount namespace). The CSI driver runs as a DaemonSet for node operations and a StatefulSet for controller operations. This plugin model allows any storage vendor to integrate without changing Kubernetes source code.' },
      { title: 'StorageClass parameters & reclaim policies', content: 'StorageClass defines reclaimPolicy: Delete (auto-deletes PV and underlying storage when PVC is deleted), Retain (PV enters Released state — volume intact but not reusable), or Recycle (deprecated, basic scrub). Access modes: ReadWriteOnce (single node, most cloud volumes), ReadOnlyMany (multiple nodes read-only), ReadWriteMany (multiple nodes read-write, NFS/Ceph). Volume modes: Filesystem (mounted as directory) or Block (raw block device for databases).' },
    ],
    why: [
      'Stateful workloads (databases, message queues, file stores) require persistent storage that survives pod restarts, rescheduling, and node failures. Without proper PV/PVC configuration, database pods lose all data when they restart or move to a different node — a catastrophic failure for any production stateful service.',
      'StorageClass reclaimPolicy=Delete is the default — a single kubectl delete pvc command can irreversibly destroy production data and the underlying cloud volume (EBS, GCE PD, Azure Disk). For critical databases, always set reclaimPolicy: Retain and implement backup strategies independent of Kubernetes lifecycle.',
      'The CSI driver migration from in-tree storage plugins to CSI is one of the most impactful infrastructure changes in recent Kubernetes releases. Understanding CSI architecture is essential for debugging volume attachment failures, performance issues (EBS gp2 vs gp3), and cross-AZ volume provisioning limitations for StatefulSets.',
    ],
    interview: [
      { question: 'Walk through the full lifecycle of a dynamically provisioned PV from PVC creation to pod mount.', answer: '1. User creates a PVC with spec: storageClassName: standard, resources.requests.storage: 10Gi, accessModes: ReadWriteOnce. 2. The PersistentVolume controller watches for unbound PVCs and delegates to the StorageClass\'s provisioner (e.g., ebs.csi.aws.com). 3. The CSI controller (external-provisioner sidecar) calls CreateVolume on the CSI driver, which provisions an EBS gp3 volume via AWS API. 4. A PV object is created representing the volume. 5. The PV controller binds the PVC to the PV — both enter Bound status. 6. Pod spec references claimName: data-pvc. 7. Kubelet\'s volume manager calls ControllerPublishVolume (attach EBS to EC2 node). 8. The CSI node driver calls NodeStageVolume (format ext4, mount at global path). 9. Finally NodePublishVolume bind-mounts into the pod\'s mount namespace at /var/lib/mysql. If the pod is deleted and recreated on a different node, steps 7-9 repeat — the volume is detached and reattached to the new node.', followUps: ['What happens to the PV if the PVC is deleted with reclaimPolicy: Retain?', 'How does the volume attachment survive a kubelet restart?'] },
      { question: 'What is the difference between in-tree storage plugins and CSI drivers, and how do you migrate?', answer: 'In-tree plugins (pre-v1.13) were built into the Kubernetes binary — each storage vendor\'s code was compiled into kube-controller-manager and kubelet. This caused binary bloat, vendor lock-in at the Kubernetes source level, and required Kubernetes releases to fix storage bugs. CSI (introduced stable in v1.13) moves storage logic into external drivers deployed as DaemonSets and StatefulSets. Migration involves: 1) Deploying the CSI driver (e.g., aws-ebs-csi-driver), 2) Creating a new StorageClass with provisioner ebs.csi.aws.com, 3) Moving PVCs to the new StorageClass (or using the CSI Migration feature flag which transparently routes in-tree plugin calls to CSI drivers). Kubernetes 1.25+ enables CSI Migration by default — in-tree plugins are deprecated and being removed entirely.', followUps: ['Does CSI Migration work transparently for existing PVCs?', 'How do you roll back a failed CSI migration?'] },
      { question: 'How do you handle ReadWriteMany access for a multi-replica MySQL or PostgreSQL StatefulSet?', answer: 'ReadWriteMany (RWX) volumes allow multiple pods to mount the same volume simultaneously, but traditional RDBMS databases do NOT support this — concurrent writes from multiple pods cause data corruption. For databases, use ReadWriteOnce with a single writer replica. For read replicas, use separate PVCs with replication or use a CSI driver that supports volume cloning/snapshot. For workloads that genuinely need RWX (shared file stores, content management systems), use NFS, GlusterFS, or cloud-specific RWX solutions like EFS or Azure Files. StatefulSets with RWX access should use a distributed lock manager or ensure the application handles concurrent write conflicts — most databases cannot.', followUps: ['What CSI drivers support RWX on AWS?', 'How does volume expansion work with different CSI drivers?'] },
    ],
    gotcha: [
      'The default StorageClass is automatically used when a PVC does not specify storageClassName. If your cluster has a default StorageClass with gp2 (lower performance) but your database needs gp3 (higher IOPS), the PVC silently gets the wrong volume type. Always explicitly specify storageClassName in production PVCs.',
      'StorageClass reclaimPolicy=Delete destroys both the PV and the underlying cloud volume when the PVC is deleted. A kubectl delete on a PVC with Delete reclaimPolicy is irreversible — there is no recycle bin. For critical databases, always use reclaimPolicy: Retain with manual cleanup procedures. Recovery of a deleted EBS volume requires AWS support or prior snapshots.',
      'Volume expansion (resizing) is supported by most CSI drivers but is NOT automatic and has specific constraints. The PVC spec can be edited for size increases, but the filesystem must support online resizing (ext4, xfs). Volume shrinking is NEVER supported — decreasing PVC size silently fails or corrupts data. Always verify your CSI driver\'s expansion requirements before resizing production volumes.',
      'StatefulSet pod deletion does NOT delete the PVC — the PVC must be deleted separately. This is by design to protect data, but it means StatefulSet scale-down leaves orphaned PVCs that consume cloud storage costs indefinitely. Implement cleanup automation for environment teardown, or use labels and resource quotas to track and remove orphaned PVCs.',
    ],
    tradeoffs: [
      { pro: 'Dynamic provisioning via StorageClasses eliminates manual volume creation — developers request storage via PVC and the CSI driver provisions it automatically. This enables self-service storage for dev teams, reduces cloud console access requirements, and ensures consistent volume configurations (type, IOPS, encryption) across the cluster.', con: 'Cloud volume costs can grow unexpectedly if PVCs are not cleaned up. A developer creating 10 PVCs for testing and forgetting to delete them results in 10 EBS volumes running 24/7. Without cost monitoring and automated cleanup of orphaned PVCs, storage costs can exceed compute costs in development clusters.' },
      { pro: 'Data survives pod restarts, rescheduling, and node failures because PVs are backed by network-attached cloud storage (EBS, GCE PD, Azure Disk). A pod can be destroyed and recreated on a different node — the PVC detaches from the old node and reattaches to the new node with all data intact. This is essential for stateful production workloads.', con: 'ReadWriteOnce limits volume access to a single node at a time. Multi-replica writers (e.g., database clusters with active-active replication) require complex workarounds: either use ReadWriteMany with distributed concurrency control, or use a database-level replication mechanism with separate PVCs per replica. Neither approach is as simple as RWO.' },
      { pro: 'The CSI plugin architecture enables any storage vendor to integrate with Kubernetes without modifying core source code. Storage features (snapshots, cloning, volume expansion, encryption, topology-aware provisioning) are implemented once in the CSI driver and work across all Kubernetes versions that support CSI (v1.13+).', con: 'CSI driver quality varies significantly between vendors. Some CSI drivers have known issues with volume detachment during node termination, filesystem corruption during resize, or topology constraints with multi-AZ clusters. Each driver has its own deployment, configuration, and upgrade process — there is no standardized CSI driver management across different storage backends.' },
    ],
  },
};

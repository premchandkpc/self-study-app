import { snap, makeNode } from '@/core/utils/scenarioShared';

function buildEtcdSteps() {
  const steps = [];
  const s = {
    nodes: [
      makeNode('etcd-0', 15, 30),
      makeNode('etcd-1', 15, 30),
      makeNode('etcd-2', 15, 30),
    ],
    pods: [],
    metrics: { pods: 0, nodes: 3, cpu: 15, restarts: 0 },
    events: [],
    raftMembers: [
      { id: 'etcd-0', state: 'follower', term: 1, logIndex: 0 },
      { id: 'etcd-1', state: 'follower', term: 1, logIndex: 0 },
      { id: 'etcd-2', state: 'follower', term: 1, logIndex: 0 },
    ],
    raftEntries: [],
  };

  s.events.push({ type: 'info', msg: '3-node etcd cluster. All followers. Term 1.' });
  snap(steps, s, 'etcd cluster: 3 static pods on control-plane. All followers. Awaiting leader election.', 1);

  // Leader election
  s.raftMembers[0].state = 'candidate';
  s.raftMembers[0].term = 2;
  s.events.push({ type: 'info', msg: 'etcd-0: election timeout → becomes candidate. Term 2. Requests votes.' });
  snap(steps, s, 'etcd-0 election timeout (~150ms). Becomes candidate. Term=2. Sends RequestVote RPC to etcd-1, etcd-2.', 2);

  s.raftMembers[1].state = 'follower';
  s.raftMembers[1].term = 2;
  s.raftMembers[2].state = 'follower';
  s.raftMembers[2].term = 2;
  s.raftMembers[0].state = 'leader';
  s.events.push({ type: 'ok', msg: 'etcd-0 elected leader (2/3 votes). Term 2.' });
  snap(steps, s, 'etcd-0 receives votes from etcd-1 and etcd-2. Majority (2/3). Becomes leader for term 2.', 3);

  // Log replication
  s.raftEntries.push({ term: 2, index: 1, command: 'PUT /registry/deployments/default/nginx {"replicas":3}' });
  s.raftMembers[0].logIndex = 1;
  s.events.push({ type: 'info', msg: 'Leader receives write. Appends entry to local log.' });
  snap(steps, s, 'Leader receives PUT /registry/deployments/... Appends entry (term=2, index=1). Sends AppendEntries RPC to followers.', 4);

  s.raftMembers[1].logIndex = 1;
  s.raftMembers[2].logIndex = 1;
  s.events.push({ type: 'ok', msg: 'Log entry replicated to etcd-1, etcd-2. Committed.' });
  snap(steps, s, 'Followers receive AppendEntries, append to log, reply OK. Leader commits at quorum. Entry is durable.', 5);

  // Watch + lease
  s.events.push({ type: 'info', msg: 'Client creates watch on /registry/deployments/default/nginx' });
  snap(steps, s, 'Watch established. Any future writes to this key notify watchers. Lease (TTL) ensures heartbeat.', 6);

  // Failure: etcd-1 goes down
  s.raftMembers[1].state = 'follower';
  s.nodes[1].cpu = 0;
  s.events.push({ type: 'warn', msg: 'etcd-1 unreachable. 2/3 quorum still works.' });
  snap(steps, s, 'etcd-1 goes down. Network partition. Leader detects missed heartbeats. Quorum still holds (2/3). Cluster continues.', 7);

  // Compaction + etcd-1 rejoins via snapshot
  s.events.push({ type: 'error', msg: 'etcd-1 disk full. Compaction triggered by leader.' });
  snap(steps, s, 'etcd-1 disk compaction (defrag). Reclaims storage. 1MB request limit — large values stored elsewhere (e.g. events).', 8);

  // Rejoin
  s.raftMembers[1].state = 'follower';
  s.raftMembers[1].term = 2;
  s.raftMembers[1].logIndex = 1;
  s.nodes[1].cpu = 15;
  s.events.push({ type: 'ok', msg: 'etcd-1 rejoins. Catches up via snapshot from leader.' });
  snap(steps, s, 'etcd-1 rejoins cluster. Leader sends latest snapshot. Log entries replayed. Cluster fully healthy again.', 9);

  return steps;
}

export const K8S_CODE_ETCD = [
  '# Check etcd cluster health',
  'etcdctl endpoint health --cluster',
  '# Member list',
  'etcdctl member list --write-out=table',
  '# Raft leader',
  'etcdctl endpoint status --cluster -w table',
  '# Get a key',
  'etcdctl get /registry/deployments/default/nginx',
  '# Watch a key',
  'etcdctl watch /registry/deployments/default/nginx',
  '# Lease grant',
  'etcdctl lease grant 30',
  '# Compaction (defrag)',
  'etcdctl compaction $(etcdctl endpoint status --cluster -w json | jq -r ".[].Status.raftAppliedIndex")',
  'etcdctl defrag --cluster',
  '# Backup / restore',
  'ETCDCTL_API=3 etcdctl snapshot save snapshot.db',
  'ETCDCTL_API=3 etcdctl snapshot restore snapshot.db',
  '# etcd pod (static)',
  'kubectl get pods -n kube-system | grep etcd',
  '# 1MB limit',
  `etcdctl put large-key "$(python3 -c "print('x'*1024*1024)")"`,
];

export default {
  id: 'etcd',
  label: 'etcd & Raft',
  icon: '⬡',
  build: buildEtcdSteps,
  code: K8S_CODE_ETCD,
  language: 'Shell',
  metrics: [
    { key: 'pods', label: 'Pods', max: 6, color: 'var(--pod-running)' },
    { key: 'cpu', label: 'CPU avg', max: 100, unit: '%', color: 'var(--node-comparing)' },
    { key: 'nodes', label: 'Nodes', max: 3, color: 'var(--node-ok)' },
  ],
  topicContent: {
    concept: [
      { title: 'What is etcd in simple terms?', content: 'etcd is the brain of your Kubernetes cluster — a distributed key-value store that remembers everything: which deployments exist, what secrets are defined, which nodes are healthy. It uses the Raft consensus protocol to keep all data consistent across multiple copies (replicas). Every kubectl command you run ultimately reads from or writes to etcd, making it the single source of truth for the entire cluster.' },
      { title: 'How Raft consensus works — core mechanics', content: 'Raft ensures data consistency through three key mechanisms: leader election (one node is elected leader), log replication (the leader replicates every write to followers), and quorum (a write is committed only when a majority of nodes acknowledge it). A 3-node cluster tolerates 1 node failure because 2 out of 3 still forms a quorum. Each write goes through the leader — followers serve reads but cannot accept writes.' },
      { title: 'Deep — etcd internals & architecture', content: 'etcd stores data as a bbolt database on disk with a default 1MB request limit. Writes require disk fsync — slow disk I/O is the #1 cause of leader election flapping. The watch mechanism creates gRPC streams allowing Kubernetes controllers to receive real-time change notifications. Compaction removes old revision history to reclaim space, while defragmentation reorganizes the bbolt database to reduce filesystem fragmentation.' },
      { title: 'etcd disaster recovery & maintenance', content: 'etcdctl snapshot save creates a point-in-time backup that can be restored on a new cluster. Regular compaction (etcdctl compaction) prevents database size from growing unbounded. Defragmentation (etcdctl defrag) recovers storage space after compaction. Static pods on control-plane nodes run etcd — they are managed directly by kubelet, not by Deployments. The --quota-backend-bytes flag (default 2GB) limits database size.' },
    ],
    why: [
      'etcd is the brain of the cluster — if etcd goes down, the entire cluster becomes unresponsive. No kubectl commands work, no controllers reconcile, no pods are scheduled. Production-grade backup strategy, regular defragmentation, and member health monitoring are not optional — they are critical for cluster survival.',
      'Raft consensus means write performance degrades with cluster size. A 3-node cluster requires 2/3 confirmations per write, a 5-node requires 3/5. This tradeoff between fault tolerance and write latency means cluster sizing must be intentional — beyond 7 etcd nodes, the write latency penalty rarely justifies the marginal increase in fault tolerance.',
      'Slow disk I/O is the most common cause of etcd instability in production. Since every write calls fsync, even moderate write loads on slow disks (HDDs or network-attached storage with variable latency) cause leader election flapping, term increments, and cascading cluster unavailability. Always use dedicated SSDs with guaranteed IOPS for etcd members.',
    ],
    interview: [
      { question: 'Walk through the full Raft leader election process in a 3-node etcd cluster.', answer: 'Each follower runs an election timeout randomly set between 150-300ms. If a follower receives no heartbeat AppendEntries RPC from the leader before its timer expires, it transitions to candidate state, increments the current term by 1, votes for itself, and sends RequestVote RPCs to all other nodes. Each peer votes for the first candidate in its term on a first-come-first-served basis. When the candidate receives votes from a majority (2 out of 3), it becomes the new leader. The leader then sends heartbeat AppendEntries to all followers to establish authority and reset their election timers. This ensures at most one leader wins per term — split-brain is impossible because a candidate cannot become leader without a majority, and a majority can only support one candidate per term due to the per-term single-vote rule.', followUps: ['What happens during a network partition that splits a 5-node cluster 3-2?', 'How does etcd prevent a partitioned node with stale data from becoming leader?'] },
      { question: 'What is the 1MB request limit and how does it affect common Kubernetes operations?', answer: 'etcd enforces a default 1MB maximum request size at the gRPC layer. Large ConfigMaps (e.g., TLS certificates bundled as binary data), oversized Secrets, or the events system with many entries can hit this limit. When a request exceeds 1MB, etcd returns an etcdserver: request is too large error. The kube-apiserver also enforces a 1.5MB limit for objects stored in etcd. For large blobs, store them in external storage (S3, GCS) and reference the URL via an annotation or a separate ConfigMap with a small reference key. The --max-request-bytes flag can increase the limit but this is not recommended — large objects degrade overall etcd performance.', followUps: ['How does the kube-apiserver cache affect etcd read load?', 'What is the default backend quota (--quota-backend-bytes) and how do you monitor it?'] },
      { question: 'How do etcd watches work and why are they critical for Kubernetes controllers?', answer: 'etcd watches create a long-lived gRPC stream that delivers incremental change events (PUT, DELETE) for specified key prefixes. Kubernetes controllers rely on watches to react to cluster state changes without polling. For example, the Deployment controller watches /registry/deployments/ and /registry/replicasets/ — when a Deployment is updated, etcd pushes the change event through the watch stream, triggering the controller\'s reconciliation loop. Watches support revision-based resumption: if a watch disconnects, the client can reconnect with the last received revision to avoid missing events. The watch event system is what makes Kubernetes controllers eventually consistent and event-driven rather than poll-based.', followUps: ['What happens to watches when etcd leader changes?', 'How does the kube-apiserver proxy watches to multiple controllers efficiently?'] },
    ],
    gotcha: [
      'Adding more etcd nodes increases fault tolerance but decreases write performance — every write requires a majority acknowledgment. A 5-node cluster does 3 round trips per write versus 2 in a 3-node cluster. Beyond 7 nodes, the write latency increase is rarely worth the marginal fault tolerance gain. 3 or 5 nodes is the sweet spot for most production clusters.',
      'etcd fsyncs every write to disk — slow disk I/O is the #1 cause of leader election flapping and cluster instability. If the disk cannot fsync within the election timeout, followers assume the leader is dead and trigger new elections. Always use dedicated SSDs with guaranteed IOPS for etcd members. Never run etcd on shared or network-attached storage with variable latency.',
      'etcd database size grows monotonically with every write — Kubernetes does not overwrite keys but creates new revisions. Without compaction, the database balloons to the --quota-backend-bytes limit (default 2GB) and etcd stops accepting writes. Set up automated compaction via etcd --auto-compaction-retention=1 flag or a cron job running etcdctl compaction regularly.',
      'Restoring etcd from a snapshot requires stopping all kube-apiserver instances and kube-controller-manager on the control plane. Restoring a snapshot from one cluster onto another with different member URLs or cluster tokens will fail. Always use --initial-cluster-token with a unique value per cluster to prevent cross-cluster corruption during restore procedures.',
    ],
    tradeoffs: [
      { pro: 'Strong consistency guarantees via Raft consensus — every read returns the most recent write committed by a quorum. This ensures Kubernetes controllers never operate on stale state, preventing split-brain scenarios where two controllers make conflicting decisions based on different views of the world.', con: 'Write latency increases with cluster size due to quorum requirements. A 3-node cluster needs 2/3 confirmations per write (~2 RTT), while a 5-node needs 3/5 (~3 RTT). At 1000+ writes/second, this latency difference becomes significant, making large etcd clusters inappropriate for write-heavy workloads.' },
      { pro: 'The watch-based event system enables Kubernetes\' entire controller architecture — Deployment, ReplicaSet, Service, and all other controllers react to changes instantly without polling. This event-driven model is far more efficient than polling every N seconds and enables sub-second reconciliation for most operations.', con: 'The 1MB request limit and unbounded revision growth require proactive maintenance. Without regular compaction, the database hits the 2GB default quota and stops accepting writes. Operations teams must maintain compaction cron jobs, monitor db size, and occasionally defrag — adding operational overhead to what should be a managed data store.' },
      { pro: 'etcdctl snapshot restore provides a reliable disaster recovery mechanism. Full-cluster snapshots can be automated via cron and restored onto new infrastructure, enabling recovery from catastrophic control-plane failures including data corruption or total node loss.', con: 'Restoring etcd requires a cluster-wide outage — all kube-apiserver instances must be stopped, the snapshot restored, and the cluster topology rebuilt. There is no hot-standby or incremental restore. Recovery time depends on database size and can take 10+ minutes for large clusters, during which the entire Kubernetes control plane is down.' },
    ],
  },
};

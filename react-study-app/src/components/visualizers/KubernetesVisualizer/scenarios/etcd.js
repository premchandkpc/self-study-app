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
      { title: 'etcd as Kubernetes Backing Store', content: 'etcd is a distributed key-value store based on the Raft consensus protocol. It stores all cluster state — deployments, secrets, configmaps, and more — making it Kubernetes\' single source of truth.' },
      { title: 'Raft Consensus', content: 'Raft ensures consistency through leader election, log replication, and quorum (majority) writes. A 3-node cluster tolerates 1 failure; a 5-node cluster tolerates 2.' },
      { title: 'etcd Operations', content: 'etcdctl provides snapshot/restore for disaster recovery, compaction/defrag to reclaim storage, and watch primitives that Kubernetes controllers rely on for event-driven reconciliation.' },
    ],
    why: ['etcd is the brain of the cluster — if etcd goes down, the entire cluster becomes unresponsive. Backup strategy, defragmentation, and member health monitoring are critical production concerns.'],
    interview: [
      { question: 'How does etcd handle leader elections?', answer: 'Each follower runs an election timer (~150ms randomized). If a follower doesn\'t hear from the leader before timeout, it becomes candidate, increments term, requests votes from peers. Majority vote (N/2+1) wins. This ensures at most one leader per term.', followUps: ['What happens during a network partition in a 3-node cluster?', 'How does Raft prevent split-brain scenarios?'] },
      { question: 'What is the 1MB key-value limit and why does it matter?', answer: 'etcd has a default 1MB request limit. Large objects like ConfigMaps or events can hit this limit. Best practice: store large blobs in external storage and reference them via etcd keys.', followUps: ['How do you monitor etcd database size?', 'What is compaction and defragmentation in etcd?'] },
    ],
    gotcha: ['Adding more etcd nodes increases fault tolerance but decreases write performance (more Raft round trips). 3 or 5 nodes is optimal; beyond 7 is rarely beneficial.', 'etcd uses disk fsync for every write — slow disk I/O is the #1 cause of leader election flapping and cluster instability. Always use SSDs with high IOPS.'],
    tradeoffs: [
      { pro: 'Strong consistency guarantees via Raft consensus', con: 'Write latency increases with cluster size due to quorum requirements' },
      { pro: 'Watch-based event system enables reactive controllers', con: '1MB request limit and storage growth require regular compaction and maintenance' },
    ],
  },
};

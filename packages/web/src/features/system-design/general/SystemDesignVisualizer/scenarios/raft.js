import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { ICONS } from '../../../sd-types';
const _mk = createNodeFactory(ICONS);
const raftNode = _mk('raft');

/* ─────────────────────────────────────────────────────────────────────────────
   Raft Consensus — leader election + log replication
   Pentagon layout (P2P cluster — no horizontal layers)
───────────────────────────────────────────────────────────────────────────── */
const ROLE_ICON = { follower: '⬡', candidate: '🔵', leader: '⭐', crashed: '💥' };

function buildRaftSteps() {
  const steps = [];

  const makeNode = (id, label, role, x, y) =>
    raftNode(id, label, x, y, {
      role, term: 0, voted: false, log: [],
      desc: 'Raft node — starts as follower, can become candidate or leader via election',
    });

  const s = {
    nodes: [
      makeNode('n0', 'Node 0', 'follower', 310, 50),
      makeNode('n1', 'Node 1', 'follower', 510, 200),
      makeNode('n2', 'Node 2', 'follower', 420, 350),
      makeNode('n3', 'Node 3', 'follower', 200, 350),
      makeNode('n4', 'Node 4', 'follower', 110, 200),
    ],
    edges: [
      { from: 'n0', to: 'n1', protocol: 'gRPC' }, { from: 'n1', to: 'n2', protocol: 'gRPC' },
      { from: 'n2', to: 'n3', protocol: 'gRPC' }, { from: 'n3', to: 'n4', protocol: 'gRPC' },
      { from: 'n4', to: 'n0', protocol: 'gRPC' },
      { from: 'n0', to: 'n2', protocol: 'gRPC' }, { from: 'n0', to: 'n3', protocol: 'gRPC' },
      { from: 'n1', to: 'n4', protocol: 'gRPC' },
    ],
    packets: [],
    events: [],
    metrics: { term: 0, leader: 'none', committed: 0, nodes: 5 },
    activeEdge: null,
  };

  snap(steps, s, 'Raft: 5 nodes, all followers. No leader. Nodes wait for election timeout (150–300ms random).', 1);

  s.nodes[0].role = 'candidate';
  s.nodes[0].state = 'active';
  s.nodes[0].term = 1;
  s.nodes[0].icon = ROLE_ICON.candidate;
  s.nodes[0].desc = 'Candidate — election timeout fired, incremented term to 1, requesting votes';
  s.metrics.term = 1;
  s.events.push({ type: 'info', msg: 'Node 0 election timeout → becomes Candidate (term 1)' });
  snap(steps, s, 'Node 0 election timeout fires. Increments term to 1. Sends RequestVote to all peers.', 2);

  s.packets = ['n1','n2','n3','n4'].map((to) => packet('n0', to, 'RequestVote(1)', 'replication'));
  s.events.push({ type: 'info', msg: 'Node 0 broadcasts RequestVote(term=1)' });
  snap(steps, s, 'RequestVote RPC sent to all 4 peers. Each follower grants vote if term > their current term.', 3);

  ['n1','n2','n3','n4'].forEach((id, i) => {
    s.nodes[i + 1].voted = true;
    s.nodes[i + 1].term = 1;
    s.nodes[i + 1].state = 'active';
  });
  s.packets = ['n1','n2','n3','n4'].map((from) => packet(from, 'n0', 'VoteGranted', 'replication'));
  s.events.push({ type: 'ok', msg: '4/4 votes granted → Node 0 wins majority (5/2+1=3)' });
  snap(steps, s, 'Node 0 wins 4 votes (needs 3 for majority of 5). Elected LEADER.', 4);

  s.nodes[0].role = 'leader';
  s.nodes[0].state = 'ok';
  s.nodes[0].icon = ROLE_ICON.leader;
  s.nodes[0].desc = 'Leader — sends heartbeats every 50ms, replicates all writes to followers';
  ['n1','n2','n3','n4'].forEach((_, i) => { s.nodes[i + 1].state = 'idle'; });
  s.packets = [];
  s.metrics.leader = 'Node 0';
  s.events.push({ type: 'ok', msg: 'Node 0 elected Leader (term 1). Sends heartbeats.' });
  snap(steps, s, 'Node 0 is Leader. Sends periodic heartbeats (AppendEntries RPC) every 50ms to prevent re-election.', 5);

  s.nodes[0].log = [{ idx: 1, cmd: 'SET x=42', committed: false }];
  s.packets = ['n1','n2','n3','n4'].map((to) => packet('n0', to, 'AppendEntries[SET x=42]', 'replication'));
  s.events.push({ type: 'info', msg: 'Client write: SET x=42. Leader appends to log.' });
  snap(steps, s, 'Client sends SET x=42. Leader appends to local log, replicates to all followers.', 6);

  ['n1','n2'].forEach((id) => {
    const n = s.nodes.find((nd) => nd.id === id);
    n.log = [{ idx: 1, cmd: 'SET x=42', committed: false }];
    n.state = 'active';
  });
  s.events.push({ type: 'ok', msg: 'Majority (3 nodes) replicated. Leader commits.' });
  snap(steps, s, 'Majority (n0+n1+n2 = 3) acknowledged. Leader commits entry. Durable.', 7);

  s.nodes[0].log[0].committed = true;
  s.metrics.committed = 1;
  s.events.push({ type: 'ok', msg: 'Entry committed. Respond to client: success.' });
  snap(steps, s, 'Entry committed across majority. Client gets success. n3+n4 replicate eventually.', 8);

  s.nodes[0].role = 'follower';
  s.nodes[0].state = 'error';
  s.nodes[0].icon = ROLE_ICON.crashed;
  s.nodes[0].desc = 'CRASHED — leader unreachable, followers detect missing heartbeat';
  s.metrics.leader = 'none';
  s.events.push({ type: 'error', msg: 'Node 0 crashes! New election triggered.' });
  snap(steps, s, 'Node 0 (Leader) crashes. Followers detect missing heartbeat within 300ms. New election starts.', 9);

  s.nodes[1].role = 'candidate';
  s.nodes[1].state = 'active';
  s.nodes[1].icon = ROLE_ICON.candidate;
  s.nodes[1].term = 2;
  s.metrics.term = 2;
  s.events.push({ type: 'ok', msg: 'Node 1 wins election (term 2). Cluster recovers.' });
  snap(steps, s, 'Node 1 times out first → becomes candidate (term 2). Wins election. Cluster recovers automatically.', 10);

  return steps;
}

const CODE = [
  '// Raft State Machine (etcd/Consul)',
  'class RaftNode {',
  '  state: FOLLOWER | CANDIDATE | LEADER',
  '  currentTerm: number',
  '  votedFor: string',
  '  log: LogEntry[]',
  '',
  '  onElectionTimeout() {',
  '    this.currentTerm++',
  '    this.state = CANDIDATE',
  '    this.startElection()',
  '  }',
  '',
  '  onAppendEntries(req) {',
  '    if (req.term > this.currentTerm) {',
  '      this.state = FOLLOWER',
  '      this.currentTerm = req.term',
  '    }',
  '  }',
  '',
  '  commitEntry(index) {',
  '    this.applyStateMachine(this.log[index])',
  '  }',
  '}',
  '// Timeouts: 150-300ms election, 100ms heartbeat',
];

export default {
  id: 'raft',
  label: 'Raft Consensus',
  icon: '🗳️',
  build: buildRaftSteps,
  code: CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'term',      label: 'Term',      max: 5, color: 'var(--node-default)' },
    { key: 'committed', label: 'Committed', max: 5, color: 'var(--pod-running)' },
    { key: 'nodes',     label: 'Nodes',     max: 5, color: 'var(--node-visited)' },
  ],
  codeNotes: [
    { title: 'Election Timeout', content: 'Randomized 150-300ms per node. Prevents split-brain: if all nodes timeout at 150ms, candidate floods peers with votes, achieving majority quickly.' },
    { title: 'Term Increment', content: 'Each election bumps term. Node with higher term wins authority. Old leader with term=1 rejects writes if new leader has term=2.' },
    { title: 'Majority Quorum', content: '5-node cluster needs 3 votes (50% + 1). Can tolerate 2 failures. 7-node cluster tolerates 3 failures. Larger clusters = more resilience but slower consensus.' },
    { title: 'Log Replication', content: 'Leader sends AppendEntries every 50ms (heartbeat). Followers apply entries once majority has ACK\'d. Committed entries are durable (survive leader failure).' },
  ],
  tradeoffs: [
    { pro: 'Raft guarantees linearizability (strong consistency)', con: 'Write latency = max(network RTT, quorum size). 5 nodes across 3 DCs: 100ms+ latency.' },
    { pro: 'Automatic leader election (no manual failover)', con: 'Election takes 150-300ms; reads may fail during election. ~2 outages/year per node.' },
    { pro: 'Log replication is straightforward', con: 'Full log replication = O(n) bandwidth. Snapshotting needed every 1GB (Raft optimization).' },
    { pro: 'Works with asynchronous networks', con: 'Byzantine faults (corrupted nodes) not tolerated. Need BFT (PBFT) for that (3x slower).' },
  ],
  bestPractices: [
    'Deploy Raft clusters (etcd, Consul) across 3 datacenters minimum. 5-node cluster typical for fault tolerance.',
    'Monitor leader changes; alert if >1/day (indicates instability). Use steady-state election timeout 3-6s for WAN networks.',
    'Snapshot logs every 10k entries or 1GB. Without snapshots, recovery time = O(total log size) = 10s → 100s on 10GB logs.',
    'Use Raft for metadata only (configs, service discovery). Don\'t use for high-volume data (etcd: <10k req/s, Consul: <50k).',
    'Prefer "read from leader only" to avoid stale reads. Read-only followers need querying leader for current term (2 round-trips).',
  ],
};


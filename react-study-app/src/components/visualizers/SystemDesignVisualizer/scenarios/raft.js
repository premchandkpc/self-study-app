import { snap, packet } from './shared.js';

/* ─────────────────────────────────────────────────────────────────────────────
   Raft Consensus — leader election + log replication
   Pentagon layout (P2P cluster — no horizontal layers)
───────────────────────────────────────────────────────────────────────────── */
function buildRaftSteps() {
  const steps = [];

  const makeNode = (id, label, role, x, y) => ({
    id, label, type: 'raft', role, x, y,
    state: 'idle', term: 0, voted: false, log: [],
    icon: '⬡',
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
  s.nodes[0].icon = '🔵';
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
  s.nodes[0].icon = '⭐';
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
  s.nodes[0].icon = '💥';
  s.nodes[0].desc = 'CRASHED — leader unreachable, followers detect missing heartbeat';
  s.metrics.leader = 'none';
  s.events.push({ type: 'error', msg: 'Node 0 crashes! New election triggered.' });
  snap(steps, s, 'Node 0 (Leader) crashes. Followers detect missing heartbeat within 300ms. New election starts.', 9);

  s.nodes[1].role = 'candidate';
  s.nodes[1].state = 'active';
  s.nodes[1].icon = '🔵';
  s.nodes[1].term = 2;
  s.metrics.term = 2;
  s.events.push({ type: 'ok', msg: 'Node 1 wins election (term 2). Cluster recovers.' });
  snap(steps, s, 'Node 1 times out first → becomes candidate (term 2). Wins election. Cluster recovers automatically.', 10);

  return steps;
}

const CODE = [
  '// Raft leader election',
  'if (electionTimeout) {',
  '  term++; role = CANDIDATE;',
  '  broadcast(RequestVote{term});',
  '}',
  '// Log replication',
  'if (role === LEADER) {',
  '  log.append(entry);',
  '  broadcast(AppendEntries);',
  '  if (majority_ack) commit();',
  '}',
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
};

import { snap } from '@/core/utils/scenarioShared';

function buildRaftSteps() {
  const steps = [];

  const s = {
    servers: [],
    votes: {},
    heartbeatActive: true,
    events: [],
    metrics: { term: 1, leader: -1, voters: 0, logEntries: 0 },
    vars: { state: 'follower', currentTerm: 1, leaderId: '-', quorum: 2 },
  };

  snap(steps, s, 'Raft: consensus algorithm for replicated state machines. Ensures fault-tolerant agreement.', 1);

  s.servers = [
    { id: 'S1', state: 'follower', term: 1, log: [{ index: 1, term: 1, cmd: 'x=3' }] },
    { id: 'S2', state: 'follower', term: 1, log: [{ index: 1, term: 1, cmd: 'x=3' }] },
    { id: 'S3', state: 'follower', term: 1, log: [{ index: 1, term: 1, cmd: 'x=3' }] },
  ];
  s.metrics.term = 1;
  s.metrics.logEntries = 1;
  s.vars = { state: 'follower', currentTerm: 1, leaderId: '-', quorum: 2 };
  s.events.push({ msg: '3 servers start as followers. No leader yet.', type: 'info' });
  snap(steps, s, 'INITIAL STATE: 3 servers (S1, S2, S3). All followers. Term 1. Log replicated on all 3.', 1);

  s.heartbeatActive = false;
  s.events.push({ msg: 'Heartbeat timeout → S1 becomes candidate', type: 'info' });
  snap(steps, s, 'ELECTION TIMEOUT: S1 detects no heartbeat. Timeout (~150ms). S1 transitions to candidate.', 2);

  s.servers = s.servers.map((sv) =>
    sv.id === 'S1' ? { ...sv, state: 'candidate', term: 2 } : sv
  );
  s.votes = { S1: 1, S2: 0, S3: 0 };
  s.vars = { state: 'candidate', currentTerm: 2, leaderId: '-', quorum: 2 };
  s.events.push({ msg: 'S1 becomes candidate. Term=2. Votes for itself.', type: 'info' });
  s.events.push({ msg: 'S1 sends RequestVote RPC to S2, S3', type: 'info' });
  snap(steps, s, 'CANDIDATE: S1 increments term to 2, votes for itself, sends RequestVote to S2 and S3.', 3);

  s.votes = { S1: 1, S2: 1, S3: 1 };
  s.metrics.voters = 3;
  s.events.push({ msg: 'S2 votes YES for S1 (term 2, log up-to-date)', type: 'ok' });
  s.events.push({ msg: 'S3 votes YES for S1', type: 'ok' });
  snap(steps, s, 'VOTING: S1 gets votes from S2 and S3. 3/3 votes. Majority = 2 (N/2+1 = 2).', 4);

  s.servers = s.servers.map((sv) =>
    sv.id === 'S1' ? { ...sv, state: 'leader', term: 2 } : sv
  );
  s.heartbeatActive = true;
  s.metrics.leader = 0;
  s.vars = { state: 'leader', currentTerm: 2, leaderId: 'S1', quorum: 2 };
  s.events.push({ msg: 'S1 wins election. Becomes leader for term 2.', type: 'ok' });
  s.events.push({ msg: 'S1 sends AppendEntries (heartbeat) to S2, S3', type: 'info' });
  snap(steps, s, 'LEADER ELECTED: S1 is leader for term 2. Sends heartbeat (AppendEntries) to all followers. Prevents new elections.', 5);

  s.servers = s.servers.map((sv) => {
    if (sv.id === 'S1') {
      return { ...sv, log: [...sv.log, { index: 2, term: 2, cmd: 'y=7' }] };
    }
    return sv;
  });
  s.metrics.logEntries = 2;
  s.events.push({ msg: 'Client request: "y=7". Leader appends to log (index 2).', type: 'info' });
  snap(steps, s, 'LOG REPLICATION: Client sends "y=7". Leader appends to local log. Sends AppendEntries to S2, S3.', 6);

  s.servers = s.servers.map((sv) =>
    sv.id !== 'S1' ? { ...sv, log: [...sv.log, { index: 2, term: 2, cmd: 'y=7' }] } : sv
  );
  s.events.push({ msg: 'S2 acknowledges AppendEntries. Log consistent.', type: 'ok' });
  s.events.push({ msg: 'S3 acknowledges AppendEntries. Log consistent.', type: 'ok' });
  s.events.push({ msg: 'Majority replicated → commit entry 2. Apply to state machine.', type: 'ok' });
  snap(steps, s, 'COMMIT: S2, S3 replicate "y=7". Majority (S1+S2) confirms. Leader commits at index 2. Tells followers to commit.', 7);

  // Leader failure
  s.heartbeatActive = false;
  s.servers = s.servers.map((sv) =>
    sv.id === 'S1' ? { ...sv, state: 'follower', term: 2 } : sv
  );
  s.metrics.leader = -1;
  s.events.push({ msg: 'S1 (leader) fails! Heartbeats stop.', type: 'error' });
  s.events.push({ msg: 'S2 detects timeout. Starts new election (term 3).', type: 'warn' });
  snap(steps, s, 'LEADER FAILURE: S1 crashes. S2 and S3 detect missing heartbeat after timeout. S2 transitions to candidate for term 3.', 8);

  return steps;
}

export const RAFT_CODE = [
  '// Raft consensus (simplified)',
  'enum State { FOLLOWER, CANDIDATE, LEADER }',
  '',
  'struct RaftNode {',
  '  State state = FOLLOWER;',
  '  int currentTerm = 0;',
  '  int votedFor = -1;',
  '  LogEntry[] log;',
  '  int commitIndex = 0;',
  '};',
  '',
  '// 1. Election timeout → CANDIDATE',
  '// 2. RequestVote RPC → gather votes',
  '// 3. Majority (N/2+1) → LEADER',
  '// 4. AppendEntries (heartbeat) → maintain authority',
  '// 5. Client requests → log replication → commit',
  '',
  '// Safety: at most one winner per term',
  '// Leader completeness: elected leader has all committed entries',
];

export default {
  id: 'raft',
  label: 'Raft',
  icon: '\u2b21',
  build: buildRaftSteps,
  code: RAFT_CODE,
  language: 'c',
  metrics: [
    { key: 'term', label: 'Term', max: 10, color: 'var(--node-active)' },
    { key: 'voters', label: 'Votes', max: 5, color: 'var(--pod-running)' },
    { key: 'logEntries', label: 'Log Entries', max: 10, color: 'var(--kafka-producer)' },
  ],
  topicContent: {
    concept: [
      { title: 'ELI5 — Kid-friendly analogy', content: 'Raft is like three friends deciding where to eat dinner. One is the leader (picks the restaurant). If the leader stops talking, the others wait a bit, then one becomes the new leader. Everyone keeps a notepad of the plan. The leader announces the plan, the others copy it down. If most have it, it\'s decided (committed).' },
      { title: 'Core — How it works', content: 'Raft elects a leader via randomized election timeouts. Leader handles all client requests, appends to its log, and replicates via AppendEntries RPCs. Once a majority acknowledges, the entry is committed and applied. Terms serve as logical clocks. Only the leader with the most up-to-date log can win elections (Leader Completeness).' },
    ],
    why: ['Raft is the consensus algorithm behind etcd (Kubernetes), Consul, and MongoDB replica sets. It is the most widely deployed consensus protocol because it is understandable and has a formal safety proof.'],
    interview: [
      { question: 'How does Raft handle split-brain (network partition)?', answer: 'Raft uses majority quorum (N/2+1). During a partition, only the side with a majority can elect a leader and commit entries. The minority side cannot form a quorum — leader election fails. When the partition heals, the minority leader steps down (sees higher term) and nodes sync logs. This guarantees at most one leader per term.', followUps: ['What happens to state machine safety during partition?', 'How does Raft prevent stale reads during partition?'] },
      { question: 'What is the Leader Completeness property?', answer: 'A leader elected for a given term must contain all entries committed in previous terms. This is enforced by the voting process: a candidate must have a log at least as up-to-date as the voter (compared by last log term, then log length). This ensures that committed entries are never lost or overwritten.', followUps: ['What happens if a leader crashes before replicating?', 'How does log matching work?'] },
    ],
    gotcha: ['Raft is "understandable" but subtle: the election timeout must be randomized to prevent vote splitting. If two nodes timeout simultaneously, they split votes and no leader is elected, causing another round.', 'Raft\'s safety depends on the "at most one leader per term" guarantee. This requires monotonically increasing terms and correct persistent storage of currentTerm and votedFor.'],
    tradeoffs: [
      { pro: 'Understandable — designed for teachability, clear state machine', con: 'single leader bottleneck — all reads/writes go through leader' },
      { pro: 'Strong consistency — linearizable reads via leader', con: 'performance limited by single node throughput, ~10-50K ops/sec' },
    ],
  },
};

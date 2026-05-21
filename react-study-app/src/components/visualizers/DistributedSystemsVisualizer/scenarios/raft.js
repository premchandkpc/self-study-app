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
      { title: 'What is Raft in simple terms?', content: 'Raft is a consensus algorithm that keeps multiple servers in agreement about a shared state, even when some servers fail. Think of it as a group of friends keeping identical diaries. One friend is the leader and writes entries first. The others copy the entries. If the leader stops responding, the friends hold a quick vote to elect a new leader. Raft is designed to be understandable — much simpler than Paxos, its predecessor.' },
      { title: 'How Raft works — core mechanics', content: 'Raft servers are in one of three states: follower, candidate, or leader. Followers expect periodic heartbeats from the leader. If no heartbeat arrives before an election timeout, a follower becomes a candidate, increments the term, and requests votes. A candidate wins with a majority (N/2+1). The leader handles all client requests, appends entries to its log, and replicates them to followers via AppendEntries RPCs. An entry is committed once a majority acknowledges it. Terms serve as logical clocks to prevent stale leaders.' },
      { title: 'Deep — internals & architecture', content: 'Raft guarantees exactly one leader per term through randomized election timeouts (150-300ms). Log matching ensures consistency: if two entries have the same index and term, they are identical and all prior entries are also identical. The commit rule ensures that committed entries are durable: once an entry is committed on the leader, it will eventually be present in all server logs. Leader Completeness ensures the elected leader has all committed entries. Cluster membership changes use a joint consensus phase to allow configuration changes without downtime.' },
    ],
    why: [
      'Raft is the consensus algorithm behind etcd (Kubernetes), Consul, and MongoDB replica sets. It is the most widely deployed consensus protocol because it is understandable and has a formal safety proof with a reference implementation.',
      'Distributed systems depend on consensus for coordination — leader election, distributed locking, and configuration management all require Raft or a similar protocol. Raft\'s separation into subproblems (leader election, log replication, safety) makes it production-viable.',
      'Raft provides linearizable consistency, meaning clients see the most recent committed state. This is critical for correctness in systems like Kubernetes (API server backed by etcd) where stale reads would cause incorrect scheduling decisions.',
    ],
    interview: [
      { q: 'How does Raft handle split-brain during a network partition?', a: 'Raft uses majority quorum (N/2+1) to prevent split-brain. During a partition, only the side containing a majority of servers can elect a leader and commit new entries. The minority side cannot form a quorum — its candidate cannot get enough votes, so no leader is elected. When the partition heals, the minority-side servers see a higher term from the majority-side leader, step down as followers, and sync their logs. This guarantees at most one leader per term across the entire cluster.', followUps: ['What happens to the state machine on the minority side during a partition?', 'How does Raft ensure linearizable reads when the leader is on the minority side?'] },
      { q: 'What is the Leader Completeness property in Raft?', a: 'Leader Completeness guarantees that a newly elected leader contains all committed entries from previous terms. This is enforced by the voting process: a candidate must have a log at least as up-to-date as the voter. The comparison first checks the term of the last log entry — higher term wins. If terms are equal, the longer log wins. This prevents a node with missing committed entries from becoming leader and overwriting them. Combined with the rule that a leader never overwrites its own log, this ensures committed entries persist forever.', followUps: ['What happens if a leader crashes before replicating an entry to any follower?', 'How does the log matching property ensure consistency across all servers?'] },
      { q: 'What happens during a Raft membership change (adding or removing servers)?', a: 'Raft uses a two-phase joint consensus approach for safe configuration changes. In phase 1, the leader creates a new configuration (C_old + C_new) that requires a majority of both old and new configurations to commit. In phase 2, the leader transitions to only the new configuration (C_new). This ensures the cluster continues to function during the transition and never elects two independent leaders. The joint consensus approach prevents the unsafe window where two non-overlapping majorities could each elect a leader with different configurations.', followUps: ['What is the risk of single-phase membership changes?', 'How does the single-server membership change approach (Raft thesis simplification) differ from joint consensus?'] },
    ],
    gotcha: [
      'Raft is understandable but subtle: the election timeout must be randomized (e.g., 150-300ms) to prevent vote splitting. If two nodes timeout simultaneously, they each vote for themselves and split the vote, requiring another election round.',
      'Raft\'s safety depends on the at-most-one-leader-per-term guarantee. This requires monotonically increasing terms and correct persistent storage of currentTerm and votedFor. If a server loses its persisted state on restart, it can accidentally vote twice in the same term.',
      'Raft provides linearizable reads only if the leader confirms it is still the leader before each read (by exchanging heartbeats). Without this, a partitioned leader might serve stale reads. Some Raft implementations sacrifice this for performance.',
      'Pre-vote (CheckQuorum) is a Raft extension that prevents a partitioned node from disrupting a healthy leader by incrementing the term. Without pre-vote, a partitioned follower that keeps timing out can force unnecessary leader elections when it reconnects.',
    ],
    tradeoffs: [
      { pro: 'Raft is designed for understandability with a clean separation into leader election, log replication, safety, and membership changes. It has a formal safety proof and is the most widely deployed consensus protocol in production.', con: 'The single leader creates a bottleneck — all reads and writes must go through the leader, limiting throughput to what one node can handle (typically 10K-50K ops/sec).' },
      { pro: 'Raft provides strong consistency with linearizable reads through the leader, making it suitable for critical infrastructure like Kubernetes etcd, Consul, and databases requiring strict ordering.', con: 'Performance is fundamentally limited by single-node throughput and the majority round trip. Read-only optimizations (follower reads) sacrifice linearizability, and write latency is at least one RTT to the majority.' },
      { pro: 'Mathematical safety guarantees with proven correctness — under the assumption of a majority of servers functioning, Raft guarantees liveness and safety even with arbitrary failures, network delays, and message loss.', con: 'High implementation complexity despite being simpler than Paxos. Subtle bugs in leader election, log consistency checks, and snapshot installation are common in production, leading to data loss incidents in etcd clusters.' },
    ],
  },
};

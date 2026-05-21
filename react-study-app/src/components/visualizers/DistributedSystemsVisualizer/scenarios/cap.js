import { snap } from '@/core/utils/scenarioShared';

function buildCapSteps() {
  const steps = [];

  const s = {
    nodes: [],
    partition: false,
    choice: 'cp',
    reads: 0,
    writes: 0,
    errors: 0,
    events: [],
    metrics: { nodes: 0, reads: 0, writes: 0, errors: 0, availability: 100 },
    vars: { choice: 'CP', consistency: true, availability: false, partitionOk: false },
  };

  snap(steps, s, 'CAP Theorem: Consistency, Availability, Partition Tolerance. Pick at most 2 of 3.', 1);

  s.nodes = [
    { id: 'N1', state: 'up' },
    { id: 'N2', state: 'up' },
    { id: 'N3', state: 'up' },
  ];
  s.metrics.nodes = 3;
  s.metrics.availability = 100;
  s.vars = { choice: 'CA (single node)', consistency: true, availability: true, partitionOk: false };
  s.events.push({ msg: '3 nodes, no partition. All guarantees met.', type: 'info' });
  snap(steps, s, 'CA MODE (single node): C + A without P. All 3 nodes consistent and available. Only possible without network partition.', 1);

  s.choice = 'cp';
  s.vars = { choice: 'CP', consistency: true, availability: false, partitionOk: true };
  s.events.push({ msg: 'CP mode selected: Consistency over Availability when partitioned.', type: 'info' });
  snap(steps, s, 'CP: Cassandra (tunable), MongoDB (default). When partition happens, keep consistency by rejecting writes on minority side.', 2);

  s.partition = true;
  s.nodes = s.nodes.map((n) =>
    n.id === 'N3' ? { ...n, state: 'partitioned' } : n
  );
  s.writes = 5;
  s.reads = 4;
  s.errors = 2;
  s.metrics.reads = 4;
  s.metrics.writes = 5;
  s.metrics.errors = 2;
  s.metrics.availability = 60;
  s.vars = { choice: 'CP + partition', consistency: true, availability: false, partitionOk: true };
  s.events.push({ msg: 'PARTITION: N3 isolated from N1, N2.', type: 'warn' });
  s.events.push({ msg: 'CP: Writes to N3 rejected (minority side). C preserved.', type: 'warn' });
  snap(steps, s, 'CP + PARTITION: N3 on minority side rejects writes. Reads from N1/N2 consistent. Availability drops to 60%.', 3);

  s.choice = 'ap';
  s.partition = true;
  s.errors = 0;
  s.writes = 8;
  s.reads = 6;
  s.metrics.reads = 6;
  s.metrics.writes = 8;
  s.metrics.errors = 0;
  s.metrics.availability = 100;
  s.vars = { choice: 'AP + partition', consistency: false, availability: true, partitionOk: true };
  s.events.push({ msg: 'AP: Accepting writes on all nodes during partition.', type: 'ok' });
  s.events.push({ msg: 'AP: Reads may return stale data. Eventual consistency.', type: 'warn' });
  snap(steps, s, 'AP + PARTITION: Accept writes everywhere. Availability = 100%. But N1 and N3 may have conflicting data. Eventual consistency via merge.', 4);

  s.choice = 'ap';
  s.partition = false;
  s.nodes = s.nodes.map((n) => ({ ...n, state: 'up' }));
  s.errors = 0;
  s.writes = 10;
  s.reads = 10;
  s.metrics.reads = 10;
  s.metrics.writes = 10;
  s.metrics.errors = 0;
  s.metrics.availability = 100;
  s.vars = { choice: 'AP (partition healed)', consistency: false, availability: true, partitionOk: true };
  s.events.push({ msg: 'Partition healed! Nodes sync via anti-entropy / gossip.', type: 'ok' });
  s.events.push({ msg: 'DynamoDB: last-write-wins conflict resolution.', type: 'info' });
  snap(steps, s, 'AP + HEALED: Partition resolves. Conflict resolution (last-write-wins, version vectors). DynamoDB, Couchbase approach.', 5);

  s.vars = { choice: 'Tradeoffs', consistency: false, availability: false, partitionOk: true };
  s.events.push({ msg: 'CAP says: pick 2. In practice: P is mandatory. Choose C or A.', type: 'info' });
  s.events.push({ msg: 'CP: MongoDB, HBase. AP: DynamoDB, Cassandra. CA: single-node RDBMS.', type: 'info' });
  snap(steps, s, 'SUMMARY: In distributed systems, partitions WILL happen. So really: CP vs AP. CA is single-node only.', 6);

  return steps;
}

export const CAP_CODE = [
  '// CAP Theorem — pick 2 of 3',
  '//',
  '// Consistency (C): All nodes see same data at same time',
  '// Availability (A): Every request gets a response (non-error)',
  '// Partition Tolerance (P): System continues despite network split',
  '//',
  '// Real distributed systems MUST tolerate partitions',
  '// Therefore: choose between CP and AP',
  '//',
  '// CP: MongoDB, HBase, Zookeeper',
  '//   → reject writes on minority side during partition',
  '//',
  '// AP: DynamoDB, Cassandra, Couchbase',
  '//   → accept writes everywhere, reconcile later',
];

export default {
  id: 'cap',
  label: 'CAP Theorem',
  icon: '\U0001f53a',
  build: buildCapSteps,
  code: CAP_CODE,
  language: 'text',
  metrics: [
    { key: 'reads', label: 'Reads', max: 20, color: 'var(--node-active)' },
    { key: 'writes', label: 'Writes', max: 20, color: 'var(--pod-running)' },
    { key: 'errors', label: 'Errors', max: 10, color: 'var(--pod-crash)' },
    { key: 'availability', label: 'Availability %', max: 100, color: 'var(--kafka-producer)' },
  ],
  topicContent: {
    concept: [
      { title: 'What is the CAP theorem in simple terms?', content: 'The CAP theorem says distributed databases must choose between consistency (everyone sees the same data), availability (every request gets a response), and partition tolerance (works despite network failures). You only get two out of three. Since network partitions are inevitable, the real choice is between consistency (CP) and availability (AP) during failures. CA only applies to single-node systems with no partitions.' },
      { title: 'How CAP works — core mechanics', content: 'During a network partition, nodes on one side cannot talk to nodes on the other. A CP system (MongoDB, HBase) rejects writes on the minority side to maintain consistency — the minority returns errors, reducing availability. An AP system (DynamoDB, Cassandra) accepts writes everywhere, accepting that data will diverge — consistency is sacrificed temporarily, resolved later via conflict resolution (last-write-wins, version vectors). CA is impossible in practice because partitions are guaranteed in any distributed system spanning multiple machines.' },
      { title: 'Deep — internals & architecture', content: 'CAP is a mathematical impossibility proof, not a design guideline. Gilbert and Lynch (2002) proved that in an asynchronous network model, you cannot simultaneously guarantee atomic consistency (linearizability) and availability (every non-failed node responds) under a partition. The PACELC extension refines CAP: during a Partition, choose Availability or Consistency; Else (normal operation), choose Latency or Consistency. DynamoDB chooses low latency with eventual consistency. Spanner chooses strong consistency with high latency (TrueTime for external consistency).' },
    ],
    why: [
      'CAP drives architectural decisions in every distributed database. Misunderstanding it leads to incorrect system design — claiming a system is both strongly consistent and always available during partitions is provably impossible, yet attempts cause subtle correctness bugs.',
      'The CAP theorem is the foundation for understanding tradeoffs in cloud databases. AWS DynamoDB (AP), Google Spanner (CP), and Azure Cosmos DB (tunable) each make different CAP choices optimized for different workloads and business requirements.',
      'CAP thinking extends beyond databases to any distributed system: service discovery (CP: Zookeeper vs AP: gossip), configuration management, and distributed locking all face the same consistency-availability tradeoff under network failures.',
    ],
    interview: [
      { q: 'Is it true that CAP says you can only have 2 out of 3?', a: 'Yes, but the practical interpretation matters more. In distributed systems, P (partition tolerance) is mandatory because networks WILL fail — it is not a choice. So the real tradeoff is CP vs AP during partitions. CA is only possible in single-node systems with no network, which defeat the purpose of distribution. During a partition, a CP system (MongoDB default) rejects writes on the minority side to maintain consistency. An AP system (DynamoDB) accepts writes everywhere and reconciles conflicts later via last-write-wins or application-level merge.', followUps: ['What does the PACELC extension add to CAP?', 'Does ACID violate the CAP theorem for distributed transactions?'] },
      { q: 'What is the difference between strong consistency and eventual consistency?', a: 'Strong consistency (linearizability) guarantees that once a write completes, all subsequent reads return that written value. This requires coordination between replicas using consensus protocols like Paxos or Raft, adding latency proportional to the number of replicas. Eventual consistency guarantees that if no new writes occur, all replicas will eventually converge to the same value. Reads may return stale data during convergence. DynamoDB uses last-write-wins with vector clocks for conflict resolution. Cassandra offers tunable consistency via read/write consistency levels: ONE (fast, weak), QUORUM (balanced), ALL (strong, slow).', followUps: ['What is causal consistency and where does it fit between strong and eventual?', 'When would you choose eventual consistency for a production system?'] },
      { q: 'What are the practical limitations of the CAP theorem in real-world systems?', a: 'CAP is a simplified model that makes several assumptions: it considers only one partition at a time, binary consistency (all-or-nothing), and does not account for partial failures, Byzantine faults, or the cost of achieving consistency. In practice, systems can have tunable consistency (Cassandra read/write concerns, MongoDB write concern), operate in normal mode with both C and A, or tolerate briefly inconsistent states that self-heal. The PACELC model extends CAP to address the normal-operation tradeoff between latency and consistency, which is often the more relevant design decision.', followUps: ['How does the PACELC model change system design decisions?', 'How does Google Spanner achieve strong consistency across global data centers?'] },
    ],
    gotcha: [
      'CAP talks about partitions, not normal operation. A system can be both consistent AND available when there is no partition. The tradeoff only activates under network failure. Conflating normal and partitioned behavior is the most common CAP misunderstanding.',
      'Some systems blur CAP categories — MongoDB is CP by default but can be configured with write concern = 0 (fire-and-forget), sacrificing durability. Cassandra allows tuning consistency per operation. This means the same database can act CP or AP depending on configuration.',
      'CAP does not consider network delay or partial failures. A system can appear available but serve stale data, or appear consistent but reject requests under high latency. Real-world failure modes are more nuanced than the binary CAP model suggests.',
      'The "2 of 3" framing is misleading because P is not optional in distributed systems. The real design space is: what do you sacrifice when a partition happens? Not "which two do you pick upfront?"',
    ],
    tradeoffs: [
      { pro: 'CP (MongoDB, HBase) provides strong consistency — easy to reason about, safe for financial data and transactions, and eliminates the need for application-level conflict resolution.', con: 'Reduced availability during partitions — the minority side rejects all writes. Higher latency from coordination overhead (consensus protocols), and the system may become unavailable if the majority side itself partitions.' },
      { pro: 'AP (DynamoDB, Cassandra) ensures always-available writes — the system accepts requests from any node at any time, providing high availability and low latency with no coordination overhead.', con: 'Conflict resolution complexity — clients must handle stale reads and reconcile conflicting writes. Merge strategies (last-write-wins, CRDTs, application-level merge) add significant application complexity.' },
      { pro: 'Tunable consistency (Cassandra, Azure Cosmos DB) lets each operation choose the consistency level — fast reads for dashboards, strong reads for financial transactions, all on the same database cluster.', con: 'Increased operational complexity — tuning requires deep understanding of the tradeoffs per operation. Misconfiguration can lead to either incorrect behavior (expecting strong consistency but getting stale data) or performance issues (expecting high availability but getting rejections).' },
    ],
  },
};

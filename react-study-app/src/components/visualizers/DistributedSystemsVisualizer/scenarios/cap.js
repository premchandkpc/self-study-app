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
      { title: 'ELI5 — Kid-friendly analogy', content: 'CAP is like a three-way tradeoff in a group project. Consistency = everyone sees the same version of the document. Availability = everyone can edit anytime. Partition tolerance = the project still works if the internet cuts some people off. You can only guarantee two at once. In practice, partitions WILL happen, so you choose: consistent or available?' },
      { title: 'Core — How it works', content: 'CAP Theorem: In distributed systems with network partitions, you must choose between Consistency (all nodes see same data) and Availability (every request gets a non-error response). Since partitions are inevitable in distributed systems, the real choice is CP vs AP. CA is only possible without partitions (single-node). CP examples: MongoDB, HBase. AP examples: DynamoDB, Cassandra.' },
    ],
    why: ['CAP drives architectural decisions in every distributed database. Misunderstanding it leads to incorrect system design — e.g., claiming a system is both strongly consistent and always available during partitions, which is provably impossible.'],
    interview: [
      { question: 'Is it true that CAP says you can only have 2 of 3?', answer: 'Yes, but the practical interpretation is: in distributed systems, P (partition tolerance) is mandatory because networks WILL fail. So the real choice is CP vs AP. CA only applies to single-node systems. During a partition, you must either sacrifice consistency (AP — accept conflicting writes) or availability (CP — reject writes on minority side).', followUps: ['What about the PACELC extension to CAP?', 'Does ACID violate CAP?'] },
      { question: 'What is the difference between strong consistency and eventual consistency?', answer: 'Strong consistency (linearizability): after a write completes, all subsequent reads return the updated value. Requires coordination (Paxos/Raft). Eventual consistency: if no new writes, all replicas will converge over time. Reads may return stale data. DynamoDB uses last-write-wins; Cassandra uses tunable consistency levels (ONE, QUORUM, ALL).', followUps: ['What is causal consistency?', 'When would you choose eventual over strong consistency?'] },
    ],
    gotcha: ['CAP talks about partitions, not normal operation. A system can be both consistent AND available when there is no partition. The tradeoff only activates under network failure.', 'Some systems are "CP but not really" — e.g., MongoDB is CP by default but can be configured with write concern = 0 (fire-and-forget), sacrificing durability. This blurs the CAP categorization.'],
    tradeoffs: [
      { pro: 'CP — strong consistency, easy to reason about, safe for financial data', con: 'reduced availability during partitions, higher latency (coordination overhead)' },
      { pro: 'AP — always available, low latency, high throughput', con: 'conflict resolution complexity, stale reads, need merge strategies' },
    ],
  },
};

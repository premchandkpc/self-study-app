import { snap } from '@/core/utils/scenarioShared';

function buildTwoPCSteps() {
  const steps = [];

  const s = {
    coordinator: { state: 'idle' },
    participants: [],
    events: [],
    metrics: { totalTx: 0, committed: 0, aborted: 0, participants: 0 },
    vars: { phase: 'Idle', coordinatorState: 'idle', decision: '-' },
  };

  snap(steps, s, 'Two-Phase Commit (2PC): distributed transaction protocol. Atomic commit across nodes.', 1);

  s.participants = [
    { id: 'P1', state: 'idle', vote: null },
    { id: 'P2', state: 'idle', vote: null },
    { id: 'P3', state: 'idle', vote: null },
  ];
  s.metrics.participants = 3;
  s.metrics.totalTx = 1;
  s.vars = { phase: 'Begin Transaction', coordinatorState: 'idle', decision: '-' };
  s.events.push({ msg: 'Coordinator receives BEGIN transaction request.', type: 'info' });
  snap(steps, s, 'BEGIN: Coordinator receives distributed transaction request. 3 participants (P1, P2, P3) involved.', 1);

  s.coordinator = { state: 'prepare' };
  s.vars = { phase: 'Phase 1: Prepare', coordinatorState: 'prepare', decision: 'pending' };
  s.events.push({ msg: 'Coordinator sends PREPARE to all participants.', type: 'info' });
  snap(steps, s, 'PHASE 1 — PREPARE: Coordinator sends "prepare-to-commit" to all participants. Participants must respond YES/NO.', 2);

  s.participants = s.participants.map((p) =>
    p.id === 'P1' ? { ...p, state: 'prepared', vote: 'YES' } :
    p.id === 'P2' ? { ...p, state: 'prepared', vote: 'YES' } :
    { ...p, state: 'prepared', vote: 'YES' }
  );
  s.events.push({ msg: 'P1: YES. Has written prepare log. Ready to commit.', type: 'ok' });
  s.events.push({ msg: 'P2: YES. Resources locked.', type: 'ok' });
  s.events.push({ msg: 'P3: YES. Ready.', type: 'ok' });
  snap(steps, s, 'VOTE: All 3 participants vote YES. Each has written prepare log entry and holds locks on resources.', 3);

  s.coordinator = { state: 'commit' };
  s.participants = s.participants.map((p) => ({ ...p, state: 'committed' }));
  s.metrics.committed = 1;
  s.vars = { phase: 'Phase 2: Commit', coordinatorState: 'commit', decision: 'COMMIT' };
  s.events.push({ msg: 'Coordinator receives all YES votes. Decision: COMMIT.', type: 'ok' });
  s.events.push({ msg: 'Coordinator sends COMMIT to all participants.', type: 'info' });
  snap(steps, s, 'PHASE 2 — COMMIT: All YES → Coordinator decides COMMIT. Sends commit message. Participants apply and release locks.', 4);

  // ABORT scenario
  s.coordinator = { state: 'idle' };
  s.participants = [
    { id: 'P1', state: 'idle', vote: null },
    { id: 'P2', state: 'idle', vote: null },
    { id: 'P3', state: 'idle', vote: null },
  ];
  s.metrics.totalTx = 2;
  s.events.push({ msg: 'Second transaction begins.', type: 'info' });
  snap(steps, s, 'SCENARIO: Participant votes NO → transaction must ABORT.', 5);

  s.coordinator = { state: 'prepare' };
  s.participants = s.participants.map((p) =>
    p.id === 'P1' ? { ...p, state: 'prepared', vote: 'YES' } :
    p.id === 'P2' ? { ...p, state: 'prepared', vote: 'NO' } :
    { ...p, state: 'prepared', vote: 'YES' }
  );
  s.events.push({ msg: 'P1: YES. P2: NO (constraint violation). P3: YES.', type: 'info' });
  s.events.push({ msg: 'P2 votes NO → coordinator must ABORT.', type: 'error' });
  snap(steps, s, 'NO VOTE: P2 detects constraint violation → votes NO. Any NO forces abort.', 6);

  s.coordinator = { state: 'abort' };
  s.participants = s.participants.map((p) => ({ ...p, state: 'aborted' }));
  s.metrics.aborted = 1;
  s.vars = { phase: 'Phase 2: Abort', coordinatorState: 'abort', decision: 'ABORT' };
  s.events.push({ msg: 'Coordinator sends ABORT to all participants.', type: 'warn' });
  s.events.push({ msg: 'Participants rollback and release locks.', type: 'info' });
  s.events.push({ msg: 'Blocking protocol: participants held locks during Phase 1.', type: 'warn' });
  snap(steps, s, 'ABORT: Coordinator sends ABORT. Participants rollback. Locks released. 2PC is blocking — participants block waiting for coordinator decision.', 7);

  s.events.push({ msg: '2PC summary: 1 committed, 1 aborted. Blocking protocol drawback.', type: 'info' });
  s.events.push({ msg: 'Alternatives: 3PC (non-blocking), Saga (compensating txs).', type: 'info' });
  snap(steps, s, 'SUMMARY: 2PC guarantees atomic commit but blocks on coordinator. 3PC adds timeout to avoid blocking. Sagas use compensating transactions.', 8);

  return steps;
}

export const TWOPC_CODE = [
  '// Two-Phase Commit protocol',
  '// Phase 1: Prepare',
  'coordinator -> participant: prepare(T)',
  'participant -> coordinator: YES | NO',
  '',
  '// Phase 2: Commit or Abort',
  'if all YES:',
  '  coordinator -> participant: commit(T)',
  '  participant -> coordinator: ack',
  'else:',
  '  coordinator -> participant: abort(T)',
  '  participant -> coordinator: ack (rollback done)',
  '',
  '// Blocking: participants hold locks after prepare',
  '// until coordinator replies (can be forever if coord crashes)',
  '',
  '// Alternatives:',
  '//   3PC — non-blocking, adds timeout',
  '//   Saga — compensating transactions, no locks',
];

export default {
  id: 'twopc',
  label: '2PC',
  icon: '\U0001f504',
  build: buildTwoPCSteps,
  code: TWOPC_CODE,
  language: 'text',
  metrics: [
    { key: 'totalTx', label: 'Total Txn', max: 10, color: 'var(--node-active)' },
    { key: 'committed', label: 'Committed', max: 10, color: 'var(--pod-running)' },
    { key: 'aborted', label: 'Aborted', max: 10, color: 'var(--pod-crash)' },
    { key: 'participants', label: 'Participants', max: 10, color: 'var(--kafka-producer)' },
  ],
  topicContent: {
    concept: [
      { title: 'What is Two-Phase Commit (2PC) in simple terms?', content: '2PC is a protocol that ensures multiple databases all commit or all abort a transaction together — like a synchronized save. A coordinator asks each participant to prepare. If everyone says ready, the coordinator says commit. If anyone says no or times out, everyone aborts. The problem is that participants hold locks while waiting, and if the coordinator crashes during Phase 2, participants are stuck indefinitely.' },
      { title: 'How 2PC works — core mechanics', content: 'Phase 1 (Prepare): the coordinator sends a PREPARE message to all participants. Each participant writes a prepare log entry to stable storage, acquires necessary locks, and responds with either YES (ready to commit) or NO (cannot commit due to conflict or error). Phase 2 (Commit/Abort): if all participants voted YES, the coordinator writes a commit log entry and sends COMMIT to all participants. If any voted NO or timed out, the coordinator writes an abort log entry and sends ABORT to all. Participants apply or rollback, release locks, and send acknowledgments.' },
      { title: 'Deep — internals & architecture', content: '2PC is a blocking protocol because participants enter an uncertain state after voting YES — they hold locks and cannot unilaterally decide to commit or abort. The coordinator\'s write-ahead log (WAL) is crucial for recovery: on restart, the coordinator reads its log to determine the decision for each in-doubt transaction. XA transactions (JTA, JTS) use 2PC as the standard for distributed transaction coordination across heterogeneous resources (databases, message queues). The coordinator implements a timeout: if a participant does not vote within the timeout, the coordinator assumes NO and aborts, preventing indefinite blocking from a crashed participant.' },
    ],
    why: [
      '2PC guarantees atomic commit across distributed nodes — either all participants commit or all abort. This is essential for distributed databases (XA transactions, JTA) where partial commits would corrupt data integrity across services.',
      'Financial systems, booking systems, and inventory management rely on 2PC to ensure that operations across multiple databases (payment + order + inventory) either completely succeed or completely fail, preventing inconsistencies that could cause monetary or data loss.',
      'While 2PC is unsuitable for high-availability microservices due to its blocking nature, it remains the standard for within-datacenter distributed transactions where network reliability is high and blocking duration is bounded by coordinator recovery time.',
    ],
    interview: [
      { q: 'What is the blocking problem in 2PC and why does it matter?', a: 'After a participant votes YES in Phase 1, it enters a "prepared" state where it holds locks on resources and waits for the coordinator\'s decision. If the coordinator crashes at this point, the participant is stuck indefinitely — it cannot unilaterally commit (because this might violate atomicity if the coordinator decided abort) and cannot abort (because the coordinator might have decided commit before crashing). The participant blocks until the coordinator recovers and reads its log to re-send the decision. This blocking is why 2PC is unsuitable for high-availability systems: a coordinator failure can bring the entire system to a halt.', followUps: ['How does 3PC (Three-Phase Commit) solve the blocking problem?', 'What happens if a participant crashes after voting YES and before receiving the decision?'] },
      { q: 'How does 2PC handle coordinator failure and recovery?', a: 'If the coordinator crashes before sending PREPARE: participants never change state, no locks are held, no issue. If the coordinator crashes after sending PREPARE but before logging a decision: participants block holding locks until the coordinator recovers. On recovery, the coordinator reads its WAL. If it finds a commit or abort log entry, it re-sends the decision to all participants. If it finds a prepare log entry but no decision entry, it must abort (since the decision was never finalized). However, participants cannot distinguish between a coordinator that crashed before logging commit vs one that crashed after — this uncertainty is the blocking problem.', followUps: ['What is a heuristic decision in 2PC and what are its risks?', 'How does the XA protocol implement coordinator recovery across heterogeneous resource managers?'] },
      { q: 'What are the alternatives to 2PC for distributed transactions?', a: 'There are several alternatives depending on consistency requirements. 3PC (Three-Phase Commit) adds a pre-commit phase and timeouts, making it non-blocking but still vulnerable to network partitions. Sagas split a transaction into a sequence of local transactions with compensating actions for rollback — they are non-blocking and suitable for long-running transactions in microservices, but only guarantee eventual consistency (not atomicity). Outbox pattern (transactional outbox + change data capture) achieves at-least-once delivery without 2PC. TCC (Try-Confirm/Cancel) is a reservation-based approach used in payment systems.', followUps: ['How does the Saga pattern handle rollback if a compensating transaction fails?', 'What is the transactional outbox pattern and how does it avoid 2PC?'] },
    ],
    gotcha: [
      '2PC assumes all participants are available and responsive. A slow participant blocks everyone — the coordinator waits for all votes. Timeouts are necessary but risk premature abort if the coordinator times out a slow but correct participant, causing unnecessary rollbacks.',
      'The coordinator is a single point of failure. If the coordinator crashes after sending COMMIT to some participants but before others, some nodes commit and some wait — this is a partial commit violation of atomicity that requires administrator intervention to resolve.',
      '2PC has higher latency than alternatives because it requires two round trips (prepare + commit/abort) to all participants. If any participant is geographically distant, this adds significant latency to every distributed transaction.',
      'PostgreSQL does not support 2PC in streaming replication out of the box — it requires external transaction coordinators (PgBouncer, XA-compatible middleware). MySQL supports XA transactions but has performance and durability caveats.',
    ],
    tradeoffs: [
      { pro: '2PC provides strong atomicity guarantees — either all participants commit or all abort. This is the industry standard (XA protocol) for distributed transactions across heterogeneous databases, message queues, and transaction processing monitors.', con: 'The blocking protocol means participants hold locks indefinitely if the coordinator fails. The coordinator is a single point of failure. Latency is high (two round trips). Not suitable for high-availability or geo-distributed systems.' },
      { pro: 'Saga pattern provides non-blocking distributed transaction coordination with high availability. It supports long-running transactions spanning minutes or hours, and is the natural fit for microservices architectures where each service has its own database.', con: 'No atomicity guarantee — intermediate states are visible to other services. Requires compensating transactions for rollback, which are error-prone and must be idempotent. Only eventual consistency is guaranteed, not immediate consistency.' },
      { pro: 'TCC (Try-Confirm/Cancel) provides a practical compromise: resources are reserved in the Try phase, confirmed in Confirm, or released in Cancel. This avoids locks while maintaining a stronger consistency model than Sagas.', con: 'Requires the resource to implement three-phase semantics (try/confirm/cancel), which is not natively supported by most databases. Application logic for confirm and cancel phases is complex and must handle partial failures.' },
    ],
  },
};

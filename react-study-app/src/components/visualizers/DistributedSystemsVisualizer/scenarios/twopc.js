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
      { title: 'ELI5 — Kid-friendly analogy', content: '2PC is like a synchronized group dive. The diving coach (coordinator) asks everyone: "Ready to jump?" Each diver (participant) prepares at the edge. If all say yes, the coach blows the whistle — everyone jumps together. If even one says no, everyone steps back. But here\'s the problem: everyone is stuck holding their breath until the coach decides.' },
      { title: 'Core — How it works', content: '2PC has two phases. Phase 1 (Prepare): coordinator sends PREPARE to all participants. Each participant writes a prepare log entry, acquires locks, and votes YES or NO. Phase 2 (Commit/Abort): if all YES → coordinator sends COMMIT. Participants apply, release locks, and ack. Any NO → coordinator sends ABORT. Participants rollback and release locks.' },
    ],
    why: ['2PC guarantees atomic commit across distributed nodes — either all nodes commit or all abort. Essential for distributed databases (XA transactions), but its blocking nature makes it unsuitable for high-availability systems.'],
    interview: [
      { question: 'What is the blocking problem in 2PC?', answer: 'After a participant votes YES in Phase 1, it holds locks on resources and waits for the coordinator\'s decision. If the coordinator crashes, the participant is stuck — it cannot unilaterally commit (might violate atomicity) or abort (coordinator might have decided commit). It blocks indefinitely until the coordinator recovers. This is why 2PC is called a blocking protocol.', followUps: ['How does 3PC solve blocking?', 'What happens if a participant crashes?'] },
      { question: 'How does 2PC handle coordinator failure?', answer: 'If the coordinator crashes before sending PREPARE: participants are unaware, no state change. After PREPARE but before decision: participants block (hold locks) until coordinator recovery. The coordinator on recovery reads its log and re-sends the decision. If the decision log was not written: participants must infer abort via timeout (heuristic decision, risking inconsistency).', followUps: ['What is a heuristic decision in 2PC?', 'How do XA transactions implement coordinator recovery?'] },
    ],
    gotcha: ['2PC assumes all participants are available and responsive. A slow participant blocks everyone — the coordinator waits for all votes. Timeouts are necessary but risk premature abort (if coordinator times out a slow but correct participant).', 'The coordinator is a single point of failure. If the coordinator crashes after sending COMMIT to some participants but before others, some commit and some wait — partial commit, violating atomicity.'],
    tradeoffs: [
      { pro: '2PC — strong atomicity guarantee, industry standard (XA)', con: 'blocking protocol, coordinator SPOF, high latency (2 rounds)' },
      { pro: 'Saga — non-blocking, high availability, supports long-running txs', con: 'no atomicity, requires compensating transactions, eventual consistency' },
    ],
  },
};

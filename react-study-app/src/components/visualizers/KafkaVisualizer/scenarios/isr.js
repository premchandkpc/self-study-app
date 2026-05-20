function buildISRSteps() {
  const steps = [];
  const broker = (id, role, partitions = []) => ({ id, role, partitions, state: 'ok', lag: 0 });
  const snap = (s, narration) => steps.push({ ...JSON.parse(JSON.stringify(s)), narration, complexity: { ops: steps.length + 1, label: 'replication', space: 'O(RF)' } });

  const s = {
    brokers: [
      broker('B0', 'leader', ['T-0', 'T-1']),
      broker('B1', 'follower', ['T-0', 'T-2']),
      broker('B2', 'follower', ['T-1', 'T-2']),
    ],
    producers: [{ id: 'P1', state: 'idle', sending: null }],
    consumers: [{ id: 'C1', state: 'idle', offset: 0 }],
    isr: ['B0', 'B1', 'B2'],
    events: [],
    metrics: { qps: 0, lag: 0, throughput: 0 },
  };

  snap(s, 'Kafka with 3 brokers. B0 is partition leader. ISR=[B0,B1,B2]. RF=3.');

  s.producers[0].state = 'sending'; s.producers[0].sending = 'T-0';
  s.events.push({ type: 'ok', msg: 'P1 → B0: produce record (acks=all)' });
  snap(s, 'Producer sends with acks=all. Must wait for ALL ISR brokers to acknowledge.');

  s.brokers[0].lag = 1;
  s.events.push({ type: 'info', msg: 'B0 writes to log, replicates to B1, B2' });
  snap(s, 'Leader B0 appends to its log. Sends AppendEntries to ISR followers B1, B2.');

  s.brokers[1].lag = 0; s.brokers[2].lag = 0; s.brokers[0].lag = 0;
  s.producers[0].state = 'ack'; s.metrics.qps = 200; s.metrics.throughput = 1;
  s.events.push({ type: 'ok', msg: 'B1 + B2 ack. Commit. Producer receives ack.' });
  snap(s, 'Both followers ack. High watermark advances. Producer gets success. Durability guaranteed.');

  s.brokers[2].state = 'down'; s.isr = ['B0', 'B1'];
  s.events.push({ type: 'error', msg: 'B2 goes down! Removed from ISR. ISR=[B0,B1]' });
  snap(s, 'B2 crashes. ISR shrinks to [B0, B1]. With acks=all: still needs 2 acks. RF still safe.');

  s.brokers[0].state = 'down'; s.isr = ['B1'];
  s.events.push({ type: 'error', msg: 'B0 leader down! B1 elected new leader.' });
  snap(s, 'Leader B0 fails. B1 (highest HW) elected leader by controller. ISR=[B1]. min.insync.replicas check.');

  s.brokers[0].state = 'ok'; s.brokers[2].state = 'ok'; s.isr = ['B1', 'B0', 'B2'];
  s.brokers[1].role = 'leader'; s.brokers[0].role = 'follower';
  s.events.push({ type: 'ok', msg: 'B0, B2 rejoin ISR. Full replication restored.' });
  snap(s, 'B0 and B2 catch up. ISR restored. B1 remains leader until preferred leader election.');

  return steps;
}

export const KAFKA_CODE_ISR = [
  '// Producer with acks=all',
  'props.put("acks", "all");',
  'props.put("min.insync.replicas", "2");',
  '// Broker config (server.properties)',
  'default.replication.factor=3',
  'min.insync.replicas=2',
  '// ISR: In-Sync Replicas',
  '// lag.max.messages = 10',
  '// lag.time.max.ms = 10000',
];

export default {
  id: 'isr',
  label: 'ISR Replication',
  icon: '🔁',
  build: buildISRSteps,
  code: KAFKA_CODE_ISR,
  language: 'Java',
  metrics: [
    { key: 'qps',        label: 'QPS',       max: 500, unit: '/s', color: 'var(--kafka-producer)' },
    { key: 'lag',        label: 'Lag',       max: 20,  color: 'var(--kafka-consumer)' },
    { key: 'throughput', label: 'Replicated',max: 10,  color: 'var(--kafka-broker)' },
  ],
  topicContent: {
    concept: [
      { title: 'ELI5 — Kid-friendly analogy', content: 'ISR is like a school project team. The leader (B0) writes the report. Two helpers (B1, B2) make copies. Everyone must show they\'re keeping up. If B2 lags or leaves, the team shrinks. If the leader quits, the most up-to-date helper becomes the new leader. "acks=all" means the leader waits for all current helpers to confirm before saying "done."' },
      { title: 'Core — How it works', content: 'ISR (In-Sync Replicas) is the set of replicas that are fully caught up with the leader partition. A follower is in the ISR if its replica lag ≤ replica.lag.time.max.ms (default 10s, no longer message-count based). The leader only acknowledges writes when all ISR replicas have persisted (acks=all). If the leader fails, the controller picks the new leader from the ISR (guarantees zero data loss for committed messages). If min.insync.replicas is not satisfied, the leader stops accepting writes.' },
    ],
    why: ['Set `min.insync.replicas=2` to prevent the leader from accepting writes when only one replica is in sync. With RF=3 and min.insync=2, you can tolerate one broker failure and still have data durability.'],
    interview: [
      { question: 'What determines if a replica is in the ISR?', answer: 'A follower replica must fetch records from the leader and not fall behind beyond replica.lag.time.max.ms (default 10s). Previously Kafka used a message-count threshold (replica.lag.max.messages), but this was removed because it caused flapping under bursty traffic. Now only time-based lag is used.', followUps: ['What happens when a follower\'s lag exceeds the threshold?', 'How does the follower rejoin the ISR?'] },
      { question: 'What is the difference between acks=all and min.insync.replicas?', answer: 'acks=all is a producer config — the producer waits for all ISR replicas to acknowledge. min.insync.replicas is a topic/broker config — if the ISR shrinks below this number, the leader rejects writes. min.insync=2 + acks=all = strong durability guarantee, tolerating 1 broker failure.', followUps: ['What happens if ISR < min.insync?', 'Can producers bypass min.insync?'] },
    ],
    gotcha: ['With `min.insync.replicas=2` and only 2 brokers total, losing 1 broker means ISR drops to 1, which is below min.insync — the remaining broker stops accepting writes entirely. RF must be >= min.insync + 1.', 'Unclean leader election (unclean.leader.election.enable=true) allows an out-of-sync replica to become leader, causing data loss. Default is false in Kafka 3.x for a reason — never enable it without understanding the tradeoff.'],
    tradeoffs: [
      { pro: 'ISR + acks=all provides strong durability — no committed data loss on leader failure', con: 'acks=all increases latency — producer must wait for all ISR replicas to respond' },
      { pro: 'Time-based ISR reduces flapping compared to count-based ISR', con: 'Shrinking ISR reduces fault tolerance — with RF=3 and ISR=2 you can only lose 1 more broker' },
    ],
  },
};

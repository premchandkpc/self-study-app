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
};

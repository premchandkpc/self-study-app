export function buildKafkaSteps(producers = 2, partitions = 3, consumers = 2) {
  const steps = [];

  const makeState = () => ({
    producers: Array.from({ length: producers }, (_, i) => ({
      id: `P${i + 1}`, state: 'idle', sending: null,
    })),
    partitions: Array.from({ length: partitions }, (_, i) => ({
      id: `T-${i}`, leader: true, messages: [], lag: 0, offset: 0,
    })),
    consumers: Array.from({ length: consumers }, (_, i) => ({
      id: `C${i + 1}`, state: 'idle', assigned: [i % partitions], offset: 0,
    })),
    metrics: { qps: 0, lag: 0, throughput: 0 },
    narration: '',
    codeLine: null,
  });

  let s = makeState();

  function snap(narration, codeLine = null) {
    steps.push({
      ...JSON.parse(JSON.stringify(s)),
      narration,
      codeLine,
      complexity: { ops: steps.length + 1, label: 'O(1) produce', space: 'O(n)' },
    });
  }

  snap('Kafka cluster ready. Producers idle. Partitions empty.', 1);

  // producers send
  for (let p = 0; p < producers; p++) {
    const partIdx = p % partitions;
    s.producers[p].state = 'sending';
    s.producers[p].sending = `T-${partIdx}`;
    snap(`Producer P${p + 1} sends record to partition T-${partIdx}.`, 4);

    s.partitions[partIdx].messages.push({ id: s.partitions[partIdx].offset, from: `P${p + 1}` });
    s.partitions[partIdx].offset += 1;
    s.partitions[partIdx].lag += 1;
    s.metrics.qps += 120;
    s.producers[p].state = 'ack';
    snap(`Record appended to T-${partIdx} at offset ${s.partitions[partIdx].offset - 1}. ACK sent.`, 6);

    s.producers[p].state = 'idle';
    s.producers[p].sending = null;
  }

  snap('All producers sent. Partitions have unconsumed messages (lag > 0).', 8);

  // replication wave
  s.partitions.forEach((part) => {
    part.replicated = true;
  });
  snap('Leader partitions replicate to ISR followers. Replication wave propagates.', 10);

  // consumers poll
  for (let c = 0; c < consumers; c++) {
    s.consumers[c].state = 'polling';
    snap(`Consumer C${c + 1} polls assigned partitions: [${s.consumers[c].assigned.map((i) => `T-${i}`).join(', ')}].`, 13);

    for (const pIdx of s.consumers[c].assigned) {
      if (s.partitions[pIdx].messages.length > 0) {
        const msg = s.partitions[pIdx].messages.shift();
        s.consumers[c].offset += 1;
        s.partitions[pIdx].lag = Math.max(0, s.partitions[pIdx].lag - 1);
        s.metrics.lag = s.partitions.reduce((sum, p) => sum + p.lag, 0);
        s.metrics.throughput += 1;
        snap(`C${c + 1} consumed offset ${msg.id} from T-${pIdx}. Lag → ${s.partitions[pIdx].lag}.`, 15);
      }
    }
    s.consumers[c].state = 'commit';
    snap(`C${c + 1} commits offset to Kafka broker.`, 17);
    s.consumers[c].state = 'idle';
  }

  snap('All messages consumed. Lag = 0. Cluster healthy.', 20);

  // failure scenario — leader down
  s.partitions[0].leader = false;
  s.partitions[0].state = 'election';
  snap('⚠ Partition T-0 leader goes down! ISR starts leader election.', 23);

  s.partitions[0].leader = true;
  s.partitions[0].state = 'normal';
  snap('New leader elected for T-0. Replication resumes. Cluster recovered.', 25);

  return steps;
}

/* ── ISR Replication scenario ── */
export function buildISRSteps() {
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

/* ── Consumer Groups scenario ── */
export function buildConsumerGroupSteps() {
  const steps = [];
  const snap = (s, narration) => steps.push({ ...JSON.parse(JSON.stringify(s)), narration, complexity: { ops: steps.length + 1, label: 'rebalance', space: 'O(consumers)' } });

  const s = {
    producers: [{ id: 'P1', state: 'idle', sending: null }],
    partitions: [
      { id: 'T-0', leader: true, messages: [], lag: 5, offset: 5 },
      { id: 'T-1', leader: true, messages: [], lag: 3, offset: 3 },
      { id: 'T-2', leader: true, messages: [], lag: 2, offset: 2 },
    ],
    consumers: [
      { id: 'C1', state: 'polling', assigned: [0, 1], offset: 0 },
    ],
    events: [],
    metrics: { qps: 300, lag: 10, throughput: 0 },
  };

  snap(s, 'Consumer group "payments". 3 partitions, 1 consumer. C1 owns ALL partitions — bottleneck!');

  s.partitions.forEach((p) => { p.lag = Math.floor(p.lag * 1.5); });
  s.metrics.lag = 15;
  s.events.push({ type: 'warn', msg: 'Lag growing! Producer faster than consumer. Scaling out.' });
  snap(s, 'Lag growing to 15. Producer publishes 300 msg/s, C1 processes 200 msg/s. Need more consumers.');

  s.consumers.push({ id: 'C2', state: 'joining', assigned: [], offset: 0 });
  s.events.push({ type: 'info', msg: 'C2 joins group. Group coordinator triggers REBALANCE.' });
  snap(s, 'C2 joins consumer group. Group coordinator triggers rebalance. All consumers stop polling.');

  s.consumers[0].assigned = [0]; s.consumers[1].assigned = [1, 2];
  s.consumers[0].state = 'polling'; s.consumers[1].state = 'polling';
  s.events.push({ type: 'ok', msg: 'Rebalance done. C1→[T-0], C2→[T-1,T-2]' });
  snap(s, 'Rebalance complete. C1 owns T-0, C2 owns T-1 and T-2. Parallel consumption starts.');

  s.metrics.throughput = 5; s.metrics.lag = 8;
  s.events.push({ type: 'ok', msg: 'Lag dropping. Two consumers processing in parallel.' });
  snap(s, 'Throughput doubled. Lag reducing. Each consumer handles its own partitions independently.');

  s.consumers.push({ id: 'C3', state: 'joining', assigned: [], offset: 0 });
  snap(s, 'C3 joins. Another rebalance. With 3 consumers + 3 partitions: perfect 1:1 assignment.');

  s.consumers[0].assigned = [0]; s.consumers[1].assigned = [1]; s.consumers[2].assigned = [2];
  s.consumers[2].state = 'polling';
  s.metrics.lag = 0; s.metrics.throughput = 10;
  s.events.push({ type: 'ok', msg: 'Perfect 1:1 assignment. Maximum parallelism. Lag = 0!' });
  snap(s, '1 consumer per partition: maximum parallelism. Cannot scale beyond partitions count.');

  return steps;
}

const KAFKA_CODE_ISR = [
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

const KAFKA_CODE_CONSUMER_GROUPS = [
  '// Consumer group config',
  'props.put("group.id", "payments");',
  'props.put("auto.offset.reset", "earliest");',
  '// Rebalance listener',
  'consumer.subscribe(topics, new ConsumerRebalanceListener() {',
  '  void onPartitionsRevoked(partitions) {',
  '    commitCurrentOffsets();',
  '  }',
  '  void onPartitionsAssigned(partitions) {',
  '    seekToLastCommittedPositions();',
  '  }',
  '});',
];

export const KAFKA_CODE = [
  'KafkaProducer producer = new KafkaProducer<>(props);',
  '',
  '// Send record (async)',
  'ProducerRecord<K,V> rec = new ProducerRecord<>(topic, key, val);',
  'producer.send(rec, (meta, ex) -> {',
  '  if (ex == null) log.info("offset={}", meta.offset());',
  '  else handleError(ex);',
  '});',
  '',
  '// ISR replication',
  '// acks=all → wait for all ISR followers',
  '',
  '// Consumer poll loop',
  'while (true) {',
  '  ConsumerRecords<K,V> recs = consumer.poll(Duration.ofMs(100));',
  '  for (ConsumerRecord<K,V> r : recs) process(r);',
  '  consumer.commitSync();',
  '}',
  '',
  '// Failure: leader election',
  '// ZooKeeper / KRaft detects leader failure',
  '// ISR replica promoted to leader',
  '// Clients reconnect automatically',
];

export const SCENARIOS = [
  {
    id: 'produce-consume',
    label: 'Produce & Consume',
    icon: '🔄',
    build: () => buildKafkaSteps(2, 3, 2),
    code: KAFKA_CODE,
    language: 'Java',
    metrics: [
      { key: 'qps',        label: 'QPS',        max: 500,  unit: '/s', color: 'var(--kafka-producer)', warn: 60, critical: 85 },
      { key: 'lag',        label: 'Lag',        max: 20,   color: 'var(--kafka-consumer)', warn: 50, critical: 80 },
      { key: 'throughput', label: 'Throughput', max: 10,   unit: ' msg', color: 'var(--kafka-broker)' },
    ],
  },
  {
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
  },
  {
    id: 'consumer-groups',
    label: 'Consumer Groups',
    icon: '👥',
    build: buildConsumerGroupSteps,
    code: KAFKA_CODE_CONSUMER_GROUPS,
    language: 'Java',
    metrics: [
      { key: 'qps',        label: 'QPS',        max: 500,  unit: '/s', color: 'var(--kafka-producer)' },
      { key: 'lag',        label: 'Lag',        max: 20,   color: 'var(--kafka-consumer)', warn: 50, critical: 80 },
      { key: 'throughput', label: 'Throughput', max: 10,   color: 'var(--kafka-broker)' },
    ],
  },
];

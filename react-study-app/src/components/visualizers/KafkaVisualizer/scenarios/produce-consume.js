import { snap } from './shared';

function buildProduceConsumeSteps(producers = 2, partitions = 3, consumers = 2) {
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

  function snapLocal(narration, codeLine = null) {
    steps.push({
      ...JSON.parse(JSON.stringify(s)),
      narration,
      codeLine,
      complexity: { ops: steps.length + 1, label: 'O(1) produce', space: 'O(n)' },
    });
  }

  snapLocal('Kafka cluster ready. Producers idle. Partitions empty.', 1);

  // producers send
  for (let p = 0; p < producers; p++) {
    const partIdx = p % partitions;
    s.producers[p].state = 'sending';
    s.producers[p].sending = `T-${partIdx}`;
    snapLocal(`Producer P${p + 1} sends record to partition T-${partIdx}.`, 4);

    s.partitions[partIdx].messages.push({ id: s.partitions[partIdx].offset, from: `P${p + 1}` });
    s.partitions[partIdx].offset += 1;
    s.partitions[partIdx].lag += 1;
    s.metrics.qps += 120;
    s.producers[p].state = 'ack';
    snapLocal(`Record appended to T-${partIdx} at offset ${s.partitions[partIdx].offset - 1}. ACK sent.`, 6);

    s.producers[p].state = 'idle';
    s.producers[p].sending = null;
  }

  snapLocal('All producers sent. Partitions have unconsumed messages (lag > 0).', 8);

  // replication wave
  s.partitions.forEach((part) => {
    part.replicated = true;
  });
  snapLocal('Leader partitions replicate to ISR followers. Replication wave propagates.', 10);

  // consumers poll
  for (let c = 0; c < consumers; c++) {
    s.consumers[c].state = 'polling';
    snapLocal(`Consumer C${c + 1} polls assigned partitions: [${s.consumers[c].assigned.map((i) => `T-${i}`).join(', ')}].`, 13);

    for (const pIdx of s.consumers[c].assigned) {
      if (s.partitions[pIdx].messages.length > 0) {
        const msg = s.partitions[pIdx].messages.shift();
        s.consumers[c].offset += 1;
        s.partitions[pIdx].lag = Math.max(0, s.partitions[pIdx].lag - 1);
        s.metrics.lag = s.partitions.reduce((sum, p) => sum + p.lag, 0);
        s.metrics.throughput += 1;
        snapLocal(`C${c + 1} consumed offset ${msg.id} from T-${pIdx}. Lag → ${s.partitions[pIdx].lag}.`, 15);
      }
    }
    s.consumers[c].state = 'commit';
    snapLocal(`C${c + 1} commits offset to Kafka broker.`, 17);
    s.consumers[c].state = 'idle';
  }

  snapLocal('All messages consumed. Lag = 0. Cluster healthy.', 20);

  // failure scenario — leader down
  s.partitions[0].leader = false;
  s.partitions[0].state = 'election';
  snapLocal('⚠ Partition T-0 leader goes down! ISR starts leader election.', 23);

  s.partitions[0].leader = true;
  s.partitions[0].state = 'normal';
  snapLocal('New leader elected for T-0. Replication resumes. Cluster recovered.', 25);

  return steps;
}

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

export default {
  id: 'produce-consume',
  label: 'Produce & Consume',
  icon: '🔄',
  build: () => buildProduceConsumeSteps(2, 3, 2),
  code: KAFKA_CODE,
  language: 'Java',
  metrics: [
    { key: 'qps',        label: 'QPS',        max: 500,  unit: '/s', color: 'var(--kafka-producer)', warn: 60, critical: 85 },
    { key: 'lag',        label: 'Lag',        max: 20,   color: 'var(--kafka-consumer)', warn: 50, critical: 80 },
    { key: 'throughput', label: 'Throughput', max: 10,   unit: ' msg', color: 'var(--kafka-broker)' },
  ],
};

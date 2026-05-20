import { snap } from '@/core/utils/scenarioShared';

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
  topicContent: {
    concept: [
      { title: 'ELI5 — Kid-friendly analogy', content: 'Producers are like people writing letters. The topic is a mailbox, and partitions are slots in a post office sorting room. Consumers are mail carriers who pick up from specific slots. If a slot\'s carrier crashes, the post office elects a new one so mail keeps flowing.' },
      { title: 'Core — How it works', content: 'Producers publish records to a topic, specifying a key (determines partition via hash) or letting the partitioner round-robin. Records are appended to a partition log (sequential write). Consumers poll partitions and maintain an offset (position in the log). When a consumer commits an offset, it signals that messages up to that point are processed. Lag = producer offset - consumer committed offset for a partition.' },
    ],
    why: ['Monitor consumer lag with Burrow or Kafka Lag Exporter. High lag indicates consumers cannot keep up — add partitions or consumers to scale. Lag=0 means consumers are fully caught up.'],
    interview: [
      { question: 'What happens if a producer sends with acks=0?', answer: 'The producer fires and forgets — it does not wait for any broker acknowledgment. Highest throughput but data loss is possible if the broker crashes before persisting. Use acks=1 for at-least-once delivery.', followUps: ['What does acks=all guarantee?', 'How does idempotent production work?'] },
      { question: 'How does Kafka achieve high throughput for writes?', answer: 'Kafka uses sequential disk I/O (append-only logs), zero-copy (sendfile syscall for reads), batching (producers batch records into fewer network requests), and page cache (OS caches hot data). Sequential writes are faster than random writes on HDDs by an order of magnitude.', followUps: ['How does zero-copy work?', 'What is the batch.size config?'] },
    ],
    gotcha: ['A consumer that does not call `commitSync` or `commitAsync` will re-read the same messages on restart — auto-commit (enable.auto.commit=true) is best-effort and can skip messages on crash.', 'Topic partitions are immutable once created. Adding partitions later changes the partition assignment strategy and can break key-based ordering guarantees.'],
    tradeoffs: [
      { pro: 'Sequential writes give extremely high throughput (millions msg/s)', con: 'Each partition is a single log file — too many partitions increase file descriptor usage and recovery time' },
      { pro: 'Consumers can replay from any offset (reprocessing)', con: 'Old log segments consume disk space — retention policies or compaction are required' },
    ],
  },
};

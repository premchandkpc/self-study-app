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
      { title: 'What is Kafka produce-consume in simple terms?', content: 'Producers write messages to topics and consumers read them. Think of a topic as a filing cabinet and partitions as drawers in that cabinet. Each message is filed in a drawer in order. Consumers track which messages they have already read using a bookmark called an offset. Multiple consumers can read from different drawers simultaneously for parallel processing, making Kafka extremely fast at handling large message volumes.' },
      { title: 'How Kafka produce-consume works — core mechanics', content: 'Producers send records with a key that determines partition placement via consistent hashing (default) or round-robin if key is null. Records are appended sequentially to the partition log for maximum write throughput. Consumers poll partitions and track their position via offsets, committing them to mark messages as processed. Consumer lag is the difference between the latest producer offset and the consumer committed offset for a partition, indicating how far behind the consumer has fallen.' },
      { title: 'Deep — internals & architecture', content: 'Kafka achieves high throughput through sequential disk I/O (append-only logs that are faster than random I/O by an order of magnitude even on HDDs), zero-copy data transfer using the sendfile syscall (data moves from page cache to network socket without touching userspace), request batching (producers accumulate records into batches controlled by batch.size and linger.ms before sending), and OS page cache for hot data rather than managing its own cache. Each partition is an ordered immutable sequence of records stored in log segments on disk. The partition leader handles all reads and writes while followers replicate data for fault tolerance. This architecture enables millions of messages per second on commodity hardware.' },
    ],
    why: [
      'Monitor consumer lag continuously with Burrow or Kafka Lag Exporter — rising lag means consumers cannot keep pace with producers. Add partitions or scale consumers to handle throughput. Persistent lag in real-time systems causes message delivery delays that violate SLAs and create data freshness issues.',
      'Choose acks configuration based on your durability requirements: acks=all provides the strongest guarantee (no data loss on leader failure) but increases latency. acks=1 balances durability with performance for most use cases. acks=0 sacrifices durability for maximum throughput and should never be used for critical data.',
      'Plan partition counts based on peak future throughput, not current load. Partition count determines maximum parallelism — a topic with N partitions can have at most N consumers in a group. Adding partitions later changes key-to-partition mappings, breaking ordering guarantees for same-key messages.',
    ],
    interview: [
      { q: 'What exactly happens when a producer sends a record with acks=0, acks=1, or acks=all?', a: 'With acks=0 the producer fires and forgets — it sends the record over the network and immediately considers it successful without waiting for any broker acknowledgment. This gives the lowest latency (network round-trip is eliminated) but the highest risk of data loss: if the broker crashes before persisting, the record is lost and the producer never knows. With acks=1 the leader broker writes the record to its local log and responds immediately without waiting for any follower acknowledgment — this balances throughput with durability and is the default for most Kafka deployments. With acks=all the leader waits for acknowledgment from every replica in the ISR before responding to the producer — this provides the strongest durability guarantee but adds latency equal to the network round-trip to the slowest ISR follower. In practice acks=all takes 2-3x longer than acks=1 depending on replication factor and network latency.', followUps: ['Can a single topic have producers using different acks settings?', 'How does min.insync.replicas interact with acks=all?', 'What happens to a producer request when an ISR follower is slow to respond?'] },
      { q: 'How does Kafka achieve such high throughput — what specific techniques are involved?', a: 'Kafka uses four main techniques: sequential disk I/O (appending to the end of a log file is 6000x faster than random access on HDDs and completely avoids disk seek overhead), zero-copy data transfer (the sendfile syscall copies data directly from the OS page cache to the network socket without copying through userspace buffers, eliminating CPU and memory overhead), request batching (producers accumulate records into batches defined by batch.size up to 1MB and linger.ms up to a few milliseconds before sending a single larger network request, reducing per-message overhead from 100x), and OS page cache exploitation (Kafka reads and writes through the OS page cache rather than managing its own cache, leveraging the kernel\'s already-optimal I/O scheduling). These techniques combine to deliver millions of messages per second even on modest hardware.', followUps: ['How does the page cache improve read performance specifically?', 'What happens when a read request misses the page cache?', 'How does batch.size affect latency vs throughput tradeoffs?'] },
      { q: 'What happens to consumer offsets when a consumer crashes before committing — how does this affect message delivery semantics?', a: 'If a consumer crashes before committing its offset, the committed offset remains at the last successfully committed position. When the consumer restarts or a rebalance assigns the partition to another consumer, processing resumes from that committed offset, causing all messages between that offset and the crash point to be reprocessed. This is the at-least-once delivery guarantee — messages may be duplicated but never lost. With enable.auto.commit=true (default), offsets are committed automatically at each consumer.poll() call interval (auto.commit.interval.ms default 5000ms), which is best-effort: the offset may be committed before or after processing completes, depending on timing. This means auto-commit can either skip messages (if offset is committed before processing) or duplicate messages (if offset is committed after processing, which is more common). For reliable processing, disable auto-commit and manually call consumer.commitSync() after each batch or use consumer.commitAsync() with a callback for higher throughput with eventual consistency.', followUps: ['How does isolation.level=read_committed interact with offsets and exactly-once semantics?', 'What is the difference between commitSync and commitAsync in terms of consistency guarantees?', 'Can consumer offset data in __consumer_offsets become corrupted and how do you recover?'] },
    ],
    gotcha: [
      'Using acks=0 means the producer has zero confirmation the record was ever received. If the connection fails mid-send, the producer gets no error and the message is silently lost forever. Never use acks=0 for financial transactions, audit logs, or any system requiring data integrity guarantees.',
      'Auto-commit (enable.auto.commit=true) commits offsets at poll intervals, not upon message processing completion. If your consumer crashes after the auto-commit occurs but before processing a batch of records, those records are permanently skipped. Always disable auto-commit and use commitSync or commitAsync after actual processing for reliable at-least-once delivery.',
      'Partition count is immutable once a topic is created — adding partitions later changes the hash-to-partition mapping for existing keys, breaking message ordering guarantees for same-key messages. You cannot reduce partition count. Plan partition counts based on projected peak throughput, not current volume.',
      'A consumer that does not call poll() within max.poll.interval.ms (default 5 minutes) is considered dead by the group coordinator and forcefully removed from the group, triggering a rebalance. Long-running individual message processing must be handled by reducing max.poll.records and committing offsets incrementally rather than increasing the interval.',
    ],
    tradeoffs: [
      { pro: 'Sequential append-only writes leverage the OS page cache and avoid random disk seeks, delivering millions of messages per second even on spinning HDDs. This makes Kafka suitable for high-throughput data pipelines handling terabytes per day.', con: 'Each partition is a single log file on disk — too many partitions increase file descriptor usage, slow leader recovery time, and increase ZooKeeper or KRaft controller coordination overhead. Practical maximum is a few thousand partitions per broker.' },
      { pro: 'Consumers can replay from any historical offset, enabling data backfill, bug recovery, and reprocessing of failed records without re-ingesting from source systems. This makes Kafka ideal for event sourcing and audit log use cases.', con: 'Old log segments consume disk space until retention limits are reached (time-based or size-based). Without proper retention policies disks fill up and brokers crash. Log compaction similarly requires significant CPU for periodic compaction of tombstoned records.' },
      { pro: 'Offset-based consumer tracking completely decouples producers from consumers — producers write at their own pace without blocking and consumers read at theirs, providing natural buffering against traffic spikes and backpressure.', con: 'Offset management adds operational complexity. Consumer rebalances are stop-the-world events that pause consumption. Corrupted offsets in the internal __consumer_offsets topic require manual CLI intervention to reset consumer group positions to valid offsets.' },
    ],
  },
};

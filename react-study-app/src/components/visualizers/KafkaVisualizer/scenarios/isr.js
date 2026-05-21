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
      { title: 'What is ISR Replication in simple terms?', content: 'ISR stands for In-Sync Replicas — the set of broker replicas that are fully caught up with the partition leader. Think of it as a team copying a document as it is written. The leader writes new content, and followers must keep their copy identical within a time limit. If a follower falls behind or crashes, it is removed from the ISR. Producers with acks=all wait for all ISR members to confirm before considering a write successful.' },
      { title: 'How ISR works — core mechanics', content: 'Each partition has one leader and multiple follower replicas. Followers continuously fetch new records from the leader (replicating via FetchRequest). A follower stays in the ISR as long as its lag does not exceed replica.lag.time.max.ms (default 10s). The leader advances the high watermark only after all ISR replicas have acknowledged a record. The high watermark represents the last committed offset — only records up to the HW are visible to consumers. If the leader fails, the controller elects a new leader from the ISR, guaranteeing no committed data loss.' },
      { title: 'Deep — internals & architecture', content: 'ISR management is central to Kafka\'s durability model. Followers send FetchRequests to the leader with their current offset. The leader tracks each follower\'s offset and compares it to the leader\'s end offset. If a follower\'s lag exceeds replica.lag.time.max.ms (10s by default), the leader shrinks the ISR by removing that follower via an AlterIsr request to the controller. When a removed follower catches up (its offset reaches the leader\'s log end offset), the leader adds it back. The high watermark is the minimum offset that all ISR replicas have acknowledged — this is the durability cutoff. Consumers can only read up to the high watermark, ensuring they never see uncommitted (potentially lost) data. When the leader fails, the controller selects the new leader as the replica in the ISR with the highest (latest) offset, guaranteeing zero data loss for all committed (HW-acknowledged) messages.' },
    ],
    why: [
      'Set `replication.factor=3` and `min.insync.replicas=2` for production topics. This configuration tolerates one broker failure while maintaining write availability and durability. With RF=3 you can lose any single broker and the ISR will still have 2 replicas meeting the min.insync threshold.',
      'Monitor ISR size per partition as a key health metric. A shrinking ISR indicates broker issues (disk pressure, network problems, GC pauses). If ISR size drops to 1 on a topic with min.insync=2, the leader stops accepting writes entirely — this is a production incident.',
      'Keep replica.lag.time.max.ms at the default 10s for most workloads. Increasing it tolerates transient spikes but extends the window of potential data loss on leader failure. Decreasing it causes flapping as followers are ejected and rejoin too frequently.',
    ],
    interview: [
      { q: 'What determines whether a follower replica stays in the ISR?', a: 'A follower replica remains in the ISR as long as the difference between the leader\'s log end offset and the follower\'s current offset (replica lag) is caught up within replica.lag.time.max.ms (default 10 seconds). This is purely a time-based threshold — Kafka 0.9 and earlier used a message-count threshold (replica.lag.max.messages) but this was removed because it caused ISR flapping under bursty traffic where a briefly slow follower was ejected and immediately rejoined. When a follower\'s lag exceeds the threshold, the leader sends an AlterIsr request to the controller to shrink the ISR. The ejected follower continues replicating — when it catches up to the leader\'s end offset, the leader adds it back to the ISR via another AlterIsr. This catch-up and rejoin process happens automatically without manual intervention.', followUps: ['How does the controller process AlterIsr requests?', 'What happens to in-flight FetchRequests when a follower is removed from ISR?', 'Can a follower rejoin the ISR with data that conflicts with the leader?'] },
      { q: 'What is the relationship between acks=all, min.insync.replicas, and the high watermark?', a: 'acks=all is a producer configuration that tells the broker to acknowledge the write only after all replicas currently in the ISR have persisted the record. min.insync.replicas is a topic or broker-level configuration that sets a minimum number of ISR replicas required for the leader to accept writes at all — if ISR size falls below min.insync, the leader rejects all produce requests with NOT_ENOUGH_REPLICAS exception. The high watermark is the offset that all ISR replicas have acknowledged — it advances only when the slowest ISR follower confirms persistence. Producers with acks=all receive acknowledgment only when the record reaches the high watermark. For example with RF=3, min.insync=2, and ISR=[B0, B1, B2]: if B2 is slow, the leader acknowledges writes once B0 and B1 confirm (ISR=3, min.insync satisfied). If B2 then drops from ISR, writes still succeed because ISR=[B0,B1] meets min.insync=2. If another follower drops making ISR=[B0] only, the leader stops accepting writes entirely.', followUps: ['Can a producer with acks=1 bypass the high watermark?', 'What happens to consumers when the high watermark stops advancing?', 'How does unclean leader election differ from committed data loss?'] },
      { q: 'What happens during a leader election when the ISR varies — specifically the difference between clean and unclean elections?', a: 'In a clean election, the controller selects the new leader from the current ISR — specifically the replica with the highest (most up-to-date) offset in the ISR. This guarantees zero data loss for all committed (high watermark acknowledged) messages because every ISR replica has acknowledged all committed offsets. Unclean leader election (unclean.leader.election.enable=true) allows the controller to select a leader from replicas outside the ISR — including replicas that may be missing committed messages. This restores availability (the partition can accept writes again) at the cost of potential data loss (messages committed before the failure may vanish). Unclean election is disabled by default in Kafka 3.x because the data loss tradeoff is unacceptable for most use cases. The only scenario where unclean election is considered is when availability is absolutely critical and data loss is acceptable — for example, a monitoring or metrics pipeline where losing a few recent data points is better than complete system blackout.', followUps: ['How does the controller detect leader failure and initiate election?', 'What is preferred leader election and how does it differ?', 'Can you manually trigger a leader election for a specific partition?'] },
    ],
    gotcha: [
      'With min.insync.replicas=2 and a total of 2 brokers, losing 1 broker drops ISR to 1, which is below min.insync — the remaining broker stops accepting all writes to the partition. This means a single failure causes complete write unavailability. Always set RF >= min.insync + 1 to tolerate at least one broker failure.',
      'Unclean leader election (unclean.leader.election.enable=true) can silently lose committed data. When enabled, a replica that was never in the ISR can become leader and may be missing messages that were already acknowledged to producers. Default is false in Kafka 3.x — never enable it without fully understanding the data loss implications.',
      'ISR shrinks do not automatically restore when the failed broker recovers. The rejoining broker must catch up its offset to the leader\'s log end offset before being readmitted to the ISR. On heavily loaded topics with gigabytes of data, this catch-up can take minutes to hours depending on network bandwidth and disk I/O.',
      'The high watermark can temporarily stall during ISR changes. If one ISR follower pauses replication (GC pause, network issue), the high watermark stops advancing because it requires acknowledgment from all ISR members. This delays consumer reads and producer acknowledgments until the follower resumes or is ejected from ISR after replica.lag.time.max.ms.',
    ],
    tradeoffs: [
      { pro: 'ISR-based replication with acks=all provides the strongest durability guarantee in Kafka — no committed message is ever lost on leader failure because only in-sync replicas with matching offsets can become leaders.', con: 'acks=all increases producer latency significantly because the producer must wait for acknowledgment from every ISR follower. With 3 replicas and cross-datacenter replication, latency easily reaches 10-50ms per write.' },
      { pro: 'Time-based ISR threshold (replica.lag.time.max.ms) prevents flapping under bursty traffic patterns — a momentary slowdown does not eject a follower, unlike the previous count-based threshold that caused frequent ISR oscillations.', con: 'A shrinking ISR directly reduces fault tolerance. With RF=3 and ISR drops to 2, you can only tolerate one more broker failure. A further failure to ISR=1 combined with min.insync=2 causes complete write unavailability for that partition.' },
      { pro: 'The high watermark mechanism ensures read consistency — consumers never view uncommitted data that could be lost in a leader failure, providing strong consistency guarantees for consumer reads.', con: 'The high watermark dependency on the slowest ISR replica creates head-of-line blocking: one slow follower stalls all consumer progress and producer acknowledgments for that partition, potentially causing backpressure across the entire cluster.' },
    ],
  },
};

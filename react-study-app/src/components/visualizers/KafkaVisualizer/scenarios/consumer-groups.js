function buildConsumerGroupSteps() {
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

export const KAFKA_CODE_CONSUMER_GROUPS = [
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

export default {
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
  topicContent: {
    concept: [
      { title: 'ELI5 — Kid-friendly analogy', content: 'A consumer group is like a team sorting packages. Each partition is a conveyor belt. With 1 worker (C1), they handle all belts alone — slow. Adding more workers (C2, C3) splits the belts between them. Best case: one belt per worker. Adding more workers than belts is useless — someone stands idle.' },
      { title: 'Core — How it works', content: 'A consumer group has a unique `group.id`. Partitions are evenly distributed across consumers in the group using a partition assignment strategy (range, round-robin, sticky, cooperative sticky). When a consumer joins/leaves, the group coordinator triggers a rebalance: all consumers stop, revoke partitions, and the new assignment is computed. During rebalance, no messages are consumed (stop-the-world). Eager rebalance revokes all partitions first; cooperative rebalance (incremental) reassigns a subset.' },
    ],
    why: ['Use cooperative rebalance (assignor) to minimize the "stop-the-world" window in large consumer groups. An eager rebalance of 100 consumers with high-traffic topics can cause minutes of downtime on each deployment.'],
    interview: [
      { question: 'What happens during a rebalance?', answer: 'A consumer joins or leaves the group. The group coordinator signals a rebalance. All consumers call onPartitionsRevoked (giving a chance to commit offsets), then the group coordinator uses the partition assignor to redistribute partitions. Consumers then call onPartitionsAssigned. During this window, no messages are processed for those partitions.', followUps: ['What is CooperativeStickyAssignor?', 'How does static group membership help?'] },
      { question: 'What is the max number of consumers in a group?', answer: 'The practical max is the number of partitions. If there are 10 partitions and 12 consumers, 2 consumers sit idle. The partition.stragy.range assignor handles this by assigning 0 partitions to extra consumers. The `max.poll.interval.ms` config kicks idle consumers out of the group.', followUps: ['What happens to idle consumers?', 'How do you handle partitions > consumers?'] },
    ],
    gotcha: ['If a consumer\'s `max.poll.interval.ms` is exceeded (processing takes too long), the coordinator forcefully removes it from the group, triggering a rebalance. Use `max.poll.records` to cap batch size.', 'Topic partitions > consumers means some consumers handle more partitions than others. Create enough partitions upfront — adding partitions post-deployment changes partition distribution.'],
    tradeoffs: [
      { pro: 'Linear scaling: add consumers to increase throughput up to partition count', con: 'Rebalances are stop-the-world events — large groups suffer from long rebalance times' },
      { pro: 'Cooperative rebalance minimizes disruption via incremental partition changes', con: 'Cooperative rebalance is more complex to implement in custom assignors' },
    ],
  },
};

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
      { title: 'What are Consumer Groups in simple terms?', content: 'A consumer group is a team of consumers that work together to read messages from a topic. Each partition is assigned to exactly one consumer in the group. Adding more consumers splits the partitions between them, increasing throughput. The best case is one consumer per partition — adding more consumers than partitions is wasteful because the extra consumers sit idle with no partitions to read.' },
      { title: 'How Consumer Groups work — core mechanics', content: 'Each consumer group is identified by a unique `group.id`. Partitions are distributed using a partition assignment strategy (range, round-robin, sticky, or cooperative sticky). When a consumer joins or leaves the group, the group coordinator broker triggers a rebalance: all consumers in the group stop processing, revoke their partitions via onPartitionsRevoked, the coordinator computes a new assignment, and consumers receive new partitions via onPartitionsAssigned. During rebalance, partitions are paused and no messages are consumed.' },
      { title: 'Deep — internals & architecture', content: 'The group coordinator is a designated broker responsible for managing consumer group metadata and rebalances. Consumers send heartbeats to the coordinator at heartbeat.interval.ms (default 3s) to signal liveness. If a consumer fails to heartbeat within session.timeout.ms (default 45s), the coordinator marks it dead and triggers rebalance. The rebalance protocol uses a generation ID — each rebalance increments the generation, and consumers with stale generation IDs have their requests rejected. Kafka supports two rebalance protocols: eager (all partitions revoked before reassignment, causing full stop-the-world) and cooperative incremental (partitions are revoked and assigned in phases, minimizing disruption). The default assignor is CooperativeStickyAssignor which aims for balanced assignment with minimal partition movement across rebalances.' },
    ],
    why: [
      'Use the CooperativeStickyAssignor for production consumer groups to minimize the stop-the-world window during deployments and scale events. Eager rebalance of 100+ consumers with high-traffic topics can cause minutes of processing downtime on every consumer restart or deployment.',
      'Monitor rebalance frequency and duration — excessive rebalances indicate unstable consumers or heartbeat misconfiguration. Each rebalance resets consumer state and pauses processing, increasing end-to-end latency and causing downstream systems to experience data delays.',
      'Set max.poll.records appropriately for your processing workload. If processing single records takes seconds, reduce max.poll.records to stay within max.poll.interval.ms (default 5 min). Batch processing more records trades higher throughput for increased risk of session timeout.',
    ],
    interview: [
      { q: 'What exactly happens during a consumer group rebalance — step by step?', a: 'First, a consumer joins (group membership change) or is detected as failed (heartbeat timeout). The group coordinator broker marks the group as stabilizing and signals all consumers to stop processing by sending a JoinGroup request. Each consumer calls its onPartitionsRevoked callback (where you should commit pending offsets), then responds to the coordinator with its subscribed topics and metadata. The coordinator selects the group leader (first consumer to join) which runs the partition assignor to compute the new distribution. The assignment is sent back to all consumers in a SyncGroup response, and each consumer calls its onPartitionsAssigned callback to begin processing from the last committed offsets. During this entire sequence (typically 5-30 seconds depending on group size), no messages are consumed from any partition in the group — this is the stop-the-world nature of rebalances.', followUps: ['What is CooperativeStickyAssignor and how does it differ from eager rebalance?', 'How does static group membership (group.instance.id) reduce rebalances?', 'What happens to uncommitted offsets during a rebalance?'] },
      { q: 'What determines the maximum number of consumers that can be useful in a single consumer group?', a: 'The practical maximum is the number of partitions in the subscribed topic(s). If a topic has 10 partitions and you start 12 consumers in the same group, 10 consumers each get one partition and 2 consumers receive zero partitions — they sit idle, continuously polling with empty responses. The partition assignment strategy (range, round-robin, sticky) determines how extra partitions are distributed when consumers outnumber partitions. A consumer with zero partitions still participates in rebalances and must maintain its heartbeat, consuming resources without doing work. If an idle consumer fails to call poll() within max.poll.interval.ms, it is removed from the group, triggering a wasteful rebalance. Therefore you should never run more consumers than partitions — scale consumers up to match partition count, then scale partitions to increase throughput capacity.', followUps: ['How does the Range assignor handle uneven partition distribution?', 'What happens to topics with different partition counts in the same consumer group?', 'Can you dynamically add partitions to a topic without causing issues?'] },
      { q: 'How do consumer heartbeats and session timeouts work to detect failures?', a: 'Consumers send heartbeat requests to the group coordinator at heartbeat.interval.ms (default 3000ms). If the coordinator does not receive a heartbeat within session.timeout.ms (default 45000ms), it considers the consumer dead and removes it from the group, triggering a rebalance. Additionally, consumers must call consumer.poll() at least once within max.poll.interval.ms (default 300000ms or 5 minutes) — this is a separate timeout from the session timeout. The poll timeout prevents a consumer from processing a single message for too long without the coordinator knowing. If a consumer exceeds max.poll.interval.ms, the coordinator forces it to leave the group even if heartbeats are being sent. To avoid this, adjust max.poll.records to control batch size so that processing time for one poll batch stays well below max.poll.interval.ms. For workloads with variable processing time, use background processing with manual offset commits and keep poll() calls frequent.', followUps: ['What is the difference between session.timeout.ms and max.poll.interval.ms?', 'How does the rebalance timeout (rebalance.timeout.ms) relate to these timeouts?', 'Can you disable heartbeats and use manual partition assignment instead?'] },
    ],
    gotcha: [
      'If a consumer exceeds max.poll.interval.ms (default 5 minutes) because message processing takes too long, the coordinator forcefully removes it from the group and triggers a rebalance — even if heartbeats are still being sent. Always cap max.poll.records to ensure poll-to-poll processing stays within the interval.',
      'Running more consumers than partitions means some consumers are permanently idle but still consume resources: they poll with empty responses, maintain heartbeats, and participate in every rebalance. This wastes memory, network, and CPU while adding unnecessary rebalance overhead.',
      'During a rebalance, partition ownership is revoked before new assignments are made — this means there is a window where no consumer owns a partition. If the rebalance fails or is slow, messages arrive at partitions with no consumer, increasing lag and delaying processing.',
      'Consumer group metadata (including committed offsets) is stored in the internal __consumer_offsets topic with a default replication factor of 3. If all replicas of this internal topic are lost, all consumer group state is lost and consumers need to be manually reset to earliest or latest offsets.',
    ],
    tradeoffs: [
      { pro: 'Consumer groups provide linear horizontal scaling — adding consumers to a group increases aggregate throughput linearly up to the partition count, making Kafka scalable for growing workloads without reconfiguration.', con: 'Rebalances are stop-the-world events that pause all consumption for the group. In large groups of 100+ consumers, eager rebalances can cause minutes of downtime, making deployments disruptive for latency-sensitive systems.' },
      { pro: 'CooperativeStickyAssignor (default since Kafka 3.x) minimizes partition movement across rebalances, reducing the number of partitions that change owners and therefore reducing the reprocessing and disruption compared to eager rebalances.', con: 'Cooperative rebalance is more complex to implement correctly in custom assignors — the phased revocation and assignment requires careful offset tracking to avoid data loss or duplication during partial reassignments.' },
      { pro: 'Consumer groups abstract partition management away from application code — consumers subscribe to a topic and let the group coordinator handle partition distribution, rebalancing, and offset tracking automatically.', con: 'Automatic partition assignment provides limited control over data locality — you cannot guarantee that a specific consumer always gets a specific partition unless you use manual partition assignment, which bypasses consumer group benefits entirely.' },
    ],
  },
};

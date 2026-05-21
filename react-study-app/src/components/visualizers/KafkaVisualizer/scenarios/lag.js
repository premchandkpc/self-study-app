import { snap } from '@/core/utils/scenarioShared';

function buildLagSteps() {
  const steps = [];

  const s = {
    partition: 0,
    topic: 'orders',
    leader: { brokerIds: [0, 1, 2], isr: [0, 1, 2] },
    messages: [],
    offsets: { logEnd: 0, committed: 0, current: 0 },
    consumers: [
      { id: 'consumer-1', groupId: 'order-processors', lag: 0, committed: 0, position: 0, state: 'idle' },
    ],
    metrics: { logEnd: 0, lag: 0, processingTime: 0, throughput: 0 },
    events: [],
    vars: { topic: 'orders', partition: 0, logEnd: 0, consumerPosition: 0, lag: 0 },
  };

  snap(steps, s, 'Kafka Consumer Lag Monitoring. Topic: orders, Partition: 0. LogEndOffset = 0 (empty). Consumer group: order-processors.', 1, 'Initialize');

  // === PRODUCE MESSAGES ===
  s.events.push({ type: 'info', msg: 'Producer sends 10 messages to topic' });
  for (let i = 0; i < 10; i++) {
    s.messages.push({ offset: i, key: `order-${i+1}`, value: { amount: (i+1)*100, status: 'pending' }, timestamp: Date.now() });
    s.offsets.logEnd = i + 1;
    s.metrics.logEnd = s.offsets.logEnd;
  }
  s.vars = { topic: 'orders', partition: 0, logEnd: 10, consumerPosition: 0, lag: 10 };
  snap(steps, s, 'Producer: 10 messages written. LogEndOffset = 10. Partition has messages at offsets [0..9].', 2, 'O(1) produce');

  // === CONSUMER STARTS ===
  s.consumers[0].state = 'consuming';
  s.events.push({ type: 'info', msg: 'Consumer group "order-processors" starts consuming from partition 0' });
  snap(steps, s, 'Consumer starts from offset 0. It will process messages in order. Current position: 0, LogEndOffset: 10, LAG: 10.', 3, 'Consumer fetch');

  // === CONSUMER PROCESSES MESSAGES SLOWLY ===
  for (let i = 0; i < 5; i++) {
    s.consumers[0].position = i + 1;
    s.offsets.current = i + 1;
    s.metrics.lag = s.offsets.logEnd - s.consumers[0].position;
    s.vars = { topic: 'orders', partition: 0, logEnd: 10, consumerPosition: i+1, lag: s.metrics.lag };
    s.events.push({ type: 'info', msg: `Consumer processes order-${i+1} (offset ${i})` });
    snap(steps, s, `Consumer processes message at offset ${i} (order-${i+1}). Processing time: 200ms each. Position: ${i+1}, LAG: ${s.metrics.lag} messages behind.`, 4 + i, 'O(1) consume');
  }

  snap(steps, s, 'After 5 messages: Consumer position = 5, LogEndOffset = 10. LAG = 5. Consumer is 1 second behind real-time.', 9, 'Lag = 5');

  // === PRODUCER CONTINUES (REAL-TIME TRAFFIC) ===
  s.events.push({ type: 'warn', msg: 'Producer continues sending messages at high rate (2 msg/sec)' });
  s.metrics.logEnd = 25;
  s.offsets.logEnd = 25;
  s.messages = [];
  for (let i = 0; i < 25; i++) {
    s.messages.push({ offset: i, key: `order-${i+1}`, value: { amount: (i+1)*100 }, timestamp: Date.now() });
  }
  s.metrics.lag = s.offsets.logEnd - s.consumers[0].position;
  s.vars = { topic: 'orders', partition: 0, logEnd: 25, consumerPosition: 5, lag: s.metrics.lag };
  snap(steps, s, 'Producer accelerates! LogEndOffset jumps to 25 in 5 seconds. Consumer still at position 5. LAG EXPLODES to 20 messages!', 10, 'High lag alert!');

  // === LAG MONITORING ALERT ===
  s.events.push({ type: 'error', msg: 'LAG ALERT: Lag > 10. Consumer group falling behind!' });
  snap(steps, s, 'Monitoring system alerts: Consumer lag = 20 messages. At this rate, it will take 40 seconds to catch up. Investigate slow consumer!', 11, 'Monitor alert');

  // === COMMITTED OFFSETS ===
  s.consumers[0].committed = 5;
  s.offsets.committed = 5;
  s.events.push({ type: 'info', msg: 'Consumer commits offset 5 to broker (every 30 sec)' });
  snap(steps, s, 'Consumer commits offset 5 to broker. If it crashes, restart from offset 5 (reprocess 0-4). Committed lag: 20. Current lag: 20.', 12, 'Commit offset');

  // === CONSUMER SPEEDS UP ===
  s.consumers[0].state = 'consuming-fast';
  s.events.push({ type: 'success', msg: 'Consumer processing optimized: batching + caching enabled' });
  snap(steps, s, 'Consumer optimization deployed: batch processing 5 messages/sec instead of 1. Will catch up in 4 seconds.', 13, 'Optimization');

  for (let i = 5; i < 25; i += 5) {
    s.consumers[0].position = i + 5;
    s.offsets.current = i + 5;
    s.metrics.lag = s.offsets.logEnd - s.consumers[0].position;
    s.vars = { topic: 'orders', partition: 0, logEnd: 25, consumerPosition: i+5, lag: s.metrics.lag };
    snap(steps, s, `Consumer catches up! Position: ${i+5}, LAG: ${s.metrics.lag}. Processing at 5 msg/sec now.`, 14 + (i/5), 'Catching up');
  }

  snap(steps, s, 'Consumer caught up! Position = 25 = LogEndOffset. LAG = 0. All messages processed. Consumer is back to real-time.', 18, 'Lag = 0');

  // === END STATE: MONITORING DASHBOARD ===
  s.consumers[0].state = 'healthy';
  s.metrics = {
    logEnd: 25,
    lag: 0,
    maxLagSeenDuring: 20,
    timeToRecover: 4000,
    throughput: 5,
    avgProcessingTime: 200,
  };
  s.vars = { topic: 'orders', partition: 0, logEnd: 25, consumerPosition: 25, lag: 0 };
  s.events.push({ type: 'success', msg: 'Consumer back to healthy state. Lag monitoring normal.' });
  snap(steps, s, 'End State: Consumer LAG = 0 (real-time). Max lag reached: 20 messages. Recovery time: 4 seconds. Throughput: 5 msg/sec.', 19, 'Summary');

  return steps;
}

export const LAG_CODE = [
  '# Kafka Consumer Lag Monitoring (Python)',
  '',
  'from kafka import KafkaConsumer',
  'from kafka.admin import KafkaAdminClient, ConfigResource, ConfigResourceType',
  '',
  'consumer = KafkaConsumer("orders", group_id="order-processors")',
  'admin = KafkaAdminClient(bootstrap_servers=["localhost:9092"])',
  '',
  'def get_lag(topic, group_id, partition):',
  '    # LogEndOffset = latest offset in partition',
  '    log_end = consumer.highwater(TopicPartition(topic, partition))',
  '    ',
  '    # ConsumerPosition = where this group has read up to',
  '    committed = consumer.committed(TopicPartition(topic, partition))',
  '    ',
  '    # LAG = LogEnd - Committed',
  '    lag = log_end - committed',
  '    return {"log_end": log_end, "committed": committed, "lag": lag}',
  '',
  '# Monitor lag continuously',
  'while True:',
  '    lag_info = get_lag("orders", "order-processors", 0)',
  '    if lag_info["lag"] > 10000:  # Alert if lag > 10k msgs',
  '        alert(f"High lag: {lag_info[\'lag\']} messages behind")',
  '    time.sleep(5)',
];

export default {
  id: 'lag',
  label: 'Consumer Lag',
  icon: '⏱️',
  build: buildLagSteps,
  code: LAG_CODE,
  language: 'python',
  metrics: [
    { key: 'logEnd', label: 'LogEndOffset', max: 30, color: 'var(--kafka-leader)', warn: 20, critical: 25 },
    { key: 'lag', label: 'Consumer Lag', max: 30, color: 'var(--node-error)', warn: 10, critical: 20 },
    { key: 'processingTime', label: 'Avg Processing (ms)', max: 500, color: 'var(--node-comparing)' },
    { key: 'throughput', label: 'Throughput (msg/sec)', max: 10, color: 'var(--kafka-producer)' },
  ],
};

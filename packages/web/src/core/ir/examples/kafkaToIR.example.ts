// Example: Kafka Content → Generic IR → Universal Renderer
// Shows decoupling of technology from visualization

import { ContentCompiler, TechnologyContent } from '../contentCompiler';

// BEFORE: Technology-specific content
const kafkaSpecificContent: TechnologyContent = {
  id: 'kafka-pub-sub',
  title: 'Kafka Pub/Sub Pattern',
  technology: 'kafka',
  domain: 'distributed-systems',
  concept: 'pub-sub',
  difficulty: 3,
  structure: {
    steps: [
      {
        title: 'Producer publishes message',
        description: 'A producer sends a message to a topic',
        nodes: [
          { id: 'producer', name: 'Producer', type: 'queue', label: 'Producer' },
          { id: 'topic', name: 'Topic', type: 'queue', label: 'Topic: events' },
        ],
        edges: [{ from: 'producer', to: 'topic', label: 'publish' }],
        animate: [{ id: 'producer', action: 'highlight', duration: 500 }],
      },
      {
        title: 'Message partitioned',
        description: 'Message goes to a partition based on key',
        nodes: [
          { id: 'topic', name: 'Topic', type: 'queue', label: 'Topic' },
          { id: 'partition0', name: 'Partition 0', type: 'queue', label: 'Partition 0' },
          { id: 'partition1', name: 'Partition 1', type: 'queue', label: 'Partition 1' },
        ],
        edges: [
          { from: 'topic', to: 'partition0', label: 'route' },
          { from: 'topic', to: 'partition1', label: 'route' },
        ],
      },
      {
        title: 'Consumers subscribe',
        description: 'Consumer groups pull from partitions',
        nodes: [
          { id: 'partition0', name: 'Partition 0', type: 'queue', label: 'Partition 0' },
          { id: 'consumer1', name: 'Consumer 1', type: 'queue', label: 'Consumer 1' },
          { id: 'consumer2', name: 'Consumer 2', type: 'queue', label: 'Consumer 2' },
        ],
        edges: [
          { from: 'partition0', to: 'consumer1', label: 'pull' },
          { from: 'partition0', to: 'consumer2', label: 'pull' },
        ],
      },
    ],
  },
};

// Compile it
const compiler = new ContentCompiler();
const irUnit = compiler.compile(kafkaSpecificContent);

// RESULT: Technology-agnostic IR
// Now renderer doesn't know this is Kafka!
// Same IR structure works for:
// - Redis Pub/Sub
// - RabbitMQ
// - AWS SNS
// - Google Pub/Sub
// - Custom systems

export const kafkaIRExample = irUnit;

// Proof: Same renderer works for Redis
const redisContent: TechnologyContent = {
  id: 'redis-pubsub',
  title: 'Redis Pub/Sub Pattern',
  technology: 'redis',
  domain: 'data-structures',
  concept: 'pub-sub',
  difficulty: 2,
  structure: {
    steps: [
      {
        title: 'Publisher sends message',
        nodes: [
          { id: 'publisher', name: 'Publisher', type: 'queue', label: 'PUBLISH client' },
          { id: 'channel', name: 'Channel', type: 'queue', label: 'Channel: news' },
        ],
        edges: [{ from: 'publisher', to: 'channel' }],
      },
      {
        title: 'Subscribers receive',
        nodes: [
          { id: 'channel', name: 'Channel', type: 'queue', label: 'Channel' },
          { id: 'sub1', name: 'Subscriber 1', type: 'queue', label: 'Subscriber 1' },
          { id: 'sub2', name: 'Subscriber 2', type: 'queue', label: 'Subscriber 2' },
        ],
        edges: [
          { from: 'channel', to: 'sub1' },
          { from: 'channel', to: 'sub2' },
        ],
      },
    ],
  },
};

const redisIR = compiler.compile(redisContent);

// Same IR structure! Renderer is identical.
// This is the power of abstraction.
export const redisIRExample = redisIR;

// Benefits of IR Layer
console.log(`
✅ Kafka and Redis both compile to same IR
✅ Renderer has ZERO technology knowledge
✅ Add new technology: just add compiler
✅ No code duplication
✅ AI can generate IR
✅ Mobile/Canvas can render IR
✅ Analytics can track IR interactions
`);

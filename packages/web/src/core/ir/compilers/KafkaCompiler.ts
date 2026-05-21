// KafkaCompiler - Converts Kafka scenarios to IR format
// Supports produce-consume, ISR, consumer groups, and lag scenarios

import { ContentCompiler } from '../contentCompiler';
import {
  IRLearningUnit,
  IRScene,
  PrimitiveType,
  TechnologyContent,
  IRNode,
  IREdge,
} from '../schema';

interface KafkaProducer {
  id: string;
  state: 'idle' | 'sending' | 'ack';
  sending?: string;
}

interface KafkaPartition {
  id: string;
  leader: boolean;
  messages: Array<{ id: number; from: string }>;
  lag: number;
  offset: number;
  replicated?: boolean;
  state?: string;
}

interface KafkaConsumer {
  id: string;
  state: 'idle' | 'polling' | 'commit';
  assigned: number[];
  offset: number;
}

interface KafkaScenarioSnapshot {
  producers: KafkaProducer[];
  partitions: KafkaPartition[];
  consumers: KafkaConsumer[];
  metrics: { qps: number; lag: number; throughput: number };
  narration: string;
  complexity?: { ops: number; label: string; space: string };
}

export class KafkaCompiler extends ContentCompiler {
  compileProduceConsumeScene(snapshot: KafkaScenarioSnapshot): IRScene {
    const nodes: IRNode[] = [];
    const edges: IREdge[] = [];
    let nodeId = 0;

    // Create producer nodes (pipeline start)
    snapshot.producers.forEach((producer) => {
      nodes.push({
        id: `producer-${producer.id}`,
        label: producer.id,
        state: this.mapState(producer.state),
        metadata: {
          role: 'producer',
          description: `Producer ${producer.id}`,
        },
        type: 'pipeline',
      } as IRNode);
    });

    // Create partition nodes (pipeline middle - queue-like)
    snapshot.partitions.forEach((partition) => {
      const messageCount = partition.messages.length;
      nodes.push({
        id: `partition-${partition.id}`,
        label: `${partition.id} (${messageCount} msgs, lag=${partition.lag})`,
        state: partition.leader ? 'active' : 'idle',
        metadata: {
          role: 'partition',
          messages: messageCount,
          lag: partition.lag,
          offset: partition.offset,
          isLeader: partition.leader,
        },
        type: 'pipeline',
      } as IRNode);
    });

    // Create consumer nodes (pipeline end)
    snapshot.consumers.forEach((consumer) => {
      nodes.push({
        id: `consumer-${consumer.id}`,
        label: `${consumer.id} (offset=${consumer.offset})`,
        state: this.mapState(consumer.state),
        metadata: {
          role: 'consumer',
          assigned: consumer.assigned.map((idx) => snapshot.partitions[idx]?.id),
          offset: consumer.offset,
        },
        type: 'pipeline',
      } as IRNode);
    });

    // Create edges: producers → partitions
    snapshot.producers.forEach((producer) => {
      const targetPartIdx = this.hashPartition(producer.id, snapshot.partitions.length);
      const targetPartition = snapshot.partitions[targetPartIdx];

      if (targetPartition) {
        edges.push({
          id: `produce-${producer.id}-${targetPartition.id}`,
          from: `producer-${producer.id}`,
          to: `partition-${targetPartition.id}`,
          type: 'flow',
          label: 'produce',
        });
      }
    });

    // Create edges: partitions → consumers
    snapshot.consumers.forEach((consumer) => {
      consumer.assigned.forEach((partIdx) => {
        const partition = snapshot.partitions[partIdx];
        if (partition) {
          edges.push({
            id: `consume-${consumer.id}-${partition.id}`,
            from: `partition-${partition.id}`,
            to: `consumer-${consumer.id}`,
            type: 'flow',
            label: 'consume',
          });
        }
      });
    });

    return {
      id: 'kafka-produce-consume',
      type: 'pipeline',
      title: 'Kafka: Producer-Consumer Flow',
      description: snapshot.narration,
      nodes,
      edges,
      layout: 'hierarchical',
    };
  }

  compileISRScene(snapshot: KafkaScenarioSnapshot): IRScene {
    const nodes: IRNode[] = [];
    const edges: IREdge[] = [];

    // ISR (In-Sync Replicas) view: show replication
    snapshot.partitions.forEach((partition, idx) => {
      // Leader node
      nodes.push({
        id: `isr-leader-${partition.id}`,
        label: `${partition.id} (Leader)`,
        state: partition.leader ? 'active' : 'error',
        metadata: { role: 'leader', offset: partition.offset },
        type: 'pipeline',
      } as IRNode);

      // Replica nodes
      if (partition.replicated) {
        for (let i = 0; i < 2; i++) {
          nodes.push({
            id: `isr-replica-${partition.id}-${i}`,
            label: `${partition.id}-R${i}`,
            state: 'completed',
            metadata: { role: 'replica' },
            type: 'pipeline',
          } as IRNode);

          // Edge: leader → replica
          edges.push({
            id: `replicate-${partition.id}-${i}`,
            from: `isr-leader-${partition.id}`,
            to: `isr-replica-${partition.id}-${i}`,
            type: 'dependency',
            label: 'replicate',
          });
        }
      }
    });

    return {
      id: 'kafka-isr',
      type: 'graph',
      title: 'Kafka: In-Sync Replicas (ISR)',
      description: 'Shows replication from leader to followers',
      nodes,
      edges,
      layout: 'hierarchical',
    };
  }

  compileConsumerGroupScene(snapshot: KafkaScenarioSnapshot): IRScene {
    const nodes: IRNode[] = [];
    const edges: IREdge[] = [];

    // Partition nodes
    snapshot.partitions.forEach((partition) => {
      nodes.push({
        id: `cg-partition-${partition.id}`,
        label: partition.id,
        state: 'active',
        metadata: { messages: partition.messages.length },
        type: 'pipeline',
      } as IRNode);
    });

    // Consumer group node
    nodes.push({
      id: 'consumer-group',
      label: 'Consumer Group',
      state: 'active',
      metadata: { consumerCount: snapshot.consumers.length },
      type: 'pipeline',
    } as IRNode);

    // Consumer nodes
    snapshot.consumers.forEach((consumer) => {
      nodes.push({
        id: `cg-consumer-${consumer.id}`,
        label: consumer.id,
        state: this.mapState(consumer.state),
        metadata: { assigned: consumer.assigned },
        type: 'pipeline',
      } as IRNode);

      // Edge: consumer → group
      edges.push({
        id: `member-${consumer.id}`,
        from: `cg-consumer-${consumer.id}`,
        to: 'consumer-group',
        type: 'dependency',
        label: 'member',
      });
    });

    // Partition assignments
    snapshot.consumers.forEach((consumer) => {
      consumer.assigned.forEach((partIdx) => {
        const partition = snapshot.partitions[partIdx];
        if (partition) {
          edges.push({
            id: `assign-${consumer.id}-${partition.id}`,
            from: 'consumer-group',
            to: `cg-partition-${partition.id}`,
            type: 'dependency',
            label: `${consumer.id}`,
          });
        }
      });
    });

    return {
      id: 'kafka-consumer-groups',
      type: 'graph',
      title: 'Kafka: Consumer Group Assignment',
      description: 'Shows how partitions are assigned to consumers',
      nodes,
      edges,
      layout: 'force',
    };
  }

  compileLagScene(snapshot: KafkaScenarioSnapshot): IRScene {
    const nodes: IRNode[] = [];
    const edges: IREdge[] = [];

    // Create partition lag visualization
    snapshot.partitions.forEach((partition) => {
      // Partition node
      nodes.push({
        id: `lag-partition-${partition.id}`,
        label: `${partition.id}`,
        state: partition.lag > 0 ? 'active' : 'completed',
        metadata: { lag: partition.lag, offset: partition.offset },
        type: 'timeline',
      } as IRNode);

      // Lag indicator
      if (partition.lag > 0) {
        nodes.push({
          id: `lag-indicator-${partition.id}`,
          label: `Lag: ${partition.lag}`,
          state: 'error',
          metadata: {},
          type: 'timeline',
        } as IRNode);

        edges.push({
          id: `lag-${partition.id}`,
          from: `lag-partition-${partition.id}`,
          to: `lag-indicator-${partition.id}`,
          type: 'dependency',
          label: 'lag',
        });
      }
    });

    return {
      id: 'kafka-lag',
      type: 'timeline',
      title: 'Kafka: Consumer Lag',
      description: 'Shows lag between write offset and consumer offset',
      nodes,
      edges,
      layout: 'grid',
    };
  }

  private mapState(kafkaState: string): string {
    const stateMap: Record<string, string> = {
      idle: 'idle',
      active: 'active',
      sending: 'processing',
      ack: 'completed',
      polling: 'processing',
      commit: 'processing',
      election: 'processing',
      normal: 'active',
      error: 'error',
    };

    return stateMap[kafkaState] || 'idle';
  }

  private hashPartition(producerId: string, partitionCount: number): number {
    // Simple hash to distribute producers to partitions
    const code = producerId.charCodeAt(1) || 0;
    return code % partitionCount;
  }

  compile(content: TechnologyContent): IRLearningUnit {
    // For Kafka, we'd expect the content to have scenarios in its structure
    // This is a basic implementation that could be extended

    return {
      id: content.id,
      title: content.title,
      concept: 'kafka',
      difficulty: content.difficulty || 3,
      prerequisites: ['distributed-systems', 'event-driven-architecture'],
      scenes: [
        {
          id: 'overview',
          type: 'pipeline',
          title: 'Kafka Architecture Overview',
          description: 'Basic producer-consumer pattern',
          nodes: [],
          edges: [],
        },
      ],
      interactions: [],
      metadata: {
        technology: 'kafka',
        domain: 'distributed-systems',
        keywords: [
          'events',
          'streaming',
          'partitions',
          'replication',
          'consumer-groups',
        ],
      },
    };
  }
}

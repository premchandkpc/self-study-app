// Kafka Simulation Runtime - Actual Kafka behavior simulation
// NOT just scene navigation - real distributed system logic

import { EventEmitter } from '../events/EventEmitter';

export interface KafkaMessage {
  id: string;
  topic: string;
  partition: number;
  key?: string;
  value: any;
  timestamp: number;
}

export interface KafkaPartitionState {
  id: number;
  topicId: string;
  messages: KafkaMessage[];
  leader: number; // broker id
  replicas: number[]; // broker ids
  isr: number[]; // in-sync replicas
  highWaterMark: number;
}

export interface KafkaBrokerState {
  id: number;
  alive: boolean;
  partitions: KafkaPartitionState[];
  groups: Map<string, ConsumerGroupState>;
}

export interface ConsumerGroupState {
  id: string;
  members: ConsumerState[];
  committed: Map<string, number>; // partition → offset
  generation: number;
}

export interface ConsumerState {
  id: string;
  assignedPartitions: number[];
  lag: number;
  committed: number;
}

export class KafkaSimulationRuntime extends EventEmitter {
  private brokers: Map<string, KafkaBrokerState> = new Map();
  private topics: Map<string, TopicState> = new Map();
  private producers: Map<string, ProducerState> = new Map();
  private consumers: Map<string, ConsumerState> = new Map();
  private time: number = 0;
  private replicationFactor: number = 3;
  private minISR: number = 2;

  constructor() {
    super();
    this.initializeBrokers();
  }

  private initializeBrokers(): void {
    for (let i = 0; i < 3; i++) {
      this.brokers.set(`broker-${i}`, {
        id: i,
        alive: true,
        partitions: [],
        groups: new Map(),
      });
    }
  }

  // Producer publishes message
  produceMessage(
    producerId: string,
    topic: string,
    partition: number,
    key: string,
    value: any
  ): { success: boolean; message?: KafkaMessage; reason?: string } {
    // Validate topic exists
    if (!this.topics.has(topic)) {
      return { success: false, reason: 'Topic not found' };
    }

    // Validate partition exists
    const topicState = this.topics.get(topic)!;
    if (partition >= topicState.partitionCount) {
      return { success: false, reason: 'Partition out of range' };
    }

    // Get partition leader
    const brokerState = this.getPartitionLeader(topic, partition);
    if (!brokerState || !brokerState.alive) {
      return { success: false, reason: 'No leader available' };
    }

    // Create message
    const message: KafkaMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      topic,
      partition,
      key,
      value,
      timestamp: this.time,
    };

    // Append to partition
    const partitionState = brokerState.partitions.find(
      (p) => p.id === partition && p.topicId === topic
    );
    if (partitionState) {
      partitionState.messages.push(message);
      partitionState.highWaterMark = partitionState.messages.length - 1;

      // Async replicate
      this.replicateToFollowers(topic, partition, message);

      this.emit('MESSAGE_PRODUCED', {
        message,
        leaderId: brokerState.id,
        time: this.time,
      });

      return { success: true, message };
    }

    return { success: false, reason: 'Partition not found' };
  }

  // Consumer pulls message
  pullMessages(
    consumerId: string,
    groupId: string,
    partition: number,
    topic: string,
    offset: number,
    maxMessages: number = 10
  ): { messages: KafkaMessage[]; nextOffset: number } {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      return { messages: [], nextOffset: offset };
    }

    // Get partition state
    const brokerState = this.getPartitionLeader(topic, partition);
    if (!brokerState) {
      return { messages: [], nextOffset: offset };
    }

    const partitionState = brokerState.partitions.find(
      (p) => p.id === partition && p.topicId === topic
    );
    if (!partitionState) {
      return { messages: [], nextOffset: offset };
    }

    // Fetch messages from offset
    const messages = partitionState.messages.slice(
      offset,
      offset + maxMessages
    );

    // Track lag
    consumer.lag = Math.max(
      0,
      partitionState.highWaterMark - (offset + messages.length)
    );

    this.emit('MESSAGES_CONSUMED', {
      consumerId,
      groupId,
      partition,
      count: messages.length,
      lag: consumer.lag,
      time: this.time,
    });

    return {
      messages,
      nextOffset: offset + messages.length,
    };
  }

  // Rebalance consumer group
  rebalanceGroup(
    groupId: string,
    topic: string,
    newMembers: string[]
  ): { assignment: Map<string, number[]>; generation: number } {
    const group = Array.from(this.brokers.values())
      .flatMap((b) => Array.from(b.groups.values()))
      .find((g) => g.id === groupId);

    if (!group) {
      return { assignment: new Map(), generation: 0 };
    }

    const topicState = this.topics.get(topic);
    if (!topicState) {
      return { assignment: new Map(), generation: 0 };
    }

    // Round-robin assignment
    const partitions = Array.from(
      { length: topicState.partitionCount },
      (_, i) => i
    );
    const assignment = new Map<string, number[]>();

    partitions.forEach((partition, idx) => {
      const member = newMembers[idx % newMembers.length];
      if (!assignment.has(member)) {
        assignment.set(member, []);
      }
      assignment.get(member)!.push(partition);
    });

    group.generation++;
    group.members = newMembers.map((m) => ({
      id: m,
      assignedPartitions: assignment.get(m) || [],
      lag: 0,
      committed: 0,
    }));

    this.emit('REBALANCE_COMPLETE', {
      groupId,
      generation: group.generation,
      assignment: Object.fromEntries(assignment),
      time: this.time,
    });

    return { assignment, generation: group.generation };
  }

  // Trigger broker failure
  brokerCrash(brokerId: number): void {
    const broker = Array.from(this.brokers.values()).find(
      (b) => b.id === brokerId
    );
    if (!broker) return;

    broker.alive = false;

    // Remove from ISR for all partitions
    broker.partitions.forEach((partition) => {
      partition.isr = partition.isr.filter((id) => id !== brokerId);

      if (partition.isr.length < this.minISR) {
        this.emit('ISR_SHRINK', {
          topic: partition.topicId,
          partition: partition.id,
          isr: partition.isr,
          time: this.time,
        });
      }
    });

    // Elect new leaders
    this.electNewLeaders();

    this.emit('BROKER_CRASH', {
      brokerId,
      affectedPartitions: broker.partitions.length,
      time: this.time,
    });
  }

  // Broker recovery
  brokerRestart(brokerId: number): void {
    const broker = Array.from(this.brokers.values()).find(
      (b) => b.id === brokerId
    );
    if (!broker) return;

    broker.alive = true;

    // Catch up replicas
    broker.partitions.forEach((partition) => {
      const leader = this.getPartitionLeaderForState(partition);
      if (leader && leader.id !== brokerId) {
        // Replica catch-up
        const gap = leader.highWaterMark - partition.highWaterMark;
        this.emit('REPLICA_CATCHING_UP', {
          brokerId,
          topic: partition.topicId,
          partition: partition.id,
          lag: gap,
          time: this.time,
        });

        // Quick sync
        partition.highWaterMark = leader.highWaterMark;
        partition.isr.push(brokerId);
      }
    });

    this.emit('BROKER_RECOVERED', {
      brokerId,
      affectedPartitions: broker.partitions.length,
      time: this.time,
    });
  }

  // Create topic
  createTopic(
    topic: string,
    partitions: number,
    replicationFactor: number = this.replicationFactor
  ): boolean {
    if (this.topics.has(topic)) return false;

    this.topics.set(topic, {
      id: topic,
      partitionCount: partitions,
      replicationFactor,
      createdAt: this.time,
    });

    // Assign partitions to brokers
    const brokerList = Array.from(this.brokers.values());
    for (let p = 0; p < partitions; p++) {
      const replicas = this.assignReplicas(brokerList, replicationFactor);
      const leader = replicas[0];

      const partition: KafkaPartitionState = {
        id: p,
        topicId: topic,
        messages: [],
        leader: leader.id,
        replicas: replicas.map((b) => b.id),
        isr: replicas.map((b) => b.id),
        highWaterMark: -1,
      };

      replicas.forEach((broker) => {
        broker.partitions.push(partition);
      });
    }

    this.emit('TOPIC_CREATED', {
      topic,
      partitions,
      replicationFactor,
      time: this.time,
    });

    return true;
  }

  // Get simulation state (for visualization)
  getState() {
    return {
      time: this.time,
      brokers: Array.from(this.brokers.values()).map((b) => ({
        id: b.id,
        alive: b.alive,
        partitionCount: b.partitions.length,
        groupCount: b.groups.size,
      })),
      topics: Array.from(this.topics.values()),
      producers: Array.from(this.producers.values()).map((p) => ({
        id: p.id,
        messagesSent: p.messagesSent,
      })),
      consumers: Array.from(this.consumers.values()).map((c) => ({
        id: c.id,
        lag: c.lag,
        messagesConsumed: c.messagesConsumed,
      })),
    };
  }

  // Advance simulation time
  tick(deltaTime: number = 100): void {
    this.time += deltaTime;
    this.emit('TICK', { time: this.time, delta: deltaTime });
  }

  // Private helpers
  private getPartitionLeader(
    topic: string,
    partition: number
  ): KafkaBrokerState | null {
    const brokerState = Array.from(this.brokers.values()).find(
      (b) =>
        b.partitions.some(
          (p) => p.topicId === topic && p.id === partition && p.leader === b.id
        )
    );
    return brokerState || null;
  }

  private getPartitionLeaderForState(
    partition: KafkaPartitionState
  ): KafkaPartitionState | null {
    const leader = Array.from(this.brokers.values())
      .find((b) => b.id === partition.leader)
      ?.partitions.find(
        (p) => p.topicId === partition.topicId && p.id === partition.id
      );
    return leader || null;
  }

  private replicateToFollowers(
    topic: string,
    partition: number,
    message: KafkaMessage
  ): void {
    const brokerState = this.getPartitionLeader(topic, partition);
    if (!brokerState) return;

    const partitionState = brokerState.partitions.find(
      (p) => p.topicId === topic && p.id === partition
    );
    if (!partitionState) return;

    // Replicate to all ISR replicas
    partitionState.isr.forEach((brokerId) => {
      if (brokerId === brokerState.id) return;

      const replicaBroker = Array.from(this.brokers.values()).find(
        (b) => b.id === brokerId
      );
      if (!replicaBroker) return;

      const replicaPartition = replicaBroker.partitions.find(
        (p) => p.topicId === topic && p.id === partition
      );
      if (replicaPartition) {
        replicaPartition.messages.push(message);
      }
    });
  }

  private electNewLeaders(): void {
    this.topics.forEach((topic) => {
      for (let p = 0; p < topic.partitionCount; p++) {
        const partition = Array.from(this.brokers.values())
          .flatMap((b) => b.partitions)
          .find((p) => p.topicId === topic.id && p.id === p);

        if (partition && !partition.isr.includes(partition.leader)) {
          const newLeader = partition.isr[0];
          if (newLeader !== undefined) {
            partition.leader = newLeader;
            this.emit('LEADER_ELECTED', {
              topic: topic.id,
              partition: p,
              newLeader,
              time: this.time,
            });
          }
        }
      }
    });
  }

  private assignReplicas(
    brokers: KafkaBrokerState[],
    count: number
  ): KafkaBrokerState[] {
    const replica: KafkaBrokerState[] = [];
    for (let i = 0; i < Math.min(count, brokers.length); i++) {
      replica.push(brokers[i]);
    }
    return replica;
  }
}

interface TopicState {
  id: string;
  partitionCount: number;
  replicationFactor: number;
  createdAt: number;
}

interface ProducerState {
  id: string;
  messagesSent: number;
  bytesProduced: number;
}

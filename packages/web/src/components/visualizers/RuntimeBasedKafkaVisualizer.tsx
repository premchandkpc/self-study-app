// IR-based Kafka Visualizer using runtime + IR architecture
// Demonstrates how to migrate from legacy visualizers to the platform

import { memo, useState, useCallback } from 'react';
import { KafkaCompiler } from '@/core/ir/compilers/KafkaCompiler';
import { SceneRenderer } from '@/core/ir/sceneRenderer';
import { useSimulationRuntime } from '@/core/hooks/useSimulationRuntime';
import styles from './RuntimeBasedKafkaVisualizer.module.css';

interface KafkaScenarioSnapshot {
  producers: Array<{ id: string; state: string; sending?: string }>;
  partitions: Array<{
    id: string;
    leader: boolean;
    messages: Array<{ id: number; from: string }>;
    lag: number;
    offset: number;
    replicated?: boolean;
  }>;
  consumers: Array<{ id: string; state: string; assigned: number[]; offset: number }>;
  metrics: { qps: number; lag: number; throughput: number };
  narration: string;
}

interface KafkaScenarioData {
  id: string;
  title: string;
  description: string;
  steps: KafkaScenarioSnapshot[];
}

// Mock scenario data generator (in real app, would import from kafka-engine.js)
function generateProduceConsumeScenario(): KafkaScenarioData {
  const steps: KafkaScenarioSnapshot[] = [];

  const makeState = (): Omit<KafkaScenarioSnapshot, 'narration'> => ({
    producers: [
      { id: 'P1', state: 'idle' },
      { id: 'P2', state: 'idle' },
    ],
    partitions: [
      { id: 'T-0', leader: true, messages: [], lag: 0, offset: 0 },
      { id: 'T-1', leader: true, messages: [], lag: 0, offset: 0 },
      { id: 'T-2', leader: true, messages: [], lag: 0, offset: 0 },
    ],
    consumers: [
      { id: 'C1', state: 'idle', assigned: [0, 1], offset: 0 },
      { id: 'C2', state: 'idle', assigned: [2], offset: 0 },
    ],
    metrics: { qps: 0, lag: 0, throughput: 0 },
  });

  // Step 1: Initial state
  steps.push({
    ...makeState(),
    narration: 'Kafka cluster ready. Producers idle. Partitions empty.',
  });

  // Step 2: Producers send
  const state2 = makeState();
  state2.producers[0].state = 'sending';
  state2.partitions[0].messages = [{ id: 0, from: 'P1' }];
  state2.partitions[0].offset = 1;
  state2.partitions[0].lag = 1;
  state2.metrics.qps = 120;
  steps.push({
    ...state2,
    narration: 'Producer P1 sends records to partitions.',
  });

  // Step 3: Producers idle
  const state3 = makeState();
  state3.producers.forEach((p) => (p.state = 'idle'));
  state3.partitions[0] = { ...state2.partitions[0], replicated: true };
  state3.partitions[1] = {
    id: 'T-1',
    leader: true,
    messages: [{ id: 0, from: 'P2' }],
    lag: 1,
    offset: 1,
    replicated: true,
  };
  steps.push({
    ...state3,
    narration: 'All producers sent. Partitions replicated to followers.',
  });

  // Step 4: Consumers polling
  const state4 = makeState();
  state4.producers.forEach((p) => (p.state = 'idle'));
  state4.consumers[0].state = 'polling';
  state4.partitions[0].messages = [];
  state4.partitions[0].lag = 0;
  state4.consumers[0].offset = 1;
  state4.metrics.throughput = 1;
  steps.push({
    ...state4,
    narration: 'Consumer C1 polls and consumes messages.',
  });

  // Step 5: Final state
  const state5 = makeState();
  state5.producers.forEach((p) => (p.state = 'idle'));
  state5.consumers.forEach((c) => (c.state = 'idle'));
  state5.partitions.forEach((p) => {
    p.messages = [];
    p.lag = 0;
  });
  steps.push({
    ...state5,
    narration: 'All messages consumed. Cluster healthy. Lag = 0.',
  });

  return {
    id: 'produce-consume',
    title: 'Produce-Consume',
    description: 'Basic Kafka producer-consumer flow',
    steps,
  };
}

interface RuntimeBasedKafkaVisualizerProps {
  scenarioId?: string;
}

export const RuntimeBasedKafkaVisualizer = memo(function RuntimeBasedKafkaVisualizer({
  scenarioId = 'produce-consume',
}: RuntimeBasedKafkaVisualizerProps) {
  const [scenario, setScenario] = useState<KafkaScenarioData | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [sceneType, setSceneType] = useState<'produce-consume' | 'isr' | 'consumer-groups' | 'lag'>('produce-consume');

  // Load scenario on mount
  React.useEffect(() => {
    if (scenarioId === 'produce-consume') {
      setScenario(generateProduceConsumeScenario());
    }
  }, [scenarioId]);

  const compiler = new KafkaCompiler();
  const currentSnapshot = scenario?.steps[currentStepIndex];

  if (!scenario || !currentSnapshot) {
    return <div className={styles.loading}>Loading scenario...</div>;
  }

  // Compile current snapshot to IR scene
  let irScene = compiler.compileProduceConsumeScene(currentSnapshot);

  if (sceneType === 'isr') {
    irScene = compiler.compileISRScene(currentSnapshot);
  } else if (sceneType === 'consumer-groups') {
    irScene = compiler.compileConsumerGroupScene(currentSnapshot);
  } else if (sceneType === 'lag') {
    irScene = compiler.compileLagScene(currentSnapshot);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>{scenario.title}</h2>
        <p>{scenario.description}</p>
      </div>

      {/* Scene type selector */}
      <div className={styles.controls}>
        <div className={styles.sceneSelector}>
          <label>View:</label>
          <select
            value={sceneType}
            onChange={(e) =>
              setSceneType(e.target.value as typeof sceneType)
            }
          >
            <option value="produce-consume">Produce-Consume Flow</option>
            <option value="isr">ISR Replication</option>
            <option value="consumer-groups">Consumer Groups</option>
            <option value="lag">Lag Monitoring</option>
          </select>
        </div>

        {/* Step controls */}
        <div className={styles.stepControls}>
          <button
            onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
            disabled={currentStepIndex === 0}
          >
            ← Previous
          </button>

          <div className={styles.stepInfo}>
            Step {currentStepIndex + 1} of {scenario.steps.length}
          </div>

          <button
            onClick={() =>
              setCurrentStepIndex(
                Math.min(scenario.steps.length - 1, currentStepIndex + 1)
              )
            }
            disabled={currentStepIndex === scenario.steps.length - 1}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Narration */}
      <div className={styles.narration}>{currentSnapshot.narration}</div>

      {/* IR Scene Renderer */}
      <div className={styles.sceneContainer}>
        <SceneRenderer scene={irScene} />
      </div>

      {/* Metrics */}
      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{currentSnapshot.metrics.qps}</div>
          <div className={styles.metricLabel}>QPS</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{currentSnapshot.metrics.lag}</div>
          <div className={styles.metricLabel}>Total Lag</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{currentSnapshot.metrics.throughput}</div>
          <div className={styles.metricLabel}>Throughput</div>
        </div>
      </div>
    </div>
  );
});

export default RuntimeBasedKafkaVisualizer;

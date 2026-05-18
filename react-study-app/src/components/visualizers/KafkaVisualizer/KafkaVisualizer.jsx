import { useEffect, useState } from 'react';
import { useSimulation } from '../../../core/context/SimulationContext';
import { buildKafkaSteps, KAFKA_CODE } from './kafka-engine';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import styles from './KafkaVisualizer.module.css';

export default function KafkaVisualizer({ producers = 2, partitions = 3, consumers = 2 }) {
  const { state, dispatch } = useSimulation();
  const [vizState, setVizState] = useState(null);

  useEffect(() => {
    const steps = buildKafkaSteps(producers, partitions, consumers);
    dispatch({ type: 'SET_STEPS', payload: steps });
  }, [producers, partitions, consumers, dispatch]);

  useEffect(() => {
    const step = state.steps[state.currentStep];
    if (step) setVizState(step);
  }, [state.currentStep, state.steps]);

  if (!vizState) return null;

  const metrics = [
    { label: 'QPS',        value: vizState.metrics?.qps || 0,        max: 500,  unit: '/s', color: 'var(--kafka-producer)', warn: 60, critical: 85 },
    { label: 'Lag',        value: vizState.metrics?.lag || 0,         max: 20,   unit: '',   color: 'var(--kafka-consumer)', warn: 50, critical: 80 },
    { label: 'Throughput', value: vizState.metrics?.throughput || 0,  max: 10,   unit: ' msg', color: 'var(--kafka-broker)' },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.narrationBar}>
        <NarrationPanel />
      </div>

      <div className={styles.vizArea}>
        {/* PRODUCERS */}
        <div className={styles.column}>
          <div className={styles.colLabel}>Producers</div>
          {vizState.producers?.map((p) => (
            <KafkaNode
              key={p.id}
              label={p.id}
              state={p.state}
              colorVar="var(--kafka-producer)"
              detail={p.sending ? `→ ${p.sending}` : ''}
            />
          ))}
        </div>

        {/* FLOW ARROWS */}
        <div className={styles.arrows}>
          {vizState.producers?.map((p) => (
            <div
              key={p.id}
              className={`${styles.flowArrow} ${p.state === 'sending' ? styles.flowActive : ''}`}
            >
              →
            </div>
          ))}
        </div>

        {/* PARTITIONS */}
        <div className={styles.column}>
          <div className={styles.colLabel}>Partitions (Broker)</div>
          {vizState.partitions?.map((part) => (
            <PartitionNode key={part.id} partition={part} />
          ))}
        </div>

        {/* FLOW ARROWS */}
        <div className={styles.arrows}>
          {vizState.consumers?.map((c) => (
            <div
              key={c.id}
              className={`${styles.flowArrow} ${c.state === 'polling' ? styles.flowActive : ''}`}
            >
              ←
            </div>
          ))}
        </div>

        {/* CONSUMERS */}
        <div className={styles.column}>
          <div className={styles.colLabel}>Consumers</div>
          {vizState.consumers?.map((c) => (
            <KafkaNode
              key={c.id}
              label={c.id}
              state={c.state}
              colorVar="var(--kafka-consumer)"
              detail={c.state === 'polling' ? 'polling…' : c.state === 'commit' ? 'commit ✓' : `offset:${c.offset}`}
            />
          ))}
        </div>
      </div>

      <div className={styles.bottomPanels}>
        <CodePanel code={KAFKA_CODE} language="Java" />
        <div className={styles.rightPanels}>
          <MetricsPanel metrics={metrics} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

function KafkaNode({ label, state, colorVar, detail }) {
  const isActive = state !== 'idle';
  return (
    <div
      className={`${styles.node} ${isActive ? styles.nodeActive : ''}`}
      style={{ '--node-color': colorVar }}
    >
      <div className={styles.nodeLabel}>{label}</div>
      {detail && <div className={styles.nodeDetail}>{detail}</div>}
      {state === 'ack' && <span className={styles.ackBadge}>ACK ✓</span>}
    </div>
  );
}

function PartitionNode({ partition }) {
  const hasLag  = partition.lag > 0;
  const isElect = partition.state === 'election';
  return (
    <div className={`${styles.partition} ${isElect ? styles.partitionElection : ''}`}>
      <div className={styles.partitionHeader}>
        <span className={styles.partitionId}>{partition.id}</span>
        <span className={styles.partitionRole}>
          {partition.leader ? (isElect ? '⚡ ELECTING' : '👑 Leader') : '⬆ Follower'}
        </span>
      </div>
      <div className={styles.partitionLog}>
        {partition.messages?.slice(-5).map((msg, i) => (
          <div key={i} className={`${styles.logEntry} ${styles.logNew}`}>
            <span className={styles.logOffset}>#{msg.id}</span>
            <span className={styles.logFrom}>{msg.from}</span>
          </div>
        ))}
        {partition.messages?.length === 0 && (
          <span className={styles.logEmpty}>— empty —</span>
        )}
      </div>
      {hasLag && (
        <div className={styles.lagBar}>
          <span className={styles.lagLabel}>Lag: {partition.lag}</span>
          <div className={styles.lagFill} style={{ width: `${Math.min(partition.lag * 25, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

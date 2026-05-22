import { useVisualizerScenario } from '../../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './kafka-engine';
import ScenarioToolbar from '../../../components/shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../../components/shared/StepControls/StepControls';
import ComplexityPanel from '../../../components/shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../../components/shared/CodePanel/CodePanel';
import MetricsPanel from '../../../components/shared/MetricsPanel/MetricsPanel';
import ResultPanel from '../../../components/shared/ResultPanel/ResultPanel';
import styles from './KafkaVisualizer.module.css';

export default function KafkaVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.vizArea}>
        {activeId === 'isr' ? (
          <ISRView viz={viz} />
        ) : activeId === 'consumer-groups' ? (
          <ConsumerGroupView viz={viz} />
        ) : (
          <ProduceConsumeView viz={viz} />
        )}
      </div>

      {viz.events?.length > 0 && (
        <div className={styles.events}>
          <div className={styles.eventsLabel}>Kafka Events</div>
          {viz.events.slice(-4).map((ev, i) => (
            <div key={i} className={`${styles.event} ${styles[`ev-${ev.type}`]}`}>
              <span className={styles.evDot} /> {ev.msg}
            </div>
          ))}
        </div>
      )}

      <div className={styles.bottomPanels}>
        <CodePanel code={active.code} language={active.language} />
        <div className={styles.rightPanels}>
          <MetricsPanel metrics={metrics} />
          <ResultPanel result={viz?.result} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

function ProduceConsumeView({ viz }) {
  return (
    <>
      <div className={styles.column}>
        <div className={styles.colLabel}>Producers</div>
        {viz.producers?.map((p) => (
          <KafkaNode key={p.id} label={p.id} state={p.state} colorVar="var(--kafka-producer)" detail={p.sending ? `→ ${p.sending}` : ''} />
        ))}
      </div>

      <div className={styles.arrows}>
        {viz.producers?.map((p) => (
          <div key={p.id} className={`${styles.flowArrow} ${p.state === 'sending' ? styles.flowActive : ''}`}>→</div>
        ))}
      </div>

      <div className={styles.column}>
        <div className={styles.colLabel}>Partitions (Broker)</div>
        {viz.partitions?.map((part) => <PartitionNode key={part.id} partition={part} />)}
      </div>

      <div className={styles.arrows}>
        {viz.consumers?.map((c) => (
          <div key={c.id} className={`${styles.flowArrow} ${c.state === 'polling' ? styles.flowActive : ''}`}>←</div>
        ))}
      </div>

      <div className={styles.column}>
        <div className={styles.colLabel}>Consumers</div>
        {viz.consumers?.map((c) => (
          <KafkaNode
            key={c.id}
            label={c.id}
            state={c.state}
            colorVar="var(--kafka-consumer)"
            detail={c.state === 'polling' ? 'polling…' : c.state === 'commit' ? 'commit ✓' : `offset:${c.offset}`}
          />
        ))}
      </div>
    </>
  );
}

function ISRView({ viz }) {
  return (
    <>
      <div className={styles.column}>
        <div className={styles.colLabel}>Producers</div>
        {viz.producers?.map((p) => (
          <KafkaNode key={p.id} label={p.id} state={p.state} colorVar="var(--kafka-producer)" detail={p.sending ? `→ ${p.sending}` : ''} />
        ))}
      </div>

      <div className={styles.arrows}>
        {viz.producers?.map((p) => (
          <div key={p.id} className={`${styles.flowArrow} ${p.state === 'sending' ? styles.flowActive : ''}`}>→</div>
        ))}
      </div>

      <div className={styles.column}>
        <div className={styles.colLabel}>Brokers (ISR)</div>
        {viz.brokers?.map((b) => (
          <BrokerNode key={b.id} broker={b} isrList={viz.isr || []} />
        ))}
      </div>

      <div className={styles.arrows}>
        {viz.consumers?.map((c) => (
          <div key={c.id} className={`${styles.flowArrow} ${c.state === 'polling' ? styles.flowActive : ''}`}>←</div>
        ))}
      </div>

      <div className={styles.column}>
        <div className={styles.colLabel}>Consumers</div>
        {viz.consumers?.map((c) => (
          <KafkaNode key={c.id} label={c.id} state={c.state} colorVar="var(--kafka-consumer)" detail={`offset:${c.offset}`} />
        ))}
      </div>
    </>
  );
}

function KafkaNode({ label, state, colorVar, detail }) {
  const isActive = state !== 'idle';
  return (
    <div className={`${styles.node} ${isActive ? styles.nodeActive : ''}`} style={{ '--node-color': colorVar }}>
      <div className={styles.nodeLabel}>{label}</div>
      {detail && <div className={styles.nodeDetail}>{detail}</div>}
      {state === 'ack' && <span className={styles.ackBadge}>ACK ✓</span>}
    </div>
  );
}

function BrokerNode({ broker, isrList }) {
  const inISR   = isrList.includes(broker.id);
  const isDown  = broker.state === 'down';
  const isLeader = broker.role === 'leader';
  return (
    <div className={`${styles.node} ${isLeader ? styles.nodeActive : ''} ${isDown ? styles.nodeDown : ''}`}
      style={{ '--node-color': isDown ? 'var(--pod-crash)' : isLeader ? 'var(--kafka-producer)' : 'var(--kafka-broker)' }}>
      <div className={styles.nodeLabel}>{broker.id}</div>
      <div className={styles.nodeDetail}>{isLeader ? '👑 Leader' : 'Follower'}</div>
      <div className={styles.nodeDetail}>{inISR ? '✓ ISR' : '⚠ Out of ISR'}</div>
      {isDown && <span className={styles.downBadge}>DOWN</span>}
    </div>
  );
}

function ConsumerGroupView({ viz }) {
  const partitions = viz.partitions || [];
  const consumers  = viz.consumers  || [];

  return (
    <div className={styles.cgLayout}>
      <div className={styles.cgCol}>
        <div className={styles.colLabel}>Producer</div>
        {viz.producers?.map((p) => (
          <KafkaNode key={p.id} label={p.id} state={p.state} colorVar="var(--kafka-producer)" detail={p.sending ? `→ ${p.sending}` : ''} />
        ))}
      </div>

      <div className={styles.cgCenter}>
        <div className={styles.colLabel}>Partitions</div>
        {partitions.map((part, idx) => (
          <div key={part.id} className={styles.cgPartitionRow}>
            <PartitionNode partition={part} />
            <div className={styles.cgAssignLine}>
              {consumers
                .filter((c) => c.assigned?.includes(idx))
                .map((c) => (
                  <span key={c.id} className={`${styles.cgAssignBadge} ${c.state === 'joining' ? styles.cgJoining : ''}`}>
                    {c.id}
                  </span>
                ))}
            </div>
          </div>
        ))}
        {viz.metrics?.lag > 0 && (
          <div className={styles.cgLagMeter}>
            <span className={styles.cgLagLabel}>Total Lag</span>
            <div className={styles.cgLagBar}>
              <div className={styles.cgLagFill} style={{ width: `${Math.min((viz.metrics.lag / 20) * 100, 100)}%` }} />
            </div>
            <span className={styles.cgLagVal}>{viz.metrics.lag}</span>
          </div>
        )}
      </div>

      <div className={styles.cgCol}>
        <div className={styles.colLabel}>Consumers</div>
        {consumers.map((c) => {
          const assignedIds = (c.assigned || []).map((i) => partitions[i]?.id).filter(Boolean);
          const detail = c.state === 'joining'
            ? '⚡ joining…'
            : assignedIds.length
              ? `owns: [${assignedIds.join(', ')}]`
              : 'unassigned';
          return (
            <KafkaNode
              key={c.id}
              label={c.id}
              state={c.state === 'joining' ? 'active' : c.state}
              colorVar={c.state === 'joining' ? 'var(--node-comparing)' : 'var(--kafka-consumer)'}
              detail={detail}
            />
          );
        })}
      </div>
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
        {partition.messages?.length === 0 && <span className={styles.logEmpty}>— empty —</span>}
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

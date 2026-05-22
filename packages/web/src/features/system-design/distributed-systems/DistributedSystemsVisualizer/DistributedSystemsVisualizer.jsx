import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './ds-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import TopicContentSection from '../../shared/TopicContentSection/TopicContentSection';
import styles from './DistributedSystemsVisualizer.module.css';

const NODE_COLORS = {
  follower: { bg: '#6366f1', border: '#818cf8' },
  candidate: { bg: '#eab308', border: '#facc15' },
  leader: { bg: '#22c55e', border: '#4ade80' },
  up: { bg: '#22c55e', border: '#4ade80' },
  down: { bg: '#ef4444', border: '#f87171' },
  partitioned: { bg: '#f97316', border: '#fb923c' },
};

export default function DistributedSystemsVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.vizArea}>
        <div className={styles.mainViz}>
          {activeId === 'raft' && <RaftView viz={viz} />}
          {activeId === 'cap' && <CapView viz={viz} />}
          {activeId === 'twopc' && <TwoPCView viz={viz} />}
        </div>

        <div className={styles.sidePanel}>
          <VariablesPanel vars={viz?.vars} result={viz?.result} />

          {viz.events?.length > 0 && (
            <div className={styles.events}>
              <div className={styles.eventsLabel}>Distributed Systems Events</div>
              {viz.events.slice(-5).map((ev, i) => (
                <div key={i} className={`${styles.event} ${styles[`ev-${ev.type}`]}`}>
                  <span className={styles.evDot} />{ev.msg}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {viz.narration && (
        <div className={styles.narration}>{viz.narration}</div>
      )}

      <div className={styles.bottomPanels}>
        <CodePanel code={active.code} language={active.language} />
        <div className={styles.rightPanels}>
          <MetricsPanel metrics={metrics} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />

      <TopicContentSection topicContent={active.topicContent} />
    </div>
  );
}

/* === RAFT VIEW === */
function RaftView({ viz }) {
  const { servers, votes, heartbeatActive } = viz;

  return (
    <div className={styles.raftLayout}>
      <div className={styles.serverGrid}>
        {servers?.map((sv) => (
          <div
            key={sv.id}
            className={`${styles.serverBox} ${styles[`sv-${sv.state}`]}`}
          >
            <div
              className={styles.serverStateDot}
              style={{ backgroundColor: NODE_COLORS[sv.state]?.bg || '#6b7280' }}
            />
            <div className={styles.serverId}>{sv.id}</div>
            <div className={styles.serverState}>{sv.state}</div>
            <div className={styles.serverTerm}>term {sv.term}</div>
            <div className={styles.serverLog}>
              {sv.log?.map((entry, i) => (
                <span key={i} className={styles.logEntry}>
                  [{entry.index}:{entry.term}]
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(votes || {}).length > 0 && (
        <div className={styles.voteRow}>
          <span className={styles.sectionLabel}>Votes:</span>
          {Object.entries(votes).map(([sv, v]) => (
            <span key={sv} className={`${styles.voteBadge} ${v ? styles.voteYes : styles.voteNo}`}>
              {sv}: {v ? 'YES' : '-'}
            </span>
          ))}
        </div>
      )}

      <div className={styles.heartbeatRow}>
        <span className={styles.sectionLabel}>Heartbeat</span>
        <span className={heartbeatActive ? styles.hbActive : styles.hbInactive}>
          {heartbeatActive ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  );
}

/* === CAP VIEW === */
function CapView({ viz }) {
  const { nodes, partition, choice } = viz;

  return (
    <div className={styles.capLayout}>
      <div className={styles.capTriangle}>
        <div className={`${styles.capCorner} ${styles.capConsistency} ${choice === 'cp' ? styles.capActive : ''}`}>
          Consistency
        </div>
        <div className={`${styles.capCorner} ${styles.capAvailability} ${choice === 'ap' ? styles.capActive : ''}`}>
          Availability
        </div>
        <div className={`${styles.capCorner} ${styles.capPartition} ${styles.capActive}`}>
          Partition Tolerance
        </div>
      </div>

      <div className={styles.nodeGrid}>
        {nodes?.map((n) => (
          <div
            key={n.id}
            className={`${styles.capNode} ${styles[`node-${n.state}`]}`}
            style={{
              borderColor: NODE_COLORS[n.state]?.border || 'var(--border)',
              backgroundColor: `color-mix(in srgb, ${NODE_COLORS[n.state]?.bg || 'transparent'} 15%, transparent)`,
            }}
          >
            <div className={styles.capNodeId}>{n.id}</div>
            <div className={styles.capNodeState}>{n.state}</div>
          </div>
        ))}
      </div>

      {partition && (
        <div className={styles.partitionBadge}>
          PARTITION ACTIVE
        </div>
      )}

      <div className={styles.choiceRow}>
        <span className={styles.sectionLabel}>Choice:</span>
        <span className={styles.choiceValue}>{choice?.toUpperCase()}</span>
      </div>
    </div>
  );
}

/* === 2PC VIEW === */
function TwoPCView({ viz }) {
  const { coordinator, participants } = viz;

  return (
    <div className={styles.twopcLayout}>
      <div className={styles.coordinatorBox}>
        <div className={styles.coordLabel}>Coordinator</div>
        <div className={styles.coordState}>{coordinator?.state}</div>
      </div>

      <div className={styles.participantGrid}>
        {participants?.map((p) => (
          <div
            key={p.id}
            className={`${styles.participantBox} ${styles[`p-${p.state}`]}`}
          >
            <div className={styles.participantId}>{p.id}</div>
            <div className={styles.participantState}>{p.state}</div>
            {p.vote && (
              <div className={`${styles.participantVote} ${p.vote === 'YES' ? styles.voteYes : styles.voteNo}`}>
                {p.vote}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

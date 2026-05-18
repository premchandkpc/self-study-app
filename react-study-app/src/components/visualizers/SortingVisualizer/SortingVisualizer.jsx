import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './sorting-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import styles from './SortingVisualizer.module.css';

const MAX_VAL = 9;

const BAR_COLOR = {
  idle:       'var(--node-default)',
  comparing:  'var(--node-comparing)',
  pivot:      'var(--kafka-producer)',
  sorted:     'var(--pod-running)',
  window:     'var(--node-active)',
};

export default function SortingVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.vizArea}>
        <div className={styles.barsSection}>
          <div className={styles.barsLabel}>Array Visualization</div>
          <div className={styles.bars}>
            {(viz.arr || []).map((bar, idx) => (
              <div key={idx} className={styles.barCol}>
                <div
                  className={styles.bar}
                  style={{
                    height: `${(bar.val / MAX_VAL) * 100}%`,
                    background: BAR_COLOR[bar.state] || BAR_COLOR.idle,
                    boxShadow: bar.state !== 'idle' ? `0 0 8px ${BAR_COLOR[bar.state]}` : 'none',
                  }}
                />
                <div className={styles.barVal}>{bar.val}</div>
                <div className={styles.barIdx}>{idx}</div>
              </div>
            ))}
          </div>

          {activeId === 'quick' && viz.partitionRange && (
            <div className={styles.partitionInfo}>
              <span className={styles.piLabel}>Partition</span>
              <span className={styles.piRange}>[{viz.partitionRange.lo} .. {viz.partitionRange.hi}]</span>
              {viz.vars?.pivot != null && (
                <span className={styles.piPivot}>pivot = {viz.vars.pivot}</span>
              )}
            </div>
          )}

          {activeId === 'merge' && (
            <div className={styles.mergeInfo}>
              <span className={styles.piLabel}>Depth</span>
              <span className={styles.piRange}>{viz.vars?.depth ?? 0}</span>
            </div>
          )}

          {activeId === 'heap' && viz.heapSize > 0 && (
            <div className={styles.heapInfo}>
              <span className={styles.piLabel}>Heap Size</span>
              <span className={styles.piRange}>{viz.heapSize}</span>
              <span className={styles.piPivot}>root = {viz.vars?.root}</span>
            </div>
          )}
        </div>

        <div className={styles.sidePanel}>
          <VariablesPanel vars={viz?.vars} />

          <div className={styles.legend}>
            {Object.entries(BAR_COLOR).map(([state, color]) => (
              <div key={state} className={styles.legendItem}>
                <div className={styles.legendDot} style={{ background: color }} />
                <span className={styles.legendLabel}>{state}</span>
              </div>
            ))}
          </div>
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
    </div>
  );
}

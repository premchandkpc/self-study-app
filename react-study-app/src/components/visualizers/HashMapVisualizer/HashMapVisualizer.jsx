import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './hashmap-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import styles from './HashMapVisualizer.module.css';

export default function HashMapVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  const buckets       = viz.buckets || [];
  const activeBucket  = viz.activeBucket ?? -1;
  const dll           = viz.dll || [];
  const resultIndices = viz.resultIndices || [];
  const nums          = viz.nums || [];

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.vizArea}>
        <div className={styles.mapPanel}>
          {/* Array visualization for two-sum */}
          {nums.length > 0 && (
            <div className={styles.arrayRow}>
              <span className={styles.rowLabel}>nums</span>
              {nums.map((n, i) => (
                <div key={i} className={styles.arrayCell}>
                  <span className={`${styles.arrayBox} ${resultIndices.includes(i) ? styles.arrayMatch : viz.activeIndex === i ? styles.arrayActive : ''}`}>
                    {n}
                  </span>
                  <span className={styles.arrayIdx}>{i}</span>
                </div>
              ))}
              {viz.target !== undefined && (
                <span className={styles.targetBadge}>target={viz.target}</span>
              )}
            </div>
          )}

          {/* DLL visualization for LRU */}
          {dll.length > 0 && (
            <div className={styles.dllRow}>
              <span className={styles.rowLabel}>MRU</span>
              {dll.map((key, i) => (
                <span key={i} className={styles.dllNode}>
                  <span className={styles.dllKey}>{key}</span>
                  {i < dll.length - 1 && <span className={styles.dllArrow}>→</span>}
                </span>
              ))}
              <span className={styles.rowLabel}>LRU</span>
            </div>
          )}

          {/* Bucket table */}
          <div className={styles.bucketsLabel}>Hash Buckets</div>
          <div className={styles.bucketTable}>
            {buckets.map((chain, i) => (
              <div
                key={i}
                className={`${styles.bucketRow} ${activeBucket === i ? styles.bucketActive : ''}`}
              >
                <span className={styles.bucketIndex}>{i}</span>
                <div className={styles.bucketChain}>
                  {chain.length === 0 ? (
                    <span className={styles.bucketEmpty}>—</span>
                  ) : (
                    chain.map((entry, j) => (
                      <span key={j} className={styles.bucketEntry}>
                        <span className={styles.entryKey}>{entry.key}</span>
                        <span className={styles.entrySep}>:</span>
                        <span className={styles.entryVal}>{entry.value}</span>
                        {j < chain.length - 1 && <span className={styles.chainArrow}>→</span>}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {viz.narration && (
            <div className={styles.narration}>{viz.narration}</div>
          )}
        </div>

        <VariablesPanel vars={viz?.vars} />
      </div>

      <div className={styles.bottom}>
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

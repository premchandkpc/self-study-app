import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './string-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import styles from './StringVisualizer.module.css';

const CHAR_STATE_CLASS = {
  default:  'charDefault',
  window:   'charWindow',
  active:   'charActive',
  match:    'charMatch',
  mismatch: 'charMismatch',
  visited:  'charVisited',
};

export default function StringVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  const text    = viz.text    || [];
  const pattern = viz.pattern || [];
  const charStates    = viz.charStates    || [];
  const patternStates = viz.patternStates || [];

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.vizArea}>
        <div className={styles.stringsPanel}>
          <div className={styles.seqRow}>
            <span className={styles.seqLabel}>text</span>
            <div className={styles.charCells}>
              {text.map((ch, i) => (
                <div key={i} className={styles.charCell}>
                  <span className={`${styles.charBox} ${styles[CHAR_STATE_CLASS[charStates[i]] || 'charDefault']}`}>
                    {ch}
                  </span>
                  <span className={styles.charIndex}>{i}</span>
                </div>
              ))}
            </div>
          </div>

          {pattern.length > 0 && (
            <div className={styles.seqRow}>
              <span className={styles.seqLabel}>pat</span>
              <div className={styles.charCells}>
                {pattern.map((ch, i) => (
                  <div key={i} className={styles.charCell}>
                    <span className={`${styles.charBox} ${styles[CHAR_STATE_CLASS[patternStates[i]] || 'charDefault']}`}>
                      {ch}
                    </span>
                    <span className={styles.charIndex}>{i}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './array-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import InputPanel from '../../shared/InputPanel/InputPanel';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import styles from './ArrayVisualizer.module.css';

/* Cell colour by state */
const STATE_COLOR = {
  idle:     'var(--node-default)',
  active:   'var(--node-active)',
  window:   'var(--node-comparing)',
  left:     'var(--node-active)',
  right:    'var(--pod-crash)',
  found:    'var(--node-visited)',
  visited:  'var(--text-muted)',
  removing: 'var(--pod-crash)',
  adding:   'var(--node-active)',
  done:     'var(--node-done)',
};

/* Map scenario state names to CSS class names */
const STATE_CLASS = {
  active:   styles.stateActive,
  window:   styles.stateWindow,
  left:     styles.stateLeft,
  right:    styles.stateRight,
  found:    styles.stateFound,
  adding:   styles.stateAdding,
  removing: styles.stateRemoving,
  done:     styles.stateDone,
};

export default function ArrayVisualizer() {
  const { activeId, active, viz, select, customInputs, rebuild } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  const cells    = viz.cells   || [];
  const window_  = viz.window  || null;
  const pointers = viz.pointers || {};
  const prefix   = viz.prefix  || null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      {active.inputs?.length > 0 && (
        <InputPanel key={activeId} schema={active.inputs} current={customInputs} onApply={rebuild} />
      )}

      <div className={styles.vizArea}>
        {/* Main array display */}
        <div className={styles.arrayContainer}>
          {cells.map((cell, i) => {
            const color    = STATE_COLOR[cell.state] || STATE_COLOR.idle;
            const extraCls = STATE_CLASS[cell.state] || '';
            const inWindow = window_ && i >= window_.left && i <= window_.right;

            /* Pointer label(s) below each cell */
            const labels = [];
            if (pointers.left  === i) labels.push('L');
            if (pointers.right === i) labels.push('R');
            if (pointers.mid   === i) labels.push('mid');
            if (pointers.lo    === i) labels.push('lo');
            if (pointers.hi    === i) labels.push('hi');

            return (
              <div
                key={i}
                className={`${styles.cell} ${inWindow ? styles.inWindow : ''} ${extraCls}`}
                style={{ '--cell-color': color }}
              >
                <div className={styles.cellValue}>{cell.value}</div>
                <div className={styles.cellIndex}>{i}</div>
                {labels.length > 0 && (
                  <div className={styles.pointerLabel}>{labels.join('/')}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Prefix array display */}
        {prefix && (
          <div className={styles.prefixRow}>
            <span className={styles.prefixLabel}>prefix:</span>
            {prefix.map((v, i) => (
              <div key={i} className={styles.prefixCell}>
                <div className={styles.prefixVal}>{v}</div>
                <div className={styles.prefixIdx}>{i}</div>
              </div>
            ))}
          </div>
        )}

        {window_ && (
          <div className={styles.windowLabel}>
            Window [{window_.left}..{window_.right}]
          </div>
        )}

        {/* Bottom panels */}
        <div className={styles.panels}>
          <CodePanel code={active.code} language={active.language} />
          <div className={styles.rightPanels}>
            <VariablesPanel vars={viz?.vars} result={viz?.result} />
            <ComplexityPanel />
          </div>
        </div>
      </div>

      <StepControls />
    </div>
  );
}

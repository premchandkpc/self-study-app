import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './matrix-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import styles from './MatrixVisualizer.module.css';

const CELL_STATE_CLASS = {
  idle:    styles.cellIdle,
  active:  styles.cellActive,
  visited: styles.cellVisited,
  filled:  styles.cellFilled,
  result:  styles.cellResult,
  queued:  styles.cellQueued,
};

export default function MatrixVisualizer() {
  const { activeId, active, viz, select } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  const matrix = viz.matrix || [];

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.arena}>
        <div className={styles.matrixSection}>
          <div className={styles.matrixLabel}>Matrix</div>

          <div
            className={styles.grid}
            style={{ '--cols': matrix[0]?.length ?? 4 }}
          >
            {matrix.map((row, r) =>
              row.map((cell, c) => (
                <MatrixCell key={`${r}-${c}`} cell={cell} r={r} c={c} />
              ))
            )}
          </div>

          {/* Path order badges for spiral */}
          {viz.path?.length > 0 && (
            <div className={styles.pathRow}>
              <span className={styles.pathLabel}>Path:</span>
              {viz.path.slice(-8).map(([pr, pc], i) => (
                <span key={i} className={styles.pathBadge}>
                  [{pr},{pc}]
                </span>
              ))}
              {viz.path.length > 8 && (
                <span className={styles.pathMore}>+{viz.path.length - 8}</span>
              )}
            </div>
          )}

          {/* BFS queue display */}
          {viz.queue?.length > 0 && (
            <div className={styles.queueRow}>
              <span className={styles.queueLabel}>Queue:</span>
              {(Array.isArray(viz.queue) ? viz.queue : [])
                .slice(0, 8)
                .map((item, i) => (
                  <span key={i} className={styles.queueItem}>
                    {Array.isArray(item) ? `[${item.join(',')}]` : String(item)}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Right side: variables */}
        <div className={styles.sidePanel}>
          <VariablesPanel vars={viz?.vars} result={viz?.result} />
        </div>
      </div>

      <div className={styles.bottom}>
        <CodePanel code={active.code} language={active.language} />
        <div className={styles.rightPanels}>
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

function MatrixCell({ cell, r, c }) {
  const extraCls = CELL_STATE_CLASS[cell.state] || CELL_STATE_CLASS.idle;
  return (
    <div className={`${styles.cell} ${extraCls}`} title={`[${r}][${c}]=${cell.val}`}>
      <span className={styles.cellVal}>{cell.val}</span>
      <span className={styles.cellCoord}>[{r},{c}]</span>
    </div>
  );
}

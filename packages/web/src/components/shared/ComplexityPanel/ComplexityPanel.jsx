import { useSimulation } from '../../../core/context/useSimulation';
import { COMPLEXITY_COLORS } from '../../../core/constants/colors';
import styles from './ComplexityPanel.module.css';

export default function ComplexityPanel({ time, space, ops }) {
  const { state } = useSimulation();
  const complexity = state.complexity;

  const timeLabel = time || complexity.label || 'O(?)';
  const spaceLabel = space || complexity.space || 'O(?)';
  const opsCount = ops ?? complexity.ops ?? 0;
  const color = COMPLEXITY_COLORS[timeLabel] || 'var(--text-muted)';

  return (
    <div className={styles.panel}>
      <div className={styles.metric}>
        <span className={styles.metricLabel}>Time</span>
        <span className={styles.metricValue} style={{ color }}>
          {timeLabel}
        </span>
      </div>
      <div className={styles.divider} />
      <div className={styles.metric}>
        <span className={styles.metricLabel}>Space</span>
        <span className={styles.metricValue} style={{ color: 'var(--text-accent)' }}>
          {spaceLabel}
        </span>
      </div>
      <div className={styles.divider} />
      <div className={styles.metric}>
        <span className={styles.metricLabel}>Ops</span>
        <span className={styles.metricValue} style={{ color: 'var(--text-warn)' }}>
          {opsCount}
        </span>
      </div>
      <div className={styles.colorBar} style={{ background: color }} />
    </div>
  );
}

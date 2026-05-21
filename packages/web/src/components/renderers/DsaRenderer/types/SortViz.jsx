import { memo } from 'react';
import { CELL_COLORS } from '../../../../core/constants/colors';
import styles from '../../../templates/DSATemplate/DSATemplate.module.css';

export const SortViz = memo(function SortViz({ viz }) {
  const { arr = [] } = viz;
  const maxVal = Math.max(...arr.map((b) => b.val), 1);
  return (
    <div className={styles.sortWrap}>
      {arr.map((bar, i) => (
        <div key={i} className={styles.barCol}>
          <div className={styles.bar} style={{
            height: `${(bar.val / maxVal) * 100}%`,
            background: CELL_COLORS[bar.state] || CELL_COLORS.idle,
          }} />
          <div className={styles.barVal}>{bar.val}</div>
        </div>
      ))}
    </div>
  );
});

import { memo } from 'react';
import { CELL_COLORS } from '../../../../core/constants/colors';
import styles from '../../../templates/DSATemplate/DSATemplate.module.css';

export const StringViz = memo(function StringViz({ viz }) {
  const chars = viz.chars || viz.text || (viz.str ? viz.str.split('') : []);
  return (
    <div className={styles.strWrap}>
      {chars.map((ch, i) => {
        const color = CELL_COLORS[ch.state] || CELL_COLORS.idle;
        const char = typeof ch === 'string' ? ch : ch.char ?? ch.val;
        return <div key={i} className={styles.strCell} style={{ '--cc': color }}>{char}</div>;
      })}
    </div>
  );
});

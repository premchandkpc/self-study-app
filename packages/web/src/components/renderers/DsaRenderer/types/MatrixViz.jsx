import { memo } from 'react';
import { CELL_COLORS } from '../../../../core/constants/colors';
import styles from '../../../templates/DSATemplate/DSATemplate.module.css';

export const MatrixViz = memo(function MatrixViz({ viz }) {
  const { matrix = [] } = viz;
  return (
    <div className={styles.matrixWrap}>
      {matrix.map((row, r) => (
        <div key={r} className={styles.matrixRow}>
          {row.map((cell, c) => (
            <div key={c} className={styles.matCell} style={{ '--cc': CELL_COLORS[cell.state] || CELL_COLORS.idle }}>
              {cell.val ?? cell.value}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});

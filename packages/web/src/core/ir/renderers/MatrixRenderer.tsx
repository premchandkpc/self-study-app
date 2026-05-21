// MatrixRenderer - 2D matrix/grid visualization
// Used by: DP tables, 2D arrays, game boards, image matrices, dynamic programming

import { memo } from 'react';
import { IRScene } from '../schema';
import styles from './MatrixRenderer.module.css';

interface MatrixCell {
  id: string;
  label: string;
  row: number;
  col: number;
  state: string;
}

function parseMatrixLayout(scene: IRScene): { cells: MatrixCell[]; rows: number; cols: number } {
  // Try to infer matrix dimensions from metadata
  const metadata = scene.metadata as any;
  let rows = metadata?.rows || Math.ceil(Math.sqrt(scene.nodes.length));
  let cols = metadata?.cols || Math.ceil(scene.nodes.length / rows);

  const cells: MatrixCell[] = scene.nodes.map((node, idx) => ({
    id: node.id,
    label: node.label,
    row: Math.floor(idx / cols),
    col: idx % cols,
    state: node.state,
  }));

  return { cells, rows, cols };
}

export const MatrixRenderer = memo(function MatrixRenderer({
  scene,
}: {
  scene: IRScene;
}) {
  const { cells, rows, cols } = parseMatrixLayout(scene);

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{scene.title}</h4>

      {scene.description && (
        <div className={styles.description}>{scene.description}</div>
      )}

      <div className={styles.matrixContainer}>
        <div
          className={styles.matrix}
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
          }}
        >
          {cells.map((cell) => (
            <div
              key={cell.id}
              className={`${styles.cell} ${styles[`state-${cell.state}`]}`}
              title={cell.label}
            >
              <div className={styles.cellContent}>{cell.label}</div>
              {cell.row !== undefined && cell.col !== undefined && (
                <div className={styles.cellCoord}>
                  [{cell.row},{cell.col}]
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dimensions */}
      <div className={styles.info}>
        <div className={styles.dimension}>
          <span className={styles.label}>Rows:</span> {rows}
        </div>
        <div className={styles.dimension}>
          <span className={styles.label}>Cols:</span> {cols}
        </div>
        <div className={styles.dimension}>
          <span className={styles.label}>Cells:</span> {cells.length}
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles['state-idle']}`} />
          Unvisited
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles['state-active']}`} />
          Current
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles['state-completed']}`} />
          Visited
        </div>
      </div>
    </div>
  );
});

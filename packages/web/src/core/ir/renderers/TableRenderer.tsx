// TableRenderer - Tabular data visualization
// Used by: Databases, records, structured data, comparison tables

import { memo } from 'react';
import { IRScene } from '../schema';
import styles from './TableRenderer.module.css';

export const TableRenderer = memo(function TableRenderer({
  scene,
}: {
  scene: IRScene;
}) {
  const rows = scene.nodes;
  const columns = ['ID', 'Name', 'State'];

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{scene.title}</h4>

      {scene.description && (
        <div className={styles.description}>{scene.description}</div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={`${styles.row} ${styles[`state-${row.state}`]}`}>
                <td className={styles.id}>{row.id.substring(0, 8)}</td>
                <td className={styles.name}>{row.label}</td>
                <td className={styles.state}>
                  <span className={`${styles.badge} ${styles[`state-${row.state}`]}`}>
                    {row.state}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.label}>Records:</span> {rows.length}
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Columns:</span> {columns.length}
        </div>
      </div>
    </div>
  );
});

import { memo } from 'react';
import { KeyCard } from './KeyCard';
import styles from '../RedisVisualizer.module.css';

export const DataTypesView = memo(function DataTypesView({ viz }) {
  const store = viz.store || {};

  return (
    <div className={styles.dataTypesGrid}>
      {Object.entries(store).map(([key, entry]) => (
        <KeyCard key={key} redisKey={key} entry={entry} isActive={key === viz.activeKey || entry.active} />
      ))}
      {Object.keys(store).length === 0 && (
        <div className={styles.emptyStore}>Redis store is empty. Commands will populate it...</div>
      )}
      {viz.command && (
        <div className={styles.commandBar}>
          <span className={styles.commandPrompt}>redis&gt;</span>
          <span className={styles.commandText}>{viz.command}</span>
          {viz.result && <span className={styles.commandResult}>→ {viz.result}</span>}
        </div>
      )}
    </div>
  );
});

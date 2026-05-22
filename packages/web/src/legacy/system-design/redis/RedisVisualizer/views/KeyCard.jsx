import { memo } from 'react';
import { KeyValue } from './KeyValue';
import styles from '../RedisVisualizer.module.css';

const TYPE_COLOR = {
  string: 'var(--pod-running)',
  list:   'var(--kafka-producer)',
  hash:   'var(--node-comparing)',
  set:    'var(--node-active)',
  zset:   'var(--node-visited, var(--kafka-consumer))',
};

export const KeyCard = memo(function KeyCard({ redisKey, entry, isActive }) {
  const color = TYPE_COLOR[entry.type] || 'var(--node-default)';

  return (
    <div className={`${styles.keyCard} ${isActive ? styles.keyCardActive : ''}`} style={{ '--key-color': color }}>
      <div className={styles.keyCardHeader}>
        <span className={styles.keyName}>{redisKey}</span>
        <span className={styles.typeBadge} style={{ background: `color-mix(in srgb, ${color} 20%, transparent)`, borderColor: color, color }}>
          {entry.type}
        </span>
      </div>
      <div className={styles.keyCardValue}>
        <KeyValue entry={entry} />
      </div>
    </div>
  );
});

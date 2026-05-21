import { useState } from 'react';
import styles from './VariableInspector.module.css';

export default function VariableInspector({ name, value, type }) {
  const [expanded, setExpanded] = useState(false);

  if (value === null || value === undefined) {
    return (
      <div className={styles.row}>
        <span className={styles.name}>{name}</span>
        <span className={styles.value}>null</span>
        <span className={styles.type}>{type}</span>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className={styles.row}>
        <span className={styles.name}>{name}</span>
        <span className={`${styles.value} ${value ? styles.true : styles.false}`}>{String(value)}</span>
        <span className={styles.type}>{type}</span>
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className={styles.row}>
        <span className={styles.name}>{name}</span>
        <span className={styles.value}>{value}</span>
        <span className={styles.type}>{type}</span>
      </div>
    );
  }

  if (typeof value === 'string') {
    if (value.length <= 20) {
      return (
        <div className={styles.row}>
          <span className={styles.name}>{name}</span>
          <span className={styles.value}>"{value}"</span>
          <span className={styles.type}>{type}</span>
        </div>
      );
    }
    return (
      <div className={styles.row}>
        <span className={styles.name}>{name}</span>
        <span className={styles.value}>"{value.slice(0, 17)}…"</span>
        <span className={styles.type}>{type}</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className={styles.container}>
        <div className={styles.row} onClick={() => setExpanded(!expanded)}>
          <span className={styles.toggle}>{expanded ? '▼' : '▶'}</span>
          <span className={styles.name}>{name}</span>
          <span className={styles.value}>[{value.length}]</span>
          <span className={styles.type}>{type}</span>
        </div>
        {expanded && (
          <div className={styles.children}>
            {value.map((item, i) => (
              <VariableInspector key={i} name={`[${i}]`} value={item} type={typeof item} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return (
      <div className={styles.container}>
        <div className={styles.row} onClick={() => setExpanded(!expanded)}>
          <span className={styles.toggle}>{expanded ? '▼' : '▶'}</span>
          <span className={styles.name}>{name}</span>
          <span className={styles.value}>{'{' + keys.length + '}'}</span>
          <span className={styles.type}>{type}</span>
        </div>
        {expanded && (
          <div className={styles.children}>
            {keys.map((key) => (
              <VariableInspector key={key} name={key} value={value[key]} type={typeof value[key]} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.row}>
      <span className={styles.name}>{name}</span>
      <span className={styles.value}>{String(value)}</span>
      <span className={styles.type}>{type}</span>
    </div>
  );
}

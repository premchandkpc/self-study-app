import { useState } from 'react';
import styles from './VariableInspector.module.css';

const MAX_DEPTH = 5;
const MAX_ITEMS = 100;

export default function VariableInspector({ name, value, type, depth = 0 }) {
  const [expanded, setExpanded] = useState(false);

  if (depth > MAX_DEPTH) {
    return (
      <div className={styles.row}>
        <span className={styles.toggle}></span>
        <span className={styles.name}>{name}</span>
        <span className={styles.value}>…</span>
        <span className={styles.type}>max depth</span>
      </div>
    );
  }

  if (value === null || value === undefined) {
    return (
      <div className={styles.row}>
        <span className={styles.toggle}></span>
        <span className={styles.name}>{name}</span>
        <span className={styles.value}>null</span>
        <span className={styles.type}>{type}</span>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className={styles.row}>
        <span className={styles.toggle}></span>
        <span className={styles.name}>{name}</span>
        <span className={`${styles.value} ${value ? styles.true : styles.false}`}>{String(value)}</span>
        <span className={styles.type}>{type}</span>
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className={styles.row}>
        <span className={styles.toggle}></span>
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
          <span className={styles.toggle}></span>
          <span className={styles.name}>{name}</span>
          <span className={styles.value}>"{value}"</span>
          <span className={styles.type}>{type}</span>
        </div>
      );
    }
    return (
      <div className={styles.row}>
        <span className={styles.toggle}></span>
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
            {value.slice(0, MAX_ITEMS).map((item, i) => (
              <VariableInspector key={i} name={`[${i}]`} value={item} type={typeof item} depth={depth + 1} />
            ))}
            {value.length > MAX_ITEMS && (
              <div className={styles.row}>
                <span className={styles.name}>[…]</span>
                <span className={styles.value}>+{value.length - MAX_ITEMS} items</span>
                <span className={styles.type}>truncated</span>
              </div>
            )}
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
            {keys.slice(0, MAX_ITEMS).map((key) => (
              <VariableInspector key={key} name={key} value={value[key]} type={typeof value[key]} depth={depth + 1} />
            ))}
            {keys.length > MAX_ITEMS && (
              <div className={styles.row}>
                <span className={styles.name}>[…]</span>
                <span className={styles.value}>+{keys.length - MAX_ITEMS} keys</span>
                <span className={styles.type}>truncated</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.row}>
      <span className={styles.toggle}></span>
      <span className={styles.name}>{name}</span>
      <span className={styles.value}>{String(value)}</span>
      <span className={styles.type}>{type}</span>
    </div>
  );
}

import styles from './VariablesChip.module.css';

function formatValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return `"${value}"`;
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === 'object') return '{...}';
  return String(value);
}

export default function VariablesChip({ vars = {}, result }) {
  const entries = Object.entries(vars).slice(0, 20);

  return (
    <div className={styles.container}>
      <div className={styles.chips}>
        {entries.map(([name, value]) => (
          <div key={name} className={styles.chip}>
            <span className={styles.chipName}>{name}</span>
            <span className={styles.chipValue}>{formatValue(value)}</span>
          </div>
        ))}
        {result !== undefined && result !== null && (
          <div key="result" className={`${styles.chip} ${styles.resultChip}`}>
            <span className={styles.chipName}>result</span>
            <span className={styles.chipValue}>{formatValue(result)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

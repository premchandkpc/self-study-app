import ResultPanel from '../ResultPanel/ResultPanel';
import VariableInspector from '../VariableInspector/VariableInspector';
import styles from './VariablesPanel.module.css';

export default function VariablesPanel({ vars = {}, result }) {
  const entries = Object.entries(vars).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Variables</span>
        <span className={styles.count}>{entries.length}</span>
      </div>
      {entries.length > 0 ? (
        <div className={styles.varsContainer}>
          {entries.map(([name, value]) => (
            <VariableInspector
              key={name}
              name={name}
              value={value}
              type={detectType(value)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>—</div>
      )}
      {result && <ResultPanel result={result} />}
    </div>
  );
}

function detectType(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  return 'unknown';
}

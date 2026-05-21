import styles from './ResultPanel.module.css';

export default function ResultPanel({ result }) {
  if (!result) return null;
  const label = typeof result === 'object' ? result.label : 'Result';
  const value = typeof result === 'object' ? result.value : result;
  return (
    <div className={styles.panel}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{String(value)}</span>
    </div>
  );
}

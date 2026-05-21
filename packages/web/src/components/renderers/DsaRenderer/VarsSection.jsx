import { memo } from 'react';
import { formatVarValue } from './formatVarValue';
import styles from '../../templates/DSATemplate/DSATemplate.module.css';

const VarChip = memo(function VarChip({ name, value, highlight }) {
  const display = formatVarValue(value);
  return (
    <div className={`${styles.varChip} ${highlight ? styles.varChipResult : ''}`}>
      <span className={styles.varChipName}>{name}</span>
      <span className={styles.varChipVal}>{display}</span>
    </div>
  );
});

export const VarsSection = memo(function VarsSection({ vars, result }) {
  const entries = Object.entries(vars);
  if (!entries.length) return null;
  return (
    <div className={styles.varsSection}>
      <span className={styles.varsSectionLabel}>variables</span>
      <div className={styles.varsRow}>
        {entries.map(([k, v]) => (
          <VarChip key={k} name={k} value={v} />
        ))}
        {result !== undefined && result !== null && (
          <VarChip name="result" value={result} highlight />
        )}
      </div>
    </div>
  );
});

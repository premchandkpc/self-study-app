import { useState, useEffect, useMemo } from 'react';
import styles from './InputPanel.module.css';

/**
 * Generic input panel for any visualizer scenario.
 *
 * schema: Array<{ key, label, type, default, min?, max?, maxLen? }>
 *   type: 'number' | 'string' | 'array-num'
 *
 * onApply(parsedInputs) called when user clicks Run or presses Enter.
 */
export default function InputPanel({ schema, current = {}, onApply }) {
  if (!schema?.length) return null;

  const initial = Object.fromEntries(
    schema.map((f) => {
      const val = current[f.key] ?? f.default;
      const display = Array.isArray(val) ? val.join(', ') : String(val ?? '');
      return [f.key, display];
    })
  );
  const [vals, setVals] = useState(initial);

  // Update vals when schema or current changes
  useEffect(() => {
    if (schema?.length) {
      const updated = Object.fromEntries(
        schema.map((f) => {
          const val = current[f.key] ?? f.default;
          const display = Array.isArray(val) ? val.join(', ') : String(val ?? '');
          return [f.key, display];
        })
      );
      setVals(updated);
    }
  }, [schema, current]);

  const warnings = useMemo(() => {
    const warns = [];
    for (const field of schema) {
      const raw = vals[field.key];
      if (field.type === 'array-num') {
        const arr = String(raw).split(',').map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
        if (!arr.length && String(raw).trim()) {
          warns.push(`"${field.label}" contains no valid numbers`);
        }
      }
    }
    return warns;
  }, [vals, schema]);

  function set(key, value) {
    setVals((prev) => ({ ...prev, [key]: value }));
  }

  function apply() {
    const parsed = {};
    try {
      for (const field of schema) {
        const raw = vals[field.key];
        if (field.type === 'number') {
          const n = parseInt(raw, 10);
          parsed[field.key] = isNaN(n)
            ? field.default
            : Math.max(field.min ?? -Infinity, Math.min(field.max ?? Infinity, n));
        } else if (field.type === 'array-num') {
          const arr = String(raw).split(',').map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
          parsed[field.key] = arr.length ? arr : field.default;
        } else {
          parsed[field.key] = String(raw).trim() || String(field.default);
        }
      }
      onApply(parsed);
    } catch (e) {
      console.error('Error parsing inputs:', e, { schema, vals });
    }
  }

  return (
    <div className={styles.panel}>
      {schema.map((field) => (
        <label key={field.key} className={styles.field}>
          <span className={styles.label}>{field.label}</span>
          <input
            className={styles.input}
            type={field.type === 'number' ? 'number' : 'text'}
            min={field.min}
            max={field.max}
            value={vals[field.key]}
            onChange={(e) => set(field.key, e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && apply()}
          />
        </label>
      ))}
      {warnings.length > 0 && (
        <div className={styles.warnings}>
          {warnings.map((w, i) => (
            <div key={i} className={styles.warning}>⚠ {w}</div>
          ))}
        </div>
      )}
      <button className={styles.runBtn} onClick={apply}>▶ Run</button>
    </div>
  );
}

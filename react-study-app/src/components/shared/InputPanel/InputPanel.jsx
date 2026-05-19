import { useState } from 'react';
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
  const initial = Object.fromEntries(
    schema.map((f) => {
      const val = current[f.key] ?? f.default;
      return [f.key, Array.isArray(val) ? val.join(', ') : val];
    })
  );
  const [vals, setVals] = useState(initial);

  function set(key, value) {
    setVals((prev) => ({ ...prev, [key]: value }));
  }

  function apply() {
    const parsed = {};
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
      <button className={styles.runBtn} onClick={apply}>▶ Run</button>
    </div>
  );
}

import ResultPanel from '../ResultPanel/ResultPanel';
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
            <VarGroup key={name} name={name} value={value} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>—</div>
      )}
      {result && <ResultPanel result={result} />}
    </div>
  );
}

function VarGroup({ name, value }) {
  return (
    <div className={styles.varGroup}>
      <div className={styles.varName}>{name}</div>
      <VarValue value={value} />
    </div>
  );
}

function VarRow({ name, value }) {
  return (
    <div className={styles.row} key={`${name}-${JSON.stringify(value)}`}>
      <span className={styles.rowVarName}>{name}</span>
      <span className={styles.varValue}>
        <VarValue value={value} />
      </span>
      <span className={styles.varType}>{getType(value)}</span>
    </div>
  );
}

function VarValue({ value }) {
  if (value === null || value === undefined) {
    return <span className={styles.valNull}>null</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span className={`${styles.valBool} ${value ? styles.valTrue : styles.valFalse}`}>
        {String(value)}
      </span>
    );
  }
  if (typeof value === 'number') {
    return <span className={styles.valNum}>{value}</span>;
  }
  if (typeof value === 'string') {
    return <StringCells value={value} />;
  }
  if (Array.isArray(value)) {
    return <ArrayCells items={value} />;
  }
  if (typeof value === 'object') {
    return <MapEntries obj={value} />;
  }
  return <span className={styles.valDefault}>{String(value)}</span>;
}

function StringCells({ value }) {
  if (value.length > 16) {
    return <span className={styles.valStr}>"{value.slice(0, 14)}…"</span>;
  }
  if (value.length === 0) return <span className={styles.valNull}>""</span>;
  return (
    <div className={styles.cells}>
      {value.split('').map((ch, i) => (
        <span key={i} className={styles.strCell}>{ch}</span>
      ))}
    </div>
  );
}

function ArrayCells({ items }) {
  const MAX = 8;
  const shown = items.slice(0, MAX);
  return (
    <div className={styles.cells}>
      {shown.map((item, i) => (
        <span
          key={i}
          className={`${styles.arrCell} ${item === null ? styles.cellNull : ''}`}
        >
          {item === null ? '∅' : Array.isArray(item) ? `[…]` : String(item).slice(0, 4)}
        </span>
      ))}
      {items.length > MAX && (
        <span className={styles.cellMore}>+{items.length - MAX}</span>
      )}
    </div>
  );
}

function MapEntries({ obj }) {
  const entries = Object.entries(obj).slice(0, 4);
  if (!entries.length) return <span className={styles.valNull}>{'{}'}</span>;
  return (
    <div className={styles.mapEntries}>
      {entries.map(([k, v]) => (
        <span key={k} className={styles.mapEntry}>
          <span className={styles.mapKey}>{k}</span>
          <span className={styles.mapSep}>:</span>
          <span className={styles.mapVal}>{String(v).slice(0, 6)}</span>
        </span>
      ))}
      {Object.keys(obj).length > 4 && (
        <span className={styles.cellMore}>+{Object.keys(obj).length - 4}</span>
      )}
    </div>
  );
}

function getType(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float';
  if (typeof value === 'string') return `str(${value.length})`;
  if (Array.isArray(value)) return `arr[${value.length}]`;
  if (typeof value === 'object') return `map(${Object.keys(value).length})`;
  return typeof value;
}

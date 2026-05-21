import { useSimulation } from '../../../core/context/SimulationContext';
import styles from './CodePanel.module.css';

export default function CodePanel({ code = [], language = 'javascript' }) {
  const { state } = useSimulation();
  const activeLine = state.codeLine;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.lang}>{language}</span>
        <div className={styles.dots}>
          <span className={styles.dot} style={{ background: '#f85149' }} />
          <span className={styles.dot} style={{ background: '#e3b341' }} />
          <span className={styles.dot} style={{ background: '#3fb950' }} />
        </div>
      </div>
      <pre className={styles.pre}>
        {code.map((line, i) => {
          const lineNum = i + 1;
          const isActive = activeLine === lineNum;
          return (
            <div
              key={i}
              className={`${styles.line} ${isActive ? styles.activeLine : ''}`}
            >
              <span className={styles.lineNum}>{lineNum}</span>
              <span className={styles.lineCode}>{line}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}

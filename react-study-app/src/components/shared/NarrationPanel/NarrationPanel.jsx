import { useSimulation } from '../../../core/context/SimulationContext';
import styles from './NarrationPanel.module.css';

export default function NarrationPanel({ staticText, inline }) {
  const { state } = useSimulation();
  const text = staticText || state.narration;

  return (
    <div className={`${styles.panel} ${inline ? styles.inline : ''}`}>
      <span className={styles.icon}>💬</span>
      <p className={styles.text} key={text}>
        {text || 'Press ▶ to start simulation…'}
      </p>
    </div>
  );
}

import { useSimulation } from '../../../core/context/SimulationContext';
import styles from './NarrationPanel.module.css';

export default function NarrationPanel({ staticText, inline }) {
  const { state } = useSimulation();
  const text = staticText || state.narration;
  const stepKey = state.currentStep ?? 0;

  return (
    <div className={`${styles.panel} ${inline ? styles.inline : ''}`}>
      <span className={styles.icon}>💬</span>
      <p className={styles.text} key={`${stepKey}-${text?.slice(0, 20)}`}>
        {text || 'Press ▶ to start simulation…'}
      </p>
    </div>
  );
}

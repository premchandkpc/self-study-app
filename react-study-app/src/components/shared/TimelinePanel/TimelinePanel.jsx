import { useSimulation } from '../../../core/context/SimulationContext';
import styles from './TimelinePanel.module.css';

export default function TimelinePanel({ events = [] }) {
  const { state, dispatch } = useSimulation();
  const total = state.steps.length;
  const current = state.currentStep;

  // Use provided events or auto-generate from steps
  const timeline = events.length
    ? events
    : state.steps.map((s, i) => ({ t: i, label: s.narration?.slice(0, 40) || `Step ${i + 1}` }));

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Timeline</span>
        <span className={styles.counter}>{current + 1}/{total || '–'}</span>
      </div>

      <div className={styles.track}>
        {timeline.map((ev, i) => {
          const pct = total > 1 ? (ev.t / (total - 1)) * 100 : 0;
          const isCurrent = i === current;
          const isPast = i < current;
          return (
            <button
              key={i}
              className={`${styles.marker} ${isCurrent ? styles.markerActive : ''} ${isPast ? styles.markerPast : ''}`}
              style={{ left: `${pct}%` }}
              onClick={() => dispatch({ type: 'JUMP_TO', payload: ev.t })}
              title={ev.label}
            />
          );
        })}
        <div className={styles.trackLine} />
        <div
          className={styles.trackFill}
          style={{ width: `${total > 1 ? (current / (total - 1)) * 100 : 0}%` }}
        />
      </div>

      {timeline[current] && (
        <div className={styles.eventLabel}>
          <span className={styles.eventTime}>t={current}</span>
          <span className={styles.eventText}>{timeline[current].label}</span>
        </div>
      )}
    </div>
  );
}

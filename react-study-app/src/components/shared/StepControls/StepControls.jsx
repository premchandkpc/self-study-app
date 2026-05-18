import { useSimulation } from '../../../core/context/SimulationContext';
import styles from './StepControls.module.css';

export default function StepControls() {
  const { state, dispatch, togglePlay } = useSimulation();
  const { currentStep, steps, isPlaying, speed } = state;
  const total = steps.length;
  const progress = total > 1 ? (currentStep / (total - 1)) * 100 : 0;

  return (
    <div className={styles.controls}>
      <div className={styles.buttons}>
        <CtrlBtn
          title="Jump to start"
          onClick={() => dispatch({ type: 'JUMP_START' })}
          disabled={currentStep === 0}
        >⏮</CtrlBtn>

        <CtrlBtn
          title="Step back"
          onClick={() => dispatch({ type: 'STEP_BACK' })}
          disabled={currentStep === 0}
        >◀</CtrlBtn>

        <button
          className={`${styles.playBtn} ${isPlaying ? styles.playing : ''}`}
          onClick={togglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <CtrlBtn
          title="Step forward"
          onClick={() => dispatch({ type: 'STEP_FORWARD' })}
          disabled={currentStep >= total - 1}
        >▷</CtrlBtn>

        <CtrlBtn
          title="Jump to end"
          onClick={() => dispatch({ type: 'JUMP_END' })}
          disabled={currentStep >= total - 1}
        >⏭</CtrlBtn>

        <CtrlBtn
          title="Reset"
          onClick={() => dispatch({ type: 'RESET' })}
        >↺</CtrlBtn>
      </div>

      <div className={styles.scrubber}>
        <input
          type="range"
          className={styles.range}
          min={0}
          max={Math.max(0, total - 1)}
          value={currentStep}
          onChange={(e) => dispatch({ type: 'JUMP_TO', payload: Number(e.target.value) })}
        />
        <div className={styles.track}>
          <div className={styles.trackBg} />
          <div className={styles.trackFill} style={{ width: `${progress}%` }} />
          {steps.map((step, i) => {
            const pct = total > 1 ? (i / (total - 1)) * 100 : 0;
            return (
              <span
                key={i}
                className={`${styles.marker} ${i === currentStep ? styles.markerActive : i < currentStep ? styles.markerPast : ''}`}
                style={{ left: `${pct}%` }}
                title={step.narration?.slice(0, 80)}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.right}>
        <span className={styles.counter}>
          {total > 0 ? `${currentStep + 1} / ${total}` : '–'}
        </span>
        <div className={styles.speedControl}>
          <span className={styles.speedLabel}>Speed</span>
          <input
            type="range"
            className={styles.speedRange}
            min={100}
            max={2000}
            step={100}
            value={speed}
            onChange={(e) => dispatch({ type: 'SET_SPEED', payload: Number(e.target.value) })}
          />
          <span className={styles.speedValue}>{speed}ms</span>
        </div>
      </div>
    </div>
  );
}

function CtrlBtn({ children, onClick, disabled, title }) {
  return (
    <button
      className={styles.ctrlBtn}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

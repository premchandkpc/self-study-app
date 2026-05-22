import React, { useEffect } from 'react';
import { useVisualizationEngine } from '@/core/hooks/useVisualizationEngine';
import { SemanticEvent } from '@/core/runtime';
import styles from './EventBasedVisualizer.module.css';

interface EventBasedVisualizerProps {
  title: string;
  description?: string;
  events: SemanticEvent[];
  renderer: React.ComponentType<{ frame: any }>;
  frameDelay?: number;
  speed?: number;
}

const EventBasedVisualizer: React.FC<EventBasedVisualizerProps> = ({
  title,
  description,
  events,
  renderer: Renderer,
  frameDelay = 300,
  speed = 1,
}) => {
  const engine = useVisualizationEngine({
    events,
    frameDelay,
    speed,
  });

  // Example: Log frame changes
  useEffect(() => {
    if (engine.currentFrame) {
      console.log('Frame:', engine.currentFrame.frameId, engine.currentFrame.events);
    }
  }, [engine.currentFrame]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>

      {/* Visualization */}
      <div className={styles.visualization}>
        {engine.currentFrame && <Renderer frame={engine.currentFrame} />}
      </div>

      {/* Progress */}
      <div className={styles.progress}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${engine.progress}%` }}
          />
        </div>
        <span className={styles.progressText}>
          {Math.round(engine.progress)}%
        </span>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button
          onClick={engine.previousFrame}
          disabled={!engine.canRewind()}
          className={styles.btn}
        >
          ← Prev
        </button>

        {engine.playbackState !== 'playing' ? (
          <button onClick={engine.play} className={`${styles.btn} ${styles.play}`}>
            ▶ Play
          </button>
        ) : (
          <button onClick={engine.pause} className={`${styles.btn} ${styles.pause}`}>
            ⏸ Pause
          </button>
        )}

        <button
          onClick={engine.nextFrame}
          disabled={!engine.canAdvance()}
          className={styles.btn}
        >
          Next →
        </button>

        <div className={styles.speedControl}>
          <select
            value={engine.speed}
            onChange={(e) => engine.setSpeed(parseFloat(e.target.value))}
            className={styles.speedSelect}
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>

        <button onClick={engine.replay} className={styles.btn}>
          ↻ Reset
        </button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <span>Frame {engine.frameIndex + 1}/{engine.frameCount}</span>
        <span>{engine.runtimeState}</span>
      </div>
    </div>
  );
};

export default EventBasedVisualizer;

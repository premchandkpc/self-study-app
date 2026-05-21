// Event Replay UI - Play/pause/seek session recordings
// Enables session replay from event logs

import { memo, useState, useEffect, useRef } from 'react';
import styles from './EventReplayUI.module.css';

export interface ReplayEvent {
  timestamp: number;
  type: string;
  data: any;
  description?: string;
}

export interface ReplaySession {
  id: string;
  title: string;
  startTime: number;
  events: ReplayEvent[];
  duration: number;
}

interface EventReplayUIProps {
  session: ReplaySession;
  onFrameChange?: (frameIndex: number, event: ReplayEvent) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export const EventReplayUI = memo(function EventReplayUI({
  session,
  onFrameChange,
  onPlayStateChange,
}: EventReplayUIProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(Date.now());

  const currentEvent = session.events[currentFrameIndex];
  const progress =
    session.events.length > 0
      ? (currentFrameIndex / (session.events.length - 1)) * 100
      : 0;

  // Animation loop for playback
  useEffect(() => {
    if (!isPlaying) return;

    const tick = () => {
      const now = Date.now();
      const elapsed = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        const newTime = prev + elapsed * playbackRate;

        // Find frame at this time
        let frameIdx = 0;
        for (let i = 0; i < session.events.length; i++) {
          if (session.events[i].timestamp <= newTime) {
            frameIdx = i;
          } else {
            break;
          }
        }

        if (frameIdx !== currentFrameIndex) {
          setCurrentFrameIndex(frameIdx);
          onFrameChange?.(frameIdx, session.events[frameIdx]);
        }

        // Stop at end
        if (newTime >= session.duration) {
          setIsPlaying(false);
          onPlayStateChange?.(false);
          return session.duration;
        }

        return newTime;
      });

      animationRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = Date.now();
    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackRate, session, currentFrameIndex, onFrameChange, onPlayStateChange]);

  const togglePlayPause = () => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    onPlayStateChange?.(newState);
  };

  const handleSeek = (index: number) => {
    setCurrentFrameIndex(index);
    setCurrentTime(session.events[index]?.timestamp || 0);
    onFrameChange?.(index, session.events[index]);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = Math.floor(
      (parseInt(e.target.value) / 100) * (session.events.length - 1)
    );
    handleSeek(Math.max(0, Math.min(index, session.events.length - 1)));
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{session.title}</h3>
        <div className={styles.sessionInfo}>
          Event {currentFrameIndex + 1} of {session.events.length}
        </div>
      </div>

      {/* Event description */}
      {currentEvent && (
        <div className={styles.eventDescription}>
          <span className={styles.eventType}>[{currentEvent.type}]</span>
          <span className={styles.eventText}>
            {currentEvent.description || JSON.stringify(currentEvent.data).substring(0, 100)}
          </span>
        </div>
      )}

      {/* Timeline/slider */}
      <div className={styles.timeline}>
        <div className={styles.timelineTrack}>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSliderChange}
            className={styles.slider}
          />

          {/* Event markers */}
          <div className={styles.markers}>
            {session.events.map((event, idx) => (
              <div
                key={idx}
                className={`${styles.marker} ${
                  idx === currentFrameIndex ? styles.activeMarker : ''
                }`}
                style={{
                  left: `${(idx / (session.events.length - 1)) * 100}%`,
                }}
                onClick={() => handleSeek(idx)}
                title={`${event.type} at ${formatTime(event.timestamp)}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.timeDisplay}>
          {formatTime(currentTime)} / {formatTime(session.duration)}
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {/* Play/pause buttons */}
        <div className={styles.playControls}>
          <button
            className={styles.button}
            onClick={() => handleSeek(0)}
            title="Go to start"
          >
            ⏮ Start
          </button>

          <button
            className={`${styles.button} ${styles.primaryButton}`}
            onClick={togglePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <button
            className={styles.button}
            onClick={() => handleSeek(session.events.length - 1)}
            title="Go to end"
          >
            End ⏭
          </button>
        </div>

        {/* Playback rate */}
        <div className={styles.speedControl}>
          <label htmlFor="speed">Speed:</label>
          <select
            id="speed"
            value={playbackRate}
            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
            className={styles.speedSelect}
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>
      </div>

      {/* Event list */}
      <div className={styles.eventList}>
        <div className={styles.eventListHeader}>Events</div>
        <div className={styles.eventListScroll}>
          {session.events.map((event, idx) => (
            <div
              key={idx}
              className={`${styles.eventListItem} ${
                idx === currentFrameIndex ? styles.activeEventItem : ''
              }`}
              onClick={() => handleSeek(idx)}
            >
              <span className={styles.eventIndex}>{idx + 1}</span>
              <span className={styles.eventListType}>{event.type}</span>
              <span className={styles.eventTime}>
                {formatTime(event.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default EventReplayUI;

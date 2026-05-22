import { useEffect, useReducer, useRef, useCallback } from 'react';
import {
  VisualizationEngine,
  SemanticEvent,
  TimelineFrame,
  RuntimeState,
  PlaybackState,
} from '../runtime';

export interface UseVisualizationEngineOptions {
  events?: SemanticEvent[];
  frameDelay?: number;
  speed?: number;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface EngineSnapshot {
  currentFrame: TimelineFrame | null;
  progress: number;
  frameIndex: number;
  frameCount: number;
  runtimeState: RuntimeState;
  playbackState: PlaybackState;
  speed: number;
}

function createInitialSnapshot(): EngineSnapshot {
  return {
    currentFrame: null,
    progress: 0,
    frameIndex: 0,
    frameCount: 0,
    runtimeState: 'idle',
    playbackState: 'idle',
    speed: 1,
  };
}

export function useVisualizationEngine(options: UseVisualizationEngineOptions = {}) {
  const engineRef = useRef<VisualizationEngine | null>(null);
  const [snapshot, dispatch] = useReducer(
    (state: EngineSnapshot, updates: Partial<EngineSnapshot>) => ({
      ...state,
      ...updates,
    }),
    null,
    createInitialSnapshot
  );

  // Initialize engine once
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new VisualizationEngine(options.events ?? [], {
        frameDelay: options.frameDelay ?? 300,
        speed: options.speed ?? 1,
      });

      const engine = engineRef.current;

      // Update React when frame changes
      engine.on('frameUpdate', (data) => {
        dispatch({
          currentFrame: { frameId: data.frameId, timestamp: 0, events: data.events },
          progress: data.progress,
          frameIndex: data.frameIndex,
          frameCount: data.frameCount,
          runtimeState: 'playing',
        });
      });

      engine.on('playbackStateChanged', (state: PlaybackState) => {
        dispatch({ playbackState: state });
      });

      engine.on('speedChanged', (speed: number) => {
        dispatch({ speed });
      });

      engine.on('completed', () => {
        dispatch({ runtimeState: 'completed', playbackState: 'completed' });
        options.onComplete?.();
      });

      // Initial state
      dispatch({
        frameCount: engine.getFrameCount(),
        runtimeState: engine.getRuntimeState(),
        playbackState: engine.getPlaybackState(),
        speed: engine.getSpeed(),
      });
    }

    return () => {
      // Keep engine alive - don't cleanup on re-render
    };
  }, [options.onComplete, options.onError]);

  // Control methods
  const play = useCallback(() => {
    engineRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const setSpeed = useCallback((speed: number) => {
    engineRef.current?.setSpeed(speed);
  }, []);

  const nextFrame = useCallback(() => {
    engineRef.current?.nextFrame();
  }, []);

  const previousFrame = useCallback(() => {
    engineRef.current?.previousFrame();
  }, []);

  const seekToFrame = useCallback((frameId: number) => {
    engineRef.current?.seekToFrame(frameId);
  }, []);

  const addEvents = useCallback((events: SemanticEvent[]) => {
    events.forEach((event) => engineRef.current?.addEvent(event));
  }, []);

  const replay = useCallback(() => {
    engineRef.current?.replay();
    dispatch(createInitialSnapshot());
  }, []);

  return {
    // Current state
    currentFrame: snapshot.currentFrame,
    progress: snapshot.progress,
    frameIndex: snapshot.frameIndex,
    frameCount: snapshot.frameCount,
    runtimeState: snapshot.runtimeState,
    playbackState: snapshot.playbackState,
    speed: snapshot.speed,

    // Controls
    play,
    pause,
    stop,
    setSpeed,
    nextFrame,
    previousFrame,
    seekToFrame,
    addEvents,
    replay,

    // Helpers
    canAdvance: () => engineRef.current?.canAdvance() ?? false,
    canRewind: () => engineRef.current?.canRewind() ?? false,
    getEvents: () => engineRef.current?.getEventLog() ?? [],

    // Direct access (for advanced use)
    engine: engineRef.current,
  };
}

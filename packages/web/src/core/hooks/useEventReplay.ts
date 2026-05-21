// useEventReplay - Hook for replaying events from SimulationRuntime
// Enables session replay and debugging of learning interactions

import { useEffect, useCallback, useRef } from 'react';
import { SimulationRuntime } from '../runtimes/SimulationRuntime';
import { EventBus, LearningEvent } from '../events/EventBus';

export interface ReplayableSession {
  id: string;
  title: string;
  events: LearningEvent[];
  startTime: number;
  endTime: number;
}

export function useEventReplay(runtime: SimulationRuntime | null, eventBus: EventBus | null) {
  const sessionRef = useRef<ReplayableSession | null>(null);
  const replayRuntimeRef = useRef<SimulationRuntime | null>(null);

  // Start recording a session
  const startRecording = useCallback(
    (sessionTitle: string) => {
      if (!eventBus) return null;

      const session: ReplayableSession = {
        id: `session-${Date.now()}`,
        title: sessionTitle,
        events: [],
        startTime: Date.now(),
        endTime: 0,
      };

      // Subscribe to all events
      const unsubscribe = eventBus.on('*', (event: LearningEvent) => {
        session.events.push(event);
      });

      sessionRef.current = session;

      return {
        sessionId: session.id,
        stop: () => {
          unsubscribe();
          session.endTime = Date.now();
          return session;
        },
      };
    },
    [eventBus]
  );

  // Replay a session
  const replaySession = useCallback(
    (session: ReplayableSession, config: any = {}) => {
      // Create a fresh runtime for replay
      const replayRuntime = new SimulationRuntime(config);
      replayRuntimeRef.current = replayRuntime;

      // Replay events in order
      let eventIndex = 0;
      const eventTimings = session.events.map((event, idx) => {
        const timeDiff =
          idx === 0
            ? 0
            : event.timestamp - session.events[idx - 1].timestamp;
        return timeDiff;
      });

      const replay = () => {
        if (eventIndex >= session.events.length) {
          return { completed: true };
        }

        const event = session.events[eventIndex];
        const nextTiming = eventTimings[eventIndex];

        // Advance runtime based on event
        switch (event.type) {
          case 'scene_started':
            replayRuntime.loadScene(event.metadata?.sceneId);
            break;

          case 'node_selected':
            replayRuntime.selectNode(event.metadata?.nodeId);
            break;

          case 'interaction':
            replayRuntime.handleInteraction(event.metadata?.action);
            break;

          case 'quiz_submitted':
            replayRuntime.submitQuizAnswer(event.metadata);
            break;

          case 'concept_mastered':
            // Update internal state
            break;
        }

        eventIndex++;

        return {
          currentEvent: event,
          eventIndex,
          totalEvents: session.events.length,
          nextEventTiming: nextTiming,
          state: replayRuntime.getSnapshot(),
        };
      };

      return {
        replay,
        replayRuntime,
        totalEvents: session.events.length,
        jumpToEvent: (index: number) => {
          eventIndex = Math.max(0, Math.min(index, session.events.length - 1));
          return replay();
        },
      };
    },
    []
  );

  // Export session as JSON
  const exportSession = useCallback((session: ReplayableSession) => {
    return JSON.stringify(
      {
        ...session,
        duration: session.endTime - session.startTime,
        eventCount: session.events.length,
      },
      null,
      2
    );
  }, []);

  // Import session from JSON
  const importSession = useCallback((json: string): ReplayableSession | null => {
    try {
      const data = JSON.parse(json);
      return {
        id: data.id,
        title: data.title,
        events: data.events,
        startTime: data.startTime,
        endTime: data.endTime,
      };
    } catch {
      return null;
    }
  }, []);

  // Get session statistics
  const getSessionStats = useCallback((session: ReplayableSession) => {
    const stats = {
      duration: session.endTime - session.startTime,
      eventCount: session.events.length,
      eventsByType: {} as Record<string, number>,
      timeByType: {} as Record<string, number>,
    };

    session.events.forEach((event) => {
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
    });

    return stats;
  }, []);

  return {
    startRecording,
    replaySession,
    exportSession,
    importSession,
    getSessionStats,
    currentSession: sessionRef.current,
    replayRuntime: replayRuntimeRef.current,
  };
}

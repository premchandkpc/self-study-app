// useEventTracking - Bridge legacy visualizers to EventBus
// Enables event tracking for existing topics without rewrite

import { useEffect, useCallback, useRef } from 'react';
import { EventBus } from '../events/EventBus';

export interface StudyAppEvent {
  type: string;
  conceptId: string;
  topicName: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export function useEventTracking(
  topicName: string,
  conceptId: string,
  eventBus: EventBus | null
) {
  const sessionStartRef = useRef<number>(Date.now());
  const scenarioStartRef = useRef<number | null>(null);

  // Track topic/scenario start
  useEffect(() => {
    if (!eventBus) return;

    sessionStartRef.current = Date.now();

    eventBus.emit({
      type: 'topic_started',
      conceptId,
      timestamp: Date.now(),
      metadata: {
        topicName,
      },
    });

    return () => {
      const sessionDuration = Date.now() - sessionStartRef.current;
      eventBus.emit({
        type: 'topic_ended',
        conceptId,
        timestamp: Date.now(),
        metadata: {
          topicName,
          duration: sessionDuration,
        },
      });
    };
  }, [conceptId, topicName, eventBus]);

  // Track scenario/simulation start
  const startScenario = useCallback(
    (scenarioName: string, metadata?: Record<string, any>) => {
      if (!eventBus) return;

      scenarioStartRef.current = Date.now();

      eventBus.emit({
        type: 'scenario_started',
        conceptId,
        timestamp: Date.now(),
        metadata: {
          topicName,
          scenarioName,
          ...metadata,
        },
      });
    },
    [conceptId, topicName, eventBus]
  );

  // Track scenario completion
  const endScenario = useCallback(
    (success: boolean, metrics?: Record<string, any>) => {
      if (!eventBus || !scenarioStartRef.current) return;

      const duration = Date.now() - scenarioStartRef.current;

      eventBus.emit({
        type: 'scenario_completed',
        conceptId,
        timestamp: Date.now(),
        metadata: {
          topicName,
          success,
          duration,
          ...metrics,
        },
      });
    },
    [conceptId, topicName, eventBus]
  );

  // Track interaction events
  const trackInteraction = useCallback(
    (action: string, metadata?: Record<string, any>) => {
      if (!eventBus) return;

      eventBus.emit({
        type: 'interaction',
        conceptId,
        timestamp: Date.now(),
        metadata: {
          topicName,
          action,
          ...metadata,
        },
      });
    },
    [conceptId, topicName, eventBus]
  );

  // Track hint requests
  const trackHintRequested = useCallback(
    (hintLevel: number = 1) => {
      if (!eventBus) return;

      eventBus.emit({
        type: 'hint_requested',
        conceptId,
        timestamp: Date.now(),
        metadata: {
          topicName,
          hintLevel,
        },
      });
    },
    [conceptId, topicName, eventBus]
  );

  // Track quiz submission
  const trackQuizSubmission = useCallback(
    (score: number, maxScore: number = 100, answers?: any[]) => {
      if (!eventBus) return;

      const percentage = (score / maxScore) * 100;

      eventBus.emit({
        type: 'quiz_submitted',
        conceptId,
        timestamp: Date.now(),
        metadata: {
          topicName,
          score,
          maxScore,
          percentage: Math.round(percentage),
          answers,
        },
      });

      // Emit mastery event if high score
      if (percentage >= 80) {
        eventBus.emit({
          type: 'concept_mastered',
          conceptId,
          timestamp: Date.now(),
          metadata: {
            topicName,
            score: percentage,
          },
        });
      }
    },
    [conceptId, topicName, eventBus]
  );

  // Track struggle detection
  const trackStruggle = useCallback(
    (reason: string, attemptCount?: number) => {
      if (!eventBus) return;

      eventBus.emit({
        type: 'struggle_detected',
        conceptId,
        timestamp: Date.now(),
        metadata: {
          topicName,
          reason,
          attempts: attemptCount,
        },
      });
    },
    [conceptId, topicName, eventBus]
  );

  // Track performance metric
  const trackMetric = useCallback(
    (metricName: string, value: number, context?: Record<string, any>) => {
      if (!eventBus) return;

      eventBus.emit({
        type: 'metric_recorded',
        conceptId,
        timestamp: Date.now(),
        metadata: {
          topicName,
          metricName,
          value,
          ...context,
        },
      });
    },
    [conceptId, topicName, eventBus]
  );

  return {
    startScenario,
    endScenario,
    trackInteraction,
    trackHintRequested,
    trackQuizSubmission,
    trackStruggle,
    trackMetric,
  };
}

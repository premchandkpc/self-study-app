// LegacyVisualizerBridge - Wrap existing visualizers with event tracking
// Enables gradual migration to IR architecture without rewrite

import { ReactNode, useMemo } from 'react';
import { EventBus } from '../events/EventBus';
import { MasteryTracker } from '../analytics/MasteryTracker';
import { useEventTracking } from '../hooks/useEventTracking';
import { useEventReplay } from '../hooks/useEventReplay';
import { SimulationRuntime } from '../runtimes/SimulationRuntime';

export interface LegacyVisualizerBridgeProps {
  topicName: string;
  conceptId: string;
  children: ReactNode;
  eventBus: EventBus;
  enableReplay?: boolean;
}

export interface BridgeContext {
  // Event tracking
  trackInteraction: (action: string, metadata?: any) => void;
  trackHintRequested: (level?: number) => void;
  trackQuizSubmission: (score: number, maxScore?: number) => void;
  trackStruggle: (reason: string, attempts?: number) => void;
  trackMetric: (name: string, value: number, context?: any) => void;

  // Analytics
  getMastery: () => any;
  getMetrics: () => any;

  // Replay
  startRecording: (title: string) => any;
  stopRecording: () => any;

  // Runtime (for future use)
  runtime: SimulationRuntime | null;
}

/**
 * Wrap legacy visualizer to add event tracking
 * Usage:
 *   <LegacyVisualizerBridge topicName="BinarySearch" conceptId="binary-search">
 *     <LegacyVisualizer />
 *   </LegacyVisualizerBridge>
 */
export function LegacyVisualizerBridge({
  topicName,
  conceptId,
  children,
  eventBus,
  enableReplay = true,
}: LegacyVisualizerBridgeProps) {
  // Initialize tracking
  const eventTracking = useEventTracking(topicName, conceptId, eventBus);
  const eventReplay = useEventReplay(null, eventBus);
  const masteryTracker = useMemo(() => new MasteryTracker(), []);
  const runtime = useMemo(() => new SimulationRuntime({}), []);

  // Subscribe to events for mastery tracking
  useMemo(() => {
    eventBus.on('*', (event) => {
      masteryTracker.addEvent(event);
    });
  }, [eventBus, masteryTracker]);

  // Start recording if replay enabled
  useMemo(() => {
    if (enableReplay) {
      eventReplay.startRecording(`${topicName} session`);
    }
  }, [enableReplay, eventReplay, topicName]);

  const bridgeContext: BridgeContext = {
    // Event tracking
    trackInteraction: eventTracking.trackInteraction,
    trackHintRequested: eventTracking.trackHintRequested,
    trackQuizSubmission: eventTracking.trackQuizSubmission,
    trackStruggle: eventTracking.trackStruggle,
    trackMetric: eventTracking.trackMetric,

    // Analytics
    getMastery: () => masteryTracker.getMastery(conceptId),
    getMetrics: () => masteryTracker.getMetrics(),

    // Replay
    startRecording: eventReplay.startRecording,
    stopRecording: () => {
      const session = eventReplay.currentSession;
      return session;
    },

    // Runtime
    runtime,
  };

  // Inject bridge into context (would use React Context in real impl)
  // For now, expose via window for migration
  if (typeof window !== 'undefined') {
    (window as any).__studyLabBridge = bridgeContext;
  }

  return <>{children}</>;
}

/**
 * Helper to get bridge context in legacy components
 * Usage in legacy visualizer:
 *   const bridge = getBridgeContext();
 *   bridge?.trackInteraction('play', { scenario: 'example' });
 */
export function getBridgeContext(): BridgeContext | null {
  if (typeof window !== 'undefined') {
    return (window as any).__studyLabBridge || null;
  }
  return null;
}

/**
 * Example of how to integrate into existing visualizer:
 *
 * function LegacyBinarySearchVisualizer() {
 *   const handlePlayClick = () => {
 *     const bridge = getBridgeContext();
 *     bridge?.trackInteraction('simulation_started');
 *   };
 *
 *   const handleQuizSubmit = (score, maxScore) => {
 *     const bridge = getBridgeContext();
 *     bridge?.trackQuizSubmission(score, maxScore);
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handlePlayClick}>Play</button>
 *       <QuizComponent onSubmit={handleQuizSubmit} />
 *     </div>
 *   );
 * }
 *
 * // Then wrap it:
 * <LegacyVisualizerBridge
 *   topicName="BinarySearch"
 *   conceptId="binary-search"
 *   eventBus={eventBus}
 * >
 *   <LegacyBinarySearchVisualizer />
 * </LegacyVisualizerBridge>
 */

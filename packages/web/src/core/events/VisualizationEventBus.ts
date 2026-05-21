/**
 * VisualizationEventBus — Runtime events for visualization engine.
 * Extends EventBus with scene/simulation events.
 * Typed event system for event-driven architecture.
 */

import { EventBus, LearningEvent, LearningEventType } from './EventBus';
import type { SceneIR } from '../ir/VisualizationSchema';
import { TypedEventEmitter, EventMap } from './TypedEventEmitter';

/**
 * Runtime visualization events.
 * Emitted by SimulationRuntime, consumed by renderers.
 */
export interface VisualizationEvents extends EventMap {
  'scene:changed': { scene: SceneIR; sceneIndex: number; totalScenes: number };
  'metrics:updated': { metrics: Record<string, number | string> };
  'playback:play': {};
  'playback:pause': {};
  'playback:reset': { sceneIndex?: number };
  'playback:next': { sceneIndex: number };
  'playback:prev': { sceneIndex: number };
  'playback:seek': { sceneIndex: number };
  'speed:changed': { speed: number };
  'input:changed': { key: string; value: unknown };
  'error': { message: string; context?: Record<string, unknown> };
}

export type VisualizationEventType = keyof VisualizationEvents;

/**
 * Combined bus: Learning events + visualization events.
 */
export class VisualizationEventBus extends EventBus {
  private vizEmitter: TypedEventEmitter<VisualizationEvents>;

  constructor(userId?: string) {
    super(userId);
    this.vizEmitter = new TypedEventEmitter<VisualizationEvents>();
  }

  /**
   * Emit visualization event (typed).
   */
  emitVisualization<K extends keyof VisualizationEvents>(
    event: K,
    data: VisualizationEvents[K]
  ): void {
    this.vizEmitter.emit(event, data);

    // Also emit as learning event for analytics
    this.trackVisualization(event, data);
  }

  /**
   * Subscribe to visualization event (typed).
   */
  onVisualization<K extends keyof VisualizationEvents>(
    event: K,
    listener: (data: VisualizationEvents[K]) => void
  ): () => void {
    return this.vizEmitter.on(event, listener);
  }

  /**
   * Map visualization events to learning events for analytics.
   */
  private trackVisualization<K extends keyof VisualizationEvents>(
    event: K,
    data: VisualizationEvents[K]
  ): void {
    const type = String(event).toUpperCase() as LearningEventType;

    if (event === 'scene:changed') {
      const sceneData = data as VisualizationEvents['scene:changed'];
      this.track(type, sceneData.scene.id, {
        sceneIndex: sceneData.sceneIndex,
        sceneTitle: sceneData.scene.title,
      });
    } else if (event === 'metrics:updated') {
      const metricData = data as VisualizationEvents['metrics:updated'];
      this.track(type, 'metrics', metricData.metrics);
    } else if (event === 'error') {
      const errData = data as VisualizationEvents['error'];
      this.track(type, 'error', { message: errData.message, ...errData.context }, 0);
    } else {
      this.track(type, String(event), data as any);
    }
  }

  /**
   * Get visualization event listener count (for debugging).
   */
  getVisualizationListenerCount<K extends keyof VisualizationEvents>(
    event: K
  ): number {
    return this.vizEmitter.listenerCount(event);
  }

  /**
   * Clear all visualization listeners.
   */
  clearVisualizationListeners<K extends keyof VisualizationEvents>(
    event?: K
  ): void {
    if (event !== undefined) {
      this.vizEmitter.removeAllListeners(event);
    } else {
      this.vizEmitter.removeAllListeners();
    }
  }
}

// Hook: useSimulationRuntime
// Bridges runtime (pure JS) and React (UI)
// React becomes ONLY visualization layer

import { useEffect, useReducer, useRef, useCallback } from 'react';
import { SimulationRuntime } from '../runtimes/SimulationRuntime';
import { EventBus } from '../events/EventBus';
import { IRLearningUnit } from '../ir/schema';

export interface UseSimulationRuntimeOptions {
  learningUnit: IRLearningUnit;
  userId?: string;
  onMastery?: (conceptId: string) => void;
}

export function useSimulationRuntime(
  options: UseSimulationRuntimeOptions
) {
  const runtimeRef = useRef<SimulationRuntime | null>(null);
  const eventBusRef = useRef<EventBus | null>(null);

  // React state only for UI snapshots from runtime
  const [snapshot, dispatch] = useReducer(
    (state: any) => state,
    null,
    () => ({
      state: 'idle',
      sceneIndex: 0,
      scene: null,
      progress: 0,
      nodeStates: {},
    })
  );

  // Initialize runtimes once
  useEffect(() => {
    if (!runtimeRef.current) {
      runtimeRef.current = new SimulationRuntime({
        learningUnit: options.learningUnit,
      });

      eventBusRef.current = new EventBus(options.userId);

      // When runtime updates, notify React
      runtimeRef.current.on('stateChanged', (snapshot) => {
        dispatch(snapshot);
        eventBusRef.current?.track(
          'SCENE_VIEWED',
          options.learningUnit.id,
          { sceneIndex: snapshot.sceneIndex }
        );
      });

      // Track mastery when user advances past scene
      runtimeRef.current.on('SCENE_ADVANCED', () => {
        eventBusRef.current?.track(
          'CONCEPT_MASTERED',
          options.learningUnit.id,
          { sceneIndex: runtimeRef.current?.getSceneIndex() }
        );
        options.onMastery?.(options.learningUnit.id);
      });
    }

    return () => {
      // Keep runtime alive - don't cleanup on re-render
    };
  }, [options.learningUnit.id, options.userId, options.onMastery]);

  // User actions delegate to runtime (not React state)
  const advance = useCallback(() => {
    runtimeRef.current?.advance();
  }, []);

  const rewind = useCallback(() => {
    runtimeRef.current?.rewind();
  }, []);

  const selectNode = useCallback((nodeId: string) => {
    runtimeRef.current?.selectNode(nodeId);
    eventBusRef.current?.track('NODE_SELECTED', options.learningUnit.id, {
      nodeId,
    });
  }, [options.learningUnit.id]);

  const expandNode = useCallback((nodeId: string, data?: any) => {
    runtimeRef.current?.expandNode(nodeId, data);
  }, []);

  const jumpToScene = useCallback((index: number) => {
    runtimeRef.current?.jumpToScene(index);
  }, []);

  const reset = useCallback(() => {
    runtimeRef.current?.reset();
  }, []);

  const requestHelp = useCallback(() => {
    eventBusRef.current?.track('HELP_REQUESTED', options.learningUnit.id);
  }, [options.learningUnit.id]);

  return {
    // Runtime state (read-only to React)
    snapshot,
    scene: snapshot.scene,
    progress: snapshot.progress,
    state: snapshot.state,
    sceneIndex: snapshot.sceneIndex,
    nodeStates: snapshot.nodeStates,

    // Actions
    advance,
    rewind,
    jumpToScene,
    selectNode,
    expandNode,
    reset,
    requestHelp,

    // Direct access for advanced usage
    runtime: runtimeRef.current,
    eventBus: eventBusRef.current,

    // Analytics
    getStats: () =>
      eventBusRef.current?.export() ?? {
        events: [],
        sessionDuration: 0,
        masteredConcepts: [],
      },
  };
}

// Hook: useRuntimeValue - Fine-grained subscriptions
// SOLVES: Re-render cascade from snapshot updates
// Result: Only component subscribing to changed value re-renders

import { useEffect, useRef, useState } from 'react';
import { SimulationRuntime } from '../runtimes/SimulationRuntime';
import { KnowledgeGraph } from '../graph/KnowledgeGraph';
import { EventBus } from '../events/EventBus';
import { CognitiveRenderingEngine } from '../engines/CognitiveRenderingEngine';

type RuntimeType = SimulationRuntime | EventBus | KnowledgeGraph | CognitiveRenderingEngine;

export function useRuntimeValue<T extends RuntimeType, K extends string>(
  runtime: T | null,
  key: K
): any {
  const [value, setValue] = useState<any>(() => {
    if (!runtime) return null;
    return (runtime as any)[key] ?? null;
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!runtime) {
      setValue(null);
      return;
    }

    // Get initial value
    setValue((runtime as any)[key] ?? null);

    // Subscribe to changes for this specific key only
    const unsubscribe = (runtime as any).on(`${key}:changed`, (newValue: any) => {
      setValue(newValue);
    });

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      unsubscribeRef.current?.();
    };
  }, [runtime, key]);

  return value;
}

// Specialized hooks for common patterns

export function useSimulationProgress(runtime: SimulationRuntime | null) {
  return useRuntimeValue(runtime, 'progress');
}

export function useSimulationScene(runtime: SimulationRuntime | null) {
  return useRuntimeValue(runtime, 'scene');
}

export function useSimulationState(runtime: SimulationRuntime | null) {
  return useRuntimeValue(runtime, 'state');
}

export function useSimulationSceneIndex(runtime: SimulationRuntime | null) {
  return useRuntimeValue(runtime, 'sceneIndex');
}

export function useEventLogStats(eventBus: EventBus | null) {
  return useRuntimeValue(eventBus, 'stats');
}

export function useKnowledgeGraphNode(graph: KnowledgeGraph | null, nodeId: string) {
  const [node, setNode] = useState(() => graph?.getConcept(nodeId) ?? null);

  useEffect(() => {
    if (!graph) {
      setNode(null);
      return;
    }

    setNode(graph.getConcept(nodeId) ?? null);

    // In real implementation, would subscribe to graph updates
    // For now, static lookup
    return () => {};
  }, [graph, nodeId]);

  return node;
}

// Batch subscription for related values (still fine-grained)
export function useRuntimeValues<T extends RuntimeType>(
  runtime: T | null,
  keys: string[]
): Record<string, any> {
  const [values, setValues] = useState<Record<string, any>>(() => {
    if (!runtime) return {};
    return keys.reduce(
      (acc, key) => {
        acc[key] = (runtime as any)[key] ?? null;
        return acc;
      },
      {} as Record<string, any>
    );
  });

  const unsubscribesRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!runtime) {
      setValues({});
      return;
    }

    // Subscribe to each key
    const newUnsubscribes: Array<() => void> = [];

    keys.forEach((key) => {
      const unsubscribe = (runtime as any).on(`${key}:changed`, (newValue: any) => {
        setValues((prev) => ({
          ...prev,
          [key]: newValue,
        }));
      });
      newUnsubscribes.push(unsubscribe);
    });

    unsubscribesRef.current = newUnsubscribes;

    return () => {
      unsubscribesRef.current.forEach((unsub) => unsub());
    };
  }, [runtime, keys.join(',')]); // Simplified dependency

  return values;
}

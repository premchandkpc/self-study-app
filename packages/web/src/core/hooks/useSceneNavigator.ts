/**
 * useSceneNavigator — Stateless scene navigation for SceneIR sequences.
 * Replaces useIRSceneNavigator with better filtering, search, and metadata support.
 */

import { useState, useCallback, useEffect } from 'react';
import type { SceneIR, SceneNavigator } from '../ir/VisualizationSchema';

export interface UseSceneNavigatorOptions {
  initialIndex?: number;
  loop?: boolean;
  onSceneChange?: (scene: SceneIR, index: number) => void;
}

export function useSceneNavigator(
  scenes: SceneIR[] | null | undefined,
  options: UseSceneNavigatorOptions = {}
): SceneNavigator {
  const { initialIndex = 0, loop = false, onSceneChange } = options;

  const [sceneIndex, setSceneIndex] = useState(initialIndex);

  const validScenes = scenes && Array.isArray(scenes) ? scenes : [];
  const currentScene = validScenes[sceneIndex] || null;

  // Reset on scenes change
  useEffect(() => {
    setSceneIndex(Math.min(initialIndex, validScenes.length - 1));
  }, [scenes, initialIndex, validScenes.length]);

  // Notify on scene change
  useEffect(() => {
    if (currentScene && onSceneChange) {
      onSceneChange(currentScene, sceneIndex);
    }
  }, [currentScene, sceneIndex, onSceneChange]);

  const next = useCallback(() => {
    setSceneIndex((prev) => {
      const next = prev + 1;
      if (next >= validScenes.length) {
        return loop ? 0 : prev;
      }
      return next;
    });
  }, [validScenes.length, loop]);

  const prev = useCallback(() => {
    setSceneIndex((prev) => {
      const next = prev - 1;
      if (next < 0) {
        return loop ? validScenes.length - 1 : 0;
      }
      return next;
    });
  }, [validScenes.length, loop]);

  const select = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, validScenes.length - 1));
    setSceneIndex(clamped);
  }, [validScenes.length]);

  const jump = useCallback(
    (filter: (scene: SceneIR) => boolean) => {
      const idx = validScenes.findIndex(filter);
      if (idx >= 0) {
        setSceneIndex(idx);
      }
    },
    [validScenes]
  );

  const canNext = sceneIndex < validScenes.length - 1;
  const canPrev = sceneIndex > 0;

  return {
    // State
    sceneIndex,
    totalScenes: validScenes.length,
    currentScene,
    canNext,
    canPrev,

    // Methods
    next,
    prev,
    select,
    jump,
  };
}

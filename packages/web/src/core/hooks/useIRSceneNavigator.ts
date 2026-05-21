// Hook: useIRSceneNavigator - Navigate through compiled IR scenes
// Usage: const { currentScene, next, prev, select } = useIRSceneNavigator(irUnit)

import { useState, useCallback, useEffect } from 'react';
import { IRLearningUnit, IRScene } from '../ir/schema';

export function useIRSceneNavigator(irUnit: IRLearningUnit | null) {
  const [sceneIndex, setSceneIndex] = useState(0);

  useEffect(() => {
    setSceneIndex(0); // Reset on unit change
  }, [irUnit?.id]);

  const currentScene = irUnit?.scenes?.[sceneIndex] || null;

  const next = useCallback(() => {
    if (!irUnit) return;
    setSceneIndex((prev) => Math.min(prev + 1, irUnit.scenes.length - 1));
  }, [irUnit]);

  const prev = useCallback(() => {
    setSceneIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const select = useCallback((idx: number) => {
    if (!irUnit) return;
    setSceneIndex(Math.max(0, Math.min(idx, irUnit.scenes.length - 1)));
  }, [irUnit]);

  const canNext = sceneIndex < (irUnit?.scenes.length ?? 0) - 1;
  const canPrev = sceneIndex > 0;

  return {
    currentScene,
    sceneIndex,
    totalScenes: irUnit?.scenes.length ?? 0,
    next,
    prev,
    select,
    canNext,
    canPrev,
  };
}

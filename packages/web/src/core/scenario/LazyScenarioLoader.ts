/**
 * LazyScenarioLoader — Defers scenario building to avoid main-thread blocking.
 * Routes to Worker for heavy scenarios, React.lazy for light scenarios.
 */

import type { ScenarioDescriptor, SceneIR } from '../ir/VisualizationSchema';
import { adaptLegacyScenarioBuilder } from '../ir/LegacyAdapter';

/**
 * Markers for scenario complexity.
 * Heavy scenarios should run in worker.
 */
const HEAVY_SCENARIOS = new Set([
  'uber',
  'whatsapp',
  'instagram',
  'kafka',
  'microservices',
  'security',
  'transaction',
  'mvc',
  'jpa',
  'cloud',
  'aop',
  'ioc',
  'pipeline',
  'reduce',
  'collectors',
]);

const COMPLEXITY_THRESHOLD = 50; // Node degree threshold

/**
 * Wrap a scenario builder to defer execution.
 * - Light scenarios: React.lazy load
 * - Heavy scenarios: Worker offload
 * - Default: Main thread (for simplicity in phase 1)
 */
export function lazyScenarioBuilder(
  scenario: ScenarioDescriptor
): (params?: Record<string, unknown>) => Promise<SceneIR[]> {
  const isHeavy = isHeavyScenario(scenario);

  return async (params?: Record<string, unknown>): Promise<SceneIR[]> => {
    // Phase 1: Main thread (no worker integration yet)
    // Phase 3: Offload to worker

    // Check if builder returns legacy shape or SceneIR
    const result = scenario.build(params);
    const scenes = await Promise.resolve(result);

    // If builder returns legacy shape, adapt it
    if (scenes.length > 0 && !isSceneIR(scenes[0])) {
      return adaptLegacyScenarioBuilder(() => scenes as Record<string, unknown>[])();
    }

    return scenes as SceneIR[];
  };
}

/**
 * Check if scenario should run in worker.
 * Heuristics: name, estimated complexity.
 */
function isHeavyScenario(scenario: ScenarioDescriptor): boolean {
  // Named scenarios are typically heavy
  if (HEAVY_SCENARIOS.has(scenario.id)) return true;

  // Heuristic: if scenario has many inputs, probably complex build
  const inputCount = scenario.inputs?.length ?? 0;
  if (inputCount > 5) return true;

  return false;
}

/**
 * Check if object is SceneIR (has id, visualization, content).
 */
function isSceneIR(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const scene = obj as Record<string, unknown>;
  return (
    typeof scene.id === 'string' &&
    scene.visualization !== undefined &&
    scene.content !== undefined
  );
}

/**
 * Worker wrapper (Phase 3).
 * Offloads scenario building to worker thread.
 * Stub for now.
 */
export async function buildScenarioInWorker(
  scenarioId: string,
  buildFn: (params?: Record<string, unknown>) => Record<string, unknown>[],
  params?: Record<string, unknown>
): Promise<SceneIR[]> {
  // TODO: Implement worker communication
  // For now, just call main thread
  const result = buildFn(params);
  if (result.length > 0 && !isSceneIR(result[0])) {
    return adaptLegacyScenarioBuilder(() => result)();
  }
  return result as SceneIR[];
}

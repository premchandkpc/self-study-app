// Hook: useLegacyScenarioIR - Convert legacy scenarios to IR on-demand
// Usage: const ir = useLegacyScenarioIR(scenario, technology)

import { useCallback } from 'react';
import { ScenarioAdapter } from '../ir/adapters/scenarioAdapter';
import { ContentCompiler } from '../ir/contentCompiler';
import { LegacyScenario, IRLearningUnit } from '../ir/schema';

export function useLegacyScenarioIR() {
  const compiler = new ContentCompiler();

  const compile = useCallback(
    (scenario: LegacyScenario, technology: string): IRLearningUnit => {
      // Convert legacy scenario → IR via adapter + compiler
      const ir = ScenarioAdapter.fromLegacy(scenario, technology);
      return ir;
    },
    [compiler]
  );

  const compileMultiple = useCallback(
    (scenarios: LegacyScenario[], technology: string): IRLearningUnit[] => {
      return scenarios.map((s) => compile(s, technology));
    },
    [compile]
  );

  return { compile, compileMultiple };
}

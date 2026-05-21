// Migration helper: Converts legacy scenario arrays → IR LearningUnits
// Usage: migrateLegacyScenarios(AOP_SCENARIOS, 'spring')

import { LegacyScenario, IRLearningUnit } from '../schema';
import { ScenarioAdapter } from './scenarioAdapter';

export class LegacyMigration {
  static migrateScenarioGroup(
    scenarios: LegacyScenario[],
    technology: string,
    parentId?: string
  ): IRLearningUnit[] {
    return scenarios.map((scenario, idx) =>
      this.migrateScenario(scenario, technology, parentId)
    );
  }

  private static migrateScenario(
    scenario: LegacyScenario,
    technology: string,
    parentId?: string
  ): IRLearningUnit {
    const ir = ScenarioAdapter.fromLegacy(scenario, technology);

    // Add parent context if provided (for breadcrumb/nav)
    if (parentId && ir.metadata) {
      ir.metadata.parentUnit = parentId;
    }

    return ir;
  }

  // Batch migration with progress tracking
  static *migrateLegacyScenariosBatch(
    scenarios: LegacyScenario[],
    technology: string
  ): Generator<{ progress: number; unit: IRLearningUnit }> {
    const total = scenarios.length;

    scenarios.forEach((scenario, idx) => {
      const unit = ScenarioAdapter.fromLegacy(scenario, technology);
      yield {
        progress: ((idx + 1) / total) * 100,
        unit,
      };
    });
  }
}

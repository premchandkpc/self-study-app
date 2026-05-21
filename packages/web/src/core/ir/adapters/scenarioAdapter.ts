// Converts legacy scenario format (hardcoded in .js) → IRLearningUnit
// One-time migration: each legacy scenario → semantic IR

import { LegacyScenario, IRLearningUnit, IRScene, IRNode, IREdge, PrimitiveType } from '../schema';

export class ScenarioAdapter {
  static fromLegacy(scenario: LegacyScenario, technology: string): IRLearningUnit {
    const steps = scenario.build();

    // Parse steps to extract concept progression
    const scenes = this.stepsToScenes(steps, scenario);

    return {
      id: scenario.id,
      title: scenario.label,
      concept: scenario.category,
      difficulty: 3, // Default; should be configurable
      prerequisites: [],
      scenes,
      interactions: [],
      metadata: {
        technology,
        domain: scenario.category,
        keywords: scenario.code ? this.extractKeywords(scenario.code) : [],
      },
    };
  }

  private static stepsToScenes(
    steps: Array<any>,
    scenario: LegacyScenario
  ): IRScene[] {
    // Each major step → one scene showing state at that moment
    // For now: pipeline showing sequential progression

    const scenes: IRScene[] = [];

    steps.forEach((step, idx) => {
      const nodes: IRNode[] = [];
      const edges: IREdge[] = [];

      // If step has stages, convert to nodes
      if (step.stages && Array.isArray(step.stages)) {
        step.stages.forEach((stage: any, stageIdx: number) => {
          nodes.push({
            id: `stage-${idx}-${stageIdx}`,
            type: 'pipeline',
            label: stage.op || `Step ${stageIdx}`,
            state: stage.active ? 'active' : 'idle',
            metadata: {
              type: stage.type,
              items: stage.items,
              description: step.description,
            },
          });

          // Connect to previous stage
          if (stageIdx > 0) {
            edges.push({
              id: `edge-${idx}-${stageIdx - 1}-${stageIdx}`,
              from: `stage-${idx}-${stageIdx - 1}`,
              to: `stage-${idx}-${stageIdx}`,
              type: 'flow',
            });
          }
        });
      }

      // Fallback: just represent step as single node
      if (nodes.length === 0) {
        nodes.push({
          id: `step-${idx}`,
          type: 'pipeline',
          label: step.title || `${scenario.label} - Step ${idx}`,
          state: 'idle',
          metadata: {
            description: step.description,
            result: step.result,
            opsLog: step.opsLog,
          },
        });
      }

      scenes.push({
        id: `${scenario.id}-scene-${idx}`,
        type: 'pipeline',
        title: step.description || `${scenario.label} - Step ${idx}`,
        nodes,
        edges,
        layout: 'hierarchical',
      });
    });

    return scenes.length > 0
      ? scenes
      : [
          {
            id: `${scenario.id}-default`,
            type: 'pipeline',
            title: scenario.label,
            nodes: [
              {
                id: `node-${scenario.id}`,
                type: 'pipeline',
                label: scenario.label,
                state: 'idle',
              },
            ],
            edges: [],
          },
        ];
  }

  private static extractKeywords(code: string[]): string[] {
    const keywords = new Set<string>();
    const javaKeywords = /\b(class|interface|public|private|protected|final|synchronized|volatile|transient|static|final|abstract|extends|implements|throws|new|instanceof|return|break|continue|this|super|new|@|@Transactional|@Service|@Repository|@Controller)\b/g;

    code.forEach((line) => {
      const matches = line.match(javaKeywords);
      if (matches) {
        matches.forEach((m) => {
          if (!m.startsWith('@')) keywords.add(m);
        });
      }
    });

    // Also extract class/method names (simple heuristic)
    code.forEach((line) => {
      const classMatch = line.match(/\b([A-Z][a-zA-Z0-9]*)\b/g);
      if (classMatch) {
        classMatch.forEach((c) => keywords.add(c));
      }
    });

    return Array.from(keywords).slice(0, 10);
  }
}

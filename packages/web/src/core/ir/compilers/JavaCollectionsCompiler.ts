// Java Collections → IR Compiler
// Converts Java Collections scenarios to generic IR

import { ContentCompiler, TechnologyContent } from '../contentCompiler';
import { IRLearningUnit } from '../schema';

export interface JavaCollectionsScenario {
  id: string;
  label: string;
  collectionType: 'arraylist' | 'linkedlist' | 'hashmap' | 'hashset' | 'treemap' | 'priorityqueue' | 'arraydeque' | 'concurrent' | 'copyonwritearraylist';
  category: 'flow' | 'edge' | 'concurrency' | 'exception';
  icon: string;
  code: string;
  language: string;
  steps: any[];
}

export class JavaCollectionsCompiler extends ContentCompiler {
  compileScenario(scenario: JavaCollectionsScenario): IRLearningUnit {
    const content: TechnologyContent = {
      id: scenario.id,
      title: scenario.label,
      technology: 'java-collections',
      domain: 'data-structures',
      concept: this.getConcept(scenario.collectionType),
      difficulty: this.inferDifficulty(scenario),
      structure: {
        steps: scenario.steps.map((step, i) => ({
          title: step.title || `Step ${i + 1}`,
          description: step.description || step.msg || '',
          nodes: this.extractNodesFromStep(step),
          edges: this.extractEdgesFromStep(step),
          animate: this.extractAnimationsFromStep(step, i),
        })),
      },
    };

    return this.compile(content);
  }

  private getConcept(collectionType: string): string {
    const mapping: Record<string, string> = {
      arraylist: 'dynamic-array',
      linkedlist: 'linked-structure',
      hashmap: 'hash-table',
      hashset: 'hash-set',
      treemap: 'balanced-tree',
      priorityqueue: 'heap',
      arraydeque: 'double-queue',
      concurrent: 'thread-safe-map',
      copyonwritearraylist: 'copy-on-write',
    };
    return mapping[collectionType] || 'data-structure';
  }

  private inferDifficulty(scenario: JavaCollectionsScenario): 1 | 2 | 3 | 4 | 5 {
    const base: Record<string, number> = {
      arraylist: 1,
      linkedlist: 1,
      hashmap: 2,
      hashset: 2,
      treemap: 3,
      priorityqueue: 3,
      arraydeque: 2,
      concurrent: 4,
      copyonwritearraylist: 4,
    };

    const categoryBoost: Record<string, number> = {
      flow: 0,
      edge: 1,
      concurrency: 2,
      exception: 1,
    };

    const difficulty = base[scenario.collectionType] || 2;
    const boosted = Math.min(5, difficulty + (categoryBoost[scenario.category] || 0));
    return boosted as 1 | 2 | 3 | 4 | 5;
  }

  private extractNodesFromStep(step: any) {
    // Extract visual nodes from visualization step
    const nodes = [];

    // If step has cells (for array-like structures)
    if (step.cells) {
      step.cells.forEach((cell: any, i: number) => {
        if (cell.val !== null && cell.state !== 'null') {
          nodes.push({
            id: `cell-${i}`,
            label: String(cell.val),
            type: 'queue',
            state: cell.state || 'idle',
          });
        }
      });
    }

    // If step has size/capacity (for collections)
    if (step.size !== undefined) {
      nodes.push({
        id: 'metadata-size',
        label: `size: ${step.size}`,
        type: 'queue',
        state: 'idle',
      });
    }

    return nodes.length > 0 ? nodes : [{ id: 'placeholder', label: 'View', type: 'queue', state: 'idle' }];
  }

  private extractEdgesFromStep(step: any) {
    // Extract relationships between nodes
    const edges = [];

    // Sequential edges between cells (for array/list visualization)
    if (step.cells) {
      for (let i = 0; i < step.cells.length - 1; i++) {
        const current = step.cells[i];
        const next = step.cells[i + 1];

        if (current.val !== null && next.val !== null && current.state !== 'null' && next.state !== 'null') {
          edges.push({
            from: `cell-${i}`,
            to: `cell-${i + 1}`,
            label: 'next',
            type: 'flow',
          });
        }
      }
    }

    return edges;
  }

  private extractAnimationsFromStep(step: any, stepIndex: number) {
    if (!step.cells) return undefined;

    const animationSteps = step.cells
      .map((cell: any, i: number) => {
        let action = 'idle';
        if (cell.state === 'active') action = 'highlight';
        if (cell.state === 'new') action = 'reveal';
        if (cell.state === 'shifting' || cell.state === 'copying') action = 'move';
        if (cell.state === 'removed') action = 'fade';

        return {
          target: 'node' as const,
          id: `cell-${i}`,
          action: action as any,
          duration: 300,
          delay: i * 100,
        };
      })
      .filter((a) => a.action !== 'idle');

    if (animationSteps.length === 0) return undefined;
    return animationSteps;
  }

  protected mapTechnologyToPrimitive(technology: string, concept: string): any {
    const mapping: Record<string, Record<string, string>> = {
      'java-collections': {
        'dynamic-array': 'queue',
        'linked-structure': 'graph',
        'hash-table': 'table',
        'hash-set': 'graph',
        'balanced-tree': 'tree',
        'heap': 'state_machine',
        'double-queue': 'queue',
        'thread-safe-map': 'state_machine',
        'copy-on-write': 'timeline',
      },
    };

    return mapping[technology]?.[concept] || 'pipeline';
  }
}

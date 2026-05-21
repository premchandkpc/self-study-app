// Content Compiler: Converts technology-specific content to generic IR
// Example: Kafka content → Event Pipeline primitives

import {
  IRLearningUnit,
  IRScene,
  IRNode,
  IREdge,
  IRAnimation,
  IRAnimationStep,
} from './schema';

export interface TechnologyContent {
  id: string;
  title: string;
  technology: string;
  domain: string;
  concept: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  structure: any; // technology-specific structure
}

export class ContentCompiler {
  compile(content: TechnologyContent): IRLearningUnit {
    const abstractType = this.mapTechnologyToPrimitive(content.technology, content.concept);

    return {
      id: content.id,
      title: content.title,
      concept: content.concept,
      difficulty: content.difficulty,
      prerequisites: this.inferPrerequisites(content),
      scenes: this.compileScenes(content, abstractType),
      interactions: [],
      metadata: {
        technology: content.technology,
        domain: content.domain,
      },
    };
  }

  private mapTechnologyToPrimitive(
    technology: string,
    concept: string
  ): 'pipeline' | 'queue' | 'graph' | 'state_machine' {
    // Map specific technologies to abstract primitives
    const mapping: Record<string, Record<string, any>> = {
      kafka: {
        'pub-sub': 'pipeline',
        'partitioning': 'pipeline',
        'replication': 'graph',
        'consumer-group': 'queue',
      },
      redis: {
        'list': 'queue',
        'hash': 'table',
        'set': 'graph',
        'sorted-set': 'matrix',
      },
      concurrent: {
        'thread': 'state_machine',
        'lock': 'queue',
        'semaphore': 'state_machine',
      },
      distributed: {
        'consensus': 'state_machine',
        'replication': 'graph',
        'sharding': 'graph',
      },
    };

    return mapping[technology]?.[concept] || 'pipeline';
  }

  private inferPrerequisites(content: TechnologyContent): string[] {
    // Infer what concepts must be learned first
    const difficulty = content.difficulty;
    const prerequisites: string[] = [];

    if (difficulty >= 2) prerequisites.push('basic-data-structures');
    if (difficulty >= 3) prerequisites.push('networking');
    if (difficulty >= 4) prerequisites.push('distributed-systems');
    if (content.technology === 'kafka') prerequisites.push('event-driven-architecture');

    return prerequisites;
  }

  private compileScenes(content: TechnologyContent, primitiveType: string): IRScene[] {
    // Convert technology-specific structure to generic scenes
    const scenes: IRScene[] = [];

    // Progressive revelation: break into cognitive chunks
    const steps = this.decomposeIntoSteps(content.structure);

    steps.forEach((step, index) => {
      scenes.push({
        id: `scene-${index}`,
        type: primitiveType as any,
        title: `Step ${index + 1}: ${step.title}`,
        description: step.description,
        nodes: this.extractNodes(step),
        edges: this.extractEdges(step),
        layout: 'hierarchical',
        animation: this.generateAnimation(step, index),
      });
    });

    return scenes;
  }

  private decomposeIntoSteps(structure: any): any[] {
    // Break down complex structure into progressive steps
    // This prevents cognitive overload
    return structure.steps || [structure];
  }

  private extractNodes(step: any): IRNode[] {
    // Generic node extraction from technology-specific structure
    if (!step.nodes) return [];

    return step.nodes.map((n: any) => ({
      id: n.id,
      type: n.type || 'queue',
      label: n.label || n.name,
      state: 'idle' as const,
      metadata: n.metadata || {},
      data: n.data,
    }));
  }

  private extractEdges(step: any): IREdge[] {
    if (!step.edges) return [];

    return step.edges.map((e: any) => ({
      id: e.id || `${e.from}-${e.to}`,
      from: e.from,
      to: e.to,
      type: 'flow' as const,
      label: e.label,
    }));
  }

  private generateAnimation(step: any, stepIndex: number): IRAnimation | undefined {
    if (!step.animate) return undefined;

    const animationSteps: IRAnimationStep[] = step.animate.map((a: any, i: number) => ({
      target: a.target || 'node',
      id: a.id,
      action: a.action || 'highlight',
      duration: a.duration || 500,
      delay: i * 200,
    }));

    return {
      duration: animationSteps.reduce((sum, s) => sum + s.duration + (s.delay || 0), 0),
      steps: animationSteps,
      loop: false,
    };
  }
}

import type { SemanticGraph } from '../semantic/SemanticGraph'
import { ConceptRegistry } from './ConceptRegistry'
import type { RuntimeEvent, EventType } from '../runtime/events/Event'
import { generateNarration } from '../narrative/templates'

export interface SemanticEvent extends RuntimeEvent {
  concept: string
  category: string
  complexity: string
  importance: number
  explanation: string
  interviewRelevant?: boolean
  whyItMatters?: string
  learningObjective?: string
}

export class ConceptEnricher {
  private semanticGraph: SemanticGraph
  private registry: ConceptRegistry

  constructor(semanticGraph: SemanticGraph, registry?: ConceptRegistry) {
    this.semanticGraph = semanticGraph
    this.registry = registry ?? new ConceptRegistry()
  }

  enrich(event: RuntimeEvent): SemanticEvent {
    const mapping = this.registry.getMapping(event.type)
    if (mapping) {
      return {
        ...event,
        concept: mapping.concept,
        category: mapping.category,
        complexity: mapping.complexity,
        importance: mapping.importance,
        explanation: event.explanation ?? generateNarration(event),
        interviewRelevant: mapping.interviewRelevant,
        whyItMatters: mapping.whyItMatters,
        learningObjective: `Understand how ${mapping.concept} works in this context`,
      }
    }
    return {
      ...event,
      concept: 'custom',
      category: 'general',
      complexity: 'unknown',
      importance: 0.3,
      explanation: event.explanation ?? generateNarration(event),
    }
  }

  enrichBatch(events: RuntimeEvent[]): SemanticEvent[] {
    return events.map(e => this.enrich(e))
  }

  getRegistry(): ConceptRegistry {
    return this.registry
  }
}

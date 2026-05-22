import type { EntityKind } from '../runtime/primitives/Entity'
import type { ConceptName, Complexity, ConceptCategory } from './concepts'

export interface SemanticNode {
  id: string
  kind: EntityKind
  type: string
  concept: ConceptName
  category: ConceptCategory
  complexity: Complexity
  importance: number
  interviewRelevant: boolean
  whyItMatters?: string
  prerequisites: string[]
  relatedConcepts: string[]
  embedding?: number[]
  keywords: string[]
  llmPrompt?: string
}

export function createSemanticNode(
  id: string,
  kind: EntityKind,
  type: string,
  concept: ConceptName,
  category: ConceptCategory,
  overrides?: Partial<SemanticNode>,
): SemanticNode {
  return {
    id,
    kind,
    type,
    concept,
    category,
    complexity: overrides?.complexity ?? 'O(n)',
    importance: overrides?.importance ?? 0.5,
    interviewRelevant: overrides?.interviewRelevant ?? false,
    whyItMatters: overrides?.whyItMatters,
    prerequisites: overrides?.prerequisites ?? [],
    relatedConcepts: overrides?.relatedConcepts ?? [],
    keywords: overrides?.keywords ?? [],
    llmPrompt: overrides?.llmPrompt,
    ...(overrides?.embedding ? { embedding: overrides.embedding } : {}),
  }
}

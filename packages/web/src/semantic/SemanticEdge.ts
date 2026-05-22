export type RelationshipType =
  | 'prerequisite' | 'depends-on' | 'related-to'
  | 'implements' | 'extends' | 'specializes'
  | 'part-of' | 'contains' | 'produces' | 'consumes'
  | 'synchronizes-with' | 'conflicts-with'
  | 'flows-to' | 'transforms-to'
  | 'custom'

export interface SemanticEdge {
  id: string
  from: string
  to: string
  relationship: RelationshipType
  weight: number
  description?: string
  metadata?: Record<string, unknown>
}

export function createSemanticEdge(
  from: string,
  to: string,
  relationship: RelationshipType,
  overrides?: Partial<SemanticEdge>,
): SemanticEdge {
  return {
    id: `${from}--${relationship}-->${to}`,
    from,
    to,
    relationship,
    weight: overrides?.weight ?? 1,
    description: overrides?.description,
    metadata: overrides?.metadata,
  }
}

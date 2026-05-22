export interface EntityDefinition {
  id: string
  kind: string
  type: string
  properties: Record<string, unknown>
  labels?: Record<string, string>
  position?: { x: number; y: number }
}

export interface EventProducerDefinition {
  type: 'algorithm' | 'script' | 'ai' | 'manual' | 'replay'
  source: string
  config?: Record<string, unknown>
}

export interface TimelineDefinition {
  maxFrames?: number
  autoPlay?: boolean
  speed?: number
  loop?: boolean
}

export interface ConceptReference {
  id: string
  mapping: string
  importance?: number
}

export interface NarrationDefinition {
  enabled: boolean
  depth?: 'shallow' | 'medium' | 'deep'
  voice?: string
}

export interface LayoutDefinition {
  type: 'grid' | 'force-directed' | 'tree' | 'circular' | 'layered'
  spacing?: number
  padding?: number
}

export interface SimulationDefinition {
  id: string
  name: string
  description: string
  version: string
  domain: 'sorting' | 'kafka' | 'jvm' | 'raft' | 'network' | 'os' | 'ai' | 'custom' | 'database' | 'concurrency' | 'distributed' | 'graph'
  initialState: EntityDefinition[]
  producers: EventProducerDefinition[]
  timeline: TimelineDefinition
  concepts?: ConceptReference[]
  narration?: NarrationDefinition
  layout?: LayoutDefinition
}

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  severity: ValidationSeverity
  message: string
  path: string
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
}

import type { SimulationDefinition, ValidationResult, ValidationIssue } from './SimulationDSL'
import { Graph } from '../runtime'
import { Entity } from '../runtime'

export class DSLParser {
  parse(simDef: SimulationDefinition): {
    graph: Graph
    timeline: { maxFrames?: number; autoPlay?: boolean; speed?: number; loop?: boolean }
    layout: { type: string; spacing?: number; padding?: number }
    narration: { enabled: boolean; depth?: string }
  } {
    const graph = new Graph()
    for (const entityDef of simDef.initialState) {
      const entity = new Entity(entityDef.id, entityDef.kind, entityDef.type)
      for (const [key, value] of Object.entries(entityDef.properties)) {
        entity.set(key, value)
      }
      graph.addEntity(entity)
    }
    return {
      graph,
      timeline: simDef.timeline,
      layout: simDef.layout ?? { type: 'grid' },
      narration: simDef.narration ?? { enabled: true, depth: 'medium' },
    }
  }

  validate(simDef: SimulationDefinition): ValidationResult {
    const issues: ValidationIssue[] = []
    if (!simDef.id) issues.push({ severity: 'error', message: 'Simulation ID is required', path: 'id' })
    if (!simDef.name) issues.push({ severity: 'error', message: 'Simulation name is required', path: 'name' })
    if (!simDef.domain) issues.push({ severity: 'error', message: 'Domain is required', path: 'domain' })
    if (!simDef.initialState || simDef.initialState.length === 0) {
      issues.push({ severity: 'warning', message: 'No initial entities defined', path: 'initialState' })
    }
    for (let i = 0; i < simDef.initialState.length; i++) {
      const e = simDef.initialState[i]
      if (!e.id) issues.push({ severity: 'error', message: `Entity at index ${i} missing id`, path: `initialState[${i}].id` })
      if (!e.kind) issues.push({ severity: 'error', message: `Entity "${e.id}" missing kind`, path: `initialState[${i}].kind` })
    }
    const validDomains = ['sorting', 'kafka', 'jvm', 'raft', 'network', 'os', 'ai', 'custom', 'database', 'concurrency', 'distributed', 'graph']
    if (!validDomains.includes(simDef.domain)) {
      issues.push({ severity: 'warning', message: `Unknown domain "${simDef.domain}"`, path: 'domain' })
    }
    return { valid: issues.filter(i => i.severity === 'error').length === 0, issues }
  }

  serialize(): never {
    throw new Error('Not implemented')
  }
}

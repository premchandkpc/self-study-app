import { Graph, Entity } from '../runtime/primitives'
import type { SemanticNode } from './SemanticNode'
import type { SemanticEdge, RelationshipType } from './SemanticEdge'
import { CONCEPT_DEFINITIONS } from './concepts'
import type { ConceptName, ConceptCategory, ConceptDefinition } from './concepts'

export interface SemanticGraphSchema {
  nodes: SemanticNode[]
  edges: SemanticEdge[]
  conceptDefinitions: Record<string, ConceptDefinition>
}

export class SemanticGraph {
  private nodes: Map<string, SemanticNode> = new Map()
  private edges: Map<string, SemanticEdge> = new Map()
  private adjacency: Map<string, Set<string>> = new Map()
  private conceptIndex: Map<ConceptName, string[]> = new Map()
  private categoryIndex: Map<ConceptCategory, string[]> = new Map()

  addNode(node: SemanticNode): void {
    this.nodes.set(node.id, node)
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, new Set())
    }
    if (!this.conceptIndex.has(node.concept)) {
      this.conceptIndex.set(node.concept, [])
    }
    this.conceptIndex.get(node.concept)!.push(node.id)
    if (!this.categoryIndex.has(node.category)) {
      this.categoryIndex.set(node.category, [])
    }
    this.categoryIndex.get(node.category)!.push(node.id)
  }

  removeNode(id: string): void {
    const node = this.nodes.get(id)
    if (node) {
      const ci = this.conceptIndex.get(node.concept)
      if (ci) {
        const idx = ci.indexOf(id)
        if (idx >= 0) ci.splice(idx, 1)
        if (ci.length === 0) this.conceptIndex.delete(node.concept)
      }
      const cat = this.categoryIndex.get(node.category)
      if (cat) {
        const idx = cat.indexOf(id)
        if (idx >= 0) cat.splice(idx, 1)
        if (cat.length === 0) this.categoryIndex.delete(node.category)
      }
    }
    this.nodes.delete(id)
    this.adjacency.delete(id)
    for (const [edgeId, edge] of this.edges) {
      if (edge.from === id || edge.to === id) {
        this.edges.delete(edgeId)
      }
    }
    for (const [, neighbors] of this.adjacency) {
      neighbors.delete(id)
    }
  }

  addEdge(edge: SemanticEdge): void {
    this.edges.set(edge.id, edge)
    if (!this.adjacency.has(edge.from)) this.adjacency.set(edge.from, new Set())
    if (!this.adjacency.has(edge.to)) this.adjacency.set(edge.to, new Set())
    this.adjacency.get(edge.from)!.add(edge.to)
    if (edge.relationship === 'related-to' || edge.relationship === 'synchronizes-with') {
      this.adjacency.get(edge.to)!.add(edge.from)
    }
  }

  removeEdge(id: string): void {
    const edge = this.edges.get(id)
    if (edge) {
      this.adjacency.get(edge.from)?.delete(edge.to)
      this.adjacency.get(edge.to)?.delete(edge.from)
    }
    this.edges.delete(id)
  }

  getNode(id: string): SemanticNode | undefined {
    return this.nodes.get(id)
  }

  getAllNodes(): SemanticNode[] {
    return Array.from(this.nodes.values())
  }

  nodeCount(): number {
    return this.nodes.size
  }

  findByConcept(concept: ConceptName): SemanticNode[] {
    const ids = this.conceptIndex.get(concept) ?? []
    return ids.map(id => this.nodes.get(id)).filter((n): n is SemanticNode => n !== undefined)
  }

  findByCategory(category: ConceptCategory): SemanticNode[] {
    const ids = this.categoryIndex.get(category) ?? []
    return ids.map(id => this.nodes.get(id)).filter((n): n is SemanticNode => n !== undefined)
  }

  findPath(from: string, to: string): SemanticNode[] {
    if (!this.nodes.has(from) || !this.nodes.has(to)) return []
    if (from === to) return [this.nodes.get(from)!]

    const visited = new Set<string>()
    const queue: { id: string; path: string[] }[] = [{ id: from, path: [from] }]
    visited.add(from)

    while (queue.length > 0) {
      const { id, path } = queue.shift()!
      const neighbors = this.adjacency.get(id) ?? new Set()
      for (const neighbor of neighbors) {
        if (neighbor === to) {
          const fullPath = [...path, to]
          return fullPath.map(nid => this.nodes.get(nid)).filter((n): n is SemanticNode => n !== undefined)
        }
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push({ id: neighbor, path: [...path, neighbor] })
        }
      }
    }

    return []
  }

  getPrerequisites(id: string): SemanticNode[] {
    const node = this.nodes.get(id)
    if (!node) return []
    return node.prerequisites
      .map(pid => this.nodes.get(pid))
      .filter((n): n is SemanticNode => n !== undefined)
  }

  getDependents(id: string): SemanticNode[] {
    return Array.from(this.nodes.values())
      .filter(n => n.prerequisites.includes(id))
  }

  getLearningPath(start: string, goal: string): SemanticNode[] {
    const allPrereqs = new Set<string>()
    const queue = [goal]
    const visited = new Set<string>()
    let found = false

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current === start) { found = true; break }
      if (visited.has(current)) continue
      visited.add(current)

      const node = this.nodes.get(current)
      if (node) {
        for (const prereq of node.prerequisites) {
          queue.push(prereq)
          if (prereq !== start) allPrereqs.add(prereq)
        }
      }
    }

    if (!found && start !== goal) return []

    const orderedPath: string[] = [start]
    let current = start
    const visitedPath = new Set<string>([start])

    while (current !== goal) {
      const node = this.nodes.get(current)
      if (!node) break
      const next = node.relatedConcepts.find(r => {
        const candidate = this.nodes.get(r)
        if (!candidate || visitedPath.has(r)) return false
        return candidate.prerequisites.length === 0 ||
          candidate.prerequisites.every(p => visitedPath.has(p) || p === current)
      })
      if (next) {
        orderedPath.push(next)
        visitedPath.add(next)
        current = next
      } else {
        const neighbors = this.adjacency.get(current) ?? new Set()
        const unvisited = Array.from(neighbors).filter(n => !visitedPath.has(n))
        if (unvisited.length === 0) break
        orderedPath.push(unvisited[0])
        visitedPath.add(unvisited[0])
        current = unvisited[0]
      }
    }

    return orderedPath.map(nid => this.nodes.get(nid)).filter((n): n is SemanticNode => n !== undefined)
  }

  semanticSearch(query: string, limit: number = 10): SemanticNode[] {
    const lower = query.toLowerCase()
    const scored: { node: SemanticNode; score: number }[] = []

    for (const node of this.nodes.values()) {
      let score = 0
      if (node.concept.toLowerCase().includes(lower)) score += 10
      if (node.keywords.some(k => k.toLowerCase().includes(lower))) score += 5
      if (node.type.toLowerCase().includes(lower)) score += 3
      if (node.whyItMatters?.toLowerCase().includes(lower)) score += 2
      if (node.prerequisites.some(p => p.toLowerCase().includes(lower))) score += 1

      const def = CONCEPT_DEFINITIONS[node.concept]
      if (def) {
        if (def.description.toLowerCase().includes(lower)) score += 4
        if (def.keywords.some(k => k.toLowerCase().includes(lower))) score += 3
      }

      if (score > 0) scored.push({ node, score })
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.node)
  }

  getConceptDefinition(concept: ConceptName): ConceptDefinition | undefined {
    return CONCEPT_DEFINITIONS[concept]
  }

  getAllConcepts(): ConceptDefinition[] {
    return Object.values(CONCEPT_DEFINITIONS)
  }

  export(): SemanticGraphSchema {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      conceptDefinitions: { ...CONCEPT_DEFINITIONS },
    }
  }

  static import(schema: SemanticGraphSchema): SemanticGraph {
    const sg = new SemanticGraph()
    for (const node of schema.nodes) {
      sg.addNode(node)
    }
    for (const edge of schema.edges) {
      sg.addEdge(edge)
    }
    return sg
  }

  toRuntimeGraph(): Graph {
    const g = new Graph()
    for (const node of this.nodes.values()) {
      const entity = new Entity(node.id, node.kind, node.type)
      entity.set('concept', node.concept)
      entity.set('category', node.category)
      entity.set('complexity', node.complexity)
      entity.set('importance', node.importance)
      entity.set('keywords', node.keywords)
      g.addEntity(entity)
    }
    for (const edge of this.edges.values()) {
      g.connect(edge.from, edge.to, edge.relationship)
    }
    return g
  }
}

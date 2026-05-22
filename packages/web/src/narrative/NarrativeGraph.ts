import type { RuntimeEvent } from '../runtime/events/Event'
import type { SemanticGraph } from '../semantic/SemanticGraph'

export type NarrativeNodeType = 'event' | 'concept' | 'explanation' | 'example' | 'question'

export interface NarrativeNode {
  id: string
  type: NarrativeNodeType
  text: string
  emphasis: string[]
  concepts: string[]
  complexity: number
  prerequisites: string[]
  duration: number
  animationId?: string
  llmPrompt?: string
  embedding?: number[]
}

export interface NarrativePath {
  nodes: NarrativeNode[]
  totalDuration: number
  currentIndex: number
}

export class NarrativeGraph {
  private nodes: Map<string, NarrativeNode> = new Map()
  private edges: Map<string, { from: string; to: string; type: 'follows' | 'explains' | 'prerequisite' | 'example-of' }> = new Map()

  addNode(node: NarrativeNode): void {
    this.nodes.set(node.id, node)
  }

  addEdge(from: string, to: string, type: 'follows' | 'explains' | 'prerequisite' | 'example-of'): void {
    this.edges.set(`${from}->${to}`, { from, to, type })
  }

  getNode(id: string): NarrativeNode | undefined {
    return this.nodes.get(id)
  }

  getAllNodes(): NarrativeNode[] {
    return Array.from(this.nodes.values())
  }

  buildNarrative(events: RuntimeEvent[], context: SemanticGraph): NarrativePath {
    const nodes: NarrativeNode[] = []
    for (const event of events) {
      const explanation = event.explanation ?? `${event.type} on ${event.entityId ?? '?'}`
      const concepts = event.concept ? [event.concept] : []
      const emphasis = concepts.filter(Boolean).concat(event.entityId ?? '').filter(Boolean)
      nodes.push({
        id: `narr_${event.id}`,
        type: 'event',
        text: explanation,
        emphasis: emphasis as string[],
        concepts: concepts as string[],
        complexity: 0.5,
        prerequisites: [],
        duration: 2000,
      })
    }
    const totalDuration = nodes.reduce((sum, n) => sum + n.duration, 0)
    return { nodes, totalDuration, currentIndex: 0 }
  }

  explainEvent(event: RuntimeEvent): NarrativeNode[] {
    const nodes: NarrativeNode[] = []
    if (event.explanation) {
      nodes.push({
        id: `explain_${event.id}`,
        type: 'explanation',
        text: event.explanation,
        emphasis: event.concept ? [event.concept] : [],
        concepts: event.concept ? [event.concept] : [],
        complexity: 0.3,
        prerequisites: [],
        duration: 1500,
      })
    }
    return nodes
  }

  adapt(narrative: NarrativePath, userLevel: number): NarrativePath {
    const adapted = narrative.nodes.map(node => ({
      ...node,
      complexity: Math.max(0.1, Math.min(1, node.complexity * (2 - userLevel))),
      duration: userLevel < 3 ? node.duration * 1.5 : node.duration,
    }))
    return { nodes: adapted, totalDuration: adapted.reduce((s, n) => s + n.duration, 0), currentIndex: 0 }
  }

  getLearningPath(conceptId: string): NarrativeNode[] {
    const visited = new Set<string>()
    const result: NarrativeNode[] = []
    const queue: string[] = [conceptId]
    while (queue.length > 0) {
      const id = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      const node = this.nodes.get(id)
      if (node) result.push(node)
      for (const edge of this.edges.values()) {
        if (edge.to === id && edge.type === 'prerequisite') {
          queue.push(edge.from)
        }
      }
    }
    return result.reverse()
  }

  clear(): void {
    this.nodes.clear()
    this.edges.clear()
  }
}

export type ConceptCategory = 'algorithm' | 'data-structure' | 'system-design' | 'concurrency' | 'networking' | 'database' | 'distributed' | 'ai' | 'os' | 'language'
export type RelType = 'prerequisite' | 'related-to' | 'implementation-of' | 'variant-of' | 'part-of'
export type Difficulty = 1 | 2 | 3 | 4 | 5

export interface KnowledgeNode {
  id: string
  name: string
  description: string
  category: ConceptCategory
  difficulty: Difficulty
  importance: number
  interviewFrequency: number
  prerequisites: string[]
  relatedConcepts: string[]
  embedding?: number[]
  llmContext?: string
  examplePrompt?: string
  visualType?: 'array' | 'graph' | 'tree' | 'tensor' | 'custom'
  defaultAnimation?: string
}

export interface KnowledgeEdge {
  from: string
  to: string
  type: RelType
}

export interface KnowledgeGraphSchema {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  version: number
}

export interface Scenario {
  id: string
  title: string
  description: string
  conceptId: string
  difficulty: number
  initialState: { entities: { id: string; kind: string; type: string; properties: Record<string, unknown> }[]; edges?: { from: string; to: string; label: string }[] }
  events: { type: string; timestamp: number; entityId: string; property?: string; oldValue?: unknown; newValue?: unknown; concept?: string; explanation?: string }[]
  questions: { text: string; answer: string; difficulty: number }[]
}

export interface InterviewQuestion {
  type: 'coding' | 'conceptual' | 'system-design'
  difficulty: number
  question: string
  testCases?: { input: string; expected: string }[]
  solution?: string
  hints?: string[]
  expectedKeywords?: string[]
  followUp?: string
  evaluationCriteria?: string[]
}

export interface Lesson {
  id: string
  title: string
  conceptId: string
  sections: { title: string; content: string; codeExample?: string }[]
  summary: string
  quiz: { question: string; options: string[]; correctIndex: number }[]
}

export class KnowledgeGraph {
  private concepts: Map<string, KnowledgeNode>
  private edges: Map<string, KnowledgeEdge[]>

  constructor() {
    this.concepts = new Map()
    this.edges = new Map()
  }

  addConcept(node: KnowledgeNode): void {
    this.concepts.set(node.id, node)
    if (!this.edges.has(node.id)) this.edges.set(node.id, [])
  }

  addRelationship(from: string, to: string, type: RelType): void {
    if (!this.edges.has(from)) this.edges.set(from, [])
    this.edges.get(from)!.push({ from, to, type })
  }

  getConcept(id: string): KnowledgeNode | undefined {
    return this.concepts.get(id)
  }

  getAllConcepts(): KnowledgeNode[] {
    return Array.from(this.concepts.values())
  }

  getPrerequisites(conceptId: string): KnowledgeNode[] {
    const node = this.concepts.get(conceptId)
    if (!node) return []
    return node.prerequisites
      .map(id => this.concepts.get(id))
      .filter((n): n is KnowledgeNode => n !== undefined)
  }

  getLearningPath(start: string, goal: string): KnowledgeNode[] {
    const visited = new Set<string>()
    const queue: { id: string; path: string[] }[] = [{ id: start, path: [start] }]
    while (queue.length > 0) {
      const { id, path } = queue.shift()!
      if (id === goal) return path.map(id => this.concepts.get(id)!).filter(Boolean)
      if (visited.has(id)) continue
      visited.add(id)
      const node = this.concepts.get(id)
      if (node) {
        for (const prereq of node.prerequisites) {
          queue.push({ id: prereq, path: [...path, prereq] })
        }
        const rels = this.edges.get(id) ?? []
        for (const rel of rels) {
          if (rel.type === 'prerequisite' && !visited.has(rel.to)) {
            queue.push({ id: rel.to, path: [...path, rel.to] })
          }
        }
      }
    }
    return []
  }

  getRelated(conceptId: string, depth: number = 1): KnowledgeNode[] {
    const result: KnowledgeNode[] = []
    const visited = new Set<string>()
    const queue: { id: string; d: number }[] = [{ id: conceptId, d: 0 }]
    while (queue.length > 0) {
      const { id, d } = queue.shift()!
      if (visited.has(id) || d > depth) continue
      visited.add(id)
      const node = this.concepts.get(id)
      if (node && id !== conceptId) result.push(node)
      const rels = this.edges.get(id) ?? []
      for (const rel of rels) {
        queue.push({ id: rel.to, d: d + 1 })
        const reverseRels = this.edges.get(rel.to) ?? []
        for (const rev of reverseRels) {
          if (rev.to === id) queue.push({ id: rev.from, d: d + 1 })
        }
      }
    }
    return result
  }

  search(query: string, limit: number = 10): KnowledgeNode[] {
    const lower = query.toLowerCase()
    const scored = this.getAllConcepts()
      .map(node => {
        let score = 0
        if (node.id.toLowerCase().includes(lower)) score += 10
        if (node.name.toLowerCase().includes(lower)) score += 8
        if (node.description.toLowerCase().includes(lower)) score += 4
        if (node.category.toLowerCase().includes(lower)) score += 3
        if (node.relatedConcepts.some(r => r.toLowerCase().includes(lower))) score += 1
        return { node, score }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.node)
    return scored
  }

  semanticSearch(embedding: number[], limit: number = 10): KnowledgeNode[] {
    const withEmbedding = this.getAllConcepts().filter(n => n.embedding)
    const scored = withEmbedding.map(node => {
      const dot = this.cosineSimilarity(embedding, node.embedding!)
      return { node, score: dot }
    })
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, limit).map(x => x.node)
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      magA += a[i] * a[i]
      magB += b[i] * b[i]
    }
    if (magA === 0 || magB === 0) return 0
    return dot / (Math.sqrt(magA) * Math.sqrt(magB))
  }

  generateScenario(conceptId: string): Scenario {
    const concept = this.concepts.get(conceptId)
    return {
      id: `scenario-${conceptId}-${Date.now()}`,
      title: concept?.name ?? conceptId,
      description: concept?.description ?? `Interactive simulation for ${conceptId}`,
      conceptId,
      difficulty: concept?.difficulty ?? 1,
      initialState: { entities: [{ id: 'root', kind: 'node', type: concept?.category ?? 'custom', properties: {} }] },
      events: [{ type: 'ENTITY_CREATED', timestamp: 0, entityId: conceptId, concept: conceptId, explanation: concept?.description }],
      questions: [{ text: `Explain how ${concept?.name ?? conceptId} works`, answer: concept?.description ?? '', difficulty: concept?.difficulty ?? 1 }],
    }
  }

  generateInterviewQuestions(conceptId: string): InterviewQuestion[] {
    const concept = this.concepts.get(conceptId)
    const d = concept?.difficulty ?? 1
    return [
      { type: 'coding', difficulty: d, question: `Implement ${concept?.name ?? conceptId}`, hints: concept?.relatedConcepts, solution: concept?.description },
      { type: 'conceptual', difficulty: d, question: `Explain how ${concept?.name ?? conceptId} works`, expectedKeywords: concept?.relatedConcepts, followUp: `What is the time complexity of ${concept?.name ?? conceptId}?` },
      { type: 'system-design', difficulty: Math.min(d + 1, 5) as Difficulty, question: `Design a system using ${concept?.name ?? conceptId}`, evaluationCriteria: ['Correctness', 'Scalability', 'Edge cases'] },
    ]
  }

  generateLesson(conceptId: string): Lesson {
    const concept = this.concepts.get(conceptId)
    return {
      id: `lesson-${conceptId}`,
      title: concept?.name ?? conceptId,
      conceptId,
      sections: [
        { title: 'Overview', content: concept?.description ?? '' },
        { title: 'Prerequisites', content: concept?.prerequisites.map(p => this.concepts.get(p)?.name ?? p).join(', ') ?? 'None' },
        { title: 'Related Concepts', content: concept?.relatedConcepts.join(', ') ?? 'None' },
      ],
      summary: concept?.description ?? '',
      quiz: [{ question: `What category does ${concept?.name ?? conceptId} belong to?`, options: ['algorithm', 'data-structure', 'system-design', 'concurrency'], correctIndex: ['algorithm', 'data-structure', 'system-design', 'concurrency'].indexOf(concept?.category ?? 'algorithm') }],
    }
  }

  export(): KnowledgeGraphSchema {
    return {
      nodes: this.getAllConcepts(),
      edges: Array.from(this.edges.values()).flat(),
      version: 1,
    }
  }

  static import(schema: KnowledgeGraphSchema): KnowledgeGraph {
    const kg = new KnowledgeGraph()
    for (const node of schema.nodes) kg.addConcept(node)
    for (const edge of schema.edges) kg.addRelationship(edge.from, edge.to, edge.type)
    return kg
  }
}

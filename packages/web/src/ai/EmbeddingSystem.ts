import { KnowledgeGraph } from '../knowledge'
import type { KnowledgeNode } from '../knowledge'

export interface SearchResult {
  id: string
  score: number
  metadata: Record<string, unknown>
}

export interface VectorIndex {
  add(id: string, embedding: number[], metadata: Record<string, unknown>): void
  search(embedding: number[], limit: number): SearchResult[]
  save(path: string): void
  load(path: string): void
}

export class InMemoryVectorIndex implements VectorIndex {
  private entries: { id: string; embedding: number[]; metadata: Record<string, unknown> }[] = []

  add(id: string, embedding: number[], metadata: Record<string, unknown>): void {
    this.entries.push({ id, embedding, metadata })
  }

  search(embedding: number[], limit: number): SearchResult[] {
    const scored = this.entries.map(e => ({
      id: e.id,
      score: this.cosineSimilarity(embedding, e.embedding),
      metadata: e.metadata,
    }))
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, limit)
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

  save(_path: string): void {
    throw new Error('Not implemented')
  }

  load(_path: string): void {
    throw new Error('Not implemented')
  }
}

export class EmbeddingSystem {
  private provider: 'local' | 'openai' | 'mock'
  private apiKey: string
  private model: string
  private index: InMemoryVectorIndex

  constructor(config?: { provider?: 'local' | 'openai' | 'mock'; apiKey?: string; model?: string }) {
    this.provider = config?.provider ?? 'mock'
    this.apiKey = config?.apiKey ?? process.env.OPENAI_API_KEY ?? ''
    this.model = config?.model ?? 'all-MiniLM-L6-v2'
    this.index = new InMemoryVectorIndex()
  }

  async embedText(text: string): Promise<number[]> {
    if (this.provider === 'mock') {
      return this.simulateEmbedding(text)
    }
    if (this.provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
      })
      const data = await response.json()
      return data.data?.[0]?.embedding ?? this.simulateEmbedding(text)
    }
    return this.simulateEmbedding(text)
  }

  async embedConcept(concept: KnowledgeNode): Promise<number[]> {
    const text = `${concept.name}: ${concept.description} [${concept.category}]`
    return this.embedText(text)
  }

  async indexConcepts(kg: KnowledgeGraph): Promise<void> {
    for (const concept of kg.getAllConcepts()) {
      const embedding = concept.embedding ?? await this.embedConcept(concept)
      this.index.add(concept.id, embedding, { name: concept.name, category: concept.category })
    }
  }

  async semanticSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
    const embedding = await this.embedText(query)
    return this.index.search(embedding, limit)
  }

  private simulateEmbedding(text: string): number[] {
    const hash = text.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const dims = 128
    const vec: number[] = []
    for (let i = 0; i < dims; i++) {
      vec.push(Math.sin(hash * (i + 1)) * 0.5 + 0.5)
    }
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
    return vec.map(v => v / mag)
  }
}

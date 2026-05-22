import { KnowledgeGraph } from '../knowledge'
import { EmbeddingSystem } from './EmbeddingSystem'
import type { SemanticEvent } from '../concepts'

export interface RAGContext {
  currentEvent?: SemanticEvent
  userLevel?: number
  conceptId?: string
}

export interface RAGResponse {
  answer: string
  relevantConcepts: string[]
  confidence: number
}

export class RAGPipeline {
  private knowledgeGraph: KnowledgeGraph
  private embeddingSystem: EmbeddingSystem

  constructor(knowledgeGraph: KnowledgeGraph, embeddingSystem: EmbeddingSystem) {
    this.knowledgeGraph = knowledgeGraph
    this.embeddingSystem = embeddingSystem
  }

  async query(query: string, context?: RAGContext): Promise<RAGResponse> {
    const queryEmbedding = await this.embeddingSystem.embedText(query)
    const relevantFromEmbed = this.knowledgeGraph.semanticSearch(queryEmbedding, 5)
    const relevantFromSearch = this.knowledgeGraph.search(query, 3)

    const conceptIds = new Set<string>()
    for (const c of [...relevantFromEmbed, ...relevantFromSearch]) {
      conceptIds.add(c.id)
    }

    const concepts = Array.from(conceptIds).map(id => this.knowledgeGraph.getConcept(id)).filter(Boolean)
    const prompt = this.buildPrompt(query, concepts as any[], context)

    return {
      answer: prompt,
      relevantConcepts: concepts.map(c => c!.id),
      confidence: concepts.length > 0 ? Math.min(0.5 + concepts.length * 0.1, 0.95) : 0.3,
    }
  }

  private buildPrompt(query: string, relevantConcepts: { name: string; description: string }[], context?: RAGContext): string {
    const lines: string[] = []
    lines.push('=== AI Teaching Assistant ===')
    if (context?.currentEvent) {
      lines.push(`Current simulation: ${context.currentEvent.concept ?? 'unknown'}`)
    }
    if (context?.userLevel !== undefined) {
      lines.push(`User level: ${context.userLevel}/5`)
    }
    if (relevantConcepts.length > 0) {
      lines.push('Relevant concepts: ' + relevantConcepts.map(c => `${c.name}: ${c.description}`).join('; '))
    }
    lines.push(`Question: ${query}`)
    lines.push('Answer: [AI would generate context-aware explanation here]')
    return lines.join('\n')
  }
}

# Phase 7: AI-Native + Knowledge Graph

**Duration**: 3 weeks
**Goal**: Build AI-readable architecture — embeddings, RAG, scenario generation, adaptive teaching, concept reasoning.

---

## Week 1: Knowledge Graph

### Day 1-2: KnowledgeGraph

```typescript
// src/knowledge/KnowledgeGraph.ts
export class KnowledgeGraph {
  private concepts: Map<string, KnowledgeNode>
  private relationships: Map<string, KnowledgeEdge[]>

  addConcept(node: KnowledgeNode): void
  addRelationship(from: string, to: string, type: RelType): void

  // Traversal
  getPrerequisites(conceptId: string): KnowledgeNode[]
  getLearningPath(start: string, goal: string): KnowledgeNode[]
  getRelated(conceptId: string, depth?: number): KnowledgeNode[]

  // Semantic search
  search(query: string, limit?: number): KnowledgeNode[]
  semanticSearch(embedding: number[], limit?: number): KnowledgeNode[]

  // AI generation
  generateScenario(conceptId: string): Scenario
  generateInterviewQuestions(conceptId: string): InterviewQuestion[]
  generateLesson(conceptId: string): Lesson

  // Persistence
  export(): KnowledgeGraphSchema
  static import(schema: KnowledgeGraphSchema): KnowledgeGraph
}

export interface KnowledgeNode {
  id: string
  name: string
  description: string
  category: 'algorithm' | 'data-structure' | 'system-design'
          | 'concurrency' | 'networking' | 'database'
          | 'distributed' | 'ai' | 'os' | 'language'

  difficulty: 1 | 2 | 3 | 4 | 5
  importance: number  // 0-1
  interviewFrequency: number  // 0-1

  prerequisites: string[]
  relatedConcepts: string[]

  // AI
  embedding?: number[]
  llmContext?: string
  examplePrompt?: string

  // Media
  visualType?: 'array' | 'graph' | 'tree' | 'tensor' | 'custom'
  defaultAnimation?: string
}
```

### Day 3-4: Default Concept Graph

Build initial knowledge graph with 100+ concepts:

```typescript
// src/knowledge/defaultConceptGraph.ts
export const DEFAULT_CONCEPT_GRAPH: KnowledgeNode[] = [
  // Algorithms
  { id: 'bubble-sort', name: 'Bubble Sort', difficulty: 1, importance: 0.6, ... },
  { id: 'quick-sort', name: 'Quick Sort', difficulty: 2, importance: 0.9, ... },
  { id: 'merge-sort', name: 'Merge Sort', difficulty: 2, importance: 0.8, ... },
  { id: 'binary-search', name: 'Binary Search', difficulty: 1, importance: 0.9, ... },
  { id: 'dfs', name: 'Depth-First Search', difficulty: 2, importance: 0.8, ... },
  { id: 'bfs', name: 'Breadth-First Search', difficulty: 2, importance: 0.8, ... },
  { id: 'dijkstra', name: "Dijkstra's Algorithm", difficulty: 3, importance: 0.7, ... },

  // Data Structures
  { id: 'hash-map', name: 'Hash Map', difficulty: 2, importance: 0.9, ... },
  { id: 'linked-list', name: 'Linked List', difficulty: 1, importance: 0.7, ... },
  { id: 'heap', name: 'Heap', difficulty: 2, importance: 0.7, ... },
  { id: 'trie', name: 'Trie', difficulty: 3, importance: 0.5, ... },

  // System Design
  { id: 'kafka', name: 'Apache Kafka', difficulty: 3, importance: 0.8, ... },
  { id: 'raft', name: 'Raft Consensus', difficulty: 4, importance: 0.7, ... },
  { id: 'load-balancing', name: 'Load Balancing', difficulty: 2, importance: 0.7, ... },
  { id: 'caching', name: 'Caching Strategies', difficulty: 2, importance: 0.8, ... },

  // Concurrency
  { id: 'mutex', name: 'Mutex', difficulty: 2, importance: 0.7, ... },
  { id: 'deadlock', name: 'Deadlock', difficulty: 3, importance: 0.8, ... },
  { id: 'race-condition', name: 'Race Condition', difficulty: 3, importance: 0.8, ... },

  // Networks
  { id: 'tcp-handshake', name: 'TCP 3-Way Handshake', difficulty: 2, importance: 0.7, ... },
  { id: 'http', name: 'HTTP Protocol', difficulty: 1, importance: 0.8, ... },

  // JVM
  { id: 'gc', name: 'Garbage Collection', difficulty: 3, importance: 0.6, ... },
  { id: 'jvm-memory', name: 'JVM Memory Model', difficulty: 3, importance: 0.7, ... },
]
```

### Day 5: Concept Relationships

```typescript
// Prerequisite graph
export const CONCEPT_RELATIONSHIPS: [string, string, RelType][] = [
  ['arrays', 'bubble-sort', 'prerequisite'],
  ['bubble-sort', 'quick-sort', 'prerequisite'],
  ['quick-sort', 'merge-sort', 'related-to'],
  ['arrays', 'binary-search', 'prerequisite'],
  ['binary-search', 'dfs', 'related-to'],
  ['hash-map', 'kafka-partitioning', 'prerequisite'],
  ['distributed-systems', 'raft', 'prerequisite'],
  ['raft', 'kafka', 'related-to'],
  ['threads', 'mutex', 'prerequisite'],
  ['mutex', 'deadlock', 'prerequisite'],
  ['deadlock', 'race-condition', 'related-to'],
]
```

---

## Week 2: AI Integration

### Day 1-2: Embedding System

```typescript
// src/ai/EmbeddingSystem.ts
export class EmbeddingSystem {
  private provider: EmbeddingProvider

  // Generate embeddings for any runtime object
  async embedEntity(entity: Entity): Promise<number[]>
  async embedEvent(event: SemanticEvent): Promise<number[]>
  async embedConcept(concept: KnowledgeNode): Promise<number[]>
  async embedGraph(graph: Graph): Promise<number[]>

  // Search
  async semanticSearch(embedding: number[], index: VectorIndex): Promise<SearchResult[]>
}

export interface VectorIndex {
  add(id: string, embedding: number[], metadata: any): void
  search(embedding: number[], limit: number): SearchResult[]
  save(path: string): void
  load(path: string): void
}
```

### Day 3-4: RAG Pipeline

```typescript
// src/ai/RAGPipeline.ts
export class RAGPipeline {
  private knowledgeGraph: KnowledgeGraph
  private embeddingSystem: EmbeddingSystem
  private llmProvider: LLMProvider

  // Answer questions about a simulation
  async query(query: string, context: {
    currentEvent?: SemanticEvent
    graph?: Graph
    timeline?: Timeline
    userLevel?: number
  }): Promise<RAGResponse> {
    // 1. Embed query
    const queryEmbedding = await this.embeddingSystem.embedText(query)

    // 2. Retrieve relevant context
    const relevantEvents = this.knowledgeGraph.semanticSearch(queryEmbedding, 5)
    const relevantConcepts = this.knowledgeGraph.search(query, 3)

    // 3. Build prompt
    const prompt = this.buildPrompt(query, relevantEvents, relevantConcepts, context)

    // 4. Generate response
    return this.llmProvider.generate(prompt)
  }

  private buildPrompt(...): string {
    return `
    You are an expert computer science tutor.
    Current simulation: ${context.currentEvent?.concept}
    User level: ${context.userLevel}
    Relevant concepts: ${relevantConcepts.map(c => c.name).join(', ')}
    Question: ${query}
    Explain in context of the running simulation.
    `
  }
}
```

### Day 5: LLM Integration

```typescript
// src/ai/providers/LLMProvider.ts
export interface LLMProvider {
  generate(prompt: string, options?: LLMOptions): Promise<LLMResponse>
  stream(prompt: string, onChunk: (chunk: string) => void): Promise<void>
}

export class OpenAIProvider implements LLMProvider { /* ... */ }
export class AnthropicProvider implements LLMProvider { /* ... */ }
export class LocalProvider implements LLMProvider { /* ... */ }  // Ollama, etc.
```

---

## Week 3: AI-Generated Scenarios

### Day 1-2: Scenario Generator

```typescript
// src/ai/generators/ScenarioGenerator.ts
export class ScenarioGenerator {
  private kg: KnowledgeGraph
  private llm: LLMProvider

  // Generate a simulation scenario from a concept
  async generate(conceptId: string, difficulty: number): Promise<Scenario> {
    const concept = this.kg.getConcept(conceptId)

    const prompt = `
    Generate a simulation scenario for teaching "${concept.name}".
    Difficulty: ${difficulty}/5
    Prerequisites: ${concept.prerequisites.join(', ')}

    Return as JSON:
    {
      "title": "...",
      "description": "...",
      "initialState": { "entities": [...], "graph": {...} },
      "events": [
        {
          "type": "PROPERTY_CHANGED",
          "entityId": "...",
          "property": "...",
          "oldValue": ...,
          "newValue": ...,
          "concept": "${conceptId}",
          "explanation": "..."
        }
      ],
      "questions": [
        { "text": "...", "answer": "...", "difficulty": ${difficulty} }
      ]
    }
    `

    const response = await this.llm.generate(prompt)
    return JSON.parse(response.text)
  }
}
```

### Day 3-4: Adaptive Teaching Engine

```typescript
// src/ai/AdaptiveEngine.ts
export class AdaptiveEngine {
  private userProfile: UserProfile
  private kg: KnowledgeGraph

  // Adapt simulation based on user performance
  adapt(simulation: Simulation, performance: UserPerformance): Simulation {
    const weakConcepts = this.detectWeakAreas(performance)
    const nextConcept = this.suggestNextConcept(weakConcepts)

    return {
      ...simulation,
      difficulty: this.calculateDifficulty(performance),
      narrationDepth: performance.mastery > 0.7 ? 'deep' : 'shallow',
      suggestedReview: weakConcepts,
      nextScenario: nextConcept
    }
  }

  private detectWeakAreas(performance: UserPerformance): string[] {
    // Find concepts with low accuracy or slow completion
    return performance.events
      .filter(e => e.accuracy < 0.6 || e.time > this.avgTime * 1.5)
      .map(e => e.concept)
  }
}
```

### Day 5: Interview Question Generator

```typescript
// src/ai/generators/InterviewGenerator.ts
export class InterviewGenerator {
  async generateQuestions(conceptId: string, count: number): Promise<InterviewQuestion[]> {
    // Generate interview-style questions from concept metadata
    const concept = this.kg.getConcept(conceptId)

    return [
      {
        type: 'coding',
        difficulty: concept.difficulty,
        question: `Implement ${concept.name}`,
        testCases: [...],
        solution: '...',
        hints: [...]
      },
      {
        type: 'conceptual',
        difficulty: concept.difficulty,
        question: `Explain how ${concept.name} works`,
        expectedKeywords: concept.relatedConcepts,
        followUp: `What is the time complexity of ${concept.name}?`
      },
      {
        type: 'system-design',
        difficulty: Math.min(concept.difficulty + 1, 5),
        question: `Design a system using ${concept.name}`,
        evaluationCriteria: [...]
      }
    ]
  }
}
```

---

## Files Created

```
src/knowledge/
├── KnowledgeGraph.ts
├── defaultConceptGraph.ts
└── index.ts

src/ai/
├── EmbeddingSystem.ts
├── RAGPipeline.ts
├── AdaptiveEngine.ts
├── providers/
│   ├── LLMProvider.ts
│   ├── OpenAIProvider.ts
│   └── LocalProvider.ts
├── generators/
│   ├── ScenarioGenerator.ts
│   └── InterviewGenerator.ts
└── index.ts
```

---

## Success Criteria

- [ ] KnowledgeGraph with 100+ concepts and relationships
- [ ] EmbeddingSystem generates/search embeddings
- [ ] RAGPipeline answers questions about simulations
- [ ] ScenarioGenerator creates executable scenarios
- [ ] AdaptiveEngine adjusts difficulty in real-time
- [ ] InterviewGenerator produces quality questions
- [x] AI integration doesn't break runtime determinism

---
## ✅ Completed May 2026
All modules built: KnowledgeGraph (70+ concepts), EmbeddingSystem, RAGPipeline, AdaptiveEngine, ScenarioGenerator, InterviewGenerator, OpenAI/Local providers. 87 tests passing across phases 7-10.

# Phase 6: Semantic + Narrative Engine

**Duration**: 2 weeks
**Goal**: Build semantic narration system — contextual explanations, adaptive storytelling, AI-readable event enrichment.

---

## Week 1: Narrative Engine

### Day 1-2: Narrative Graph

```typescript
// src/narrative/NarrativeGraph.ts
export interface NarrativeNode {
  id: string
  type: 'event' | 'concept' | 'explanation' | 'example' | 'question'
  text: string
  emphasis: string[]       // Words to highlight
  concepts: string[]       // Linked concepts
  complexity: number       // 0-1
  prerequisites: string[]
  duration: number         // ms to display
  animationId?: string     // Associated animation

  // AI
  llmPrompt?: string
  embedding?: number[]
}

export class NarrativeGraph {
  private nodes: Map<string, NarrativeNode>
  private edges: Map<string, {
    from: string
    to: string
    type: 'follows' | 'explains' | 'prerequisite' | 'example-of'
  }>

  // Build narrative path from timeline events
  buildNarrative(events: RuntimeEvent[], context: SemanticGraph): NarrativePath

  // Get explanation for specific event
  explainEvent(event: RuntimeEvent): NarrativeNode[]

  // Adaptive — adjust complexity based on user level
  adapt(narrative: NarrativePath, userLevel: number): NarrativePath
}

export interface NarrativePath {
  nodes: NarrativeNode[]
  totalDuration: number
  currentIndex: number
}
```

### Day 3-4: NarrationEngine

```typescript
// src/narrative/NarrationEngine.ts
export class NarrationEngine {
  private narrativeGraph: NarrativeGraph
  private currentPath: NarrativePath | null = null

  // Generate narration for a timeline
  generateNarration(timeline: Timeline, context: SemanticGraph): NarrativePath

  // Step through narration synchronized with playback
  nextNarration(): NarrativeNode | null
  previousNarration(): NarrativeNode | null
  seekToFrame(frameIndex: number): NarrativeNode | null

  // Get current narration text
  getCurrentText(): string {
    return this.currentPath?.nodes[this.currentPath.currentIndex]?.text ?? ''
  }

  // Render emphasis markers
  renderWithEmphasis(text: string, emphasis: string[]): string {
    // Wrap emphasized words in <mark> tags
    return emphasis.reduce(
      (acc, word) => acc.replaceAll(word, `<mark>${word}</mark>`),
      text
    )
  }

  // Events
  onNarrationChange(cb: (node: NarrativeNode) => void): void
}
```

### Day 5: Narration Templates

```typescript
// src/narrative/templates.ts

// Universal narration templates — one template per event type
export const NARRATION_TEMPLATES: Record<string, NarrationTemplate> = {
  ENTITY_CREATED: {
    template: 'A new {entityKind} [{entityId}] was created',
    getEmphasis: (e) => [e.entityId, e.metadata?.kind]
  },
  PROPERTY_CHANGED: {
    template: '{property} changed from {oldValue} to {newValue}',
    getEmphasis: (e) => [e.property, e.newValue]
  },
  MESSAGE_SENT: {
    template: '{source} sent message to {target}',
    getEmphasis: (e) => [e.metadata?.source, e.metadata?.target]
  },
  LOCK_ACQUIRED: {
    template: 'Thread {threadId} acquired lock {lockId}',
    getEmphasis: (e) => [e.metadata?.threadId, e.metadata?.lockId]
  }
}
```

---

## Week 2: Concept System + Educational Layer

### Day 1-2: Concept Enrichment

```typescript
// src/concepts/ConceptEnricher.ts
export class ConceptEnricher {
  private semanticGraph: SemanticGraph

  // Enrich events with educational metadata
  enrich(event: RuntimeEvent): SemanticEvent {
    const concept = this.detectConcept(event)
    return {
      ...event,
      concept: concept.name,
      category: concept.category,
      complexity: concept.complexity,
      importance: concept.importance,
      explanation: this.generateExplanation(event, concept),
      interviewRelevant: concept.interviewRelevant,
      whyItMatters: concept.whyItMatters
    }
  }

  private detectConcept(event: RuntimeEvent): Concept {
    // Match event type + entity kind to concept
    if (event.type === 'PROPERTY_CHANGED' && event.entityKind === 'array-element') {
      return event.metadata?.operation === 'swap'
        ? CONCEPTS.SWAPPING
        : CONCEPTS.COMPARISON
    }
    // ... more domain mappings
  }
}
```

### Day 3-4: Semantic Explanation Pipeline

```typescript
// src/narrative/ExplanationPipeline.ts
export class ExplanationPipeline {
  // Build multi-layered explanation
  explain(event: SemanticEvent, depth: 'shallow' | 'medium' | 'deep'): Explanation

  // Shallow: what happened
  // Medium: why it happened
  // Deep: how it relates to other concepts
}

export interface Explanation {
  summary: string           // "Swapped 34 and 64"
  context: string           // "Bubble sort moves larger elements to the right"
  implication: string       // "After this swap, 64 is in its correct position"
  concepts: string[]        // ["swapping", "bubble-sort", "comparison"]
  interviewTip?: string     // "This is O(n²) — ask about optimization"
  relatedTopics: string[]   // ["quick-sort", "insertion-sort"]
}
```

### Day 5: Narrative Synchronization

```typescript
// src/narrative/NarrativeSync.ts
export class NarrativeSync {
  private engine: RuntimeEngine
  private narration: NarrationEngine

  // Synchronize narration with playback
  start(): void {
    this.engine.onFrameChange((frame) => {
      const node = this.narration.seekToFrame(frame.id)
      if (node) {
        this.displayNarration(node)
      }
    })
  }

  // Narration pacing — slow down for complex concepts
  getOptimalPace(event: SemanticEvent): number {
    if (event.importance > 0.8) return 0.5  // Slow for critical events
    if (event.complexity === 'O(n²)') return 0.75
    return 1.0
  }
}
```

---

## Files Created

```
src/narrative/
├── NarrativeGraph.ts
├── NarrationEngine.ts
├── templates.ts
├── ExplanationPipeline.ts
├── NarrativeSync.ts
└── index.ts

src/concepts/
├── ConceptEnricher.ts
├── ConceptRegistry.ts   // Maps event types → concepts
└── index.ts
```

---

## Success Criteria

- [ ] NarrationEngine generates explanations from events
- [ ] NarrativeGraph builds paths from timelines
- [ ] Templates cover all event types
- [ ] ConceptEnricher maps events → educational metadata
- [ ] ExplanationPipeline supports shallow/medium/deep
- [ ] Narration synced with playback
- [ ] Works across ALL domains (sorting, Kafka, JVM, etc.)

---

## ✅ Completed May 2026

NarrativeGraph (buildNarrative, adapt, explainEvent), NarrationEngine (generate, traverse, renderWithEmphasis), formatTemplate/getEmphasis (16 event templates), ExplanationPipeline (shallow/medium/deep), NarrativeSync (start/stop, getOptimalPace), ConceptRegistry (30+ mappings), ConceptEnricher (enrich/enrichBatch).

## Next Phase (Phase 7)

With narrative working: build AI-native layer — RAG, embeddings, scenario generation, adaptive teaching.

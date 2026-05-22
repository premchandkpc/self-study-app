# Phase 6: Semantic Metadata & AI Integration

**Goal**: Enrich events with knowledge graph - concepts, importance, explanations. Enable AI generation.

**Duration**: 2-3 weeks

**Key Concept**: Events are data + meaning, not just actions.

---

## Problem: Events Are Dumb

Current event:
```typescript
{
  type: 'ARRAY_SWAP',
  frameId: 5,
  indices: [2, 3]
}
```

Doesn't tell us:
- Why swap happened?
- What concept is this?
- Is this important?
- How to explain to student?

---

## Solution: Semantic Metadata

### Core Concepts

```typescript
// src/core/concepts/ConceptGraph.ts
interface Concept {
  id: string
  name: string
  description: string
  importance: 'low' | 'medium' | 'high' | 'critical'
  prerequisites: string[] // Concept IDs
  relatedConcepts: string[]
  applications: string[]
}

interface ConceptGraph {
  concepts: Map<string, Concept>
  edges: Map<string, string[]> // concept -> related concepts
}

// Example: Bubble Sort concept graph
const bubbleSortConcepts: ConceptGraph = {
  concepts: new Map([
    ['comparison', {
      id: 'comparison',
      name: 'Comparison',
      description: 'Comparing two values to determine order',
      importance: 'critical',
      prerequisites: [],
      relatedConcepts: ['ordering', 'conditional'],
      applications: ['sorting', 'searching']
    }],
    ['swap', {
      id: 'swap',
      name: 'Swap',
      description: 'Exchange positions of two elements',
      importance: 'critical',
      prerequisites: ['variables', 'assignment'],
      relatedConcepts: ['permutation', 'exchange'],
      applications: ['sorting', 'permutation']
    }],
    ['pass', {
      id: 'pass',
      name: 'Iteration/Pass',
      description: 'One complete pass through the array',
      importance: 'high',
      prerequisites: ['loop', 'iteration'],
      relatedConcepts: ['nested_loops', 'optimization'],
      applications: ['bubble_sort', 'sorting']
    }],
    ['bubble_sort', {
      id: 'bubble_sort',
      name: 'Bubble Sort Algorithm',
      description: 'Repeatedly swap adjacent elements if they are in wrong order',
      importance: 'critical',
      prerequisites: ['comparison', 'swap', 'pass'],
      relatedConcepts: ['insertion_sort', 'time_complexity'],
      applications: ['educational', 'teaching_sorting']
    }]
  ])
}
```

### Enhanced Events with Metadata

```typescript
interface SemanticEvent {
  // Core
  type: EventType
  frameId: number
  timestamp: number
  
  // NEW: Semantic metadata
  concepts: string[] // Concept IDs this event demonstrates
  complexity?: string // 'O(1)', 'O(n)', etc.
  importance: 'low' | 'medium' | 'high' | 'critical'
  explanation?: string // Human explanation
  whyItMatters?: string // Why this step is important
  commonMistake?: string // What students often get wrong
  hint?: string // Teaching hint
  interviewFocus?: boolean // Is this interview-important?
  
  // Pedagogical
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert'
  learningObjectives?: string[]
  
  // Data
  [key: string]: any
}

// Example enhanced bubble sort event:
const comparisonEvent: SemanticEvent = {
  type: 'ARRAY_COMPARE',
  frameId: 1,
  timestamp: 300,
  indices: [0, 1],
  
  // Semantic enrichment
  concepts: ['comparison', 'ordering'],
  complexity: 'O(1)',
  importance: 'critical',
  explanation: 'Comparing adjacent elements to determine if swap is needed',
  whyItMatters: 'This comparison determines the ordering. If we skip comparisons, the array won\'t be sorted correctly.',
  commonMistake: 'Students often forget that we MUST compare every adjacent pair.',
  hint: 'Watch what happens when we swap vs when we don\'t.',
  interviewFocus: true,
  difficulty: 'easy',
  learningObjectives: ['understand_comparison', 'understand_ordering']
}

const swapEvent: SemanticEvent = {
  type: 'ARRAY_SWAP',
  frameId: 2,
  timestamp: 600,
  indices: [0, 1],
  
  concepts: ['swap', 'permutation'],
  complexity: 'O(1)',
  importance: 'critical',
  explanation: 'Swapping the two elements because they were in the wrong order',
  whyItMatters: 'Swapping moves larger values toward the end of the array.',
  commonMistake: 'Students sometimes think swaps are always needed (they\'re not, only when out of order).',
  hint: 'Only swap if the left element is greater than the right.',
  interviewFocus: true,
  difficulty: 'easy'
}
```

### Concept Extraction

Auto-detect concepts from events:

```typescript
// src/core/concepts/ConceptExtractor.ts
class ConceptExtractor {
  private conceptGraph: ConceptGraph
  
  constructor(conceptGraph: ConceptGraph) {
    this.conceptGraph = conceptGraph
  }
  
  enrichEvent(event: SemanticEvent): SemanticEvent {
    // Detect what concepts this event demonstrates
    const concepts = this.detectConcepts(event)
    
    return {
      ...event,
      concepts,
      importance: this.computeImportance(concepts),
      difficulty: this.computeDifficulty(concepts),
      explanation: this.generateExplanation(event, concepts)
    }
  }
  
  private detectConcepts(event: SemanticEvent): string[] {
    const concepts: string[] = []
    
    // Mapping: event type → concepts
    const typeConceptMap: Record<string, string[]> = {
      'ARRAY_COMPARE': ['comparison', 'ordering'],
      'ARRAY_SWAP': ['swap', 'permutation'],
      'ARRAY_SET': ['assignment', 'array_access'],
      'NODE_UPDATE': ['data_structure', 'state_change'],
      'EDGE_CREATE': ['graph_traversal', 'path_finding']
    }
    
    return typeConceptMap[event.type] ?? []
  }
  
  private computeImportance(concepts: string[]): SemanticEvent['importance'] {
    const maxImportance = concepts
      .map(c => this.conceptGraph.concepts.get(c)?.importance)
      .filter(Boolean)
      .reduce((max, curr) => {
        const order = { low: 0, medium: 1, high: 2, critical: 3 }
        return order[curr] > order[max] ? curr : max
      }, 'low')
    
    return maxImportance
  }
  
  private computeDifficulty(concepts: string[]): SemanticEvent['difficulty'] {
    // Concepts with prerequisites are harder
    const hasPrereqs = concepts.some(
      c => (this.conceptGraph.concepts.get(c)?.prerequisites.length ?? 0) > 0
    )
    
    return hasPrereqs ? 'medium' : 'easy'
  }
  
  private generateExplanation(event: SemanticEvent, concepts: string[]): string {
    // Generate human explanation from concepts and event type
    const conceptNames = concepts
      .map(c => this.conceptGraph.concepts.get(c)?.name)
      .filter(Boolean)
    
    if (event.type === 'ARRAY_COMPARE') {
      return `Comparing elements at indices ${event.indices[0]} and ${event.indices[1]} to determine their order`
    } else if (event.type === 'ARRAY_SWAP') {
      return `Swapping elements at indices ${event.indices[0]} and ${event.indices[1]} because they are out of order`
    }
    
    return `Event: ${event.type}`
  }
}
```

---

## AI Integration

### 1. Event Interpretation (GPT)

```typescript
// src/core/ai/EventInterpreter.ts
class EventInterpreter {
  async interpretEvent(event: SemanticEvent): Promise<AIInterpretation> {
    const prompt = `
Given this algorithm step:
${JSON.stringify(event, null, 2)}

Explain:
1. What just happened?
2. Why did it happen?
3. What did this teach us?
4. What's next?
`
    
    const response = await fetch('/api/claude', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    })
    
    return response.json()
  }
}
```

### 2. Explanation Generation

```typescript
// Generate human-friendly explanations
class ExplanationGenerator {
  async generateExplanation(
    events: SemanticEvent[],
    language: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<string> {
    const eventSummary = events
      .map(e => `Frame ${e.frameId}: ${e.explanation}`)
      .join('\n')
    
    const prompt = `
${eventSummary}

Write a ${language}-level explanation of what the algorithm did.
`
    
    return await this.ai.generate(prompt)
  }
}
```

### 3. Weakness Detection

```typescript
// Identify where student struggles
class WeaknessDetector {
  detectWeakAreas(
    events: SemanticEvent[],
    studentPerformance: Map<string, number>
  ): string[] {
    const weaknesses: string[] = []
    
    for (const event of events) {
      for (const concept of event.concepts) {
        const performance = studentPerformance.get(concept) ?? 50
        
        if (performance < 40) {
          weaknesses.push(concept)
        }
      }
    }
    
    return [...new Set(weaknesses)]
  }
  
  async generateFocusedLessons(
    weaknesses: string[],
    conceptGraph: ConceptGraph
  ): Promise<string[]> {
    // Generate lessons on weak concepts
    const lessons: string[] = []
    
    for (const weakness of weaknesses) {
      const concept = conceptGraph.concepts.get(weakness)
      
      if (concept) {
        const lesson = await this.generateLesson(concept)
        lessons.push(lesson)
      }
    }
    
    return lessons
  }
}
```

### 4. Interview Prep

```typescript
// Focus on interview-important concepts
class InterviewPrep {
  getInterviewQuestions(events: SemanticEvent[]): SemanticEvent[] {
    return events.filter(e => e.interviewFocus)
  }
  
  async generateInterviewExplanations(
    events: SemanticEvent[]
  ): Promise<Map<string, string>> {
    const explanations = new Map<string, string>()
    
    for (const event of events) {
      if (event.interviewFocus) {
        const explanation = await this.ai.generate(`
Why is this step important in a technical interview?
Event: ${event.explanation}
Concept: ${event.concepts[0]}
`)
        explanations.set(event.frameId.toString(), explanation)
      }
    }
    
    return explanations
  }
}
```

---

## Adaptive Learning

```typescript
// Adapt visualization complexity based on student level
class AdaptiveLearning {
  filterEventsForLevel(
    events: SemanticEvent[],
    level: 'beginner' | 'intermediate' | 'advanced'
  ): SemanticEvent[] {
    const difficultyMap = {
      beginner: ['easy'],
      intermediate: ['easy', 'medium'],
      advanced: ['easy', 'medium', 'hard', 'expert']
    }
    
    return events.filter(
      e => difficultyMap[level].includes(e.difficulty ?? 'medium')
    )
  }
  
  recommendNextTopic(
    masteredConcepts: string[],
    conceptGraph: ConceptGraph
  ): string[] {
    const recommended: string[] = []
    
    for (const [id, concept] of conceptGraph.concepts) {
      // Check if prerequisites are met
      const prereqsMet = concept.prerequisites.every(
        p => masteredConcepts.includes(p)
      )
      
      // Check if not already mastered
      const notMastered = !masteredConcepts.includes(id)
      
      if (prereqsMet && notMastered) {
        recommended.push(id)
      }
    }
    
    return recommended
  }
}
```

---

## Files to Create

```
src/core/concepts/
├── ConceptGraph.ts
├── ConceptExtractor.ts
└── index.ts

src/core/ai/
├── EventInterpreter.ts
├── ExplanationGenerator.ts
├── WeaknessDetector.ts
└── InterviewPrep.ts

src/core/learning/
├── AdaptiveLearning.ts
└── LearningProfile.ts

src/core/algorithms/
└── (update all algorithms to include metadata)
```

---

## Enriched Algorithm Example

```typescript
// Updated bubbleSort with semantic metadata
export function enrichedBubbleSortEvents(arr: number[]): SemanticEvent[] {
  const events: SemanticEvent[] = []
  let frameId = 0
  const copy = [...arr]
  const n = copy.length
  let passNumber = 0
  
  for (let i = 0; i < n - 1; i++) {
    passNumber++
    for (let j = 0; j < n - i - 1; j++) {
      frameId++
      
      // Comparison event with full metadata
      events.push({
        type: 'ARRAY_COMPARE',
        frameId,
        timestamp: frameId * 300,
        indices: [j, j + 1],
        concepts: ['comparison', 'ordering'],
        complexity: 'O(1)',
        importance: 'critical',
        explanation: `Comparing ${copy[j]} and ${copy[j + 1]}`,
        whyItMatters: 'We must check if adjacent elements are in order',
        hint: 'If left > right, they need to be swapped',
        interviewFocus: true,
        difficulty: 'easy',
        learningObjectives: ['understand_comparison', 'understand_bubble_sort']
      } as SemanticEvent)
      
      if (copy[j] > copy[j + 1]) {
        frameId++
        [copy[j], copy[j + 1]] = [copy[j + 1], copy[j]]
        
        events.push({
          type: 'ARRAY_SWAP',
          frameId,
          timestamp: frameId * 300,
          indices: [j, j + 1],
          concepts: ['swap', 'permutation'],
          complexity: 'O(1)',
          importance: 'critical',
          explanation: `Swapping ${copy[j + 1]} and ${copy[j]}`,
          whyItMatters: 'Moves larger values toward the end',
          commonMistake: 'Only swap when out of order',
          interviewFocus: true,
          difficulty: 'easy',
          metadata: { passNumber, sortedUpTo: n - i - 1 }
        } as SemanticEvent)
      }
    }
  }
  
  return events
}
```

---

## Success Criteria

✅ **All events have concepts**  
✅ **Concept graph complete**  
✅ **Auto-enrichment working**  
✅ **AI interpretations generated**  
✅ **Interview focus identified**  
✅ **Adaptive filtering works**  
✅ **Weakness detection accurate**  

---

## Next Phase (Phase 7)

Separate rendering layers: DOM, SVG, Canvas, WebGL.

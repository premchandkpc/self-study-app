# Phase 10: Semantic Concept Graph & AI Learning

**Goal**: Build knowledge graph connecting ALL concepts, enabling AI-powered adaptive learning and auto-generation of scenarios.

**Duration**: 3-4 weeks

**Key Concept**: Concepts are nodes, relationships are edges. This becomes your moat.

---

## Problem: Isolated Learning

Currently: Each algorithm/topic is standalone  
Need: Unified learning graph where everything connects

---

## Solution: Semantic Concept Graph

```typescript
// src/core/concepts/SemanticGraph.ts
export interface ConceptNode {
  id: string
  name: string
  description: string
  category: string // 'algorithm', 'data_structure', 'pattern', 'technique'
  difficulty: number // 1-10
  importance: number // 1-10
  tags: string[]
  
  // Content
  explanation: string
  examples: string[]
  commonMistakes: string[]
  applications: string[]
  
  // Learning
  prerequisites: string[] // Concept IDs
  relatedConcepts: string[]
  learningPath: string[] // Ordered sequence to learn
  
  // AI
  interviewFocus: boolean
  industryRelevance: string[] // Industries where useful
  skillGap?: string // What students commonly struggle with
}

export interface ConceptEdge {
  from: string // Concept ID
  to: string // Concept ID
  type: 'prerequisite' | 'related' | 'application' | 'similar' | 'extends'
  strength: number // 0-1 confidence
  metadata?: {
    explanation?: string
    example?: string
  }
}

export class SemanticConceptGraph {
  private nodes: Map<string, ConceptNode> = new Map()
  private edges: Map<string, ConceptEdge[]> = new Map()
  
  addNode(node: ConceptNode): void {
    this.nodes.set(node.id, node)
  }
  
  addEdge(edge: ConceptEdge): void {
    if (!this.edges.has(edge.from)) {
      this.edges.set(edge.from, [])
    }
    this.edges.get(edge.from)!.push(edge)
  }
  
  // Get all concepts related to a concept
  getRelated(conceptId: string): ConceptNode[] {
    const edges = this.edges.get(conceptId) ?? []
    return edges
      .map(e => this.nodes.get(e.to))
      .filter(Boolean) as ConceptNode[]
  }
  
  // Get prerequisites (what must be learned first)
  getPrerequisites(conceptId: string): ConceptNode[] {
    const node = this.nodes.get(conceptId)
    if (!node) return []
    
    return node.prerequisites
      .map(id => this.nodes.get(id))
      .filter(Boolean) as ConceptNode[]
  }
  
  // Get optimal learning path
  getLearningPath(startConcept: string, endConcept: string): ConceptNode[] {
    // BFS to find shortest path
    const visited = new Set<string>()
    const queue: string[] = [startConcept]
    const parent: Map<string, string> = new Map()
    
    while (queue.length > 0) {
      const current = queue.shift()!
      
      if (current === endConcept) {
        // Reconstruct path
        const path: ConceptNode[] = []
        let node: string | undefined = endConcept
        
        while (node) {
          const conceptNode = this.nodes.get(node)
          if (conceptNode) path.unshift(conceptNode)
          node = parent.get(node)
        }
        
        return path
      }
      
      if (visited.has(current)) continue
      visited.add(current)
      
      const relatedConcepts = this.getRelated(current)
      relatedConcepts.forEach(concept => {
        if (!visited.has(concept.id)) {
          parent.set(concept.id, current)
          queue.push(concept.id)
        }
      })
    }
    
    return []
  }
  
  // Find missing prerequisites
  getMissingPrerequisites(conceptId: string, masteredConcepts: Set<string>): ConceptNode[] {
    const node = this.nodes.get(conceptId)
    if (!node) return []
    
    return node.prerequisites
      .filter(id => !masteredConcepts.has(id))
      .map(id => this.nodes.get(id)!)
      .filter(Boolean)
  }
}
```

---

## Concept Graph Data Structure

```typescript
// src/core/concepts/defaultConceptGraph.ts
const DEFAULT_CONCEPT_GRAPH: ConceptNode[] = [
  // Fundamentals
  {
    id: 'variables',
    name: 'Variables & Assignment',
    category: 'fundamentals',
    difficulty: 1,
    importance: 10,
    prerequisites: [],
    relatedConcepts: ['data_types', 'memory'],
    // ...
  },
  
  // Data Structures
  {
    id: 'arrays',
    name: 'Arrays',
    category: 'data_structure',
    difficulty: 1,
    importance: 10,
    prerequisites: ['variables', 'memory'],
    relatedConcepts: ['lists', 'indexing'],
    // ...
  },
  
  // Algorithms: Sorting
  {
    id: 'sorting',
    name: 'Sorting Algorithms',
    category: 'algorithm',
    difficulty: 3,
    importance: 10,
    prerequisites: ['arrays', 'comparison'],
    relatedConcepts: ['time_complexity', 'space_complexity'],
    interviewFocus: true,
    // ...
  },
  
  {
    id: 'bubble_sort',
    name: 'Bubble Sort',
    category: 'algorithm',
    difficulty: 2,
    importance: 8,
    prerequisites: ['arrays', 'comparison', 'loops'],
    relatedConcepts: ['insertion_sort', 'selection_sort'],
    industryRelevance: ['education'],
    learningPath: ['variables', 'arrays', 'loops', 'comparison', 'bubble_sort'],
    // ...
  },
  
  // ... hundreds more
]
```

---

## AI Integration: Adaptive Learning

### 1. Student Profile

```typescript
// src/core/learning/StudentProfile.ts
export interface StudentProfile {
  id: string
  masteredConcepts: Set<string>
  learningConcepts: Set<string> // Currently working on
  strugglingConcepts: Set<string> // Needs help
  skillLevels: Map<string, number> // Concept ID -> 0-100%
  learningStyle: 'visual' | 'kinesthetic' | 'auditory' | 'mixed'
  pace: 'slow' | 'moderate' | 'fast'
  goals: string[] // Career goals, interview prep, etc.
}

export class AdaptiveLearningEngine {
  private graph: SemanticConceptGraph
  private profile: StudentProfile
  
  constructor(graph: SemanticConceptGraph, profile: StudentProfile) {
    this.graph = graph
    this.profile = profile
  }
  
  // Recommend next concept to learn
  getNextConcept(): ConceptNode | null {
    const candidates: ConceptNode[] = []
    
    for (const [, node] of this.graph.nodes) {
      // Prerequisites satisfied?
      const missingPrereqs = this.graph.getMissingPrerequisites(
        node.id,
        this.profile.masteredConcepts
      )
      
      if (missingPrereqs.length === 0 && !this.profile.masteredConcepts.has(node.id)) {
        candidates.push(node)
      }
    }
    
    // Sort by relevance to goals
    candidates.sort((a, b) => {
      const aGoalMatch = this.scoreGoalRelevance(a)
      const bGoalMatch = this.scoreGoalRelevance(b)
      return bGoalMatch - aGoalMatch
    })
    
    return candidates[0] ?? null
  }
  
  private scoreGoalRelevance(concept: ConceptNode): number {
    let score = 0
    
    // Interview prep goal?
    if (this.profile.goals.includes('interview') && concept.interviewFocus) {
      score += 50
    }
    
    // Industry goal?
    if (this.profile.goals.some(g => 
      concept.industryRelevance?.includes(g)
    )) {
      score += 30
    }
    
    // Difficulty matches pace?
    const paceScore: Record<string, number> = {
      slow: 0, // Prefer easy concepts
      moderate: 5,
      fast: 10 // Prefer harder concepts
    }
    
    if (this.profile.pace === 'slow' && concept.difficulty <= 3) score += paceScore.slow
    if (this.profile.pace === 'moderate' && concept.difficulty <= 6) score += paceScore.moderate
    if (this.profile.pace === 'fast') score += paceScore.fast
    
    return score
  }
  
  // Get explanation tailored to learning style
  async getExplanation(conceptId: string): Promise<string> {
    const node = this.graph.nodes.get(conceptId)
    if (!node) return ''
    
    const prompt = `
Explain "${node.name}" in a ${this.profile.learningStyle} way:
- ${node.explanation}
- Examples: ${node.examples.join(', ')}
- Common mistakes: ${node.commonMistakes.join(', ')}
`
    
    return await this.generateWithAI(prompt)
  }
  
  // Detect weak areas
  getWeakAreas(): ConceptNode[] {
    const weak: ConceptNode[] = []
    
    for (const [conceptId, skillLevel] of this.profile.skillLevels) {
      if (skillLevel < 60) { // < 60% is weak
        const node = this.graph.nodes.get(conceptId)
        if (node) weak.push(node)
      }
    }
    
    return weak.sort((a, b) => {
      const skillA = this.profile.skillLevels.get(a.id) ?? 0
      const skillB = this.profile.skillLevels.get(b.id) ?? 0
      return skillA - skillB // Weakest first
    })
  }
  
  // Generate focused learning plan
  generateLearningPlan(goal: string, timeframes: string): ConceptNode[] {
    // e.g., goal="interview_prep", timeframes="4 weeks"
    const interviewConcepts = Array.from(this.graph.nodes.values())
      .filter(n => n.interviewFocus)
      .sort((a, b) => a.difficulty - b.difficulty) // Start with easy
    
    return interviewConcepts
  }
  
  private async generateWithAI(prompt: string): Promise<string> {
    // Call Claude API with prompt
    const response = await fetch('/api/claude', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    })
    const result = await response.json()
    return result.explanation
  }
}
```

### 2. Scenario Generation

```typescript
// src/core/scenarios/ScenarioGenerator.ts
export class ScenarioGenerator {
  private graph: SemanticConceptGraph
  private profile: StudentProfile
  
  constructor(graph: SemanticConceptGraph, profile: StudentProfile) {
    this.graph = graph
    this.profile = profile
  }
  
  async generateLearningScenario(conceptId: string): Promise<Scenario> {
    const concept = this.graph.nodes.get(conceptId)
    if (!concept) throw new Error(`Concept ${conceptId} not found`)
    
    // Generate customized scenario
    const prompt = `
Generate a learning scenario for teaching: ${concept.name}
- Learning style: ${this.profile.learningStyle}
- Difficulty: ${concept.difficulty}/10
- Real-world application: ${concept.applications[0]}
- Common mistakes to highlight: ${concept.commonMistakes.join(', ')}

Include:
1. Motivation (why learn this?)
2. Real-world example
3. Step-by-step walkthrough
4. Practice problem
5. Edge cases
`
    
    const aiGenerated = await this.generateWithAI(prompt)
    
    return {
      id: `scenario_${conceptId}_${Date.now()}`,
      conceptId,
      title: concept.name,
      content: aiGenerated,
      difficulty: concept.difficulty,
      estimatedTime: this.estimateTime(concept),
      prerequisites: this.graph.getMissingPrerequisites(
        conceptId,
        this.profile.masteredConcepts
      )
    }
  }
  
  async generateInterviewQuestion(conceptId: string): Promise<InterviewQuestion> {
    const concept = this.graph.nodes.get(conceptId)
    if (!concept) throw new Error(`Concept ${conceptId} not found`)
    
    const prompt = `
Generate a technical interview question about: ${concept.name}
- Expected to test: ${concept.skillGap || 'understanding'}
- Level: ${concept.difficulty}/10
- Company focus: FAANG companies

Include:
1. Question
2. Constraints
3. Hints (for follow-up)
4. Full solution with explanation
5. Time complexity analysis
`
    
    const aiGenerated = await this.generateWithAI(prompt)
    
    return {
      id: `interview_${conceptId}_${Date.now()}`,
      conceptId,
      question: aiGenerated,
      difficulty: concept.difficulty,
      estimatedTime: 30 // minutes
    }
  }
  
  private estimateTime(concept: ConceptNode): number {
    // Estimate learning time based on difficulty
    const baseTime = 10 // minutes
    return baseTime * concept.difficulty
  }
  
  private async generateWithAI(prompt: string): Promise<string> {
    const response = await fetch('/api/claude', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    })
    const result = await response.json()
    return result.content
  }
}

interface Scenario {
  id: string
  conceptId: string
  title: string
  content: string
  difficulty: number
  estimatedTime: number
  prerequisites: ConceptNode[]
}

interface InterviewQuestion {
  id: string
  conceptId: string
  question: string
  difficulty: number
  estimatedTime: number
}
```

---

## Knowledge Graph Visualization

```typescript
// src/components/ConceptGraph/ConceptGraphVisualizer.tsx
export function ConceptGraphVisualizer({ graph }: { graph: SemanticConceptGraph }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    if (!canvasRef.current) return
    
    const layout = computeGraphLayout(graph)
    const renderer = new CanvasRenderer(canvasRef.current)
    
    renderer.renderGraph(graph, layout, {
      nodeSize: 30,
      colors: {
        mastered: '#10b981',
        learning: '#f59e0b',
        locked: '#ccc'
      }
    })
  }, [graph])
  
  return (
    <div className="concept-graph">
      <h2>Your Learning Journey</h2>
      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        className="graph-canvas"
      />
      <div className="legend">
        <span className="mastered">Mastered</span>
        <span className="learning">Learning</span>
        <span className="locked">Locked (Prerequisites needed)</span>
      </div>
    </div>
  )
}
```

---

## Files to Create

```
src/core/concepts/
├── SemanticGraph.ts
├── defaultConceptGraph.ts
├── ConceptBuilder.ts
└── index.ts

src/core/learning/
├── StudentProfile.ts
├── AdaptiveLearningEngine.ts
└── LearningPath.ts

src/core/scenarios/
├── ScenarioGenerator.ts
├── InterviewPrepGenerator.ts
└── index.ts

src/components/
├── ConceptGraphVisualizer.tsx
├── AdaptiveLearningDashboard.tsx
└── InterviewPrepMode.tsx

data/
└── concepts.json (exported graph)
```

---

## Exported Data Format

```json
{
  "version": "1.0.0",
  "generatedAt": "2026-05-22T10:00:00Z",
  "nodes": [
    {
      "id": "bubble_sort",
      "name": "Bubble Sort",
      "description": "...",
      "category": "algorithm",
      "difficulty": 2,
      "importance": 8,
      "prerequisites": ["arrays", "comparison"],
      "concepts": ["comparison", "swap", "iteration"]
    }
  ],
  "edges": [
    {
      "from": "arrays",
      "to": "sorting",
      "type": "prerequisite",
      "strength": 0.95
    }
  ],
  "statistics": {
    "totalConcepts": 500,
    "totalEdges": 1200,
    "avgDifficulty": 4.5,
    "avgImportance": 7.2
  }
}
```

---

## Completion Checklist

- [ ] Concept graph designed (500+ concepts)
- [ ] Semantic edges mapped (prerequisites, related, etc.)
- [ ] Graph data structure implemented
- [ ] Adaptive learning engine working
- [ ] Scenario generation from AI
- [ ] Interview prep integration
- [ ] Graph visualization
- [ ] Student profile tracking
- [ ] Learning path optimization
- [ ] Export/import functionality

---

## Success Criteria

✅ **400+ concept nodes with relationships**  
✅ **AI generates 100+ scenarios**  
✅ **Adaptive path for each student**  
✅ **Interview prep auto-generates questions**  
✅ **Weakness detection accurate (>90%)**  
✅ **Learning time estimates accurate**  
✅ **Graph visualization intuitive**  

---

## The Moat: Your Unique Asset

This concept graph is:
- **Hard to replicate**: Takes years to build
- **Continuously improving**: AI generates better content
- **Personalized**: Every student gets unique path
- **Comprehensive**: Covers all CS topics
- **Intelligent**: AI-powered recommendations

This is why you'll win vs. LeetCode, GeeksforGeeks, etc.

---

## Final Architecture

```
Application Layer
  ├── Adaptive Learning Dashboard
  ├── Interview Prep Mode
  ├── Concept Graph Visualization
  └── Scenario Generator

Logic Layer
  ├── SemanticConceptGraph (YOUR MOAT)
  ├── AdaptiveLearningEngine
  ├── StudentProfile Manager
  └── AI Integration (Claude)

Visualization Layer
  ├── VisualizationEngine (Phase 1-4)
  ├── MultiLayerRenderers (Phase 7)
  ├── EventInterpreter (Phase 6)
  └── SceneRenderer (Phase 1)

Data Layer
  ├── EventStore (Phase 5)
  ├── PluginRegistry (Phase 9)
  └── ConceptGraph (Phase 10)

Infrastructure
  ├── Web Workers (Phase 8)
  ├── EventBus
  └── Cache Layer
```

---

## 🚀 You're Building a Platform

Not a tutorial site.  
Not another algorithm visualizer.  

A **programmable educational simulation engine** that:
- ✅ Generates custom learning paths
- ✅ Adapts to student level
- ✅ Powers interview prep
- ✅ Enables collaboration
- ✅ Scales to millions
- ✅ Uses AI for everything

This is **world-class infrastructure**.

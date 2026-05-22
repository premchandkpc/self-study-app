# Architecture Reference

Quick reference for complete platform architecture.

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                         │
│                   (Click "Next", Select Node)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   REACT COMPONENT LAYER                         │
│            (RuntimeBasedVisualizer.jsx - ~50 lines)            │
│                                                                 │
│  - Renders buttons/controls                                    │
│  - Calls hook: advance(), selectNode(), etc.                  │
│  - Renders scene via <SceneRenderer />                        │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   HOOK INTEGRATION LAYER                        │
│              (useSimulationRuntime - ~90 lines)                │
│                                                                 │
│  - Dispatches action to runtime                               │
│  - Subscribes to runtime events                               │
│  - Transforms snapshot to React state                         │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PURE JAVASCRIPT RUNTIME                        │
│                  (SimulationRuntime.ts)                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  State Machine                                          │  │
│  │  - Validates action                                    │  │
│  │  - Updates internal state (pure JS)                   │  │
│  │  - Queries KnowledgeGraph (prereqs met?)              │  │
│  │  - Generates new snapshot                             │  │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                             │
│  ┌──────────────▼──────────────────────────────────────────┐  │
│  │  EventBus.track(...)                                    │  │
│  │  - Log event to timeline                               │  │
│  │  - Emit to subscribers                                 │  │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                             │
│  ┌──────────────▼──────────────────────────────────────────┐  │
│  │  emit('stateChanged', snapshot)                         │  │
│  │  - Send snapshot back to hook                          │  │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                 ────────┘
                 │ (triggers React re-render)
                 ▼
          (Back to React Component)
```

## Component Interaction Diagram

```
SceneRenderer
├── QueueRenderer       → Lists, Arrays, Sequences
├── PipelineRenderer    → Processing steps, flows
├── GraphRenderer       → Networks, relationships
├── TreeRenderer        → Hierarchies
├── TimelineRenderer    → Events, sequences
├── StateMachineRenderer → States, transitions
├── StackRenderer       → LIFO structures
├── MatrixRenderer      → Grids, tables
├── TableRenderer       → Key-value pairs
├── NetworkRenderer     → Topologies
├── FlowchartRenderer   → Decision trees
└── SequenceRenderer    → Interactions

                  ↑ (all use same data structure)

SimulationRuntime
├── advance()           → Move to next scene
├── selectNode()        → User selects element
├── expandNode()        → Reveal details
├── jumpToScene()       → Navigate
└── getSnapshot()       → Return React-ready state

                  ↑ (all emit events through)

EventBus
├── track('SCENE_ADVANCED', ...)
├── track('NODE_SELECTED', ...)
├── track('CONCEPT_MASTERED', ...)
└── export()            → Replay timeline

                  ↑ (all validate through)

KnowledgeGraph
├── getPrerequisites()  → What must come first?
├── getEnabled()        → What does this unlock?
├── recommendNext()     → Adaptive paths
└── generateLearningPath() → Full curriculum
```

## State Machine (SimulationRuntime)

```
┌──────────┐
│   idle   │──advance──→┌─────────┐──advance──→┌──────────┐
└──────────┘            │ running │            │completed │
     ▲                  └────┬────┘            └──────────┘
     │                       │
     │                    rewind
     │                       │
     └───────────────────────┘
```

## Data Structures

### IRLearningUnit
```typescript
{
  id: string
  title: string
  concept: string
  difficulty: 1-5
  scenes: IRScene[]
  interactions: IRInteraction[]
  metadata: {
    technology: string
    domain: string
  }
}
```

### IRScene
```typescript
{
  id: string
  type: 'queue'|'pipeline'|'graph'|...  (12 types)
  title: string
  description: string
  nodes: IRNode[]
  edges: IREdge[]
  animation: IRAnimation
  layout: 'hierarchical'|'circular'|'force'|'grid'
}
```

### SimulationState (React snapshot)
```typescript
{
  state: 'idle'|'running'|'paused'|'completed'
  sceneIndex: number
  scene: IRScene | null
  progress: number (0-100)
  nodeStates: Record<string, any>
}
```

### LearningEvent
```typescript
{
  type: 'SCENE_VIEWED'|'NODE_SELECTED'|'CONCEPT_MASTERED'|...
  userId: string
  conceptId: string
  timestamp: number
  duration: number
  metadata: Record<string, any>
}
```

## File Organization

```
packages/web/src/core/
│
├── ir/ (Semantic Layer)
│  ├── schema.ts                    ← Types
│  ├── contentCompiler.ts           ← Technology → IR
│  ├── sceneRenderer.tsx            ← IR → UI
│  ├── compilers/
│  │  ├── JavaCollectionsCompiler.ts
│  │  └── [Tech]Compiler.ts
│  └── examples/
│     └── [Tech]ToIR.example.ts
│
├── runtimes/ (Logic Layer)
│  ├── SimulationRuntime.ts         ← State machine
│  ├── index.ts
│  └── (future: AnimationEngine.ts, LayoutEngine.ts)
│
├── events/ (Tracking Layer)
│  ├── EventEmitter.ts              ← Pub/sub base
│  ├── EventBus.ts                  ← Learning events
│  └── index.ts
│
├── graph/ (Relationship Layer)
│  ├── KnowledgeGraph.ts            ← Concept graph
│  └── index.ts
│
└── hooks/ (React Bridge)
   ├── useSimulationRuntime.ts      ← Runtime → React
   └── index.ts
```

## Usage Pattern

### Step 1: Define Content
```typescript
const content = {
  concept: 'kafka_pipeline',
  steps: [
    { title: 'Producer', ... },
    { title: 'Broker', ... },
    { title: 'Consumer', ... }
  ]
};
```

### Step 2: Compile to IR
```typescript
const compiler = new YourTechCompiler();
const ir = compiler.compile(content);
```

### Step 3: Render with Runtime
```typescript
<RuntimeBasedVisualizer learningUnit={ir} />

// Inside component:
const { scene, advance, selectNode } = useSimulationRuntime({ 
  learningUnit: ir 
});
```

### Step 4: All Primitives Auto-Render
```typescript
// Same code renders:
// - Kafka pipeline
// - Redis list
// - Java ArrayList
// - Custom system
```

## Key Design Principles

### 1. Runtime Owns Logic
```
✅ Runtime: State transitions, validations, calculations
❌ React: Logic decisions
```

### 2. React Owns Visualization
```
✅ React: Rendering, user interactions, DOM
❌ Runtime: Presentation decisions
```

### 3. Events Connect Them
```
Runtime emits 'stateChanged'
   → Hook receives → React updates → Component re-renders
```

### 4. IR Abstracts Technology
```
Technology Content (Kafka, Redis, Java)
   → Compiler
   → IR (queue, pipeline, graph primitives)
   → Renderer (generic, tech-agnostic)
```

### 5. Graph Models Relationships
```
Topics connected via prerequisite/enables/related edges
   → Path generation
   → Recommendations
   → Adaptive learning
```

## Testing Strategy

### Unit Test (No React)
```typescript
// Test runtime logic in isolation
const runtime = new SimulationRuntime(config);
runtime.advance();
expect(runtime.getSnapshot().sceneIndex).toBe(1);
```

### Integration Test (With Hook)
```typescript
// Test hook connects runtime to React
const { result } = renderHook(() => useSimulationRuntime(...));
act(() => result.current.advance());
expect(result.current.sceneIndex).toBe(1);
```

### E2E Test (Full Component)
```typescript
// Test component + runtime + rendering
render(<RuntimeBasedVisualizer learningUnit={ir} />);
fireEvent.click(screen.getByText('Next'));
expect(screen.getByText('Scene 2')).toBeInTheDocument();
```

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| advance() | O(1) | Direct state update |
| selectNode() | O(n) | Update in nodeStates map |
| getPrerequisites() | O(n) | Graph traversal |
| recommendNext() | O(n²) | Analyze prerequisites |
| track() | O(1) | Append to event log |
| replay() | O(m) | m = number of events |

## Scalability

| Dimension | Capacity |
|-----------|----------|
| Topics | 1000+ (no code changes) |
| Concurrent users | 10,000+ (via multiplayer) |
| Event log size | 1GB+ (compressed) |
| Concept relationships | 10,000+ edges |
| Component reuse | 12 renderers for all |

## What's Testable Without React

- SimulationRuntime state transitions
- EventBus event tracking
- KnowledgeGraph path generation
- Compiler content transformation
- Event log replay
- Snapshot generation

## What Requires React

- DOM rendering
- CSS styling
- Animation timing
- User interactions
- Browser APIs

## Configuration

### Learning Unit (Minimal)
```typescript
{
  id: 'kafka-intro',
  title: 'Kafka Introduction',
  scenes: [
    {
      type: 'pipeline',
      nodes: [...],
      edges: [...]
    }
  ]
}
```

### With Metadata
```typescript
{
  ...,
  concept: 'event-driven-architecture',
  difficulty: 3,
  prerequisites: ['async-programming', 'distributed-systems'],
  metadata: {
    technology: 'kafka',
    domain: 'backend',
    estimatedMinutes: 15,
    keywords: ['messaging', 'events', 'scaling']
  }
}
```

## Future Extensions

### AnimationEngine
```typescript
const animator = new AnimationEngine(scene);
animator.play();
animator.onStep((time, frame) => updateVisuals(frame));
```

### LayoutEngine
```typescript
const layout = new LayoutEngine();
const positioned = layout.layout(scene.nodes, scene.edges, {
  algorithm: 'force-directed',
  bounds: { width: 800, height: 600 }
});
```

### InteractionRuntime
```typescript
const interaction = new InteractionRuntime(scene);
interaction.on('NODE_CLICKED', (nodeId) => {
  // Handle interaction
});
```

### AITutorRuntime
```typescript
const tutor = new AITutorRuntime(eventBus);
const guidance = await tutor.getHint({
  conceptId,
  recentEvents: eventBus.getEventLog()
});
```

# Platform Architecture: Runtime-Driven Educational System

Complete system design for scalable learning platform (N+M not N×M).

---

## System Layers (Bottom to Top)

```
┌─────────────────────────────────────┐
│  React UI Layer                     │  (visualization only)
│  - SceneRenderer                    │
│  - RuntimeBasedVisualizer           │
│  - ProgressBar, Controls            │
└─────────────────────────────────────┘
            ↑ (snapshots & events)
┌─────────────────────────────────────┐
│  Hook Integration Layer             │  (useSimulationRuntime)
│  - Subscribe to runtime events      │
│  - Dispatch actions to runtime      │
│  - Zero state management            │
└─────────────────────────────────────┘
            ↑ (pure JS)
┌─────────────────────────────────────┐
│  Runtime Layer (Pure JS)            │  (where logic lives)
│  - SimulationRuntime                │
│  - EventBus (tracking)              │
│  - KnowledgeGraph (relationships)   │
│  - AnimationEngine (future)         │
│  - LayoutEngine (future)            │
└─────────────────────────────────────┘
            ↑ (IR scenes)
┌─────────────────────────────────────┐
│  Content Compiler Layer             │  (content → IR)
│  - ContentCompiler                  │
│  - JavaCollectionsCompiler          │
│  - KafkaCompiler (future)           │
│  - [TechName]Compiler              │
└─────────────────────────────────────┘
            ↑ (IR schema)
┌─────────────────────────────────────┐
│  IR (Semantic Layer)                │  (abstract concepts)
│  - PrimitiveTypes (12)              │
│  - IRScene, IRNode, IREdge          │
│  - IRAnimation, IRAnimation         │
│  - Interaction model                │
└─────────────────────────────────────┘
            ↑ (IR)
┌─────────────────────────────────────┐
│  Content Sources                    │
│  - Technology concepts              │
│  - Learning metadata                │
│  - Visualizations (DSL/YAML/JSON)   │
└─────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. React Is ONLY Visualization

```tsx
// React does this (visualization):
<div>
  <SceneRenderer scene={scene} />
  <button onClick={advance}>Next</button>
</div>

// React does NOT do this (simulation logic):
// ❌ const [state, setState] = useState(...)
// ❌ Complex simulation arithmetic
// ❌ Graph traversal
// ❌ State machine transitions
```

**Why**: Decoupling enables:
- Unit testing logic without React
- Replay from event log
- Multiplayer synchronization
- AI guidance injection
- State serialization

### 2. SimulationRuntime Owns All Logic

```typescript
// SimulationRuntime (pure JS)
class SimulationRuntime {
  advance() { /* state machine logic */ }
  selectNode() { /* interaction logic */ }
  getSnapshot() { /* react-ready snapshot */ }
}

// React hook bridges them
const [snapshot, dispatch] = useReducer(...);
runtime.on('stateChanged', (newSnapshot) => dispatch(newSnapshot));
```

**Result**: 
- Runtime doesn't know about React
- Runtime can be tested independently
- Runtime can be used in Node.js, Canvas, WebWorker

### 3. EventBus Tracks Everything

```typescript
// All meaningful events logged
eventBus.track('NODE_SELECTED', conceptId, { nodeId: 'x' });
eventBus.track('CONCEPT_MASTERED', conceptId, { timeSpent: 120000 });

// Can replay entire session
const events = eventBus.getSessionTimeline();
runtime.replay(events);

// Can analyze learning patterns
const stats = eventBus.getConceptStats(conceptId);
```

**Enables**:
- Analytics without external tools
- Session replay for debugging
- Spaced repetition schedules
- AI tutor context (what did user struggle with?)

### 4. KnowledgeGraph Models Concepts

```typescript
// Graph relationships
graph.addConcept({ id: 'kafka', ... });
graph.addEdge({ from: 'event-systems', to: 'kafka', type: 'prerequisite' });

// Query it
graph.getPrerequisites('kafka-streams'); // → [kafka, event-systems]
graph.getEnabled('kafka'); // → [kafka-streams, kafka-connect]
graph.recommendNext(['kafka', 'databases']); // → [kafka-streams, ...]
```

**Enables**:
- Adaptive learning paths
- Prerequisite enforcement
- Recommendation engine
- Skill graph visualization

### 5. Content Is Semantic, Not Visual

```typescript
// Content (semantic):
{
  concept: 'event_pipeline',
  actors: ['producer', 'broker', 'consumer'],
  flow: 'sequential'
}

// Compiler → IR (abstract):
{
  type: 'pipeline',
  nodes: [producer_node, broker_node, consumer_node],
  edges: [flow1, flow2]
}

// Renderer → UI (visual):
<div>
  <Box>Producer</Box>
  <Arrow>→</Arrow>
  <Box>Broker</Box>
  ...
</div>
```

**Result**: Same content renders to:
- SVG (web)
- Canvas (high-performance)
- React Native (mobile)
- Terminal (CLI)

---

## Data Flow

### Typical User Interaction

```
User clicks "Next" button
    ↓
RuntimeBasedVisualizer.advance()
    ↓
useSimulationRuntime hook dispatches to runtime
    ↓
SimulationRuntime.advance()
    ├─ Updates internal state (pure JS)
    ├─ Validates against KnowledgeGraph (prereqs met?)
    ├─ Emits event via EventBus ('SCENE_ADVANCED')
    └─ Calls emit('stateChanged', newSnapshot)
    ↓
Hook receives stateChanged event
    ↓
useSimulationRuntime updates React state (snapshot)
    ↓
Component re-renders
    ↓
<SceneRenderer scene={snapshot.scene} />
```

**Key**: React never holds simulation state. It only visualizes runtime's output.

### Session Replay

```
EventBus has timeline of all events
    ↓
Export: eventBus.export() → [events]
    ↓
Send to backend (analytics, user study, etc.)
    ↓
Later: Load from DB
    ↓
runtime.replay(events) → reconstructs entire session
    ↓
Can play back frame-by-frame, jump to moments
```

---

## Component Templates

### For New Technology (e.g., Redis)

```typescript
// Step 1: Create compiler
class RedisCompiler extends ContentCompiler {
  protected mapTechnologyToPrimitive(tech: string, concept: string) {
    return { 'redis': { 'list': 'queue', 'set': 'graph' } }[tech]?.[concept];
  }
}

// Step 2: Define content
const redisContent = {
  concept: 'redis_list',
  steps: [ { title: 'Push element', ... } ],
};

// Step 3: Compile
const compiler = new RedisCompiler();
const ir = compiler.compile(redisContent);

// Step 4: Use in component
<RuntimeBasedVisualizer learningUnit={ir} />

// DONE. No custom rendering code needed.
```

### For New Visualization Type

```typescript
// Currently SceneRenderer has stubs:
function StackRenderer({ scene }) { return <div>Stub</div>; }
function TreeRenderer({ scene }) { return <div>Stub</div>; }

// Implement one:
function StackRenderer({ scene }) {
  return (
    <div className={styles.stack}>
      {scene.nodes.map(node => (
        <div key={node.id} className={styles.stackFrame}>
          {node.label}
        </div>
      ))}
    </div>
  );
}

// Done. All concepts using 'stack' primitive now render.
```

### For New Feature (e.g., Hints)

```typescript
// Add to IR schema
interface IRInteraction {
  type: 'click' | 'hover' | 'hint_request';
  target: string;
  action: 'expand' | 'reveal_hint';
}

// Runtime handles it
runtime.on('HINT_REQUESTED', () => {
  eventBus.track('HINT_USED', conceptId);
  // Emit hint scene
  emit('stateChanged', { ...snapshot, hintShown: true });
});

// React renders it
{snapshot.hintShown && <HintPanel />}

// No changes needed to SimulationRuntime abstraction.
```

---

## Scalability Tests

### 500 Topics Test

**Before**: Each topic needs custom rendering component
```
Topics: 500
Unique renderers needed: ~50 (one per visualization type)
Lines of code: ~50,000+
Maintenance: Very high
```

**After**: Topics are just data
```
Topics: 500
Renderers needed: 12 (one per primitive type)
Lines of code: ~5,000
Maintenance: Low
New topic: Just add to graph (no code changes)
```

### Complex Feature Test

**Adding "User Hints" feature**:

Before: Modify every visualizer component (50+ files)
```
❌ Error-prone
❌ Inconsistent behavior
❌ Days of work
```

After: Add to IR schema + update hook
```
✅ Changes in 3 files max
✅ Consistent everywhere
✅ Hours of work
```

---

## Future Capabilities Enabled

### 1. Multiplayer Learning

```typescript
// Share runtime events with server
socket.on('peer_advanced_scene', (event) => {
  peerRuntime.replay([event]);
  // Both see same animation
});
```

### 2. AI Tutoring

```typescript
const eventLog = eventBus.export();
const tutorResponse = await askTutor({
  conceptId,
  eventLog,
  query: 'I don\'t understand partitions'
});
// AI has full session context
```

### 3. Adaptive Learning

```typescript
const mastered = eventBus.getMasteredConcepts();
const recommended = graph.recommendNext(mastered);
// Auto-select next topic based on mastery
```

### 4. Analytics

```typescript
const stats = {
  avgTimePerConcept: eventBus.query({ type: 'CONCEPT_MASTERED' })
    .map(e => e.duration).reduce((a, b) => a + b) / count,
  strugglingConcepts: concepts.filter(c => 
    eventBus.getConceptStats(c).successRate < 0.5
  ),
};
```

---

## File Structure

```
packages/web/src/core/
├── ir/                          # Semantic layer
│   ├── schema.ts               # Type definitions
│   ├── contentCompiler.ts      # Base compiler
│   ├── sceneRenderer.tsx       # Generic renderers
│   ├── compilers/
│   │   ├── JavaCollectionsCompiler.ts
│   │   ├── KafkaCompiler.ts (TODO)
│   │   └── [Tech]Compiler.ts
│   └── examples/
│
├── runtimes/                    # Logic layer (pure JS)
│   ├── SimulationRuntime.ts    # Main runtime
│   ├── AnimationRuntime.ts (TODO)
│   ├── LayoutEngine.ts (TODO)
│   └── index.ts
│
├── graph/                       # Concept relationships
│   ├── KnowledgeGraph.ts
│   └── index.ts
│
├── events/                      # Event system
│   ├── EventEmitter.ts
│   ├── EventBus.ts
│   └── index.ts
│
└── hooks/
    ├── useSimulationRuntime.ts # React bridge
    └── useKnowledgeGraph.ts (TODO)
```

---

## Testing Strategy

### Unit Test Runtime (No React)

```typescript
it('advances scene on user action', () => {
  const runtime = new SimulationRuntime(config);
  const snapshot = runtime.getSnapshot();
  expect(snapshot.sceneIndex).toBe(0);

  runtime.advance();
  const nextSnapshot = runtime.getSnapshot();
  expect(nextSnapshot.sceneIndex).toBe(1);
});
```

### Integration Test Hook

```typescript
it('connects runtime to React', () => {
  const { result } = renderHook(() =>
    useSimulationRuntime({ learningUnit })
  );

  act(() => result.current.advance());
  expect(result.current.sceneIndex).toBe(1);
});
```

### E2E Test Component

```typescript
it('renders visualization and advances on button click', () => {
  render(<RuntimeBasedVisualizer learningUnit={ir} />);
  
  fireEvent.click(screen.getByText('Next'));
  
  expect(screen.getByText('Scene 2')).toBeInTheDocument();
});
```

---

## Migration Path (Existing Visualizers)

### Step 1: Extract logic to RuntimeBase
```typescript
// Before: All logic in JavaCollectionsVisualizer.jsx
// After: Simulation logic moves to SimulationRuntime
```

### Step 2: Use hook
```typescript
const { advance, scene, ... } = useSimulationRuntime({ learningUnit });
```

### Step 3: Simplify component
```tsx
// Was: 300 lines of state, conditionals, animations
// Now: 50 lines of JSX only
```

### Step 4: Done
No changes needed to IR or runtime layers.

---

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| State management | In components | In runtime |
| Testing | React Testing Library only | Pure unit tests |
| Replay | Impossible | Event log |
| Multiplayer | Hard | EventBus pub/sub |
| New tech | Write renderer | Write compiler |
| New feature | Modify all components | Modify runtime + IR |
| Code duplication | High (N×M) | Low (N+M) |
| Lines per visualizer | 300+ | 50 |
| Total codebase | ~30,000 | ~10,000 |

---

## Victory Conditions

✅ Can add 500 topics without writing components
✅ Runtime testable without React  
✅ Events can be replayed from log
✅ Same code renders on web/mobile/canvas
✅ IR schema is stable (new features don't break it)
✅ Compiler is extensible (new tech easy to add)
✅ Analytics and AI ready (events available)

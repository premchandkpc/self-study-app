# Phase 1: Universal Primitives + Runtime Engine

**Duration**: 2 weeks
**Goal**: Build foundational primitives and a domain-agnostic runtime engine that ANY system can plug into.

---

## Core Principle

```
Everything = Graph of Entities → Events → Frames → Timeline → Engine → Render
NO feature-specific code in the runtime
```

---

## Week 1: Universal Primitives

### Day 1-2: Entity System

Design the base entity that ALL domains inherit from.

```typescript
// src/runtime/primitives/Entity.ts
export class Entity {
  readonly id: string
  readonly kind: EntityKind   // 'node' | 'edge' | 'packet' | 'thread' | 'pod' | ...
  readonly type: string       // 'array-element' | 'broker' | 'producer' | ...
  labels: Map<string, string>
  properties: Map<string, any>
  metadata: EntityMetadata

  constructor(id: string, kind: EntityKind, type: string)
  set(key: string, val: any): void
  get(key: string): any
  clone(): Entity
  toJSON(): EntitySchema
}

// Entity kinds — universal set that extends to ALL domains
type EntityKind =
  | 'node' | 'edge' | 'packet' | 'message'
  | 'thread' | 'process' | 'pod' | 'service'
  | 'broker' | 'partition' | 'consumer' | 'producer'
  | 'memory-block' | 'stack-frame' | 'heap-object'
  | 'tensor' | 'layer' | 'neuron'
  | 'lock' | 'queue' | 'semaphore'
  | 'pipeline-stage' | 'cpu-core'
  | 'database-page' | 'index' | 'transaction'
  | 'actor' | 'fiber' | 'coroutine'
  | 'custom'
```

**Deliverable**: `Entity` class serializable to JSON, cloneable, extensible.

### Day 3-4: Graph System

```typescript
// src/runtime/primitives/Graph.ts
export class Graph {
  private nodes: Map<string, Entity>
  private edges: Map<string, Edge>
  private adjacency: Map<string, Set<string>>

  addEntity(entity: Entity): void
  removeEntity(id: string): void
  connect(from: string, to: string, label?: string): Edge
  disconnect(from: string, to: string): void
  getNeighbors(id: string): Entity[]
  subgraph(ids: Set<string>): Graph
  diff(other: Graph): GraphDiff
  clone(): Graph
  toJSON(): GraphSchema
}

export interface GraphDiff {
  added: Entity[]
  removed: string[]
  modified: { id: string; before: any; after: any }[]
  edgeChanges: EdgeDelta[]
}

export interface GraphSchema {
  nodes: EntitySchema[]
  edges: EdgeSchema[]
  metadata: { version: number; createdAt: number }
}
```

**Deliverable**: `Graph` class with diff, clone, subgraph, serialization.

### Day 5: Event System

```typescript
// src/runtime/events/Event.ts
export interface RuntimeEvent {
  id: string
  type: EventType
  timestamp: number
  frameId: number

  // What changed
  entityId?: string
  property?: string
  oldValue?: any
  newValue?: any

  // Semantic
  concept?: string
  category?: string
  importance?: number

  // Trace
  source?: 'algorithm' | 'user' | 'system' | 'ai' | 'replay'
  causeEventId?: string
}

// Universal event types — covers ALL domains
type EventType =
  // State
  | 'ENTITY_CREATED' | 'ENTITY_DELETED'
  | 'PROPERTY_CHANGED' | 'LABEL_ADDED' | 'LABEL_REMOVED'
  // Graph
  | 'NODE_ADDED' | 'NODE_REMOVED'
  | 'EDGE_ADDED' | 'EDGE_REMOVED'
  // Flow
  | 'MESSAGE_SENT' | 'MESSAGE_RECEIVED'
  | 'PACKET_IN_FLIGHT' | 'PACKET_DROPPED'
  // Execution
  | 'FUNCTION_CALL' | 'FUNCTION_RETURN'
  | 'VARIABLE_MUTATED' | 'STACK_PUSHED' | 'STACK_POPPED'
  // Concurrency
  | 'THREAD_STARTED' | 'THREAD_BLOCKED' | 'THREAD_WOKEN'
  | 'LOCK_ACQUIRED' | 'LOCK_RELEASED'
  // Memory
  | 'MEMORY_ALLOCATED' | 'MEMORY_FREED'
  | 'GC_MARK' | 'GC_SWEEP'
  // Network
  | 'REQUEST_SENT' | 'RESPONSE_RECEIVED'
  | 'CONNECTION_ESTABLISHED' | 'CONNECTION_CLOSED'
  // AI
  | 'REASONING_STEP' | 'INFERENCE_COMPLETE'
  // Custom
  | 'CUSTOM'
```

**Deliverable**: `RuntimeEvent` + `EventBus` with pub/sub, filtering, history.

---

## Week 2: Runtime Engine

### Day 1-2: Timeline + Frame Builder

```typescript
// src/runtime/timeline/Timeline.ts
export class Timeline {
  private frames: Frame[]
  private eventsBuffer: RuntimeEvent[]

  addEvent(event: RuntimeEvent): void
  buildFrames(): void
  getFrame(index: number): Frame | null
  frameCount(): number
  seek(frameId: number): Frame | null
  export(): TimelineSchema
}

export interface Frame {
  id: number
  timestamp: number
  events: RuntimeEvent[]
  state: Graph  // Snapshot at this point
}

export interface TimelineSchema {
  frames: FrameSchema[]
  totalDuration: number
  eventCount: number
}
```

### Day 3-4: RuntimeEngine Orchestrator

```typescript
// src/runtime/engine/RuntimeEngine.ts
export class RuntimeEngine {
  private graph: Graph
  private timeline: Timeline
  private scheduler: Scheduler
  private eventBus: EventBus
  private state: EngineState

  constructor(graph: Graph)

  // State machine
  start(): void
  pause(): void
  resume(): void
  stop(): void
  reset(): void

  // Event ingestion
  ingest(event: RuntimeEvent): void
  ingestBatch(events: RuntimeEvent[]): void

  // Playback
  play(speed?: number): void
  seek(frameIndex: number): void
  stepForward(): void
  stepBackward(): void

  // Queries
  getCurrentFrame(): Frame
  getCurrentGraph(): Graph
  getTimeline(): Timeline
  getState(): EngineState

  // Callbacks
  onFrameChange(cb: (frame: Frame) => void): void
  onStateChange(cb: (state: EngineState) => void): void
  onGraphChange(cb: (diff: GraphDiff) => void): void

  // Lifecycle
  dispose(): void
}

type EngineState = 'idle' | 'running' | 'paused' | 'completed' | 'error'
```

### Day 5: Scheduler

```typescript
// src/runtime/scheduler/Scheduler.ts
export class Scheduler {
  private frameDelay: number
  private speed: number
  private direction: 1 | -1
  private animationId: number | null
  private lastTick: number

  constructor(frameCount: number, frameDelay?: number)

  play(): void
  pause(): void
  setSpeed(speed: number): void
  setDirection(dir: 1 | -1): void
  seek(frameIndex: number): void
  reset(): void

  onTick(cb: (frameIndex: number) => void): void
  dispose(): void
}
```

---

## Folder Structure Created

```
src/runtime/
├── primitives/
│   ├── Entity.ts
│   ├── Graph.ts
│   └── index.ts
├── events/
│   ├── Event.ts
│   ├── EventBus.ts
│   └── index.ts
├── timeline/
│   ├── Timeline.ts
│   └── index.ts
├── engine/
│   ├── RuntimeEngine.ts
│   └── index.ts
├── scheduler/
│   ├── Scheduler.ts
│   └── index.ts
└── index.ts
```

---

## Architecture Diagram

```
                    ┌──────────────────┐
                    │    Domain API    │
                    │  (Bubble Sort,   │
                    │   Kafka, JVM...) │
                    └────────┬─────────┘
                             │ emits
                             ▼
                    ┌──────────────────┐
                    │    EventBus      │
                    │  pub/sub/history │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   Timeline       │
                    │  Frame Builder   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
      ┌────────────┐ ┌────────────┐ ┌────────────┐
      │  Scheduler │ │  Runtime   │ │   Graph    │
      │  play/pause│ │  Engine    │ │  State Mgr │
      │  speed/dir │ │  State     │ │  Snapshot  │
      └────────────┘ │  Machine   │ └────────────┘
                     └────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │   Renderer(s)    │
                    │  Canvas / SVG /  │
                    │  WebGL / React   │
                    └──────────────────┘
```

---

## Success Criteria

- [x] `Entity` can represent ANY domain object
- [x] `Graph` supports CRUD, diff, clone, serialization
- [x] `RuntimeEvent` covers all core event types
- [x] `EventBus` supports pub/sub + history replay
- [x] `Timeline` builds frames from events
- [x] `RuntimeEngine` orchestrates full lifecycle
- [x] `Scheduler` controls play/pause/speed/direction
- [x] Everything serializable to JSON
- [x] Zero algorithm-specific code in runtime
- [x] Tests for every class

---

## Test Strategy

```
describe('Entity')
- can create any entity kind
- properties set/get work
- clone produces independent copy
- toJSON/fromJSON roundtrip

describe('Graph')
- add/remove entities
- connect/disconnect edges
- diff detects changes
- subgraph filters correctly

describe('RuntimeEvent')
- all event types creatable
- event bus delivers events
- history replayable
- events serializable

describe('Timeline')
- builds frames from events
- frame seeking works
- frame boundaries correct

describe('RuntimeEngine')
- state machine transitions
- play/pause/reset/stop
- event ingestion
- frame callbacks fire
```

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Entity kind explosion | Use string extensibility + registry |
| Event type inflation | Generic CUSTOM type + semantic tags |
| Graph memory with large states | Lazy snapshotting, diffs only |
| Timeline memory with many frames | Frame compression, skip empty frames |
| Engine complexity | Clear state machine, test every transition |

---

## Next Phase (Phase 2)

With primitives + runtime working: add semantic graph, typed event pipeline, serialization protocol.

# Phase 2: Semantic Graph + Event Pipeline

**Duration**: 2 weeks
**Goal**: Add semantic metadata layer, typed event pipeline, serialization protocol, and graph query system.

---

## Week 1: Semantic Graph System

### Day 1-2: SemanticNode + SemanticEdge

Extend base Entity with semantic properties.

```typescript
// src/semantic/SemanticNode.ts
export interface SemanticNode {
  // From Entity
  id: string; kind: EntityKind; type: string

  // Semantic
  concept: ConceptName
  category: ConceptCategory
  complexity: Complexity
  importance: number  // 0-1

  // Educational
  interviewRelevant: boolean
  whyItMatters?: string
  prerequisites: string[]   // concept IDs
  relatedConcepts: string[] // concept IDs

  // AI
  embedding?: number[]
  keywords: string[]
  llmPrompt?: string
}

// Universal concept taxonomy
type ConceptName =
  | 'comparison' | 'swapping' | 'partitioning' | 'merging'
  | 'hashing' | 'rehashing' | 'collision-resolution'
  | 'replication' | 'partitioning' | 'consensus' | 'election'
  | 'memory-allocation' | 'garbage-collection' | 'mark-sweep'
  | 'context-switch' | 'scheduling' | 'deadlock' | 'race-condition'
  | 'forward-pass' | 'backpropagation' | 'gradient-descent'
  | 'tcp-handshake' | 'routing' | 'congestion-control'
  | 'publish-subscribe' | 'consumer-group' | 'offset-commit'
  | 'raft' | 'paxos' | 'gossip' | 'crdt'
  | 'custom'
```

### Day 3-4: SemanticGraph

```typescript
// src/semantic/SemanticGraph.ts
export class SemanticGraph {
  private graph: Graph
  private conceptIndex: Map<string, SemanticNode[]>
  private relationshipIndex: Map<string, SemanticEdge[]>

  // Core
  addNode(node: SemanticNode): void
  addEdge(from: string, to: string, rel: RelationshipType): void

  // Semantic query
  findByConcept(concept: ConceptName): SemanticNode[]
  findPath(from: string, to: string): SemanticNode[]
  getPrerequisites(id: string): SemanticNode[]
  getDependents(id: string): SemanticNode[]
  getLearningPath(start: string, goal: string): SemanticNode[]

  // AI
  getConceptEmbedding(id: string): number[]
  semanticSearch(query: string, limit?: number): SemanticNode[]

  // Serialization
  export(): SemanticGraphSchema
  static import(schema: SemanticGraphSchema): SemanticGraph
}

type RelationshipType =
  | 'prerequisite' | 'depends-on' | 'related-to'
  | 'implements' | 'extends' | 'specializes'
  | 'part-of' | 'contains' | 'produces' | 'consumes'
  | 'synchronizes-with' | 'conflicts-with'
  | 'flows-to' | 'transforms-to'
  | 'custom'
```

### Day 5: Event Semantic Enrichment

```typescript
// Attach semantic metadata to every event
export interface SemanticEvent extends RuntimeEvent {
  // Semantic
  concept: ConceptName
  category: ConceptCategory
  complexity: Complexity
  importance: number
  explanation: string

  // Educational
  interviewRelevant?: boolean
  whyItMatters?: string
  learningObjective?: string

  // AI metadata
  embeddingHint?: string
  llmContext?: string
}
```

---

## Week 2: Event Pipeline + Protocol

### Day 1-2: Typed Event Bus

```typescript
// src/runtime/events/EventBus.ts
export class EventBus {
  private history: RuntimeEvent[]
  private subscribers: Map<EventType, Set<EventHandler>>

  // Typed subscription
  on<T extends RuntimeEvent>(type: EventType, handler: (e: T) => void): void
  off(type: EventType, handler: EventHandler): void

  // Publish
  emit(event: RuntimeEvent): void

  // Pipeline
  addMiddleware(mw: EventMiddleware): void
  // Middleware can: transform, filter, enrich, log, persist

  // Replay
  replay(from: number, to: number): RuntimeEvent[]
  getHistory(filter?: EventFilter): RuntimeEvent[]

  // Metrics
  getStats(): { total: number; byType: Map<EventType, number> }
}

type EventMiddleware = (event: RuntimeEvent, next: () => void) => void
```

Event pipeline stages:
```
emit → enrich (add semantic metadata) → validate → persist → notify subscribers → render
```

### Day 3-4: Serialization Protocol

```typescript
// src/protocols/Serialization.ts
// Universal serialization for ALL runtime objects

export interface SerializedFrame {
  id: number
  timestamp: number
  events: SerializedEvent[]
  state: SerializedGraph
}

export interface SerializedEvent {
  type: string
  frameId: number
  timestamp: number
  entityId?: string
  property?: string
  oldValue?: any
  newValue?: any
  concept?: string
  explanation?: string
}

export interface SerializedGraph {
  nodes: SerializedEntity[]
  edges: SerializedEdge[]
  version: number
}

// Compression
export function compressFrames(frames: Frame[]): Buffer
export function decompressFrames(data: Buffer): Frame[]
```

### Day 5: Protocol Buffers Schema

```protobuf
// proto/runtime.proto
syntax = "proto3";

message Entity {
  string id = 1;
  string kind = 2;
  string type = 3;
  map<string, string> labels = 4;
  map<string, bytes> properties = 5;
}

message RuntimeEvent {
  string id = 1;
  string type = 2;
  int64 timestamp = 3;
  int32 frameId = 4;
  string entityId = 5;
  string property = 6;
  bytes oldValue = 7;
  bytes newValue = 8;
  string concept = 9;
  string explanation = 10;
}

message Frame {
  int32 id = 1;
  int64 timestamp = 2;
  repeated RuntimeEvent events = 3;
  Graph state = 4;
}

message Graph {
  repeated Entity nodes = 1;
  repeated Edge edges = 2;
  int32 version = 3;
}
```

---

## Files Created

```
src/semantic/
├── SemanticNode.ts
├── SemanticEdge.ts
├── SemanticGraph.ts
├── concepts.ts          # Concept taxonomy
└── index.ts

src/runtime/events/
├── EventBus.ts          # (updated)
├── EventMiddleware.ts
└── index.ts

src/protocols/
├── Serialization.ts
├── proto/runtime.proto
└── index.ts
```

---

## Success Criteria

- [ ] SemanticNode covers 50+ concepts
- [ ] SemanticGraph supports queries, paths, prerequisites
- [ ] EventBus has middleware pipeline
- [ ] Events enriched with semantic metadata
- [ ] Full serialization/deserialization roundtrip
- [ ] Compression works for 10K+ events
- [ ] Zero domain-specific code in semantic layer

---

## Next Phase (Phase 3)

With semantic graph + event pipeline: build the execution trace engine — variable tracking, stack frames, state reconstruction.

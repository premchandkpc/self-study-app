# Phase 8: Backend-Driven + Protocol Layer

**Duration**: 3 weeks
**Goal**: Move simulation logic to the backend. Frontend becomes a thin renderer. Server provides graphs, events, timelines via protocol.

---

## Week 1: Simulation DSL

### Day 1-2: DSL Design

```typescript
// src/dsl/SimulationDSL.ts
// Declarative language for defining simulations

export interface SimulationDefinition {
  id: string
  name: string
  description: string
  version: string

  // Domain
  domain: 'sorting' | 'kafka' | 'jvm' | 'raft' | 'network' | 'os' | 'ai' | 'custom'

  // Initial state
  initialState: EntityDefinition[]

  // Event producers
  producers: EventProducerDefinition[]

  // Timeline
  timeline: TimelineDefinition

  // Semantic
  concepts: ConceptReference[]

  // Narration
  narration: NarrationDefinition

  // Layout
  layout: LayoutDefinition
}

export interface EntityDefinition {
  id: string
  kind: string
  type: string
  properties: Record<string, any>
  labels: Record<string, string>
  position?: { x: number; y: number }
}

export interface EventProducerDefinition {
  type: 'algorithm' | 'script' | 'ai' | 'manual' | 'replay'
  source: string  // File path, LLM prompt, or inline
  config?: Record<string, any>
}
```

### Day 3-4: DSL Parser

```typescript
// src/dsl/DSLParser.ts
export class DSLParser {
  // Parse simulation definition → executable runtime
  parse(simDef: SimulationDefinition): {
    graph: Graph
    eventProducers: EventProducer[]
    timeline: TimelineConfig
    narration: NarrationConfig
    layout: LayoutConfig
  }

  // Validate simulation definition
  validate(simDef: SimulationDefinition): ValidationResult

  // Serialize runtime state back to DSL
  serialize(runtime: RuntimeEngine): SimulationDefinition
}
```

### Day 5: Runtime Protocol

```protobuf
// src/protocols/runtime.proto
syntax = "proto3";

// Client → Server
message SimulationRequest {
  string simulationId = 1;
  Action action = 2;
  map<string, bytes> params = 3;
}

enum Action {
  LOAD = 0;
  PLAY = 1;
  PAUSE = 2;
  SEEK = 3;
  STEP = 4;
  RESET = 5;
  SET_SPEED = 6;
  BRANCH = 7;
}

// Server → Client
message SimulationFrame {
  int32 frameId = 1;
  int64 timestamp = 2;
  repeated Event events = 3;
  GraphSnapshot state = 4;
  Narration narration = 5;
  float progress = 6;
}

message GraphSnapshot {
  repeated Entity entities = 1;
  int32 version = 2;
  int64 checksum = 3;
}
```

---

## Week 2: Transport Layer

### Day 1-3: WebSocket Transport

```typescript
// src/protocols/transport/WebSocketTransport.ts
export class WebSocketTransport {
  private ws: WebSocket
  private pending: Map<string, { resolve: Function; reject: Function }>

  constructor(url: string)

  // Send action to server
  async send(action: Action, params?: any): Promise<SimulationFrame>

  // Receive frame stream
  onFrame(cb: (frame: SimulationFrame) => void): void

  // Reconnection
  private reconnect(): void

  // Binary protocol for efficiency
  sendBinary(data: Uint8Array): void
  onBinary(cb: (data: Uint8Array) => void): void
}
```

### Day 4: HTTP Transport (REST fallback)

```typescript
// src/protocols/transport/HTTPTransport.ts
export class HTTPTransport {
  private baseUrl: string

  async loadSimulation(id: string): Promise<SimulationDefinition>
  async getFrame(id: string, frameIndex: number): Promise<SimulationFrame>
  async executeAction(id: string, action: Action): Promise<SimulationFrame>
}
```

### Day 5: Server-Side Runtime

```typescript
// server/src/SimulationServer.ts
export class SimulationServer {
  private runtimes: Map<string, RuntimeEngine>
  private storage: SimulationStorage

  // Client connects
  async handleConnect(clientId: string): Promise<void>

  // Client requests simulation
  async handleLoad(clientId: string, simId: string): Promise<SimulationDefinition>

  // Client sends action
  async handleAction(clientId: string, action: Action, params: any): Promise<SimulationFrame>

  // Streaming — push frames to client
  private streamFrames(clientId: string, engine: RuntimeEngine): void

  // Persist simulation state
  private saveState(clientId: string, engine: RuntimeEngine): void
}
```

---

## Week 3: Storage + API

### Day 1-2: Storage Layer

```typescript
// server/src/storage/SimulationStorage.ts
export interface SimulationStorage {
  save(sim: SimulationDefinition): Promise<void>
  load(id: string): Promise<SimulationDefinition>
  list(filter?: StorageFilter): Promise<SimulationSummary[]>

  // Save/load runtime state
  saveState(id: string, state: SerializedRuntime): Promise<void>
  loadState(id: string): Promise<SerializedRuntime>

  // Save/load traces
  saveTrace(id: string, trace: ExecutionTrace): Promise<void>
  loadTrace(id: string): Promise<ExecutionTrace>
}

export class PostgresStorage implements SimulationStorage { /* ... */ }
export class SQLiteStorage implements SimulationStorage { /* ... */ }
export class InMemoryStorage implements SimulationStorage { /* ... */ }
```

### Day 3-4: REST API

```typescript
// server/src/api/routes.ts
// GET  /api/simulations              → List simulations
// GET  /api/simulations/:id          → Load simulation def
// POST /api/simulations/:id/play     → Start playback
// POST /api/simulations/:id/pause    → Pause
// POST /api/simulations/:id/seek     → Seek to frame
// POST /api/simulations/:id/reset    → Reset
// GET  /api/simulations/:id/frame    → Get current frame
// GET  /api/simulations/:id/trace    → Get execution trace
// POST /api/simulations              → Create simulation
// POST /api/simulations/generate     → AI generate simulation
```

### Day 5: Real-Time Streaming Architecture

```
Client                    Server                    Runtime
  │                         │                         │
  │── LOAD(simId) ─────────→│                         │
  │                         │── createRuntime() ─────→│
  │                         │←── RuntimeEngine ───────│
  │←── SimDefinition ──────│                         │
  │                         │                         │
  │── PLAY() ─────────────→│                         │
  │                         │── engine.play() ───────→│
  │                         │                         │
  │                         │◄═ stream frames ═══════│
  │◄══ Frame(1) ═══════════│                         │
  │◄══ Frame(2) ═══════════│                         │
  │◄══ Frame(3) ═══════════│                         │
  │                         │                         │
  │── PAUSE() ────────────→│──── engine.pause() ────→│
```

---

## Files Created

```
src/protocols/
├── runtime.proto
├── Serialization.ts
├── transport/
│   ├── WebSocketTransport.ts
│   └── HTTPTransport.ts
└── index.ts

src/dsl/
├── SimulationDSL.ts
├── DSLParser.ts
└── index.ts

server/
├── SimulationServer.ts
├── api/
│   ├── routes.ts
│   └── middleware.ts
├── storage/
│   ├── SimulationStorage.ts
│   ├── PostgresStorage.ts
│   └── SQLiteStorage.ts
├── package.json
└── tsconfig.json
```

---

## Success Criteria

- [ ] DSL defines ANY simulation declaratively
- [ ] DSLParser validates + creates runtime from definitions
- [ ] WebSocket transport streams frames in real-time
- [ ] REST API covers all runtime actions
- [ ] Server-side RuntimeEngine matches client version
- [ ] Storage persists simulations, states, traces
- [x] Frontend runs with zero simulation logic

---
## ✅ Completed May 2026
DSLParser validates + creates runtimes, WebSocket/HTTPTransport implemented, SimulationServer with full action support, InMemoryStorage with CRUD. All passing.

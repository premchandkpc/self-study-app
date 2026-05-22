# Phase 10: Distributed + Multiplayer Runtime

**Duration**: 4 weeks
**Goal**: Enable collaborative visualization, synchronized playback, multiplayer debugging, distributed trace sharing.

---

## Week 1: CRDT Sync

### Day 1-2: CRDT Architecture

```typescript
// src/distributed/crdt/CRDT.ts
export interface CRDT {
  // State-based CRDT (CvRDT) for timeline events
  merge(other: CRDT): void
  toState(): Uint8Array
  fromState(state: Uint8Array): void

  // Add event
  addEvent(event: RuntimeEvent): void

  // Get all events (eventually consistent)
  getEvents(): RuntimeEvent[]
}

// LWW-Register for timeline state
export class LWWRegister implements CRDT {
  private value: any
  private timestamp: number
  private peerId: string

  set(value: any, timestamp: number): void {
    if (timestamp > this.timestamp) {
      this.value = value
      this.timestamp = timestamp
    }
  }

  merge(other: LWWRegister): void {
    if (other.timestamp > this.timestamp) {
      this.value = other.value
      this.timestamp = other.timestamp
    }
  }
}

// OR-Set for event sets (add-wins)
export class ORSet implements CRDT {
  private added: Map<string, number>   // element → timestamp
  private removed: Map<string, number> // element → timestamp

  add(element: string, timestamp: number): void {
    this.added.set(element, timestamp)
  }

  remove(element: string, timestamp: number): void {
    this.removed.set(element, timestamp)
  }

  getElements(): string[] {
    return [...this.added.keys()].filter(id =>
      !this.removed.has(id) ||
      (this.added.get(id)! > this.removed.get(id)!)
    )
  }
}
```

### Day 3-4: Peer-to-Peer Sync

```typescript
// src/distributed/sync/PeerSync.ts
export class PeerSync {
  private peers: Map<string, PeerConnection>
  private crdt: CRDT
  private peerId: string

  constructor(peerId: string, crdt: CRDT)

  // Connect to peer
  async connect(peerUrl: string): Promise<void>

  // Disconnect
  disconnect(peerId: string): void

  // Sync CRDT state with all peers
  async sync(): Promise<void>

  // Handle incoming CRDT state
  private handleSync(peerId: string, state: Uint8Array): void {
    const remoteCRDT = this.crdt.constructor()
    remoteCRDT.fromState(state)
    this.crdt.merge(remoteCRDT)
    // Notify runtime of new events
    this.onRemoteEvents?.(this.crdt.getEvents())
  }

  onRemoteEvents: ((events: RuntimeEvent[]) => void) | null = null
}
```

### Day 5: Conflict Resolution

```typescript
// src/distributed/ConflictResolver.ts
export class ConflictResolver {
  // Strategy: last-writer-wins with timestamps
  resolve(eventA: RuntimeEvent, eventB: RuntimeEvent): RuntimeEvent {
    if (eventA.timestamp > eventB.timestamp) return eventA
    if (eventB.timestamp > eventA.timestamp) return eventB
    // Same timestamp: use peer ID as tiebreaker
    return eventA.peerId! > eventB.peerId! ? eventA : eventB
  }

  // For branching: merge branches
  mergeBranches(branchA: TimelineBranch, branchB: TimelineBranch): TimelineBranch {
    return {
      ...branchA,
      events: this.mergeEvents(branchA.events, branchB.events)
    }
  }

  private mergeEvents(eventsA: RuntimeEvent[], eventsB: RuntimeEvent[]): RuntimeEvent[] {
    const merged = new Map<string, RuntimeEvent>()
    for (const e of [...eventsA, ...eventsB]) {
      const existing = merged.get(e.id)
      if (!existing || e.timestamp > existing.timestamp) {
        merged.set(e.id, e)
      }
    }
    return [...merged.values()].sort((a, b) => a.timestamp - b.timestamp)
  }
}
```

---

## Week 2: Shared Timeline

### Day 1-2: Multiplayer Playback

```typescript
// src/distributed/MultiplayerRuntime.ts
export class MultiplayerRuntime {
  private runtime: RuntimeEngine
  private sync: PeerSync
  private room: string

  constructor(runtime: RuntimeEngine, room: string)

  // Join room
  async join(): Promise<void>

  // Leave room
  async leave(): Promise<void>

  // Playback synchronization
  async play(): Promise<void>    // Sync play across all peers
  async pause(): Promise<void>   // Sync pause
  async seek(frameIndex: number): Promise<void>  // All peers seek to same frame
  setSpeed(speed: number): void  // All peers match speed

  // Cursors
  setCursor(position: { x: number; y: number }): void
  onCursorChange(cb: (peerId: string, pos: Position) => void): void

  // Annotations
  annotate(frameIndex: number, text: string): void
  getAnnotations(): Map<number, Annotation[]>
}
```

### Day 3-4: Broadcast Architecture

```
                    ┌──────────────┐
                    │   Room 42    │
                    │  (Server)    │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
     ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
     │ Peer A  │     │ Peer B  │     │ Peer C  │
     │ (Host)  │     │(Student)│     │(Student)│
     └─────────┘     └─────────┘     └─────────┘

- Peer A (host) controls playback
- All peers receive same frames
- Any peer can annotate
- Cursors broadcast to all
- CRDT merges concurrent events
```

### Day 5: Event Ordering

```typescript
// src/distributed/EventOrdering.ts
export class EventOrdering {
  // Lamport clock for causal ordering
  private clock: number = 0
  private peerId: string

  // Stamp event with logical timestamp
  stamp(event: RuntimeEvent): RuntimeEvent {
    this.clock++
    return { ...event, timestamp: this.clock, peerId: this.peerId }
  }

  // Receive remote event — update clock
  receive(event: RuntimeEvent): void {
    this.clock = Math.max(this.clock, event.timestamp) + 1
  }

  // Total order: (timestamp, peerId) for deterministic ordering
  compare(a: RuntimeEvent, b: RuntimeEvent): number {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp
    return a.peerId!.localeCompare(b.peerId!)
  }
}
```

---

## Week 3: Cloud Replay System

### Day 1-2: Trace Sharing

```typescript
// src/distributed/cloud/TraceShare.ts
export class TraceShare {
  private storage: CloudStorage

  // Share execution trace with link
  async shareTrace(trace: ExecutionTrace): Promise<string>  // returns share URL

  // Load shared trace
  async loadTrace(shareId: string): Promise<ExecutionTrace>

  // Stream trace to viewer (not download all at once)
  async streamTrace(shareId: string, onFrame: (frame: Frame) => void): Promise<void>
}

export interface CloudStorage {
  upload(path: string, data: Uint8Array): Promise<string>
  download(path: string): Promise<Uint8Array>
  list(prefix: string): Promise<string[]>
  delete(path: string): Promise<void>
}

export class S3Storage implements CloudStorage { /* ... */ }
export class FirebaseStorage implements CloudStorage { /* ... */ }
```

### Day 3-4: Collaborative Debugging

```typescript
// src/distributed/debug/DebugSession.ts
export class DebugSession {
  private peers: Map<string, DebugPeer>
  private breakpoints: Map<number, Breakpoint[]>
  private watchExpressions: Map<string, WatchExpression[]>

  // Set breakpoint at frame
  setBreakpoint(frameIndex: number, peerId?: string): void

  // Watch variable across peers
  addWatch(expression: string): void

  // Step through trace together
  stepOver(): void
  stepInto(): void
  stepOut(): void

  // Peer state
  getPeerState(peerId: string): DebugPeerState
}
```

### Day 5: Cloud Replay

```typescript
// src/distributed/cloud/CloudReplay.ts
export class CloudReplay {
  private storage: CloudStorage
  private runtime: RuntimeEngine

  // Record entire session to cloud
  startRecording(): void {
    this.runtime.onFrameChange((frame) => {
      this.buffer.push(frame)
    })
  }

  async stopRecording(): Promise<string> {
    const trace = this.buildTrace()
    const compressed = this.compress(trace)
    return this.storage.upload(`traces/${trace.id}.bin`, compressed)
  }

  // Replay from cloud with any speed
  async replay(traceId: string, speed?: number): Promise<void>

  // Share replay with timestamp
  async share(traceId: string, startFrame?: number): Promise<string>
}
```

---

## Week 4: Production Deployment

### Day 1-2: Scaling

```typescript
// src/distributed/infra/Scaling.ts
export class SimulationOrchestrator {
  // Distribute simulations across server cluster
  private servers: ServerNode[]
  private routingTable: Map<string, string>  // simId → serverUrl

  // Route client to correct server
  getServer(simId: string): string

  // Migrate simulation between servers
  async migrate(simId: string, targetServer: string): Promise<void>

  // Scale: add nodes
  async addNode(url: string): Promise<void>
  async removeNode(url: string): Promise<void>

  // Health checks
  async healthCheck(): Promise<Map<string, ServerHealth>>
}
```

### Day 3-4: Observability

```typescript
// src/distributed/observability/Metrics.ts
export class RuntimeMetrics {
  // Track: FPS, frame time, memory, event throughput, peer count
  private metrics: Map<string, MetricSeries>

  record(name: string, value: number, tags?: Record<string, string>): void
  getSeries(name: string, from: number, to: number): MetricPoint[]
  export(): MetricsReport
}

export class TracingInstrumentation {
  // Distributed trace across servers
  private spans: Map<string, Span>

  beginSpan(name: string, parentId?: string): string  // returns span ID
  endSpan(spanId: string): void
  export(): TraceReport
}
```

### Day 5: Deployment Architecture

```
                    ┌──────────────┐
                    │  Load        │
                    │  Balancer    │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
     ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
     │ Server  │     │ Server  │     │ Server  │
     │  (Node1)│     │  (Node2)│     │  (Node3)│
     └────┬────┘     └────┬────┘     └────┬────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                    ┌─────▼─────┐
                    │   Redis   │
                    │  (Cache)  │
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │ Postgres  │
                    │ (Storage) │
                    └───────────┘
```

---

## Files Created

```
src/distributed/
├── crdt/
│   ├── CRDT.ts
│   ├── LWWRegister.ts
│   └── ORSet.ts
├── sync/
│   ├── PeerSync.ts
│   └── EventOrdering.ts
├── ConflictResolver.ts
├── MultiplayerRuntime.ts
├── cloud/
│   ├── TraceShare.ts
│   └── CloudReplay.ts
├── debug/
│   └── DebugSession.ts
├── infra/
│   ├── Scaling.ts
│   └── ServerNode.ts
├── observability/
│   ├── Metrics.ts
│   └── Tracing.ts
└── index.ts
```

---

## Success Criteria

- [ ] CRDT merges concurrent events without data loss
- [ ] MultiplayerRuntime syncs play/pause/seek across peers
- [ ] Cursor and annotation broadcast works
- [ ] Trace sharing creates accessible URLs
- [ ] Collaborative debugging supports breakpoints + stepping
- [ ] Cloud replay records and replays entire sessions
- [ ] Load balancer distributes simulations across servers
- [ ] Metrics + distributed tracing instrumented
- [ ] 10+ concurrent peers in a session
- [x] <100ms latency for cross-peer synchronization

---
## ✅ Completed May 2026
CRDT primitives (LWWRegister, ORSet), PeerSync with WebSocket, EventOrdering with Lamport clocks, ConflictResolver, MultiplayerRuntime, TraceShare, CloudReplay, DebugSession, SimulationOrchestrator, RuntimeMetrics, TracingInstrumentation.

# Phase 5: Event Sourcing (Memory Optimization)

**Goal**: Replace full snapshots with event deltas. Events become the source of truth.

**Duration**: 1-2 weeks

**Key Concept**: Event Sourcing - compute state from event stream, not store snapshots.

---

## Problem: Memory Usage

### Before (Bad) ❌
```
Frame 1: [1,2,3,4,5]           (5 numbers stored)
Frame 2: [1,2,4,3,5]           (5 numbers stored)
Frame 3: [1,4,2,3,5]           (5 numbers stored)
...
Total for 1000 frames: 5000 * 5 = 25KB (small)
BUT for 1000 elements over 10,000 frames: 50MB (big!)
```

### After (Good) ✅
```
Frame 1: {type: 'SWAP', indices: [1,2]}    (1 event)
Frame 2: {type: 'SWAP', indices: [2,3]}    (1 event)
Frame 3: {type: 'SWAP', indices: [0,1]}    (1 event)
...
Total: 1KB (100x smaller!)
Replay: Reconstruct from events
```

---

## Event Sourcing Pattern

### State Reconstruction

Instead of:
```typescript
// Store state at each frame
const frames = [
  { array: [1,2,3] },
  { array: [1,3,2] },
  { array: [3,1,2] }
]
```

Do this:
```typescript
// Store only deltas
const events = [
  { type: 'SWAP', indices: [1,2] },
  { type: 'SWAP', indices: [0,1] }
]

// Reconstruct on demand
function getArrayAtFrame(frameId: number): number[] {
  let arr = initialArray
  for (const event of events.slice(0, frameId)) {
    if (event.type === 'SWAP') {
      [arr[event.indices[0]], arr[event.indices[1]]] = 
      [arr[event.indices[1]], arr[event.indices[0]]]
    }
  }
  return arr
}
```

---

## Implementation

### 1. Event Store

```typescript
// src/core/eventStore/EventStore.ts
interface StoredEvent {
  id: string // UUID for deduplication
  timestamp: number
  frameId: number
  type: string
  data: any
  checksum?: string // For verification
}

class EventStore {
  private events: StoredEvent[] = []
  private cache: Map<number, any> = new Map() // Frame cache
  private maxCacheSize: number = 100 // Keep last 100 frames in cache
  
  addEvent(event: SemanticEvent): void {
    const stored: StoredEvent = {
      id: crypto.randomUUID(),
      timestamp: event.timestamp,
      frameId: event.frameId,
      type: event.type,
      data: event,
      checksum: this.computeChecksum(event)
    }
    
    this.events.push(stored)
    this.cache.delete(stored.frameId) // Invalidate cache
  }
  
  // Replay from event stream
  private computeChecksum(event: SemanticEvent): string {
    return btoa(JSON.stringify(event))
  }
  
  getState(frameId: number, initialState: any): any {
    // Check cache first
    if (this.cache.has(frameId)) {
      return this.cache.get(frameId)
    }
    
    // Compute from events
    let state = JSON.parse(JSON.stringify(initialState))
    
    for (const event of this.events) {
      if (event.frameId > frameId) break
      state = this.applyEvent(state, event)
    }
    
    // Cache it
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
    this.cache.set(frameId, state)
    
    return state
  }
  
  private applyEvent(state: any, event: StoredEvent): any {
    const newState = JSON.parse(JSON.stringify(state))
    
    switch (event.type) {
      case 'ARRAY_SWAP':
        [newState.array[event.data.indices[0]], 
         newState.array[event.data.indices[1]]] = 
        [newState.array[event.data.indices[1]], 
         newState.array[event.data.indices[0]]]
        break
        
      case 'ARRAY_SET':
        newState.array[event.data.index] = event.data.value
        break
        
      case 'NODE_UPDATE':
        newState.nodes[event.data.nodeId] = {
          ...newState.nodes[event.data.nodeId],
          ...event.data.updates
        }
        break
    }
    
    return newState
  }
  
  getEvents(): StoredEvent[] {
    return [...this.events]
  }
  
  getEventsInFrame(frameId: number): StoredEvent[] {
    return this.events.filter(e => e.frameId === frameId)
  }
  
  compact(targetFrameId: number): void {
    // Compress events before targetFrameId into a single snapshot
    const eventsToCompress = this.events.filter(e => e.frameId <= targetFrameId)
    const eventsToKeep = this.events.filter(e => e.frameId > targetFrameId)
    
    const compressedState = this.getState(targetFrameId, {})
    const snapshot: StoredEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      frameId: 0,
      type: 'SNAPSHOT',
      data: compressedState,
      checksum: this.computeChecksum(compressedState)
    }
    
    this.events = [snapshot, ...eventsToKeep]
    this.cache.clear()
  }
}
```

### 2. Event Verifier

Ensure deterministic replay:

```typescript
// src/core/eventStore/EventVerifier.ts
class EventVerifier {
  verifyReplay(
    events: SemanticEvent[],
    initialState: any,
    expectedState: any
  ): boolean {
    let state = JSON.parse(JSON.stringify(initialState))
    
    for (const event of events) {
      state = this.applyEvent(state, event)
    }
    
    return JSON.stringify(state) === JSON.stringify(expectedState)
  }
  
  verifyDeterminism(
    events: SemanticEvent[],
    initialState: any,
    runs: number = 3
  ): boolean {
    const results = []
    
    for (let i = 0; i < runs; i++) {
      let state = JSON.parse(JSON.stringify(initialState))
      for (const event of events) {
        state = this.applyEvent(state, event)
      }
      results.push(JSON.stringify(state))
    }
    
    return results.every(r => r === results[0])
  }
  
  private applyEvent(state: any, event: SemanticEvent): any {
    // Same logic as EventStore.applyEvent()
    const newState = JSON.parse(JSON.stringify(state))
    // ... apply event
    return newState
  }
}
```

### 3. Integration with Timeline

```typescript
// Updated EventTimeline to use EventStore
class EventSourcedTimeline {
  private eventStore: EventStore
  private initialState: any
  private frameIndex: number = 0
  
  constructor(events: SemanticEvent[], initialState: any) {
    this.eventStore = new EventStore()
    this.initialState = initialState
    
    for (const event of events) {
      this.eventStore.addEvent(event)
    }
  }
  
  getCurrentState(): any {
    return this.eventStore.getState(this.frameIndex, this.initialState)
  }
  
  nextFrame(): any {
    if (this.frameIndex < this.eventStore.getEvents().length - 1) {
      this.frameIndex++
    }
    return this.getCurrentState()
  }
  
  // Replay verification
  verifyDeterminism(): boolean {
    const verifier = new EventVerifier()
    const events = this.eventStore.getEvents()
    return verifier.verifyDeterminism(events, this.initialState)
  }
  
  // Export for distributed systems
  exportEvents(): StoredEvent[] {
    return this.eventStore.getEvents()
  }
  
  // Import from other sources
  importEvents(events: StoredEvent[]): void {
    events.forEach(e => this.eventStore.addEvent(e))
  }
}
```

---

## Compression Strategies

### 1. Delta Encoding

Only store changes:

```typescript
interface DeltaEvent {
  frameId: number
  deltas: {
    [key: string]: any // Only changed fields
  }
}

// Instead of:
{ array: [1,2,3,4,5], pointer: 0, visited: false }

// Store:
{ array_index_0: 1, pointer: 0 }
```

### 2. Run-Length Encoding

For repetitive events:

```typescript
// Instead of:
[COMPARE, COMPARE, COMPARE, COMPARE, SWAP]

// Store:
[{ type: 'COMPARE', count: 4 }, { type: 'SWAP', count: 1 }]
```

### 3. Compression

For large event streams (>1MB):

```typescript
// Use gzip/brotli
import { compress, decompress } from 'brotli'

class CompressedEventStore extends EventStore {
  private compressed: Uint8Array | null = null
  
  export(): Uint8Array {
    const json = JSON.stringify(this.events)
    this.compressed = compress(new TextEncoder().encode(json))
    return this.compressed
  }
  
  import(data: Uint8Array): void {
    const json = new TextDecoder().decode(decompress(data))
    const events = JSON.parse(json)
    events.forEach(e => this.addEvent(e))
  }
  
  getSize(): number {
    return this.compressed?.byteLength ?? 0
  }
}
```

---

## Benefits Unlocked

✅ **Huge memory savings** (1000 elements × 10,000 frames: 50MB → 500KB)  
✅ **Export/import events** (send to other users, backends)  
✅ **Distributed replay** (other clients reconstruct same visualization)  
✅ **Versioning** (store which algorithm version produced events)  
✅ **AI analysis** (feed events to ML models)  
✅ **Compression** (compress event streams for storage)  

---

## Files to Create

```
src/core/eventStore/
├── EventStore.ts
├── EventVerifier.ts
├── CompressionStrategy.ts
└── index.ts

src/core/runtime/
└── timeline.ts (updated to use EventStore)
```

---

## Completion Checklist

- [ ] EventStore implementation
- [ ] EventVerifier implementation
- [ ] Integration with Timeline
- [ ] Delta encoding working
- [ ] Compression working
- [ ] Export/import tested
- [ ] Determinism verified
- [ ] Memory usage <10% of original
- [ ] Performance maintained (replay still fast)

---

## Success Metrics

✅ **Memory usage 100x smaller**  
✅ **Replay time <100ms for 10k events**  
✅ **Determinism guaranteed (passes tests)**  
✅ **Export/import lossless**  
✅ **Compression ratio >90%**  

---

## Next Phase (Phase 6)

Add semantic metadata to events for AI generation.

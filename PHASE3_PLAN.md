# Phase 3: Execution Trace Engine

**Duration**: 3 weeks
**Goal**: Build a debugger-grade execution trace system — variable tracking, stack frames, state reconstruction, memory graphs.

---

## Week 1: Trace Recorder

### Day 1-2: Execution Frame

```typescript
// src/execution/Frame.ts
export interface ExecutionFrame {
  id: string
  parentId?: string           // Caller frame (for recursion)
  functionName: string
  file?: string
  lineNumber: number
  variables: Map<string, VariableState>
  stack: ExecutionFrame[]     // Call stack
  heap: Map<string, HeapObject>
  startedAt: number
  completedAt?: number
  childFrames: string[]       // Sub-calls
}

export interface VariableState {
  name: string
  type: 'primitive' | 'object' | 'array' | 'reference' | 'function'
  value: any
  previousValue?: any        // For diff tracking
  scope: 'local' | 'closure' | 'global' | 'this'
  immutable: boolean
}

export interface HeapObject {
  id: string
  type: string
  fields: Map<string, any>
  references: string[]       // IDs this object references
  referencedBy: string[]     // IDs referencing this object
  size: number              // Bytes
  allocationSite: string    // Where allocated
}
```

### Day 3-4: TraceRecorder

```typescript
// src/execution/TraceRecorder.ts
export class TraceRecorder {
  private frames: ExecutionFrame[]
  private currentFrame: ExecutionFrame | null
  private heap: Map<string, HeapObject>
  private eventBus: EventBus

  // Lifecycle
  startTrace(name: string): void
  endTrace(): ExecutionTrace

  // Function tracking
  functionCall(func: string, args: any[]): void
  functionReturn(result: any): void

  // Variable tracking
  variableMutated(name: string, oldVal: any, newVal: any): void
  variableCreated(name: string, val: any): void
  variableDeleted(name: string): void

  // Memory tracking
  objectAllocated(obj: HeapObject): void
  objectFreed(id: string): void
  referenceChanged(from: string, to: string, added: boolean): void

  // Stack
  stackPush(frame: ExecutionFrame): void
  stackPop(): ExecutionFrame | null

  // Diff
  diffFrames(a: ExecutionFrame, b: ExecutionFrame): VariableDiff[]
  snapshot(): ExecutionSnapshot
}

export interface ExecutionTrace {
  id: string
  name: string
  frames: ExecutionFrame[]
  heap: Map<string, HeapObject>
  events: RuntimeEvent[]
  duration: number
  startedAt: number
  completedAt: number
}

export interface VariableDiff {
  name: string
  oldValue: any
  newValue: any
  scope: string
}
```

### Day 5: Trace Replay

```typescript
// src/execution/TraceReplay.ts
export class TraceReplay {
  private trace: ExecutionTrace
  private currentFrame: number = 0

  constructor(trace: ExecutionTrace)

  // Step through trace
  nextStep(): ExecutionSnapshot
  previousStep(): ExecutionSnapshot
  seekToFrame(frameIndex: number): ExecutionSnapshot

  // State at any point
  getVariables(): Map<string, VariableState>
  getCallStack(): ExecutionFrame[]
  getHeapState(): Map<string, HeapObject>

  // Reconstruction
  reconstructState(atFrame: number): ExecutionSnapshot
}

export interface ExecutionSnapshot {
  frameIndex: number
  variables: VariableState[]
  callStack: ExecutionFrame[]
  heap: HeapObject[]
  lastEvent: RuntimeEvent | null
}
```

---

## Week 2: Instrumentation

### Day 1-2: AST Instrumentation (Babel)

```typescript
// src/execution/instrumentation/BabelInstrumenter.ts
export class BabelInstrumenter {
  private recorder: TraceRecorder

  // Babel plugin that inserts tracing calls
  createPlugin(): babel.PluginObj {
    return {
      visitor: {
        VariableDeclaration(path) {
          // Insert: recorder.variableCreated(name, value)
        },
        AssignmentExpression(path) {
          // Insert: recorder.variableMutated(name, old, new)
        },
        CallExpression(path) {
          // Insert: recorder.functionCall(name, args)
        },
        ReturnStatement(path) {
          // Insert: recorder.functionReturn(value)
        }
      }
    }
  }
}
```

### Day 3: Proxy-Based Tracking

```typescript
// src/execution/instrumentation/ProxyTracker.ts
export class ProxyTracker {
  // Wrap any object to track mutations
  track<T extends object>(obj: T, name: string): T {
    return new Proxy(obj, {
      set(target, prop, value) {
        const old = target[prop]
        target[prop] = value
        TraceRecorder.variableMutated(`${name}.${String(prop)}`, old, value)
        return true
      },
      get(target, prop) {
        const val = target[prop]
        if (typeof val === 'object' && val !== null) {
          // Recursively track nested objects
          return this.track(val, `${name}.${String(prop)}`)
        }
        return val
      }
    })
  }
}
```

### Day 4-5: Runtime Interception Hooks

```typescript
// src/execution/instrumentation/RuntimeHooks.ts
// Monkey-patch runtime functions to trace execution

export class RuntimeHooks {
  install(): void {
    // Patch setTimeout — trace async execution
    const originalSetTimeout = global.setTimeout
    global.setTimeout = (fn, ms, ...args) => {
      this.recorder.functionCall('setTimeout', [ms])
      return originalSetTimeout(() => {
        this.recorder.functionCall('timeout-callback', args)
        fn(...args)
        this.recorder.functionReturn(undefined)
      }, ms)
    }

    // Patch Promise — trace async chains
    // Patch Array methods — trace sort/map/filter
    // Patch console.log — capture output
    // Patch fetch — trace network calls
  }

  uninstall(): void {
    // Restore originals
  }
}
```

---

## Week 3: Memory Graph + State Reconstruction

### Day 1-2: Memory Graph

```typescript
// src/execution/memory/MemoryGraph.ts
export class MemoryGraph {
  private objects: Map<string, HeapObject>

  // Build graph from heap state
  buildGraph(): Graph {
    const g = new Graph()
    for (const obj of this.objects.values()) {
      g.addEntity(new Entity(obj.id, 'memory-block', obj.type))
      for (const ref of obj.references) {
        g.connect(obj.id, ref, 'references')
      }
    }
    return g
  }

  // Diff two heap states
  diff(before: MemoryGraph, after: MemoryGraph): HeapDiff {
    // Added, removed, modified objects
    // Changed references
    // Memory delta
  }

  // Find memory leaks (objects with no external references)
  findLeaks(): HeapObject[]
}
```

### Day 3-4: State Reconstruction from Events

```typescript
// src/execution/StateReconstructor.ts
export class StateReconstructor {
  // Reconstruct full state at any point from event stream
  reconstruct(
    events: RuntimeEvent[],
    upToEvent: number
  ): ExecutionSnapshot {
    const variables = new Map()
    const heap = new Map()

    for (let i = 0; i <= upToEvent; i++) {
      const event = events[i]
      switch (event.type) {
        case 'VARIABLE_MUTATED':
          variables.set(event.entityId!, event.newValue)
          break
        case 'MEMORY_ALLOCATED':
          heap.set(event.entityId!, event.metadata)
          break
        case 'STACK_PUSHED':
          // Build stack frame
          break
        // etc.
      }
    }

    return { frameIndex: upToEvent, variables, heap, callStack: [] }
  }
}
```

### Day 5: Trace Compression

```typescript
// src/execution/TraceCompressor.ts
export class TraceCompressor {
  // Delta encoding — store only changes
  deltaEncode(trace: ExecutionTrace): DeltaEncodedTrace {
    const frames: DeltaFrame[] = []
    let prevState: any = null

    for (const frame of trace.frames) {
      const current = this.snapshotState(frame)
      frames.push({
        index: frame.id,
        delta: this.computeDelta(prevState, current)
      })
      prevState = current
    }

    return { frames, baseState: prevState }
  }

  // Run-length encoding for repeated events
  rleEncode(events: RuntimeEvent[]): CompressedEvent[]

  // Reconstruction
  reconstructFromDelta(delta: DeltaEncodedTrace): ExecutionTrace
}
```

---

## Files Created

```
src/execution/
├── Frame.ts
├── TraceRecorder.ts
├── TraceReplay.ts
├── StateReconstructor.ts
├── TraceCompressor.ts
├── instrumentation/
│   ├── BabelInstrumenter.ts
│   ├── ProxyTracker.ts
│   └── RuntimeHooks.ts
├── memory/
│   └── MemoryGraph.ts
├── __tests__/
│   ├── TraceRecorder.test.ts
│   ├── StateReconstructor.test.ts
│   └── TraceCompressor.test.ts
└── index.ts
```

---

## Success Criteria

- [x] TraceRecorder captures variables, stack, heap
- [x] StateReconstructor rebuilds state from events
- [x] ProxyTracker wraps objects transparently
- [x] MemoryGraph builds/diffs heap states
- [x] TraceCompressor achieves 10x+ compression
- [x] Deterministic replay produces identical traces
- [ ] Babel plugin instruments variable mutations *— external dep, deferred*
- [ ] Works with Bubble Sort, Kafka, JVM domains *— domain integration, deferred*

---

## Next Phase (Phase 4)

With execution traces working: build the generic animation + rendering engine to visualize traces.

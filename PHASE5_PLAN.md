# Phase 5: Timeline + Playback Engine

**Duration**: 2 weeks
**Goal**: Build advanced timeline — reverse playback, branching, frame interpolation, deterministic replay, snapshotting.

---

## Week 1: Reverse Playback + Interpolation

### Day 1-2: Bidirectional Timeline

```typescript
// src/timeline/BidirectionalTimeline.ts
export class BidirectionalTimeline extends Timeline {
  private direction: 1 | -1 = 1

  setDirection(dir: 1 | -1): void {
    this.direction = dir
  }

  getNextFrame(currentIndex: number): Frame | null {
    if (this.direction === 1) {
      return this.getFrame(Math.min(currentIndex + 1, this.frameCount() - 1))
    }
    return this.getFrame(Math.max(currentIndex - 1, 0))
  }

  // Reverse: reconstruct state from events going backward
  reverseEvents(fromEvent: RuntimeEvent, toEvent: RuntimeEvent): RuntimeEvent[] {
    // Swap oldValue ↔ newValue for each event
    return this.eventsBetween(fromEvent, toEvent)
      .reverse()
      .map(e => ({
        ...e,
        oldValue: e.newValue,
        newValue: e.oldValue
      }))
  }
}
```

### Day 3-4: Frame Interpolation

```typescript
// src/timeline/FrameInterpolator.ts
export class FrameInterpolator {
  interpolate(
    prevFrame: Frame,
    nextFrame: Frame,
    progress: number  // 0-1
  ): Frame {
    return {
      id: prevFrame.id,
      timestamp: this.lerp(prevFrame.timestamp, nextFrame.timestamp, progress),
      events: this.interpolateEvents(prevFrame.events, nextFrame.events, progress),
      state: this.interpolateGraphs(prevFrame.state, nextFrame.state, progress)
    }
  }

  private interpolateEvents(
    prev: RuntimeEvent[],
    next: RuntimeEvent[],
    t: number
  ): RuntimeEvent[] {
    return prev.map((event, i) => {
      const nextEvent = next[i]
      if (!nextEvent) return event

      // Interpolate numeric properties
      if (typeof event.newValue === 'number' && typeof nextEvent.newValue === 'number') {
        return {
          ...event,
          newValue: this.lerp(event.newValue, nextEvent.newValue, t)
        }
      }
      return event
    })
  }

  private interpolateGraphs(prev: Graph, next: Graph, t: number): Graph {
    // Interpolate entity positions, opacities, colors
    const result = prev.clone()
    for (const [id, nextEntity] of next.getEntities()) {
      const prevEntity = prev.getEntity(id)
      if (prevEntity) {
        // Interpolate numeric properties
        for (const [key, nextVal] of nextEntity.properties) {
          const prevVal = prevEntity.properties.get(key)
          if (typeof prevVal === 'number' && typeof nextVal === 'number') {
            result.setProperty(id, key, this.lerp(prevVal, nextVal, t))
          }
        }
      }
    }
    return result
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }
}
```

### Day 5: Seek Optimization

```typescript
// src/timeline/SeekOptimizer.ts
export class SeekOptimizer {
  // Pre-compute seek points for O(log n) seeking
  private seekTable: Map<number, number>  // frameIndex → eventIndex

  build(events: RuntimeEvent[], interval: number = 100): void {
    // Every `interval` events, store snapshot
    for (let i = 0; i < events.length; i += interval) {
      this.seekTable.set(
        events[i].frameId,
        i  // event index to replay from
      )
    }
  }

  // Find nearest snapshot before target frame
  findNearestSnapshot(frameIndex: number): {
    eventIndex: number
    frameIndex: number
  } {
    let nearestFrame = 0
    let nearestEvent = 0

    for (const [frame, eventIdx] of this.seekTable) {
      if (frame <= frameIndex && frame > nearestFrame) {
        nearestFrame = frame
        nearestEvent = eventIdx
      }
    }

    return { eventIndex: nearestEvent, frameIndex: nearestFrame }
  }
}
```

---

## Week 2: Branching + Deterministic Replay

### Day 1-2: Branching Timeline

```typescript
// src/timeline/BranchingTimeline.ts
export interface TimelineBranch {
  id: string
  name: string
  baseFrameId: number
  events: RuntimeEvent[]
  parentId: string | null
  createdAt: number
}

export class BranchingTimeline {
  private branches: Map<string, TimelineBranch>
  private currentBranchId: string

  constructor(baseEvents: RuntimeEvent[])

  // Branch
  branch(name: string, fromFrameId: number): string  // returns branch ID
  switchBranch(branchId: string): void
  getCurrentBranch(): TimelineBranch
  getBranches(): TimelineBranch[]

  // Merge
  mergeBranch(sourceId: string, targetId: string): void
  // Conflicts: last-writer-wins by default

  // Rebase
  rebaseBranch(branchId: string, ontoFrameId: number): void

  // Diff
  diffBranches(a: string, b: string): RuntimeEvent[]

  // Serialize
  export(): BranchingTimelineSchema
  static import(schema: BranchingTimelineSchema): BranchingTimeline
}
```

### Day 3-4: Deterministic Replay

```typescript
// src/timeline/DeterministicReplay.ts
export class DeterministicReplay {
  private eventLog: RuntimeEvent[]
  private replaySeed: number
  private replayCount: number = 0

  constructor(events: RuntimeEvent[])

  // Replay — must produce identical output every time
  replay(): ExecutionTrace {
    const recorder = new TraceRecorder()
    const deterministicEvents = this.events.sort((a, b) =>
      a.timestamp - b.timestamp || a.frameId - b.frameId
    )

    for (const event of deterministicEvents) {
      recorder.record(event)
    }

    return recorder.getTrace()
  }

  // Verify determinism — run twice, compare
  verify(): boolean {
    const trace1 = this.replay()
    const trace2 = this.replay()
    return this.compareTraces(trace1, trace2)
  }

  private compareTraces(a: ExecutionTrace, b: ExecutionTrace): boolean {
    // Deep compare every frame, event, variable
    return JSON.stringify(a.events) === JSON.stringify(b.events)
  }
}
```

### Day 5: Snapshots + Checkpoints

```typescript
// src/timeline/SnapshotManager.ts
export class SnapshotManager {
  private snapshots: Map<number, Graph>  // frameIndex → state

  // Take snapshot at current frame
  snapshot(frameIndex: number, graph: Graph): void

  // Restore state from nearest snapshot
  restore(frameIndex: number): { graph: Graph; fromFrame: number }

  // Prune old snapshots (keep every Nth)
  prune(keepInterval: number): void

  // Delta compression between snapshots
  compress(): void {
    const frames = [...this.snapshots.keys()].sort((a, b) => a - b)
    for (let i = frames.length - 1; i > 0; i--) {
      const delta = this.diff(this.snapshots.get(frames[i - 1])!, this.snapshots.get(frames[i])!)
      this.snapshots.set(frames[i], delta as any)  // Store delta, not full state
    }
  }
}
```

---

## Files Created

```
src/timeline/
├── BidirectionalTimeline.ts
├── FrameInterpolator.ts
├── SeekOptimizer.ts
├── BranchingTimeline.ts
├── DeterministicReplay.ts
├── SnapshotManager.ts
└── index.ts
```

---

## Success Criteria

- [ ] Bidirectional play (forward + reverse) works seamlessly
- [ ] FrameInterpolator smooths transitions at 60fps
- [ ] SeekOptimizer enables O(log n) frame seeking
- [ ] BranchingTimeline supports fork/merge/rebase
- [ ] DeterministicReplay produces identical traces
- [ ] SnapshotManager compresses state 10x+ with delta encoding
- [x] Works with all Phase 1-3 components

---
## ✅ Completed May 2026
BidirectionalTimeline (forward/backward, reverseEvents), FrameInterpolator (event interpolation), SeekOptimizer (snapshot table), BranchingTimeline (branch/merge/diff/export/import), DeterministicReplay (verify, verifyMultiple), SnapshotManager (compress/decompress/prune).

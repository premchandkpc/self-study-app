# Phase 4: Enhanced Timeline Engine

**Goal**: Build advanced timeline features: reverse playback, branching, deterministic replay, frame interpolation.

**Duration**: 2 weeks

---

## Features

### 1. Reverse Playback

Currently: Play forward OR manual rewind  
Need: Continuous reverse animation

```typescript
// PlaybackEngine enhancements
interface PlaybackConfig {
  speed: number
  direction: 'forward' | 'backward' // NEW
  loop: boolean
  frameDelay: number
}

playback.setDirection('backward')
playback.play() // Plays backwards
```

Implementation:
```typescript
class PlaybackEngine {
  private direction: 'forward' | 'backward' = 'forward'
  
  setDirection(dir: 'forward' | 'backward'): void {
    this.direction = dir
  }
  
  private advanceFrame(): void {
    if (this.direction === 'forward') {
      this.onFrameStep?.('nextFrame')
    } else {
      this.onFrameStep?.('previousFrame')
    }
  }
}
```

### 2. Branching Timelines

Problem: User pauses at frame 5, generates different events → what happens to frames 6+?

Solution: Branching

```typescript
interface TimelineBranch {
  id: string
  name: string
  baseFrameId: number // Branches from here
  events: SemanticEvent[]
  parentBranch?: TimelineBranch
}

class BranchingTimeline {
  private branches: Map<string, TimelineBranch> = new Map()
  private currentBranch: string = 'main'
  
  branch(name: string, fromFrameId: number): void {
    const newBranch: TimelineBranch = {
      id: crypto.randomUUID(),
      name,
      baseFrameId: fromFrameId,
      events: []
    }
    this.branches.set(newBranch.id, newBranch)
    this.currentBranch = newBranch.id
  }
  
  mergeBranch(branchId: string, targetBranchId: string): void {
    // Merge branch into target
  }
  
  getBranches(): TimelineBranch[] {
    return Array.from(this.branches.values())
  }
  
  switchBranch(branchId: string): void {
    if (this.branches.has(branchId)) {
      this.currentBranch = branchId
    }
  }
}
```

UI for branching:
```typescript
// TimelineBranchSelector.tsx
function TimelineBranchSelector({ timeline, onSwitch }) {
  return (
    <div className="branch-selector">
      {timeline.getBranches().map(branch => (
        <button
          key={branch.id}
          onClick={() => onSwitch(branch.id)}
          className={branch.id === timeline.current ? 'active' : ''}
        >
          {branch.name} (frame {branch.baseFrameId})
        </button>
      ))}
    </div>
  )
}
```

### 3. Frame Interpolation

Problem: At 1x speed, frames are 300ms apart. But we run 60fps. Frames appear to jump.

Solution: Interpolate between frames

```typescript
interface InterpolationConfig {
  enabled: boolean
  type: 'linear' | 'easing' // easing = smooth ease-out
}

class FrameInterpolator {
  private prevFrame: TimelineFrame | null = null
  private currentFrame: TimelineFrame | null = null
  private progress: number = 0 // 0-1
  
  interpolate(
    prev: TimelineFrame,
    current: TimelineFrame,
    progress: number
  ): InterpolatedFrame {
    // For ARRAY_COMPARE: lerp positions
    // For ARRAY_SWAP: lerp element positions
    // For NODE_UPDATE: lerp colors, positions
    
    return {
      ...current,
      elements: this.interpolateElements(prev, current, progress)
    }
  }
  
  private interpolateElements(
    prevFrame: TimelineFrame,
    currentFrame: TimelineFrame,
    t: number
  ) {
    // Smooth element transitions
    const prevState = buildRenderState(prevFrame.events)
    const currentState = buildRenderState(currentFrame.events)
    
    return {
      positions: lerp(prevState.positions, currentState.positions, t),
      colors: lerpColors(prevState.colors, currentState.colors, t),
      opacity: lerp(prevState.opacity, currentState.opacity, t)
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpColors(a: string, b: string, t: number): string {
  const rgbA = hexToRgb(a)
  const rgbB = hexToRgb(b)
  const r = Math.round(lerp(rgbA.r, rgbB.r, t))
  const g = Math.round(lerp(rgbA.g, rgbB.g, t))
  const b_ = Math.round(lerp(rgbA.b, rgbB.b, t))
  return `rgb(${r},${g},${b_})`
}
```

### 4. Deterministic Replay with Different Speeds

Problem: If you change speed mid-playback, do events stay in sync?

Solution: Use actual timestamps, not frame count

```typescript
interface SemanticEventWithDuration extends SemanticEvent {
  duration?: number // How long this event should visually display
}

class DeterministicPlayback {
  private startTime: number = 0
  private pausedTime: number = 0
  private playbackSpeed: number = 1
  
  play(): void {
    this.startTime = performance.now() - this.pausedTime
  }
  
  pause(): void {
    this.pausedTime = performance.now() - this.startTime
  }
  
  getCurrentFrameTime(): number {
    if (this.playing) {
      return (performance.now() - this.startTime) * this.playbackSpeed
    }
    return this.pausedTime
  }
  
  // Get which frame is active at current time
  getCurrentFrame(timeline: EventTimeline): TimelineFrame | null {
    const currentTime = this.getCurrentFrameTime()
    
    for (let i = 0; i < timeline.getFrameCount(); i++) {
      const frame = timeline.getFrame(i)
      const nextFrame = timeline.getFrame(i + 1)
      
      if (
        frame.timestamp <= currentTime &&
        (!nextFrame || currentTime < nextFrame.timestamp)
      ) {
        return frame
      }
    }
    
    return null
  }
}
```

### 5. Timeline Snapshots & Restore

Save and restore timeline state:

```typescript
interface TimelineSnapshot {
  timestamp: Date
  frameIndex: number
  branchId: string
  playbackState: PlaybackState
  speed: number
}

class TimelineManager {
  private snapshots: TimelineSnapshot[] = []
  
  takeSnapshot(): TimelineSnapshot {
    return {
      timestamp: new Date(),
      frameIndex: this.timeline.getCurrentFrameIndex(),
      branchId: this.branching.getCurrentBranch(),
      playbackState: this.playback.getState(),
      speed: this.playback.getSpeed()
    }
  }
  
  restore(snapshot: TimelineSnapshot): void {
    this.branching.switchBranch(snapshot.branchId)
    this.timeline.seekToFrame(snapshot.frameIndex)
    this.playback.setSpeed(snapshot.speed)
    if (snapshot.playbackState === 'playing') {
      this.playback.play()
    }
  }
  
  getSnapshots(): TimelineSnapshot[] {
    return [...this.snapshots]
  }
}
```

---

## Implementation Timeline

### Week 1

#### Day 1-2: Reverse Playback
- [x] Add direction to PlaybackEngine
- [x] Update animation loop to handle direction
- [x] Add setDirection() method
- [x] Test forward/backward toggling

#### Day 3-4: Frame Interpolation
- [x] Implement FrameInterpolator
- [x] Test color interpolation
- [x] Test position interpolation
- [x] Integrate with renderer

#### Day 5: Tests
- [x] Unit tests for reverse playback
- [x] Integration tests for interpolation
- [x] Performance tests

### Week 2

#### Day 1-2: Branching Timeline
- [x] Implement BranchingTimeline class
- [x] Add branch() method
- [x] Add switchBranch() method
- [x] UI for branch selection
- [x] Tests for branching logic

#### Day 3: Deterministic Playback
- [x] Implement DeterministicPlayback
- [x] Use timestamps instead of frame count
- [x] Verify determinism with different speeds
- [x] Tests

#### Day 4-5: Polish & Integration
- [x] Timeline manager orchestration
- [x] Snapshot/restore functionality
- [x] Full integration tests
- [x] Performance optimization

---

## New Components

```
src/core/runtime/
├── timeline.ts          (enhanced with branching)
├── playback.ts          (enhanced with reverse)
├── interpolation.ts     (NEW)
├── branching.ts         (NEW)
├── timelineManager.ts   (NEW)
└── snapshots.ts         (NEW)

src/components/
├── TimelineBranchSelector.tsx (NEW)
├── PlaybackControls.tsx        (enhanced)
└── TimelineViewer.tsx          (NEW)
```

---

## Updated Hook

```typescript
export function useEnhancedTimeline(options: UseEnhancedTimelineOptions) {
  const engine = useVisualizationEngine(options)
  const [branches, setBranches] = useState<TimelineBranch[]>([])
  const [currentBranch, setCurrentBranch] = useState('main')
  
  const branch = useCallback((name: string) => {
    const branching = engine.engine?.getBranching()
    branching?.branch(name, engine.frameIndex)
    setBranches(branching?.getBranches() || [])
  }, [engine])
  
  const switchBranch = useCallback((branchId: string) => {
    const branching = engine.engine?.getBranching()
    branching?.switchBranch(branchId)
    setCurrentBranch(branchId)
  }, [engine])
  
  const setDirection = useCallback((dir: 'forward' | 'backward') => {
    engine.engine?.setPlaybackDirection(dir)
  }, [engine])
  
  return {
    ...engine,
    branches,
    currentBranch,
    branch,
    switchBranch,
    setDirection
  }
}
```

---

## Success Criteria

✅ **Reverse animation smooth**  
✅ **Branching works correctly**  
✅ **Frame interpolation 60fps**  
✅ **Deterministic replay across speeds**  
✅ **Snapshots restore exactly**  
✅ **No performance degradation**  

---

## Next Phase (Phase 5)

Event sourcing: Replace full snapshots with event deltas.

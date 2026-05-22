# Phase 1: Core Runtime Engine ✅

## What Was Built

### 1. **Event System** (`src/core/runtime/events.ts`)
- Semantic event types: `ARRAY_COMPARE`, `ARRAY_SWAP`, `NODE_UPDATE`, `HIGHLIGHT`, etc.
- Rich metadata: concept, explanation, complexity, importance
- Type-safe event interfaces

```typescript
type SemanticEvent = {
  type: EventType
  frameId: number
  timestamp: number
  concept?: string
  explanation?: string
  importance?: 'low' | 'medium' | 'high'
  // + event-specific payload
}
```

### 2. **Timeline Engine** (`src/core/runtime/timeline.ts`)
- Frame-based timeline management
- Events grouped by frameId
- Navigation: `nextFrame()`, `previousFrame()`, `seekToFrame()`
- Progress tracking

```typescript
const timeline = new EventTimeline(events)
timeline.nextFrame() // returns TimelineFrame
timeline.getProgress() // 0-100%
```

### 3. **Playback Engine** (`src/core/runtime/playback.ts`)
- Play/pause/resume control
- Speed control (0.1x to 5x)
- Frame-based timing via `requestAnimationFrame`
- State management

```typescript
const playback = new PlaybackEngine({ frameDelay: 300, speed: 1 })
playback.play()
playback.setSpeed(2)
```

### 4. **Visualization Engine** (`src/core/runtime/engine.ts`)
- Orchestrates timeline + playback
- Emits events for React
- Manages runtime state (idle, playing, paused, completed)
- Event log for replay

```typescript
const engine = new VisualizationEngine(events, { frameDelay: 300 })
engine.play()
engine.on('frameUpdate', (data) => { /* render */ })
```

### 5. **React Hook** (`src/core/hooks/useVisualizationEngine.ts`)
- Bridges engine (pure JS) and React (UI)
- Automatic snapshot updates
- Full control API

```typescript
const {
  currentFrame,
  progress,
  runtimeState,
  play,
  pause,
  setSpeed,
  nextFrame,
  previousFrame
} = useVisualizationEngine({ events })
```

### 6. **Event-Based Component** (`src/components/visualizers/EventBasedVisualizer.tsx`)
- Ready-to-use visualizer component
- Play/pause/step/speed controls
- Progress bar
- Generic renderer support

## How It Works

### Old Model ❌
```
Component State
  ↓ (imperative)
Animation Logic
  ↓
DOM/Canvas Rendering
```

### New Model ✅
```
Algorithm
  ↓ (produces events)
Event Stream [COMPARE, SWAP, ...]
  ↓
Timeline Runtime (frame-based)
  ↓
Playback Engine (play/pause/speed)
  ↓
React Component (reads snapshots)
  ↓
Rendering
```

## Usage Example: Bubble Sort

### Step 1: Algorithm produces events

```typescript
// src/core/algorithms/bubbleSort.ts
export function bubbleSortEvents(arr: number[]): SemanticEvent[] {
  const events: SemanticEvent[] = []
  let frameId = 0
  const copy = [...arr]

  for (let i = 0; i < copy.length - 1; i++) {
    for (let j = 0; j < copy.length - i - 1; j++) {
      frameId++

      // Event: comparison
      events.push({
        type: 'ARRAY_COMPARE',
        frameId,
        timestamp: frameId * 300,
        indices: [j, j + 1],
        concept: 'comparison',
        explanation: `Comparing elements at index ${j} and ${j + 1}`,
        importance: 'high'
      })

      // Swap if needed
      if (copy[j] > copy[j + 1]) {
        frameId++
        [copy[j], copy[j + 1]] = [copy[j + 1], copy[j]]

        events.push({
          type: 'ARRAY_SWAP',
          frameId,
          timestamp: frameId * 300,
          indices: [j, j + 1],
          concept: 'swap_operation',
          explanation: `Swapping elements`,
          importance: 'high'
        })
      }
    }
  }

  return events
}
```

### Step 2: Use in component

```typescript
import { bubbleSortEvents } from '@/core/algorithms/bubbleSort'
import { useVisualizationEngine } from '@/core/hooks/useVisualizationEngine'
import EventBasedVisualizer from '@/components/visualizers/EventBasedVisualizer'

function BubbleSortVisualizer() {
  const arr = [64, 34, 25, 12, 22, 11, 90]
  const events = bubbleSortEvents(arr)

  return (
    <EventBasedVisualizer
      title="Bubble Sort"
      description="Step-by-step bubble sort visualization"
      events={events}
      renderer={ArrayRenderer}
      frameDelay={300}
      speed={1}
    />
  )
}
```

## Files Created

```
src/core/runtime/
  ├── events.ts          (event types + interfaces)
  ├── timeline.ts        (frame-based timeline)
  ├── playback.ts        (play/pause/speed control)
  ├── engine.ts          (orchestrator)
  └── index.ts           (exports)

src/core/algorithms/
  └── bubbleSort.ts      (example: algorithm → events)

src/core/hooks/
  └── useVisualizationEngine.ts (React integration)

src/components/visualizers/
  ├── EventBasedVisualizer.tsx
  └── EventBasedVisualizer.module.css
```

## Next Steps: Phase 2

Convert existing visualizers to event-based:
1. Array Visualizer
2. Tree Visualizer
3. Graph Visualizer
4. Others...

Then build central renderer (Phase 3) that interprets events.

## Architecture Benefits

✅ **Replay** - Event log = perfect replay  
✅ **Rewind** - Timeline is deterministic  
✅ **Export/Import** - Events are data  
✅ **Multiplayer** - Events can be shared  
✅ **AI Generation** - Algorithms produce structured output  
✅ **Testing** - Pure functions, no side effects  
✅ **Performance** - No component re-renders per frame  
✅ **Semantic Metadata** - Concepts + explanations built-in  

## Key Principle

> **Algorithm produces events. Runtime consumes events. React renders result.**

NOT:

> **Algorithm calls setState. React re-renders. Animation happens in useEffect.**

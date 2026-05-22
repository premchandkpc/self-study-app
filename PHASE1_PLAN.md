# Phase 1 Implementation Plan: Core Runtime Engine

## Goal
Transform component-driven visualizers into event-based runtime system.

---

## Week 1: Foundation & Setup

### Day 1-2: Initialize Runtime Framework
- [x] Create `src/core/runtime/` folder structure
- [x] Implement event types (`events.ts`)
- [x] Implement timeline engine (`timeline.ts`)
- [x] Implement playback engine (`playback.ts`)
- [x] Create main engine (`engine.ts`)

**Deliverable**: Runtime classes testable in isolation

```bash
npm test -- src/core/runtime/
```

### Day 3: React Integration
- [x] Create `useVisualizationEngine` hook
- [x] Create `EventBasedVisualizer` component
- [x] Wire event emissions → React state

**Deliverable**: Basic component renders frames

### Day 4-5: Algorithm Conversion (Bubble Sort)
- [x] Create `bubbleSort.ts` event producer
- [ ] Test bubble sort produces correct events
- [ ] Test timeline processes events correctly
- [ ] Test playback advances through frames

**Deliverable**: Working bubble sort → events → playback

---

## Week 2: Test & Validate Core System

### Day 1-2: Unit Tests
```typescript
// Timeline tests
- currentFrame() returns correct frame
- nextFrame() increments correctly
- previousFrame() handles boundaries
- seekToFrame() finds correct frame
- getProgress() calculates 0-100%

// Playback tests
- play() starts animation
- pause() stops animation
- setSpeed() changes frame delay
- callback fires on each frame

// Engine tests
- addEvent() updates timeline
- getCurrentFrame() returns current
- frameUpdate event emits correctly
```

**Target**: 80%+ coverage

### Day 3: Integration Tests
```typescript
// Scenario: Start bubble sort, play 3 frames, pause, rewind 1, play to end
- Verify events are correct
- Verify frame sequence correct
- Verify no events dropped
- Verify replay is deterministic
```

### Day 4-5: React Component Tests
```typescript
// Hook tests
- useVisualizationEngine(events) initializes
- play/pause/setSpeed work
- nextFrame/previousFrame work
- Snapshot updates on frame change
- callbacks fired correctly
```

**Deliverable**: Confidence in runtime correctness

---

## Week 3: Convert Array Visualizer

### Day 1-2: Analyze Current ArrayVisualizer
- Read existing `ArrayVisualizer.jsx`
- Document how it currently works
- Identify rendering logic vs. algorithm logic

### Day 3-5: Event-Based Conversion
- Create `arrayEventProducers.ts`:
  - `bubbleSortEvents()`
  - `quickSortEvents()`
  - `mergesSortEvents()`
  - `insertionSortEvents()`

- Update `ArrayVisualizer` to:
  - Accept events (not raw array)
  - Use `useVisualizationEngine` hook
  - Render based on `currentFrame`
  - Keep existing UI/styles

**Pattern**:
```typescript
// OLD
function ArrayVisualizer({ algorithm, array }) {
  const [state, dispatch] = useReducer(...)
  const animate = () => { /* imperative */ }
}

// NEW
function ArrayVisualizer({ algorithm, array }) {
  const events = getEventProducer(algorithm)(array)
  const { currentFrame, play, pause, ... } = useVisualizationEngine({ events })
  return <EventBasedVisualizer ... />
}
```

**Deliverable**: ArrayVisualizer works with event system

---

## Week 4: Renderer Engine (Foundation)

### Day 1-3: Generic Renderer Component
- Create `src/core/renderers/ArrayRenderer.tsx`
- Interpret `ARRAY_COMPARE`, `ARRAY_SWAP`, `ARRAY_SET` events
- Highlight compared elements
- Animate swap operations
- Update array display

```typescript
// ArrayRenderer.tsx
function ArrayRenderer({ frame }) {
  const events = frame.events
  
  return (
    <div className="array">
      {array.map((val, i) => (
        <div className={getClassName(i, events)}>
          {val}
        </div>
      ))}
    </div>
  )
}
```

### Day 4-5: Test with Multiple Algorithms
- Bubble sort → visualizes
- Quick sort → visualizes  
- Merge sort → visualizes
- All use SAME renderer ✅

**Deliverable**: One renderer, many algorithms

---

## Success Criteria

✅ Runtime classes work standalone  
✅ Event production is deterministic  
✅ Playback respects speed/pause  
✅ React components update smoothly  
✅ ArrayVisualizer uses new system  
✅ Multiple sorting algorithms work  
✅ One renderer handles all events  
✅ Tests pass, >80% coverage  
✅ No component re-renders per frame (use snapshots)  
✅ Replay produces identical sequence  

---

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing visualizers | Keep old system, parallelize new system |
| Performance issues with large event streams | Benchmark, use event compression |
| React state churn on frame updates | Use fine-grained updates, not full snapshot |
| Animation frame skipping | Measure actual frame timing |
| Event producer correctness | Comprehensive unit tests |

---

## Rollback Plan

If Phase 1 fails:
- Old visualizers still work (not modified)
- New runtime classes isolated in `src/core/runtime/`
- Can delete new code without affecting existing

---

## Key Metrics

- [ ] Runtime instantiation: <5ms
- [ ] Event processing: <1ms per event
- [ ] Frame advancement: 60fps (requestAnimationFrame)
- [ ] Memory: <5MB for 1000 events
- [ ] Deterministic replay: 100% match with original

---

## Files to Create This Phase

```
✅ src/core/runtime/
  ├── events.ts
  ├── timeline.ts
  ├── playback.ts
  ├── engine.ts
  └── index.ts

✅ src/core/algorithms/
  └── bubbleSort.ts

✅ src/core/hooks/
  └── useVisualizationEngine.ts

✅ src/components/visualizers/
  ├── EventBasedVisualizer.tsx
  └── EventBasedVisualizer.module.css

📝 src/core/algorithms/
  └── sortingAlgorithms.ts (Week 3)

📝 src/core/renderers/
  └── ArrayRenderer.tsx (Week 4)

📝 src/__tests__/
  └── runtime/ (Week 2)
```

---

## Decision Points

1. **Event Production**: Inline in component or separate files?
   - **Decision**: Separate files (`src/core/algorithms/`) for reuse & testing

2. **Timeline Storage**: Keep all events in memory?
   - **Decision**: Yes for Phase 1 (<10K events), optimize in Phase 5+

3. **React State Updates**: Full snapshot or fine-grained?
   - **Decision**: Fine-grained (currentFrame only) to avoid churn

4. **Playback Timing**: `requestAnimationFrame` or `setInterval`?
   - **Decision**: `requestAnimationFrame` for 60fps sync

5. **Renderer Architecture**: One big component or micro-components?
   - **Decision**: One `ArrayRenderer` per type, can compose later

---

## Open Questions

- [ ] How to handle user interactions (clicking nodes) while playing?
- [ ] Should events include rendering hints (color, position)?
- [ ] How to version event format for future compatibility?
- [ ] Should WebWorker offloading happen in Phase 1?

Answer during Week 2 implementation.

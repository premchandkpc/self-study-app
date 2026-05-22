# Phase 2: Convert Visualizers to Event-Based

**Goal**: Migrate all sorting/basic visualizers from component state to event producers.

**Duration**: 2-3 weeks

---

## Architecture Pattern

### Old ❌
```typescript
function ArrayVisualizer({ array, algorithm }) {
  const [state, setState] = useReducer(...)
  
  useEffect(() => {
    algorithm(array, (newState) => setState(newState))
  }, [])
  
  return <div>{/* render state */}</div>
}
```

### New ✅
```typescript
function ArrayVisualizer({ array, algorithm }) {
  const events = getEventProducer(algorithm)(array)
  const engine = useVisualizationEngine({ events })
  
  return <EventBasedVisualizer events={events} renderer={ArrayRenderer} />
}
```

---

## Task Breakdown

### Week 1: Sorting Algorithms

Convert to event producers (pure functions):

#### Day 1-2: Bubble Sort ✅ (already done)
- [x] `bubbleSortEvents(arr)`
- [x] Produces COMPARE, SWAP events
- [x] Test with multiple arrays
- [x] Verify event sequence

#### Day 3: Quick Sort
```typescript
// src/core/algorithms/quickSort.ts
export function quickSortEvents(arr: number[]): SemanticEvent[] {
  const events: SemanticEvent[] = []
  let frameId = 0
  const copy = [...arr]
  
  function partition(low: number, high: number): number {
    const pivot = copy[high]
    let i = low - 1
    
    for (let j = low; j < high; j++) {
      frameId++
      events.push({
        type: 'ARRAY_COMPARE',
        frameId,
        timestamp: frameId * 300,
        indices: [j, high],
        concept: 'partition_compare'
      })
      
      if (copy[j] < pivot) {
        i++
        frameId++
        [copy[i], copy[j]] = [copy[j], copy[i]]
        events.push({
          type: 'ARRAY_SWAP',
          frameId,
          timestamp: frameId * 300,
          indices: [i, j]
        })
      }
    }
    
    frameId++
    [copy[i + 1], copy[high]] = [copy[high], copy[i + 1]]
    events.push({
      type: 'ARRAY_SWAP',
      frameId,
      timestamp: frameId * 300,
      indices: [i + 1, high]
    })
    
    return i + 1
  }
  
  function quickSort(low: number, high: number) {
    if (low < high) {
      const pi = partition(low, high)
      quickSort(low, pi - 1)
      quickSort(pi + 1, high)
    }
  }
  
  quickSort(0, copy.length - 1)
  return events
}
```

#### Day 4: Merge Sort
```typescript
// src/core/algorithms/mergeSort.ts
export function mergeSortEvents(arr: number[]): SemanticEvent[] {
  const events: SemanticEvent[] = []
  let frameId = 0
  const copy = [...arr]
  
  function merge(left: number, mid: number, right: number) {
    const leftArr = copy.slice(left, mid + 1)
    const rightArr = copy.slice(mid + 1, right + 1)
    let i = 0, j = 0, k = left
    
    while (i < leftArr.length && j < rightArr.length) {
      frameId++
      events.push({
        type: 'ARRAY_COMPARE',
        frameId,
        timestamp: frameId * 300,
        indices: [left + i, mid + 1 + j],
        concept: 'merge_compare'
      })
      
      if (leftArr[i] <= rightArr[j]) {
        copy[k++] = leftArr[i++]
      } else {
        copy[k++] = rightArr[j++]
      }
      
      frameId++
      events.push({
        type: 'ARRAY_SET',
        frameId,
        timestamp: frameId * 300,
        index: k - 1,
        value: copy[k - 1]
      })
    }
    
    while (i < leftArr.length) {
      copy[k++] = leftArr[i++]
    }
    while (j < rightArr.length) {
      copy[k++] = rightArr[j++]
    }
  }
  
  function mergeSort(left: number, right: number) {
    if (left < right) {
      const mid = Math.floor((left + right) / 2)
      mergeSort(left, mid)
      mergeSort(mid + 1, right)
      merge(left, mid, right)
    }
  }
  
  mergeSort(0, copy.length - 1)
  return events
}
```

#### Day 5: Insertion Sort + Heap Sort
- `insertionSortEvents()`
- `heapSortEvents()`

### Week 2: Graph/Tree Algorithms

#### Day 1-2: DFS Event Producer
```typescript
// src/core/algorithms/dfs.ts
export function dfsEvents(graph: Graph, startNode: string): SemanticEvent[] {
  const events: SemanticEvent[] = []
  let frameId = 0
  const visited = new Set<string>()
  
  function dfs(node: string) {
    frameId++
    events.push({
      type: 'NODE_UPDATE',
      frameId,
      timestamp: frameId * 300,
      nodeId: node,
      updates: { visited: true, color: '#3b82f6' },
      concept: 'node_visit',
      explanation: `Visiting node ${node}`
    })
    visited.add(node)
    
    for (const neighbor of graph.getNeighbors(node)) {
      frameId++
      events.push({
        type: 'EDGE_CREATE',
        frameId,
        timestamp: frameId * 300,
        from: node,
        to: neighbor,
        concept: 'explore_edge'
      })
      
      if (!visited.has(neighbor)) {
        dfs(neighbor)
      }
    }
    
    frameId++
    events.push({
      type: 'NODE_UPDATE',
      frameId,
      timestamp: frameId * 300,
      nodeId: node,
      updates: { visited: true, color: '#10b981' },
      concept: 'node_complete'
    })
  }
  
  dfs(startNode)
  return events
}
```

#### Day 3: BFS Event Producer
- Similar to DFS
- Queue-based instead of recursion
- FIFO node visiting

#### Day 4-5: Binary Search Tree Events
- `bstInsertEvents()`
- `bstDeleteEvents()`
- `bstSearchEvents()`

### Week 3: Data Structure Operations

#### Day 1: Array Operations
- Shift, unshift, push, pop events
- Insert, delete at index

#### Day 2: Linked List Operations
- Node creation/deletion
- Pointer updates
- List traversal

#### Day 3: Hash Table Operations
- Insert, delete, lookup
- Collision handling
- Rehashing

#### Day 4-5: Priority Queue / Heap
- Insert event
- Extract event
- Heapify events

---

## Event Producer File Structure

```
src/core/algorithms/
├── sorting/
│   ├── bubbleSort.ts       ✅
│   ├── quickSort.ts        📝
│   ├── mergeSort.ts        📝
│   ├── insertionSort.ts    📝
│   ├── heapSort.ts         📝
│   └── index.ts
├── searching/
│   ├── linearSearch.ts     📝
│   ├── binarySearch.ts     📝
│   └── index.ts
├── graphs/
│   ├── dfs.ts              📝
│   ├── bfs.ts              📝
│   ├── dijkstra.ts         📝
│   └── index.ts
├── trees/
│   ├── bstOperations.ts    📝
│   ├── avlOperations.ts    📝
│   └── index.ts
└── dataStructures/
    ├── linkedList.ts       📝
    ├── hashTable.ts        📝
    └── index.ts
```

---

## Test Strategy

For each algorithm:
```typescript
describe('bubbleSortEvents', () => {
  it('should produce correct event sequence', () => {
    const arr = [64, 34, 25, 12, 22, 11, 90]
    const events = bubbleSortEvents(arr)
    
    // Verify structure
    expect(events.length).toBeGreaterThan(0)
    expect(events[0].type).toBe('ARRAY_COMPARE')
    
    // Verify determinism
    const events2 = bubbleSortEvents(arr)
    expect(events).toEqual(events2)
    
    // Verify frame IDs are sequential
    for (let i = 0; i < events.length; i++) {
      expect(events[i].frameId).toBe(i + 1)
    }
    
    // Verify event types are valid
    events.forEach(e => {
      expect(['ARRAY_COMPARE', 'ARRAY_SWAP']).toContain(e.type)
    })
  })
})
```

---

## Completion Checklist

- [ ] All sorting algorithms converted
- [ ] All graph algorithms converted
- [ ] All tree algorithms converted
- [ ] All data structure operations converted
- [ ] 100% test coverage for event producers
- [ ] Events verified to be deterministic
- [ ] Events work with Phase 1 runtime
- [ ] Documentation updated
- [ ] Performance benchmarked

---

## Success Metrics

✅ No imperative rendering in algorithm code  
✅ Algorithm = pure function → events  
✅ Same algorithm, different speeds/pauses  
✅ Perfect replay of any algorithm  
✅ <10ms to generate events for 1000 elements  
✅ <100KB memory for typical event streams  

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Complex algorithms hard to convert | Start simple, build patterns |
| Events too verbose | Compress metadata in Phase 5 |
| Frame IDs collision | Use atomic counter, test rigorously |
| Determinism hard to verify | Comprehensive test suite |
| Performance regression | Benchmark vs. old system |

---

## Next Phase (Phase 3)

Once all algorithms produce events:
- Build **central renderer** that interprets ANY event
- Same renderer handles: sort, search, graphs, trees, data structures
- No algorithm-specific rendering code needed

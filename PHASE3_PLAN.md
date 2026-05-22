# Phase 3: Central Renderer Engine

**Goal**: Build ONE renderer that interprets ALL event types, eliminating algorithm-specific rendering code.

**Duration**: 2-3 weeks

**Key Concept**: Renderer is interpreter, not painter. Events tell renderer WHAT happened, not HOW to draw.

---

## Core Idea: Event Interpretation

### Before (Bad) ❌
```typescript
// BubbleSort.jsx
function render() {
  return array.map((val, i) => (
    <Div highlighted={compared.includes(i)} 
         swapping={swapping.includes(i)}>
      {val}
    </Div>
  ))
}

// QuickSort.jsx - DIFFERENT CODE
function render() {
  return array.map((val, i) => (
    <Div highlighted={partitioned.includes(i)} />
  ))
}
```

### After (Good) ✅
```typescript
// EventRenderer.tsx - SAME CODE FOR ALL
function render(frame: TimelineFrame) {
  const state = rebuildState(frame.events)
  return array.map((val, i) => (
    <Div className={getElementClass(i, state)} />
  ))
}

function getElementClass(index: number, state: RenderState): string {
  if (state.highlighted.includes(index)) return 'highlighted'
  if (state.swapping.includes(index)) return 'swapping'
  if (state.sorted.includes(index)) return 'sorted'
  return ''
}
```

---

## Architecture

```
SemanticEvent[] → [EventInterpreter] → RenderState → React → DOM
```

### Step 1: Event → State Mapping

```typescript
// RenderState is computed FROM events, not maintained separately
interface RenderState {
  // Arrays
  values: number[]
  compared: Set<number>
  swapped: Set<number>
  highlighted: Set<number>
  sorted: Set<number>
  
  // Graphs/Trees
  nodes: Map<string, NodeState>
  edges: Map<string, EdgeState>
  
  // Generic
  metadata: Map<string, any>
}

interface NodeState {
  id: string
  visited: boolean
  exploring: boolean
  selected: boolean
  color?: string
  label?: string
}

interface EdgeState {
  from: string
  to: string
  active: boolean
  weight?: number
  color?: string
}

// Stateless interpreter: given events, compute render state
function buildRenderState(events: SemanticEvent[]): RenderState {
  const state: RenderState = {
    values: [],
    compared: new Set(),
    swapped: new Set(),
    highlighted: new Set(),
    sorted: new Set(),
    nodes: new Map(),
    edges: new Map(),
    metadata: new Map()
  }
  
  for (const event of events) {
    switch (event.type) {
      case 'ARRAY_COMPARE':
        state.compared = new Set([...(event as ArrayCompareEvent).indices])
        break
        
      case 'ARRAY_SWAP':
        state.swapped = new Set([...(event as ArraySwapEvent).indices])
        break
        
      case 'ARRAY_SET':
        state.values[event.index] = event.value
        break
        
      case 'NODE_UPDATE':
        const nodeEvent = event as NodeUpdateEvent
        state.nodes.set(nodeEvent.nodeId, {
          id: nodeEvent.nodeId,
          ...nodeEvent.updates
        })
        break
        
      case 'EDGE_CREATE':
        state.edges.set(`${event.from}-${event.to}`, {
          from: event.from,
          to: event.to,
          active: true
        })
        break
    }
  }
  
  return state
}
```

---

## Renderer Implementation

### Array Renderer

```typescript
// src/core/renderers/ArrayRenderer.tsx
interface ArrayRendererProps {
  frame: TimelineFrame
  initialArray: number[]
}

function ArrayRenderer({ frame, initialArray }: ArrayRendererProps) {
  const state = useMemo(
    () => buildRenderState(frame.events),
    [frame.events]
  )
  
  return (
    <div className="array-container">
      {initialArray.map((val, i) => (
        <ArrayElement
          key={i}
          value={val}
          index={i}
          state={state}
        />
      ))}
    </div>
  )
}

function ArrayElement({ value, index, state }: any) {
  const classes = []
  
  if (state.compared.has(index)) classes.push('comparing')
  if (state.swapped.has(index)) classes.push('swapping')
  if (state.sorted.has(index)) classes.push('sorted')
  if (state.highlighted.has(index)) classes.push('highlighted')
  
  return (
    <div className={`array-element ${classes.join(' ')}`}>
      {value}
    </div>
  )
}
```

### Graph Renderer

```typescript
// src/core/renderers/GraphRenderer.tsx
interface GraphRendererProps {
  frame: TimelineFrame
  graph: Graph
}

function GraphRenderer({ frame, graph }: GraphRendererProps) {
  const state = useMemo(
    () => buildRenderState(frame.events),
    [frame.events]
  )
  
  const layout = computeGraphLayout(graph) // Force-directed or similar
  
  return (
    <svg width={800} height={600}>
      {/* Edges */}
      {Array.from(state.edges.values()).map(edge => (
        <Edge
          key={`${edge.from}-${edge.to}`}
          edge={edge}
          layout={layout}
          state={state}
        />
      ))}
      
      {/* Nodes */}
      {graph.nodes.map(node => (
        <Node
          key={node.id}
          node={node}
          layout={layout}
          state={state.nodes.get(node.id)}
        />
      ))}
    </svg>
  )
}

function Node({ node, layout, state }: any) {
  const pos = layout.get(node.id)
  const nodeState = state || { id: node.id }
  
  const fill = nodeState.visited ? '#10b981' :
               nodeState.exploring ? '#f59e0b' :
               '#3b82f6'
  
  return (
    <g>
      <circle
        cx={pos.x}
        cy={pos.y}
        r={30}
        fill={fill}
        className={nodeState.selected ? 'selected' : ''}
      />
      <text x={pos.x} y={pos.y} textAnchor="middle">
        {node.id}
      </text>
    </g>
  )
}
```

### Tree Renderer

```typescript
// src/core/renderers/TreeRenderer.tsx
interface TreeRendererProps {
  frame: TimelineFrame
  tree: BinaryTree
}

function TreeRenderer({ frame, tree }: TreeRendererProps) {
  const state = useMemo(
    () => buildRenderState(frame.events),
    [frame.events]
  )
  
  const layout = computeTreeLayout(tree.root)
  
  return (
    <svg width={800} height={600}>
      {renderTreeNodes(tree.root, layout, state)}
    </svg>
  )
}

function renderTreeNodes(node: any, layout: any, state: any): JSX.Element[] {
  if (!node) return []
  
  const nodeState = state.nodes.get(node.id) || { id: node.id }
  const elements: JSX.Element[] = []
  
  // Left edge
  if (node.left) {
    const leftLayout = layout.get(node.left.id)
    const nodeLayout = layout.get(node.id)
    elements.push(
      <line
        key={`edge-left-${node.id}`}
        x1={nodeLayout.x}
        y1={nodeLayout.y}
        x2={leftLayout.x}
        y2={leftLayout.y}
        stroke="#999"
      />
    )
  }
  
  // Right edge
  if (node.right) {
    const rightLayout = layout.get(node.right.id)
    const nodeLayout = layout.get(node.id)
    elements.push(
      <line
        key={`edge-right-${node.id}`}
        x1={nodeLayout.x}
        y1={nodeLayout.y}
        x2={rightLayout.x}
        y2={rightLayout.y}
        stroke="#999"
      />
    )
  }
  
  // Node
  const pos = layout.get(node.id)
  const fill = nodeState.visited ? '#10b981' : '#3b82f6'
  
  elements.push(
    <circle
      key={`node-${node.id}`}
      cx={pos.x}
      cy={pos.y}
      r={25}
      fill={fill}
    />,
    <text
      key={`text-${node.id}`}
      x={pos.x}
      y={pos.y}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {node.value}
    </text>
  )
  
  // Recurse
  elements.push(
    ...renderTreeNodes(node.left, layout, state),
    ...renderTreeNodes(node.right, layout, state)
  )
  
  return elements
}
```

---

## Renderer Registry

```typescript
// src/core/renderers/RendererRegistry.ts
type RendererComponent = React.ComponentType<{ frame: TimelineFrame; data?: any }>

interface RendererEntry {
  component: RendererComponent
  eventTypes: EventType[]
  description: string
}

class RendererRegistry {
  private renderers: Map<string, RendererEntry> = new Map()
  
  register(name: string, entry: RendererEntry) {
    this.renderers.set(name, entry)
  }
  
  getRenderer(name: string): RendererComponent | null {
    return this.renderers.get(name)?.component ?? null
  }
  
  getRendererForEvents(events: SemanticEvent[]): RendererComponent | null {
    const eventTypes = new Set(events.map(e => e.type))
    
    // Find renderer that handles these event types
    for (const [, entry] of this.renderers) {
      if (entry.eventTypes.some(t => eventTypes.has(t))) {
        return entry.component
      }
    }
    
    return null // Fallback to generic
  }
}

export const rendererRegistry = new RendererRegistry()

rendererRegistry.register('array', {
  component: ArrayRenderer,
  eventTypes: ['ARRAY_COMPARE', 'ARRAY_SWAP', 'ARRAY_SET'],
  description: 'Renders array-based algorithms'
})

rendererRegistry.register('graph', {
  component: GraphRenderer,
  eventTypes: ['NODE_CREATE', 'NODE_UPDATE', 'EDGE_CREATE', 'EDGE_DELETE'],
  description: 'Renders graph algorithms'
})

rendererRegistry.register('tree', {
  component: TreeRenderer,
  eventTypes: ['NODE_CREATE', 'NODE_UPDATE'],
  description: 'Renders tree operations'
})
```

---

## Generic Visualizer (Auto-Select Renderer)

```typescript
// src/components/visualizers/GenericEventVisualizer.tsx
interface GenericEventVisualizerProps {
  title: string
  events: SemanticEvent[]
  data?: any // graph, tree, array, etc.
}

function GenericEventVisualizer({
  title,
  events,
  data
}: GenericEventVisualizerProps) {
  const engine = useVisualizationEngine({ events })
  const Renderer = rendererRegistry.getRendererForEvents(events)
  
  if (!Renderer) {
    return <div>No renderer found for events</div>
  }
  
  return (
    <div className="visualizer">
      <h2>{title}</h2>
      
      <div className="canvas">
        <Renderer frame={engine.currentFrame!} data={data} />
      </div>
      
      <div className="controls">
        <button onClick={engine.play}>Play</button>
        <button onClick={engine.pause}>Pause</button>
        <button onClick={engine.nextFrame} disabled={!engine.canAdvance()}>
          Next
        </button>
        <button onClick={engine.previousFrame} disabled={!engine.canRewind()}>
          Prev
        </button>
        <select onChange={(e) => engine.setSpeed(parseFloat(e.target.value))}>
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="2">2x</option>
        </select>
      </div>
      
      <progress value={engine.progress} max={100} />
    </div>
  )
}
```

---

## Usage: All algorithms use SAME component

```typescript
// Bubble Sort
<GenericEventVisualizer
  title="Bubble Sort"
  events={bubbleSortEvents([3,1,4,1,5])}
  data={[3,1,4,1,5]}
/>

// Quick Sort - SAME COMPONENT
<GenericEventVisualizer
  title="Quick Sort"
  events={quickSortEvents([3,1,4,1,5])}
  data={[3,1,4,1,5]}
/>

// DFS - SAME COMPONENT, different renderer
<GenericEventVisualizer
  title="Depth-First Search"
  events={dfsEvents(graph, 'A')}
  data={graph}
/>

// BST - SAME COMPONENT, different renderer
<GenericEventVisualizer
  title="Binary Search Tree Insert"
  events={bstInsertEvents(tree, 42)}
  data={tree}
/>
```

---

## Completion Checklist

- [ ] RenderState interface finalized
- [ ] buildRenderState() function working
- [ ] ArrayRenderer complete
- [ ] GraphRenderer complete
- [ ] TreeRenderer complete
- [ ] RendererRegistry implemented
- [ ] GenericEventVisualizer working
- [ ] All Phase 2 algorithms working with renderers
- [ ] CSS/animation smooth
- [ ] Tests pass
- [ ] Performance: <16ms per frame

---

## Success Metrics

✅ **One component renders all algorithms**  
✅ **Renderers are stateless functions**  
✅ **Events → state → render (no imperatives)**  
✅ **60fps animation performance**  
✅ **No algorithm-specific rendering code**  

---

## Next Phase (Phase 4)

Enhance timeline:
- Playback reverse (rewind animation)
- Branching timelines
- Deterministic replay with different speeds

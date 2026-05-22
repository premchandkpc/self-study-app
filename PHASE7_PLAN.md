# Phase 7: Multi-Layer Rendering Architecture

**Goal**: Decouple React from rendering. Use Canvas/SVG/WebGL for heavy animations. React only controls.

**Duration**: 2-3 weeks

**Key Concept**: React ≠ Renderer. React orchestrates, Canvas/SVG/WebGL render.

---

## Problem: React DOM is Slow

```
Array change
  ↓
React re-renders ALL elements
  ↓
DOM reconciliation
  ↓
Reflow/repaint
  ↓
Visible lag at 60+ fps
```

---

## Solution: Layer Architecture

```
React Layer (Control)
    ↓
Canvas Layer (Rendering for heavy)
SVG Layer (Rendering for graphs)
DOM Layer (Rendering for UI)
```

---

## Architecture

### 1. Renderer Interface

```typescript
// src/core/renderers/Renderer.ts
export interface IRenderer {
  render(frame: TimelineFrame, state: RenderState): void
  setDimensions(width: number, height: number): void
  clear(): void
  destroy(): void
}

export interface RenderState {
  array?: number[]
  nodes?: Map<string, any>
  edges?: Map<string, any>
  highlighted?: Set<number>
  compared?: Set<number>
  swapped?: Set<number>
  metadata?: Map<string, any>
}
```

### 2. DOM Renderer (Simple Arrays, UI)

```typescript
// src/core/renderers/DOMRenderer.ts
export class DOMRenderer implements IRenderer {
  private container: HTMLElement
  private elements: HTMLElement[] = []
  
  constructor(container: HTMLElement) {
    this.container = container
  }
  
  render(frame: TimelineFrame, state: RenderState): void {
    if (!state.array) return
    
    // Only update changed elements
    state.array.forEach((value, i) => {
      let el = this.elements[i]
      
      if (!el) {
        el = document.createElement('div')
        el.className = 'array-element'
        this.container.appendChild(el)
        this.elements[i] = el
      }
      
      el.textContent = value.toString()
      el.className = this.getClassName(i, state)
    })
  }
  
  private getClassName(index: number, state: RenderState): string {
    const classes = ['array-element']
    if (state.compared?.has(index)) classes.push('comparing')
    if (state.swapped?.has(index)) classes.push('swapping')
    if (state.highlighted?.has(index)) classes.push('highlighted')
    return classes.join(' ')
  }
  
  setDimensions(width: number, height: number): void {
    this.container.style.width = `${width}px`
    this.container.style.height = `${height}px`
  }
  
  clear(): void {
    this.container.innerHTML = ''
    this.elements = []
  }
  
  destroy(): void {
    this.clear()
  }
}
```

### 3. Canvas Renderer (Heavy Animations)

```typescript
// src/core/renderers/CanvasRenderer.ts
export class CanvasRenderer implements IRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width: number = 0
  private height: number = 0
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
  }
  
  render(frame: TimelineFrame, state: RenderState): void {
    this.clear()
    
    if (state.array) {
      this.renderArray(state.array, state)
    } else if (state.nodes) {
      this.renderGraph(state.nodes, state.edges, state)
    }
  }
  
  private renderArray(array: number[], state: RenderState): void {
    const barWidth = this.width / array.length
    const maxValue = Math.max(...array)
    
    array.forEach((value, i) => {
      const x = i * barWidth
      const height = (value / maxValue) * this.height * 0.8
      const y = this.height - height
      
      // Determine color
      let color = '#3b82f6' // Default blue
      if (state.compared?.has(i)) color = '#f59e0b' // Orange
      if (state.swapped?.has(i)) color = '#ef4444' // Red
      if (state.highlighted?.has(i)) color = '#10b981' // Green
      
      // Draw bar
      this.ctx.fillStyle = color
      this.ctx.fillRect(x, y, barWidth - 2, height)
      
      // Draw value
      this.ctx.fillStyle = '#000'
      this.ctx.font = '12px monospace'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(value.toString(), x + barWidth / 2, y - 5)
    })
  }
  
  private renderGraph(
    nodes: Map<string, any>,
    edges: Map<string, any> | undefined,
    state: RenderState
  ): void {
    // Render edges
    if (edges) {
      edges.forEach(edge => {
        const from = nodes.get(edge.from)
        const to = nodes.get(edge.to)
        
        if (from && to) {
          this.ctx.strokeStyle = edge.active ? '#3b82f6' : '#ccc'
          this.ctx.lineWidth = edge.active ? 2 : 1
          this.ctx.beginPath()
          this.ctx.moveTo(from.x, from.y)
          this.ctx.lineTo(to.x, to.y)
          this.ctx.stroke()
        }
      })
    }
    
    // Render nodes
    nodes.forEach(node => {
      const color = node.visited ? '#10b981' : '#3b82f6'
      
      this.ctx.fillStyle = color
      this.ctx.beginPath()
      this.ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI)
      this.ctx.fill()
      
      this.ctx.fillStyle = '#fff'
      this.ctx.font = 'bold 14px monospace'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(node.id, node.x, node.y)
    })
  }
  
  setDimensions(width: number, height: number): void {
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
  }
  
  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height)
  }
  
  destroy(): void {
    // Canvas cleanup
  }
}
```

### 4. SVG Renderer (Graphs, Trees, Networks)

```typescript
// src/core/renderers/SVGRenderer.ts
export class SVGRenderer implements IRenderer {
  private svg: SVGSVGElement
  private width: number = 0
  private height: number = 0
  
  constructor(svg: SVGSVGElement) {
    this.svg = svg
  }
  
  render(frame: TimelineFrame, state: RenderState): void {
    this.clear()
    
    if (state.edges) {
      this.renderEdges(state.edges, state.nodes)
    }
    
    if (state.nodes) {
      this.renderNodes(state.nodes)
    }
  }
  
  private renderEdges(
    edges: Map<string, any>,
    nodes: Map<string, any> | undefined
  ): void {
    if (!nodes) return
    
    edges.forEach(edge => {
      const from = nodes.get(edge.from)
      const to = nodes.get(edge.to)
      
      if (from && to) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', from.x)
        line.setAttribute('y1', from.y)
        line.setAttribute('x2', to.x)
        line.setAttribute('y2', to.y)
        line.setAttribute('stroke', edge.active ? '#3b82f6' : '#ccc')
        line.setAttribute('stroke-width', edge.active ? '2' : '1')
        this.svg.appendChild(line)
      }
    })
  }
  
  private renderNodes(nodes: Map<string, any>): void {
    nodes.forEach((node, id) => {
      const circle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      )
      circle.setAttribute('cx', node.x)
      circle.setAttribute('cy', node.y)
      circle.setAttribute('r', '25')
      circle.setAttribute('fill', node.visited ? '#10b981' : '#3b82f6')
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', node.x)
      text.setAttribute('y', node.y)
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('dominant-baseline', 'middle')
      text.setAttribute('fill', 'white')
      text.textContent = id
      
      this.svg.appendChild(circle)
      this.svg.appendChild(text)
    })
  }
  
  setDimensions(width: number, height: number): void {
    this.width = width
    this.height = height
    this.svg.setAttribute('width', width.toString())
    this.svg.setAttribute('height', height.toString())
  }
  
  clear(): void {
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild)
    }
  }
  
  destroy(): void {
    this.clear()
  }
}
```

### 5. WebGL Renderer (Massive Data)

```typescript
// src/core/renderers/WebGLRenderer.ts
export class WebGLRenderer implements IRenderer {
  private canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.gl = canvas.getContext('webgl')!
  }
  
  render(frame: TimelineFrame, state: RenderState): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
    
    // Use WebGL to render massive point clouds, etc.
    // (Simplified example)
  }
  
  setDimensions(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
    this.gl.viewport(0, 0, width, height)
  }
  
  clear(): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
  }
  
  destroy(): void {
    // WebGL cleanup
  }
}
```

### 6. Renderer Selector (Choose Best Renderer)

```typescript
// src/core/renderers/RendererFactory.ts
export class RendererFactory {
  static selectRenderer(
    events: SemanticEvent[],
    complexity: 'simple' | 'medium' | 'heavy'
  ): 'dom' | 'canvas' | 'svg' | 'webgl' {
    // Heuristics:
    // - Few elements + UI: DOM
    // - Many elements, animations: Canvas
    // - Graphs/networks: SVG
    // - Massive data: WebGL
    
    const hasGraphEvents = events.some(
      e => ['NODE_CREATE', 'EDGE_CREATE', 'NODE_UPDATE'].includes(e.type)
    )
    
    const hasArrayEvents = events.some(
      e => ['ARRAY_SWAP', 'ARRAY_COMPARE'].includes(e.type)
    )
    
    if (complexity === 'heavy') return 'webgl'
    if (hasGraphEvents) return 'svg'
    if (hasArrayEvents && complexity === 'medium') return 'canvas'
    return 'dom'
  }
  
  createRenderer(
    type: 'dom' | 'canvas' | 'svg' | 'webgl',
    container: HTMLElement
  ): IRenderer {
    switch (type) {
      case 'dom':
        return new DOMRenderer(container)
      case 'canvas':
        const canvas = document.createElement('canvas')
        container.appendChild(canvas)
        return new CanvasRenderer(canvas)
      case 'svg':
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        container.appendChild(svg)
        return new SVGRenderer(svg as any)
      case 'webgl':
        const glCanvas = document.createElement('canvas')
        container.appendChild(glCanvas)
        return new WebGLRenderer(glCanvas)
    }
  }
}
```

### 7. Unified Rendering Component

```typescript
// src/components/visualizers/MultiLayerVisualizer.tsx
interface MultiLayerVisualizerProps {
  title: string
  events: SemanticEvent[]
  data?: any
}

export function MultiLayerVisualizer({
  title,
  events,
  data
}: MultiLayerVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<IRenderer | null>(null)
  
  const engine = useVisualizationEngine({ events })
  
  // Select best renderer
  useEffect(() => {
    if (!containerRef.current) return
    
    const rendererType = RendererFactory.selectRenderer(
      events,
      events.length > 1000 ? 'heavy' : events.length > 100 ? 'medium' : 'simple'
    )
    
    rendererRef.current = RendererFactory.createRenderer(
      rendererType,
      containerRef.current
    )
    
    rendererRef.current.setDimensions(800, 600)
  }, [])
  
  // Render on frame change
  useEffect(() => {
    if (!rendererRef.current || !engine.currentFrame) return
    
    const state = buildRenderState(engine.currentFrame.events)
    rendererRef.current.render(engine.currentFrame, state)
  }, [engine.currentFrame])
  
  return (
    <div className="visualizer">
      <h2>{title}</h2>
      <div ref={containerRef} className="canvas-container" />
      <PlaybackControls engine={engine} />
    </div>
  )
}
```

---

## Performance Comparison

| Scenario | DOM | Canvas | SVG | WebGL |
|----------|-----|--------|-----|-------|
| 10 elements | ✅ 60fps | 60fps | 60fps | overkill |
| 100 elements | ✅ 60fps | ✅ 60fps | ✅ 60fps | overkill |
| 1000 elements | ❌ 20fps | ✅ 60fps | ⚠️ 45fps | ✅ 60fps |
| 10k elements | ❌ 5fps | ❌ 30fps | ❌ 15fps | ✅ 60fps |
| Graphs | ✅ good | good | ✅ best | good |
| Trees | ✅ good | good | ✅ best | good |
| Real-time | ⚠️ choppy | ✅ smooth | ⚠️ ok | ✅ smooth |

---

## Files to Create

```
src/core/renderers/
├── Renderer.ts            (interface)
├── DOMRenderer.ts
├── CanvasRenderer.ts
├── SVGRenderer.ts
├── WebGLRenderer.ts
├── RendererFactory.ts
└── index.ts

src/components/
└── MultiLayerVisualizer.tsx
```

---

## Completion Checklist

- [ ] Renderer interface defined
- [ ] DOM renderer working
- [ ] Canvas renderer working
- [ ] SVG renderer working
- [ ] WebGL renderer basic
- [ ] Factory auto-selection
- [ ] Multi-layer component
- [ ] Performance tested
- [ ] All event types supported

---

## Success Criteria

✅ **60fps animation at all scales**  
✅ **10k elements still smooth**  
✅ **Auto-selection of best renderer**  
✅ **Graphs render beautifully**  
✅ **React doesn't block rendering**  

---

## Next Phase (Phase 8)

Offload heavy algorithms to Web Workers.

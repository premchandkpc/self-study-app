# Phase 4: Generic Animation + Rendering Engine

**Duration**: 3 weeks
**Goal**: Build a completely generic animation engine + multi-backend rendering pipeline. NO feature-specific animations.

---

## Week 1: Animation Primitives

### Day 1-2: Universal Animation Types

ALL animations built from composable primitives.

```typescript
// src/animation/primitives.ts
export type AnimationPrimitive =
  | 'move' | 'flow' | 'pulse' | 'rotate' | 'morph'
  | 'split' | 'merge' | 'expand' | 'collapse'
  | 'interpolate' | 'glow' | 'shake' | 'highlight'
  | 'scale' | 'fade' | 'stream' | 'wave' | 'orbit'
  | 'spring' | 'gravity' | 'force-layout' | 'packet-flow'
  | 'path' | 'scribble' | 'magnetize' | 'ripple'

// Animation descriptor — completely generic
export interface AnimationDescriptor {
  id: string
  type: AnimationPrimitive
  targetIds: string[]          // Entity IDs to animate
  duration: number             // ms
  delay?: number               // ms before start
  easing: EasingFunction
  keyframes: Keyframe[]
  iterations?: number           // 0 = infinite
  direction?: 'normal' | 'reverse' | 'alternate'

  // Property interpolation
  properties: {
    property: string           // e.g. 'position.x', 'opacity', 'color'
    from: any
    to: any
    interpolator: 'linear' | 'ease' | 'spring' | 'cubic-bezier'
  }[]
}

export interface Keyframe {
  time: number                 // 0-1 (percentage of duration)
  properties: Record<string, any>
}

export type EasingFunction =
  | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  | 'spring' | 'bounce' | 'elastic'
  | `cubic-bezier(${number},${number},${number},${number})`
```

### Day 3-4: AnimationEngine

```typescript
// src/animation/AnimationEngine.ts
export class AnimationEngine {
  private animations: Map<string, ActiveAnimation>
  private clock: number = 0
  private running: boolean = false

  // Register animation
  animate(descriptor: AnimationDescriptor): string  // returns anim ID

  // Composition
  parallel(animations: AnimationDescriptor[]): AnimationDescriptor
  sequence(animations: AnimationDescriptor[]): AnimationDescriptor
  chain(...animations: AnimationDescriptor[]): AnimationDescriptor

  // Control
  play(): void
  pause(): void
  stop(id: string): void
  seek(progress: number): void  // 0-1 for all animations

  // Tick (called by Scheduler or Renderer)
  tick(deltaMs: number): void

  // Query
  getActiveAnimations(): ActiveAnimation[]
  getEntityAnimationState(entityId: string): EntityAnimationState
}

export interface ActiveAnimation {
  id: string
  descriptor: AnimationDescriptor
  progress: number           // 0-1
  elapsed: number            // ms
  currentState: Map<string, any>  // Current interpolated values
}
```

### Day 5: Spring Physics + Layout Transitions

```typescript
// src/animation/physics/Spring.ts
export class SpringSystem {
  stiffness: number
  damping: number
  mass: number

  // Compute spring physics for smooth animations
  compute(current: number, target: number, dt: number): number

  // Force-directed layout
  forceLayout(graph: Graph, config: ForceConfig): Map<string, Position>
}

// src/animation/composers/GraphLayoutAnimator.ts
export class GraphLayoutAnimator {
  // Animate graph from old layout to new layout
  animateTransition(
    oldLayout: Map<string, Position>,
    newLayout: Map<string, Position>,
    duration: number
  ): AnimationDescriptor
}
```

---

## Week 2: Scene Graph + Render Abstraction

### Day 1-2: Scene Graph

```typescript
// src/renderers/scene/SceneGraph.ts
export class SceneNode {
  id: string
  entityId: string
  type: SceneNodeType

  // Transform
  position: Vec2 | Vec3
  rotation: number
  scale: number
  opacity: number

  // Visual
  shape: 'rect' | 'circle' | 'line' | 'path' | 'text' | 'image' | 'custom'
  color: string
  size: Vec2
  label?: string
  children: SceneNode[]

  // Animation state
  animations: Map<string, any>

  // Render hints
  zIndex: number
  visible: boolean
  interactive: boolean
}

export type SceneNodeType =
  | 'node' | 'edge' | 'packet' | 'message'
  | 'memory-block' | 'stack-frame' | 'heap-object'
  | 'tensor' | 'thread' | 'queue' | 'lock'
  | 'broker' | 'partition' | 'pod' | 'service'
  | 'pipeline-stage' | 'cpu-core'
  | 'label' | 'connector' | 'group'
```

### Day 3-4: Renderer Interface

```typescript
// src/renderers/Renderer.ts
export interface Renderer {
  readonly type: 'canvas' | 'svg' | 'webgl' | 'dom'

  init(container: HTMLElement): void
  render(scene: SceneGraph, animations: AnimationEngine): void
  resize(width: number, height: number): void
  clear(): void
  dispose(): void

  // Performance
  setViewport(x: number, y: number, zoom: number): void
  setDirtyRegion(region: Rect | null): void
  getFPS(): number
}

export interface SceneGraphBuilder {
  // Convert runtime Graph + Frame → SceneGraph for rendering
  build(
    graph: Graph,
    frame: Frame,
    animationState: Map<string, any>
  ): SceneGraph
}
```

### Day 5: Render Batching + Dirty Regions

```typescript
// src/renderers/batching/BatchRenderer.ts
export class BatchRenderer implements Renderer {
  private dirtyRegion: Rect | null = null
  private batchQueue: RenderBatch[]

  // Only re-render what changed
  setDirtyRegion(region: Rect): void {
    this.dirtyRegion = region
  }

  render(scene: SceneGraph): void {
    if (this.dirtyRegion) {
      this.renderRegion(this.dirtyRegion)
      this.dirtyRegion = null
    } else {
      this.renderFull(scene)
    }
  }

  // Batch similar draw calls
  private batch(scene: SceneGraph): RenderBatch[] {
    // Group by: shape type, shader, z-index
    // Minimize draw call count
  }
}
```

---

## Week 3: Canvas + SVG + WebGL Renderers

### Day 1-2: Canvas Renderer

```typescript
// src/renderers/canvas/CanvasRenderer.ts
export class CanvasRenderer implements Renderer {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement

  render(scene: SceneGraph): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    for (const node of scene.nodes) {
      this.ctx.save()
      this.ctx.globalAlpha = node.opacity
      this.ctx.translate(node.position.x, node.position.y)
      this.ctx.rotate(node.rotation)
      this.ctx.fillStyle = node.color

      switch (node.shape) {
        case 'circle':
          this.ctx.beginPath()
          this.ctx.arc(0, 0, node.size.x / 2, 0, Math.PI * 2)
          this.ctx.fill()
          break
        case 'rect':
          this.ctx.fillRect(-node.size.x / 2, -node.size.y / 2, node.size.x, node.size.y)
          break
        case 'line':
          this.ctx.beginPath()
          this.ctx.moveTo(0, 0)
          this.ctx.lineTo(node.size.x, node.size.y)
          this.ctx.stroke()
          break
      }

      if (node.label) {
        this.ctx.fillStyle = '#fff'
        this.ctx.textAlign = 'center'
        this.ctx.fillText(node.label, 0, 4)
      }

      this.ctx.restore()
    }
  }
}
```

### Day 3: SVG Renderer

```typescript
// src/renderers/svg/SVGRenderer.ts
export class SVGRenderer implements Renderer {
  private svg: SVGSVGElement
  private container: Map<string, SVGElement>

  render(scene: SceneGraph): void {
    // Diff scene with current DOM — only create/update/remove changed nodes
    const diff = this.diffScene(scene)

    for (const added of diff.added) {
      this.createElement(added)
    }
    for (const updated of diff.updated) {
      this.updateElement(updated)
    }
    for (const removed of diff.removed) {
      this.removeElement(removed)
    }
  }

  private createElement(node: SceneNode): SVGElement {
    const el = document.createElementNS('http://www.w3.org/2000/svg', node.shape)
    // Set attributes from node state
    return el
  }
}
```

### Day 4-5: WebGL Renderer

```typescript
// src/renderers/webgl/WebGLRenderer.ts
export class WebGLRenderer implements Renderer {
  private gl: WebGL2RenderingContext
  private programs: Map<string, WebGLProgram>
  private buffers: Map<string, WebGLBuffer>

  render(scene: SceneGraph): void {
    // Build vertex buffers from scene graph
    // Batch by shader program
    // Minimize draw calls

    // For large graphs:
    // - Use instanced rendering
    // - Use transform feedback for animations
    // - Use GPU for force-directed layout
  }
}
```

---

## Files Created

```
src/animation/
├── primitives.ts
├── AnimationEngine.ts
├── physics/
│   └── Spring.ts
├── composers/
│   └── GraphLayoutAnimator.ts
└── index.ts

src/renderers/
├── Renderer.ts
├── scene/
│   └── SceneGraph.ts
├── batching/
│   └── BatchRenderer.ts
├── canvas/
│   └── CanvasRenderer.ts
├── svg/
│   └── SVGRenderer.ts
├── webgl/
│   ├── WebGLRenderer.ts
│   └── shaders/
│       ├── basic.vert
│       ├── basic.frag
│       ├── node.vert
│       └── node.frag
└── index.ts
```

---

## Success Criteria

- [ ] 20+ animation primitives implemented
- [ ] AnimationEngine supports composition, sequencing, keyframes
- [ ] SceneGraph converts any Graph + Frame to renderable scene
- [ ] CanvasRenderer renders at 60fps for 500+ nodes
- [ ] SVGRenderer renders with DOM diffing
- [ ] WebGLRenderer renders at 60fps for 10K+ nodes
- [ ] Dirty region rendering reduces render time
- [ ] Zero domain-specific animation code

---

## ✅ Completed May 2026

AnimationEngine, SpringSystem, GraphLayoutAnimator (force layout), SceneGraph with sorted rendering, SceneGraphBuilder, CanvasRenderer, SVGRenderer. 71 tests across phases 4-6.

## Next Phase (Phase 5)

With animation + rendering: build the timeline + playback engine — reverse, branching, deterministic replay.

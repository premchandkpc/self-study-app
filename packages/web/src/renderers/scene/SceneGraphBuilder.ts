import { SceneNode, SceneGraph } from './SceneGraph'
import type { Graph } from '../runtime/primitives/Graph'
import type { Frame } from '../runtime/timeline/Timeline'

export class SceneGraphBuilder {
  private layoutCache: Map<string, { x: number; y: number }> = new Map()
  private spacing: number = 80
  private offsetX: number = 60
  private offsetY: number = 60

  build(graph: Graph, frame?: Frame, animationState?: Map<string, unknown>): SceneGraph {
    const sg = new SceneGraph()

    const entities = graph.getAllEntities()
    const edges = graph.getAllEdges()

    this._layoutNodes(entities, edges)

    for (const entity of entities) {
      const pos = this.layoutCache.get(entity.id) ?? { x: 0, y: 0 }
      const node = new SceneNode(`node_${entity.id}`, entity.id, (entity.get('kind') as any) ?? 'node')

      node.position = { x: pos.x, y: pos.y }
      node.color = this._colorForType(entity.type)
      node.shape = this._shapeForKind(entity.kind)
      node.size = { x: 50, y: 50 }
      node.label = entity.id.length > 12 ? entity.id.slice(0, 10) + '…' : entity.id

      const highlight = entity.get('highlight') as string
      if (highlight === 'comparing') node.color = '#f97316'
      else if (highlight === 'sorted') node.color = '#22c55e'
      else if (highlight === 'active') node.color = '#a78bfa'

      if (entity.get('sorted')) {
        node.borderColor = '#22c55e'
        node.borderWidth = 2
      }

      const val = entity.get('value')
      if (val !== undefined) {
        const valNode = new SceneNode(`val_${entity.id}`, entity.id, 'label')
        valNode.position = { x: pos.x, y: pos.y + 35 }
        valNode.shape = 'text'
        valNode.size = { x: 30, y: 16 }
        valNode.label = String(val)
        valNode.zIndex = 10
        valNode.interactive = false
        sg.addNode(valNode)
      }

      if (animationState?.has(entity.id)) {
        const state = animationState.get(entity.id) as Record<string, unknown>
        if (state.color) node.color = state.color as string
        if (state.scale) node.scale = state.scale as number
        if (state.opacity !== undefined) node.opacity = state.opacity as number
      }

      sg.addNode(node)
    }

    for (const edge of edges) {
      sg.addEdge(`edge_${edge.id}`, `node_${edge.from}`, `node_${edge.to}`, edge.label)
    }

    return sg
  }

  buildFromTimeline(graph: Graph, frame: Frame, animationState?: Map<string, unknown>): SceneGraph {
    const sg = this.build(graph, frame, animationState)

    for (const event of frame.events) {
      if (event.entityId) {
        const sceneNode = sg.getNode(`node_${event.entityId}`)
        if (sceneNode) {
          if (event.type === 'PROPERTY_CHANGED') {
            if (event.property === 'highlight' && event.newValue === 'comparing') {
              sceneNode.color = '#f97316'
            }
            if (event.property === 'sorted' && event.newValue === true) {
              sceneNode.color = '#22c55e'
              sceneNode.borderColor = '#22c55e'
              sceneNode.borderWidth = 2
            }
          }
          if (event.concept) {
            sceneNode.animations.set('concept', event.concept)
          }
        }
      }
    }

    return sg
  }

  private _layoutNodes(entities: { id: string; kind: string }[], edges: { from: string; to: string }[]): void {
    if (this.layoutCache.size > 0) return

    const n = entities.length
    if (n === 0) return

    const cols = Math.ceil(Math.sqrt(n))
    let i = 0
    for (const entity of entities) {
      const col = i % cols
      const row = Math.floor(i / cols)
      this.layoutCache.set(entity.id, {
        x: this.offsetX + col * this.spacing,
        y: this.offsetY + row * this.spacing,
      })
      i++
    }

    const adjacency = new Map<string, Set<string>>()
    for (const edge of edges) {
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set())
      if (!adjacency.has(edge.to)) adjacency.set(edge.to, new Set())
      adjacency.get(edge.from)!.add(edge.to)
      adjacency.get(edge.to)!.add(edge.from)
    }

    let pass = 0
    while (pass < 10) {
      let moved = false
      for (const [id, neighbors] of adjacency) {
        const pos = this.layoutCache.get(id)
        if (!pos) continue
        let avgX = 0, avgY = 0, count = 0
        for (const nid of neighbors) {
          const np = this.layoutCache.get(nid)
          if (np) { avgX += np.x; avgY += np.y; count++ }
        }
        if (count > 0) {
          avgX /= count; avgY /= count
          const dx = avgX - pos.x, dy = avgY - pos.y
          pos.x += dx * 0.3
          pos.y += dy * 0.3
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) moved = true
        }
      }
      if (!moved) break
      pass++
    }
  }

  private _colorForType(type: string): string {
    const colorMap: Record<string, string> = {
      'array-element': '#3b82f6',
      'broker': '#8b5cf6',
      'partition': '#ec4899',
      'producer': '#f59e0b',
      'consumer': '#22c55e',
      'thread': '#14b8a6',
      'lock': '#ef4444',
      'memory-block': '#f97316',
      'packet': '#06b6d4',
      'pod': '#6366f1',
      'service': '#84cc16',
      'tensor': '#a855f7',
    }
    return colorMap[type] ?? '#64748b'
  }

  private _shapeForKind(kind: string): SceneNode['shape'] {
    return kind === 'edge' || kind === 'packet' || kind === 'message' ? 'circle' : 'rect'
  }

  setLayout(positions: Map<string, { x: number; y: number }>): void {
    this.layoutCache = new Map(positions)
  }

  resetLayout(): void {
    this.layoutCache.clear()
  }
}

export type SceneNodeType =
  | 'node' | 'edge' | 'packet' | 'message'
  | 'memory-block' | 'stack-frame' | 'heap-object'
  | 'tensor' | 'thread' | 'queue' | 'lock'
  | 'broker' | 'partition' | 'pod' | 'service'
  | 'pipeline-stage' | 'cpu-core'
  | 'label' | 'connector' | 'group'

export interface Vec2 {
  x: number
  y: number
}

export class SceneNode {
  id: string
  entityId: string
  type: SceneNodeType
  position: Vec2
  rotation: number = 0
  scale: number = 1
  opacity: number = 1
  shape: 'rect' | 'circle' | 'line' | 'path' | 'text' | 'image' | 'custom' = 'rect'
  color: string = '#3b82f6'
  size: Vec2 = { x: 40, y: 40 }
  label?: string
  children: SceneNode[] = []
  animations: Map<string, unknown> = new Map()
  zIndex: number = 0
  visible: boolean = true
  interactive: boolean = true
  borderColor?: string
  borderWidth: number = 0
  borderRadius: number = 0
  icon?: string

  constructor(id: string, entityId: string, type: SceneNodeType) {
    this.id = id
    this.entityId = entityId
    this.type = type
    this.position = { x: 0, y: 0 }
  }

  addChild(child: SceneNode): void {
    this.children.push(child)
  }

  removeChild(id: string): void {
    const idx = this.children.findIndex(c => c.id === id)
    if (idx >= 0) this.children.splice(idx, 1)
  }

  clone(): SceneNode {
    const n = new SceneNode(this.id, this.entityId, this.type)
    n.position = { ...this.position }
    n.rotation = this.rotation
    n.scale = this.scale
    n.opacity = this.opacity
    n.shape = this.shape
    n.color = this.color
    n.size = { ...this.size }
    n.label = this.label
    n.children = this.children.map(c => c.clone())
    n.animations = new Map(this.animations)
    n.zIndex = this.zIndex
    n.visible = this.visible
    n.interactive = this.interactive
    n.borderColor = this.borderColor
    n.borderWidth = this.borderWidth
    n.borderRadius = this.borderRadius
    n.icon = this.icon
    return n
  }
}

export class SceneGraph {
  nodes: Map<string, SceneNode> = new Map()
  edges: Map<string, { id: string; from: string; to: string; label?: string; color?: string; width?: number }> = new Map()
  width: number = 800
  height: number = 600
  background: string = '#0f172a'

  addNode(node: SceneNode): void {
    this.nodes.set(node.id, node)
  }

  removeNode(id: string): void {
    this.nodes.delete(id)
    for (const [eid, edge] of this.edges) {
      if (edge.from === id || edge.to === id) this.edges.delete(eid)
    }
  }

  addEdge(id: string, from: string, to: string, label?: string): void {
    this.edges.set(id, { id, from, to, label })
  }

  removeEdge(id: string): void {
    this.edges.delete(id)
  }

  getNode(id: string): SceneNode | undefined {
    return this.nodes.get(id)
  }

  getAllNodes(): SceneNode[] {
    return Array.from(this.nodes.values())
  }

  getAllEdges(): { id: string; from: string; to: string; label?: string; color?: string; width?: number }[] {
    return Array.from(this.edges.values())
  }

  sortedNodes(): SceneNode[] {
    return this.getAllNodes().sort((a, b) => a.zIndex - b.zIndex)
  }

  clone(): SceneGraph {
    const sg = new SceneGraph()
    sg.width = this.width
    sg.height = this.height
    sg.background = this.background
    for (const [id, node] of this.nodes) sg.nodes.set(id, node.clone())
    for (const [id, edge] of this.edges) sg.edges.set(id, { ...edge })
    return sg
  }

  clear(): void {
    this.nodes.clear()
    this.edges.clear()
  }
}

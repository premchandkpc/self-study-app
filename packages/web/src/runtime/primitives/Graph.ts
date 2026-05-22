import { Entity, type EntitySchema } from './Entity'

export interface Edge {
  id: string
  from: string
  to: string
  label: string
  properties: Map<string, unknown>
}

export interface EdgeSchema {
  id: string
  from: string
  to: string
  label: string
  properties: Record<string, unknown>
}

export interface EdgeDelta {
  type: 'added' | 'removed' | 'modified'
  edge: EdgeSchema
}

export interface GraphDiff {
  added: Entity[]
  removed: string[]
  modified: { id: string; before: Record<string, unknown>; after: Record<string, unknown> }[]
  edgeChanges: EdgeDelta[]
}

export interface GraphSchema {
  nodes: EntitySchema[]
  edges: EdgeSchema[]
  metadata: { version: number; createdAt: number }
}

export class Graph {
  private nodes: Map<string, Entity> = new Map()
  private edges: Map<string, Edge> = new Map()
  private adjacency: Map<string, Set<string>> = new Map()
  private version: number = 0
  private readonly createdAt: number = Date.now()

  addEntity(entity: Entity): void {
    this.nodes.set(entity.id, entity)
    if (!this.adjacency.has(entity.id)) {
      this.adjacency.set(entity.id, new Set())
    }
    this.version++
  }

  removeEntity(id: string): void {
    this.nodes.delete(id)
    this.adjacency.delete(id)
    for (const [edgeId, edge] of this.edges) {
      if (edge.from === id || edge.to === id) {
        this.edges.delete(edgeId)
      }
    }
    for (const [, neighbors] of this.adjacency) {
      neighbors.delete(id)
    }
    this.version++
  }

  getEntity(id: string): Entity | undefined {
    return this.nodes.get(id)
  }

  hasEntity(id: string): boolean {
    return this.nodes.has(id)
  }

  getAllEntities(): Entity[] {
    return Array.from(this.nodes.values())
  }

  entityCount(): number {
    return this.nodes.size
  }

  connect(from: string, to: string, label: string = ''): Edge {
    if (!this.nodes.has(from) || !this.nodes.has(to)) {
      throw new Error(`Cannot connect: node ${!this.nodes.has(from) ? from : to} not found`)
    }
    const edgeId = `${from}->${to}[${label}]`
    const edge: Edge = {
      id: edgeId,
      from,
      to,
      label,
      properties: new Map(),
    }
    this.edges.set(edgeId, edge)
    this.adjacency.get(from)!.add(to)
    this.adjacency.get(to)!.add(from)
    this.version++
    return edge
  }

  disconnect(from: string, to: string, label?: string): void {
    const edgeId = `${from}->${to}[${label ?? ''}]`
    this.edges.delete(edgeId)
    this.adjacency.get(from)?.delete(to)
    this.adjacency.get(to)?.delete(from)
    this.version++
  }

  getEdge(id: string): Edge | undefined {
    return this.edges.get(id)
  }

  getAllEdges(): Edge[] {
    return Array.from(this.edges.values())
  }

  edgeCount(): number {
    return this.edges.size
  }

  getNeighbors(id: string): Entity[] {
    const neighborIds = this.adjacency.get(id)
    if (!neighborIds) return []
    return Array.from(neighborIds)
      .map(nid => this.nodes.get(nid))
      .filter((e): e is Entity => e !== undefined)
  }

  getAdjacentEntityIds(id: string): string[] {
    return Array.from(this.adjacency.get(id) ?? [])
  }

  subgraph(ids: Set<string>): Graph {
    const g = new Graph()
    for (const id of ids) {
      const entity = this.nodes.get(id)
      if (entity) g.addEntity(entity.clone())
    }
    for (const edge of this.edges.values()) {
      if (ids.has(edge.from) && ids.has(edge.to)) {
        const e = g.connect(edge.from, edge.to, edge.label)
        for (const [k, v] of edge.properties) {
          e.properties.set(k, v)
        }
      }
    }
    return g
  }

  diff(other: Graph): GraphDiff {
    const added: Entity[] = []
    const removed: string[] = []
    const modified: { id: string; before: Record<string, unknown>; after: Record<string, unknown> }[] = []
    const edgeChanges: EdgeDelta[] = []

    for (const entity of other.getAllEntities()) {
      const existing = this.nodes.get(entity.id)
      if (!existing) {
        added.push(entity)
      } else {
        const beforeProps: Record<string, unknown> = {}
        const afterProps: Record<string, unknown> = {}
        let changed = false
        for (const [k, v] of existing.properties) {
          const newVal = entity.properties.get(k)
          if (newVal !== v) {
            beforeProps[k] = v
            afterProps[k] = newVal
            changed = true
          }
        }
        for (const [k, v] of entity.properties) {
          if (!existing.properties.has(k)) {
            beforeProps[k] = undefined
            afterProps[k] = v
            changed = true
          }
        }
        if (changed) {
          modified.push({ id: entity.id, before: beforeProps, after: afterProps })
        }
      }
    }

    for (const id of this.nodes.keys()) {
      if (!other.hasEntity(id)) {
        removed.push(id)
      }
    }

    const otherEdges = new Map<string, Edge>()
    for (const edge of other.getAllEdges()) {
      otherEdges.set(edge.id, edge)
    }

    for (const edge of this.edges.values()) {
      if (!otherEdges.has(edge.id)) {
        edgeChanges.push({
          type: 'removed',
          edge: this._edgeToSchema(edge),
        })
      }
    }

    for (const edge of other.getAllEdges()) {
      if (!this.edges.has(edge.id)) {
        edgeChanges.push({
          type: 'added',
          edge: this._edgeToSchema(edge),
        })
      }
    }

    return { added, removed, modified, edgeChanges }
  }

  clone(): Graph {
    const g = new Graph()
    for (const entity of this.nodes.values()) {
      g.addEntity(entity.clone())
    }
    for (const edge of this.edges.values()) {
      const e = g.connect(edge.from, edge.to, edge.label)
      for (const [k, v] of edge.properties) {
        e.properties.set(k, this._deepClone(v))
      }
    }
    return g
  }

  toJSON(): GraphSchema {
    return {
      nodes: Array.from(this.nodes.values()).map(n => n.toJSON()),
      edges: Array.from(this.edges.values()).map(e => this._edgeToSchema(e)),
      metadata: { version: this.version, createdAt: this.createdAt },
    }
  }

  static fromJSON(schema: GraphSchema): Graph {
    const g = new Graph()
    for (const nodeSchema of schema.nodes) {
      g.addEntity(Entity.fromJSON(nodeSchema))
    }
    for (const edgeSchema of schema.edges) {
      const e = g.connect(edgeSchema.from, edgeSchema.to, edgeSchema.label)
      for (const [k, v] of Object.entries(edgeSchema.properties)) {
        e.properties.set(k, v)
      }
    }
    return g
  }

  reset(): void {
    this.nodes.clear()
    this.edges.clear()
    this.adjacency.clear()
    this.version = 0
  }

  getVersion(): number {
    return this.version
  }

  private _edgeToSchema(edge: Edge): EdgeSchema {
    const props: Record<string, unknown> = {}
    for (const [k, v] of edge.properties) {
      props[k] = v
    }
    return {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: edge.label,
      properties: props,
    }
  }

  private _deepClone<T>(val: T): T {
    if (val === null || typeof val !== 'object') return val
    if (Array.isArray(val)) return val.map(x => this._deepClone(x)) as unknown as T
    return JSON.parse(JSON.stringify(val))
  }
}

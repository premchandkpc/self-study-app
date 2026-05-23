import { R2Object } from './R2Object'

let _connId = 0
function nextConnId(from: string, to: string): string { return `c_${from}_${to}_${++_connId}` }

export type ConnectionStyle = 'solid' | 'dashed' | 'dotted' | 'curve' | 'bidirectional'

export class Connection {
  id: string
  fromId: string
  toId: string
  label: string = ''
  style: ConnectionStyle = 'solid'
  color: string = '#64748b'
  width: number = 1
  curvature: number = 0
  metadata: Record<string, unknown> = {}

  constructor(fromId: string, toId: string, label?: string) {
    this.id = nextConnId(fromId, toId)
    this.fromId = fromId
    this.toId = toId
    if (label) this.label = label
  }

  curve(v: number): this { this.curvature = v; return this }
  dashed(): this { this.style = 'dashed'; return this }
  dotted(): this { this.style = 'dotted'; return this }
  bidirectional(): this { this.style = 'bidirectional'; return this }
  color_(c: string): this { this.color = c; return this }
  meta(k: string, v: unknown): this { this.metadata[k] = v; return this }
}

export class Universe {
  objects: Map<string, R2Object> = new Map()
  connections: Map<string, Connection> = new Map()
  snapshots: { label: string; objIds: string[]; connIds: string[] }[] = []
  _snapshotIndex = -1

  add<T extends R2Object>(obj: T): T {
    this.objects.set(obj.id, obj)
    return obj
  }

  remove(id: string): void {
    this.objects.delete(id)
    this.connections.forEach((c, cid) => {
      if (c.fromId === id || c.toId === id) this.connections.delete(cid)
    })
  }

  connect(from: string | R2Object, to: string | R2Object, label?: string): Connection {
    const fromId = typeof from === 'string' ? from : from.id
    const toId = typeof to === 'string' ? to : to.id
    const c = new Connection(fromId, toId, label)
    this.connections.set(c.id, c)
    const f = this.objects.get(fromId)
    const t = this.objects.get(toId)
    if (f && !f.connections.includes(c.id)) f.connections.push(c.id)
    if (t && !t.connections.includes(c.id)) t.connections.push(c.id)
    return c
  }

  removeConnection(id: string): void {
    const c = this.connections.get(id)
    if (!c) return
    const f = this.objects.get(c.fromId)
    const t = this.objects.get(c.toId)
    if (f) f.connections = f.connections.filter(cid => cid !== id)
    if (t) t.connections = t.connections.filter(cid => cid !== id)
    this.connections.delete(id)
  }

  connectAll(fromIds: (string | R2Object)[], toIds: (string | R2Object)[], label?: string, style?: ConnectionStyle): Connection[] {
    return fromIds.flatMap(f =>
      toIds.map(t => {
        const c = this.connect(f, t, label)
        if (style) c.style = style
        return c
      })
    )
  }

  findByType(type: string): R2Object[] {
    return Array.from(this.objects.values()).filter(o => o.type === type)
  }

  findByCategory(cat: string): R2Object[] {
    return Array.from(this.objects.values()).filter(o => o.category === cat)
  }

  snapshot(label: string): void {
    this.snapshots.push({ label, objIds: Array.from(this.objects.keys()), connIds: Array.from(this.connections.keys()) })
    this._snapshotIndex = this.snapshots.length - 1
  }

  clear(): void {
    this.objects.clear()
    this.connections.clear()
    this.snapshots = []
  }

  get size(): number { return this.objects.size }
  get connectionCount(): number { return this.connections.size }

  toJSON() {
    return {
      objects: Array.from(this.objects.values()).map(o => o.toJSON()),
      connections: Array.from(this.connections.values()).map(c => ({ ...c })),
    }
  }
}

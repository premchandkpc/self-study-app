export type EntityKind =
  | 'node' | 'edge' | 'packet' | 'message'
  | 'thread' | 'process' | 'pod' | 'service'
  | 'broker' | 'partition' | 'consumer' | 'producer'
  | 'memory-block' | 'stack-frame' | 'heap-object'
  | 'tensor' | 'layer' | 'neuron'
  | 'lock' | 'queue' | 'semaphore'
  | 'pipeline-stage' | 'cpu-core'
  | 'database-page' | 'index' | 'transaction'
  | 'actor' | 'fiber' | 'coroutine'
  | 'custom'

export interface EntityMetadata {
  createdAt: number
  updatedAt: number
  version: number
  tags: string[]
}

export interface EntitySchema {
  id: string
  kind: EntityKind
  type: string
  labels: Record<string, string>
  properties: Record<string, unknown>
  metadata: EntityMetadata
}

export class Entity {
  readonly id: string
  readonly kind: EntityKind
  readonly type: string
  labels: Map<string, string>
  properties: Map<string, unknown>
  metadata: EntityMetadata

  constructor(id: string, kind: EntityKind, type: string) {
    this.id = id
    this.kind = kind
    this.type = type
    this.labels = new Map()
    this.properties = new Map()
    this.metadata = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      tags: [],
    }
  }

  set(key: string, val: unknown): void {
    this.properties.set(key, val)
    this.metadata.updatedAt = Date.now()
    this.metadata.version++
  }

  get(key: string): unknown {
    return this.properties.get(key)
  }

  has(key: string): boolean {
    return this.properties.has(key)
  }

  delete(key: string): boolean {
    const result = this.properties.delete(key)
    if (result) {
      this.metadata.updatedAt = Date.now()
      this.metadata.version++
    }
    return result
  }

  addLabel(key: string, val: string): void {
    this.labels.set(key, val)
    this.metadata.updatedAt = Date.now()
  }

  removeLabel(key: string): boolean {
    return this.labels.delete(key)
  }

  addTag(tag: string): void {
    if (!this.metadata.tags.includes(tag)) {
      this.metadata.tags.push(tag)
    }
  }

  clone(): Entity {
    const e = new Entity(this.id, this.kind, this.type)
    for (const [k, v] of this.properties) {
      e.properties.set(k, this._deepClone(v))
    }
    for (const [k, v] of this.labels) {
      e.labels.set(k, v)
    }
    e.metadata = {
      ...this.metadata,
      createdAt: this.metadata.createdAt,
    }
    return e
  }

  toJSON(): EntitySchema {
    const props: Record<string, unknown> = {}
    for (const [k, v] of this.properties) {
      props[k] = v
    }
    const labels: Record<string, string> = {}
    for (const [k, v] of this.labels) {
      labels[k] = v
    }
    return {
      id: this.id,
      kind: this.kind,
      type: this.type,
      labels,
      properties: props,
      metadata: { ...this.metadata },
    }
  }

  static fromJSON(schema: EntitySchema): Entity {
    const e = new Entity(schema.id, schema.kind, schema.type)
    for (const [k, v] of Object.entries(schema.properties)) {
      e.properties.set(k, v)
    }
    for (const [k, v] of Object.entries(schema.labels)) {
      e.labels.set(k, v)
    }
    e.metadata = { ...schema.metadata }
    return e
  }

  private _deepClone<T>(val: T): T {
    if (val === null || typeof val !== 'object') return val
    if (Array.isArray(val)) return val.map(x => this._deepClone(x)) as unknown as T
    return JSON.parse(JSON.stringify(val))
  }
}

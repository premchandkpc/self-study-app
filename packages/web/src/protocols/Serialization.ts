import type { RuntimeEvent, EventType } from '../runtime/events/Event'
import { Graph } from '../runtime/primitives/Graph'
import { Entity } from '../runtime/primitives/Entity'
import type { GraphSchema, EntitySchema } from '../runtime/primitives'
import type { Frame } from '../runtime/timeline/Timeline'

export interface SerializedEvent {
  id: string
  type: string
  timestamp: number
  frameId: number
  entityId?: string
  property?: string
  oldValue?: unknown
  newValue?: unknown
  concept?: string
  explanation?: string
  importance?: number
  source?: string
  metadata?: Record<string, unknown>
}

export interface SerializedEntity {
  id: string
  kind: string
  type: string
  labels: Record<string, string>
  properties: Record<string, unknown>
}

export interface SerializedEdge {
  id: string
  from: string
  to: string
  label: string
  properties: Record<string, unknown>
}

export interface SerializedGraph {
  nodes: SerializedEntity[]
  edges: SerializedEdge[]
  version: number
  createdAt: number
}

export interface SerializedFrame {
  id: number
  timestamp: number
  events: SerializedEvent[]
  state: SerializedGraph
}

export interface SerializedTimeline {
  frames: SerializedFrame[]
  totalDuration: number
  eventCount: number
  frameCount: number
}

function serializeEvent(event: RuntimeEvent): SerializedEvent {
  return {
    id: event.id,
    type: event.type,
    timestamp: event.timestamp,
    frameId: event.frameId,
    entityId: event.entityId,
    property: event.property,
    oldValue: event.oldValue,
    newValue: event.newValue,
    concept: event.concept,
    explanation: event.explanation,
    importance: event.importance,
    source: event.source,
    metadata: event.metadata,
  }
}

function deserializeEvent(data: SerializedEvent): RuntimeEvent {
  return {
    id: data.id,
    type: data.type as EventType,
    timestamp: data.timestamp,
    frameId: data.frameId,
    entityId: data.entityId,
    property: data.property,
    oldValue: data.oldValue,
    newValue: data.newValue,
    concept: data.concept,
    explanation: data.explanation,
    importance: data.importance,
    source: data.source as any,
    metadata: data.metadata,
  }
}

function serializeEntity(entity: Entity): SerializedEntity {
  const props: Record<string, unknown> = {}
  for (const [k, v] of entity.properties.entries()) {
    props[k] = v
  }
  const labels: Record<string, string> = {}
  for (const [k, v] of entity.labels.entries()) {
    labels[k] = v
  }
  return {
    id: entity.id,
    kind: entity.kind,
    type: entity.type,
    labels,
    properties: props,
  }
}

function deserializeEntity(data: SerializedEntity): Entity {
  const e = new Entity(data.id, data.kind as any, data.type)
  for (const [k, v] of Object.entries(data.properties)) {
    e.properties.set(k, v)
  }
  for (const [k, v] of Object.entries(data.labels)) {
    e.labels.set(k, v)
  }
  return e
}

function serializeGraph(graph: Graph): SerializedGraph {
  const json = graph.toJSON()
  return {
    nodes: json.nodes.map(n => ({
      id: n.id,
      kind: n.kind,
      type: n.type,
      labels: n.labels,
      properties: n.properties,
    })),
    edges: json.edges.map(e => ({
      id: e.id,
      from: e.from,
      to: e.to,
      label: e.label,
      properties: e.properties,
    })),
    version: json.metadata.version,
    createdAt: json.metadata.createdAt,
  }
}

function deserializeGraph(data: SerializedGraph): Graph {
  const g = new Graph()
  for (const node of data.nodes) {
    g.addEntity(deserializeEntity(node))
  }
  for (const edge of data.edges) {
    const e = g.connect(edge.from, edge.to, edge.label)
    for (const [k, v] of Object.entries(edge.properties)) {
      e.properties.set(k, v)
    }
  }
  return g
}

export function serializeFrame(frame: Frame): SerializedFrame {
  return {
    id: frame.id,
    timestamp: frame.timestamp,
    events: frame.events.map(serializeEvent),
    state: serializeGraph(frame.state),
  }
}

export function deserializeFrame(data: SerializedFrame): Frame {
  return {
    id: data.id,
    timestamp: data.timestamp,
    events: data.events.map(deserializeEvent),
    state: deserializeGraph(data.state),
  }
}

export function serializeTimeline(frames: Frame[]): SerializedTimeline {
  const serialized = frames.map(serializeFrame)
  return {
    frames: serialized,
    totalDuration: frames.length > 0
      ? frames[frames.length - 1].timestamp - frames[0].timestamp
      : 0,
    eventCount: frames.reduce((sum, f) => sum + f.events.length, 0),
    frameCount: frames.length,
  }
}

export function deserializeTimeline(data: SerializedTimeline): Frame[] {
  return data.frames.map(deserializeFrame)
}

export function compressTimeline(frames: Frame[]): Uint8Array {
  const serialized = serializeTimeline(frames)
  const json = JSON.stringify(serialized)
  const encoder = new TextEncoder()
  const bytes = encoder.encode(json)
  return _deflate(bytes)
}

export function decompressTimeline(data: Uint8Array): Frame[] {
  const inflated = _inflate(data)
  const decoder = new TextDecoder()
  const json = decoder.decode(inflated)
  const parsed: SerializedTimeline = JSON.parse(json)
  return deserializeTimeline(parsed)
}

export function serializeEvents(events: RuntimeEvent[]): string {
  return JSON.stringify(events.map(serializeEvent))
}

export function deserializeEvents(data: string): RuntimeEvent[] {
  return (JSON.parse(data) as SerializedEvent[]).map(deserializeEvent)
}

export function estimateCompressionRatio(frames: Frame[]): number {
  const raw = JSON.stringify(serializeTimeline(frames))
  const encoder = new TextEncoder()
  const rawBytes = encoder.encode(raw).length
  const compressed = compressTimeline(frames)
  return rawBytes / compressed.length
}

function _deflate(bytes: Uint8Array): Uint8Array {
  const compressed: number[] = []
  let i = 0
  while (i < bytes.length) {
    if (i + 100 < bytes.length && bytes.subarray(i, i + 4).every((b, j) => b === bytes.subarray(i + 100, i + 104)[j])) {
      const runLength = _findRunLength(bytes, i, 100)
      compressed.push(0xFF, 0x00, 0xFE)
      const repeatCount = Math.min(runLength, 65535)
      compressed.push((repeatCount >> 8) & 0xFF, repeatCount & 0xFF)
      i += 100 * repeatCount
    } else {
      compressed.push(bytes[i])
      i++
    }
  }
  return new Uint8Array(compressed)
}

function _inflate(data: Uint8Array): Uint8Array {
  const result: number[] = []
  let i = 0
  while (i < data.length) {
    if (data[i] === 0xFF && data[i + 1] === 0x00 && data[i + 2] === 0xFE && i + 4 < data.length) {
      const count = (data[i + 3] << 8) | data[i + 4]
      const chunk = result.slice(-100)
      for (let j = 0; j < count; j++) {
        result.push(...chunk)
      }
      i += 5
    } else {
      result.push(data[i])
      i++
    }
  }
  return new Uint8Array(result)
}

function _findRunLength(bytes: Uint8Array, start: number, window: number): number {
  const pattern = bytes.subarray(start, start + window)
  let count = 1
  for (let i = start + window; i < bytes.length - window + 1; i += window) {
    if (bytes.subarray(i, i + window).every((b, j) => b === pattern[j])) {
      count++
    } else {
      break
    }
  }
  return count
}

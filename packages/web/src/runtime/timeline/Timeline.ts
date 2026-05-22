import type { RuntimeEvent } from '../events/Event'
import { Graph } from '../primitives/Graph'
import type { GraphSchema } from '../primitives/Graph'
import { Entity } from '../primitives/Entity'

export interface Frame {
  id: number
  timestamp: number
  events: RuntimeEvent[]
  state: Graph
}

export interface FrameSchema {
  id: number
  timestamp: number
  events: RuntimeEvent[]
  state: GraphSchema
}

export interface TimelineSchema {
  frames: FrameSchema[]
  totalDuration: number
  eventCount: number
  frameCount: number
}

export interface TimelineOptions {
  groupByFrameId?: boolean
  skipEmptyFrames?: boolean
  maxFrames?: number
}

export class Timeline {
  private frames: Frame[] = []
  private eventsBuffer: RuntimeEvent[] = []
  private currentFrameId: number = 0
  private options: TimelineOptions

  constructor(options?: TimelineOptions) {
    this.options = {
      groupByFrameId: true,
      skipEmptyFrames: false,
      maxFrames: 10000,
      ...options,
    }
  }

  addEvent(event: RuntimeEvent): void {
    this.eventsBuffer.push(event)
  }

  addEvents(events: RuntimeEvent[]): void {
    this.eventsBuffer.push(...events)
  }

  buildFrames(): void {
    if (this.options.groupByFrameId) {
      this._buildByFrameId()
    } else {
      this._buildChronological()
    }
  }

  private _buildByFrameId(): void {
    const groups = new Map<number, RuntimeEvent[]>()
    for (const event of this.eventsBuffer) {
      const fid = event.frameId
      if (!groups.has(fid)) groups.set(fid, [])
      groups.get(fid)!.push(event)
    }

    const sortedFrameIds = Array.from(groups.keys()).sort((a, b) => a - b)
    this.frames = []
    const state = new Graph()

    for (const frameId of sortedFrameIds) {
      const events = groups.get(frameId)!

      for (const event of events) {
        this._applyEventToState(state, event)
      }

      this.frames.push({
        id: frameId,
        timestamp: Date.now(),
        events,
        state: state.clone(),
      })

      if (this.frames.length >= (this.options.maxFrames ?? Infinity)) break
    }
  }

  private _buildChronological(): void {
    const sorted = [...this.eventsBuffer].sort((a, b) => a.timestamp - b.timestamp)
    this.frames = []
    const state = new Graph()
    let frameCounter = 0

    for (const event of sorted) {
      this._applyEventToState(state, event)
      this.frames.push({
        id: ++frameCounter,
        timestamp: event.timestamp,
        events: [event],
        state: state.clone(),
      })
      if (this.frames.length >= (this.options.maxFrames ?? Infinity)) break
    }
  }

  private _applyEventToState(state: Graph, event: RuntimeEvent): void {
    switch (event.type) {
      case 'NODE_ADDED':
      case 'ENTITY_CREATED': {
        if (event.entityId) {
          const existing = state.getEntity(event.entityId)
          if (!existing) {
            const entity = new Entity(
              event.entityId,
              'custom',
              (event.metadata?.entityType as string) ?? 'unknown',
            )
            if (event.property && event.newValue !== undefined) {
              entity.set(event.property, event.newValue)
            } else if (event.newValue !== undefined) {
              entity.set('value', event.newValue)
            }
            if (event.metadata?.index !== undefined) entity.set('index', event.metadata.index)
            if (event.metadata?.highlight !== undefined) entity.set('highlight', event.metadata.highlight)
            state.addEntity(entity)
          }
        }
        break
      }
      case 'ENTITY_DELETED':
      case 'NODE_REMOVED': {
        if (event.entityId) state.removeEntity(event.entityId)
        break
      }
      case 'LABEL_ADDED': {
        if (event.entityId && event.property) {
          const entity = state.getEntity(event.entityId)
          if (entity) {
            entity.set(event.property, event.newValue)
          }
        }
        break
      }
      case 'PROPERTY_CHANGED': {
        if (event.entityId && event.property) {
          const entity = state.getEntity(event.entityId)
          if (entity) {
            entity.set(event.property, event.newValue)
          }
        }
        break
      }
      case 'EDGE_ADDED': {
        if (event.entityId && event.newValue) {
          const edgeInfo = event.newValue as { from: string; to: string; label?: string }
          if (state.hasEntity(edgeInfo.from) && state.hasEntity(edgeInfo.to)) {
            state.connect(edgeInfo.from, edgeInfo.to, edgeInfo.label)
          }
        }
        break
      }
      case 'EDGE_REMOVED': {
        if (event.entityId && event.newValue) {
          const edgeInfo = event.newValue as { from: string; to: string }
          state.disconnect(edgeInfo.from, edgeInfo.to)
        }
        break
      }
    }
  }

  getFrame(index: number): Frame | null {
    if (index < 0 || index >= this.frames.length) return null
    return this.frames[index]
  }

  firstFrame(): Frame | null {
    return this.frames[0] ?? null
  }

  lastFrame(): Frame | null {
    return this.frames[this.frames.length - 1] ?? null
  }

  frameCount(): number {
    return this.frames.length
  }

  seek(frameId: number): Frame | null {
    return this.frames.find(f => f.id === frameId) ?? null
  }

  indexOf(frameId: number): number {
    return this.frames.findIndex(f => f.id === frameId)
  }

  getFrames(): Frame[] {
    return [...this.frames]
  }

  clear(): void {
    this.frames = []
    this.eventsBuffer = []
    this.currentFrameId = 0
  }

  export(): TimelineSchema {
    return {
      frames: this.frames.map(f => ({
        id: f.id,
        timestamp: f.timestamp,
        events: f.events,
        state: f.state.toJSON(),
      })),
      totalDuration: this.frames.length > 0
        ? this.frames[this.frames.length - 1].timestamp - this.frames[0].timestamp
        : 0,
      eventCount: this.eventsBuffer.length,
      frameCount: this.frames.length,
    }
  }

  static import(schema: TimelineSchema): Timeline {
    const timeline = new Timeline()
    for (const frameSchema of schema.frames) {
      const state = Graph.fromJSON(frameSchema.state)
      timeline.frames.push({
        id: frameSchema.id,
        timestamp: frameSchema.timestamp,
        events: frameSchema.events,
        state,
      })
    }
    return timeline
  }
}

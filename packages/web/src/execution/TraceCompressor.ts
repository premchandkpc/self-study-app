import type { ExecutionTrace, ExecutionFrame, VariableState } from './Frame'
import type { RuntimeEvent } from '../runtime/events/Event'

export interface DeltaFrame {
  index: number
  delta: Record<string, { old: unknown; new: unknown }>
}

export interface DeltaEncodedTrace {
  id: string
  name: string
  baseState: Record<string, unknown>
  frames: DeltaFrame[]
  eventCount: number
  duration: number
}

export interface CompressedEvent {
  type: string
  count: number
  template: Partial<RuntimeEvent>
  variations?: { frameDelta: number; entityId?: string; property?: string; oldValue?: unknown; newValue?: unknown }[]
}

export class TraceCompressor {
  deltaEncode(trace: ExecutionTrace): DeltaEncodedTrace {
    const baseState = this._snapshotState(trace.frames[0])
    const frames: DeltaFrame[] = []
    let prevState = baseState

    for (let i = 1; i < trace.frames.length; i++) {
      const current = this._snapshotState(trace.frames[i])
      const delta: Record<string, { old: unknown; new: unknown }> = {}

      for (const [key, val] of Object.entries(current)) {
        if (JSON.stringify(prevState[key]) !== JSON.stringify(val)) {
          delta[key] = { old: prevState[key], new: val }
        }
      }

      if (Object.keys(delta).length > 0) {
        frames.push({ index: i, delta })
      }
      prevState = current
    }

    return {
      id: trace.id,
      name: trace.name,
      baseState,
      frames,
      eventCount: trace.events.length,
      duration: trace.duration,
    }
  }

  reconstructFromDelta(encoded: DeltaEncodedTrace): { variables: Record<string, unknown>; frames: Record<string, unknown>[] } {
    const state = { ...encoded.baseState }
    const snapshots: Record<string, unknown>[] = [{ ...state }]

    for (const frame of encoded.frames) {
      for (const [key, change] of Object.entries(frame.delta)) {
        state[key] = change.new
      }
      snapshots.push({ ...state })
    }

    return { variables: state, frames: snapshots }
  }

  rleEncode(events: RuntimeEvent[]): CompressedEvent[] {
    if (events.length === 0) return []

    const compressed: CompressedEvent[] = []
    let i = 0

    while (i < events.length) {
      const current = events[i]
      let runLength = 1

      while (
        i + runLength < events.length &&
        events[i + runLength].type === current.type &&
        runLength < 65535
      ) {
        runLength++
      }

      const template: Partial<RuntimeEvent> = { type: current.type }
      const variations: CompressedEvent['variations'] = []

      if (current.concept) template.concept = current.concept
      if (current.importance !== undefined) template.importance = current.importance

      for (let j = 0; j < runLength; j++) {
        const ev = events[i + j]
        if (
          ev.entityId !== current.entityId ||
          ev.property !== current.property ||
          ev.oldValue !== current.oldValue ||
          ev.newValue !== current.newValue
        ) {
          variations.push({
            frameDelta: ev.frameId - current.frameId,
            entityId: ev.entityId,
            property: ev.property,
            oldValue: ev.oldValue,
            newValue: ev.newValue,
          })
        }
      }

      compressed.push({ type: current.type, count: runLength, template, variations: variations.length > 0 ? variations : undefined })
      i += runLength
    }

    return compressed
  }

  expandRle(compressed: CompressedEvent[]): RuntimeEvent[] {
    const events: RuntimeEvent[] = []
    let baseFrame = 0

    for (const ce of compressed) {
      for (let i = 0; i < ce.count; i++) {
        const varIdx = ce.variations?.findIndex(v => v.frameDelta === i)
        const variation = varIdx !== undefined && varIdx >= 0 ? ce.variations![varIdx] : null

        const ev: RuntimeEvent = {
          id: `rle_${events.length}_${Date.now()}`,
          type: ce.template.type as any,
          timestamp: Date.now(),
          frameId: baseFrame + (variation?.frameDelta ?? i),
          ...(variation?.entityId ? { entityId: variation.entityId } : {}),
          ...(variation?.property ? { property: variation.property } : {}),
          ...(variation?.oldValue !== undefined ? { oldValue: variation.oldValue } : {}),
          ...(variation?.newValue !== undefined ? { newValue: variation.newValue } : {}),
          ...(ce.template.concept ? { concept: ce.template.concept } : {}),
          ...(ce.template.importance !== undefined ? { importance: ce.template.importance } : {}),
        }
        events.push(ev)
      }
      baseFrame += ce.count
    }

    return events
  }

  private _snapshotState(frame: ExecutionFrame): Record<string, unknown> {
    const state: Record<string, unknown> = {}
    for (const [name, vs] of frame.variables) {
      state[name] = vs.value
    }
    return state
  }

  estimateRatio(trace: ExecutionTrace): number {
    const rawSize = JSON.stringify(trace.events).length
    const compressed = this.rleEncode(trace.events)
    const compressedSize = JSON.stringify(compressed).length
    return compressedSize > 0 ? rawSize / compressedSize : 1
  }
}

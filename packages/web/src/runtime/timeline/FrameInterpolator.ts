import type { Frame } from './Timeline'
import type { RuntimeEvent } from '../events/Event'
import { Graph } from '../primitives/Graph'

export class FrameInterpolator {
  interpolate(prevFrame: Frame, nextFrame: Frame, progress: number): Frame {
    const t = Math.max(0, Math.min(1, progress))
    return {
      id: prevFrame.id,
      timestamp: this.lerp(prevFrame.timestamp, nextFrame.timestamp, t),
      events: this.interpolateEvents(prevFrame.events, nextFrame.events, t),
      state: this.interpolateGraphs(prevFrame.state, nextFrame.state, t),
    }
  }

  interpolateEvents(prev: RuntimeEvent[], next: RuntimeEvent[], t: number): RuntimeEvent[] {
    return prev.map((event, i) => {
      const nextEvent = next[i]
      if (!nextEvent) return event
      if (typeof event.newValue === 'number' && typeof nextEvent.newValue === 'number') {
        return { ...event, newValue: this.lerp(event.newValue, nextEvent.newValue, t) }
      }
      if (typeof event.oldValue === 'number' && typeof nextEvent.oldValue === 'number') {
        return { ...event, oldValue: this.lerp(event.oldValue, nextEvent.oldValue, t) }
      }
      return event
    })
  }

  interpolateGraphs(prev: Graph, next: Graph, t: number): Graph {
    const result = prev.clone()
    for (const nextEntity of next.getAllEntities()) {
      const prevEntity = prev.getEntity(nextEntity.id)
      if (!prevEntity) continue
      for (const [key, nextVal] of nextEntity.properties) {
        if (key === 'value' || key === 'position.x' || key === 'position.y' || key === 'opacity') {
          const prevVal = prevEntity.properties.get(key)
          if (typeof prevVal === 'number' && typeof nextVal === 'number') {
            result.getEntity(nextEntity.id)?.set(key, this.lerp(prevVal, nextVal, t))
          }
        }
      }
    }
    return result
  }

  estimateInterpolationCount(frames: Frame[]): number {
    let count = 0
    for (let i = 1; i < frames.length; i++) {
      const prevEvents = frames[i - 1].events
      const nextEvents = frames[i].events
      for (let j = 0; j < Math.min(prevEvents.length, nextEvents.length); j++) {
        if (typeof prevEvents[j].newValue === 'number' && typeof nextEvents[j].newValue === 'number') {
          count++
        }
      }
    }
    return count
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }
}

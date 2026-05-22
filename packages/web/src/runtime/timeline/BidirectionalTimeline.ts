import { Timeline, type Frame } from './Timeline'
import type { RuntimeEvent } from '../events/Event'

export class BidirectionalTimeline extends Timeline {
  private direction: 1 | -1 = 1

  setDirection(dir: 1 | -1): void {
    this.direction = dir
  }

  getDirection(): 1 | -1 {
    return this.direction
  }

  getNextFrame(currentIndex: number): Frame | null {
    if (this.direction === 1) {
      return this.getFrame(Math.min(currentIndex + 1, this.frameCount() - 1))
    }
    return this.getFrame(Math.max(currentIndex - 1, 0))
  }

  reverseEvents(fromEvent: RuntimeEvent, toEvent: RuntimeEvent): RuntimeEvent[] {
    const events = this.getEventsBetween(fromEvent, toEvent)
    return events.reverse().map(e => ({
      ...e,
      oldValue: e.newValue,
      newValue: e.oldValue,
    }))
  }

  private getEventsBetween(from: RuntimeEvent, to: RuntimeEvent): RuntimeEvent[] {
    const allEvents = this.getFrames().flatMap(f => f.events)
    const fromIdx = allEvents.indexOf(from)
    const toIdx = allEvents.indexOf(to)
    if (fromIdx < 0 || toIdx < 0) return []
    const start = Math.min(fromIdx, toIdx)
    const end = Math.max(fromIdx, toIdx)
    return allEvents.slice(start, end + 1)
  }
}

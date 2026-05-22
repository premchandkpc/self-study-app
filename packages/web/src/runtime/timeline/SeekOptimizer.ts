import type { RuntimeEvent } from '../events/Event'

export class SeekOptimizer {
  private seekTable: Map<number, number> = new Map()
  private eventCount: number = 0

  build(events: RuntimeEvent[], interval: number = 100): void {
    this.eventCount = events.length
    this.seekTable.clear()
    for (let i = 0; i < events.length; i += interval) {
      this.seekTable.set(events[i].frameId, i)
    }
  }

  findNearestSnapshot(frameIndex: number): { eventIndex: number; frameIndex: number } {
    let nearestFrame = 0
    let nearestEvent = 0
    for (const [frame, eventIdx] of this.seekTable) {
      if (frame <= frameIndex && frame > nearestFrame) {
        nearestFrame = frame
        nearestEvent = eventIdx
      }
    }
    return { eventIndex: nearestEvent, frameIndex: nearestFrame }
  }

  getSeekPoints(): { frameIndex: number; eventIndex: number }[] {
    return Array.from(this.seekTable.entries()).map(([frame, event]) => ({
      frameIndex: frame,
      eventIndex: event,
    }))
  }

  estimateSeekCost(fromFrame: number, toFrame: number): number {
    const nearest = this.findNearestSnapshot(toFrame)
    return Math.abs(toFrame - nearest.frameIndex)
  }

  clear(): void {
    this.seekTable.clear()
    this.eventCount = 0
  }
}

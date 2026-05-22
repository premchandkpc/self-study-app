import type { RuntimeEvent } from '../../runtime'

export class EventOrdering {
  private clock: number = 0
  private peerId: string

  constructor(peerId: string = 'local') {
    this.peerId = peerId
  }

  stamp(event: RuntimeEvent & { peerId?: string }): RuntimeEvent {
    this.clock++
    return { ...event, timestamp: this.clock, peerId: this.peerId }
  }

  receive(event: RuntimeEvent & { peerId?: string }): void {
    this.clock = Math.max(this.clock, event.timestamp) + 1
  }

  compare(a: RuntimeEvent & { peerId?: string }, b: RuntimeEvent & { peerId?: string }): number {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp
    return (a.peerId ?? '').localeCompare(b.peerId ?? '')
  }

  getClock(): number {
    return this.clock
  }
}

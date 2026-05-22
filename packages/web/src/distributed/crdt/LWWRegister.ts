import type { CRDT } from './CRDT'

export class LWWRegister implements CRDT {
  private value: unknown = null
  private timestamp: number = 0
  private peerId: string = ''
  private events: { timestamp: number; value: unknown; peerId: string }[] = []

  constructor(peerId: string = 'local') {
    this.peerId = peerId
  }

  set(value: unknown, timestamp: number): void {
    if (timestamp >= this.timestamp) {
      this.value = value
      this.timestamp = timestamp
      this.events.push({ timestamp, value, peerId: this.peerId })
    }
  }

  get(): unknown {
    return this.value
  }

  merge(other: LWWRegister): void {
    if (other.timestamp > this.timestamp || (other.timestamp === this.timestamp && other.peerId > this.peerId)) {
      this.value = other.value
      this.timestamp = other.timestamp
      this.peerId = other.peerId
    }
    for (const e of other.events) {
      this.events.push(e)
    }
  }

  toState(): Uint8Array {
    return new TextEncoder().encode(JSON.stringify({ value: this.value, timestamp: this.peerId, peerId: this.peerId }))
  }

  fromState(state: Uint8Array): void {
    const data = JSON.parse(new TextDecoder().decode(state))
    this.value = data.value
    this.timestamp = data.timestamp
    this.peerId = data.peerId
  }

  addEvent(_event: { timestamp: number; [key: string]: unknown }): void {
    this.events.push({ timestamp: _event.timestamp as number, value: _event, peerId: this.peerId })
  }

  getEvents(): { timestamp: number; value: unknown; peerId: string }[] {
    return [...this.events]
  }
}

import type { CRDT } from './CRDT'
import type { RuntimeEvent } from '../../runtime'

export class ORSet implements CRDT {
  private added: Map<string, number>
  private removed: Map<string, number>
  private events: RuntimeEvent[] = []

  constructor() {
    this.added = new Map()
    this.removed = new Map()
  }

  add(element: string, timestamp: number): void {
    this.added.set(element, Math.max(this.added.get(element) ?? 0, timestamp))
  }

  remove(element: string, timestamp: number): void {
    this.removed.set(element, Math.max(this.removed.get(element) ?? 0, timestamp))
  }

  has(element: string): boolean {
    const added = this.added.get(element)
    if (added === undefined) return false
    const removed = this.removed.get(element)
    return removed === undefined || added > removed
  }

  getElements(): string[] {
    return Array.from(this.added.keys()).filter(id => {
      const added = this.added.get(id)!
      const removed = this.removed.get(id)
      return removed === undefined || added > removed
    })
  }

  merge(other: ORSet): void {
    for (const [elem, ts] of other.added) {
      this.added.set(elem, Math.max(this.added.get(elem) ?? 0, ts))
    }
    for (const [elem, ts] of other.removed) {
      this.removed.set(elem, Math.max(this.removed.get(elem) ?? 0, ts))
    }
  }

  toState(): Uint8Array {
    return new TextEncoder().encode(JSON.stringify({
      added: Array.from(this.added.entries()),
      removed: Array.from(this.removed.entries()),
    }))
  }

  fromState(state: Uint8Array): void {
    const data = JSON.parse(new TextDecoder().decode(state))
    this.added = new Map(data.added)
    this.removed = new Map(data.removed)
  }

  addEvent(event: RuntimeEvent): void {
    this.events.push(event)
  }

  getEvents(): RuntimeEvent[] {
    return [...this.events]
  }
}

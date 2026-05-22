import type { RuntimeEvent } from '../../runtime'

export interface CRDT {
  merge(other: CRDT): void
  toState(): Uint8Array
  fromState(state: Uint8Array): void
  addEvent(event: RuntimeEvent): void
  getEvents(): RuntimeEvent[]
}

import type { RuntimeEvent } from '../runtime'

export interface TimelineBranch {
  id: string
  name: string
  events: RuntimeEvent[]
}

export class ConflictResolver {
  resolve(eventA: RuntimeEvent & { peerId?: string }, eventB: RuntimeEvent & { peerId?: string }): RuntimeEvent {
    if (eventA.timestamp > eventB.timestamp) return eventA
    if (eventB.timestamp > eventA.timestamp) return eventB
    return (eventA.peerId ?? '') > (eventB.peerId ?? '') ? eventA : eventB
  }

  mergeBranches(branchA: TimelineBranch, branchB: TimelineBranch): TimelineBranch {
    return {
      ...branchA,
      events: this.mergeEvents(branchA.events, branchB.events),
    }
  }

  private mergeEvents(eventsA: RuntimeEvent[], eventsB: RuntimeEvent[]): RuntimeEvent[] {
    const merged = new Map<string, RuntimeEvent>()
    for (const e of [...eventsA, ...eventsB]) {
      const existing = merged.get(e.id)
      if (!existing || e.timestamp > existing.timestamp || (e.timestamp === existing.timestamp && (e as any).peerId > (existing as any).peerId)) {
        merged.set(e.id, e)
      }
    }
    return Array.from(merged.values()).sort((a, b) => a.timestamp - b.timestamp)
  }
}

import type { RuntimeEvent } from '../runtime/events/Event'
import type { ExecutionSnapshot, ExecutionFrame, VariableState, HeapObject } from './Frame'

export interface ReconstructedState {
  variables: Map<string, unknown>
  heap: Map<string, HeapObject>
  callStack: ExecutionFrame[]
  frameIndex: number
}

export class StateReconstructor {
  reconstruct(
    events: RuntimeEvent[],
    upToEvent: number,
  ): ReconstructedState {
    const variables = new Map<string, unknown>()
    const heap = new Map<string, HeapObject>()
    const callStack: ExecutionFrame[] = []
    let frameIndex = 0

    for (let i = 0; i <= Math.min(upToEvent, events.length - 1); i++) {
      const event = events[i]
      if (!event) continue
      frameIndex = event.frameId

      switch (event.type) {
        case 'VARIABLE_MUTATED':
        case 'PROPERTY_CHANGED':
          if (event.property) {
            variables.set(event.property, event.newValue)
          }
          break
        case 'MEMORY_ALLOCATED':
          if (event.entityId) {
            heap.set(event.entityId, {
              id: event.entityId,
              type: (event.metadata?.type as string) ?? 'unknown',
              fields: new Map(Object.entries((event.metadata?.fields as Record<string, unknown>) ?? {})),
              references: (event.metadata?.references as string[]) ?? [],
              referencedBy: [],
              size: (event.metadata?.size as number) ?? 0,
              allocationSite: event.explanation ?? '',
            })
          }
          break
        case 'MEMORY_FREED':
          if (event.entityId) {
            heap.delete(event.entityId)
          }
          break
        case 'FUNCTION_CALL':
          if (event.entityId) {
            const frameVars = new Map<string, VariableState>()
            if (event.metadata?.args) {
              const args = event.metadata.args as unknown[]
              args.forEach((arg, idx) => {
                frameVars.set(`arg_${idx}`, {
                  name: `arg_${idx}`,
                  type: typeof arg === 'object' ? 'object' : 'primitive',
                  value: arg,
                  scope: 'local',
                  immutable: false,
                })
              })
            }
            callStack.push({
              id: `reconstructed_${event.id}`,
              functionName: event.entityId,
              lineNumber: (event.metadata?.lineNumber as number) ?? 0,
              variables: frameVars,
              stack: [],
              heap: new Map(),
              startedAt: event.timestamp,
              childFrames: [],
            })
          }
          break
        case 'FUNCTION_RETURN':
          callStack.pop()
          if (event.newValue !== undefined && callStack.length > 0) {
            variables.set('return', event.newValue)
          }
          break
        case 'STACK_PUSHED':
          if (event.entityId) {
            callStack.push({
              id: `stack_${event.id}`,
              functionName: event.entityId,
              lineNumber: 0,
              variables: new Map(),
              stack: [],
              heap: new Map(),
              startedAt: event.timestamp,
              childFrames: [],
            })
          }
          break
        case 'STACK_POPPED':
          callStack.pop()
          break
        case 'ENTITY_CREATED':
          if (event.entityId && !variables.has(event.entityId)) {
            variables.set(event.entityId, event.metadata?.initialValue)
          }
          break
        case 'ENTITY_DELETED':
          if (event.entityId) {
            variables.delete(event.entityId)
          }
          break
      }
    }

    return { variables, heap, callStack, frameIndex }
  }

  reconstructSnapshot(
    events: RuntimeEvent[],
    upToEvent: number,
  ): ExecutionSnapshot {
    const state = this.reconstruct(events, upToEvent)
    return {
      frameIndex: state.frameIndex,
      variables: Array.from(state.variables.entries()).map(([name, value]) => ({
        name,
        type: (typeof value === 'object' ? 'object' : 'primitive') as VariableState['type'],
        value,
        scope: 'local' as const,
        immutable: false,
      })),
      callStack: state.callStack,
      heap: Array.from(state.heap.values()),
      lastEvent: events[Math.min(upToEvent, events.length - 1)] ?? null,
    }
  }
}

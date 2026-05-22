export type EventType =
  | 'ENTITY_CREATED' | 'ENTITY_DELETED'
  | 'PROPERTY_CHANGED' | 'LABEL_ADDED' | 'LABEL_REMOVED'
  | 'NODE_ADDED' | 'NODE_REMOVED'
  | 'EDGE_ADDED' | 'EDGE_REMOVED'
  | 'MESSAGE_SENT' | 'MESSAGE_RECEIVED'
  | 'PACKET_IN_FLIGHT' | 'PACKET_DROPPED'
  | 'FUNCTION_CALL' | 'FUNCTION_RETURN'
  | 'VARIABLE_MUTATED' | 'STACK_PUSHED' | 'STACK_POPPED'
  | 'THREAD_STARTED' | 'THREAD_BLOCKED' | 'THREAD_WOKEN'
  | 'LOCK_ACQUIRED' | 'LOCK_RELEASED'
  | 'MEMORY_ALLOCATED' | 'MEMORY_FREED'
  | 'GC_MARK' | 'GC_SWEEP'
  | 'REQUEST_SENT' | 'RESPONSE_RECEIVED'
  | 'CONNECTION_ESTABLISHED' | 'CONNECTION_CLOSED'
  | 'REASONING_STEP' | 'INFERENCE_COMPLETE'
  | 'CUSTOM'

export type EventSource = 'algorithm' | 'user' | 'system' | 'ai' | 'replay'

export interface RuntimeEvent {
  id: string
  type: EventType
  timestamp: number
  frameId: number

  entityId?: string
  property?: string
  oldValue?: unknown
  newValue?: unknown

  concept?: string
  category?: string
  importance?: number
  explanation?: string

  source?: EventSource
  causeEventId?: string
  metadata?: Record<string, unknown>
}

export interface EventFilter {
  types?: EventType[]
  entityIds?: string[]
  frameId?: number
  fromTimestamp?: number
  toTimestamp?: number
  minImportance?: number
  source?: EventSource
  concept?: string
}

let eventIdCounter = 0

export function createEvent(
  type: EventType,
  frameId: number,
  overrides?: Partial<RuntimeEvent>,
): RuntimeEvent {
  return {
    id: `evt_${Date.now()}_${++eventIdCounter}`,
    type,
    timestamp: Date.now(),
    frameId,
    ...overrides,
  }
}

export function filterEvent(event: RuntimeEvent, filter?: EventFilter): boolean {
  if (!filter) return true
  if (filter.types && !filter.types.includes(event.type)) return false
  if (filter.entityIds && event.entityId && !filter.entityIds.includes(event.entityId)) return false
  if (filter.frameId !== undefined && event.frameId !== filter.frameId) return false
  if (filter.fromTimestamp !== undefined && event.timestamp < filter.fromTimestamp) return false
  if (filter.toTimestamp !== undefined && event.timestamp > filter.toTimestamp) return false
  if (filter.minImportance !== undefined && (event.importance ?? 0) < filter.minImportance) return false
  if (filter.source && event.source !== filter.source) return false
  if (filter.concept && event.concept !== filter.concept) return false
  return true
}

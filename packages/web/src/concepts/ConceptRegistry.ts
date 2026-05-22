import type { RuntimeEvent, EventType } from '../runtime/events/Event'

export interface ConceptMapping {
  concept: string
  category: string
  complexity: string
  importance: number
  interviewRelevant: boolean
  whyItMatters?: string
}

const EVENT_CONCEPT_MAP: Partial<Record<EventType, ConceptMapping>> = {
  ENTITY_CREATED: { concept: 'array', category: 'data-structure', complexity: 'O(1)', importance: 0.5, interviewRelevant: false },
  ENTITY_DELETED: { concept: 'memory-allocation', category: 'memory-management', complexity: 'O(1)', importance: 0.6, interviewRelevant: true, whyItMatters: 'Understanding allocation is key to memory-efficient code' },
  PROPERTY_CHANGED: { concept: 'comparison', category: 'sorting', complexity: 'O(1)', importance: 0.7, interviewRelevant: true, whyItMatters: 'Core to all comparison-based algorithms' },
  EDGE_ADDED: { concept: 'graph', category: 'data-structure', complexity: 'O(1)', importance: 0.6, interviewRelevant: true },
  EDGE_REMOVED: { concept: 'graph', category: 'data-structure', complexity: 'O(1)', importance: 0.5, interviewRelevant: false },
  MESSAGE_SENT: { concept: 'publish-subscribe', category: 'distributed-systems', complexity: 'O(1)', importance: 0.7, interviewRelevant: true, whyItMatters: 'Foundation of event-driven architectures' },
  MESSAGE_RECEIVED: { concept: 'publish-subscribe', category: 'distributed-systems', complexity: 'O(1)', importance: 0.6, interviewRelevant: true },
  PACKET_IN_FLIGHT: { concept: 'routing', category: 'networking', complexity: 'O(n)', importance: 0.6, interviewRelevant: true },
  PACKET_DROPPED: { concept: 'congestion-control', category: 'networking', complexity: 'O(1)', importance: 0.7, interviewRelevant: true, whyItMatters: 'Congestion control prevents internet collapse' },
  FUNCTION_CALL: { concept: 'recursion', category: 'algorithmic-paradigm', complexity: 'O(1)', importance: 0.8, interviewRelevant: true, whyItMatters: 'Recursive thinking is essential for tree/graph problems' },
  FUNCTION_RETURN: { concept: 'recursion', category: 'algorithmic-paradigm', complexity: 'O(1)', importance: 0.5, interviewRelevant: false },
  VARIABLE_MUTATED: { concept: 'memory-allocation', category: 'memory-management', complexity: 'O(1)', importance: 0.5, interviewRelevant: false },
  STACK_PUSHED: { concept: 'stack', category: 'data-structure', complexity: 'O(1)', importance: 0.7, interviewRelevant: true, whyItMatters: 'Stack is fundamental to function calls and undo systems' },
  STACK_POPPED: { concept: 'stack', category: 'data-structure', complexity: 'O(1)', importance: 0.5, interviewRelevant: false },
  THREAD_STARTED: { concept: 'context-switch', category: 'os', complexity: 'O(1)', importance: 0.6, interviewRelevant: true },
  THREAD_BLOCKED: { concept: 'deadlock', category: 'concurrency', complexity: 'O(1)', importance: 0.8, interviewRelevant: true, whyItMatters: 'Deadlocks are critical system design issues' },
  THREAD_WOKEN: { concept: 'context-switch', category: 'os', complexity: 'O(1)', importance: 0.5, interviewRelevant: false },
  LOCK_ACQUIRED: { concept: 'mutex', category: 'concurrency', complexity: 'O(1)', importance: 0.7, interviewRelevant: true, whyItMatters: 'Primary mechanism for preventing data races' },
  LOCK_RELEASED: { concept: 'mutex', category: 'concurrency', complexity: 'O(1)', importance: 0.5, interviewRelevant: false },
  MEMORY_ALLOCATED: { concept: 'memory-allocation', category: 'memory-management', complexity: 'O(1)', importance: 0.6, interviewRelevant: true },
  MEMORY_FREED: { concept: 'garbage-collection', category: 'memory-management', complexity: 'O(1)', importance: 0.7, interviewRelevant: true, whyItMatters: 'Automatic memory management prevents memory leaks' },
  GC_MARK: { concept: 'mark-sweep', category: 'memory-management', complexity: 'O(n)', importance: 0.7, interviewRelevant: true, whyItMatters: 'Foundation of JVM and V8 garbage collection' },
  GC_SWEEP: { concept: 'mark-sweep', category: 'memory-management', complexity: 'O(n)', importance: 0.6, interviewRelevant: true },
  REQUEST_SENT: { concept: 'load-balancing', category: 'system-design', complexity: 'O(1)', importance: 0.6, interviewRelevant: true },
  RESPONSE_RECEIVED: { concept: 'load-balancing', category: 'system-design', complexity: 'O(1)', importance: 0.5, interviewRelevant: false },
  CONNECTION_ESTABLISHED: { concept: 'tcp-handshake', category: 'networking', complexity: 'O(1)', importance: 0.7, interviewRelevant: true, whyItMatters: 'Guarantees reliable connection-oriented communication' },
  CONNECTION_CLOSED: { concept: 'tcp-handshake', category: 'networking', complexity: 'O(1)', importance: 0.4, interviewRelevant: false },
  REASONING_STEP: { concept: 'forward-pass', category: 'ai-ml', complexity: 'O(n)', importance: 0.6, interviewRelevant: true },
  INFERENCE_COMPLETE: { concept: 'forward-pass', category: 'ai-ml', complexity: 'O(n)', importance: 0.5, interviewRelevant: false },
  LABEL_ADDED: { concept: 'sorting', category: 'sorting', complexity: 'O(1)', importance: 0.4, interviewRelevant: false },
  LABEL_REMOVED: { concept: 'sorting', category: 'sorting', complexity: 'O(1)', importance: 0.3, interviewRelevant: false },
}

export class ConceptRegistry {
  private customMappings: Map<string, ConceptMapping> = new Map()

  registerMapping(eventType: string, mapping: ConceptMapping): void {
    this.customMappings.set(eventType, mapping)
  }

  getMapping(eventType: EventType | string): ConceptMapping | undefined {
    return this.customMappings.get(eventType) ?? EVENT_CONCEPT_MAP[eventType as EventType]
  }

  getAllMappings(): Record<string, ConceptMapping> {
    return { ...EVENT_CONCEPT_MAP as any, ...Object.fromEntries(this.customMappings) }
  }

  hasMapping(eventType: string): boolean {
    return EVENT_CONCEPT_MAP.hasOwnProperty(eventType) || this.customMappings.has(eventType)
  }
}

import type { RuntimeEvent } from './Event'
import { CONCEPT_DEFINITIONS } from '../../semantic/concepts'
import type { ConceptName } from '../../semantic/concepts'

export type EventMiddleware = (event: RuntimeEvent, next: () => void) => void

export class MiddlewarePipeline {
  private middlewares: EventMiddleware[] = []

  use(mw: EventMiddleware): () => void {
    this.middlewares.push(mw)
    return () => {
      const idx = this.middlewares.indexOf(mw)
      if (idx >= 0) this.middlewares.splice(idx, 1)
    }
  }

  removeAll(): void {
    this.middlewares = []
  }

  run(event: RuntimeEvent): void {
    this._execute(event, this.middlewares, 0)
  }

  private _execute(event: RuntimeEvent, middlewares: EventMiddleware[], index: number): void {
    if (index < middlewares.length) {
      middlewares[index](event, () => {
        this._execute(event, middlewares, index + 1)
      })
    }
  }
}

export const enrichMiddleware: EventMiddleware = (event, next) => {
  if (!event.concept || !event.explanation) {
    const concept = detectConcept(event)
    if (concept) {
      event.concept = concept
      event.category = CONCEPT_DEFINITIONS[concept]?.category
      event.importance = event.importance ?? CONCEPT_DEFINITIONS[concept]?.interviewRelevant ? 0.7 : 0.3
    }
    if (!event.explanation) {
      event.explanation = `${event.type}${event.entityId ? ` on ${event.entityId}` : ''}${event.property ? `.${event.property}` : ''}`
    }
  }
  next()
}

export const validateMiddleware: EventMiddleware = (event, next) => {
  if (!event.id) { event.id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}` }
  if (!event.timestamp) { event.timestamp = Date.now() }
  if (event.frameId === undefined) { event.frameId = 0 }
  next()
}

export const loggingMiddleware: EventMiddleware = (event, next) => {
  console.debug(`[Event] ${event.type} | frame=${event.frameId} | entity=${event.entityId ?? '-'} | concept=${event.concept ?? '-'}`)
  next()
}

function detectConcept(event: RuntimeEvent): ConceptName | undefined {
  const et = event.type
  const mapping: Record<string, ConceptName> = {
    ENTITY_CREATED: 'array',
    ENTITY_DELETED: 'memory-allocation',
    PROPERTY_CHANGED: 'comparison',
    EDGE_ADDED: 'graph',
    EDGE_REMOVED: 'graph',
    MESSAGE_SENT: 'publish-subscribe',
    MESSAGE_RECEIVED: 'publish-subscribe',
    PACKET_IN_FLIGHT: 'routing',
    PACKET_DROPPED: 'congestion-control',
    FUNCTION_CALL: 'recursion',
    FUNCTION_RETURN: 'recursion',
    VARIABLE_MUTATED: 'memory-allocation',
    STACK_PUSHED: 'stack',
    STACK_POPPED: 'stack',
    THREAD_STARTED: 'context-switch',
    THREAD_BLOCKED: 'deadlock',
    THREAD_WOKEN: 'context-switch',
    LOCK_ACQUIRED: 'mutex',
    LOCK_RELEASED: 'mutex',
    MEMORY_ALLOCATED: 'memory-allocation',
    MEMORY_FREED: 'garbage-collection',
    GC_MARK: 'mark-sweep',
    GC_SWEEP: 'mark-sweep',
    REQUEST_SENT: 'load-balancing',
    RESPONSE_RECEIVED: 'load-balancing',
    CONNECTION_ESTABLISHED: 'tcp-handshake',
    CONNECTION_CLOSED: 'tcp-handshake',
    REASONING_STEP: 'forward-pass',
    INFERENCE_COMPLETE: 'forward-pass',
    LABEL_ADDED: 'sorting',
    LABEL_REMOVED: 'sorting',
  }
  return mapping[et]
}

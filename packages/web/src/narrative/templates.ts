import type { RuntimeEvent } from '../runtime/events/Event'

export interface NarrationTemplate {
  template: string
  getEmphasis: (event: RuntimeEvent) => (string | undefined)[]
  getComplexity?: (event: RuntimeEvent) => number
}

export const NARRATION_TEMPLATES: Record<string, NarrationTemplate> = {
  ENTITY_CREATED: {
    template: 'A new {entityKind} [{entityId}] was created',
    getEmphasis: (e) => [e.entityId, e.metadata?.kind as string],
  },
  ENTITY_DELETED: {
    template: '{entityId} was removed',
    getEmphasis: (e) => [e.entityId!],
  },
  PROPERTY_CHANGED: {
    template: '{property} changed from {oldValue} to {newValue}',
    getEmphasis: (e) => [e.property!, e.newValue as string],
  },
  LABEL_ADDED: {
    template: 'Label applied: {entityId} is now {property}',
    getEmphasis: (e) => [e.entityId!, e.property!],
  },
  LABEL_REMOVED: {
    template: 'Label removed from {entityId}',
    getEmphasis: (e) => [e.entityId!],
  },
  NODE_ADDED: {
    template: 'New node {entityId} added to the graph',
    getEmphasis: (e) => [e.entityId!],
  },
  NODE_REMOVED: {
    template: 'Node {entityId} removed from the graph',
    getEmphasis: (e) => [e.entityId!],
  },
  EDGE_ADDED: {
    template: 'Connection established between {source} and {target}',
    getEmphasis: (e) => [(e.newValue as any)?.from, (e.newValue as any)?.to],
  },
  EDGE_REMOVED: {
    template: 'Connection removed between {source} and {target}',
    getEmphasis: (e) => [(e.newValue as any)?.from, (e.newValue as any)?.to],
  },
  MESSAGE_SENT: {
    template: '{source} sent message to {target}',
    getEmphasis: (e) => [e.metadata?.source as string, e.metadata?.target as string],
  },
  MESSAGE_RECEIVED: {
    template: '{target} received message from {source}',
    getEmphasis: (e) => [e.metadata?.target as string, e.metadata?.source as string],
  },
  PACKET_IN_FLIGHT: {
    template: 'Packet traveling from {source} to {target}',
    getEmphasis: (e) => [e.metadata?.source as string, e.metadata?.target as string],
  },
  PACKET_DROPPED: {
    template: 'Packet lost in transit!',
    getEmphasis: () => [],
  },
  FUNCTION_CALL: {
    template: 'Called {entityId}({args})',
    getEmphasis: (e) => [e.entityId!],
  },
  FUNCTION_RETURN: {
    template: 'Returned {newValue} from {entityId}',
    getEmphasis: (e) => [e.entityId!, e.newValue as string],
  },
  VARIABLE_MUTATED: {
    template: '{property} = {newValue} (was {oldValue})',
    getEmphasis: (e) => [e.property!, e.newValue as string],
  },
  STACK_PUSHED: {
    template: 'Pushed {entityId} onto the stack',
    getEmphasis: (e) => [e.entityId!],
  },
  STACK_POPPED: {
    template: 'Popped {entityId} from the stack',
    getEmphasis: (e) => [e.entityId!],
  },
  THREAD_STARTED: {
    template: 'Thread {entityId} started',
    getEmphasis: (e) => [e.entityId!],
  },
  THREAD_BLOCKED: {
    template: 'Thread {entityId} blocked — waiting for resource',
    getEmphasis: (e) => [e.entityId!],
  },
  THREAD_WOKEN: {
    template: 'Thread {entityId} resumed execution',
    getEmphasis: (e) => [e.entityId!],
  },
  LOCK_ACQUIRED: {
    template: 'Thread {threadId} acquired lock {lockId}',
    getEmphasis: (e) => [e.metadata?.threadId as string, e.metadata?.lockId as string],
  },
  LOCK_RELEASED: {
    template: 'Thread {threadId} released lock {lockId}',
    getEmphasis: (e) => [e.metadata?.threadId as string, e.metadata?.lockId as string],
  },
  MEMORY_ALLOCATED: {
    template: 'Allocated {size} bytes for {entityId}',
    getEmphasis: (e) => [e.entityId!, String(e.metadata?.size ?? '')],
  },
  MEMORY_FREED: {
    template: 'Freed memory at {entityId}',
    getEmphasis: (e) => [e.entityId!],
  },
  GC_MARK: {
    template: 'GC marking reachable objects starting from roots',
    getEmphasis: () => [],
  },
  GC_SWEEP: {
    template: 'GC sweeping unreachable objects — reclaiming memory',
    getEmphasis: () => [],
  },
  REQUEST_SENT: {
    template: 'Request sent to {target}',
    getEmphasis: (e) => [e.metadata?.target as string],
  },
  RESPONSE_RECEIVED: {
    template: 'Response received from {source}',
    getEmphasis: (e) => [e.metadata?.source as string],
  },
  CONNECTION_ESTABLISHED: {
    template: 'Connection established between {source} ↔ {target}',
    getEmphasis: (e) => [e.metadata?.source as string, e.metadata?.target as string],
  },
  CONNECTION_CLOSED: {
    template: 'Connection closed between {source} and {target}',
    getEmphasis: (e) => [e.metadata?.source as string, e.metadata?.target as string],
  },
  REASONING_STEP: {
    template: 'Processing step: {explanation}',
    getEmphasis: (e) => [e.explanation ?? ''],
  },
  INFERENCE_COMPLETE: {
    template: 'Inference complete — result: {newValue}',
    getEmphasis: (e) => [e.newValue as string],
  },
  CUSTOM: {
    template: '{explanation}',
    getEmphasis: (e) => [e.explanation ?? ''],
  },
}

export function formatTemplate(template: string, event: RuntimeEvent): string {
  return template
    .replaceAll('{entityId}', event.entityId ?? '?')
    .replaceAll('{entityKind}', (event.metadata?.kind as string) ?? 'entity')
    .replaceAll('{property}', event.property ?? '?')
    .replaceAll('{oldValue}', String(event.oldValue ?? '?'))
    .replaceAll('{newValue}', String(event.newValue ?? '?'))
    .replaceAll('{explanation}', event.explanation ?? '')
    .replaceAll('{source}', (event.metadata?.source as string) ?? '?')
    .replaceAll('{target}', (event.metadata?.target as string) ?? '?')
    .replaceAll('{threadId}', (event.metadata?.threadId as string) ?? '?')
    .replaceAll('{lockId}', (event.metadata?.lockId as string) ?? '?')
    .replaceAll('{args}', JSON.stringify(event.metadata?.args ?? ''))
    .replaceAll('{size}', String((event.metadata?.size as number) ?? '?'))
}

export function generateNarration(event: RuntimeEvent): string {
  const template = NARRATION_TEMPLATES[event.type]
  if (!template) return event.explanation ?? `${event.type} on ${event.entityId ?? '?'}`
  return formatTemplate(template.template, event)
}

export function getEmphasis(event: RuntimeEvent): string[] {
  const template = NARRATION_TEMPLATES[event.type]
  if (!template) return [event.entityId ?? ''].filter(Boolean)
  return template.getEmphasis(event).filter((e): e is string => e !== undefined && e !== null)
}

import type { RuntimeEvent } from '../runtime/events/Event'

export interface Explanation {
  summary: string
  context: string
  implication: string
  concepts: string[]
  interviewTip?: string
  relatedTopics: string[]
}

export class ExplanationPipeline {
  explain(event: RuntimeEvent, depth: 'shallow' | 'medium' | 'deep'): Explanation {
    const concept = event.concept ?? 'general'
    const entityId = event.entityId ?? '?'
    const property = event.property ?? ''
    const oldVal = event.oldValue
    const newVal = event.newValue

    switch (depth) {
      case 'shallow':
        return this._shallow(event, entityId, property, oldVal, newVal)
      case 'medium':
        return this._medium(event, entityId, property, oldVal, newVal, concept)
      case 'deep':
        return this._deep(event, entityId, property, oldVal, newVal, concept)
    }
  }

  private _shallow(event: RuntimeEvent, entityId: string, property: string, oldVal: unknown, newVal: unknown): Explanation {
    return {
      summary: event.explanation ?? `${property} → ${JSON.stringify(newVal)}`,
      context: `Event type: ${event.type}`,
      implication: 'No significant structural change',
      concepts: event.concept ? [event.concept] : [],
      relatedTopics: [],
    }
  }

  private _medium(event: RuntimeEvent, entityId: string, property: string, oldVal: unknown, newVal: unknown, concept: string): Explanation {
    const domainHints: Record<string, { context: string; implication: string }> = {
      sorting: {
        context: 'Part of a sorting algorithm rearranging elements',
        implication: 'The array is being ordered according to the sorting strategy',
      },
      concurrency: {
        context: 'Concurrent threads coordinating access to shared resources',
        implication: 'Thread synchronization affects execution order and data consistency',
      },
      networking: {
        context: 'Data flowing through a network topology',
        implication: 'Packet delivery and routing affect overall system behavior',
      },
      'memory-management': {
        context: 'Memory is being allocated or reclaimed by the runtime',
        implication: 'Memory pressure affects garbage collection frequency and performance',
      },
    }

    const hint = domainHints[concept] ?? {
      context: `Operation on ${entityId} affecting its state`,
      implication: `${entityId} transitions from ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`,
    }

    return {
      summary: event.explanation ?? `${property} changed on ${entityId}`,
      context: hint.context,
      implication: hint.implication,
      concepts: [concept],
      interviewTip: concept === 'sorting' ? 'This operation may be O(n²) — ask about optimization' : undefined,
      relatedTopics: this._getRelatedTopics(concept),
    }
  }

  private _deep(event: RuntimeEvent, entityId: string, property: string, oldVal: unknown, newVal: unknown, concept: string): Explanation {
    const medium = this._medium(event, entityId, property, oldVal, newVal, concept)
    return {
      ...medium,
      context: `${medium.context}. This fits within the broader pattern of ${concept}-related operations`,
      implication: `${medium.implication}. After this change, downstream operations will see the updated state, potentially triggering cascading effects`,
      relatedTopics: [...medium.relatedTopics, 'distributed-systems', 'fault-tolerance', 'observability'],
    }
  }

  private _getRelatedTopics(concept: string): string[] {
    const map: Record<string, string[]> = {
      sorting: ['time-complexity', 'divide-and-conquer', 'data-structures'],
      concurrency: ['deadlock', 'race-condition', 'mutex', 'semaphore'],
      networking: ['tcp-handshake', 'routing', 'dns-resolution'],
      'memory-management': ['garbage-collection', 'paging', 'virtual-memory'],
      'data-structure': ['array', 'linked-list', 'hash-map', 'tree', 'graph'],
      'distributed-systems': ['consensus', 'replication', 'raft', 'paxos'],
      'ai-ml': ['forward-pass', 'backpropagation', 'gradient-descent'],
      database: ['indexing', 'transaction', 'locking'],
      'system-design': ['load-balancing', 'caching', 'rate-limiting'],
      os: ['scheduling', 'context-switch', 'memory-allocation'],
    }
    return map[concept] ?? []
  }
}

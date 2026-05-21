/**
 * TypedEventEmitter — Type-safe event emission.
 * Replaces loose EventEmitter with strong typing.
 */

export type EventListener<T = any> = (data: T) => void;
export type EventMap = Record<string, any>;

/**
 * Generic typed event emitter.
 * Usage:
 *   const emitter = new TypedEventEmitter<MyEventMap>();
 *   emitter.on('user-login', (user) => { ... });
 */
export class TypedEventEmitter<Events extends EventMap = EventMap> {
  private listeners: Map<string, Set<EventListener>> = new Map();

  on<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): () => void {
    const eventKey = String(event);
    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, new Set());
    }
    this.listeners.get(eventKey)!.add(listener as EventListener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventKey)?.delete(listener as EventListener);
    };
  }

  once<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): () => void {
    const eventKey = String(event);
    const wrapper = (data: any) => {
      listener(data);
      this.listeners.get(eventKey)?.delete(wrapper);
    };
    return this.on(event, wrapper as EventListener<Events[K]>);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const eventKey = String(event);
    this.listeners.get(eventKey)?.forEach((listener) => {
      try {
        listener(data);
      } catch (e) {
        console.error(`Error in listener for event "${String(event)}":`, e);
      }
    });
  }

  off<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): void {
    const eventKey = String(event);
    this.listeners.get(eventKey)?.delete(listener as EventListener);
  }

  removeAllListeners<K extends keyof Events>(event?: K): void {
    if (event !== undefined) {
      this.listeners.delete(String(event));
    } else {
      this.listeners.clear();
    }
  }

  listenerCount<K extends keyof Events>(event: K): number {
    return this.listeners.get(String(event))?.size ?? 0;
  }
}

// Backwards-compatible EventEmitter
export class EventEmitter extends TypedEventEmitter<Record<string, any>> {}

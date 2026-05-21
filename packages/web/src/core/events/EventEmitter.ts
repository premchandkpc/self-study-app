// EventEmitter - Pub/Sub for runtime events
// Zero DOM knowledge

export type EventListener = (data: any) => void;

export class EventEmitter {
  private listeners: Map<string, Set<EventListener>> = new Map();

  on(event: string, listener: EventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  once(event: string, listener: EventListener): () => void {
    const wrapper = (data: any) => {
      listener(data);
      this.listeners.get(event)?.delete(wrapper);
    };
    return this.on(event, wrapper);
  }

  emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(data);
      } catch (e) {
        console.error(`Error in listener for event "${event}":`, e);
      }
    });
  }

  off(event: string, listener: EventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

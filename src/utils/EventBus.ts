type EventCallback = (...args: any[]) => void;

class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    return this;
  }

  off(event: string, callback: EventCallback): this {
    const cbs = this.listeners.get(event);
    if (cbs) {
      this.listeners.set(event, cbs.filter(cb => cb !== callback));
    }
    return this;
  }

  emit(event: string, ...args: any[]): this {
    const cbs = this.listeners.get(event);
    if (cbs) {
      for (const cb of cbs) {
        cb(...args);
      }
    }
    return this;
  }

  once(event: string, callback: EventCallback): this {
    const wrapper: EventCallback = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }

  clear(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }
}

export const eventBus = new EventBus();

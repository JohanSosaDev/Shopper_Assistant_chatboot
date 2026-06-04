type Listener = (...args: unknown[]) => void;

export function createEventBus() {
  const listeners = new Map<string, Set<Listener>>();

  function on(event: string, fn: Listener): () => void {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(fn);
    return () => listeners.get(event)?.delete(fn);
  }

  function emit(event: string, ...args: unknown[]): void {
    listeners.get(event)?.forEach((fn) => fn(...args));
  }

  return { on, emit };
}

export type EventBus = ReturnType<typeof createEventBus>;

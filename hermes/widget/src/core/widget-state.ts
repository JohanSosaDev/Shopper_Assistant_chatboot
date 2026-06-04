export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface WidgetState {
  isOpen: boolean;
  messages: Message[];
  isLoading: boolean;
  hasConsented: boolean;
  error: string | null;
  conversationId: string;
}

export function createInitialState(conversationId: string): WidgetState {
  return {
    isOpen: false,
    messages: [],
    isLoading: false,
    hasConsented: false,
    error: null,
    conversationId,
  };
}

export type WidgetStateManager = ReturnType<typeof createWidgetStateManager>;

export function createWidgetStateManager(initial: WidgetState) {
  let state = { ...initial };
  const listeners = new Set<() => void>();

  function getState(): WidgetState {
    return { ...state };
  }

  function setState(partial: Partial<WidgetState>): void {
    state = { ...state, ...partial };
    listeners.forEach((fn) => fn());
  }

  function subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { getState, setState, subscribe };
}

/** A tiny store around a pure reducer. React reads it with useSyncExternalStore, Ink the same way. */
export interface Machine<S, A> {
  getState(): S;
  send(action: A): void;
  subscribe(listener: () => void): () => void;
}

export function createMachine<S, A>(reducer: (state: S, action: A) => S, initial: S): Machine<S, A> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    send(action) {
      const next = reducer(state, action);
      if (Object.is(next, state)) return;
      state = next;
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

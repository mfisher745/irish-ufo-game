/**
 * Typed event bus. Implements `GameEventBus` from `types.ts`.
 * Plain TypeScript, no Phaser. DESIGN.md section 10.
 */

import type { GameEventBus, GameEventName, GameEventPayloads } from './types';

type AnyHandler = (payload: never) => void;

export class EventBus implements GameEventBus {
  private readonly handlers = new Map<GameEventName, Set<AnyHandler>>();

  emit<K extends GameEventName>(event: K, payload: GameEventPayloads[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // Copy so a handler can unsubscribe (or subscribe) while we iterate.
    for (const handler of [...set]) (handler as (p: GameEventPayloads[K]) => void)(payload);
  }

  on<K extends GameEventName>(event: K, handler: (payload: GameEventPayloads[K]) => void): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    const stored = handler as AnyHandler;
    set.add(stored);
    return () => {
      set.delete(stored);
    };
  }

  /** Subscribe for one event only. */
  once<K extends GameEventName>(event: K, handler: (payload: GameEventPayloads[K]) => void): () => void {
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  /** Number of handlers for an event (tests and leak checks). */
  listenerCount(event: GameEventName): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  clear(): void {
    this.handlers.clear();
  }
}

/**
 * A scope that remembers every subscription so they can all be dropped at
 * once (a scene or a chapter script shutting down).
 */
export class BusScope {
  private readonly offs: (() => void)[] = [];

  constructor(readonly bus: GameEventBus) {}

  on<K extends GameEventName>(event: K, handler: (payload: GameEventPayloads[K]) => void): () => void {
    const off = this.bus.on(event, handler);
    this.offs.push(off);
    return off;
  }

  dispose(): void {
    for (const off of this.offs.splice(0)) off();
  }
}

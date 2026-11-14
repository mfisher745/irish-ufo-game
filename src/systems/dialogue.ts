/**
 * Dialogue runner. DESIGN.md section 7.5: commentary (`box`) never blocks
 * play; `scene` delivery pauses gameplay until the UI reports it finished.
 * Plain TypeScript; text is looked up by ID through an injected lookup.
 *
 * Each channel shows one sequence at a time and queues the rest:
 * - box: the commentary box. Play continues.
 * - scene: the scripted-scene box. Gameplay pauses while one is showing.
 * - caption: chapter titles and location cards. Play continues.
 *
 * The runner emits `dialogue:show` when a sequence becomes current; the UI
 * calls `finished(id)` when the player has read it, and the runner emits
 * `dialogue:finished` and resolves the promise returned by `play`.
 *
 * Nothing is said twice (DESIGN.md 7.5). Every sequence played is recorded
 * in `played` (saved with the game) and a later `play` of the same ID
 * resolves at once without showing anything, unless the caller passes
 * `{ repeat: true }`. Callers mark as repeatable: hints, lines drawn from a
 * pool, an examinable's line when E is pressed on it again, and anything a
 * script explicitly asks to repeat.
 *
 * Stale commentary: with a `context`, a `box` sequence that is queued but
 * not yet showing is dropped (its promise resolves, it is not recorded) if
 * Andrew has changed screen, if the section it was queued in has completed,
 * or if it has waited longer than `context.staleMs`.
 */

import { GameEvents } from '../core/types';
import type { DialogueDelivery, DialogueId, GameEventBus } from '../core/types';

export interface DialogueLookup {
  /** Delivery of a sequence, or null if the ID is unknown. */
  delivery(id: DialogueId): DialogueDelivery | null;
}

/** What the runner needs from the world to drop stale commentary. */
export interface DialogueContext {
  /** Game time in ms. */
  clock(): number;
  screenId(): string;
  /** The section current when a line is queued, if any. */
  sectionId(): string | null;
  isComplete(sectionId: string): boolean;
  readonly staleMs: number;
}

export interface PlayOptions {
  /** Plays even if it has been played before (and does not count as played). */
  readonly repeat?: boolean;
}

interface Pending {
  readonly id: DialogueId;
  readonly resolve: () => void;
  readonly repeat: boolean;
  readonly queuedAt: number;
  readonly screenId: string | null;
  readonly sectionId: string | null;
}

export class DialogueRunner {
  private readonly queues: Record<DialogueDelivery, Pending[]> = { box: [], scene: [], caption: [] };
  private readonly current: Record<DialogueDelivery, Pending | null> = { box: null, scene: null, caption: null };
  /** IDs requested that do not exist yet (for the dev HUD and audits). */
  readonly missing = new Set<DialogueId>();
  private readonly played: Set<DialogueId>;
  private readonly context: DialogueContext | null;

  constructor(
    private readonly bus: GameEventBus,
    private readonly lookup: DialogueLookup,
    opts: { readonly played?: Iterable<DialogueId>; readonly context?: DialogueContext } = {},
  ) {
    this.played = new Set(opts.played ?? []);
    this.context = opts.context ?? null;
  }

  /** True while a scene is showing: gameplay is paused. */
  get blocking(): boolean {
    return this.current.scene !== null;
  }

  showing(delivery: DialogueDelivery): DialogueId | null {
    return this.current[delivery]?.id ?? null;
  }

  /** Whether a sequence has been played (or is playing / queued) in this save. */
  hasPlayed(id: DialogueId): boolean {
    return this.played.has(id);
  }

  /** Every sequence played in this save, for the save file. */
  playedIds(): DialogueId[] {
    return [...this.played];
  }

  /**
   * Plays a sequence. Resolves when it has been shown and finished; at once
   * for unknown IDs, for already-played IDs (unless `repeat`) and for box
   * lines dropped as stale.
   */
  play(id: DialogueId, opts: PlayOptions = {}): Promise<void> {
    const delivery = this.lookup.delivery(id);
    if (delivery === null) {
      this.missing.add(id);
      return Promise.resolve();
    }
    const repeat = opts.repeat === true;
    if (!repeat) {
      if (this.played.has(id)) return Promise.resolve();
      this.played.add(id);
    }
    const ctx = this.context;
    return new Promise<void>((resolve) => {
      this.queues[delivery].push({
        id,
        resolve,
        repeat,
        queuedAt: ctx?.clock() ?? 0,
        screenId: ctx?.screenId() ?? null,
        sectionId: ctx?.sectionId() ?? null,
      });
      this.advance(delivery);
    });
  }

  /** The UI has finished showing `id`. Unknown or stale IDs are ignored. */
  finished(id: DialogueId): void {
    for (const d of ['scene', 'box', 'caption'] as const) {
      const cur = this.current[d];
      if (cur && cur.id === id) {
        this.current[d] = null;
        this.bus.emit(GameEvents.DialogueFinished, { sequenceId: id });
        cur.resolve();
        this.advance(d);
        return;
      }
    }
  }

  /** Drops queued box lines that have gone stale. Call once per tick. */
  dropStale(): void {
    const q = this.queues.box;
    for (let i = q.length - 1; i >= 0; i--) {
      const p = q[i];
      if (p && this.isStale(p)) {
        q.splice(i, 1);
        this.discard(p);
      }
    }
  }

  /** Finishes everything at once (debug walk, quitting). */
  finishAll(): void {
    for (const d of ['scene', 'box', 'caption'] as const) {
      while (this.current[d]) {
        const cur = this.current[d];
        if (cur) this.finished(cur.id);
      }
    }
  }

  /** Drops everything without resolving events (scene shutdown). Promises resolve so awaiting scripts end. */
  clear(): void {
    for (const d of ['scene', 'box', 'caption'] as const) {
      for (const p of this.queues[d].splice(0)) p.resolve();
      this.current[d]?.resolve();
      this.current[d] = null;
    }
  }

  private isStale(p: Pending): boolean {
    const ctx = this.context;
    if (!ctx) return false;
    if (p.screenId !== null && p.screenId !== ctx.screenId()) return true;
    if (p.sectionId !== null && ctx.isComplete(p.sectionId)) return true;
    return ctx.clock() - p.queuedAt > ctx.staleMs;
  }

  /** A dropped line never played, so it does not count as played. */
  private discard(p: Pending): void {
    if (!p.repeat) this.played.delete(p.id);
    p.resolve();
  }

  private advance(d: DialogueDelivery): void {
    if (this.current[d]) return;
    let next = this.queues[d].shift();
    while (next && d === 'box' && this.isStale(next)) {
      this.discard(next);
      next = this.queues[d].shift();
    }
    if (!next) return;
    this.current[d] = next;
    this.bus.emit(GameEvents.DialogueShow, { sequenceId: next.id });
  }
}

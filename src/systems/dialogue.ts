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
 */

import { GameEvents } from '../core/types';
import type { DialogueDelivery, DialogueId, GameEventBus } from '../core/types';

export interface DialogueLookup {
  /** Delivery of a sequence, or null if the ID is unknown. */
  delivery(id: DialogueId): DialogueDelivery | null;
}

interface Pending {
  readonly id: DialogueId;
  readonly resolve: () => void;
}

export class DialogueRunner {
  private readonly queues: Record<DialogueDelivery, Pending[]> = { box: [], scene: [], caption: [] };
  private readonly current: Record<DialogueDelivery, Pending | null> = { box: null, scene: null, caption: null };
  /** IDs requested that do not exist yet (for the dev HUD and audits). */
  readonly missing = new Set<DialogueId>();

  constructor(
    private readonly bus: GameEventBus,
    private readonly lookup: DialogueLookup,
  ) {}

  /** True while a scene is showing: gameplay is paused. */
  get blocking(): boolean {
    return this.current.scene !== null;
  }

  showing(delivery: DialogueDelivery): DialogueId | null {
    return this.current[delivery]?.id ?? null;
  }

  /** Plays a sequence. Resolves when it has been shown and finished (immediately for unknown IDs). */
  play(id: DialogueId): Promise<void> {
    const delivery = this.lookup.delivery(id);
    if (delivery === null) {
      this.missing.add(id);
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.queues[delivery].push({ id, resolve });
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

  private advance(d: DialogueDelivery): void {
    if (this.current[d]) return;
    const next = this.queues[d].shift();
    if (!next) return;
    this.current[d] = next;
    this.bus.emit(GameEvents.DialogueShow, { sequenceId: next.id });
  }
}

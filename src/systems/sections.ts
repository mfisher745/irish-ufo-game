/**
 * Base for every `Completable` (fight, boss, set piece, puzzle, deduction).
 * DESIGN.md sections 7.5 and 10, docs/chapters/README.md.
 *
 * A subclass calls `this.finish('player')` when the player completes it
 * normally, and implements `forceSolvedState(source)` to put the world in
 * the finished state for `completeNow()`. Both paths grant the same reward
 * and emit `section:completed` exactly once.
 */

import type { CompletableKind, CompletableSectionId, Completable, CompletionSource, Reward, SectionKind, SectionId } from '../core/types';

/** What a section needs from whoever hosts it (the world / session). */
export interface SectionHost {
  /** Grants a reward (pickups, evidence, abilities). */
  grantReward(reward: Reward | undefined): void;
  /** Records the completion and emits `section:completed`. */
  markCompleted(sectionId: SectionId, kind: SectionKind, by: CompletionSource): void;
}

export abstract class CompletableSection implements Completable {
  private done = false;
  /** Called after completion, for chapter scripts. */
  readonly onComplete: ((by: CompletionSource) => void)[] = [];

  constructor(
    readonly sectionId: CompletableSectionId,
    readonly kind: CompletableKind,
    protected readonly host: SectionHost,
    protected readonly reward?: Reward,
  ) {}

  isComplete(): boolean {
    return this.done;
  }

  completeNow(source: CompletionSource): void {
    if (this.done) return;
    this.forceSolvedState(source);
    this.finish(source);
  }

  /** Marks it done without rewards or events (rebuilding a chapter from a save). */
  restoreComplete(): void {
    this.done = true;
  }

  /** Marks the section done (normal completion path). Idempotent. */
  protected finish(by: CompletionSource): void {
    if (this.done) return;
    this.done = true;
    this.host.grantReward(this.reward);
    this.host.markCompleted(this.sectionId, this.kind, by);
    for (const cb of this.onComplete) cb(by);
  }

  /** Puts the world into the finished state (enemies down, puzzle solved). */
  protected abstract forceSolvedState(source: CompletionSource): void;
}

/**
 * A completable whose logic lives in a chapter script (custom set pieces,
 * puzzle kinds built by level-builder). `solve` puts the world in the solved
 * state; the script calls `complete('player')` when the player does it.
 */
export class ScriptedCompletable extends CompletableSection {
  constructor(
    sectionId: CompletableSectionId,
    kind: CompletableKind,
    host: SectionHost,
    private readonly solve: (source: CompletionSource) => void,
    reward?: Reward,
  ) {
    super(sectionId, kind, host, reward);
  }

  complete(by: CompletionSource): void {
    this.finish(by);
  }

  protected forceSolvedState(source: CompletionSource): void {
    this.solve(source);
  }
}

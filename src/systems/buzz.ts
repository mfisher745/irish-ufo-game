/**
 * Buzz meter. DESIGN.md section 7.1. Plain TypeScript.
 *
 * - Drains over time.
 * - Reaching the Banjaxed threshold starts the peak (boosted for
 *   `banjaxedPeakMs`, no drain), then Andrew falls over for
 *   `banjaxedFallenMs`, then Buzz is set to `banjaxedResetTo`.
 * - Dropping below the threshold during the peak (tea, a special) ends it
 *   with no fall.
 */

import { TUNING } from '../content/tuning';
import { BUZZ_STATES, GameEvents } from '../core/types';
import type { BanjaxedPhase, BuzzSnapshot, BuzzState, BuzzStateEffects, BuzzTuning, GameEventBus } from '../core/types';

export function buzzStateFor(value: number, t: BuzzTuning = TUNING.buzz): BuzzState {
  if (value >= t.thresholds.banjaxed) return 'banjaxed';
  if (value >= t.thresholds.locked) return 'locked';
  if (value >= t.thresholds.grand) return 'grand';
  return 'sober';
}

export const buzzStateRank = (s: BuzzState): number => BUZZ_STATES.indexOf(s);

export class Buzz {
  private v: number;
  private phase: BanjaxedPhase = 'none';
  private phaseMsLeft = 0;
  private lastState: BuzzState;
  /** Drain is held off this long after a drink (DESIGN.md 7.1). */
  private drainHoldMs = 0;

  constructor(
    private readonly bus: GameEventBus,
    initial = 0,
    private readonly t: BuzzTuning = TUNING.buzz,
  ) {
    this.v = Math.min(t.max, Math.max(0, initial));
    this.lastState = this.state;
  }

  get value(): number {
    return this.v;
  }

  get banjaxedPhase(): BanjaxedPhase {
    return this.phase;
  }

  get state(): BuzzState {
    return this.phase === 'none' ? buzzStateFor(this.v, this.t) : 'banjaxed';
  }

  /** True while Andrew is on the floor at the end of Banjaxed. */
  get fallen(): boolean {
    return this.phase === 'fallen';
  }

  effects(): BuzzStateEffects {
    return this.t.effects[this.state];
  }

  snapshot(): BuzzSnapshot {
    return { value: this.v, state: this.state, banjaxedPhase: this.phase, banjaxedPhaseMsLeft: this.phaseMsLeft };
  }

  /** Adds (or with a negative amount removes) Buzz. Drinking while fallen still counts. */
  add(amount: number): void {
    // Only drinks add Buzz, so a positive add starts the no-drain spell (one pint is worth having).
    if (amount > 0) this.drainHoldMs = this.t.drainDelayAfterDrinkMs;
    this.setValue(this.v + amount, true);
  }

  /** Spends Buzz for an ability. Returns false (and changes nothing) if there is not enough. */
  spend(amount: number): boolean {
    if (this.v < amount) return false;
    this.setValue(this.v - amount, true);
    return true;
  }

  /** Restores a saved value without events or Banjaxed (load, respawn, chapter start). */
  restore(value: number): void {
    this.v = Math.min(this.t.max, Math.max(0, value));
    this.phase = 'none';
    this.phaseMsLeft = 0;
    this.drainHoldMs = 0;
    this.lastState = this.state;
  }

  tick(dtMs: number): void {
    if (this.phase === 'peak') {
      this.phaseMsLeft -= dtMs;
      if (this.phaseMsLeft <= 0) this.setPhase('fallen', this.t.banjaxedFallenMs);
      return;
    }
    if (this.phase === 'fallen') {
      this.phaseMsLeft -= dtMs;
      if (this.phaseMsLeft <= 0) {
        this.setPhase('none', 0);
        this.setValue(this.t.banjaxedResetTo, false);
      }
      return;
    }
    if (this.drainHoldMs > 0) {
      this.drainHoldMs = Math.max(0, this.drainHoldMs - dtMs);
      return;
    }
    if (this.v > 0) {
      const before = Math.floor(this.v);
      const next = Math.max(0, this.v - (this.t.drainPerSecond * dtMs) / 1000);
      this.v = next;
      if (Math.floor(next) !== before) this.bus.emit(GameEvents.BuzzChanged, { value: next, delta: next - before });
      this.checkState();
    }
  }

  private setValue(next: number, mayStartBanjaxed: boolean): void {
    const clamped = Math.min(this.t.max, Math.max(0, next));
    const delta = clamped - this.v;
    this.v = clamped;
    if (delta !== 0) this.bus.emit(GameEvents.BuzzChanged, { value: clamped, delta });
    if (this.phase === 'peak' && clamped < this.t.thresholds.banjaxed) this.setPhase('none', 0);
    else if (mayStartBanjaxed && this.phase === 'none' && clamped >= this.t.thresholds.banjaxed) {
      this.setPhase('peak', this.t.banjaxedPeakMs);
    }
    this.checkState();
  }

  private setPhase(phase: BanjaxedPhase, ms: number): void {
    this.phase = phase;
    this.phaseMsLeft = ms;
    this.bus.emit(GameEvents.BuzzBanjaxedPhase, { phase });
    this.checkState();
  }

  private checkState(): void {
    const s = this.state;
    if (s !== this.lastState) {
      const from = this.lastState;
      this.lastState = s;
      this.bus.emit(GameEvents.BuzzStateChanged, { from, to: s });
    }
  }
}

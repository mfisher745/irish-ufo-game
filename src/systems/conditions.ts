/**
 * Hangover, timed effects and heat. DESIGN.md section 7.1,
 * docs/chapters/README.md "Carry-over rules", docs/chapters/08 "Heat".
 * Plain TypeScript.
 */

import { TUNING } from '../content/tuning';
import { GameEvents } from '../core/types';
import type {
  ActiveTimedEffect,
  BuzzState,
  ChapterNumber,
  GameEventBus,
  HangoverState,
  HangoverTuning,
  HeatSnapshot,
  HeatTuning,
  TimedEffectKind,
} from '../core/types';
import { buzzStateRank } from './buzz';

// ---------------------------------------------------------------------------
// Hangover
// ---------------------------------------------------------------------------

/** Whether ending `chapter` at `endState` causes a hangover in the next one. */
export function hangoverFromChapterEnd(chapter: ChapterNumber, endState: BuzzState, t: HangoverTuning = TUNING.hangover): boolean {
  return chapter >= t.carryOverFromChapterEnd && buzzStateRank(endState) >= buzzStateRank(t.triggerState);
}

/** Whether `chapter` starts hungover, given what the previous chapter's end carried. */
export function hangoverAtChapterStart(chapter: ChapterNumber, carried: boolean, t: HangoverTuning = TUNING.hangover): boolean {
  if (t.forcedAtChapterStart.includes(chapter)) return true;
  if (chapter <= t.carryOverFromChapterEnd) return false;
  return carried;
}

/** Max health while hungover or not. */
export function maxHealthFor(hungover: boolean, base = TUNING.player.maxHealth, t: HangoverTuning = TUNING.hangover): number {
  return hungover ? Math.round(base * t.maxHealthMultiplier) : base;
}

export class Hangover {
  private on: boolean;

  constructor(
    private readonly bus: GameEventBus,
    initial: HangoverState = { active: false },
  ) {
    this.on = initial.active;
  }

  get active(): boolean {
    return this.on;
  }

  state(): HangoverState {
    return { active: this.on };
  }

  start(): void {
    if (this.on) return;
    this.on = true;
    this.bus.emit(GameEvents.HangoverStarted, {});
  }

  /** Returns true if there was one to cure. */
  cure(): boolean {
    if (!this.on) return false;
    this.on = false;
    this.bus.emit(GameEvents.HangoverCured, {});
    return true;
  }

  restore(state: HangoverState): void {
    this.on = state.active;
  }
}

// ---------------------------------------------------------------------------
// Timed effects (bourbon speed, tequila sway, tea steady aim)
// ---------------------------------------------------------------------------

export class TimedEffects {
  private effects: ActiveTimedEffect[] = [];

  /** A new effect of the same kind replaces the old one (no stacking). */
  add(kind: TimedEffectKind, durationMs: number, magnitude: number): void {
    this.effects = this.effects.filter((e) => e.kind !== kind);
    this.effects.push({ kind, msLeft: durationMs, magnitude });
  }

  tick(dtMs: number): void {
    this.effects = this.effects.map((e) => ({ ...e, msLeft: e.msLeft - dtMs })).filter((e) => e.msLeft > 0);
  }

  active(): readonly ActiveTimedEffect[] {
    return this.effects;
  }

  has(kind: TimedEffectKind): boolean {
    return this.effects.some((e) => e.kind === kind);
  }

  magnitude(kind: TimedEffectKind, fallback: number): number {
    return this.effects.find((e) => e.kind === kind)?.magnitude ?? fallback;
  }

  speedMultiplier(): number {
    return this.magnitude('speedBoost', 1);
  }

  /** Multiplier on aim sway; steady aim wins over extra sway. */
  swayMultiplier(): number {
    if (this.has('steadyAim')) return 0;
    return this.magnitude('extraSway', 1);
  }

  clear(): void {
    this.effects = [];
  }
}

// ---------------------------------------------------------------------------
// Heat (chapter 8)
// ---------------------------------------------------------------------------

export interface HeatTickInput {
  readonly inShade: boolean;
  /** Moving at full speed (not sneaking, not standing). */
  readonly running: boolean;
}

export class Heat {
  private isActive = false;
  private v = 0;
  private lastEmitted = -1;

  constructor(
    private readonly bus: GameEventBus,
    private readonly t: HeatTuning = TUNING.heat,
  ) {}

  get active(): boolean {
    return this.isActive;
  }

  get value(): number {
    return this.v;
  }

  get full(): boolean {
    return this.isActive && this.v >= this.t.max;
  }

  snapshot(): HeatSnapshot {
    return { active: this.isActive, value: this.v };
  }

  /** Fraction 0..1. */
  fraction(): number {
    return this.v / this.t.max;
  }

  /** Thermal masts see Andrew above this. */
  visibleToThermal(): boolean {
    return this.isActive && this.v > this.t.max * this.t.thermalDetectFraction;
  }

  setActive(active: boolean): void {
    if (this.isActive === active) return;
    this.isActive = active;
    if (!active) this.v = 0;
    this.emit(true);
  }

  reset(): void {
    this.v = 0;
    this.emit(true);
  }

  /** Advances heat. Returns damage to apply this tick (full heat hurts). */
  tick(dtMs: number, input: HeatTickInput): number {
    if (!this.isActive) return 0;
    const s = dtMs / 1000;
    if (input.inShade) this.v = Math.max(0, this.v - this.t.fallPerSecondInShade * s);
    else this.v = Math.min(this.t.max, this.v + this.t.risePerSecondInSun * (input.running ? this.t.runningRiseMultiplier : 1) * s);
    this.emit(false);
    return this.v >= this.t.max ? this.t.fullHeatDamagePerSecond * s : 0;
  }

  private emit(force: boolean): void {
    const rounded = Math.floor(this.v);
    if (!force && rounded === this.lastEmitted) return;
    this.lastEmitted = rounded;
    this.bus.emit(GameEvents.HeatChanged, this.snapshot());
  }
}

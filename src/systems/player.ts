/**
 * Andrew: movement, sneak, aim, facing, health and death, plus the stats
 * that travel with him (Buzz, hangover, timed effects, heat, inventory,
 * abilities). DESIGN.md sections 6, 7.1 and 7.2. Plain TypeScript.
 *
 * WASD moves at `runSpeed`; Shift sneaks at `runSpeed * sneakSpeedMultiplier`.
 * There is no separate walk.
 */

import { TUNING } from '../content/tuning';
import { GameEvents } from '../core/types';
import type {
  BuzzStateEffects,
  ConsumableEffect,
  Facing,
  GameEventBus,
  Health,
  HitInfo,
  InputFrame,
  PlayerSnapshot,
  TileGrid,
  Vec2,
} from '../core/types';
import { Abilities } from './abilities';
import { Buzz } from './buzz';
import { decayVelocity } from './combat';
import { Hangover, Heat, TimedEffects, maxHealthFor } from './conditions';
import { angleOf, facingFromAngle, fromAngle, normalize, scale, sub, toRad } from './geometry';
import { moveBox } from './grid';
import type { ConsumableTarget } from './inventory';
import { Inventory } from './inventory';
import { PENDING_TUNING } from './pendingTuning';

export class Player implements ConsumableTarget {
  readonly instanceId = 'andrew';
  pos: Vec2 = { x: 0, y: 0 };
  facing: Facing = 'down';
  /** Aim angle after sway, degrees. */
  aimDeg = 90;
  /** Mouse aim point after sway. */
  aimPoint: Vec2 = { x: 0, y: 0 };
  moving = false;
  sneaking = false;
  /** Time standing still, for Act Natural. */
  stillMs = 0;
  dead = false;

  private hp: number;
  private invulnMs = 0;
  private dashMs = 0;
  private dashVel: Vec2 = { x: 0, y: 0 };
  private kb: Vec2 = { x: 0, y: 0 };
  private heldMs = 0;
  private stunMs = 0;
  private clockMs = 0;
  /** Set by the Myko call-in: nothing can hurt Andrew while Myko works. */
  protected_ = false;

  readonly buzz: Buzz;
  readonly hangover: Hangover;
  readonly timed = new TimedEffects();
  readonly heat: Heat;
  readonly inventory: Inventory;
  readonly abilities: Abilities;

  constructor(
    private readonly bus: GameEventBus,
    snap: PlayerSnapshot,
  ) {
    this.buzz = new Buzz(bus, snap.buzz);
    this.hangover = new Hangover(bus, snap.hangover);
    this.heat = new Heat(bus);
    this.inventory = new Inventory(bus, { slots: snap.drinkSlots, selected: snap.selectedDrink, empties: snap.empties });
    this.abilities = new Abilities(bus, snap.unlockedAbilities, snap.selectedSpecial);
    this.hp = Math.min(snap.health, this.maxHealth);
  }

  get maxHealth(): number {
    return maxHealthFor(this.hangover.active);
  }

  get health(): Health {
    return { current: this.hp, max: this.maxHealth };
  }

  get invulnerable(): boolean {
    return this.invulnMs > 0 || this.protected_;
  }

  get dodging(): boolean {
    return this.dashMs > 0;
  }

  get held(): boolean {
    return this.heldMs > 0;
  }

  /** On the floor: Banjaxed fall or stun. */
  get incapacitated(): boolean {
    return this.buzz.fallen || this.stunMs > 0 || this.dead;
  }

  get canAct(): boolean {
    return !this.incapacitated && !this.held && !this.dodging;
  }

  effects(): BuzzStateEffects {
    return this.buzz.effects();
  }

  snapshot(): PlayerSnapshot {
    return {
      health: this.hp,
      buzz: this.buzz.value,
      empties: this.inventory.empties,
      drinkSlots: this.inventory.slots(),
      selectedDrink: this.inventory.selected,
      selectedSpecial: this.abilities.selectedSpecial(),
      unlockedAbilities: this.abilities.unlocked(),
      hangover: this.hangover.state(),
    };
  }

  restore(snap: PlayerSnapshot): void {
    this.buzz.restore(snap.buzz);
    this.hangover.restore(snap.hangover);
    this.inventory.restore(snap.drinkSlots, snap.selectedDrink, snap.empties);
    this.abilities.restore(snap.unlockedAbilities, snap.selectedSpecial);
    this.timed.clear();
    this.hp = Math.min(snap.health, this.maxHealth);
    this.dead = false;
    this.invulnMs = 0;
    this.dashMs = 0;
    this.kb = { x: 0, y: 0 };
    this.heldMs = 0;
    this.stunMs = 0;
  }

  /** Movement and aim for one tick. Returns the distance moved. */
  move(dtMs: number, input: InputFrame, grid: TileGrid, extraBlocked?: (c: number, r: number) => boolean): number {
    this.clockMs += dtMs;
    this.invulnMs = Math.max(0, this.invulnMs - dtMs);
    this.heldMs = Math.max(0, this.heldMs - dtMs);
    this.stunMs = Math.max(0, this.stunMs - dtMs);
    const fx = this.effects();
    const heatSway = this.heat.full ? TUNING.buzz.effects.locked.aimSwayDeg : 0;

    // Aim with sway (Locked and above, tequila, full heat; tea steadies).
    const rawAim = angleOf(sub(input.aim, this.pos));
    const swayAmp = Math.max(fx.aimSwayDeg, heatSway) * this.timed.swayMultiplier();
    const sway = swayAmp * Math.sin((this.clockMs / PENDING_TUNING.player.swayPeriodMs) * Math.PI * 2);
    this.aimDeg = rawAim + sway;
    const aimDist = Math.hypot(input.aim.x - this.pos.x, input.aim.y - this.pos.y);
    this.aimPoint = { x: this.pos.x + Math.cos(toRad(this.aimDeg)) * aimDist, y: this.pos.y + Math.sin(toRad(this.aimDeg)) * aimDist };

    const w = PENDING_TUNING.player.bodyWidth;
    const h = PENDING_TUNING.player.bodyHeight;
    let delta: Vec2 = { x: 0, y: 0 };
    this.sneaking = input.held.has('sneak');

    if (this.dashMs > 0) {
      const t = Math.min(dtMs, this.dashMs);
      this.dashMs -= dtMs;
      delta = scale(this.dashVel, t / 1000);
    } else if (!this.incapacitated && !this.held) {
      const dir = normalize(input.move);
      if (dir.x !== 0 || dir.y !== 0) {
        let speed = TUNING.player.runSpeed * this.timed.speedMultiplier();
        if (this.sneaking) speed *= TUNING.player.sneakSpeedMultiplier;
        let v = scale(dir, speed);
        if (fx.movementDrift > 0) {
          const driftAngle = (this.clockMs / PENDING_TUNING.player.driftPeriodMs) * 360;
          v = { x: v.x + fromAngle(driftAngle).x * fx.movementDrift * speed, y: v.y + fromAngle(driftAngle).y * fx.movementDrift * speed };
        }
        delta = scale(v, dtMs / 1000);
        this.facing = facingFromAngle(angleOf(dir));
      }
    }
    if (this.kb.x !== 0 || this.kb.y !== 0) {
      delta = { x: delta.x + (this.kb.x * dtMs) / 1000, y: delta.y + (this.kb.y * dtMs) / 1000 };
      this.kb = decayVelocity(this.kb, PENDING_TUNING.combat.knockbackDecayPerSecond, dtMs);
    }
    const before = this.pos;
    const res = moveBox(grid, this.pos, w, h, delta, extraBlocked);
    this.pos = res.position;
    const moved = Math.hypot(this.pos.x - before.x, this.pos.y - before.y);
    const tryingToMove = input.move.x !== 0 || input.move.y !== 0;
    this.moving = moved > 0.01 && tryingToMove;
    this.stillMs = tryingToMove || this.dashMs > 0 ? 0 : this.stillMs + dtMs;
    return moved;
  }

  /** Faces the aim (used when attacking). */
  faceAim(): void {
    this.facing = facingFromAngle(this.aimDeg);
  }

  startDodge(dashDistance: number, invulnerableMs: number, dirHint: Vec2): void {
    let dir = normalize(dirHint);
    if (dir.x === 0 && dir.y === 0) dir = fromAngle(this.aimDeg);
    const ms = PENDING_TUNING.player.stumbleDashMs;
    this.dashMs = ms;
    this.dashVel = scale(dir, (dashDistance / ms) * 1000);
    this.invulnMs = Math.max(this.invulnMs, invulnerableMs);
    this.heldMs = 0;
  }

  /** Returns true if the hit landed. Emits events; death is reported via `dead`. */
  takeHit(hit: HitInfo): boolean {
    if (this.dead || this.invulnerable) return false;
    const fx = this.effects();
    this.hp = Math.max(0, this.hp - hit.amount);
    this.kb = scale(hit.knockback, 1 - fx.knockbackResistance);
    if (hit.holdMs > 0) this.heldMs = hit.holdMs;
    if (hit.stunMs > 0) this.stunMs = hit.stunMs;
    this.invulnMs = PENDING_TUNING.player.hurtInvulnerableMs;
    this.bus.emit(GameEvents.PlayerDamaged, { hit, health: this.health });
    if (this.hp <= 0) this.dead = true;
    return true;
  }

  /** Environmental damage that ignores invulnerability frames (heat). */
  drain(amount: number): void {
    if (this.dead || amount <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.dead = true;
  }

  // ConsumableTarget
  addBuzz(amount: number): void {
    this.buzz.add(amount);
  }

  heal(amount: number): void {
    const before = this.hp;
    this.hp = Math.min(this.maxHealth, this.hp + amount);
    if (this.hp > before) this.bus.emit(GameEvents.PlayerHealed, { amount: this.hp - before, health: this.health });
  }

  healFull(): void {
    this.heal(this.maxHealth);
  }

  cureHangover(): void {
    this.hangover.cure();
  }

  resetHeat(): void {
    this.heat.reset();
  }

  addTimed(effect: ConsumableEffect & { kind: 'timed' }): void {
    this.timed.add(effect.effect, effect.durationMs, effect.magnitude);
  }

  /** Clamp health after max changes (hangover start). */
  clampHealth(): void {
    this.hp = Math.min(this.hp, this.maxHealth);
  }

  setHealth(v: number): void {
    this.hp = Math.max(0, Math.min(this.maxHealth, v));
  }

  /** Noise radius of Andrew's footsteps right now; 0 when silent. DESIGN.md 7.3. */
  footstepNoiseRadius(): number {
    if (!this.moving) return 0;
    const fx = this.effects();
    const base = TUNING.player.footstepNoiseRadius;
    if (this.sneaking) {
      const loud = Math.max(0, fx.footstepNoiseMultiplier - 1) * base * PENDING_TUNING.stealth.lockedSneakNoiseFactor;
      return Math.max(TUNING.player.sneakNoiseRadius, loud);
    }
    return base * fx.footstepNoiseMultiplier;
  }
}

/** A fresh Chapter 1 snapshot. */
export function freshPlayerSnapshot(): PlayerSnapshot {
  return {
    health: TUNING.player.maxHealth,
    buzz: 0,
    empties: 0,
    drinkSlots: [null, null, null],
    selectedDrink: 0,
    selectedSpecial: null,
    unlockedAbilities: [],
    hangover: { active: false },
  };
}

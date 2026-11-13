/**
 * Player abilities, driven by `AbilityDef`s in tuning. DESIGN.md sections 6
 * and 7.2. Plain TypeScript: this decides *what* happens from input and
 * resources and returns `AbilityAction`s; the world resolves hits.
 *
 * - Left click: the melee ability (punch combo, or Hurley once unlocked,
 *   which replaces it).
 * - Right click: Bottle Throw on press. Once Sliotar Strike is unlocked, right
 *   click throws on release instead: held for `chargeMs` or more it is a
 *   Sliotar Strike, shorter it is a bottle.
 * - Space: The Stumble.
 * - F: the selected special (Stout Slam, Poitin Breath, the Glove); R cycles.
 *   Specials are locked while Sober (`specialsUnlocked` in the Buzz effects).
 * - Act Natural is passive and handled by stealth.
 */

import { TUNING } from '../content/tuning';
import { GameEvents, SPECIAL_ABILITIES } from '../core/types';
import type { AbilityDef, AbilityId, AttackShape, BuzzStateEffects, GameEventBus, InputFrame, SpecialAbilityId } from '../core/types';

export type AbilityAction =
  | {
      readonly kind: 'melee';
      readonly abilityId: AbilityId;
      readonly shape: AttackShape;
      readonly damage: number;
      readonly knockback: number;
      /** 0-based index in the combo. */
      readonly comboIndex: number;
      readonly comboLength: number;
      /** > 0 when the swing can deflect projectiles (Hurley). */
      readonly deflectWindowMs: number;
    }
  | {
      readonly kind: 'projectile';
      readonly abilityId: AbilityId;
      readonly shape: Extract<AttackShape, { kind: 'projectile' }>;
      readonly damage: number;
      readonly knockback: number;
      readonly stunMs: number;
    }
  | { readonly kind: 'dodge'; readonly abilityId: AbilityId; readonly dashDistance: number; readonly invulnerableMs: number }
  | {
      readonly kind: 'area';
      readonly abilityId: AbilityId;
      readonly shape: AttackShape;
      readonly damage: number;
      readonly knockback: number;
      readonly stunMs: number;
    };

/** Why an ability did not fire, for HUD feedback. */
export type AbilityRefusal = 'cooldown' | 'sober' | 'noBuzz' | 'noEmpties' | 'recharging' | 'locked';

export interface AbilityResources {
  readonly effects: BuzzStateEffects;
  readonly buzz: number;
  readonly empties: number;
  spendBuzz(amount: number): boolean;
  spendEmpties(amount: number): boolean;
}

export interface AbilityContext extends AbilityResources {
  /** False while stunned, fallen, held or in a scene. Dodge still works while held. */
  readonly canAct: boolean;
  readonly held: boolean;
}

/** Abilities a chapter expects at its start (Chapter Select): everything unlocked before it. */
export function abilitiesForChapterStart(chapter: number, defs: Readonly<Record<AbilityId, AbilityDef>> = TUNING.abilities): AbilityId[] {
  return (Object.values(defs) as AbilityDef[]).filter((d) => d.unlockChapter < chapter).map((d) => d.id);
}

export class Abilities {
  private readonly unlockedSet = new Set<AbilityId>();
  private readonly cooldowns = new Map<AbilityId, number>();
  private selected: SpecialAbilityId | null = null;
  private comboIndex = 0;
  private comboWindowLeft = 0;
  private rechargeLeft = 0;
  private charging = false;
  private chargeHeldMs = 0;
  /** Refusals from the last update, for feedback. */
  lastRefusal: AbilityRefusal | null = null;

  constructor(
    private readonly bus: GameEventBus,
    unlocked: readonly AbilityId[] = [],
    selected: SpecialAbilityId | null = null,
    private readonly defs: Readonly<Record<AbilityId, AbilityDef>> = TUNING.abilities,
  ) {
    for (const id of unlocked) this.unlockedSet.add(id);
    this.selected = selected ?? this.firstSpecial();
  }

  unlocked(): readonly AbilityId[] {
    return [...this.unlockedSet];
  }

  has(id: AbilityId): boolean {
    return this.unlockedSet.has(id);
  }

  selectedSpecial(): SpecialAbilityId | null {
    return this.selected;
  }

  restore(unlocked: readonly AbilityId[], selected: SpecialAbilityId | null): void {
    this.unlockedSet.clear();
    for (const id of unlocked) this.unlockedSet.add(id);
    this.selected = selected ?? this.firstSpecial();
    this.cooldowns.clear();
    this.comboIndex = 0;
    this.rechargeLeft = 0;
    this.charging = false;
  }

  unlock(id: AbilityId): void {
    if (this.unlockedSet.has(id)) return;
    this.unlockedSet.add(id);
    this.bus.emit(GameEvents.AbilityUnlocked, { abilityId: id });
    if (isSpecial(id) && this.selected === null) {
      this.selected = id;
      this.bus.emit(GameEvents.AbilitySelectedSpecial, { abilityId: id });
    }
  }

  /** The ability that currently answers a slot, honouring `replaces`. */
  activeFor(slot: AbilityDef['slot']): AbilityId | null {
    const candidates = [...this.unlockedSet].filter((id) => this.defs[id].slot === slot);
    const replaced = new Set(candidates.map((id) => this.defs[id].replaces).filter((r): r is AbilityId => r !== undefined));
    return candidates.find((id) => !replaced.has(id)) ?? null;
  }

  cycleSpecial(): void {
    const owned = SPECIAL_ABILITIES.filter((id) => this.unlockedSet.has(id));
    if (owned.length === 0) return;
    const i = this.selected ? owned.indexOf(this.selected) : -1;
    const next = owned[(i + 1) % owned.length];
    if (next === undefined || next === this.selected) return;
    this.selected = next;
    this.bus.emit(GameEvents.AbilitySelectedSpecial, { abilityId: next });
  }

  /** 0..1 Sliotar charge while right click is held, 0 otherwise. */
  chargeProgress(): number {
    if (!this.charging) return 0;
    const chargeMs = this.defs.sliotarStrike.chargeMs ?? 1;
    return Math.min(1, this.chargeHeldMs / chargeMs);
  }

  /** 0..1 Glove recharge remaining (1 = just used). */
  gloveRecharge(): number {
    const cost = this.defs.borrowedGlove.cost;
    return cost.kind === 'recharge' && cost.rechargeMs > 0 ? this.rechargeLeft / cost.rechargeMs : 0;
  }

  cooldownLeft(id: AbilityId): number {
    return this.cooldowns.get(id) ?? 0;
  }

  update(dtMs: number, input: InputFrame, ctx: AbilityContext): AbilityAction[] {
    this.lastRefusal = null;
    for (const [id, left] of this.cooldowns) {
      const next = left - dtMs;
      if (next <= 0) this.cooldowns.delete(id);
      else this.cooldowns.set(id, next);
    }
    this.rechargeLeft = Math.max(0, this.rechargeLeft - dtMs);
    if (this.comboWindowLeft > 0) {
      this.comboWindowLeft -= dtMs;
      if (this.comboWindowLeft <= 0) this.comboIndex = 0;
    }

    const out: AbilityAction[] = [];
    if (input.pressed.has('cycleSpecial')) this.cycleSpecial();

    if (input.pressed.has('dodge') && (ctx.canAct || ctx.held)) {
      const a = this.tryDodge(ctx);
      if (a) out.push(a);
    }
    if (!ctx.canAct) {
      this.charging = false;
      return out;
    }

    if (input.pressed.has('melee')) {
      const a = this.tryMelee(ctx);
      if (a) out.push(a);
    }

    const sliotar = this.has('sliotarStrike');
    if (sliotar) {
      if (input.pressed.has('ranged')) {
        this.charging = true;
        this.chargeHeldMs = 0;
      }
      if (this.charging && input.held.has('ranged')) this.chargeHeldMs = input.holdMs.ranged ?? this.chargeHeldMs + dtMs;
      if (this.charging && input.released.has('ranged')) {
        const held = input.holdMs.ranged ?? this.chargeHeldMs;
        this.charging = false;
        const chargeMs = this.defs.sliotarStrike.chargeMs ?? 0;
        const a = held >= chargeMs ? this.tryProjectile('sliotarStrike', ctx) : this.tryProjectile('bottleThrow', ctx);
        if (a) out.push(a);
      }
    } else if (input.pressed.has('ranged') && this.has('bottleThrow')) {
      const a = this.tryProjectile('bottleThrow', ctx);
      if (a) out.push(a);
    }

    if (input.pressed.has('special')) {
      const a = this.trySpecial(ctx);
      if (a) out.push(a);
    }
    for (const a of out) this.bus.emit(GameEvents.AbilityUsed, { abilityId: a.abilityId });
    return out;
  }

  private ready(id: AbilityId): boolean {
    if (this.cooldowns.has(id)) {
      this.lastRefusal = 'cooldown';
      return false;
    }
    return true;
  }

  private startCooldown(id: AbilityId, effects: BuzzStateEffects): void {
    const ms = this.defs[id].cooldownMs / Math.max(0.01, effects.attackSpeedMultiplier);
    if (ms > 0) this.cooldowns.set(id, ms);
  }

  private tryDodge(ctx: AbilityContext): AbilityAction | null {
    const id = this.activeFor('dodge');
    if (!id || !this.ready(id)) return null;
    const def = this.defs[id];
    this.startCooldown(id, ctx.effects);
    return { kind: 'dodge', abilityId: id, dashDistance: def.dashDistance ?? 0, invulnerableMs: def.invulnerableMs ?? 0 };
  }

  private tryMelee(ctx: AbilityContext): AbilityAction | null {
    const id = this.activeFor('melee');
    if (!id || !this.ready(id)) return null;
    const def = this.defs[id];
    const combo = def.combo ?? [];
    const idx = combo.length > 0 ? this.comboIndex % combo.length : 0;
    const hit = combo[idx];
    this.startCooldown(id, ctx.effects);
    if (hit && idx < combo.length - 1) {
      this.comboIndex = idx + 1;
      this.comboWindowLeft = hit.windowMs;
    } else {
      this.comboIndex = 0;
      this.comboWindowLeft = 0;
    }
    return {
      kind: 'melee',
      abilityId: id,
      shape: def.shape,
      damage: hit?.damage ?? def.damage,
      knockback: hit?.knockback ?? def.knockback,
      comboIndex: idx,
      comboLength: Math.max(1, combo.length),
      deflectWindowMs: def.deflectWindowMs ?? 0,
    };
  }

  private tryProjectile(id: 'bottleThrow' | 'sliotarStrike', ctx: AbilityContext): AbilityAction | null {
    if (!this.has(id)) {
      this.lastRefusal = 'locked';
      return null;
    }
    const def = this.defs[id];
    if (def.shape.kind !== 'projectile' || !this.ready(id)) return null;
    if (!this.payCost(def, ctx)) return null;
    this.startCooldown(id, ctx.effects);
    return { kind: 'projectile', abilityId: id, shape: def.shape, damage: def.damage, knockback: def.knockback, stunMs: def.stunMs ?? 0 };
  }

  private trySpecial(ctx: AbilityContext): AbilityAction | null {
    const id = this.selected;
    if (!id || !this.has(id)) {
      this.lastRefusal = 'locked';
      return null;
    }
    if (!ctx.effects.specialsUnlocked) {
      this.lastRefusal = 'sober';
      return null;
    }
    const def = this.defs[id];
    if (!this.ready(id) || !this.payCost(def, ctx)) return null;
    this.startCooldown(id, ctx.effects);
    return { kind: 'area', abilityId: id, shape: def.shape, damage: def.damage, knockback: def.knockback, stunMs: def.stunMs ?? 0 };
  }

  private payCost(def: AbilityDef, ctx: AbilityContext): boolean {
    const cost = def.cost;
    switch (cost.kind) {
      case 'none':
        return true;
      case 'buzz':
        if (!ctx.spendBuzz(cost.amount)) {
          this.lastRefusal = 'noBuzz';
          return false;
        }
        return true;
      case 'empties':
        if (!ctx.spendEmpties(cost.amount)) {
          this.lastRefusal = 'noEmpties';
          return false;
        }
        return true;
      case 'recharge':
        if (this.rechargeLeft > 0) {
          this.lastRefusal = 'recharging';
          return false;
        }
        this.rechargeLeft = cost.rechargeMs;
        return true;
    }
  }

  private firstSpecial(): SpecialAbilityId | null {
    return SPECIAL_ABILITIES.find((id) => this.unlockedSet.has(id)) ?? null;
  }
}

export function isSpecial(id: AbilityId): id is SpecialAbilityId {
  return (SPECIAL_ABILITIES as readonly AbilityId[]).includes(id);
}

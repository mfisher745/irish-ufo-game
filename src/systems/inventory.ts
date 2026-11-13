/**
 * Drink slots, empties and consumables. DESIGN.md sections 6 and 7.1.
 * Plain TypeScript.
 *
 * - Three fixed slots, one drink type each, up to `drinkSlotCap`.
 * - A new drink type with no free slot stays on the ground.
 * - Partial pickups take what fits and leave the rest.
 * - Food is eaten on pickup and stays put if it would do nothing.
 */

import { TUNING } from '../content/tuning';
import { GameEvents } from '../core/types';
import type {
  ConsumableEffect,
  DrinkId,
  DrinkSlot,
  DrinkSlotIndex,
  DrinkSlots,
  GameEventBus,
  PickupItem,
  PickupRefusal,
} from '../core/types';

export type PickupResult =
  | { readonly ok: true; readonly taken: PickupItem; readonly leftover: PickupItem | null }
  | { readonly ok: false; readonly reason: PickupRefusal };

export class Inventory {
  private slotsArr: [DrinkSlot | null, DrinkSlot | null, DrinkSlot | null];
  private selectedIdx: DrinkSlotIndex;
  private emptiesCount: number;

  constructor(
    private readonly bus: GameEventBus,
    init: { slots?: DrinkSlots; selected?: DrinkSlotIndex; empties?: number } = {},
    private readonly cap = TUNING.player.drinkSlotCap,
    private readonly maxEmpties = TUNING.player.maxEmpties,
  ) {
    const s = init.slots ?? [null, null, null];
    this.slotsArr = [s[0], s[1], s[2]];
    this.selectedIdx = init.selected ?? 0;
    this.emptiesCount = init.empties ?? 0;
  }

  slots(): DrinkSlots {
    return [this.slotsArr[0], this.slotsArr[1], this.slotsArr[2]];
  }

  get selected(): DrinkSlotIndex {
    return this.selectedIdx;
  }

  get empties(): number {
    return this.emptiesCount;
  }

  restore(slots: DrinkSlots, selected: DrinkSlotIndex, empties: number): void {
    this.slotsArr = [slots[0], slots[1], slots[2]];
    this.selectedIdx = selected;
    this.emptiesCount = empties;
  }

  select(index: DrinkSlotIndex): void {
    this.selectedIdx = index;
    this.bus.emit(GameEvents.DrinkSelected, { index, drinkId: this.slotsArr[index]?.drinkId ?? null });
  }

  /** Mouse wheel. Steps through all three slots, wrapping. */
  cycle(step: 1 | -1): void {
    this.select((((this.selectedIdx + step) % 3) + 3) % 3 as DrinkSlotIndex);
  }

  /** Whether a drink or empties pickup would be taken at all (food is checked by the player). */
  canTake(item: PickupItem): PickupRefusal | null {
    if (item.kind === 'drink') {
      const existing = this.slotsArr.find((s) => s?.drinkId === item.drinkId);
      if (existing) return existing.count >= this.cap ? 'slotFull' : null;
      return this.slotsArr.includes(null) ? null : 'noFreeSlot';
    }
    if (item.kind === 'empties') return this.emptiesCount >= this.maxEmpties ? 'emptiesFull' : null;
    return null;
  }

  /** Takes a drink or empties pickup. Food is not handled here. */
  take(item: PickupItem): PickupResult {
    const refusal = this.canTake(item);
    if (refusal) return { ok: false, reason: refusal };
    if (item.kind === 'drink') {
      let idx = this.slotsArr.findIndex((s) => s?.drinkId === item.drinkId);
      if (idx < 0) idx = this.slotsArr.indexOf(null);
      const slot = this.slotsArr[idx as DrinkSlotIndex];
      const have = slot?.count ?? 0;
      const taken = Math.min(item.count, this.cap - have);
      this.slotsArr[idx as DrinkSlotIndex] = { drinkId: item.drinkId, count: have + taken };
      const leftover = item.count - taken;
      if (idx === this.selectedIdx) this.bus.emit(GameEvents.DrinkSelected, { index: this.selectedIdx, drinkId: item.drinkId });
      return {
        ok: true,
        taken: { ...item, count: taken },
        leftover: leftover > 0 ? { ...item, count: leftover } : null,
      };
    }
    if (item.kind === 'empties') {
      const taken = Math.min(item.count, this.maxEmpties - this.emptiesCount);
      this.setEmpties(this.emptiesCount + taken);
      const leftover = item.count - taken;
      return { ok: true, taken: { ...item, count: taken }, leftover: leftover > 0 ? { ...item, count: leftover } : null };
    }
    return { ok: false, reason: 'noEffect' };
  }

  /** Drinks one of the selected drink. Returns its ID, or null if the slot is empty. Adds empties. */
  drinkSelected(): DrinkId | null {
    const slot = this.slotsArr[this.selectedIdx];
    if (!slot) return null;
    this.slotsArr[this.selectedIdx] = slot.count > 1 ? { drinkId: slot.drinkId, count: slot.count - 1 } : null;
    const def = TUNING.drinks[slot.drinkId];
    if (def.emptiesLeft > 0) this.setEmpties(Math.min(this.maxEmpties, this.emptiesCount + def.emptiesLeft));
    this.bus.emit(GameEvents.DrinkConsumed, { drinkId: slot.drinkId });
    this.bus.emit(GameEvents.DrinkSelected, { index: this.selectedIdx, drinkId: this.slotsArr[this.selectedIdx]?.drinkId ?? null });
    return slot.drinkId;
  }

  spendEmpties(n: number): boolean {
    if (this.emptiesCount < n) return false;
    this.setEmpties(this.emptiesCount - n);
    return true;
  }

  private setEmpties(n: number): void {
    if (n === this.emptiesCount) return;
    this.emptiesCount = n;
    this.bus.emit(GameEvents.EmptiesChanged, { count: n });
  }
}

/** What a consumable can act on. The player implements this. */
export interface ConsumableTarget {
  addBuzz(amount: number): void;
  heal(amount: number): void;
  healFull(): void;
  cureHangover(): void;
  resetHeat(): void;
  addTimed(effect: ConsumableEffect & { kind: 'timed' }): void;
}

export function applyConsumable(effects: readonly ConsumableEffect[], target: ConsumableTarget): void {
  for (const e of effects) {
    switch (e.kind) {
      case 'buzz':
        target.addBuzz(e.amount);
        break;
      case 'heal':
        target.heal(e.amount);
        break;
      case 'healFull':
        target.healFull();
        break;
      case 'cureHangover':
        target.cureHangover();
        break;
      case 'resetHeat':
        target.resetHeat();
        break;
      case 'timed':
        target.addTimed(e);
        break;
    }
  }
}

export interface ConsumableContext {
  readonly healthMissing: number;
  readonly hungover: boolean;
  readonly buzz: number;
  readonly heat: number;
}

/**
 * Whether eating something would do anything. Timed effects alone do not
 * count (tea with nothing to cure and no Buzz stays where it is).
 */
export function wouldHaveEffect(effects: readonly ConsumableEffect[], ctx: ConsumableContext): boolean {
  return effects.some((e) => {
    switch (e.kind) {
      case 'heal':
      case 'healFull':
        return ctx.healthMissing > 0;
      case 'cureHangover':
        return ctx.hungover;
      case 'buzz':
        return e.amount > 0 || ctx.buzz > 0;
      case 'resetHeat':
        return ctx.heat > 0;
      case 'timed':
        return false;
    }
  });
}

/** Whether a drink contains alcohol (anything that adds Buzz). */
export function isAlcoholic(drinkId: DrinkId): boolean {
  return TUNING.drinks[drinkId].effects.some((e) => e.kind === 'buzz' && e.amount > 0);
}

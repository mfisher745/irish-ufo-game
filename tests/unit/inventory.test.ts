/** DESIGN.md sections 6 and 7.1: slots, empties, food, and the drink and food tables. */

import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/content/tuning';
import { EventBus } from '../../src/core/events';
import type { DrinkId, FoodId } from '../../src/core/types';
import { Inventory, applyConsumable, isAlcoholic, wouldHaveEffect } from '../../src/systems/inventory';
import { Player, freshPlayerSnapshot } from '../../src/systems/player';
import { record } from './helpers';

const DRINKS: DrinkId[] = ['stout', 'whiskey', 'poitin', 'lightBeer', 'bourbon', 'craftIpa', 'tequila', 'water'];
const FOODS: FoodId[] = ['crisps', 'chickenFilletRoll', 'breakfastRoll', 'spiceBag', 'tea'];

const drink = (id: DrinkId, count = 1) => ({ kind: 'drink', drinkId: id, count }) as const;

describe('drink slots', () => {
  it('has exactly three slots and starts empty', () => {
    const inv = new Inventory(new EventBus());
    expect(inv.slots()).toEqual([null, null, null]);
    expect(inv.slots()).toHaveLength(3);
  });

  it('puts a new type in the first free slot and stacks the same type', () => {
    const inv = new Inventory(new EventBus());
    inv.take(drink('stout'));
    inv.take(drink('whiskey'));
    inv.take(drink('stout'));
    expect(inv.slots()).toEqual([{ drinkId: 'stout', count: 2 }, { drinkId: 'whiskey', count: 1 }, null]);
  });

  it('caps one slot at drinkSlotCap and refuses the overflow as slotFull', () => {
    expect(TUNING.player.drinkSlotCap).toBeGreaterThanOrEqual(1);
    const cap = TUNING.player.drinkSlotCap;
    const inv = new Inventory(new EventBus());
    const r = inv.take(drink('stout', cap));
    expect(r).toMatchObject({ ok: true, leftover: null });
    expect(inv.take(drink('stout'))).toEqual({ ok: false, reason: 'slotFull' });
    expect(inv.slots()[0]?.count).toBe(cap);
  });

  it('a partial pickup takes what fits and returns the leftover', () => {
    const cap = TUNING.player.drinkSlotCap;
    const inv = new Inventory(new EventBus());
    inv.take(drink('stout', cap - 1));
    const r = inv.take(drink('stout', 5));
    expect(r.ok && r.taken).toEqual(drink('stout', 1));
    expect(r.ok && r.leftover).toEqual(drink('stout', 4));
  });

  it('refuses a fourth drink type with noFreeSlot and leaves the slots untouched', () => {
    const inv = new Inventory(new EventBus());
    inv.take(drink('stout'));
    inv.take(drink('whiskey'));
    inv.take(drink('bourbon'));
    const before = inv.slots();
    expect(inv.take(drink('tequila'))).toEqual({ ok: false, reason: 'noFreeSlot' });
    expect(inv.canTake(drink('tequila'))).toBe('noFreeSlot');
    expect(inv.slots()).toEqual(before);
  });

  it('a slot freed by drinking the last one accepts a new type', () => {
    const inv = new Inventory(new EventBus());
    inv.take(drink('stout'));
    inv.take(drink('whiskey'));
    inv.take(drink('bourbon'));
    inv.drinkSelected();
    expect(inv.take(drink('tequila')).ok).toBe(true);
    expect(inv.slots()[0]?.drinkId).toBe('tequila');
  });

  it('selects by index and wheel, wrapping both ways', () => {
    const inv = new Inventory(new EventBus());
    const sel = record(new EventBus(), 'drink:selected');
    expect(sel).toEqual([]);
    inv.select(2);
    expect(inv.selected).toBe(2);
    inv.cycle(1);
    expect(inv.selected).toBe(0);
    inv.cycle(-1);
    expect(inv.selected).toBe(2);
  });

  it('drinking an empty slot does nothing', () => {
    const bus = new EventBus();
    const drunk = record(bus, 'drink:consumed');
    const inv = new Inventory(bus);
    expect(inv.drinkSelected()).toBeNull();
    expect(inv.empties).toBe(0);
    expect(drunk).toEqual([]);
  });

  it('drinking removes one and emits drink:consumed', () => {
    const bus = new EventBus();
    const drunk = record(bus, 'drink:consumed');
    const inv = new Inventory(bus);
    inv.take(drink('stout', 2));
    expect(inv.drinkSelected()).toBe('stout');
    expect(inv.slots()[0]).toEqual({ drinkId: 'stout', count: 1 });
    expect(drunk).toEqual([{ drinkId: 'stout' }]);
  });
});

describe('empties', () => {
  it.each(DRINKS.filter((d) => d !== 'water'))('drinking %s leaves one empty', (id) => {
    const inv = new Inventory(new EventBus(), { slots: [{ drinkId: id, count: 1 }, null, null] });
    inv.drinkSelected();
    expect(inv.empties).toBe(1);
  });

  it('water is the only drink that leaves no empty', () => {
    const inv = new Inventory(new EventBus(), { slots: [{ drinkId: 'water', count: 1 }, null, null] });
    inv.drinkSelected();
    expect(inv.empties).toBe(0);
    for (const id of DRINKS) expect(TUNING.drinks[id].emptiesLeft).toBe(id === 'water' ? 0 : 1);
  });

  it('empties cap at maxEmpties; extra is a leftover, and a full pouch refuses', () => {
    const max = TUNING.player.maxEmpties;
    const inv = new Inventory(new EventBus(), { empties: max - 2 });
    const r = inv.take({ kind: 'empties', count: 5 });
    expect(r.ok && r.taken).toEqual({ kind: 'empties', count: 2 });
    expect(r.ok && r.leftover).toEqual({ kind: 'empties', count: 3 });
    expect(inv.empties).toBe(max);
    expect(inv.take({ kind: 'empties', count: 1 })).toEqual({ ok: false, reason: 'emptiesFull' });
  });

  it('drinking at the cap does not push empties over it', () => {
    const max = TUNING.player.maxEmpties;
    const inv = new Inventory(new EventBus(), { slots: [{ drinkId: 'stout', count: 1 }, null, null], empties: max });
    inv.drinkSelected();
    expect(inv.empties).toBe(max);
  });

  it('spendEmpties is all or nothing', () => {
    const inv = new Inventory(new EventBus(), { empties: 1 });
    expect(inv.spendEmpties(2)).toBe(false);
    expect(inv.empties).toBe(1);
    expect(inv.spendEmpties(1)).toBe(true);
    expect(inv.empties).toBe(0);
  });

  it('emits empties:changed on each change', () => {
    const bus = new EventBus();
    const seen = record(bus, 'empties:changed');
    const inv = new Inventory(bus, { slots: [{ drinkId: 'stout', count: 2 }, null, null] });
    inv.drinkSelected();
    inv.spendEmpties(1);
    expect(seen.map((e) => e.count)).toEqual([1, 0]);
  });
});

describe('food is eaten on pickup and refused when it would do nothing', () => {
  const ctx = (o: Partial<{ healthMissing: number; hungover: boolean; buzz: number; heat: number }> = {}) => ({
    healthMissing: 0,
    hungover: false,
    buzz: 0,
    heat: 0,
    ...o,
  });

  it('crisps need missing health', () => {
    expect(wouldHaveEffect(TUNING.food.crisps.effects, ctx())).toBe(false);
    expect(wouldHaveEffect(TUNING.food.crisps.effects, ctx({ healthMissing: 1 }))).toBe(true);
    expect(wouldHaveEffect(TUNING.food.crisps.effects, ctx({ hungover: true }))).toBe(false);
  });

  it.each(['chickenFilletRoll', 'breakfastRoll'] as const)('%s works for missing health or a hangover, not neither', (id) => {
    const fx = TUNING.food[id].effects;
    expect(wouldHaveEffect(fx, ctx())).toBe(false);
    expect(wouldHaveEffect(fx, ctx({ healthMissing: 5 }))).toBe(true);
    expect(wouldHaveEffect(fx, ctx({ hungover: true }))).toBe(true);
  });

  it('the spice bag needs missing health', () => {
    expect(wouldHaveEffect(TUNING.food.spiceBag.effects, ctx())).toBe(false);
    expect(wouldHaveEffect(TUNING.food.spiceBag.effects, ctx({ healthMissing: 1 }))).toBe(true);
    expect(wouldHaveEffect(TUNING.food.spiceBag.effects, ctx({ hungover: true }))).toBe(false);
  });

  it('tea works with any Buzz, or a hangover; steady aim alone does not count', () => {
    expect(wouldHaveEffect(TUNING.food.tea.effects, ctx())).toBe(false);
    expect(wouldHaveEffect(TUNING.food.tea.effects, ctx({ buzz: 10 }))).toBe(true);
    expect(wouldHaveEffect(TUNING.food.tea.effects, ctx({ hungover: true }))).toBe(true);
  });

  it('water needs some heat', () => {
    expect(wouldHaveEffect(TUNING.drinks.water.effects, ctx())).toBe(false);
    expect(wouldHaveEffect(TUNING.drinks.water.effects, ctx({ heat: 10 }))).toBe(true);
  });

  it('every food ID has a definition with a name and pickup text ID', () => {
    for (const id of FOODS) {
      expect(TUNING.food[id].id).toBe(id);
      expect(TUNING.food[id].effects.length).toBeGreaterThan(0);
    }
  });

  it('food never goes into a slot', () => {
    const inv = new Inventory(new EventBus());
    expect(inv.take({ kind: 'food', foodId: 'crisps' })).toEqual({ ok: false, reason: 'noEffect' });
    expect(inv.slots()).toEqual([null, null, null]);
  });
});

describe('drink table (DESIGN 7.1)', () => {
  const fresh = () => new Player(new EventBus(), { ...freshPlayerSnapshot(), health: 50 });

  const buzzGain: Record<DrinkId, number> = {
    stout: 20,
    whiskey: 30,
    poitin: 60,
    lightBeer: 2,
    bourbon: 30,
    craftIpa: 15,
    tequila: 40,
    water: 0,
  };
  it.each(DRINKS)('%s gives the Buzz in the table', (id) => {
    const p = fresh();
    applyConsumable(TUNING.drinks[id].effects, p);
    expect(p.buzz.value).toBe(buzzGain[id]);
  });

  it('only the stout heals, by 15', () => {
    for (const id of DRINKS) {
      const p = fresh();
      applyConsumable(TUNING.drinks[id].effects, p);
      expect(p.health.current).toBe(id === 'stout' ? 65 : 50);
    }
  });

  it('bourbon gives a short speed boost', () => {
    const p = fresh();
    applyConsumable(TUNING.drinks.bourbon.effects, p);
    expect(p.timed.speedMultiplier()).toBeGreaterThan(1);
    const ms = p.timed.active().find((e) => e.kind === 'speedBoost')?.msLeft ?? 0;
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(15_000);
  });

  it('tequila adds sway', () => {
    const p = fresh();
    applyConsumable(TUNING.drinks.tequila.effects, p);
    expect(p.timed.swayMultiplier()).toBeGreaterThan(1);
  });

  it('no other drink adds a timed effect', () => {
    for (const id of DRINKS.filter((d) => d !== 'bourbon' && d !== 'tequila')) {
      const p = fresh();
      applyConsumable(TUNING.drinks[id].effects, p);
      expect(p.timed.active()).toEqual([]);
    }
  });

  it('every alcoholic drink adds Buzz and water is not alcoholic', () => {
    for (const id of DRINKS) expect(isAlcoholic(id)).toBe(id !== 'water');
  });
});

describe('food table (DESIGN 7.1)', () => {
  const hurt = () => new Player(new EventBus(), { ...freshPlayerSnapshot(), health: 20, buzz: 50, hangover: { active: false } });

  it('crisps heal 10', () => {
    const p = hurt();
    applyConsumable(TUNING.food.crisps.effects, p);
    expect(p.health.current).toBe(30);
    expect(p.buzz.value).toBe(50);
  });

  it.each(['chickenFilletRoll', 'breakfastRoll'] as const)('%s heals 40', (id) => {
    const p = hurt();
    applyConsumable(TUNING.food[id].effects, p);
    expect(p.health.current).toBe(60);
  });

  it('the spice bag heals fully, up to a reduced hangover maximum', () => {
    const p = hurt();
    applyConsumable(TUNING.food.spiceBag.effects, p);
    expect(p.health.current).toBe(100);
    const h = new Player(new EventBus(), { ...freshPlayerSnapshot(), health: 10, hangover: { active: true } });
    applyConsumable(TUNING.food.spiceBag.effects, h);
    expect(h.health.current).toBe(75);
  });

  it('tea takes 25 Buzz off, never below 0, and steadies aim for 20 seconds', () => {
    const p = hurt();
    applyConsumable(TUNING.food.tea.effects, p);
    expect(p.buzz.value).toBe(25);
    expect(p.timed.active().find((e) => e.kind === 'steadyAim')?.msLeft).toBe(20_000);
    const low = new Player(new EventBus(), { ...freshPlayerSnapshot(), buzz: 10 });
    applyConsumable(TUNING.food.tea.effects, low);
    expect(low.buzz.value).toBe(0);
  });

  it('healing never exceeds the maximum', () => {
    const p = new Player(new EventBus(), freshPlayerSnapshot());
    applyConsumable(TUNING.food.chickenFilletRoll.effects, p);
    expect(p.health.current).toBe(100);
  });
});

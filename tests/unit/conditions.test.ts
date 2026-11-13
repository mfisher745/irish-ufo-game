/** DESIGN.md 7.1 hangover, docs/chapters/README.md carry-over rules, timed effects and heat. */

import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/content/tuning';
import { EventBus } from '../../src/core/events';
import type { BuzzState, ChapterNumber } from '../../src/core/types';
import {
  Hangover,
  Heat,
  TimedEffects,
  hangoverAtChapterStart,
  hangoverFromChapterEnd,
  maxHealthFor,
} from '../../src/systems/conditions';
import { applyConsumable } from '../../src/systems/inventory';
import { freshPlayerSnapshot, Player } from '../../src/systems/player';
import { record } from './helpers';

const CHAPTERS: ChapterNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const STATES: BuzzState[] = ['sober', 'grand', 'locked', 'banjaxed'];

describe('hangover carry-over (README: from the end of chapter 3 on)', () => {
  it('chapters 1 and 2 never carry a hangover, whatever the Buzz', () => {
    for (const ch of [1, 2] as const) for (const s of STATES) expect(hangoverFromChapterEnd(ch, s)).toBe(false);
  });

  it.each([
    ['sober', false],
    ['grand', false],
    ['locked', true],
    ['banjaxed', true],
  ] as const)('ending chapter 3 at %s carries a hangover: %s', (state, expected) => {
    expect(hangoverFromChapterEnd(3, state)).toBe(expected);
  });

  it('the same threshold applies to every later chapter', () => {
    for (const ch of CHAPTERS.filter((c) => c >= 3)) {
      expect(hangoverFromChapterEnd(ch, 'grand')).toBe(false);
      expect(hangoverFromChapterEnd(ch, 'locked')).toBe(true);
      expect(hangoverFromChapterEnd(ch, 'banjaxed')).toBe(true);
    }
  });

  it('chapters 1 to 3 never START with a hangover, even if one was carried', () => {
    for (const ch of [1, 2, 3] as const) {
      expect(hangoverAtChapterStart(ch, true)).toBe(false);
      expect(hangoverAtChapterStart(ch, false)).toBe(false);
    }
  });

  it('chapter 4 ALWAYS starts with a hangover regardless of what was carried', () => {
    expect(hangoverAtChapterStart(4, false)).toBe(true);
    expect(hangoverAtChapterStart(4, true)).toBe(true);
  });

  it('chapters 5 to 10 start hungover only when one was carried', () => {
    for (const ch of CHAPTERS.filter((c) => c >= 5)) {
      expect(hangoverAtChapterStart(ch, true)).toBe(true);
      expect(hangoverAtChapterStart(ch, false)).toBe(false);
    }
  });

  it('tuning matches the DESIGN numbers', () => {
    expect(TUNING.hangover.carryOverFromChapterEnd).toBe(3);
    expect(TUNING.hangover.forcedAtChapterStart).toEqual([4]);
    expect(TUNING.hangover.triggerState).toBe('locked');
    expect(TUNING.hangover.maxHealthMultiplier).toBe(0.75);
  });
});

describe('hangover effect on health', () => {
  it('maximum health is reduced by 25 per cent', () => {
    expect(maxHealthFor(false)).toBe(TUNING.player.maxHealth);
    expect(maxHealthFor(true)).toBe(TUNING.player.maxHealth * 0.75);
    expect(maxHealthFor(true, 80)).toBe(60);
  });

  it('a hungover Player has the lower maximum and clamps current health', () => {
    const snap = { ...freshPlayerSnapshot(), hangover: { active: true } };
    const p = new Player(new EventBus(), snap);
    expect(p.maxHealth).toBe(75);
    expect(p.health.current).toBe(75);
    expect(p.health.max).toBe(75);
  });

  it('curing it restores the full maximum', () => {
    const p = new Player(new EventBus(), { ...freshPlayerSnapshot(), hangover: { active: true } });
    p.cureHangover();
    expect(p.maxHealth).toBe(100);
  });
});

describe('Hangover state', () => {
  it('starts once and cures once, with events', () => {
    const bus = new EventBus();
    const started = record(bus, 'hangover:started');
    const cured = record(bus, 'hangover:cured');
    const h = new Hangover(bus);
    h.start();
    h.start();
    expect(h.active).toBe(true);
    expect(started).toHaveLength(1);
    expect(h.cure()).toBe(true);
    expect(h.cure()).toBe(false);
    expect(cured).toHaveLength(1);
    expect(h.active).toBe(false);
  });
});

describe('hangover cures (DESIGN food table)', () => {
  const hungover = () => new Player(new EventBus(), { ...freshPlayerSnapshot(), hangover: { active: true } });

  it.each(['tea', 'chickenFilletRoll', 'breakfastRoll'] as const)('%s cures a hangover', (food) => {
    const p = hungover();
    applyConsumable(TUNING.food[food].effects, p);
    expect(p.hangover.active).toBe(false);
  });

  it.each(['crisps', 'spiceBag'] as const)('%s does not cure a hangover', (food) => {
    const p = hungover();
    applyConsumable(TUNING.food[food].effects, p);
    expect(p.hangover.active).toBe(true);
  });

  it('alcohol does not cure it', () => {
    const p = hungover();
    applyConsumable(TUNING.drinks.stout.effects, p);
    expect(p.hangover.active).toBe(true);
  });
});

describe('timed effects', () => {
  it('a newer effect of the same kind replaces the old one', () => {
    const t = new TimedEffects();
    t.add('speedBoost', 1000, 1.2);
    t.add('speedBoost', 5000, 1.5);
    expect(t.active()).toHaveLength(1);
    expect(t.speedMultiplier()).toBe(1.5);
  });

  it('effects expire exactly when their time runs out', () => {
    const t = new TimedEffects();
    t.add('speedBoost', 1000, 1.35);
    t.tick(999);
    expect(t.has('speedBoost')).toBe(true);
    t.tick(1);
    expect(t.has('speedBoost')).toBe(false);
    expect(t.speedMultiplier()).toBe(1);
  });

  it('steady aim (tea) beats extra sway (tequila)', () => {
    const t = new TimedEffects();
    t.add('extraSway', 10_000, 1.6);
    expect(t.swayMultiplier()).toBe(1.6);
    t.add('steadyAim', 500, 1);
    expect(t.swayMultiplier()).toBe(0);
    t.tick(600);
    expect(t.swayMultiplier()).toBe(1.6);
  });
});

describe('heat (chapter 8)', () => {
  const sun = { inShade: false, running: false } as const;

  it('does nothing while inactive', () => {
    const h = new Heat(new EventBus());
    expect(h.tick(10_000, sun)).toBe(0);
    expect(h.value).toBe(0);
  });

  it('rises in sun, faster running, falls in shade, never below zero', () => {
    const h = new Heat(new EventBus());
    h.setActive(true);
    h.tick(10_000, sun);
    const walking = h.value;
    expect(walking).toBeCloseTo(TUNING.heat.risePerSecondInSun * 10, 5);
    h.reset();
    h.tick(10_000, { inShade: false, running: true });
    expect(h.value).toBeGreaterThan(walking);
    h.tick(1000, { inShade: true, running: false });
    h.tick(60_000, { inShade: true, running: false });
    expect(h.value).toBe(0);
  });

  it('at full heat Andrew takes slow damage, and water (reset) stops it', () => {
    const h = new Heat(new EventBus());
    h.setActive(true);
    h.tick((TUNING.heat.max / TUNING.heat.risePerSecondInSun) * 1000 + 1, sun);
    expect(h.full).toBe(true);
    expect(h.tick(1000, sun)).toBeCloseTo(TUNING.heat.fullHeatDamagePerSecond, 5);
    h.reset();
    expect(h.full).toBe(false);
    expect(h.tick(1000, sun)).toBe(0);
  });

  it('thermal masts see Andrew only above the threshold fraction', () => {
    const h = new Heat(new EventBus());
    h.setActive(true);
    h.tick(1000, sun);
    expect(h.visibleToThermal()).toBe(false);
    h.tick((TUNING.heat.max * 0.6) / TUNING.heat.risePerSecondInSun * 1000, sun);
    expect(h.visibleToThermal()).toBe(true);
  });

  it('water resets the meter through the consumable path', () => {
    const p = new Player(new EventBus(), freshPlayerSnapshot());
    p.heat.setActive(true);
    p.heat.tick(20_000, sun);
    expect(p.heat.value).toBeGreaterThan(0);
    applyConsumable(TUNING.drinks.water.effects, p);
    expect(p.heat.value).toBe(0);
  });

  it('turning heat off (sunset) zeroes and hides the meter', () => {
    const h = new Heat(new EventBus());
    h.setActive(true);
    h.tick(5000, sun);
    h.setActive(false);
    expect(h.snapshot()).toEqual({ active: false, value: 0 });
  });
});

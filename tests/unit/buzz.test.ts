/** DESIGN.md section 7.1: Buzz states, drain, multipliers and Banjaxed. */

import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/content/tuning';
import { EventBus } from '../../src/core/events';
import type { BuzzState } from '../../src/core/types';
import { Buzz, buzzStateFor } from '../../src/systems/buzz';
import { record } from './helpers';

describe('Buzz states and thresholds (DESIGN 7.1)', () => {
  const cases: [number, BuzzState][] = [
    [0, 'sober'],
    [19, 'sober'],
    [20, 'grand'],
    [59, 'grand'],
    [60, 'locked'],
    [89, 'locked'],
    [90, 'banjaxed'],
    [100, 'banjaxed'],
  ];
  it.each(cases)('value %i is %s', (value, state) => {
    expect(buzzStateFor(value)).toBe(state);
    expect(new Buzz(new EventBus(), value).state).toBe(state);
  });

  it('the meter runs 0 to 100', () => {
    expect(TUNING.buzz.max).toBe(100);
    const b = new Buzz(new EventBus(), 50);
    b.add(1000);
    expect(b.value).toBe(100);
    b.add(-1000);
    expect(b.value).toBe(0);
  });

  it.each([
    [19, 1, 'sober', 'grand'],
    [59, 1, 'grand', 'locked'],
    [89, 1, 'locked', 'banjaxed'],
  ] as const)('crossing %i + %i fires stateChanged %s -> %s exactly once', (start, add, from, to) => {
    const bus = new EventBus();
    const changes = record(bus, 'buzz:stateChanged');
    const b = new Buzz(bus, start);
    b.add(add);
    expect(changes).toEqual([{ from, to }]);
  });

  it('a negative change back across a threshold reports the reverse change', () => {
    const bus = new EventBus();
    const changes = record(bus, 'buzz:stateChanged');
    const b = new Buzz(bus, 60);
    b.add(-1);
    expect(changes).toEqual([{ from: 'locked', to: 'grand' }]);
  });

  it('does not fire stateChanged for a change inside a state', () => {
    const bus = new EventBus();
    const changes = record(bus, 'buzz:stateChanged');
    const b = new Buzz(bus, 25);
    b.add(10);
    expect(changes).toEqual([]);
  });

  it('emits buzz:changed with the delta', () => {
    const bus = new EventBus();
    const seen = record(bus, 'buzz:changed');
    const b = new Buzz(bus, 10);
    b.add(30);
    expect(seen).toEqual([{ value: 40, delta: 30 }]);
  });
});

describe('Buzz drain', () => {
  it('drains slowly and steadily', () => {
    expect(TUNING.buzz.drainPerSecond).toBeGreaterThan(0);
    expect(TUNING.buzz.drainPerSecond).toBeLessThan(2); // "drains slowly" over a 100 point meter
    const b = new Buzz(new EventBus(), 50);
    b.tick(10_000);
    expect(b.value).toBeCloseTo(50 - TUNING.buzz.drainPerSecond * 10, 5);
  });

  it('drain is independent of how the time is sliced', () => {
    const a = new Buzz(new EventBus(), 50);
    const c = new Buzz(new EventBus(), 50);
    a.tick(5000);
    for (let i = 0; i < 500; i++) c.tick(10);
    expect(c.value).toBeCloseTo(a.value, 5);
  });

  it('never goes below zero and a zero meter stays at zero', () => {
    const b = new Buzz(new EventBus(), 1);
    b.tick(60_000);
    expect(b.value).toBe(0);
    b.tick(1000);
    expect(b.value).toBe(0);
  });

  it('draining across a threshold changes state', () => {
    const bus = new EventBus();
    const changes = record(bus, 'buzz:stateChanged');
    const b = new Buzz(bus, 20.2);
    b.tick(1000);
    expect(b.state).toBe('sober');
    expect(changes).toEqual([{ from: 'grand', to: 'sober' }]);
  });

  it('spend refuses more than it has and changes nothing', () => {
    const b = new Buzz(new EventBus(), 10);
    expect(b.spend(20)).toBe(false);
    expect(b.value).toBe(10);
    expect(b.spend(10)).toBe(true);
    expect(b.value).toBe(0);
  });
});

describe('Buzz state effects (DESIGN 7.1 table)', () => {
  it('damage multipliers are x1, x1.5, x2 and x2.5', () => {
    const fx = (v: number) => new Buzz(new EventBus(), v).effects();
    expect(fx(0).damageMultiplier).toBe(1);
    expect(fx(19).damageMultiplier).toBe(1);
    expect(fx(20).damageMultiplier).toBe(1.5);
    expect(fx(59).damageMultiplier).toBe(1.5);
    expect(fx(60).damageMultiplier).toBe(2);
    expect(fx(89).damageMultiplier).toBe(2);
    expect(fx(90).damageMultiplier).toBe(2.5);
  });

  it('specials are locked when Sober and unlocked above it', () => {
    const fx = (v: number) => new Buzz(new EventBus(), v).effects();
    expect(fx(0).specialsUnlocked).toBe(false);
    expect(fx(19).specialsUnlocked).toBe(false);
    expect(fx(20).specialsUnlocked).toBe(true);
    expect(fx(60).specialsUnlocked).toBe(true);
    expect(fx(95).specialsUnlocked).toBe(true);
  });

  it('Grand attacks faster than Sober', () => {
    const sober = TUNING.buzz.effects.sober;
    expect(sober.attackSpeedMultiplier).toBe(1);
    expect(TUNING.buzz.effects.grand.attackSpeedMultiplier).toBeGreaterThan(1);
  });

  it('Sober has steady aim and Grand has no sway or drift', () => {
    for (const s of ['sober', 'grand'] as const) {
      const e = TUNING.buzz.effects[s];
      expect(e.aimSwayDeg).toBe(0);
      expect(e.movementDrift).toBe(0);
      expect(e.screenWobble).toBe(0);
      expect(e.knockbackResistance).toBe(0);
    }
  });

  it('Locked adds knockback resistance, sway, drift, louder footsteps and wobble', () => {
    for (const s of ['locked', 'banjaxed'] as const) {
      const e = TUNING.buzz.effects[s];
      expect(e.knockbackResistance).toBeGreaterThan(0);
      expect(e.aimSwayDeg).toBeGreaterThan(0);
      expect(e.movementDrift).toBeGreaterThan(0);
      expect(e.footstepNoiseMultiplier).toBeGreaterThan(1);
      expect(e.screenWobble).toBeGreaterThan(0);
    }
  });

  it('effects follow the state during the Banjaxed fall as well', () => {
    const b = new Buzz(new EventBus(), 0);
    b.add(100);
    b.tick(TUNING.buzz.banjaxedPeakMs);
    expect(b.fallen).toBe(true);
    expect(b.effects().damageMultiplier).toBe(2.5);
  });
});

describe('Banjaxed (8 s peak, 2 s fall, then Buzz 30)', () => {
  it('uses the DESIGN numbers', () => {
    expect(TUNING.buzz.banjaxedPeakMs).toBe(8000);
    expect(TUNING.buzz.banjaxedFallenMs).toBe(2000);
    expect(TUNING.buzz.banjaxedResetTo).toBe(30);
  });

  it('reaching 90 starts the peak', () => {
    const bus = new EventBus();
    const phases = record(bus, 'buzz:banjaxedPhase');
    const b = new Buzz(bus, 80);
    b.add(10);
    expect(b.banjaxedPhase).toBe('peak');
    expect(b.snapshot().banjaxedPhaseMsLeft).toBe(8000);
    expect(phases).toEqual([{ phase: 'peak' }]);
  });

  it('holds the x2.5 state, without draining, for the whole peak', () => {
    const b = new Buzz(new EventBus(), 0);
    b.add(95);
    b.tick(7999);
    expect(b.banjaxedPhase).toBe('peak');
    expect(b.state).toBe('banjaxed');
    expect(b.value).toBe(95);
    expect(b.effects().damageMultiplier).toBe(2.5);
  });

  it('falls over at 8 s and stays down for 2 s', () => {
    const bus = new EventBus();
    const phases = record(bus, 'buzz:banjaxedPhase');
    const b = new Buzz(bus, 0);
    b.add(100);
    b.tick(8000);
    expect(b.banjaxedPhase).toBe('fallen');
    expect(b.fallen).toBe(true);
    b.tick(1999);
    expect(b.fallen).toBe(true);
    b.tick(1);
    expect(b.fallen).toBe(false);
    expect(phases.map((p) => p.phase)).toEqual(['peak', 'fallen', 'none']);
  });

  it('Buzz drops to 30 and the state is Grand afterwards', () => {
    const bus = new EventBus();
    const changes = record(bus, 'buzz:stateChanged');
    const b = new Buzz(bus, 0);
    b.add(100);
    b.tick(8000);
    b.tick(2000);
    expect(b.value).toBe(30);
    expect(b.state).toBe('grand');
    expect(changes.at(-1)).toEqual({ from: 'banjaxed', to: 'grand' });
  });

  it('a large single tick still walks the phases in order (window resume)', () => {
    const b = new Buzz(new EventBus(), 0);
    b.add(100);
    b.tick(60_000);
    // One tick moves one phase; the second finishes the fall. It must never skip the fall.
    expect(b.banjaxedPhase).toBe('fallen');
    b.tick(60_000);
    expect(b.banjaxedPhase).toBe('none');
    expect(b.value).toBe(30);
  });

  it('dropping below 90 during the peak (tea) ends it with no fall', () => {
    const bus = new EventBus();
    const phases = record(bus, 'buzz:banjaxedPhase');
    const b = new Buzz(bus, 0);
    b.add(95);
    b.add(-25);
    expect(b.banjaxedPhase).toBe('none');
    expect(b.state).toBe('locked');
    b.tick(20_000);
    expect(phases.map((p) => p.phase)).toEqual(['peak', 'none']);
  });

  it('a second drink during the peak does not restart or extend it', () => {
    const b = new Buzz(new EventBus(), 0);
    b.add(92);
    b.tick(5000);
    b.add(5);
    b.tick(3000);
    expect(b.banjaxedPhase).toBe('fallen');
  });

  it('restore() into a saved value never starts Banjaxed and clears any phase', () => {
    const b = new Buzz(new EventBus(), 0);
    b.add(100);
    b.restore(20);
    expect(b.banjaxedPhase).toBe('none');
    expect(b.value).toBe(20);
  });
});

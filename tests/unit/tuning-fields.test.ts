/** Tuning that moved out of the deleted pendingTuning.ts, and the new Tuning fields. */

import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/content/tuning';

describe('boss movement and daze tuning', () => {
  it('every boss and set piece has a moveSpeed; the ram outruns Andrew and the lockdown stands still', () => {
    for (const [id, b] of Object.entries(TUNING.bosses)) {
      expect(typeof b.moveSpeed, id).toBe('number');
      expect(b.moveSpeed, id).toBeGreaterThanOrEqual(0);
      for (const p of b.phases) if (p.moveSpeed !== undefined) expect(p.moveSpeed, `${id}.${p.id}`).toBeGreaterThanOrEqual(0);
    }
    expect(TUNING.bosses['c2.setpiece.ram'].moveSpeed).toBeGreaterThan(TUNING.player.runSpeed);
    expect(TUNING.bosses['c9.setpiece.lockdown'].moveSpeed).toBe(0);
  });

  it('a boss that can be dazed has both daze fields, with a stun and a damage bonus', () => {
    for (const [id, b] of Object.entries(TUNING.bosses)) {
      expect(b.dazedMs !== undefined, id).toBe(b.dazedDamageMultiplier !== undefined);
      if (b.dazedMs !== undefined) {
        expect(b.dazedMs, id).toBeGreaterThan(0);
        expect(b.dazedDamageMultiplier, id).toBeGreaterThan(1);
      }
    }
    expect(TUNING.bosses['c1.boss.bigtom'].dazedMs).toBe(2000);
  });
});

describe('player, combat, world, myko and audio tuning', () => {
  const nonNegative = (o: object, label: string): void => {
    for (const [k, v] of Object.entries(o)) if (typeof v === 'number') expect(v, `${label}.${k}`).toBeGreaterThanOrEqual(0);
  };

  it('every numeric field is present and non-negative', () => {
    nonNegative(TUNING.player, 'player');
    nonNegative(TUNING.combat, 'combat');
    nonNegative(TUNING.world, 'world');
    nonNegative(TUNING.myko, 'myko');
    nonNegative(TUNING.stealth, 'stealth');
  });

  it('the values the systems divide by or loop on are positive', () => {
    expect(TUNING.player.runSpeed).toBeGreaterThan(0);
    expect(TUNING.player.hurtInvulnerableMs).toBeGreaterThan(0);
    expect(TUNING.player.stumbleDashMs).toBeGreaterThan(0);
    expect(TUNING.player.swayPeriodMs).toBeGreaterThan(0);
    expect(TUNING.player.driftPeriodMs).toBeGreaterThan(0);
    expect(TUNING.player.deathRespawnDelayMs).toBeGreaterThan(0);
    expect(TUNING.combat.betweenWavesMs).toBeGreaterThan(0);
    expect(TUNING.combat.chargeSpeed).toBeGreaterThan(0);
    expect(TUNING.combat.repathMs).toBeGreaterThan(0);
    expect(TUNING.stealth.footstepIntervalMs).toBeGreaterThan(0);
    expect(TUNING.world.pushHoldMs).toBeGreaterThan(0);
  });

  it('relationships hold: aggro beyond the disguise reveal, fractions and chances within 0..1', () => {
    expect(TUNING.combat.aggroRange).toBeGreaterThan(TUNING.combat.disguiseRevealRange);
    for (const v of [TUNING.myko.tangentChance, TUNING.myko.drinkCommentChance, TUNING.myko.heatWarnFraction, TUNING.stealth.patrolSpeedFraction, TUNING.combat.rangedPreferredFraction]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(TUNING.myko.strollSpeed).toBeLessThan(TUNING.player.runSpeed);
  });

  it('audio defaults are volumes between 0 and 1', () => {
    for (const v of Object.values(TUNING.audioDefaults)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

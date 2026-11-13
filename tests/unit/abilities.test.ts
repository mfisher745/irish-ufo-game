/** DESIGN.md 7.2: abilities, costs, unlocks, Stumble, Glove, special cycling. */

import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/content/tuning';
import { EventBus } from '../../src/core/events';
import type { AbilityId } from '../../src/core/types';
import { Abilities, abilitiesForChapterStart } from '../../src/systems/abilities';
import { Player, freshPlayerSnapshot } from '../../src/systems/player';
import { abilities, abilityContext, frame, openGrid } from './helpers';

describe('unlock chapters (DESIGN 7.2)', () => {
  const expected: Record<AbilityId, number> = {
    punchCombo: 1,
    bottleThrow: 2,
    stumble: 3,
    stoutSlam: 4,
    actNatural: 5,
    hurley: 6,
    sliotarStrike: 7,
    poitinBreath: 8,
    borrowedGlove: 9,
  };
  it.each(Object.entries(expected))('%s unlocks in chapter %i', (id, ch) => {
    expect(TUNING.abilities[id as AbilityId].unlockChapter).toBe(ch);
  });

  it('a chapter start has every ability from earlier chapters', () => {
    expect(abilitiesForChapterStart(1)).toEqual([]);
    expect([...abilitiesForChapterStart(2)]).toEqual(['punchCombo']);
    expect(abilitiesForChapterStart(4).sort()).toEqual(['bottleThrow', 'punchCombo', 'stumble']);
    expect(abilitiesForChapterStart(10)).toHaveLength(9);
  });

  it('chapter 10 start includes the Glove (unlocked in 9) but not later ones', () => {
    expect(abilitiesForChapterStart(10)).toContain('borrowedGlove');
  });

  it('unlock emits once and is idempotent', () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.on('ability:unlocked', (e) => seen.push(e.abilityId));
    const a = new Abilities(bus);
    a.unlock('stumble');
    a.unlock('stumble');
    expect(seen).toEqual(['stumble']);
  });
});

describe('costs', () => {
  it('Stout Slam costs 20 Buzz, Poitin Breath 40, Bottle Throw one empty', () => {
    expect(TUNING.abilities.stoutSlam.cost).toEqual({ kind: 'buzz', amount: 20 });
    expect(TUNING.abilities.poitinBreath.cost).toEqual({ kind: 'buzz', amount: 40 });
    expect(TUNING.abilities.bottleThrow.cost).toEqual({ kind: 'empties', amount: 1 });
  });

  it('Stout Slam spends exactly 20 Buzz', () => {
    const a = abilities(['stoutSlam']);
    const c = abilityContext('grand', 50);
    const out = a.update(1, frame({ pressed: ['special'] }), c);
    expect(out[0]?.abilityId).toBe('stoutSlam');
    expect(c.buzz).toBe(30);
  });

  it('Stout Slam with 19 Buzz is refused (noBuzz) and spends nothing', () => {
    const a = abilities(['stoutSlam']);
    const c = abilityContext('grand', 19);
    expect(a.update(1, frame({ pressed: ['special'] }), c)).toEqual([]);
    expect(a.lastRefusal).toBe('noBuzz');
    expect(c.buzz).toBe(19);
  });

  it('Poitin Breath spends 40 and is refused at 39', () => {
    const a = abilities(['poitinBreath']);
    const c = abilityContext('grand', 39);
    expect(a.update(1, frame({ pressed: ['special'] }), c)).toEqual([]);
    const c2 = abilityContext('locked', 70);
    expect(a.update(1, frame({ pressed: ['special'] }), c2)[0]?.abilityId).toBe('poitinBreath');
    expect(c2.buzz).toBe(30);
  });

  it('Bottle Throw uses one empty, refuses with none', () => {
    const a = abilities(['bottleThrow']);
    const c = abilityContext('grand', 50, 1);
    expect(a.update(1, frame({ pressed: ['ranged'] }), c)[0]?.abilityId).toBe('bottleThrow');
    expect(c.empties).toBe(0);
    a.update(2000, frame(), c);
    expect(a.update(1, frame({ pressed: ['ranged'] }), c)).toEqual([]);
    expect(a.lastRefusal).toBe('noEmpties');
  });

  it('a bottle is thrown from the first press, locked abilities do nothing', () => {
    const a = abilities(['punchCombo']);
    const c = abilityContext();
    expect(a.update(1, frame({ pressed: ['ranged'] }), c)).toEqual([]);
    expect(a.update(1, frame({ pressed: ['special'] }), c)).toEqual([]);
    expect(a.update(1, frame({ pressed: ['dodge'] }), c)).toEqual([]);
  });
});

describe('specials are locked while Sober', () => {
  it.each(['stoutSlam', 'poitinBreath', 'borrowedGlove'] as const)('%s refused when Sober', (id) => {
    const a = abilities([id]);
    const c = abilityContext('sober', 19);
    expect(a.update(1, frame({ pressed: ['special'] }), c)).toEqual([]);
    expect(a.lastRefusal).toBe('sober');
    expect(c.buzz).toBe(19);
  });
});

describe('melee: punch combo and Hurley', () => {
  it('three hits, the third a haymaker with knockback', () => {
    const a = abilities(['punchCombo']);
    const c = abilityContext();
    const hits = [];
    for (let i = 0; i < 3; i++) {
      hits.push(...a.update(1, frame({ pressed: ['melee'] }), c));
      a.update(TUNING.abilities.punchCombo.cooldownMs, frame(), c);
    }
    const m = hits.map((h) => (h.kind === 'melee' ? h : null));
    expect(m.map((h) => h?.comboIndex)).toEqual([0, 1, 2]);
    expect(m[2]?.knockback).toBeGreaterThan(m[0]?.knockback ?? 0);
    expect(m[2]?.damage).toBeGreaterThan(m[0]?.damage ?? 0);
  });

  it('the combo restarts after the window lapses and after the haymaker', () => {
    const a = abilities(['punchCombo']);
    const c = abilityContext();
    const idx = (): number | undefined => {
      const o = a.update(1, frame({ pressed: ['melee'] }), c)[0];
      return o?.kind === 'melee' ? o.comboIndex : undefined;
    };
    expect(idx()).toBe(0);
    a.update(5000, frame(), c);
    expect(idx()).toBe(0);
    a.update(300, frame(), c);
    expect(idx()).toBe(1);
    a.update(300, frame(), c);
    expect(idx()).toBe(2);
    a.update(300, frame(), c);
    expect(idx()).toBe(0);
  });

  it('Hurley replaces the punch: longer reach, more damage, deflect window', () => {
    const a = abilities(['punchCombo', 'hurley']);
    expect(a.activeFor('melee')).toBe('hurley');
    const o = a.update(1, frame({ pressed: ['melee'] }), abilityContext())[0];
    expect(o?.kind === 'melee' && o.abilityId).toBe('hurley');
    const punch = TUNING.abilities.punchCombo;
    const hurley = TUNING.abilities.hurley;
    if (punch.shape.kind !== 'arc' || hurley.shape.kind !== 'arc') throw new Error('arc expected');
    expect(hurley.shape.range).toBeGreaterThan(punch.shape.range);
    expect(hurley.damage).toBeGreaterThan(punch.damage);
    expect(o?.kind === 'melee' && o.deflectWindowMs).toBeGreaterThan(0);
    expect(hurley.replaces).toBe('punchCombo');
  });

  it('punch has no deflect window', () => {
    const o = abilities(['punchCombo']).update(1, frame({ pressed: ['melee'] }), abilityContext())[0];
    expect(o?.kind === 'melee' && o.deflectWindowMs).toBe(0);
  });

  it('Grand attacks faster than Sober (shorter cooldown)', () => {
    const fire = (state: 'sober' | 'grand'): number => {
      const a = abilities(['punchCombo']);
      const c = abilityContext(state);
      a.update(1, frame({ pressed: ['melee'] }), c);
      // Halfway between the Grand and Sober cooldowns: only the faster state can swing again.
      const cd = TUNING.abilities.punchCombo.cooldownMs;
      return a.update((cd + cd / TUNING.buzz.effects.grand.attackSpeedMultiplier) / 2, frame({ pressed: ['melee'] }), c).length;
    };
    expect(fire('sober')).toBe(0);
    expect(fire('grand')).toBe(1);
  });

  it('rapid presses inside the cooldown fire once', () => {
    const a = abilities(['punchCombo']);
    const c = abilityContext('sober');
    let n = 0;
    for (let i = 0; i < 20; i++) n += a.update(1, frame({ pressed: ['melee'] }), c).length;
    expect(n).toBe(1);
  });
});

describe('Sliotar Strike', () => {
  it('a short right click throws a bottle, a charged release strikes', () => {
    const a = abilities(['bottleThrow', 'hurley', 'sliotarStrike']);
    const c = abilityContext();
    a.update(1, frame({ pressed: ['ranged'] }), c);
    const strike = a.update(1, frame({ released: ['ranged'], holdMs: { ranged: TUNING.abilities.sliotarStrike.chargeMs ?? 0 } }), c);
    expect(strike[0]?.abilityId).toBe('sliotarStrike');
    a.update(5000, frame(), c);
    a.update(1, frame({ pressed: ['ranged'] }), c);
    const tap = a.update(1, frame({ released: ['ranged'], holdMs: { ranged: 100 } }), c);
    expect(tap[0]?.abilityId).toBe('bottleThrow');
  });

  it('one millisecond short of the charge is still a bottle', () => {
    const a = abilities(['bottleThrow', 'hurley', 'sliotarStrike']);
    const c = abilityContext();
    a.update(1, frame({ pressed: ['ranged'] }), c);
    const out = a.update(1, frame({ released: ['ranged'], holdMs: { ranged: (TUNING.abilities.sliotarStrike.chargeMs ?? 0) - 1 } }), c);
    expect(out[0]?.abilityId).toBe('bottleThrow');
  });

  it('charge progress rises with the hold', () => {
    const a = abilities(['hurley', 'sliotarStrike']);
    const c = abilityContext();
    a.update(1, frame({ pressed: ['ranged'] }), c);
    a.update(1, frame({ held: ['ranged'], holdMs: { ranged: 300 } }), c);
    expect(a.chargeProgress()).toBeCloseTo(0.5, 5);
  });

  it('the strike costs nothing and pierces', () => {
    const def = TUNING.abilities.sliotarStrike;
    expect(def.cost).toEqual({ kind: 'none' });
    expect(def.shape.kind === 'projectile' && def.shape.pierce).toBeGreaterThan(1);
    expect(def.requires).toBe('hurley');
  });

it('Sliotar Strike needs the hurley: with it unlocked alone, a full charge does not fire it', () => {
    const a = abilities(['bottleThrow', 'sliotarStrike']);
    const c = abilityContext();
    a.update(1, frame({ pressed: ['ranged'] }), c);
    const out = a.update(1, frame({ released: ['ranged'], holdMs: { ranged: 2000 } }), c);
    expect(out.some((o) => o.abilityId === 'sliotarStrike')).toBe(false);
  });
});

describe('The Stumble', () => {
  it('is a dodge with brief invulnerability and a cooldown', () => {
    const def = TUNING.abilities.stumble;
    expect(def.slot).toBe('dodge');
    expect(def.invulnerableMs).toBeGreaterThan(0);
    expect(def.invulnerableMs).toBeLessThan(1000);
    const a = abilities(['stumble']);
    const c = abilityContext();
    const o = a.update(1, frame({ pressed: ['dodge'] }), c)[0];
    expect(o?.kind).toBe('dodge');
    expect(a.update(1, frame({ pressed: ['dodge'] }), c)).toEqual([]);
    expect(a.lastRefusal).toBe('cooldown');
  });

  it('does not exist before it is unlocked', () => {
    expect(abilities(['punchCombo']).update(1, frame({ pressed: ['dodge'] }), abilityContext())).toEqual([]);
  });

  it('works while held (the brawler grab) but not while stunned', () => {
    const c = abilityContext();
    c.canAct = false;
    c.held = true;
    expect(abilities(['stumble']).update(1, frame({ pressed: ['dodge'] }), c)).toHaveLength(1);
    c.held = false;
    expect(abilities(['stumble']).update(1, frame({ pressed: ['dodge'] }), c)).toHaveLength(0);
  });

  it('makes Andrew invulnerable for the window, then vulnerable again', () => {
    const def = TUNING.abilities.stumble;
    const p = new Player(new EventBus(), freshPlayerSnapshot());
    const grid = openGrid();
    p.pos = { x: 100, y: 100 };
    p.startDodge(def.dashDistance ?? 0, def.invulnerableMs ?? 0, { x: 1, y: 0 });
    expect(p.invulnerable).toBe(true);
    const hit = { source: { kind: 'hazard', hazardId: 'x' }, targetInstanceId: 'andrew', amount: 10, knockback: { x: 0, y: 0 }, stunMs: 0, holdMs: 0 } as const;
    expect(p.takeHit(hit)).toBe(false);
    expect(p.health.current).toBe(100);
    const inv = def.invulnerableMs ?? 0;
    for (let t = 0; t < inv - 16; t += 16) {
      p.move(16, frame(), grid);
      expect(p.invulnerable).toBe(true);
    }
    for (let t = 0; t < 64; t += 16) p.move(16, frame(), grid);
    expect(p.invulnerable).toBe(false);
    expect(p.takeHit(hit)).toBe(true);
    expect(p.health.current).toBe(90);
  });

  it('the dash covers dashDistance', () => {
    const def = TUNING.abilities.stumble;
    const p = new Player(new EventBus(), freshPlayerSnapshot());
    const grid = openGrid();
    p.pos = { x: 60, y: 100 };
    p.startDodge(def.dashDistance ?? 0, def.invulnerableMs ?? 0, { x: 1, y: 0 });
    for (let t = 0; t < 400; t += 16) p.move(16, frame(), grid);
    expect(p.pos.x - 60).toBeCloseTo(def.dashDistance ?? 0, 0);
  });
});

describe('The Borrowed Glove', () => {
  const ctx = () => abilityContext('grand', 50);

  it('recharges on its own: refused while recharging, ready after rechargeMs', () => {
    const cost = TUNING.abilities.borrowedGlove.cost;
    if (cost.kind !== 'recharge') throw new Error('recharge expected');
    const a = abilities(['borrowedGlove']);
    const c = ctx();
    expect(a.update(1, frame({ pressed: ['special'] }), c)[0]?.abilityId).toBe('borrowedGlove');
    expect(c.buzz).toBe(50); // costs no Buzz
    expect(a.gloveRecharge()).toBeGreaterThan(0.99);
    expect(a.update(cost.rechargeMs - 100, frame({ pressed: ['special'] }), c)).toEqual([]);
    expect(a.lastRefusal).toBe('recharging');
    expect(a.update(100, frame({ pressed: ['special'] }), c)).toHaveLength(1);
  });

  it('half way through the recharge the meter reads one half', () => {
    const cost = TUNING.abilities.borrowedGlove.cost;
    const a = abilities(['borrowedGlove']);
    const c = ctx();
    a.update(1, frame({ pressed: ['special'] }), c);
    a.update(cost.kind === 'recharge' ? cost.rechargeMs / 2 : 0, frame(), c);
    expect(a.gloveRecharge()).toBeCloseTo(0.5, 2);
  });

  it('stuns a group', () => {
    const o = abilities(['borrowedGlove']).update(1, frame({ pressed: ['special'] }), ctx())[0];
    expect(o?.kind === 'area' && o.stunMs).toBeGreaterThan(0);
  });
});

describe('special cycling with R', () => {
  it('cycles only through owned specials and wraps', () => {
    const a = abilities(['stoutSlam', 'poitinBreath', 'borrowedGlove']);
    const c = abilityContext();
    expect(a.selectedSpecial()).toBe('stoutSlam');
    a.update(1, frame({ pressed: ['cycleSpecial'] }), c);
    expect(a.selectedSpecial()).toBe('poitinBreath');
    a.update(1, frame({ pressed: ['cycleSpecial'] }), c);
    expect(a.selectedSpecial()).toBe('borrowedGlove');
    a.update(1, frame({ pressed: ['cycleSpecial'] }), c);
    expect(a.selectedSpecial()).toBe('stoutSlam');
  });

  it('skips specials not yet unlocked and does nothing with one', () => {
    const a = abilities(['stoutSlam', 'borrowedGlove']);
    a.cycleSpecial();
    expect(a.selectedSpecial()).toBe('borrowedGlove');
    const one = abilities(['stoutSlam']);
    one.cycleSpecial();
    expect(one.selectedSpecial()).toBe('stoutSlam');
  });

  it('the first special unlocked is selected automatically', () => {
    const a = new Abilities(new EventBus());
    expect(a.selectedSpecial()).toBeNull();
    a.unlock('poitinBreath');
    expect(a.selectedSpecial()).toBe('poitinBreath');
    a.unlock('stoutSlam');
    expect(a.selectedSpecial()).toBe('poitinBreath');
  });

  it('F uses the selected special', () => {
    const a = abilities(['stoutSlam', 'poitinBreath']);
    a.cycleSpecial();
    const o = a.update(1, frame({ pressed: ['special'] }), abilityContext('grand', 80))[0];
    expect(o?.abilityId).toBe('poitinBreath');
  });
});

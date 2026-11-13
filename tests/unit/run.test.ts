/** ChapterRun on the dev sandbox: pickups, drinking, hangover, stealth hand-off, debug walk. */

import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/content/tuning';
import type { SaveState } from '../../src/core/types';
import { advance, frame, makeRun, record, teleport } from './helpers';

const withPlayer = (patch: Partial<SaveState['player']>) => (s: SaveState): SaveState => ({ ...s, player: { ...s.player, ...patch } });

describe('pickups', () => {
  it('drinks go into slots and the pickup disappears for good', () => {
    const { run, bus, saves } = makeRun();
    const got = record(bus, 'pickup:collected');
    teleport(run, 3, 2);
    expect(got.map((g) => g.pickupId)).toEqual(['sandbox.stout']);
    expect(run.player.inventory.slots()[0]).toEqual({ drinkId: 'stout', count: 2 });
    expect(run.pickups().some((p) => p.def.id === 'sandbox.stout')).toBe(false);
    run.reachCheckpoint('c1.sandbox.mid');
    expect(saves.at(-1)?.state.collectedPickupIds).toContain('sandbox.stout');
  });

  it('a fourth drink type stays on the ground with a refusal', () => {
    const { run, bus } = makeRun({
      save: withPlayer({ drinkSlots: [{ drinkId: 'bourbon', count: 1 }, { drinkId: 'tequila', count: 1 }, { drinkId: 'craftIpa', count: 1 }] }),
    });
    const refused = record(bus, 'pickup:refused');
    teleport(run, 3, 2);
    teleport(run, 3, 2);
    expect(refused).toEqual([{ pickupId: 'sandbox.stout', reason: 'noFreeSlot' }]);
    expect(run.pickups().some((p) => p.def.id === 'sandbox.stout')).toBe(true);
  });

  it('food at full health is refused and left; hurt, it is eaten', () => {
    const full = makeRun();
    const refused = record(full.bus, 'pickup:refused');
    teleport(full.run, 7, 2);
    expect(refused).toEqual([{ pickupId: 'sandbox.crisps', reason: 'noEffect' }]);
    expect(full.run.pickups().some((p) => p.def.id === 'sandbox.crisps')).toBe(true);

    const hurt = makeRun({ save: withPlayer({ health: 50 }) });
    const eaten = record(hurt.bus, 'food:consumed');
    teleport(hurt.run, 7, 2);
    expect(eaten).toEqual([{ foodId: 'crisps' }]);
    expect(hurt.run.player.health.current).toBe(60);
    expect(hurt.run.pickups().some((p) => p.def.id === 'sandbox.crisps')).toBe(false);
  });

  it('a refused pickup is offered again after walking away and back', () => {
    const { run, bus } = makeRun();
    const eaten = record(bus, 'food:consumed');
    teleport(run, 7, 2);
    run.player.setHealth(10);
    teleport(run, 7, 2); // still standing there: stays refused until he leaves
    expect(eaten).toHaveLength(0);
    teleport(run, 20, 8);
    teleport(run, 7, 2);
    expect(eaten).toHaveLength(1);
  });

  it('empties are picked up to the cap with the rest left behind', () => {
    const { run } = makeRun({ save: withPlayer({ empties: TUNING.player.maxEmpties - 1 }) });
    teleport(run, 9, 2);
    expect(run.player.inventory.empties).toBe(TUNING.player.maxEmpties);
    expect(run.pickups().find((p) => p.def.id === 'sandbox.empties')?.item).toEqual({ kind: 'empties', count: 3 });
  });
});

describe('drinking with Q', () => {
  const drinkFrame = frame({ pressed: ['drink'] });

  it('adds Buzz, leaves an empty, uses up one drink', () => {
    const { run } = makeRun({ save: withPlayer({ drinkSlots: [{ drinkId: 'whiskey', count: 2 }, null, null] }) });
    run.tick(16, drinkFrame);
    expect(run.player.buzz.value).toBeGreaterThan(29);
    expect(run.player.inventory.empties).toBe(1);
    expect(run.player.inventory.slots()[0]).toEqual({ drinkId: 'whiskey', count: 1 });
  });

  it('two presses in separate ticks drink two; one frame drinks once', () => {
    const { run } = makeRun({ save: withPlayer({ drinkSlots: [{ drinkId: 'lightBeer', count: 3 }, null, null] }) });
    run.tick(16, drinkFrame);
    expect(run.player.inventory.slots()[0]?.count).toBe(2);
    run.tick(16, drinkFrame);
    expect(run.player.inventory.slots()[0]?.count).toBe(1);
  });

  it('drinking nothing does nothing', () => {
    const { run } = makeRun();
    run.tick(16, drinkFrame);
    expect(run.player.buzz.value).toBe(0);
    expect(run.player.inventory.empties).toBe(0);
  });

  it('cannot drink while on the floor after Banjaxed', () => {
    const { run } = makeRun({ save: withPlayer({ drinkSlots: [{ drinkId: 'stout', count: 3 }, null, null] }) });
    run.player.buzz.add(100);
    run.tick(8000, frame());
    expect(run.player.buzz.fallen).toBe(true);
    run.tick(16, drinkFrame);
    expect(run.player.inventory.slots()[0]?.count).toBe(3);
  });

  it('water at a hot moment resets the heat meter and leaves no empty', () => {
    const { run } = makeRun({ save: withPlayer({ drinkSlots: [{ drinkId: 'water', count: 1 }, null, null] }) });
    run.setHeatActive(true);
    advance(run, 30_000);
    expect(run.player.heat.value).toBeGreaterThan(0);
    run.tick(16, drinkFrame);
    expect(run.player.heat.value).toBe(0);
    expect(run.player.inventory.empties).toBe(0);
  });

  it('Banjaxed through the run: peak, fall, then Buzz 30', () => {
    const { run } = makeRun({ save: withPlayer({ drinkSlots: [{ drinkId: 'poitin', count: 2 }, null, null] }) });
    const phases = record(run.bus, 'buzz:banjaxedPhase');
    run.tick(16, drinkFrame);
    run.tick(16, drinkFrame);
    expect(run.player.buzz.value).toBeGreaterThanOrEqual(90);
    run.dialogue.finishAll();
    advance(run, 8000);
    advance(run, 2100);
    expect(phases.map((p) => p.phase)).toEqual(['peak', 'fallen', 'none']);
    expect(run.player.buzz.value).toBeLessThanOrEqual(30);
  });
});

describe('hangover through a run', () => {
  it('a chapter that starts hungover has the lower maximum until tea or a roll', () => {
    const { run } = makeRun({ save: withPlayer({ hangover: { active: true }, health: 75 }) });
    expect(run.player.health.max).toBe(75);
    run.give({ kind: 'food', foodId: 'chickenFilletRoll' });
    expect(run.player.hangover.active).toBe(false);
    expect(run.player.health.max).toBe(100);
  });

  it('tea cures it as well', () => {
    const { run } = makeRun({ save: withPlayer({ hangover: { active: true } }) });
    run.give({ kind: 'food', foodId: 'tea' });
    expect(run.player.hangover.active).toBe(false);
  });

  it('a hungover start gets a Myko remark on the first tick', () => {
    const { run } = makeRun({ save: withPlayer({ hangover: { active: true } }) });
    expect(run.dialogue.showing('box')).toMatch(/^myko\.hangover\./);
  });
});

describe('stealth through a run', () => {
  it('a clean run is recorded in the save, rewards its drink and emits once', () => {
    const { run, bus, saves } = makeRun();
    const clean = record(bus, 'stealth:cleanRun');
    run.startSection('c2.stealth.bog');
    run.stealth('c2.stealth.bog')?.finish();
    run.stealth('c2.stealth.bog')?.finish();
    expect(clean).toEqual([{ sectionId: 'c2.stealth.bog' }]);
    expect(run.isComplete('c2.stealth.bog')).toBe(true);
    expect(run.player.inventory.slots().some((s) => s?.drinkId === 'stout')).toBe(true);
    run.reachCheckpoint('c1.sandbox.mid');
    expect(saves.at(-1)?.state.cleanStealthRunIds).toEqual(['c2.stealth.bog']);
  });

  it('reaching the stealth checkpoint happens when the section starts', () => {
    const { run, bus } = makeRun();
    const cps = record(bus, 'checkpoint:reached');
    run.startSection('c2.stealth.bog');
    expect(cps.map((c) => c.checkpointId)).toContain('c1.sandbox.stealth');
  });

  it('the alarm starts the .alarm fight from tuning, with the guards joining it', () => {
    const { run, bus } = makeRun();
    const alarm = record(bus, 'stealth:alarm');
    run.startSection('c2.stealth.bog');
    run.stealth('c2.stealth.bog')?.alarm();
    expect(alarm).toEqual([{ sectionId: 'c2.stealth.bog', fightId: 'c2.stealth.bog.alarm' }]);
    const alive = run.enemies().filter((e) => !e.down);
    expect(alive.length).toBe(1 + 3); // the original guard plus tuning's three suits
    expect(run.stealth('c2.stealth.bog')?.alarmRaised).toBe(true);
    run.completeCurrent();
    expect(run.isComplete('c2.stealth.bog.alarm')).toBe(true);
    expect(run.isComplete('c2.stealth.bog')).toBe(true); // getting caught is never a restart
  });

  it('a caught section gives no clean-run credit', () => {
    const { run } = makeRun();
    run.startSection('c2.stealth.bog');
    run.stealth('c2.stealth.bog')?.alarm();
    run.completeCurrent();
    run.reachCheckpoint('c1.sandbox.mid');
    expect(run.snapshot().cleanStealthRunIds).toEqual([]);
  });
});

describe('Act Natural and stealth noise through a run', () => {
  it('a thrown bottle makes a noise event where it lands', () => {
    const { run, bus } = makeRun({ save: withPlayer({ empties: 2 }) });
    const noise = record(bus, 'stealth:noise');
    run.unlockAbility('bottleThrow');
    run.setPlayerPosition({ x: 100, y: 100 });
    // The sandbox unlocks everything, so right click throws on release (Sliotar Strike rules).
    run.tick(16, frame({ pressed: ['ranged'], aim: { x: 200, y: 100 } }));
    run.tick(16, frame({ released: ['ranged'], holdMs: { ranged: 50 }, aim: { x: 200, y: 100 } }));
    advance(run, 1200);
    expect(noise.some((n) => n.kind === 'bottle')).toBe(true);
    expect(run.player.inventory.empties).toBe(1);
  });
});

describe('debug entry points', () => {
  it('completeCurrent is a no-op when nothing is running', () => {
    const { run } = makeRun();
    expect(run.completeCurrent()).toBeNull();
  });

  it('completeCurrent finishes the running fight with source debug', () => {
    const { run, bus } = makeRun();
    const done = record(bus, 'section:completed');
    teleport(run, 22, 13);
    expect(run.completeCurrent()).toBe('c1.fight.chipper');
    expect(done.find((d) => d.sectionId === 'c1.fight.chipper')?.by).toBe('debug');
  });

  it('walkChapter completes every declared section, then the chapter, once', () => {
    const { run, completions } = makeRun();
    run.walkChapter();
    for (const s of run.module.def.sections) expect(run.snapshot().completedSectionIds).toContain(s.id);
    expect(completions).toHaveLength(1);
    run.walkChapter();
    expect(completions).toHaveLength(1);
  });

  it('every section completes exactly once during a walk', () => {
    const { run, bus } = makeRun();
    const done = record(bus, 'section:completed');
    run.walkChapter();
    const ids = done.map((d) => d.sectionId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a walk gives a fight\'s normal reward', () => {
    const { run } = makeRun({ save: withPlayer({ health: 20 }) });
    run.walkChapter();
    expect(run.player.health.current).toBe(run.player.health.max);
  });
});

describe('rapid and edge input', () => {
  it('hammering E and the mouse in one frame does not throw or double-fire', () => {
    const { run } = makeRun();
    for (let i = 0; i < 200; i++) run.tick(1, frame({ pressed: ['interact', 'melee', 'ranged', 'special', 'dodge', 'drink', 'hint', 'callMyko', 'cycleSpecial'] }));
    expect(run.player.dead).toBe(false);
  });

  it('a huge time step after a window blur does not break anything', () => {
    const { run } = makeRun();
    run.tick(60_000, frame());
    run.tick(16, frame());
    expect(Number.isFinite(run.player.pos.x)).toBe(true);
    expect(run.player.buzz.value).toBe(0);
  });

  it('zero and tiny time steps are harmless', () => {
    const { run } = makeRun();
    run.tick(0, frame());
    run.tick(0.001, frame());
    expect(run.player.health.current).toBe(100);
  });
});

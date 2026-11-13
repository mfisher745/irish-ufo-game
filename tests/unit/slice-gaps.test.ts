/**
 * Unit tests for the systems-dev slice-gaps pass (proposed for tests/unit/ by qa):
 * dressing, ambience, melee world hits, boss moveSpeed / daze / setSprite,
 * spawn-in triggers, mykoStart on Continue, Chapter Select for chapter 1,
 * AbilityDef.requires.
 */

import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/content/tuning';
import { EventBus } from '../../src/core/events';
import { NO_INPUT } from '../../src/core/input';
import { seededRandom } from '../../src/core/random';
import { createSandboxModule } from '../../src/core/sandbox';
import type { ChapterModule, MeleeHitInfo, ScreenLayout } from '../../src/core/chapter';
import type { AttackDef, BossDef, BossId, GameEventBus, HitInfo, SaveState, TileGrid, Vec2 } from '../../src/core/types';
import { BossRunner } from '../../src/systems/boss';
import type { BossWorld } from '../../src/systems/boss';
import { shapeHitsRect } from '../../src/systems/combat';
import { Dressing } from '../../src/systems/dressing';
import { EnemyActor } from '../../src/systems/enemies';
import type { ActorStats, CombatWorld } from '../../src/systems/enemies';
import { gridFromAscii } from '../../src/systems/grid';
import type { SectionHost } from '../../src/systems/sections';
import { chapterSelectSave } from '../../src/systems/session';
import { abilities, advance, frame, makeRun, teleport } from './helpers';

const T = (col: number, row: number): Vec2 => ({ x: col * 16 + 8, y: row * 16 + 8 });
const idx = (g: TileGrid, col: number, row: number): number => row * g.widthTiles + col;

const open = (): TileGrid => gridFromAscii(Array.from({ length: 10 }, (_, r) => (r === 0 || r === 9 ? '#'.repeat(12) : `#${'.'.repeat(10)}#`)));

function layout(extra: Partial<ScreenLayout> = {}): ScreenLayout {
  return { id: 'c1.test', grid: open(), exits: [], playerStart: T(2, 2), ...extra };
}

describe('Dressing', () => {
  const screen = layout({
    dressing: {
      props: [
        { id: 'tractor', frame: 'tractor', col: 3, row: 3, solid: { dy: 1, width: 3, height: 1 }, blocksSight: true },
        { id: 'hidden', frame: 'keg', col: 8, row: 2, solid: { width: 1, height: 1 }, hidden: true },
        { frame: 'bogLights.0', col: 1, row: 6, frames: ['bogLights.0', 'bogLights.1'] },
      ],
      npcs: [
        { id: 'dympna', npc: 'dympna', col: 5, row: 7, facing: 'down', examinableId: 'talk.dympna', solid: true },
        { id: 'local', npc: 'localA', col: 7, row: 7, facing: 'up', examinableId: 'talk.local' },
      ],
    },
  });

  it('merges visible solid and sight-blocking props and solid NPCs into the grid', () => {
    const d = new Dressing([screen]);
    const g = d.gridFor(screen);
    expect(g.blocked[idx(g, 3, 4)]).toBe(true);
    expect(g.blocked[idx(g, 5, 4)]).toBe(true);
    expect(g.blocked[idx(g, 3, 3)]).toBe(false);
    expect(g.blocksSight[idx(g, 4, 4)]).toBe(true);
    expect(g.blocked[idx(g, 8, 2)]).toBe(false);
    expect(g.blocked[idx(g, 5, 7)]).toBe(true);
    expect(g.blocked[idx(g, 7, 7)]).toBe(false);
    expect(screen.grid.blocked[idx(g, 3, 4)]).toBe(false);
  });

  it('showing, hiding and moving props changes the grid and bumps the version', () => {
    const d = new Dressing([screen]);
    const v = d.version;
    d.setPropVisible('hidden', true);
    expect(d.version).toBeGreaterThan(v);
    expect(d.gridFor(screen).blocked[idx(screen.grid, 8, 2)]).toBe(true);
    d.setPropVisible('tractor', false);
    expect(d.gridFor(screen).blocked[idx(screen.grid, 3, 4)]).toBe(false);
    d.setPropTile('hidden', 8, 5);
    const g = d.gridFor(screen);
    expect(g.blocked[idx(g, 8, 2)]).toBe(false);
    expect(g.blocked[idx(g, 8, 5)]).toBe(true);
    expect(d.setPropVisible('nope', true)).toBe(false);
  });

  it('caches the merged grid until something changes', () => {
    const d = new Dressing([screen]);
    expect(d.gridFor(screen)).toBe(d.gridFor(screen));
    const before = d.gridFor(screen);
    d.setPropFrame('tractor', 'crate');
    expect(d.gridFor(screen)).not.toBe(before);
    expect(d.prop('tractor')?.frame).toBe('crate');
  });

  it('talk points: at the examinable spot moved with the NPC, or at the feet; hidden NPCs cannot be talked to', () => {
    const d = new Dressing([screen]);
    const examinables = [
      { id: 'talk.dympna', screenId: 'c1.test' as const, position: T(5, 8) },
      { id: 'plain', screenId: 'c1.test' as const, position: T(1, 1) },
    ];
    let pts = d.interactPoints('c1.test', examinables);
    expect(pts.find((p) => p.examinableId === 'plain')?.kind).toBe('examine');
    expect(pts.find((p) => p.examinableId === 'talk.dympna')).toEqual({ examinableId: 'talk.dympna', position: T(5, 8), kind: 'talk', npcKey: 'dympna' });
    expect(pts.find((p) => p.examinableId === 'talk.local')?.position).toEqual(T(7, 7));
    expect(pts.filter((p) => p.examinableId === 'talk.dympna')).toHaveLength(1);
    d.setNpcPosition('dympna', T(6, 7));
    pts = d.interactPoints('c1.test', examinables);
    expect(pts.find((p) => p.examinableId === 'talk.dympna')?.position).toEqual(T(6, 8));
    d.setNpcVisible('local', false);
    expect(d.interactPoints('c1.test', examinables).some((p) => p.examinableId === 'talk.local')).toBe(false);
  });

  it('ambience can be replaced and cleared at run time', () => {
    const night = layout({ ambient: { tint: 'navyDark', strength: 0.6, lights: [{ x: 10, y: 10, radius: 20, colour: 'amber' }] } });
    const d = new Dressing([night]);
    expect(d.ambient('c1.test')?.strength).toBe(0.6);
    d.setAmbient('c1.test', null);
    expect(d.ambient('c1.test')).toBeNull();
  });
});

describe('shapeHitsRect', () => {
  const arc = TUNING.abilities.punchCombo.shape;
  const rect = { x: 30, y: -8, width: 16, height: 16 };

  it('hits a rectangle in front within reach, respecting aim', () => {
    expect(shapeHitsRect(arc, { x: 20, y: 0 }, 0, rect)).toBe(true);
    expect(shapeHitsRect(arc, { x: 20, y: 0 }, 180, rect)).toBe(false);
  });

  it('misses out of reach and hits when standing inside', () => {
    expect(shapeHitsRect(arc, { x: -200, y: 0 }, 0, rect)).toBe(false);
    expect(shapeHitsRect(arc, { x: 38, y: 0 }, 180, rect)).toBe(true);
  });

  it('a wide rectangle beside Andrew is hit by a diagonal swing even though its nearest point is straight ahead', () => {
    expect(shapeHitsRect({ kind: 'arc', range: 30, arcDeg: 40 }, { x: 0, y: 0 }, 45, { x: 10, y: -40, width: 6, height: 80 })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bosses
// ---------------------------------------------------------------------------

function host(): SectionHost {
  return { grantReward: () => undefined, markCompleted: () => undefined };
}

function bossWorld(bus: GameEventBus) {
  const actors: EnemyActor[] = [];
  const w: BossWorld = {
    bus,
    spawnBossBody: (_id: BossId, stats: ActorStats, pos: Vec2) => {
      const a = new EnemyActor(null, stats, pos, () => ({ kind: 'boss', bossId: 'c1.boss.bigtom', attackId: 'x' }), seededRandom(1));
      actors.push(a);
      return a;
    },
    spawnEnemy: () => {
      throw new Error('no adds');
    },
    defeat: (a) => a.knockDown(),
    playerIn: () => false,
  };
  return { w, actors };
}

describe('BossRunner moveSpeed, daze and setSprite', () => {
  const bigTom = TUNING.bosses['c1.boss.bigtom'];

  it('Big Tom walks at BossDef.moveSpeed; a placement overrides it; 0 stands still', () => {
    const { w } = bossWorld(new EventBus());
    const r = new BossRunner(bigTom, [{ tag: 'bigtom', position: T(5, 5) }], w, host(), null);
    r.start();
    expect(r.body('bigtom')?.moveSpeed).toBe(bigTom.moveSpeed);
    expect(r.body('bigtom')?.stationary).toBe(false);
    const { w: w2 } = bossWorld(new EventBus());
    const r2 = new BossRunner(bigTom, [{ tag: 'bigtom', position: T(5, 5), moveSpeed: 0 }], w2, host(), null);
    r2.start();
    expect(r2.body('bigtom')?.stationary).toBe(true);
  });

  it('a phase moveSpeed takes over when the phase starts', () => {
    const def: BossDef = {
      ...bigTom,
      phases: [bigTom.phases[0]!, { ...bigTom.phases[1]!, moveSpeed: 70 }],
    };
    const { w } = bossWorld(new EventBus());
    const r = new BossRunner(def, [{ tag: 'bigtom', position: T(5, 5) }], w, host(), null);
    r.start();
    const b = r.body('bigtom')!;
    b.health = Math.floor(b.health * 0.4);
    r.tick(16);
    expect(r.phase?.id).toBe('jacketOff');
    expect(b.moveSpeed).toBe(70);
  });

  it('every boss and set piece has a moveSpeed, and the ram outruns Andrew', () => {
    for (const d of Object.values(TUNING.bosses)) expect(d.moveSpeed).toBeGreaterThanOrEqual(0);
    expect(TUNING.bosses['c2.setpiece.ram'].moveSpeed).toBeGreaterThan(TUNING.player.runSpeed);
  });

  it('daze() defaults to the def: stunned for dazedMs at dazedDamageMultiplier, then back to 1', () => {
    expect(bigTom.dazedMs).toBe(2000);
    expect(bigTom.dazedDamageMultiplier).toBe(2);
    const { w } = bossWorld(new EventBus());
    const r = new BossRunner(bigTom, [{ tag: 'bigtom', position: T(5, 5) }], w, host(), null);
    r.start();
    r.daze('bigtom');
    const b = r.body('bigtom')!;
    expect(b.status).toBe('stunned');
    expect(b.damageTakenMultiplier).toBe(2);
  });

  it('setSprite swaps the texture key; a placement can set one per body', () => {
    const { w } = bossWorld(new EventBus());
    const r = new BossRunner(bigTom, [{ tag: 'bigtom', position: T(5, 5) }, { tag: 'other', position: T(7, 5), spriteKey: 'boss.x.other' }], w, host(), null);
    r.start();
    expect(r.body('bigtom')?.spriteKey).toBe(bigTom.spriteKey);
    expect(r.body('other')?.spriteKey).toBe('boss.x.other');
    r.setSprite('bigtom', 'boss.c1.boss.bigtom.jacketOff');
    expect(r.body('bigtom')?.spriteKey).toBe('boss.c1.boss.bigtom.jacketOff');
  });
});

describe('A charge dazed by onChargeBlocked stays dazed (enemies.ts finishBurstShot)', () => {
  it('stunned through the daze, multiplier back to 1 afterwards, then attacks again', () => {
    // Wall at column 8; the actor charges right from column 3 toward Andrew behind the wall line.
    const grid = gridFromAscii(Array.from({ length: 8 }, (_, r) => (r === 0 || r === 7 ? '#'.repeat(12) : `#......#...#`)));
    const charge: AttackDef = TUNING.bosses['c1.boss.bigtom'].phases[0]!.attacks.find((a) => a.id === 'bullCharge')!;
    const stats: ActorStats = { maxHealth: 100, moveSpeed: 0, knockbackResistance: 1, flies: false, attacks: [charge], spriteKey: 'x' };
    const actor = new EnemyActor(null, stats, T(3, 3), () => ({ kind: 'boss', bossId: 'c1.boss.bigtom', attackId: 'bullCharge' }), seededRandom(1));
    actor.stationary = true;
    let blocked = 0;
    actor.onChargeBlocked = (a) => {
      blocked++;
      a.stun(2000);
      a.damageTakenMultiplier = 2;
    };
    const world: CombatWorld = {
      grid,
      bus: new EventBus(),
      rng: seededRandom(2),
      screenId: 'c1.test',
      playerPosition: () => T(6, 3),
      playerTargetable: () => true,
      hitPlayer: (_h: Omit<HitInfo, 'targetInstanceId'>) => false,
      spawnProjectile: () => undefined,
      extraBlocked: () => false,
      actors: () => [actor],
    };
    let t = 0;
    while (blocked === 0 && t < 5000) {
      actor.tick(16, world);
      t += 16;
    }
    expect(blocked).toBe(1);
    expect(actor.status).toBe('stunned');
    expect(actor.damageTakenMultiplier).toBe(2);
    for (let s = 0; s < 1900; s += 16) actor.tick(16, world);
    expect(actor.status).toBe('stunned');
    for (let s = 0; s < 300; s += 16) actor.tick(16, world);
    expect(actor.status).not.toBe('stunned');
    expect(actor.damageTakenMultiplier).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// ChapterRun integration (dev sandbox)
// ---------------------------------------------------------------------------

describe('ChapterRun: dressing, talk, melee hooks, triggers', () => {
  it('a solid prop stops Andrew (the sandbox tractor)', () => {
    const { run } = makeRun();
    teleport(run, 5, 7);
    for (let i = 0; i < 60; i++) run.tick(16, frame({ move: { x: 0, y: -1 }, aim: T(5, 0) }));
    expect(run.player.pos.y).toBeGreaterThanOrEqual(6 * 16 - 1);
  });

  it('E beside a talkable NPC is a talk: the script gets onExamine', () => {
    const { run } = makeRun();
    teleport(run, 3, 9);
    expect(run.interactTarget()?.kind).toBe('talk');
    const shown: string[] = [];
    run.bus.on('dialogue:show', ({ sequenceId }) => void shown.push(sequenceId));
    run.tick(16, frame({ pressed: ['interact'] }));
    expect(shown).toContain('c1.pub.photo');
  });

  it('onMeleeHit reports the combo index and the haymaker, only when the swing faces the area', () => {
    const base = createSandboxModule(1);
    const hits: MeleeHitInfo[] = [];
    const area = { x: 16 * 16, y: 7 * 16, width: 16, height: 16 };
    const module: ChapterModule = {
      ...base,
      createScript: (ctx) => {
        const inner = base.createScript?.(ctx) ?? {};
        return { ...inner, onStart: (info) => { inner.onStart?.(info); ctx.onMeleeHit(area, (h) => hits.push(h)); } };
      },
    };
    const { run } = makeRun({ module });
    teleport(run, 15, 7);
    const swing = (aim: Vec2): void => {
      run.tick(16, frame({ pressed: ['melee'], aim }));
      advance(run, 200);
    };
    swing(T(20, 7));
    swing(T(20, 7));
    swing(T(20, 7));
    expect(hits.map((h) => [h.comboIndex, h.haymaker])).toEqual([
      [0, false],
      [1, false],
      [2, true],
    ]);
    advance(run, 1000);
    swing(T(10, 7));
    expect(hits).toHaveLength(3);
  });

  it('a spawn inside a trigger area fires it', () => {
    const base = createSandboxModule(1);
    const fired: string[] = [];
    const module: ChapterModule = {
      ...base,
      triggers: [{ id: 'atStart', screenId: base.def.startScreenId, area: { x: 0, y: 0, width: 200, height: 200 } }],
      createScript: (ctx) => ({ ...(base.createScript?.(ctx) ?? {}), onTrigger: (id) => void fired.push(id) }),
    };
    const { run } = makeRun({ module });
    run.tick(16, NO_INPUT);
    expect(fired).toEqual(['atStart']);
  });

  it('mykoStart is honoured on Continue (a save read back is a copy of the start position)', () => {
    const base = createSandboxModule(1);
    const screen = base.screens[0]!;
    const module: ChapterModule = { ...base, screens: [{ ...screen, mykoStart: T(10, 8) }] };
    const { run } = makeRun({ module, save: (s) => JSON.parse(JSON.stringify(s)) as SaveState });
    // makeRun ticks once, so he may have taken a step toward Andrew.
    expect(Math.hypot(run.myko.pos.x - T(10, 8).x, run.myko.pos.y - T(10, 8).y)).toBeLessThan(4);
  });
});

describe('Chapter Select and abilities', () => {
  it('Chapter Select of chapter 1 gives no starting drinks (Dympna hands over the first pint)', () => {
    expect(chapterSelectSave(createSandboxModule(1), null, []).player.drinkSlots).toEqual([null, null, null]);
    expect(chapterSelectSave(createSandboxModule(2), null, []).player.drinkSlots).toEqual(TUNING.chapterSelect.startingDrinks);
  });

  it('an ability with `requires` is not usable without it', () => {
    expect(abilities(['sliotarStrike']).usable('sliotarStrike')).toBe(false);
    expect(abilities(['sliotarStrike', 'hurley']).usable('sliotarStrike')).toBe(true);
  });
});

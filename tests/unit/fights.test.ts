/** docs/chapters/README.md fights and bosses: waves, completeNow, phases and end conditions. */

import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/content/tuning';
import { EventBus } from '../../src/core/events';
import { seededRandom } from '../../src/core/random';
import type {
  AlarmFightId,
  BossDef,
  BossId,
  CompletionSource,
  EnemyId,
  FightSectionId,
  Reward,
  SectionId,
  SectionKind,
  Vec2,
} from '../../src/core/types';
import { BossRunner } from '../../src/systems/boss';
import type { BossBodyPlacement, BossWorld } from '../../src/systems/boss';
import { EnemyActor, statsFromDef } from '../../src/systems/enemies';
import type { ActorStats } from '../../src/systems/enemies';
import { FightRunner } from '../../src/systems/fight';
import type { FightWorld } from '../../src/systems/fight';
import type { SectionHost } from '../../src/systems/sections';
import { record } from './helpers';

interface Host extends SectionHost {
  granted: (Reward | undefined)[];
  completed: { id: SectionId; kind: SectionKind; by: CompletionSource }[];
}
const host = (): Host => {
  const h: Host = {
    granted: [],
    completed: [],
    grantReward: (r) => void h.granted.push(r),
    markCompleted: (id, kind, by) => void h.completed.push({ id, kind, by }),
  };
  return h;
};

function world() {
  const bus = new EventBus();
  const spawned: EnemyId[] = [];
  const actors: EnemyActor[] = [];
  const defeated: CompletionSource[] = [];
  let playerInExit = false;
  const w: FightWorld & BossWorld = {
    bus,
    spawnEnemy: (id: EnemyId, pos: Vec2) => {
      spawned.push(id);
      const a = new EnemyActor(id, statsFromDef(TUNING.enemies[id]), pos, () => ({ kind: 'enemy', enemyId: id, attackId: 'x' }), seededRandom(1));
      actors.push(a);
      return a;
    },
    spawnBossBody: (_id: BossId, stats: ActorStats, pos: Vec2) => {
      const a = new EnemyActor(null, stats, pos, () => ({ kind: 'boss', bossId: 'c1.boss.bigtom', attackId: 'x' }), seededRandom(1));
      actors.push(a);
      return a;
    },
    defeat: (a, by) => {
      if (!a.down) a.knockDown();
      defeated.push(by);
    },
    playerIn: () => playerInExit,
  };
  return { w, bus, spawned, actors, defeated, setExit: (v: boolean) => (playerInExit = v) };
}

const SPAWN = [{ x: 10, y: 10 }];

describe('FightRunner', () => {
  const chipper = TUNING.fights['c1.fight.chipper'];
  if (!chipper) throw new Error('tuning: c1.fight.chipper missing');

  it('spawns the first wave from tuning on start and emits section:started', () => {
    const { w, bus, spawned } = world();
    const started = record(bus, 'section:started');
    const f = new FightRunner(chipper, SPAWN, w, host());
    f.start();
    expect(spawned).toEqual(['lad']);
    expect(started).toEqual([{ sectionId: 'c1.fight.chipper', kind: 'fight' }]);
    expect(f.active).toBe(true);
  });

  it('start twice does not spawn twice', () => {
    const { w, spawned } = world();
    const f = new FightRunner(chipper, SPAWN, w, host());
    f.start();
    f.start();
    expect(spawned).toHaveLength(1);
  });

  it('sends the next wave after the pause, and completes when every enemy is down', () => {
    const { w, spawned } = world();
    const h = host();
    const f = new FightRunner(chipper, SPAWN, w, h, { pickups: [{ kind: 'food', foodId: 'crisps' }] });
    f.start();
    f.tick(16);
    expect(f.isComplete()).toBe(false);
    f.aliveActors().forEach((a) => a.knockDown());
    for (let i = 0; i < 200 && spawned.length < 3; i++) f.tick(16);
    expect(spawned).toEqual(['lad', 'lad', 'lad']);
    expect(f.isComplete()).toBe(false);
    f.aliveActors().forEach((a, i) => {
      a.knockDown();
      if (i === 0) f.tick(16);
    });
    f.tick(16);
    expect(f.isComplete()).toBe(true);
    expect(h.completed).toEqual([{ id: 'c1.fight.chipper', kind: 'fight', by: 'player' }]);
    expect(h.granted).toHaveLength(1);
  });

  it('does not finish while one enemy is still standing', () => {
    const { w } = world();
    const f = new FightRunner({ id: 'c1.fight.chipper', waves: [{ enemies: [{ enemyId: 'lad', count: 3 }] }] }, SPAWN, w, host());
    f.start();
    const [first, second] = f.aliveActors();
    first?.knockDown();
    second?.knockDown();
    for (let i = 0; i < 100; i++) f.tick(16);
    expect(f.isComplete()).toBe(false);
  });

  it('completeNow finishes at any point: enemies down, reward once, event once', () => {
    const { w, defeated } = world();
    const h = host();
    const f = new FightRunner(chipper, SPAWN, w, h, { pickups: [{ kind: 'food', foodId: 'spiceBag' }] });
    f.start();
    f.completeNow('myko');
    expect(f.isComplete()).toBe(true);
    expect(f.aliveActors()).toEqual([]);
    expect(defeated).toEqual(['myko']);
    expect(h.completed).toEqual([{ id: 'c1.fight.chipper', kind: 'fight', by: 'myko' }]);
    expect(h.granted).toEqual([{ pickups: [{ kind: 'food', foodId: 'spiceBag' }] }]);
    f.completeNow('debug');
    f.tick(1000);
    expect(h.completed).toHaveLength(1);
    expect(h.granted).toHaveLength(1);
  });

  it('completeNow works before the fight has started, and no wave arrives afterwards', () => {
    const { w, spawned } = world();
    const h = host();
    const f = new FightRunner(chipper, SPAWN, w, h);
    f.completeNow('debug');
    expect(h.completed[0]?.by).toBe('debug');
    f.start();
    f.tick(5000);
    expect(spawned).toEqual([]);
  });

  it('a suspended fight (Myko striding in) spawns nothing and does not complete', () => {
    const { w, spawned } = world();
    const f = new FightRunner(chipper, SPAWN, w, host());
    f.start();
    f.suspended = true;
    f.aliveActors().forEach((a) => a.knockDown());
    for (let i = 0; i < 200; i++) f.tick(16);
    expect(spawned).toHaveLength(1);
    expect(f.isComplete()).toBe(false);
  });

  it('adopted guards count as the alarm fight enemies', () => {
    const { w } = world();
    const id = 'c2.stealth.bog.alarm' as AlarmFightId;
    const def = TUNING.fights[id];
    if (!def) throw new Error('missing');
    const f = new FightRunner(def, SPAWN, w, host());
    const guard = new EnemyActor('suit', statsFromDef(TUNING.enemies.suit), SPAWN[0] as Vec2, () => ({ kind: 'enemy', enemyId: 'suit', attackId: 'x' }), seededRandom(1));
    f.adopt([guard]);
    f.start();
    expect(f.aliveActors().length).toBe(1 + def.waves[0]!.enemies.reduce((n, g) => n + g.count, 0));
  });

  it('every fight in tuning spawns exactly its wave counts and can be fought to completion', () => {
    for (const [id, def] of Object.entries(TUNING.fights)) {
      if (!def) continue;
      const { w, spawned } = world();
      const f = new FightRunner(def, [{ x: 1, y: 1 }, { x: 2, y: 2 }], w, host());
      f.start();
      for (let i = 0; i < 2000 && !f.isComplete(); i++) {
        f.aliveActors().forEach((a) => a.knockDown());
        f.tick(16);
      }
      expect(f.isComplete(), id).toBe(true);
      const expected = def.waves.flatMap((wv) => wv.enemies.flatMap((g) => Array<EnemyId>(g.count).fill(g.enemyId)));
      expect(spawned.sort(), id).toEqual(expected.sort());
    }
  });

  it('every fight completeNow leaves nobody standing', () => {
    for (const [id, def] of Object.entries(TUNING.fights)) {
      if (!def) continue;
      const { w } = world();
      const h = host();
      const f = new FightRunner(def, SPAWN, w, h);
      f.start();
      f.completeNow('debug');
      expect(f.aliveActors(), id).toEqual([]);
      expect(h.completed, id).toHaveLength(1);
    }
  });
});

// ---------------------------------------------------------------------------

const body = (tag: string, extra: Partial<BossBodyPlacement> = {}): BossBodyPlacement => ({ tag, position: { x: 50, y: 50 }, moveSpeed: 30, ...extra });

function boss(id: BossId, bodies: BossBodyPlacement[], hooks = {}) {
  const wd = world();
  const h = host();
  const def = TUNING.bosses[id];
  const r = new BossRunner(def, bodies, wd.w, h, { x: 0, y: 0, width: 10, height: 10 }, { pickups: [{ kind: 'drink', drinkId: 'stout', count: 1 }] }, hooks);
  return { r, h, ...wd };
}

const damage = (r: BossRunner, tag: string, n: number) => {
  const b = r.body(tag);
  if (!b) throw new Error(`no body ${tag}`);
  b.health = Math.max(0, b.health - n);
  if (b.health <= 0) b.knockDown();
};

describe('BossRunner phases', () => {
  it('enters the "start" phase on start and emits boss:phaseChanged', () => {
    const { r, bus } = boss('c1.boss.bigtom', [body('bigtom')]);
    const phases = record(bus, 'boss:phaseChanged');
    r.start();
    expect(r.phase?.id).toBe('jacketOn');
    expect(phases).toEqual([{ bossId: 'c1.boss.bigtom', phaseId: 'jacketOn' }]);
    expect(r.body('bigtom')?.attacks).toEqual(TUNING.bosses['c1.boss.bigtom'].phases[0]?.attacks);
  });

  it('healthBelow 0.5: still phase one at exactly half, phase two just below', () => {
    const { r, bus } = boss('c1.boss.bigtom', [body('bigtom')]);
    const phases = record(bus, 'boss:phaseChanged');
    r.start();
    const max = TUNING.bosses['c1.boss.bigtom'].maxHealth ?? 0;
    damage(r, 'bigtom', max / 2);
    r.tick(16);
    expect(r.phase?.id).toBe('jacketOn');
    damage(r, 'bigtom', 1);
    r.tick(16);
    expect(r.phase?.id).toBe('jacketOff');
    expect(phases.map((p) => p.phaseId)).toEqual(['jacketOn', 'jacketOff']);
    expect(r.body('bigtom')?.attackSpeedMultiplier).toBe(TUNING.bosses['c1.boss.bigtom'].phases[1]?.attackSpeedMultiplier);
    r.tick(16);
    expect(phases).toHaveLength(2);
  });

  it('a phase never goes backwards when health is healed', () => {
    const { r } = boss('c1.boss.bigtom', [body('bigtom')]);
    r.start();
    const max = TUNING.bosses['c1.boss.bigtom'].maxHealth ?? 0;
    const trigger = TUNING.bosses['c1.boss.bigtom'].phases[1]?.trigger;
    damage(r, 'bigtom', max * (1 - (trigger?.kind === 'healthBelow' ? trigger.fraction : 0.5)) + 1);
    r.tick(16);
    const b = r.body('bigtom');
    if (b) b.health = b.stats.maxHealth;
    r.tick(16);
    expect(r.phase?.id).toBe('jacketOff');
  });

  it('targetsLeft phases for the mascots: three, then two, then one', () => {
    const tags = ['zip', 'zap', 'zorp'];
    const { r } = boss('c7.boss.mascots', tags.map((t) => body(t)));
    r.start();
    expect(r.phase?.id).toBe('three');
    damage(r, 'zip', 9999);
    r.tick(16);
    expect(r.phase?.id).toBe('two');
    damage(r, 'zap', 9999);
    r.tick(16);
    expect(r.phase?.id).toBe('one');
  });

  it('elapsedMs triggers fire on time', () => {
    const def: BossDef = {
      ...TUNING.bosses['c1.boss.bigtom'],
      phases: [
        { id: 'a', trigger: { kind: 'start' }, attacks: [], attackSpeedMultiplier: 1 },
        { id: 'b', trigger: { kind: 'elapsedMs', ms: 5000 }, attacks: [], attackSpeedMultiplier: 1 },
      ],
    };
    const wd = world();
    const r = new BossRunner(def, [body('x')], wd.w, host(), null);
    r.start();
    r.tick(4999);
    expect(r.phase?.id).toBe('a');
    r.tick(1);
    expect(r.phase?.id).toBe('b');
  });

  it('tuning: every boss has a phase that starts at start, as phase one', () => {
    for (const [id, def] of Object.entries(TUNING.bosses)) {
      expect(def.phases.length, id).toBeGreaterThan(0);
      expect(def.phases[0]?.trigger.kind, id).toBe('start');
    }
  });

  it('suspended bosses do not advance phases or time', () => {
    const { r } = boss('c1.boss.bigtom', [body('bigtom')]);
    r.start();
    r.suspended = true;
    damage(r, 'bigtom', (TUNING.bosses['c1.boss.bigtom'].maxHealth ?? 0) * 0.9);
    r.tick(10_000);
    expect(r.phase?.id).toBe('jacketOn');
    expect(r.elapsedMs).toBe(0);
  });
});

describe('BossRunner end conditions', () => {
  it('healthBelow 0 (Big Tom): ends when he is down, with reward once', () => {
    const { r, h } = boss('c1.boss.bigtom', [body('bigtom')]);
    r.start();
    const max = TUNING.bosses['c1.boss.bigtom'].maxHealth ?? 0;
    damage(r, 'bigtom', max - 1);
    r.tick(16);
    expect(r.isComplete()).toBe(false);
    damage(r, 'bigtom', 1);
    r.tick(16);
    expect(r.isComplete()).toBe(true);
    expect(h.completed).toEqual([{ id: 'c1.boss.bigtom', kind: 'boss', by: 'player' }]);
    expect(h.granted).toHaveLength(1);
    r.tick(16);
    expect(h.completed).toHaveLength(1);
  });

  it('healthBelow 0.15 (Pruitt, round one) ends at 15 per cent, not above', () => {
    const { r } = boss('c5.boss.pruitt1', [body('pruitt')]);
    r.start();
    const def = TUNING.bosses['c5.boss.pruitt1'];
    const max = def.maxHealth ?? 0;
    const end = def.end.kind === 'healthBelow' ? def.end.fraction : 0;
    damage(r, 'pruitt', max * (1 - end - 0.01));
    r.tick(16);
    expect(r.isComplete()).toBe(false);
    damage(r, 'pruitt', max * 0.02);
    r.tick(16);
    expect(r.isComplete()).toBe(true);
  });

  it('healthBelow 0.4 (Pruitt, round two) ends at 40 per cent and passes through phase two first', () => {
    const { r } = boss('c8.boss.pruitt2', [body('pruitt')]);
    r.start();
    const def = TUNING.bosses['c8.boss.pruitt2'];
    const max = def.maxHealth ?? 0;
    const end = def.end.kind === 'healthBelow' ? def.end.fraction : 0;
    const truck = def.phases.find((p) => p.id === 'truck')?.trigger;
    const truckAt = truck?.kind === 'healthBelow' ? truck.fraction : 1;
    expect(truckAt).toBeGreaterThan(end);
    damage(r, 'pruitt', max * (1 - (truckAt + end) / 2));
    r.tick(16);
    expect(r.phase?.id).toBe('truck');
    expect(r.isComplete()).toBe(false);
    damage(r, 'pruitt', max * (truckAt - end));
    r.tick(16);
    expect(r.isComplete()).toBe(true);
  });

  it('targetsDestroyed 3 (mascots): needs all three; health is the sum', () => {
    const { r } = boss('c7.boss.mascots', ['zip', 'zap', 'zorp'].map((t) => body(t)));
    r.start();
    const max = TUNING.bosses['c7.boss.mascots'].maxHealth ?? 0;
    expect(r.health()?.current).toBe(max);
    damage(r, 'zip', 9999);
    damage(r, 'zap', 9999);
    r.tick(16);
    expect(r.isComplete()).toBe(false);
    damage(r, 'zorp', 9999);
    r.tick(16);
    expect(r.isComplete()).toBe(true);
    expect(r.health()?.current).toBe(0);
  });

  it('combine: three lights are targets, the invulnerable harvester is not', () => {
    const { r } = boss('c6.setpiece.combine', [
      body('harvester', { invulnerable: true, attacks: 'none' }),
      body('light1'),
      body('light2'),
      body('light3'),
    ]);
    r.start();
    expect(r.targetsLeft()).toBe(3);
    expect(r.body('harvester')?.invulnerable).toBe(true);
    damage(r, 'light1', 9999);
    damage(r, 'light2', 9999);
    r.tick(16);
    expect(r.phase?.id).toBe('oneLight');
    expect(r.isComplete()).toBe(false);
    damage(r, 'light3', 9999);
    r.tick(16);
    expect(r.isComplete()).toBe(true);
  });

  it('reachExit (the ram): ends when Andrew reaches the exit area, not before', () => {
    const { r, setExit } = boss('c2.setpiece.ram', [body('ram', { invulnerable: true })]);
    r.start();
    r.tick(5000);
    expect(r.isComplete()).toBe(false);
    expect(r.health()).toBeNull();
    setExit(true);
    r.tick(16);
    expect(r.isComplete()).toBe(true);
  });

  it('a reachExit boss without an exit area never ends by itself', () => {
    const wd = world();
    const r = new BossRunner(TUNING.bosses['c2.setpiece.ram'], [body('ram', { invulnerable: true })], wd.w, host(), null);
    r.start();
    wd.setExit(true);
    r.tick(16);
    expect(r.isComplete()).toBe(false);
  });

  it('scripted ends only through complete()', () => {
    const def: BossDef = { ...TUNING.bosses['c1.boss.bigtom'], end: { kind: 'scripted' } };
    const wd = world();
    const h = host();
    const r = new BossRunner(def, [body('b')], wd.w, h, null);
    r.start();
    damage(r, 'b', 9999);
    r.tick(16);
    expect(r.isComplete()).toBe(false);
    r.complete('player');
    expect(r.isComplete()).toBe(true);
    expect(h.completed).toHaveLength(1);
  });

  it('completeNow finishes mid-fight: bodies and adds down, hooks and reward once', () => {
    const ended: CompletionSource[] = [];
    const { r, h, defeated } = boss('c4.boss.foreman', [body('foreman')], { onEnd: (_b: BossRunner, by: CompletionSource) => ended.push(by) });
    r.start();
    r.spawnAdd('docker', { x: 5, y: 5 });
    expect(r.addsAlive()).toBe(1);
    r.completeNow('myko');
    expect(r.isComplete()).toBe(true);
    expect(r.aliveActors().filter((a) => !a.frozen && !a.down)).toEqual([]);
    expect(r.addsAlive()).toBe(0);
    expect(defeated).toContain('myko');
    expect(h.completed).toEqual([{ id: 'c4.boss.foreman', kind: 'boss', by: 'myko' }]);
    expect(h.granted).toHaveLength(1);
    expect(ended).toEqual(['myko']);
    r.completeNow('debug');
    expect(h.completed).toHaveLength(1);
    expect(ended).toHaveLength(1);
  });

  it('every boss in tuning can be completed with completeNow and emits one completion', () => {
    for (const [id, def] of Object.entries(TUNING.bosses)) {
      const wd = world();
      const h = host();
      const bodies = id === 'c7.boss.mascots' ? ['a', 'b', 'c'].map((t) => body(t)) : id === 'c6.setpiece.combine' ? ['l1', 'l2', 'l3'].map((t) => body(t)) : [body('b')];
      const r = new BossRunner(def, bodies, wd.w, h, null);
      r.start();
      r.completeNow('debug');
      expect(r.isComplete(), id).toBe(true);
      expect(h.completed, id).toHaveLength(1);
    }
  });

  it('boss definitions are internally consistent', () => {
    for (const [id, def] of Object.entries(TUNING.bosses)) {
      if (def.end.kind === 'healthBelow') expect(def.maxHealth, id).toBeGreaterThan(0);
      if (def.end.kind === 'targetsDestroyed') expect(def.maxHealth, id).toBeGreaterThan(0);
      if (def.end.kind === 'reachExit') expect(def.maxHealth, id).toBeUndefined();
      expect(def.kind, id).toBe(id.includes('.setpiece.') ? 'setpiece' : 'boss');
    }
  });
});

describe('Myko cannot be called on the Administrator (tuning shape)', () => {
  it('the Administrator is a normal healthBelow-0 boss with three phases', () => {
    const def = TUNING.bosses['c10.boss.administrator'];
    expect(def.phases.map((p) => p.id)).toEqual(['delegation', 'restructuring', 'personally']);
    expect(def.end).toEqual({ kind: 'healthBelow', fraction: 0 });
  });

  it('a FightSectionId cast is not needed: fights keyed by id exist', () => {
    const id: FightSectionId = 'c1.fight.chipper';
    expect(TUNING.fights[id]).toBeDefined();
  });
});

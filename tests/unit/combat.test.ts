/** DESIGN.md 7.2: hit shapes, knockback, shields, telegraphs, and the player's drunk-state movement. */

import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/content/tuning';
import { EventBus } from '../../src/core/events';
import { seededRandom } from '../../src/core/random';
import type { EnemyId, HitInfo, TileGrid, Vec2 } from '../../src/core/types';
import { knockbackVector, scaledDamage, shapeHits, shieldBlocks, decayVelocity } from '../../src/systems/combat';
import { EnemyActor, statsFromDef } from '../../src/systems/enemies';
import type { CombatWorld } from '../../src/systems/enemies';
import { angleDiff, facingFromAngle } from '../../src/systems/geometry';
import { Player, freshPlayerSnapshot } from '../../src/systems/player';
import { frame, openGrid, record } from './helpers';

const O = { x: 0, y: 0 };

describe('shapeHits', () => {
  it('arc hits in front within range and misses behind or beyond', () => {
    const arc = { kind: 'arc', range: 20, arcDeg: 90 } as const;
    expect(shapeHits(arc, O, 0, { x: 15, y: 0 }, 2)).toBe(true);
    expect(shapeHits(arc, O, 0, { x: -15, y: 0 }, 2)).toBe(false);
    expect(shapeHits(arc, O, 0, { x: 40, y: 0 }, 2)).toBe(false);
  });

  it('arc edge: inside half-angle hits, outside misses', () => {
    const arc = { kind: 'arc', range: 30, arcDeg: 90 } as const;
    const at = (deg: number): Vec2 => ({ x: Math.cos((deg * Math.PI) / 180) * 20, y: Math.sin((deg * Math.PI) / 180) * 20 });
    expect(shapeHits(arc, O, 0, at(44), 1)).toBe(true);
    expect(shapeHits(arc, O, 0, at(46), 1)).toBe(false);
    expect(shapeHits(arc, O, 0, at(-44), 1)).toBe(true);
  });

  it('arc wraps around 360 (facing 350, target at 10)', () => {
    const arc = { kind: 'arc', range: 30, arcDeg: 90 } as const;
    const t = { x: Math.cos(0.1745) * 20, y: Math.sin(0.1745) * 20 };
    expect(shapeHits(arc, O, 350, t, 1)).toBe(true);
  });

  it('circle hits all round', () => {
    const c = { kind: 'circle', radius: 44 } as const;
    for (const p of [{ x: 40, y: 0 }, { x: -40, y: 0 }, { x: 0, y: 40 }, { x: 0, y: -40 }]) expect(shapeHits(c, O, 0, p, 2)).toBe(true);
    expect(shapeHits(c, O, 0, { x: 60, y: 0 }, 2)).toBe(false);
  });

  it('cone is narrower than an arc of the same reach', () => {
    const cone = { kind: 'cone', range: 64, angleDeg: 50 } as const;
    expect(shapeHits(cone, O, 0, { x: 50, y: 0 }, 2)).toBe(true);
    expect(shapeHits(cone, O, 0, { x: 30, y: 30 }, 2)).toBe(false);
  });

  it('charge covers its lane only', () => {
    const ch = { kind: 'charge', distance: 100, width: 20 } as const;
    expect(shapeHits(ch, O, 0, { x: 80, y: 5 }, 2)).toBe(true);
    expect(shapeHits(ch, O, 0, { x: 80, y: 30 }, 2)).toBe(false);
    expect(shapeHits(ch, O, 0, { x: 130, y: 0 }, 2)).toBe(false);
    expect(shapeHits(ch, O, 0, { x: -30, y: 0 }, 2)).toBe(false);
  });

  it('none and projectile shapes never hit by area', () => {
    expect(shapeHits({ kind: 'none' }, O, 0, O, 5)).toBe(false);
  });
});

describe('damage and knockback maths', () => {
  it('scales and rounds damage by the Buzz multiplier', () => {
    expect(scaledDamage(8, 1)).toBe(8);
    expect(scaledDamage(8, 1.5)).toBe(12);
    expect(scaledDamage(8, 2)).toBe(16);
    expect(scaledDamage(8, 2.5)).toBe(20);
    expect(scaledDamage(-5, 2)).toBe(0);
  });

  it('knockback points away from the source', () => {
    const v = knockbackVector({ x: 0, y: 0 }, { x: 10, y: 0 }, 100, 0);
    expect(v.x).toBeCloseTo(100);
    expect(v.y).toBeCloseTo(0);
  });

  it('resistance reduces it, full resistance removes it, out of range is clamped', () => {
    expect(knockbackVector(O, { x: 1, y: 0 }, 100, 0.5).x).toBeCloseTo(50);
    expect(knockbackVector(O, { x: 1, y: 0 }, 100, 1).x).toBeCloseTo(0);
    expect(knockbackVector(O, { x: 1, y: 0 }, 100, 3).x).toBeCloseTo(0);
    expect(knockbackVector(O, { x: 1, y: 0 }, 100, -1).x).toBeCloseTo(100);
  });

  it('coincident positions still give a finite push', () => {
    const v = knockbackVector(O, O, 50, 0);
    expect(Number.isFinite(v.x) && Number.isFinite(v.y)).toBe(true);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(50);
  });

  it('velocity decays to a full stop', () => {
    let v: Vec2 = { x: 100, y: 0 };
    for (let i = 0; i < 400; i++) v = decayVelocity(v, 7, 16);
    expect(v).toEqual({ x: 0, y: 0 });
  });

  it('the haymaker knocks back far more than a jab', () => {
    const combo = TUNING.abilities.punchCombo.combo ?? [];
    expect(combo).toHaveLength(3);
    expect(combo[2]?.knockback).toBeGreaterThan((combo[0]?.knockback ?? 0) * 2);
  });
});

describe('shields block from the front only', () => {
  it('blocks front, passes back and flank outside the arc', () => {
    expect(shieldBlocks(120, O, 0, { x: 10, y: 0 })).toBe(true);
    expect(shieldBlocks(120, O, 0, { x: -10, y: 0 })).toBe(false);
    expect(shieldBlocks(120, O, 0, { x: 0, y: 10 })).toBe(false); // 90 degrees off, half arc is 60
    expect(shieldBlocks(120, O, 0, { x: 5, y: 5 })).toBe(true); // 45 degrees off
  });

  it('no shield, zero shield and undefined never block', () => {
    expect(shieldBlocks(undefined, O, 0, { x: 10, y: 0 })).toBe(false);
    expect(shieldBlocks(0, O, 0, { x: 10, y: 0 })).toBe(false);
  });

  it('follows the defender facing', () => {
    expect(shieldBlocks(120, O, 180, { x: -10, y: 0 })).toBe(true);
    expect(shieldBlocks(120, O, 180, { x: 10, y: 0 })).toBe(false);
  });
});

describe('geometry helpers', () => {
  it('angleDiff wraps', () => {
    expect(angleDiff(350, 10)).toBe(20);
    expect(angleDiff(10, 350)).toBe(-20);
    expect(Math.abs(angleDiff(0, 180))).toBe(180);
  });

  it('facing quantises to four directions', () => {
    expect(facingFromAngle(0)).toBe('right');
    expect(facingFromAngle(90)).toBe('down');
    expect(facingFromAngle(180)).toBe('left');
    expect(facingFromAngle(270)).toBe('up');
    expect(facingFromAngle(-90)).toBe('up');
    expect(facingFromAngle(359)).toBe('right');
  });
});

// ---------------------------------------------------------------------------

interface FakeWorld extends CombatWorld {
  hits: { hit: Omit<HitInfo, 'targetInstanceId'>; from: Vec2 }[];
  projectiles: unknown[];
  player: Vec2;
  targetable: boolean;
  actorList: EnemyActor[];
  bus: EventBus;
}

function fakeWorld(grid: TileGrid = openGrid()): FakeWorld {
  const w: FakeWorld = {
    grid,
    bus: new EventBus(),
    rng: seededRandom(3),
    screenId: 'c1.test',
    hits: [],
    projectiles: [],
    player: { x: 100, y: 100 },
    targetable: true,
    actorList: [],
    playerPosition: () => w.player,
    playerTargetable: () => w.targetable,
    hitPlayer: (hit, from) => {
      w.hits.push({ hit, from });
      return true;
    },
    spawnProjectile: (s) => {
      w.projectiles.push(s);
    },
    extraBlocked: () => false,
    actors: () => w.actorList,
  };
  return w;
}

function actor(id: EnemyId, pos: Vec2): EnemyActor {
  return new EnemyActor(id, statsFromDef(TUNING.enemies[id]), pos, (attackId) => ({ kind: 'enemy', enemyId: id, attackId }), seededRandom(5));
}

const hitInfo = (amount: number, kb: Vec2 = O, stunMs = 0): HitInfo => ({
  source: { kind: 'player', abilityId: 'punchCombo' },
  targetInstanceId: 'x',
  amount,
  knockback: kb,
  stunMs,
  holdMs: 0,
});

describe('EnemyActor taking hits', () => {
  it('loses health, goes down at zero, then ignores further hits', () => {
    const a = actor('lad', { x: 50, y: 50 });
    expect(a.takeHit(hitInfo(10), O)).toBe('hit');
    expect(a.health).toBe(TUNING.enemies.lad.maxHealth - 10);
    expect(a.takeHit(hitInfo(9999), O)).toBe('hit');
    expect(a.down).toBe(true);
    expect(a.takeHit(hitInfo(10), O)).toBe('ignored');
  });

  it('shielded security: blocked from the front, hurt from behind', () => {
    const a = actor('security', { x: 50, y: 50 });
    a.facingDeg = 0;
    expect(a.takeHit(hitInfo(20), { x: 80, y: 50 })).toBe('blocked');
    expect(a.health).toBe(TUNING.enemies.security.maxHealth);
    expect(a.takeHit(hitInfo(20), { x: 20, y: 50 })).toBe('hit');
    expect(a.health).toBe(TUNING.enemies.security.maxHealth - 20);
  });

  it('a stunned shield (the Glove) and a piercing hit (Sliotar) both get through', () => {
    const stunned = actor('security', { x: 50, y: 50 });
    stunned.facingDeg = 0;
    stunned.stun(1000);
    expect(stunned.takeHit(hitInfo(20), { x: 80, y: 50 })).toBe('hit');
    const pierced = actor('security', { x: 50, y: 50 });
    pierced.facingDeg = 0;
    expect(pierced.takeHit(hitInfo(20), { x: 80, y: 50 }, { pierceShield: true })).toBe('hit');
  });

  it('invulnerable actors ignore hits (the ram)', () => {
    const a = actor('lad', O);
    a.invulnerable = true;
    expect(a.takeHit(hitInfo(50), O)).toBe('ignored');
    expect(a.health).toBe(TUNING.enemies.lad.maxHealth);
  });

  it('damageTakenMultiplier applies while dazed', () => {
    const a = actor('lad', O);
    a.damageTakenMultiplier = 2;
    a.takeHit(hitInfo(10), O);
    expect(a.health).toBe(TUNING.enemies.lad.maxHealth - 20);
  });

  it('knockback slides the enemy away, and resistance shortens it', () => {
    const slide = (id: EnemyId): number => {
      const w = fakeWorld();
      w.targetable = false;
      const a = actor(id, { x: 50, y: 50 });
      a.takeHit(hitInfo(1, { x: 120, y: 0 }), { x: 0, y: 50 });
      for (let i = 0; i < 100; i++) a.tick(16, w);
      return a.pos.x - 50;
    };
    const lad = slide('lad');
    expect(lad).toBeGreaterThan(5);
    expect(slide('mascot')).toBeLessThan(lad); // 0.4 knockback resistance
  });

  it('a hit with stun stuns', () => {
    const a = actor('lad', O);
    a.takeHit(hitInfo(1, O, 500), O);
    expect(a.status).toBe('stunned');
  });
});

describe('enemies telegraph every attack', () => {
  it('a lad in reach telegraphs for its telegraphMs, then swings once', () => {
    const w = fakeWorld();
    const tele = record(w.bus, 'enemy:telegraph');
    w.player = { x: 60, y: 50 };
    const a = actor('lad', { x: 50, y: 50 });
    w.actorList = [a];
    a.tick(16, w);
    expect(a.status).toBe('telegraphing');
    expect(tele).toHaveLength(1);
    const swing = TUNING.enemies.lad.attacks[0];
    expect(tele[0]?.durationMs).toBe(swing?.telegraphMs);
    let t = 16;
    while (t < (swing?.telegraphMs ?? 0) - 20) {
      a.tick(16, w);
      t += 16;
      expect(w.hits).toHaveLength(0);
    }
    for (let i = 0; i < 10; i++) a.tick(16, w);
    expect(w.hits).toHaveLength(1);
    expect(w.hits[0]?.hit.amount).toBe(swing?.damage);
  });

  it('does not attack when Andrew is not targetable', () => {
    const w = fakeWorld();
    w.targetable = false;
    w.player = { x: 55, y: 50 };
    const a = actor('lad', { x: 50, y: 50 });
    for (let i = 0; i < 200; i++) a.tick(16, w);
    expect(w.hits).toHaveLength(0);
    expect(a.status).toBe('normal');
  });

  it('brawler grab carries its hold time', () => {
    const w = fakeWorld();
    w.player = { x: 56, y: 50 };
    const a = actor('brawler', { x: 50, y: 50 });
    w.actorList = [a];
    // Only the grab is off cooldown at the start in this contrived setup.
    for (let i = 0; i < 600; i++) a.tick(16, w);
    const grab = w.hits.find((h) => h.hit.holdMs > 0);
    expect(grab?.hit.holdMs).toBe(TUNING.enemies.brawler.attacks.find((a) => a.id === 'grab')?.holdMs);
  });

  it('a clerk fires its three-shot burst', () => {
    const w = fakeWorld();
    w.player = { x: 50 + 100, y: 50 };
    const a = actor('clerk', { x: 50, y: 50 });
    for (let i = 0; i < 400; i++) a.tick(16, w);
    expect(w.projectiles.length).toBeGreaterThanOrEqual(3);
  });

  it('a disguised mascot stays put until Andrew is close, then is revealed', () => {
    const w = fakeWorld();
    const revealed = record(w.bus, 'enemy:revealed');
    w.player = { x: 300, y: 50 };
    const a = actor('mascot', { x: 50, y: 50 });
    expect(a.disguised).toBe(true);
    for (let i = 0; i < 50; i++) a.tick(16, w);
    expect(a.pos).toEqual({ x: 50, y: 50 });
    w.player = { x: 70, y: 50 };
    a.tick(16, w);
    expect(a.disguised).toBe(false);
    expect(revealed).toHaveLength(1);
  });
});

describe('Player in a drunk state', () => {
  const at = (buzz: number, extra: Partial<ReturnType<typeof freshPlayerSnapshot>> = {}) => {
    const p = new Player(new EventBus(), { ...freshPlayerSnapshot(), buzz, ...extra });
    p.pos = { x: 100, y: 60 };
    return p;
  };
  const run = (p: Player, ms: number, move: Vec2, held: ('sneak')[] = []) => {
    const grid = openGrid();
    const aims: number[] = [];
    for (let t = 0; t < ms; t += 16) {
      p.move(16, frame({ move, held, aim: { x: 300, y: p.pos.y } }), grid);
      aims.push(p.aimDeg);
    }
    return aims;
  };

  it('Sober and Grand move on a straight line with steady aim', () => {
    for (const buzz of [0, 40]) {
      const p = at(buzz);
      const aims = run(p, 1000, { x: 1, y: 0 });
      expect(p.pos.y).toBeCloseTo(60, 5);
      expect(Math.max(...aims.map((a) => Math.abs(a)))).toBeLessThan(1e-9);
    }
  });

  it('Locked drifts off the line and the aim sways within its amplitude', () => {
    const p = at(70);
    const aims = run(p, 3000, { x: 1, y: 0 });
    expect(Math.abs(p.pos.y - 60)).toBeGreaterThan(0.5);
    const max = Math.max(...aims.map((a) => Math.abs(a)));
    expect(max).toBeGreaterThan(1);
    expect(max).toBeLessThanOrEqual(TUNING.buzz.effects.locked.aimSwayDeg + 0.5);
  });

  it('Banjaxed sways more than Locked', () => {
    const maxAim = (buzz: number) => Math.max(...run(at(buzz), 3000, { x: 1, y: 0 }).map((a) => Math.abs(a)));
    expect(maxAim(95)).toBeGreaterThan(maxAim(70));
  });

  it('tea steadies the aim, tequila sways more', () => {
    const steady = at(70);
    steady.timed.add('steadyAim', 20_000, 1);
    expect(Math.max(...run(steady, 2000, O).map((a) => Math.abs(a)))).toBeLessThan(1e-9);
    const base = Math.max(...run(at(70), 2000, O).map((a) => Math.abs(a)));
    const tequila = at(70);
    tequila.timed.add('extraSway', 10_000, 1.6);
    expect(Math.max(...run(tequila, 2000, O).map((a) => Math.abs(a)))).toBeGreaterThan(base);
  });

  it('bourbon makes Andrew faster, sneaking makes him slower', () => {
    const dist = (setup: (p: Player) => void, held: 'sneak'[] = []): number => {
      const p = at(0);
      setup(p);
      run(p, 500, { x: 1, y: 0 }, held);
      return p.pos.x - 100;
    };
    const base = dist(() => undefined);
    expect(base).toBeCloseTo(TUNING.player.runSpeed * 0.512, 0);
    expect(dist((p) => p.timed.add('speedBoost', 6000, 1.35))).toBeGreaterThan(base);
    expect(dist(() => undefined, ['sneak'])).toBeCloseTo(base * TUNING.player.sneakSpeedMultiplier, 0);
  });

  it('cannot move while on the floor after Banjaxed', () => {
    const p = at(0);
    p.buzz.add(100);
    p.buzz.tick(TUNING.buzz.banjaxedPeakMs);
    expect(p.incapacitated).toBe(true);
    expect(p.canAct).toBe(false);
    run(p, 500, { x: 1, y: 0 });
    expect(p.pos.x).toBe(100);
  });

  it('Locked knockback resistance shortens the shove from a hit', () => {
    const shove = (buzz: number): number => {
      const p = at(buzz);
      p.takeHit({ source: { kind: 'hazard', hazardId: 'x' }, targetInstanceId: 'andrew', amount: 1, knockback: { x: 150, y: 0 }, stunMs: 0, holdMs: 0 });
      run(p, 1000, O);
      return p.pos.x - 100;
    };
    expect(shove(70)).toBeLessThan(shove(0));
  });

  it('a hit holds him in place when it carries holdMs', () => {
    const p = at(0);
    p.takeHit({ source: { kind: 'hazard', hazardId: 'x' }, targetInstanceId: 'andrew', amount: 1, knockback: O, stunMs: 0, holdMs: 1000 });
    expect(p.held).toBe(true);
    run(p, 500, { x: 1, y: 0 });
    expect(p.pos.x).toBe(100);
  });

  it('death: health 0 sets dead and further hits are ignored', () => {
    const p = at(0);
    const hit = { source: { kind: 'hazard', hazardId: 'x' }, targetInstanceId: 'andrew', amount: 1000, knockback: O, stunMs: 0, holdMs: 0 } as const;
    expect(p.takeHit(hit)).toBe(true);
    expect(p.dead).toBe(true);
    expect(p.health.current).toBe(0);
    expect(p.takeHit(hit)).toBe(false);
  });

  it('after being hit he is briefly invulnerable so one swing cannot hit twice', () => {
    const p = at(0);
    const hit = { source: { kind: 'hazard', hazardId: 'x' }, targetInstanceId: 'andrew', amount: 5, knockback: O, stunMs: 0, holdMs: 0 } as const;
    expect(p.takeHit(hit)).toBe(true);
    expect(p.takeHit(hit)).toBe(false);
    expect(p.health.current).toBe(95);
  });
});

describe('footstep noise (DESIGN 7.3)', () => {
  const walk = (buzz: number, sneak: boolean): number => {
    const p = new Player(new EventBus(), { ...freshPlayerSnapshot(), buzz });
    p.pos = { x: 100, y: 60 };
    p.move(16, frame({ move: { x: 1, y: 0 }, held: sneak ? ['sneak'] : [] }), openGrid());
    return p.footstepNoiseRadius();
  };

  it('standing still is silent', () => {
    const p = new Player(new EventBus(), freshPlayerSnapshot());
    p.move(16, frame(), openGrid());
    expect(p.footstepNoiseRadius()).toBe(0);
  });

  it('walking makes noise, sneaking is silent below Locked', () => {
    expect(walk(0, false)).toBeGreaterThan(0);
    expect(walk(0, true)).toBe(0);
    expect(walk(40, true)).toBe(0);
  });

  it('Locked and above makes even sneaking audible at short range', () => {
    expect(walk(70, true)).toBeGreaterThan(0);
    expect(walk(70, true)).toBeLessThan(walk(70, false));
    expect(walk(95, true)).toBeGreaterThanOrEqual(walk(70, true));
  });

  it('footsteps are louder at Locked than at Grand', () => {
    expect(walk(70, false)).toBeGreaterThan(walk(40, false));
  });
});

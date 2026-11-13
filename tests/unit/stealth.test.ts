/** DESIGN.md 7.3: cones, line of sight, hearing, detection, alarm hand-off, Act Natural. */

import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/content/tuning';
import { EventBus } from '../../src/core/events';
import type { AlertState, AlarmFightId, NoiseEvent, StealthSectionDef, Vec2 } from '../../src/core/types';
import { gridFromAscii, tileCentre } from '../../src/systems/grid';
import { Guard, Hazard, StealthRunner, actingNatural, canHear, canSee, nextWaypoint, stepDetection } from '../../src/systems/stealth';
import type { StealthHost } from '../../src/systems/stealth';
import { openGrid, record } from './helpers';

const cone = { range: 100, angleDeg: 70 };
const O = { x: 160, y: 96 };
const polar = (deg: number, r: number): Vec2 => ({ x: O.x + Math.cos((deg * Math.PI) / 180) * r, y: O.y + Math.sin((deg * Math.PI) / 180) * r });

describe('vision cone', () => {
  const g = openGrid();
  it('sees inside the angle and range, not outside', () => {
    expect(canSee(g, O, 0, cone, polar(0, 50))).toBe(true);
    expect(canSee(g, O, 0, cone, polar(34, 50))).toBe(true);
    expect(canSee(g, O, 0, cone, polar(-34, 50))).toBe(true);
    expect(canSee(g, O, 0, cone, polar(36, 50))).toBe(false);
    expect(canSee(g, O, 0, cone, polar(90, 50))).toBe(false);
    expect(canSee(g, O, 0, cone, polar(180, 50))).toBe(false);
    expect(canSee(g, O, 0, cone, polar(0, 99))).toBe(true);
    expect(canSee(g, O, 0, cone, polar(0, 101))).toBe(false);
  });

  it('follows facing, including the 360 wrap', () => {
    expect(canSee(g, O, 180, cone, polar(180, 50))).toBe(true);
    expect(canSee(g, O, 350, cone, polar(10, 50))).toBe(true);
    expect(canSee(g, O, 90, cone, polar(0, 50))).toBe(false);
  });

  it('is blocked by sight-blocking tiles, not by tiles that only block movement', () => {
    const wall = gridFromAscii(['..........', '....#.....', '..........']);
    const from = tileCentre({ col: 0, row: 1 });
    expect(canSee(wall, from, 0, cone, tileCentre({ col: 3, row: 1 }))).toBe(true);
    expect(canSee(wall, from, 0, { range: 200, angleDeg: 70 }, tileCentre({ col: 6, row: 1 }))).toBe(false);
    const crate = gridFromAscii(['..........', '....x.....', '..........']);
    expect(canSee(crate, from, 0, { range: 200, angleDeg: 70 }, tileCentre({ col: 6, row: 1 }))).toBe(true);
    const hedge = gridFromAscii(['..........', '....o.....', '..........']);
    expect(canSee(hedge, from, 0, { range: 200, angleDeg: 70 }, tileCentre({ col: 6, row: 1 }))).toBe(false);
  });

  it('sees a target standing on the guard', () => {
    expect(canSee(g, O, 123, cone, O)).toBe(true);
  });
});

describe('hearing', () => {
  const noise = (r: number, x: number): NoiseEvent => ({ kind: 'bottle', position: { x, y: 0 }, radius: r });
  it('needs the guard inside both the noise radius and its own hearing radius', () => {
    expect(canHear({ x: 0, y: 0 }, 72, noise(90, 60))).toBe(true);
    expect(canHear({ x: 0, y: 0 }, 72, noise(90, 80))).toBe(false); // outside hearing
    expect(canHear({ x: 0, y: 0 }, 200, noise(50, 60))).toBe(false); // outside noise radius
  });
  it('deaf guards (drones) and silent noises are ignored', () => {
    expect(canHear({ x: 0, y: 0 }, 0, noise(90, 1))).toBe(false);
    expect(canHear({ x: 0, y: 0 }, 72, noise(0, 1))).toBe(false);
  });
});

describe('detection fill', () => {
  it('fills in about one second', () => {
    expect(TUNING.stealth.detectionFillMs).toBe(1000);
    expect(stepDetection(0, true, 500)).toBeCloseTo(0.5, 5);
    expect(stepDetection(0, true, 1000)).toBe(1);
    expect(stepDetection(0.9, true, 1000)).toBe(1);
  });
  it('drains when not seen and stops at zero', () => {
    expect(stepDetection(1, false, 500)).toBeCloseTo(1 - TUNING.stealth.detectionDrainPerSecond * 0.5, 5);
    expect(stepDetection(0.1, false, 5000)).toBe(0);
  });
  it('drains slower than it fills', () => {
    expect(stepDetection(1, false, 1000)).toBeGreaterThan(0);
  });
});

function suit(route: Guard['placement']['route'], seated = false): Guard {
  const def = TUNING.enemies.suit;
  return new Guard('suit', { enemyId: 'suit', route, ...(seated ? { seated } : {}) }, def.senses ?? { visionRange: 0, visionAngleDeg: 0, hearingRadius: 0 }, def.moveSpeed);
}
const still = (at: Vec2, facing: 'right' | 'left' | 'up' | 'down' = 'right') => ({ mode: 'stationary' as const, waypoints: [{ position: at, waitMs: 0, facing }] });

describe('Guard detection and alert states', () => {
  const grid = openGrid();
  const target = (x: number, hidden = false) => ({ pos: { x, y: 100 }, hidden });

  it('a guard who sees Andrew fills the marker in about a second and raises the alarm', () => {
    const bus = new EventBus();
    const alerts = record(bus, 'stealth:alertChanged');
    const g = suit(still({ x: 50, y: 100 }));
    let alarmAt = -1;
    for (let t = 16; t <= 1200; t += 16) {
      if (g.tick(16, grid, target(90), bus)) {
        alarmAt = t;
        break;
      }
    }
    expect(alarmAt).toBeGreaterThanOrEqual(992);
    expect(alarmAt).toBeLessThanOrEqual(1024);
    expect(g.alert).toBe('alarm');
    expect(alerts.map((a) => [a.from, a.to])).toEqual([['patrol', 'detecting'], ['detecting', 'alarm']]);
  });

  it('half a second of sight then leaving the cone never alarms and drains back', () => {
    const bus = new EventBus();
    const g = suit(still({ x: 50, y: 100 }));
    for (let t = 0; t < 500; t += 16) g.tick(16, grid, target(90), bus);
    expect(g.detection).toBeGreaterThan(0.4);
    expect(g.detection).toBeLessThan(0.6);
    for (let t = 0; t < 3000; t += 16) expect(g.tick(16, grid, target(400), bus)).toBe(false);
    expect(g.detection).toBe(0);
    expect(g.alert).not.toBe('detecting');
    expect(g.alert).not.toBe('alarm');
  });

  it('a hidden Andrew (Act Natural) is never seen', () => {
    const bus = new EventBus();
    const g = suit(still({ x: 50, y: 100 }));
    for (let t = 0; t < 5000; t += 16) expect(g.tick(16, grid, target(70, true), bus)).toBe(false);
    expect(g.detection).toBe(0);
    expect(g.alert).toBe('patrol');
  });

  it('behind the guard is safe', () => {
    const bus = new EventBus();
    const g = suit(still({ x: 100, y: 100 }));
    for (let t = 0; t < 3000; t += 16) g.tick(16, grid, target(60), bus);
    expect(g.detection).toBe(0);
  });

  it('a noise in hearing range sends it to investigate that spot; a far one is ignored', () => {
    const bus = new EventBus();
    const g = suit(still({ x: 50, y: 100 }));
    g.hear({ kind: 'bottle', position: { x: 50, y: 400 }, radius: 90 }, bus);
    expect(g.alert).toBe('patrol');
    g.hear({ kind: 'bottle', position: { x: 50, y: 140 }, radius: 90 }, bus);
    expect(g.alert).toBe<AlertState>('investigating');
    expect(g.investigateTarget).toEqual({ x: 50, y: 140 });
  });

  it('gives up investigating after investigateGiveUpMs and returns to patrol', () => {
    const bus = new EventBus();
    const g = suit(still({ x: 50, y: 100 }, 'up'));
    g.hear({ kind: 'bottle', position: { x: 50, y: 140 }, radius: 90 }, bus);
    for (let t = 0; t < TUNING.stealth.investigateGiveUpMs + 500; t += 16) g.tick(16, grid, target(400, false), bus);
    expect(g.alert).toBe('patrol');
  });

  it('seated guards have a shorter vision range', () => {
    const standing = suit(still(O));
    const seated = suit(still(O), true);
    expect(seated.senses.visionRange).toBeCloseTo(standing.senses.visionRange * TUNING.stealth.seatedVisionMultiplier, 5);
  });

  it('a patrolling guard walks its route and waits at stops', () => {
    const bus = new EventBus();
    const route = {
      mode: 'pingPong' as const,
      waypoints: [
        { position: { x: 40, y: 100 }, waitMs: 500 },
        { position: { x: 100, y: 100 }, waitMs: 500 },
      ],
    };
    const g = suit(route);
    for (let t = 0; t < 4000; t += 16) g.tick(16, grid, target(9999, false), bus);
    expect(g.pos.x).toBeGreaterThan(40);
    expect(g.pos.x).toBeLessThanOrEqual(100.5);
  });
});

describe('patrol routes', () => {
  const wp = (x: number) => ({ position: { x, y: 0 }, waitMs: 0 });
  it('loop wraps, pingPong reverses, stationary stays', () => {
    const loop = { mode: 'loop' as const, waypoints: [wp(0), wp(1), wp(2)] };
    expect(nextWaypoint(loop, 2, 1)).toEqual({ index: 0, dir: 1 });
    const pp = { mode: 'pingPong' as const, waypoints: [wp(0), wp(1), wp(2)] };
    expect(nextWaypoint(pp, 2, 1)).toEqual({ index: 1, dir: -1 });
    expect(nextWaypoint(pp, 0, -1)).toEqual({ index: 1, dir: 1 });
    expect(nextWaypoint({ mode: 'stationary', waypoints: [wp(0), wp(1)] }, 0, 1).index).toBe(0);
  });
});

describe('Act Natural', () => {
  const board = { id: 'b', kind: 'noticeboard' as const, position: { x: 100, y: 100 }, radius: 14 };
  const still_ = TUNING.stealth.actNaturalStillMs;

  it('needs stillness beside a prop and the ability', () => {
    expect(actingNatural([board], { x: 105, y: 100 }, still_, true)).toBe(true);
    expect(actingNatural([board], { x: 105, y: 100 }, still_ - 1, true)).toBe(false);
    expect(actingNatural([board], { x: 105, y: 100 }, 0, true)).toBe(false);
  });
  it('is off when away from the prop or without the ability', () => {
    expect(actingNatural([board], { x: 140, y: 100 }, 5000, true)).toBe(false);
    expect(actingNatural([board], { x: 105, y: 100 }, 5000, false)).toBe(false);
    expect(actingNatural([], { x: 105, y: 100 }, 5000, true)).toBe(false);
  });
  it('tall corn works as a prop without the ability (chapter 6)', () => {
    const corn = { id: 'c', kind: 'tallCorn' as const, position: { x: 0, y: 0 }, radius: 10 };
    expect(actingNatural([corn], { x: 3, y: 3 }, 1000, false)).toBe(true);
  });
  it('requires a real stillness window', () => {
    expect(still_).toBeGreaterThan(0);
  });
});

describe('hazards', () => {
  const grid = openGrid();
  const per = (o: Partial<Parameters<Hazard['detects']>[1]> = {}) => ({ pos: { x: 100, y: 100 }, hidden: false, running: false, thermalVisible: false, ...o });

  it('ground sensors catch running only', () => {
    const h = new Hazard({ kind: 'groundSensor', id: 's', position: { x: 100, y: 100 }, radius: 30 });
    expect(h.detects(grid, per({ running: true }))).toBe(true);
    expect(h.detects(grid, per({ running: false }))).toBe(false);
    expect(h.detects(grid, per({ running: true, pos: { x: 200, y: 100 } }))).toBe(false);
  });

  it('thermal masts need heat above the threshold', () => {
    const h = new Hazard({ kind: 'thermalMast', id: 't', position: { x: 60, y: 100 }, range: 100 });
    expect(h.detects(grid, per({ thermalVisible: false }))).toBe(false);
    expect(h.detects(grid, per({ thermalVisible: true }))).toBe(true);
  });

  it('floodlights sweep and detect inside their cone, not behind the hidden', () => {
    const h = new Hazard({ kind: 'floodlight', id: 'f', position: { x: 60, y: 100 }, cone: { range: 120, angleDeg: 60 }, sweepFromDeg: 0, sweepToDeg: 0, sweepPeriodMs: 2000 });
    h.tick(16, grid, per({ pos: { x: 400, y: 400 } }));
    expect(h.detects(grid, per())).toBe(true);
    expect(h.detects(grid, per({ hidden: true }))).toBe(false);
  });

  it('a disabled hazard never fills', () => {
    const h = new Hazard({ kind: 'groundSensor', id: 's', position: { x: 100, y: 100 }, radius: 30 });
    h.enabled = false;
    for (let i = 0; i < 100; i++) expect(h.tick(16, grid, per({ running: true }))).toBe(false);
  });

  it('an enabled one fills in about a second', () => {
    const h = new Hazard({ kind: 'groundSensor', id: 's', position: { x: 100, y: 100 }, radius: 30 });
    let at = 0;
    for (let t = 16; t <= 1200 && !at; t += 16) if (h.tick(16, grid, per({ running: true }))) at = t;
    expect(at).toBeGreaterThanOrEqual(992);
    expect(at).toBeLessThanOrEqual(1024);
  });
});

describe('StealthRunner: alarm hand-off and clean runs', () => {
  const def: StealthSectionDef = {
    id: 'c2.stealth.bog',
    checkpointId: 'c2.cp.bog',
    guards: [{ enemyId: 'suit', route: still({ x: 50, y: 100 }) }],
    hazards: [],
    hidingProps: [],
  };
  const make = () => {
    const bus = new EventBus();
    const alarms: { section: string; fight: AlarmFightId; guards: number }[] = [];
    const clean: string[] = [];
    const host: StealthHost = {
      bus,
      getGrid: () => openGrid(),
      raiseAlarm: (s, f, g) => void alarms.push({ section: s, fight: f, guards: g.length }),
      cleanRun: (d) => void clean.push(d.id),
    };
    return { r: new StealthRunner(def, host), bus, alarms, clean };
  };
  const seen = { pos: { x: 90, y: 100 }, hidden: false, running: false, thermalVisible: false };

  it('does nothing before start', () => {
    const { r, alarms } = make();
    for (let i = 0; i < 100; i++) r.tick(16, seen);
    expect(alarms).toEqual([]);
    expect(r.active).toBe(false);
  });

  it('filling detection hands off to <id>.alarm exactly once, with the guards', () => {
    const { r, bus, alarms } = make();
    const events = record(bus, 'stealth:alarm');
    r.start();
    for (let i = 0; i < 200; i++) r.tick(16, seen);
    expect(alarms).toEqual([{ section: 'c2.stealth.bog', fight: 'c2.stealth.bog.alarm', guards: 1 }]);
    expect(events).toEqual([{ sectionId: 'c2.stealth.bog', fightId: 'c2.stealth.bog.alarm' }]);
    expect(r.alarmRaised).toBe(true);
    expect(r.active).toBe(false);
  });

  it('finishing without the alarm is a clean run; finishing after an alarm is not', () => {
    const a = make();
    a.r.start();
    a.r.finish();
    expect(a.clean).toEqual(['c2.stealth.bog']);
    a.r.finish();
    expect(a.clean).toHaveLength(1);
    const b = make();
    b.r.start();
    b.r.alarm();
    b.r.finish();
    expect(b.clean).toEqual([]);
  });

  it('finish before start is ignored; alarm after finish is ignored', () => {
    const a = make();
    a.r.finish();
    expect(a.clean).toEqual([]);
    a.r.start();
    a.r.finish();
    a.r.alarm();
    expect(a.alarms).toEqual([]);
  });

  it('noise reaches guards only while active', () => {
    const { r } = make();
    const n: NoiseEvent = { kind: 'bottle', position: { x: 50, y: 130 }, radius: 90 };
    r.noise(n);
    expect(r.guards[0]?.alert).toBe('patrol');
    r.start();
    r.noise(n);
    expect(r.guards[0]?.alert).toBe('investigating');
  });

  it('maxDetection reports the highest marker for the HUD', () => {
    const { r } = make();
    r.start();
    for (let i = 0; i < 20; i++) r.tick(16, seen);
    expect(r.maxDetection()).toBeGreaterThan(0.2);
  });
});

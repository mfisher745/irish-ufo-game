/**
 * Stealth: vision cones with line of sight, hearing, detection, alert
 * states, patrols, hiding props / Act Natural, hazards, clean runs and the
 * hand-off to the `.alarm` fight. DESIGN.md section 7.3,
 * docs/chapters/04, 05, 06, 08, 09. Plain TypeScript.
 */

import { TUNING } from '../content/tuning';
import { GameEvents } from '../core/types';
import type {
  AlarmFightId,
  AlertState,
  ConeDef,
  EnemyId,
  GameEventBus,
  GuardPlacement,
  GuardSensesDef,
  GuardSnapshot,
  HidingPropDef,
  NoiseEvent,
  PatrolRoute,
  StealthHazardDef,
  StealthSectionDef,
  StealthSectionId,
  TileGrid,
  Vec2,
} from '../core/types';
import { angleDiff, angleFromFacing, angleTo, distance, normalize, scale, sub, add, turnToward } from './geometry';
import { findPath, lineOfSight, moveBox, walkableLine } from './grid';

// ---------------------------------------------------------------------------
// Pure perception
// ---------------------------------------------------------------------------

/** Whether `target` is inside a cone from `from` facing `facingDeg`, with clear line of sight. */
export function canSee(grid: TileGrid, from: Vec2, facingDeg: number, cone: ConeDef, target: Vec2): boolean {
  const d = distance(from, target);
  if (d > cone.range) return false;
  if (d > 0.5 && Math.abs(angleDiff(facingDeg, angleTo(from, target))) > cone.angleDeg / 2) return false;
  return lineOfSight(grid, from, target);
}

/** A guard hears a noise if it is within the noise's radius and the guard's hearing radius. */
export function canHear(listener: Vec2, hearingRadius: number, noise: NoiseEvent): boolean {
  if (hearingRadius <= 0 || noise.radius <= 0) return false;
  const d = distance(listener, noise.position);
  return d <= noise.radius && d <= hearingRadius;
}

/** Detection fill: rises over `detectionFillMs` while seen, drains otherwise. Returns 0..1. */
export function stepDetection(current: number, seen: boolean, dtMs: number, t = TUNING.stealth): number {
  if (seen) return Math.min(1, current + dtMs / t.detectionFillMs);
  return Math.max(0, current - (t.detectionDrainPerSecond * dtMs) / 1000);
}

/** Whether Act Natural hides Andrew right now. */
export function actingNatural(
  props: readonly HidingPropDef[],
  playerPos: Vec2,
  stillMs: number,
  hasAbility: boolean,
): boolean {
  if (stillMs < TUNING.stealth.actNaturalStillMs) return false;
  return props.some((p) => (hasAbility || p.kind === 'tallCorn') && distance(p.position, playerPos) <= p.radius);
}

/** Where a patrol is heading: index and direction into the waypoint list. */
export function nextWaypoint(route: PatrolRoute, index: number, dir: 1 | -1): { index: number; dir: 1 | -1 } {
  const n = route.waypoints.length;
  if (n <= 1 || route.mode === 'stationary') return { index: 0, dir };
  if (route.mode === 'loop') return { index: (index + 1) % n, dir };
  let next = index + dir;
  let nd = dir;
  if (next >= n || next < 0) {
    nd = (dir === 1 ? -1 : 1) as 1 | -1;
    next = index + nd;
  }
  return { index: next, dir: nd };
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export interface PerceptionTarget {
  readonly pos: Vec2;
  /** Hidden by Act Natural or a scripted state. */
  readonly hidden: boolean;
}

let guardSeq = 1;

export class Guard {
  readonly instanceId: string;
  pos: Vec2;
  facingDeg: number;
  alert: AlertState = 'patrol';
  detection = 0;
  investigateTarget: Vec2 | undefined;
  private wp = 0;
  private dir: 1 | -1 = 1;
  private waitMs = 0;
  private investigateMs = 0;
  private lookMs = 0;
  private path: Vec2[] = [];
  readonly senses: GuardSensesDef;

  constructor(
    readonly enemyId: EnemyId,
    readonly placement: GuardPlacement,
    senses: GuardSensesDef,
    private readonly moveSpeed: number,
  ) {
    this.instanceId = `guard.${enemyId}#${guardSeq++}`;
    const first = placement.route.waypoints[0];
    this.pos = first?.position ?? { x: 0, y: 0 };
    this.facingDeg = first?.facing ? angleFromFacing(first.facing) : 90;
    this.waitMs = first?.waitMs ?? 0;
    const mult = placement.seated ? TUNING.stealth.seatedVisionMultiplier : 1;
    this.senses = { ...senses, visionRange: senses.visionRange * mult };
  }

  cone(): ConeDef {
    return { range: this.senses.visionRange, angleDeg: this.senses.visionAngleDeg };
  }

  snapshot(): GuardSnapshot {
    return {
      instanceId: this.instanceId,
      enemyId: this.enemyId,
      position: this.pos,
      facingDeg: this.facingDeg,
      alert: this.alert,
      detection: this.detection,
      ...(this.investigateTarget ? { investigateTarget: this.investigateTarget } : {}),
    };
  }

  /** A noise reached the guard: go and look (seated guards only turn). */
  hear(noise: NoiseEvent, bus: GameEventBus): void {
    if (this.alert === 'alarm' || this.alert === 'detecting') return;
    if (!canHear(this.pos, this.senses.hearingRadius, noise)) return;
    this.investigateTarget = noise.position;
    this.investigateMs = TUNING.stealth.investigateGiveUpMs;
    this.lookMs = 0;
    this.path = [];
    this.setAlert('investigating', bus);
  }

  /**
   * Advances the guard. Returns true on the tick detection fills (alarm).
   */
  tick(dtMs: number, grid: TileGrid, target: PerceptionTarget, bus: GameEventBus): boolean {
    if (this.alert === 'alarm') return false;
    const seen = !target.hidden && canSee(grid, this.pos, this.facingDeg, this.cone(), target.pos);
    this.detection = stepDetection(this.detection, seen, dtMs);
    if (seen) {
      if (this.alert !== 'detecting') this.setAlert('detecting', bus);
      this.facingDeg = turnToward(this.facingDeg, angleTo(this.pos, target.pos), (TUNING.stealth.turnDegPerSecond * dtMs) / 1000);
      this.investigateTarget = target.pos;
      if (this.detection >= 1) {
        this.setAlert('alarm', bus);
        return true;
      }
      return false;
    }
    if (this.alert === 'detecting' && this.detection <= 0) {
      this.investigateMs = TUNING.stealth.investigateGiveUpMs;
      this.lookMs = 0;
      this.setAlert(this.investigateTarget ? 'investigating' : 'patrol', bus);
    }
    if (this.alert === 'investigating') this.tickInvestigate(dtMs, grid, bus);
    else if (this.alert === 'patrol') this.tickPatrol(dtMs, grid);
    return false;
  }

  private tickInvestigate(dtMs: number, grid: TileGrid, bus: GameEventBus): void {
    this.investigateMs -= dtMs;
    const t = this.investigateTarget;
    if (!t || this.investigateMs <= 0) {
      this.investigateTarget = undefined;
      this.path = [];
      this.setAlert('patrol', bus);
      return;
    }
    if (this.placement.seated) {
      this.facingDeg = turnToward(this.facingDeg, angleTo(this.pos, t), (TUNING.stealth.turnDegPerSecond * dtMs) / 1000);
      return;
    }
    if (distance(this.pos, t) > 6) this.walkToward(t, dtMs, grid);
    else {
      this.lookMs += dtMs;
      this.facingDeg += (TUNING.stealth.turnDegPerSecond * dtMs) / 1000 / 2;
      if (this.lookMs >= TUNING.stealth.lookAroundMs) this.investigateMs = 0;
    }
  }

  private tickPatrol(dtMs: number, grid: TileGrid): void {
    const route = this.placement.route;
    const wp = route.waypoints[this.wp];
    if (!wp) return;
    if (distance(this.pos, wp.position) > 2) {
      this.walkToward(wp.position, dtMs, grid);
      return;
    }
    if (wp.facing) this.facingDeg = turnToward(this.facingDeg, angleFromFacing(wp.facing), (TUNING.stealth.turnDegPerSecond * dtMs) / 1000);
    if (route.mode === 'stationary') return;
    this.waitMs -= dtMs;
    if (this.waitMs > 0) return;
    const next = nextWaypoint(route, this.wp, this.dir);
    this.wp = next.index;
    this.dir = next.dir;
    this.waitMs = route.waypoints[this.wp]?.waitMs ?? 0;
    this.path = [];
  }

  private walkToward(goal: Vec2, dtMs: number, grid: TileGrid): void {
    let aim = goal;
    if (!walkableLine(grid, this.pos, goal)) {
      if (this.path.length === 0) this.path = findPath(grid, this.pos, goal) ?? [];
      const n = this.path[0];
      if (n && distance(n, this.pos) < 3) this.path.shift();
      aim = this.path[0] ?? goal;
    }
    const dir = normalize(sub(aim, this.pos));
    const speed = this.moveSpeed * TUNING.stealth.patrolSpeedFraction;
    const step = Math.min((speed * dtMs) / 1000, distance(this.pos, aim));
    const size = TUNING.player.bodyWidth;
    this.pos = moveBox(grid, this.pos, size, size, scale(dir, step)).position;
    if (dir.x !== 0 || dir.y !== 0) {
      this.facingDeg = turnToward(this.facingDeg, angleTo(this.pos, add(this.pos, dir)), (TUNING.stealth.turnDegPerSecond * dtMs) / 1000);
    }
  }

  private setAlert(to: AlertState, bus: GameEventBus): void {
    if (to === this.alert) return;
    const from = this.alert;
    this.alert = to;
    bus.emit(GameEvents.StealthAlertChanged, { instanceId: this.instanceId, from, to });
  }
}

// ---------------------------------------------------------------------------
// Hazards
// ---------------------------------------------------------------------------

export interface HazardPerception {
  readonly pos: Vec2;
  readonly hidden: boolean;
  /** Moving at full speed (not sneaking). */
  readonly running: boolean;
  readonly thermalVisible: boolean;
}

export class Hazard {
  detection = 0;
  enabled = true;
  /** Current position and facing (trucks move, floodlights sweep). */
  pos: Vec2;
  facingDeg = 0;
  private clock = 0;
  private wp = 0;
  private dir: 1 | -1 = 1;
  private waitMs = 0;

  constructor(readonly def: StealthHazardDef) {
    switch (def.kind) {
      case 'patrolTruck':
        this.pos = def.route.waypoints[0]?.position ?? { x: 0, y: 0 };
        break;
      default:
        this.pos = def.position;
    }
    if (def.kind === 'floodlight') this.facingDeg = def.sweepFromDeg;
  }

  get id(): string {
    return this.def.id;
  }

  /** Cone for drawing and sight, if this hazard has one. */
  cone(): ConeDef | null {
    if (this.def.kind === 'patrolTruck') return this.def.headlights;
    if (this.def.kind === 'floodlight') return this.def.cone;
    return null;
  }

  /** Returns true when detection fills. */
  tick(dtMs: number, grid: TileGrid, p: HazardPerception): boolean {
    this.clock += dtMs;
    this.move(dtMs);
    if (!this.enabled) {
      this.detection = 0;
      return false;
    }
    const seen = this.detects(grid, p);
    this.detection = stepDetection(this.detection, seen, dtMs);
    return this.detection >= 1;
  }

  detects(grid: TileGrid, p: HazardPerception): boolean {
    const d = this.def;
    switch (d.kind) {
      case 'groundSensor':
        return p.running && distance(d.position, p.pos) <= d.radius;
      case 'thermalMast':
        return p.thermalVisible && distance(d.position, p.pos) <= d.range && lineOfSight(grid, d.position, p.pos);
      case 'patrolTruck':
        return !p.hidden && canSee(grid, this.pos, this.facingDeg, d.headlights, p.pos);
      case 'floodlight':
        return !p.hidden && canSee(grid, d.position, this.facingDeg, d.cone, p.pos);
    }
  }

  private move(dtMs: number): void {
    const d = this.def;
    if (d.kind === 'floodlight') {
      const phase = (this.clock % d.sweepPeriodMs) / d.sweepPeriodMs;
      const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      this.facingDeg = d.sweepFromDeg + angleDiff(d.sweepFromDeg, d.sweepToDeg) * tri;
      return;
    }
    if (d.kind !== 'patrolTruck') return;
    const wp = d.route.waypoints[this.wp];
    if (!wp) return;
    if (distance(this.pos, wp.position) > 2) {
      const dir = normalize(sub(wp.position, this.pos));
      const step = Math.min((d.speed * dtMs) / 1000, distance(this.pos, wp.position));
      this.pos = add(this.pos, scale(dir, step));
      this.facingDeg = angleTo({ x: 0, y: 0 }, dir);
      return;
    }
    this.waitMs -= dtMs;
    if (this.waitMs > 0) return;
    const next = nextWaypoint(d.route, this.wp, this.dir);
    this.wp = next.index;
    this.dir = next.dir;
    this.waitMs = d.route.waypoints[this.wp]?.waitMs ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Section runner
// ---------------------------------------------------------------------------

export interface StealthHost {
  readonly bus: GameEventBus;
  /** The grid of the screen the section is on. */
  getGrid(): TileGrid;
  /** Start the `.alarm` fight; the guards' positions are handed over. */
  raiseAlarm(sectionId: StealthSectionId, fightId: AlarmFightId, guards: readonly Guard[]): void;
  /** Finished without the alarm. */
  cleanRun(def: StealthSectionDef): void;
}

export class StealthRunner {
  readonly guards: Guard[];
  readonly hazards: Hazard[];
  private started = false;
  private alarmed = false;
  private finished = false;

  constructor(
    readonly def: StealthSectionDef,
    private readonly host: StealthHost,
  ) {
    this.guards = def.guards.map((g) => {
      const enemy = TUNING.enemies[g.enemyId];
      const senses = enemy.senses ?? { visionRange: 0, visionAngleDeg: 0, hearingRadius: 0 };
      return new Guard(g.enemyId, g, senses, enemy.moveSpeed);
    });
    this.hazards = def.hazards.map((h) => new Hazard(h));
  }

  get sectionId(): StealthSectionId {
    return this.def.id;
  }

  get active(): boolean {
    return this.started && !this.alarmed && !this.finished;
  }

  get alarmRaised(): boolean {
    return this.alarmed;
  }

  get isFinished(): boolean {
    return this.finished;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.host.bus.emit(GameEvents.SectionStarted, { sectionId: this.def.id, kind: 'stealth' });
  }

  noise(n: NoiseEvent): void {
    if (!this.active) return;
    for (const g of this.guards) g.hear(n, this.host.bus);
  }

  setHazardEnabled(id: string, enabled: boolean): void {
    const h = this.hazards.find((x) => x.id === id);
    if (h) h.enabled = enabled;
  }

  /** Highest detection of any guard or hazard, 0..1, for the HUD. */
  maxDetection(): number {
    return Math.max(0, ...this.guards.map((g) => g.detection), ...this.hazards.map((h) => h.detection));
  }

  tick(dtMs: number, p: HazardPerception): void {
    if (!this.active) return;
    for (const g of this.guards) {
      if (g.tick(dtMs, this.host.getGrid(), { pos: p.pos, hidden: p.hidden }, this.host.bus)) {
        this.alarm();
        return;
      }
    }
    for (const h of this.hazards) {
      if (h.tick(dtMs, this.host.getGrid(), p)) {
        this.alarm();
        return;
      }
    }
  }

  /** Andrew reached the far side. */
  finish(): void {
    if (!this.started || this.finished || this.alarmed) return;
    this.finished = true;
    this.host.cleanRun(this.def);
  }

  /** Forces the alarm (scripted, e.g. the photocopier jam in chapter 5). */
  alarm(): void {
    if (this.alarmed || this.finished) return;
    this.alarmed = true;
    const fightId: AlarmFightId = `${this.def.id}.alarm`;
    for (const g of this.guards) g.alert = 'alarm';
    this.host.bus.emit(GameEvents.StealthAlarm, { sectionId: this.def.id, fightId });
    this.host.raiseAlarm(this.def.id, fightId, this.guards);
  }

  /** Marks it resolved without a clean run (debug walk, or its alarm fight finished). */
  resolve(): void {
    this.started = true;
    this.finished = true;
  }
}

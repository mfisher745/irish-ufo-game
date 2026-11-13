/**
 * Projectiles: straight, lobbed, deflectable and piercing. DESIGN.md 7.2.
 * Plain TypeScript; the world owns the list and resolves hits.
 */

import type { AttackShape, DamageSource, ScreenId, TileGrid, Vec2 } from '../core/types';
import { add, distance, fromAngle, normalize, scale } from './geometry';
import { isBlocked, tileOf } from './grid';
import { PENDING_TUNING } from './pendingTuning';

export type ProjectileShape = Extract<AttackShape, { kind: 'projectile' }>;

export interface Projectile {
  readonly id: string;
  owner: 'player' | 'enemy';
  source: DamageSource;
  readonly screenId: ScreenId;
  readonly origin: Vec2;
  pos: Vec2;
  /** Direction (unit) times speed. */
  vel: Vec2;
  readonly shape: ProjectileShape;
  travelled: number;
  /** Lobbed: where it lands. */
  readonly target: Vec2 | null;
  readonly totalDistance: number;
  pierceLeft: number;
  readonly damage: number;
  readonly knockback: number;
  readonly stunMs: number;
  readonly holdMs: number;
  /** Instance IDs already hit (piercing shots hit each target once). */
  readonly hit: Set<string>;
  /** Height above ground for drawing lobbed shots. */
  height: number;
  done: boolean;
  /** Set when it ended by landing or hitting a wall, for impact noise. */
  landed: boolean;
  /** Art frame hint (`fx` key name), chosen by the spawner. */
  readonly frame: string;
}

let nextId = 1;

export interface ProjectileSpawn {
  readonly owner: 'player' | 'enemy';
  readonly source: DamageSource;
  readonly screenId: ScreenId;
  readonly from: Vec2;
  /** Aim angle in degrees. */
  readonly angleDeg: number;
  /** For lobbed shots: aimed point (clamped to range). */
  readonly aimPoint?: Vec2;
  readonly shape: ProjectileShape;
  readonly damage: number;
  readonly knockback: number;
  readonly stunMs?: number;
  readonly holdMs?: number;
  readonly frame: string;
}

export function spawnProjectile(s: ProjectileSpawn): Projectile {
  const dir = fromAngle(s.angleDeg);
  let target: Vec2 | null = null;
  let total = s.shape.range;
  if (s.shape.lobbed) {
    const aim = s.aimPoint ?? add(s.from, scale(dir, s.shape.range));
    total = Math.min(s.shape.range, distance(s.from, aim));
    target = add(s.from, scale(dir, total));
  }
  return {
    id: `proj${nextId++}`,
    owner: s.owner,
    source: s.source,
    screenId: s.screenId,
    origin: s.from,
    pos: s.from,
    vel: scale(dir, s.shape.speed),
    shape: s.shape,
    travelled: 0,
    target,
    totalDistance: total,
    pierceLeft: s.shape.pierce,
    damage: s.damage,
    knockback: s.knockback,
    stunMs: s.stunMs ?? 0,
    holdMs: s.holdMs ?? 0,
    hit: new Set(),
    height: 0,
    done: false,
    landed: false,
    frame: s.frame,
  };
}

/**
 * Moves a projectile. Straight shots stop at blocked tiles; lobbed shots fly
 * over everything and land at their target. Returns true on the tick it lands
 * or hits a wall.
 */
export function stepProjectile(p: Projectile, grid: TileGrid, dtMs: number): boolean {
  if (p.done) return false;
  const step = (p.shape.speed * dtMs) / 1000;
  const remaining = p.totalDistance - p.travelled;
  const move = Math.min(step, remaining);
  const next = add(p.pos, scale(normalize(p.vel), move));
  p.travelled += move;
  if (p.shape.lobbed) {
    const t = p.totalDistance > 0 ? p.travelled / p.totalDistance : 1;
    p.height = 4 * PENDING_TUNING.combat.lobPeakHeight * t * (1 - t);
    p.pos = next;
    if (p.travelled >= p.totalDistance - 0.001) {
      p.done = true;
      p.landed = true;
      p.height = 0;
      return true;
    }
    return false;
  }
  const t = tileOf(next);
  if (isBlocked(grid, t.col, t.row)) {
    p.done = true;
    p.landed = true;
    return true;
  }
  p.pos = next;
  if (p.travelled >= p.totalDistance - 0.001) {
    p.done = true;
    return false;
  }
  return false;
}

/** Sends a deflectable projectile back the way it came, now owned by the player. */
export function deflect(p: Projectile, towardDeg: number, abilitySource: DamageSource): void {
  const speed = Math.hypot(p.vel.x, p.vel.y);
  p.vel = scale(fromAngle(towardDeg), speed);
  p.owner = 'player';
  p.source = abilitySource;
  p.travelled = 0;
  p.hit.clear();
}

/** Whether a straight (or landing lobbed) projectile touches a circle. */
export function projectileTouches(p: Projectile, centre: Vec2, radius: number): boolean {
  const r = p.shape.lobbed ? PENDING_TUNING.combat.lobSplashRadius : PENDING_TUNING.combat.projectileRadius;
  return distance(p.pos, centre) <= r + radius;
}

export function directionOf(p: Projectile): Vec2 {
  return normalize(p.vel);
}

/**
 * Combat maths: shape hit tests, damage, knockback and shields.
 * DESIGN.md section 7.2. Plain TypeScript.
 */

import type { AttackShape, Vec2 } from '../core/types';
import { angleDiff, angleTo, clamp, distance, distanceToSegment, fromAngle, add, normalize, scale, sub } from './geometry';
import type { Rect } from './geometry';

/**
 * Whether a target circle at `target` (radius `r`) is inside `shape` cast
 * from `origin` toward `angleDeg`. Charges are tested as their whole lane;
 * projectiles are resolved separately.
 */
export function shapeHits(shape: AttackShape, origin: Vec2, angleDeg: number, target: Vec2, r: number): boolean {
  const d = distance(origin, target);
  switch (shape.kind) {
    case 'none':
    case 'projectile':
      return false;
    case 'circle':
      return d <= shape.radius + r;
    case 'arc':
      if (d > shape.range + r) return false;
      if (d <= r) return true;
      return Math.abs(angleDiff(angleDeg, angleTo(origin, target))) <= shape.arcDeg / 2;
    case 'cone':
      if (d > shape.range + r) return false;
      if (d <= r) return true;
      return Math.abs(angleDiff(angleDeg, angleTo(origin, target))) <= shape.angleDeg / 2;
    case 'charge': {
      const end = add(origin, fromAngle(angleDeg, shape.distance));
      return distanceToSegment(target, origin, end) <= shape.width / 2 + r;
    }
  }
}

/** Sample spacing for `shapeHitsRect`, in pixels. Small enough that no arc edge slips between samples at melee range. */
const RECT_SAMPLE_STEP = 4;

/**
 * Whether any part of an axis-aligned rectangle is inside `shape` cast from
 * `origin` toward `angleDeg` (a punch against the fruit machine). Tested
 * on the point of the rectangle nearest the origin plus a 4-pixel grid over it.
 */
export function shapeHitsRect(shape: AttackShape, origin: Vec2, angleDeg: number, rect: Rect): boolean {
  if (shape.kind === 'none' || shape.kind === 'projectile') return false;
  const nearest = { x: clamp(origin.x, rect.x, rect.x + rect.width), y: clamp(origin.y, rect.y, rect.y + rect.height) };
  if (shapeHits(shape, origin, angleDeg, nearest, 0)) return true;
  if (distance(origin, nearest) > shapeReach(shape)) return false;
  const nx = Math.max(1, Math.ceil(rect.width / RECT_SAMPLE_STEP));
  const ny = Math.max(1, Math.ceil(rect.height / RECT_SAMPLE_STEP));
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const p = { x: rect.x + (rect.width * i) / nx, y: rect.y + (rect.height * j) / ny };
      if (shapeHits(shape, origin, angleDeg, p, 0)) return true;
    }
  }
  return false;
}

/** Reach of a shape, for "am I close enough to use this" checks. */
export function shapeReach(shape: AttackShape): number {
  switch (shape.kind) {
    case 'none':
      return 0;
    case 'circle':
      return shape.radius;
    case 'arc':
    case 'cone':
      return shape.range;
    case 'charge':
      return shape.distance;
    case 'projectile':
      return shape.range;
  }
}

/** Damage after a multiplier, never negative, rounded to whole points. */
export function scaledDamage(base: number, multiplier: number): number {
  return Math.max(0, Math.round(base * multiplier));
}

/** Knockback vector from `from` to `to` with strength reduced by resistance (0..1). */
export function knockbackVector(from: Vec2, to: Vec2, strength: number, resistance: number): Vec2 {
  let dir = normalize(sub(to, from));
  if (dir.x === 0 && dir.y === 0) dir = { x: 1, y: 0 };
  return scale(dir, strength * (1 - Math.min(1, Math.max(0, resistance))));
}

/**
 * Frontal shield: blocks a hit coming from within half the shield arc of the
 * defender's facing. `attackFrom` is where the hit comes from.
 */
export function shieldBlocks(shieldDeg: number | undefined, defenderPos: Vec2, defenderFacingDeg: number, attackFrom: Vec2): boolean {
  if (!shieldDeg || shieldDeg <= 0) return false;
  const toAttacker = angleTo(defenderPos, attackFrom);
  return Math.abs(angleDiff(defenderFacingDeg, toAttacker)) <= shieldDeg / 2;
}

/** Exponential decay of a knockback velocity. */
export function decayVelocity(v: Vec2, decayPerSecond: number, dtMs: number): Vec2 {
  const k = Math.exp((-decayPerSecond * dtMs) / 1000);
  const next = scale(v, k);
  return Math.hypot(next.x, next.y) < 1 ? { x: 0, y: 0 } : next;
}

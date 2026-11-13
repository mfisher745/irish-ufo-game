/**
 * Combat maths: shape hit tests, damage, knockback and shields.
 * DESIGN.md section 7.2. Plain TypeScript.
 */

import type { AttackShape, Vec2 } from '../core/types';
import { angleDiff, angleTo, distance, distanceToSegment, fromAngle, add, normalize, scale, sub } from './geometry';

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

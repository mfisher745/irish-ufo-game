/** Small vector and angle helpers. Angles are degrees, 0 = right, clockwise (y down). */

import type { Facing, Vec2 } from '../core/types';

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const length = (a: Vec2): number => Math.hypot(a.x, a.y);
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export function normalize(a: Vec2): Vec2 {
  const l = length(a);
  return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

export const toRad = (deg: number): number => (deg * Math.PI) / 180;
export const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export const angleOf = (v: Vec2): number => toDeg(Math.atan2(v.y, v.x));
export const angleTo = (from: Vec2, to: Vec2): number => angleOf(sub(to, from));
export const fromAngle = (deg: number, len = 1): Vec2 => ({ x: Math.cos(toRad(deg)) * len, y: Math.sin(toRad(deg)) * len });

/** Signed difference b - a wrapped to (-180, 180]. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % 360;
  if (d <= -180) d += 360;
  if (d > 180) d -= 360;
  return d;
}

/** Rotate `from` toward `to` by at most `maxStep` degrees. */
export function turnToward(from: number, to: number, maxStep: number): number {
  const d = angleDiff(from, to);
  if (Math.abs(d) <= maxStep) return to;
  return from + Math.sign(d) * maxStep;
}

export function facingFromAngle(deg: number): Facing {
  const a = ((deg % 360) + 360) % 360;
  if (a >= 45 && a < 135) return 'down';
  if (a >= 135 && a < 225) return 'left';
  if (a >= 225 && a < 315) return 'up';
  return 'right';
}

export function angleFromFacing(f: Facing): number {
  switch (f) {
    case 'right':
      return 0;
    case 'down':
      return 90;
    case 'left':
      return 180;
    case 'up':
      return 270;
  }
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const rectContains = (r: Rect, p: Vec2): boolean =>
  p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height;

export const rectsOverlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Distance from point p to segment ab. */
export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a);
  const len2 = ab.x * ab.x + ab.y * ab.y;
  if (len2 === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / len2));
  return distance(p, { x: a.x + ab.x * t, y: a.y + ab.y * t });
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

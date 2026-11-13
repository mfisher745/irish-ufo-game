/**
 * Tile grid queries: collision, line of sight and pathfinding. Plain
 * TypeScript over `TileGrid` from types.ts. Tiles are 16 x 16 (DESIGN.md 8).
 */

import type { TileCoord, TileGrid, Vec2 } from '../core/types';
import type { Rect } from './geometry';

export const TILE = 16;

export const tileOf = (p: Vec2): TileCoord => ({ col: Math.floor(p.x / TILE), row: Math.floor(p.y / TILE) });
export const tileCentre = (t: TileCoord): Vec2 => ({ x: t.col * TILE + TILE / 2, y: t.row * TILE + TILE / 2 });

export function inBounds(grid: TileGrid, col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < grid.widthTiles && row < grid.heightTiles;
}

/** Out of bounds counts as blocked. */
export function isBlocked(grid: TileGrid, col: number, row: number): boolean {
  if (!inBounds(grid, col, row)) return true;
  return grid.blocked[row * grid.widthTiles + col] === true;
}

export function blocksSight(grid: TileGrid, col: number, row: number): boolean {
  if (!inBounds(grid, col, row)) return true;
  return grid.blocksSight[row * grid.widthTiles + col] === true;
}

export function isShade(grid: TileGrid, p: Vec2): boolean {
  if (!grid.shade) return false;
  const { col, row } = tileOf(p);
  if (!inBounds(grid, col, row)) return false;
  return grid.shade[row * grid.widthTiles + col] === true;
}

/** Builds a grid from rows of characters: '#' blocked and blocks sight, 'x' blocked only, 'o' sight only, '~' shade. */
export function gridFromAscii(rows: readonly string[]): TileGrid {
  const heightTiles = rows.length;
  const widthTiles = Math.max(...rows.map((r) => r.length));
  const blocked: boolean[] = [];
  const sight: boolean[] = [];
  const shade: boolean[] = [];
  let anyShade = false;
  for (let r = 0; r < heightTiles; r++) {
    for (let c = 0; c < widthTiles; c++) {
      const ch = rows[r]?.[c] ?? '.';
      blocked.push(ch === '#' || ch === 'x');
      sight.push(ch === '#' || ch === 'o');
      shade.push(ch === '~');
      if (ch === '~') anyShade = true;
    }
  }
  return anyShade
    ? { widthTiles, heightTiles, blocked, blocksSight: sight, shade }
    : { widthTiles, heightTiles, blocked, blocksSight: sight };
}

/** Whether any tile under the rectangle is blocked, or `extra` says so. */
export function rectBlocked(grid: TileGrid, r: Rect, extra?: (col: number, row: number) => boolean): boolean {
  const c0 = Math.floor(r.x / TILE);
  const c1 = Math.floor((r.x + r.width - 0.001) / TILE);
  const r0 = Math.floor(r.y / TILE);
  const r1 = Math.floor((r.y + r.height - 0.001) / TILE);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (isBlocked(grid, col, row)) return true;
      if (extra?.(col, row)) return true;
    }
  }
  return false;
}

export interface MoveResult {
  readonly position: Vec2;
  readonly blockedX: boolean;
  readonly blockedY: boolean;
}

/**
 * Moves a box of size w x h centred at `pos` by `delta`, axis by axis,
 * stopping at blocked tiles. Steps are split so fast movers cannot tunnel.
 */
export function moveBox(
  grid: TileGrid,
  pos: Vec2,
  w: number,
  h: number,
  delta: Vec2,
  extra?: (col: number, row: number) => boolean,
): MoveResult {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(delta.x), Math.abs(delta.y)) / (TILE / 4)));
  let x = pos.x;
  let y = pos.y;
  let blockedX = false;
  let blockedY = false;
  const sx = delta.x / steps;
  const sy = delta.y / steps;
  for (let i = 0; i < steps; i++) {
    if (!blockedX && sx !== 0) {
      const nx = x + sx;
      if (rectBlocked(grid, { x: nx - w / 2, y: y - h / 2, width: w, height: h }, extra)) blockedX = true;
      else x = nx;
    }
    if (!blockedY && sy !== 0) {
      const ny = y + sy;
      if (rectBlocked(grid, { x: x - w / 2, y: ny - h / 2, width: w, height: h }, extra)) blockedY = true;
      else y = ny;
    }
  }
  return { position: { x, y }, blockedX, blockedY };
}

/** Grid traversal (Amanatides-Woo). True when nothing between a and b blocks sight. */
export function lineOfSight(grid: TileGrid, a: Vec2, b: Vec2, test: (col: number, row: number) => boolean = (c, r) => blocksSight(grid, c, r)): boolean {
  let col = Math.floor(a.x / TILE);
  let row = Math.floor(a.y / TILE);
  const endCol = Math.floor(b.x / TILE);
  const endRow = Math.floor(b.y / TILE);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const stepC = dx > 0 ? 1 : -1;
  const stepR = dy > 0 ? 1 : -1;
  const tDeltaX = dx === 0 ? Infinity : Math.abs(TILE / dx);
  const tDeltaY = dy === 0 ? Infinity : Math.abs(TILE / dy);
  const nextX = stepC > 0 ? (col + 1) * TILE : col * TILE;
  const nextY = stepR > 0 ? (row + 1) * TILE : row * TILE;
  let tMaxX = dx === 0 ? Infinity : Math.abs((nextX - a.x) / dx);
  let tMaxY = dy === 0 ? Infinity : Math.abs((nextY - a.y) / dy);
  // The start tile never blocks (the viewer stands in it).
  let guard = 0;
  while ((col !== endCol || row !== endRow) && guard++ < 1024) {
    if (tMaxX < tMaxY) {
      col += stepC;
      tMaxX += tDeltaX;
    } else {
      row += stepR;
      tMaxY += tDeltaY;
    }
    if (col === endCol && row === endRow) break;
    if (test(col, row)) return false;
  }
  return true;
}

/** Whether a straight walk from a to b crosses no blocked tile. */
export function walkableLine(grid: TileGrid, a: Vec2, b: Vec2): boolean {
  return lineOfSight(grid, a, b, (c, r) => isBlocked(grid, c, r));
}

/**
 * A* on the tile grid, 8-way without corner cutting. Returns tile centres
 * from the tile after `from` up to and including `to`, or null if
 * unreachable. `maxNodes` caps work per call.
 */
export function findPath(
  grid: TileGrid,
  from: Vec2,
  to: Vec2,
  blocked: (col: number, row: number) => boolean = (c, r) => isBlocked(grid, c, r),
  maxNodes = 2000,
): Vec2[] | null {
  const start = tileOf(from);
  const goal = tileOf(to);
  if (blocked(goal.col, goal.row)) return null;
  const W = grid.widthTiles;
  const key = (c: number, r: number): number => r * W + c;
  const h = (c: number, r: number): number => {
    const dx = Math.abs(c - goal.col);
    const dy = Math.abs(r - goal.row);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  const open: { c: number; r: number; f: number; g: number }[] = [{ c: start.col, r: start.row, f: h(start.col, start.row), g: 0 }];
  const came = new Map<number, number>();
  const gScore = new Map<number, number>([[key(start.col, start.row), 0]]);
  const closed = new Set<number>();
  let expanded = 0;
  while (open.length > 0 && expanded < maxNodes) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if ((open[i]?.f ?? Infinity) < (open[bi]?.f ?? Infinity)) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (!cur) break;
    const ck = key(cur.c, cur.r);
    if (closed.has(ck)) continue;
    closed.add(ck);
    expanded++;
    if (cur.c === goal.col && cur.r === goal.row) {
      const path: Vec2[] = [];
      let k: number | undefined = ck;
      const startKey = key(start.col, start.row);
      while (k !== undefined && k !== startKey) {
        path.push(tileCentre({ col: k % W, row: Math.floor(k / W) }));
        k = came.get(k);
      }
      path.reverse();
      return path;
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const nc = cur.c + dc;
        const nr = cur.r + dr;
        if (!inBounds(grid, nc, nr) || blocked(nc, nr)) continue;
        if (dc !== 0 && dr !== 0 && (blocked(cur.c + dc, cur.r) || blocked(cur.c, cur.r + dr))) continue;
        const nk = key(nc, nr);
        if (closed.has(nk)) continue;
        const g = cur.g + (dc !== 0 && dr !== 0 ? Math.SQRT2 : 1);
        if (g < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, g);
          came.set(nk, ck);
          open.push({ c: nc, r: nr, g, f: g + h(nc, nr) });
        }
      }
    }
  }
  return null;
}

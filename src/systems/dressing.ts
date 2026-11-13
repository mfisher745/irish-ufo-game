/**
 * Run-time state of a chapter's set dressing (props and standing NPCs) and
 * screen ambience. Plain TypeScript: the run asks it for the collision and
 * sight grid with solid props merged in, and for talk spots; the view reads
 * it to draw. Changes made by a script last for the run only, except that
 * broken breakables are passed in from the save (DESIGN.md 7.1 "Breakables").
 */

import type { NpcId } from '../art/cast';
import { PROP } from '../art/props';
import type { NpcPlacement, PropPlacement, ScreenAmbient, ScreenLayout, TileFootprint } from '../core/chapter';
import type { Random } from '../core/random';
import type { ExaminableDef, Facing, LootEntry, PickupItem, ScreenId, TileGrid, Vec2 } from '../core/types';
import type { Rect } from './geometry';
import { TILE, tileCentre } from './grid';

/** Debris frame when a breakable gives none. */
export const DEFAULT_DEBRIS_FRAME: string = PROP.debris[0];

export interface LiveProp {
  /** `PropPlacement.id`, or a generated key for unnamed props. */
  readonly key: string;
  readonly def: PropPlacement;
  readonly screenId: ScreenId;
  col: number;
  row: number;
  frame: string;
  frames: readonly string[];
  visible: boolean;
  /** Breakables: hits left before it breaks (0 once broken). */
  hitsLeft: number;
  broken: boolean;
  /** Time left on the white hit flash, for the view. */
  flashMs: number;
}

export interface LiveNpc {
  readonly key: string;
  readonly def: NpcPlacement;
  readonly screenId: ScreenId;
  readonly npc: NpcId;
  /** Feet, in pixels. */
  pos: Vec2;
  facing: Facing;
  visible: boolean;
}

/** Something E can be pressed at. */
export interface InteractPoint {
  readonly examinableId: string;
  readonly position: Vec2;
  readonly kind: 'examine' | 'talk';
  /** The NPC's key for talk points. */
  readonly npcKey?: string;
}

export class Dressing {
  private readonly props = new Map<string, LiveProp>();
  private readonly npcs = new Map<string, LiveNpc>();
  private readonly ambients = new Map<ScreenId, ScreenAmbient | null>();
  private readonly grids = new Map<ScreenId, { version: number; grid: TileGrid }>();
  /** Bumped on every change; the view and the grid cache compare it. */
  version = 0;

  /**
   * @param brokenKeys breakables already broken in this save.
   * @param defaultHits hits a breakable takes when its placement gives none.
   */
  constructor(screens: readonly ScreenLayout[], brokenKeys: Iterable<string> = [], defaultHits = 1) {
    const broken = new Set(brokenKeys);
    for (const s of screens) {
      (s.dressing?.props ?? []).forEach((def, i) => {
        const key = def.id ?? `${s.id}#prop${i}`;
        const isBroken = def.breakable !== undefined && broken.has(key);
        this.props.set(key, {
          key,
          def,
          screenId: s.id,
          col: def.col,
          row: def.row,
          frame: isBroken ? debrisFrame(def) : def.frame,
          frames: isBroken ? [] : (def.frames ?? []),
          visible: def.hidden !== true,
          hitsLeft: def.breakable ? (isBroken ? 0 : Math.max(1, def.breakable.hits ?? defaultHits)) : 0,
          broken: isBroken,
          flashMs: 0,
        });
      });
      (s.dressing?.npcs ?? []).forEach((def, i) => {
        const key = def.id ?? `${s.id}#npc${i}`;
        this.npcs.set(key, { key, def, screenId: s.id, npc: def.npc, pos: tileCentre({ col: def.col, row: def.row }), facing: def.facing, visible: def.hidden !== true });
      });
      this.ambients.set(s.id, s.ambient ?? null);
    }
  }

  propsOn(screenId: ScreenId): LiveProp[] {
    return [...this.props.values()].filter((p) => p.screenId === screenId);
  }

  npcsOn(screenId: ScreenId): LiveNpc[] {
    return [...this.npcs.values()].filter((n) => n.screenId === screenId);
  }

  prop(id: string): LiveProp | undefined {
    return this.props.get(id);
  }

  npc(id: string): LiveNpc | undefined {
    return this.npcs.get(id);
  }

  ambient(screenId: ScreenId): ScreenAmbient | null {
    return this.ambients.get(screenId) ?? null;
  }

  // -------------------------------------------------------------------------
  // Changes (all return false for an unknown ID)
  // -------------------------------------------------------------------------

  setPropVisible(id: string, visible: boolean): boolean {
    return this.changeProp(id, (p) => {
      p.visible = visible;
    });
  }

  setPropFrame(id: string, frame: string, frames?: readonly string[]): boolean {
    return this.changeProp(id, (p) => {
      p.frame = frame;
      if (frames !== undefined) p.frames = frames;
    });
  }

  setPropTile(id: string, col: number, row: number): boolean {
    return this.changeProp(id, (p) => {
      p.col = col;
      p.row = row;
    });
  }

  setNpcPosition(id: string, pos: Vec2): boolean {
    return this.changeNpc(id, (n) => {
      n.pos = pos;
    });
  }

  setNpcFacing(id: string, facing: Facing): boolean {
    return this.changeNpc(id, (n) => {
      n.facing = facing;
    });
  }

  setNpcVisible(id: string, visible: boolean): boolean {
    return this.changeNpc(id, (n) => {
      n.visible = visible;
    });
  }

  setAmbient(screenId: ScreenId, ambient: ScreenAmbient | null): void {
    this.ambients.set(screenId, ambient);
    this.version++;
  }

  // -------------------------------------------------------------------------
  // Breakables
  // -------------------------------------------------------------------------

  /** Visible, unbroken breakables on a screen. */
  breakablesOn(screenId: ScreenId): LiveProp[] {
    return this.propsOn(screenId).filter((p) => p.def.breakable !== undefined && p.visible && !p.broken);
  }

  /** Keys of every broken breakable, for the save. */
  brokenKeys(): string[] {
    return [...this.props.values()].filter((p) => p.broken).map((p) => p.key);
  }

  /**
   * One hit on a breakable: flashes it, and on the last hit breaks it (debris
   * frame, no animation, no longer solid). Returns what happened.
   */
  hitProp(key: string, flashMs: number): 'hit' | 'broken' | null {
    const p = this.props.get(key);
    if (!p || !p.def.breakable || p.broken || !p.visible) return null;
    p.hitsLeft = Math.max(0, p.hitsLeft - 1);
    p.flashMs = flashMs;
    if (p.hitsLeft === 0) {
      p.broken = true;
      p.frame = debrisFrame(p.def);
      p.frames = [];
    }
    this.version++;
    return p.broken ? 'broken' : 'hit';
  }

  /** Counts down hit flashes. */
  tick(dtMs: number): void {
    for (const p of this.props.values()) {
      if (p.flashMs <= 0) continue;
      p.flashMs = Math.max(0, p.flashMs - dtMs);
      if (p.flashMs === 0) this.version++;
    }
  }

  // -------------------------------------------------------------------------
  // Queries for the run
  // -------------------------------------------------------------------------

  /** The screen's grid with visible solid / sight-blocking props and solid NPCs merged in. Cached. */
  gridFor(layout: ScreenLayout): TileGrid {
    const cached = this.grids.get(layout.id);
    if (cached && cached.version === this.version) return cached.grid;
    const base = layout.grid;
    const props = this.propsOn(layout.id).filter((p) => p.visible && !p.broken && (p.def.solid || p.def.blocksSight));
    const npcs = this.npcsOn(layout.id).filter((n) => n.visible && n.def.solid === true);
    let grid = base;
    if (props.length > 0 || npcs.length > 0) {
      const w = base.widthTiles;
      const blocked = [...base.blocked];
      const blocksSight = [...base.blocksSight];
      const mark = (arr: boolean[], col: number, row: number, fp: TileFootprint): void => {
        for (let r = row + (fp.dy ?? 0); r < row + (fp.dy ?? 0) + fp.height; r++) {
          for (let c = col + (fp.dx ?? 0); c < col + (fp.dx ?? 0) + fp.width; c++) {
            if (c >= 0 && r >= 0 && c < w && r < base.heightTiles) arr[r * w + c] = true;
          }
        }
      };
      for (const p of props) {
        if (p.def.solid) mark(blocked, p.col, p.row, p.def.solid);
        const sight = p.def.blocksSight === true ? p.def.solid : p.def.blocksSight;
        if (sight) mark(blocksSight, p.col, p.row, sight);
      }
      for (const n of npcs) mark(blocked, Math.floor(n.pos.x / TILE), Math.floor(n.pos.y / TILE), { width: 1, height: 1 });
      grid = { ...base, blocked, blocksSight };
    }
    this.grids.set(layout.id, { version: this.version, grid });
    return grid;
  }

  /** IDs of examinables that belong to an NPC (drawn as the NPC, not as a marker). */
  npcExaminableIds(): ReadonlySet<string> {
    const out = new Set<string>();
    for (const n of this.npcs.values()) if (n.def.examinableId) out.add(n.def.examinableId);
    return out;
  }

  /**
   * Everything E can be pressed at on a screen: plain examinables, and a talk
   * point for each visible NPC with an `examinableId` (at the examinable's
   * position moved by however far the NPC has moved, or at the NPC's feet).
   */
  interactPoints(screenId: ScreenId, examinables: readonly ExaminableDef[]): InteractPoint[] {
    const owned = this.npcExaminableIds();
    const out: InteractPoint[] = [];
    for (const e of examinables) {
      if (e.screenId === screenId && !owned.has(e.id)) out.push({ examinableId: e.id, position: e.position, kind: 'examine' });
    }
    for (const n of this.npcsOn(screenId)) {
      const id = n.def.examinableId;
      if (!id || !n.visible) continue;
      const placed = tileCentre({ col: n.def.col, row: n.def.row });
      const spot = examinables.find((e) => e.id === id);
      const position = spot ? { x: spot.position.x + n.pos.x - placed.x, y: spot.position.y + n.pos.y - placed.y } : n.pos;
      out.push({ examinableId: id, position, kind: 'talk', npcKey: n.key });
    }
    return out;
  }

  private changeProp(id: string, f: (p: LiveProp) => void): boolean {
    const p = this.props.get(id);
    if (!p) return false;
    f(p);
    this.version++;
    return true;
  }

  private changeNpc(id: string, f: (n: LiveNpc) => void): boolean {
    const n = this.npcs.get(id);
    if (!n) return false;
    f(n);
    this.version++;
    return true;
  }
}

/** Bottom edge (feet) of a prop in pixels, for depth sorting: `row * TILE + frame height`. */
export function propFeetY(p: Pick<LiveProp, 'row'>, frameHeight: number): number {
  return p.row * TILE + frameHeight;
}

function debrisFrame(def: PropPlacement): string {
  return def.breakable?.debrisFrame ?? DEFAULT_DEBRIS_FRAME;
}

/** The area a breakable is hit in: its `solid` footprint, or its top-left tile. Pixels. */
export function propHitRect(p: Pick<LiveProp, 'col' | 'row' | 'def'>): Rect {
  const fp = p.def.solid ?? { width: 1, height: 1 };
  return { x: (p.col + (fp.dx ?? 0)) * TILE, y: (p.row + (fp.dy ?? 0)) * TILE, width: fp.width * TILE, height: fp.height * TILE };
}

/** A stable 32-bit hash of a string (FNV-1a), for per-prop loot seeds. */
export function hashKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Weighted pick from a loot table; null for "nothing" or an empty table. */
export function pickLoot(table: readonly LootEntry[], rng: Random): PickupItem | null {
  const total = table.reduce((n, e) => n + Math.max(0, e.weight), 0);
  if (total <= 0) return null;
  let roll = rng.next() * total;
  for (const e of table) {
    roll -= Math.max(0, e.weight);
    if (roll < 0) return e.item;
  }
  return table[table.length - 1]?.item ?? null;
}

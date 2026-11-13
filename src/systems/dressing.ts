/**
 * Run-time state of a chapter's set dressing (props and standing NPCs) and
 * screen ambience. Plain TypeScript: the run asks it for the collision and
 * sight grid with solid props merged in, and for talk spots; the view reads
 * it to draw. Changes made by a script last for the run only.
 */

import type { NpcId } from '../art/cast';
import type { NpcPlacement, PropPlacement, ScreenAmbient, ScreenLayout, TileFootprint } from '../core/chapter';
import type { ExaminableDef, Facing, ScreenId, TileGrid, Vec2 } from '../core/types';
import { TILE, tileCentre } from './grid';

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

  constructor(screens: readonly ScreenLayout[]) {
    for (const s of screens) {
      (s.dressing?.props ?? []).forEach((def, i) => {
        const key = def.id ?? `${s.id}#prop${i}`;
        this.props.set(key, { key, def, screenId: s.id, col: def.col, row: def.row, frame: def.frame, frames: def.frames ?? [], visible: def.hidden !== true });
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
  // Queries for the run
  // -------------------------------------------------------------------------

  /** The screen's grid with visible solid / sight-blocking props and solid NPCs merged in. Cached. */
  gridFor(layout: ScreenLayout): TileGrid {
    const cached = this.grids.get(layout.id);
    if (cached && cached.version === this.version) return cached.grid;
    const base = layout.grid;
    const props = this.propsOn(layout.id).filter((p) => p.visible && (p.def.solid || p.def.blocksSight));
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

/**
 * Chapter 1 screens as tile layouts. Level data only: each screen is painted
 * onto a character canvas, then turned into tile frames and a collision and
 * sight grid derived from `tileFlags`, so the art and the walls cannot drift.
 */

import { tileFlags, tileIndex } from '../../art';
import type { ExitDef, ScreenLayout } from '../../core/chapter';
import type { ScreenId, TileGrid, Vec2 } from '../../core/types';
import { tileCentre } from '../../systems';

const REGION = 'kilnamoe';

/** Canvas character to kilnamoe tile name. */
const LEGEND: Readonly<Record<string, string>> = {
  '#': 'wallTop',
  W: 'wallFace',
  S: 'barShelf',
  w: 'window',
  '.': 'floor',
  c: 'counter',
  t: 'table',
  s: 'seat',
  d: 'doorStrip',
  m: 'marking',
  b: 'floorAlt',
  p: 'path',
  l: 'roadLine',
  g: 'grass',
  r: 'rough',
  ',': 'pavement',
  y: 'yardConcrete',
  L: 'litGround',
  G: 'gate',
  H: 'hedge',
  K: 'stoneWall',
  o: 'cover',
  P: 'bogPool',
};

class Canvas {
  private readonly cells: string[][];
  constructor(
    readonly width: number,
    readonly height: number,
    fill: string,
  ) {
    this.cells = Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
  }
  set(col: number, row: number, ch: string): this {
    const r = this.cells[row];
    if (r && col >= 0 && col < this.width) r[col] = ch;
    return this;
  }
  rect(col: number, row: number, w: number, h: number, ch: string): this {
    for (let r = row; r < row + h; r++) for (let c = col; c < col + w; c++) this.set(c, r, ch);
    return this;
  }
  /** Outer ring of wall tops with an inner ring of wall faces. */
  room(): this {
    this.rect(0, 0, this.width, 1, '#').rect(0, this.height - 1, this.width, 1, '#');
    this.rect(0, 0, 1, this.height, '#').rect(this.width - 1, 0, 1, this.height, '#');
    this.rect(1, 1, this.width - 2, 1, 'W').rect(1, this.height - 2, this.width - 2, 1, 'W');
    this.rect(1, 1, 1, this.height - 2, 'W').rect(this.width - 2, 1, 1, this.height - 2, 'W');
    return this;
  }
  char(col: number, row: number): string {
    return this.cells[row]?.[col] ?? '#';
  }
  build(id: ScreenId, exits: readonly ExitDef[], playerStart: Vec2, mykoStart?: Vec2): ScreenLayout {
    const tiles: number[] = [];
    const blocked: boolean[] = [];
    const blocksSight: boolean[] = [];
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const name = LEGEND[this.char(col, row)];
        if (name === undefined) throw new Error(`Unknown tile character "${this.char(col, row)}" at ${id} ${col},${row}`);
        const index = tileIndex(REGION, name);
        const flags = tileFlags(REGION, index);
        tiles.push(index);
        blocked.push(flags.blocked);
        blocksSight.push(flags.blocksSight);
      }
    }
    const grid: TileGrid = { widthTiles: this.width, heightTiles: this.height, blocked, blocksSight };
    return { id, grid, tiles, exits, playerStart, ...(mykoStart ? { mykoStart } : {}) };
  }
}

export const T = (col: number, row: number): Vec2 => tileCentre({ col, row });

/** A rectangle of whole tiles as an area in pixels. */
export const tilesArea = (col: number, row: number, w: number, h: number) => ({ x: col * 16, y: row * 16, width: w * 16, height: h * 16 });

// ---------------------------------------------------------------------------
// Shared level data
// ---------------------------------------------------------------------------

export const PUB_START = T(12, 4);
export const MYKO_SEAT = T(5, 13);
export const YARD_ARRIVAL = T(5, 3);
export const PUB_BACK_ARRIVAL = T(27, 14);
export const STREET_ARRIVAL = T(3, 8);
export const ROAD_ARRIVAL = T(2, 8);

/** Keg puzzle: play area top-left tile and local-to-tile mapping. */
export const KEG_AREA = { col: 11, row: 5, width: 6, height: 5 } as const;
export const kegTile = (x: number, y: number) => ({ col: KEG_AREA.col + x, row: KEG_AREA.row + y });

/** Street landmarks (tile coordinates) the script and the boss hooks refer to. */
export const TRACTOR = { col: 65, row: 7, width: 3, height: 2 } as const;
export const CHURCH_GATE = { col: 41, row: 7, width: 2, height: 2 } as const;

// ---------------------------------------------------------------------------
// c1.pub 30 x 17
// ---------------------------------------------------------------------------

export function pubScreen(): ScreenLayout {
  const c = new Canvas(30, 17, '.').room();
  // Bar along the top wall: shelves, the staff side (closed off), the counter.
  c.rect(4, 1, 18, 1, 'S');
  c.rect(3, 2, 1, 2, 'W').rect(22, 2, 1, 2, 'W');
  c.rect(4, 3, 18, 1, 'c');
  // Four tables. The last one is Myko's, in the bottom left corner.
  c.rect(7, 7, 2, 1, 't').set(6, 7, 's').set(9, 7, 's');
  c.rect(13, 10, 2, 1, 't').set(12, 10, 's').set(15, 10, 's');
  c.rect(20, 8, 2, 1, 't').set(19, 8, 's').set(22, 8, 's');
  c.rect(3, 13, 2, 1, 't').set(2, 13, 's');
  // The fruit machine glows in the west wall.
  c.set(1, 7, 'w');
  // Back door to the keg yard, bottom right.
  c.rect(26, 15, 2, 2, 'd');
  const exits: ExitDef[] = [{ id: 'c1.pub.backdoor', area: tilesArea(26, 15, 2, 2), toScreen: 'c1.yard', spawn: YARD_ARRIVAL }];
  return c.build('c1.pub', exits, PUB_START, MYKO_SEAT);
}

// ---------------------------------------------------------------------------
// c1.yard 20 x 17
// ---------------------------------------------------------------------------

export function yardScreen(): ScreenLayout {
  const c = new Canvas(20, 17, 'y').room();
  // Door back into the pub, top left.
  c.rect(4, 0, 2, 2, 'd');
  // The way to Main Street: a break in the east wall with gateposts, and a path strip leading to it.
  c.rect(14, 7, 4, 1, 'p').rect(18, 7, 2, 1, 'p');
  c.set(18, 6, 'G').set(18, 8, 'G');
  // Stacked crates and bins along the south and west, out of the way of the puzzle.
  c.rect(2, 12, 2, 2, 'o').rect(8, 13, 2, 1, 'o').rect(2, 4, 1, 2, 'o').rect(5, 14, 1, 1, 'o');
  const exits: ExitDef[] = [
    { id: 'c1.yard.door', area: tilesArea(4, 0, 2, 2), toScreen: 'c1.pub', spawn: PUB_BACK_ARRIVAL },
    { id: 'c1.yard.gate', area: tilesArea(18, 7, 2, 1), toScreen: 'c1.street', spawn: STREET_ARRIVAL, lockedUntil: ['c1.puzzle.kegs'] },
  ];
  return c.build('c1.yard', exits, YARD_ARRIVAL);
}

// ---------------------------------------------------------------------------
// c1.street 70 x 17
// ---------------------------------------------------------------------------

export function streetScreen(): ScreenLayout {
  const c = new Canvas(70, 17, 'p');
  c.rect(0, 0, 70, 1, '#').rect(0, 15, 70, 2, '#').rect(0, 0, 1, 17, '#').rect(69, 0, 1, 17, '#');
  // Frontages along the top, then the pavement, the road, the far pavement and a hedge.
  c.rect(1, 1, 68, 4, 'W');
  c.rect(1, 5, 68, 1, ',').rect(1, 13, 68, 1, ',');
  c.rect(1, 14, 68, 1, 'H');
  for (let col = 4; col < 68; col += 4) c.set(col, 9, 'l');
  // Feeney's, cols 2 to 14: lit windows. The front door is shut for the night.
  for (const col of [4, 6, 10, 12]) c.set(col, 3, 'w');
  // The bookies, cols 16 to 24.
  for (const col of [18, 21]) c.set(col, 3, 'w');
  // The alley between the bookies and the chipper, with bins.
  c.rect(25, 1, 3, 4, 'p').rect(26, 3, 2, 1, 'o');
  // The chipper, cols 28 to 39, lit, with light spilling over the pavement and road in front.
  for (const col of [30, 31, 36, 37]) c.set(col, 3, 'w');
  c.rect(28, 5, 12, 1, 'L').rect(29, 6, 10, 2, 'L');
  // The church wall, cols 40 to 60, and a hedge past it.
  c.rect(40, 1, 21, 4, 'K').rect(61, 1, 8, 4, 'H');
  // The church gate stands in the road at the west end of the arena; the tractor at the east end.
  c.rect(CHURCH_GATE.col, CHURCH_GATE.row, CHURCH_GATE.width, CHURCH_GATE.height, 'G');
  c.rect(TRACTOR.col, TRACTOR.row, TRACTOR.width, TRACTOR.height, 'o');
  // The road out of town, east end.
  c.rect(69, 10, 1, 3, 'p');
  const exits: ExitDef[] = [{ id: 'c1.street.east', area: tilesArea(68, 10, 2, 3), toScreen: 'c1.road', spawn: ROAD_ARRIVAL, lockedUntil: ['c1.boss.bigtom'] }];
  return c.build('c1.street', exits, STREET_ARRIVAL);
}

// ---------------------------------------------------------------------------
// c1.road 30 x 17
// ---------------------------------------------------------------------------

export function roadScreen(): ScreenLayout {
  const c = new Canvas(30, 17, 'b');
  c.rect(0, 0, 30, 1, '#').rect(0, 16, 30, 1, '#').rect(0, 0, 1, 17, '#').rect(29, 0, 1, 17, '#');
  // Grass and hedge behind the north wall, the road, a low wall on the south side, then bog.
  c.rect(1, 1, 28, 1, 'H').rect(1, 2, 28, 4, 'g');
  c.rect(1, 6, 28, 1, 'K').rect(14, 6, 2, 1, 'G');
  c.rect(1, 7, 28, 3, 'p');
  c.rect(1, 10, 28, 1, 'K');
  for (const [col, row] of [[4, 12], [5, 12], [11, 14], [12, 14], [12, 13], [19, 12], [20, 12], [20, 13], [25, 14], [26, 14]] as const) c.set(col, row, 'P');
  for (const [col, row] of [[8, 12], [16, 13], [22, 15], [3, 15], [27, 12]] as const) c.set(col, row, 'r');
  return c.build('c1.road', [], ROAD_ARRIVAL);
}

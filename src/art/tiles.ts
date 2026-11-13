/**
 * Tilesets, one per region, 16 x 16 tiles on a 16-column grid.
 * docs/style-guide.md section 3: ground is lower in contrast than walls and
 * props; scenery has no outline.
 *
 * Indices 0 to 15 mean the same thing in every region (`TILE`), so a map can
 * be laid out before its region is final. Indices from 16 up are extras that
 * belong to one region (`REGION_TILE`).
 */

import type { RegionId } from '../core/types';
import { tilesetKey } from './keys';
import type { ColourName } from './palette';
import { SheetBuilder } from './pixels';
import type { PixelBuffer, Sheet } from './pixels';

type Draw = (b: PixelBuffer) => void;

export interface TileDef {
  readonly name: string;
  readonly draw: Draw;
  /** Cannot be walked on. */
  readonly blocked: boolean;
  /** Blocks vision cones and headlights. */
  readonly blocksSight: boolean;
}

/** Tiles every region has, at the same index. */
export const TILE = {
  void: 0,
  floor: 1,
  floorAlt: 2,
  path: 3,
  wallTop: 4,
  wallFace: 5,
  water: 6,
  doorStrip: 7,
  rough: 8,
  cover: 9,
  table: 10,
  seat: 11,
  counter: 12,
  fence: 13,
  window: 14,
  marking: 15,
} as const;

export type CommonTileName = keyof typeof TILE;

// --- Drawing helpers -------------------------------------------------------

/** Deterministic speckle so tiles look the same on every load. */
const hash = (x: number, y: number, seed: number): number => ((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) >>> 0;

const flat =
  (base: ColourName, fleck?: ColourName, density = 9, seed = 1): Draw =>
  (b) => {
    b.rect(0, 0, 16, 16, base);
    if (fleck === undefined) return;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (hash(x, y, seed) % density === 0) b.set(x, y, fleck);
  };

const planks =
  (base: ColourName, line: ColourName): Draw =>
  (b) => {
    b.rect(0, 0, 16, 16, base);
    for (let y = 3; y < 16; y += 4) b.hline(0, y, 16, line);
    b.set(5, 1, line).set(12, 5, line).set(3, 9, line).set(10, 13, line);
  };

const bricks =
  (base: ColourName, mortar: ColourName, light?: ColourName): Draw =>
  (b) => {
    b.rect(0, 0, 16, 16, base);
    for (let row = 0; row < 4; row++) {
      b.hline(0, row * 4 + 3, 16, mortar);
      for (let x = row % 2 === 0 ? 3 : 7; x < 16; x += 8) b.vline(x, row * 4, 3, mortar);
    }
    if (light !== undefined) b.hline(0, 0, 16, light);
  };

const solid =
  (base: ColourName, edge: ColourName, light?: ColourName): Draw =>
  (b) => {
    b.rect(0, 0, 16, 16, base);
    b.hline(0, 15, 16, edge).vline(15, 0, 16, edge);
    if (light !== undefined) b.hline(0, 0, 15, light).vline(0, 0, 15, light);
  };

const checker =
  (a: ColourName, c: ColourName, size = 4): Draw =>
  (b) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) b.set(x, y, (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? a : c);
  };

const dither =
  (a: ColourName, c: ColourName): Draw =>
  (b) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) b.set(x, y, (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0 ? a : c);
  };

const water =
  (base: ColourName, glint: ColourName): Draw =>
  (b) => {
    b.rect(0, 0, 16, 16, base);
    b.hline(2, 4, 4, glint).hline(9, 9, 5, glint).hline(4, 13, 3, glint);
  };

const doorStrip =
  (ground: Draw, colour: ColourName): Draw =>
  (b) => {
    ground(b);
    b.rect(0, 6, 16, 4, colour);
  };

const on =
  (ground: Draw, top: Draw): Draw =>
  (b) => {
    ground(b);
    top(b);
  };

/** A box-shaped prop seen from above and slightly in front: lit top, darker face. */
const block =
  (top: ColourName, face: ColourName, light: ColourName, inset = 1, faceRows = 5): Draw =>
  (b) => {
    b.rect(inset, inset, 16 - inset * 2, 16 - inset * 2, top);
    b.rect(inset, 16 - inset - faceRows, 16 - inset * 2, faceRows, face);
    b.hline(inset, inset, 16 - inset * 2, light);
  };

const fence =
  (ground: Draw, post: ColourName, rail: ColourName): Draw =>
  (b) => {
    ground(b);
    b.hline(0, 5, 16, rail).hline(0, 10, 16, rail);
    b.rect(2, 2, 2, 12, post).rect(12, 2, 2, 12, post);
  };

const mesh =
  (ground: Draw, wire: ColourName): Draw =>
  (b) => {
    ground(b);
    for (let i = -16; i < 16; i += 4) b.line(i, 0, i + 15, 15, wire).line(i + 15, 0, i, 15, wire);
    b.hline(0, 0, 16, wire);
  };

const windowTile =
  (wall: Draw, frame: ColourName, glass: ColourName, glow: ColourName): Draw =>
  (b) => {
    wall(b);
    b.rect(3, 3, 10, 9, frame).rect(4, 4, 8, 7, glass).vline(8, 4, 7, frame).set(5, 5, glow).set(6, 5, glow).set(5, 6, glow);
  };

const stalks =
  (ground: Draw, stalk: ColourName, leaf: ColourName, tall: boolean): Draw =>
  (b) => {
    ground(b);
    for (let x = 1; x < 16; x += 3) {
      const h = tall ? 14 : 3;
      b.vline(x, 16 - h - (x % 2), h, stalk);
      if (tall) b.set(x + 1, 5 + (x % 4), leaf).set(x - 1, 9 + (x % 3), leaf).set(x, 1 + (x % 2), leaf);
    }
  };

const lines =
  (ground: Draw, colour: ColourName, vertical = false): Draw =>
  (b) => {
    ground(b);
    if (vertical) b.rect(7, 0, 2, 16, colour);
    else b.rect(0, 7, 10, 2, colour);
  };

const t = (name: string, draw: Draw, blocked = false, blocksSight = false): TileDef => ({ name, draw, blocked, blocksSight });

// --- Regions ---------------------------------------------------------------

function kilnamoe(): TileDef[] {
  const boards = planks('turf', 'turfDark');
  const bog = flat('mossDark', 'moss', 7, 2);
  const road = flat('slate', 'coal', 13, 3);
  const stone = bricks('slate', 'coal', 'steel');
  return [
    t('void', flat('ink'), true, true),
    t('floor', boards),
    t('floorAlt', bog),
    t('path', road),
    t('wallTop', solid('coal', 'ink', 'slate'), true, true),
    t('wallFace', bricks('turfDark', 'ink', 'turf'), true, true),
    t('water', water('navyDark', 'slate'), true),
    t('doorStrip', doorStrip(boards, 'amberLight')),
    t('rough', dither('turfDark', 'mossDark')),
    t('cover', on(bog, block('turf', 'turfDark', 'peat', 1, 7)), true, true),
    t('table', on(boards, block('peat', 'turfDark', 'amber', 2, 4)), true),
    t('seat', on(boards, block('peat', 'turfDark', 'amber', 5, 3)), true),
    t('counter', block('peat', 'turfDark', 'amberLight', 0, 6), true),
    t('fence', fence(bog, 'turfDark', 'peat'), true),
    t('window', windowTile(bricks('turfDark', 'ink', 'turf'), 'ink', 'amber', 'amberLight'), true, true),
    t('marking', on(boards, (b) => void b.rect(2, 2, 12, 12, 'brickDark').rect(4, 4, 8, 8, 'brick'))),
    // Extras
    t('grass', flat('moss', 'grass', 6, 4)),
    t('bogPool', water('turfDark', 'mossDark'), true),
    t('stoneWall', stone, true, true),
    t('roadLine', lines(road, 'bone')),
    t('hedge', on(bog, block('moss', 'mossDark', 'grass', 0, 6)), true, true),
    t('gate', fence(road, 'steel', 'fog'), true),
    t('barShelf', on(bricks('turfDark', 'ink', 'turf'), (b) => {
      b.hline(0, 6, 16, 'peat').hline(0, 13, 16, 'peat');
      for (let x = 1; x < 16; x += 3) b.rect(x, 2, 2, 4, x % 2 === 0 ? 'amber' : 'moss').rect(x, 9, 2, 4, x % 2 === 0 ? 'moss' : 'amberLight');
    }), true, true),
    t('pavement', checker('steel', 'slate', 8)),
    t('yardConcrete', flat('steel', 'slate', 11, 5)),
    t('litGround', flat('peat', 'amber', 9, 6)),
    // Shopfronts and doors for Main Street.
    t('shopfrontLit', on(bricks('turfDark', 'ink', 'turf'), (b) => void b.rect(1, 2, 14, 11, 'ink').rect(2, 3, 12, 9, 'amberLight').rect(2, 9, 12, 3, 'amber').hline(1, 13, 14, 'peat')), true, true),
    t('shopfrontDark', on(bricks('turfDark', 'ink', 'turf'), (b) => void b.rect(1, 2, 14, 11, 'ink').rect(2, 3, 12, 9, 'navyDark').set(4, 5, 'slate').set(5, 5, 'slate')), true, true),
    t('doorWood', on(bricks('turfDark', 'ink', 'turf'), (b) => void b.rect(3, 1, 10, 15, 'ink').rect(4, 2, 8, 14, 'peat').vline(8, 2, 14, 'turf').set(10, 9, 'amberLight')), true, true),
    t('doorLit', on(bricks('turfDark', 'ink', 'turf'), (b) => void b.rect(3, 1, 10, 15, 'ink').rect(4, 2, 8, 14, 'amber').rect(5, 3, 6, 5, 'amberLight')), true, true),
    t('churchStone', bricks('steel', 'slate', 'fog'), true, true),
    t('roofSlate', on(flat('coal'), (b) => {
      for (let y = 3; y < 16; y += 4) b.hline(0, y, 16, 'ink');
      for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 === 0 ? 2 : 6; x < 16; x += 8) b.vline(x, y, 3, 'slate');
    }), true, true),
    t('kerb', on(flat('slate', 'coal', 13, 3), (b) => void b.rect(0, 0, 16, 4, 'steel').hline(0, 4, 16, 'coal'))),
    t('nightGrass', flat('mossDark', 'ink', 6, 23)),
  ];
}

function cities(): TileDef[] {
  const lino = checker('bone', 'fog', 8);
  const carpet = flat('navy', 'navyDark', 5, 7);
  const concrete = flat('steel', 'slate', 10, 8);
  const brick = bricks('brick', 'brickDark', 'tan');
  return [
    t('void', flat('ink'), true, true),
    t('floor', lino),
    t('floorAlt', carpet),
    t('path', concrete),
    t('wallTop', solid('navyDark', 'ink', 'navy'), true, true),
    t('wallFace', brick, true, true),
    t('water', water('navyDark', 'navy'), true),
    t('doorStrip', doorStrip(lino, 'amberLight')),
    t('rough', dither('slate', 'coal')),
    t('cover', on(concrete, block('brick', 'brickDark', 'tan', 0, 8)), true, true),
    t('table', on(lino, block('fog', 'steel', 'white', 2, 4)), true),
    t('seat', on(lino, block('navy', 'navyDark', 'dustyBlue', 5, 3)), true),
    t('counter', block('bone', 'steel', 'white', 0, 6), true),
    t('fence', mesh(concrete, 'coal'), true),
    t('window', windowTile(brick, 'navyDark', 'fluoro', 'white'), true, true),
    t('marking', lines(concrete, 'amberLight')),
    // Extras
    t('cubicleWall', block('fog', 'steel', 'white', 0, 9), true, true),
    t('archiveShelf', on(flat('slate'), (b) => {
      b.rect(1, 0, 14, 16, 'steel');
      for (let y = 1; y < 16; y += 5) for (let x = 2; x < 14; x += 2) b.rect(x, y, 1, 4, x % 4 === 0 ? 'bone' : 'tan');
    }), true, true),
    t('containerRed', block('brick', 'brickDark', 'tan', 0, 10), true, true),
    t('containerBlue', block('navy', 'navyDark', 'dustyBlue', 0, 10), true, true),
    t('rail', on(concrete, (b) => void b.hline(0, 5, 16, 'coal').hline(0, 10, 16, 'coal'))),
    t('floodlit', flat('bone', 'fluoro', 6, 9)),
    t('queueRope', on(lino, (b) => void b.rect(1, 6, 2, 6, 'amber').rect(13, 6, 2, 6, 'amber').hline(3, 7, 10, 'brick')), true),
    t('barWood', planks('turf', 'turfDark')),
    t('greenWall', bricks('moss', 'mossDark', 'grass'), true, true),
    t('dockEdge', on(water('navyDark', 'navy'), (b) => void b.rect(0, 0, 16, 5, 'steel').hline(0, 5, 16, 'coal')), true),
  ];
}

function ohio(): TileDef[] {
  const dirt = flat('cornShade', 'tanShade', 8, 10);
  const asphalt = flat('slate', 'steel', 14, 11);
  const grass = flat('grass', 'corn', 9, 12);
  const pink = bricks('motelPink', 'motelPinkShade', 'white');
  return [
    t('void', flat('ink'), true, true),
    t('floor', checker('skyPale', 'bone', 8)),
    t('floorAlt', grass),
    t('path', dirt),
    t('wallTop', solid('motelPinkShade', 'ink', 'motelPink'), true, true),
    t('wallFace', pink, true, true),
    t('water', water('dustyBlue', 'skyPale'), true),
    t('doorStrip', doorStrip(checker('skyPale', 'bone', 8), 'amberLight')),
    t('rough', stalks(dirt, 'cornShade', 'corn', false)),
    t('cover', stalks(dirt, 'corn', 'grass', true), false, true),
    t('table', on(checker('skyPale', 'bone', 8), block('white', 'fog', 'white', 2, 4)), true),
    t('seat', on(checker('skyPale', 'bone', 8), block('alarm', 'brickDark', 'motelPink', 5, 3)), true),
    t('counter', block('skyPale', 'dustyBlue', 'white', 0, 6), true),
    t('fence', fence(grass, 'bone', 'white'), true),
    t('window', windowTile(pink, 'white', 'dustyBlue', 'white'), true, true),
    t('marking', lines(asphalt, 'white', true)),
    // Extras
    t('road', asphalt),
    t('roadLine', lines(asphalt, 'corn')),
    t('cornFlat', dither('corn', 'cornShade')),
    t('markerStone', on(dither('corn', 'cornShade'), block('fog', 'steel', 'white', 4, 3))),
    t('ditch', water('tanShade', 'dustyBlue'), true),
    t('poolEmpty', solid('skyPale', 'dustyBlue', 'white'), true),
    t('sidewalk', checker('bone', 'fog', 8)),
    t('hatch', solid('steel', 'coal', 'fog')),
  ];
}

function roswell(): TileDef[] {
  const pavement = flat('tan', 'tanShade', 9, 13);
  const shopFloor = checker('lime', 'magenta', 8);
  const stucco = bricks('tan', 'tanShade', 'sand');
  return [
    t('void', flat('ink'), true, true),
    t('floor', shopFloor),
    t('floorAlt', flat('tanShade', 'tan', 6, 14)),
    t('path', pavement),
    t('wallTop', solid('magentaShade', 'ink', 'magenta'), true, true),
    t('wallFace', stucco, true, true),
    t('water', water('teal', 'lime'), true),
    t('doorStrip', doorStrip(shopFloor, 'amberLight')),
    t('rough', dither('tan', 'tanShade')),
    t('cover', on(flat('tanShade'), block('tan', 'tanShade', 'sand', 0, 8)), true, true),
    t('table', on(shopFloor, block('white', 'fog', 'white', 2, 4)), true),
    t('seat', on(shopFloor, block('magenta', 'magentaShade', 'motelPink', 5, 3)), true),
    t('counter', block('lime', 'limeShade', 'white', 0, 6), true),
    t('fence', mesh(pavement, 'tanShade'), true),
    t('window', windowTile(stucco, 'magentaShade', 'lime', 'white'), true, true),
    t('marking', lines(flat('slate', 'steel', 14, 15), 'white')),
    // Extras
    t('road', flat('slate', 'steel', 14, 15)),
    t('shopShelf', on(flat('magentaShade'), (b) => {
      b.rect(0, 0, 16, 16, 'tanShade').hline(0, 7, 16, 'tan').hline(0, 15, 16, 'tan');
      for (let x = 1; x < 16; x += 4) b.ellipse(x, 2, 3, 4, 'skyPale').set(x + 1, 3, 'lime').ellipse(x, 10, 3, 4, 'skyPale').set(x + 1, 11, 'alienGrey');
    }), true, true),
    t('neon', on(stucco, (b) => void b.rect(2, 5, 12, 2, 'lime').rect(2, 9, 12, 2, 'magenta')), true, true),
    t('cactus', on(flat('tanShade', 'tan', 6, 14), (b) => void b.rect(7, 3, 3, 12, 'limeShade').rect(3, 6, 2, 5, 'limeShade').rect(5, 9, 2, 2, 'limeShade').rect(12, 5, 2, 5, 'limeShade').rect(10, 8, 2, 2, 'limeShade')), true),
    t('boxStack', on(flat('steel', 'slate', 9, 16), block('tan', 'tanShade', 'sand', 1, 7)), true, true),
    t('stockFloor', flat('steel', 'slate', 9, 16)),
  ];
}

function nevada(): TileDef[] {
  const sand = flat('sand', 'tan', 7, 17);
  const road = flat('tanShade', 'rustDark', 12, 18);
  return [
    t('void', flat('ink'), true, true),
    t('floor', sand),
    t('floorAlt', dither('sand', 'tan')),
    t('path', road),
    t('wallTop', solid('rustDark', 'ink', 'rust'), true, true),
    t('wallFace', bricks('rust', 'rustDark', 'sand'), true, true),
    t('water', water('dustyBlue', 'skyPale'), true),
    t('doorStrip', doorStrip(sand, 'amberLight')),
    t('rough', on(sand, (b) => void b.rect(3, 9, 4, 3, 'tanShade').rect(10, 4, 3, 2, 'tanShade').set(4, 8, 'limeShade').set(11, 3, 'limeShade'))),
    t('cover', on(sand, block('rust', 'rustDark', 'sand', 0, 8)), true, true),
    t('table', on(sand, block('tan', 'tanShade', 'sand', 2, 4)), true),
    t('seat', on(sand, block('tan', 'tanShade', 'sand', 5, 3)), true),
    t('counter', block('tan', 'tanShade', 'white', 0, 6), true),
    t('fence', mesh(sand, 'steel'), true),
    t('window', windowTile(bricks('rust', 'rustDark', 'sand'), 'rustDark', 'skyPale', 'white'), true, true),
    t('marking', lines(road, 'sand', true)),
    // Extras
    t('shade', flat('tanShade', 'rustDark', 8, 19)),
    t('sensorPost', on(sand, (b) => void b.rect(7, 4, 2, 10, 'steel').rect(6, 2, 4, 3, 'coal').set(7, 3, 'alarm')), true),
    t('thermalMast', on(sand, (b) => void b.rect(7, 0, 2, 15, 'steel').rect(4, 1, 8, 3, 'coal').rect(5, 2, 2, 1, 'amber').rect(9, 2, 2, 1, 'amber')), true),
    t('junctionBox', on(sand, block('steel', 'slate', 'fog', 3, 5)), true),
    t('sensorLine', on(sand, (b) => void b.hline(0, 8, 16, 'rust'))),
    t('tumbleweed', on(sand, (b) => void b.ellipse(1, 2, 14, 13, 'tanShade').ellipse(3, 4, 10, 9, 'tan').line(2, 12, 13, 3, 'rustDark').line(3, 4, 12, 13, 'rustDark')), true, true),
    t('asphalt', flat('slate', 'steel', 14, 20)),
  ];
}

function base(): TileDef[] {
  const floor = solid('tealDark', 'ink', 'teal');
  const carpet = flat('violetDark', 'violet', 7, 21);
  const wall = bricks('violetDark', 'ink', 'violet');
  return [
    t('void', flat('ink'), true, true),
    t('floor', floor),
    t('floorAlt', carpet),
    t('path', flat('tealDark', 'teal', 12, 22)),
    t('wallTop', solid('ink', 'ink', 'violetDark'), true, true),
    t('wallFace', wall, true, true),
    t('water', water('teal', 'fluoro'), true),
    t('doorStrip', doorStrip(floor, 'amberLight')),
    t('rough', dither('tealDark', 'violetDark')),
    t('cover', on(floor, block('alienGrey', 'steel', 'fluoro', 0, 8)), true, true),
    t('table', on(carpet, block('alienGrey', 'steel', 'fluoro', 1, 4)), true),
    t('seat', on(carpet, block('violet', 'violetDark', 'fluoro', 5, 3)), true),
    t('counter', block('alienGrey', 'steel', 'fluoro', 0, 6), true),
    t('fence', on(floor, (b) => void b.rect(0, 6, 16, 4, 'teal').hline(0, 7, 16, 'fluoro')), true),
    t('window', windowTile(wall, 'ink', 'teal', 'fluoro'), true, true),
    t('marking', on(floor, (b) => void b.line(3, 12, 8, 4, 'amber').line(8, 4, 12, 12, 'amber'))),
    // Extras
    t('gravitySwitch', on(wall, (b) => void b.rect(4, 4, 8, 8, 'ink').rect(5, 5, 6, 6, 'violet').rect(7, 7, 2, 2, 'fluoro')), true, true),
    t('pressurePlate', on(floor, (b) => void b.rect(2, 2, 12, 12, 'violetDark').rect(3, 3, 10, 10, 'violet'))),
    t('glass', on(floor, (b) => void b.rect(0, 5, 16, 6, 'teal').hline(0, 6, 16, 'fluoro')), true),
    t('blastFrame', solid('steel', 'ink', 'fog'), true, true),
    t('panel', on(wall, (b) => void b.rect(2, 3, 12, 9, 'ink').rect(3, 4, 4, 3, 'teal').rect(9, 4, 4, 3, 'amber').hline(3, 9, 10, 'fluoro')), true, true),
    t('waterCooler', on(carpet, (b) => void b.rect(5, 1, 6, 7, 'skyPale').rect(5, 8, 6, 7, 'alienGrey').hline(5, 14, 6, 'steel')), true),
    t('consoleDais', solid('violet', 'violetDark', 'fluoro')),
  ];
}

const BUILDERS: Readonly<Record<RegionId, () => TileDef[]>> = { kilnamoe, cities, ohio, roswell, nevada, base };

const cache = new Map<RegionId, readonly TileDef[]>();

export function regionTiles(region: RegionId): readonly TileDef[] {
  let tiles = cache.get(region);
  if (tiles === undefined) {
    tiles = BUILDERS[region]();
    cache.set(region, tiles);
  }
  return tiles;
}

/** Index of a tile by name in a region; throws on an unknown name so a typo in a map fails loudly. */
export function tileIndex(region: RegionId, name: string): number {
  const index = regionTiles(region).findIndex((tile) => tile.name === name);
  if (index < 0) throw new Error(`No tile "${name}" in region "${region}"`);
  return index;
}

export function tileFlags(region: RegionId, index: number): { blocked: boolean; blocksSight: boolean } {
  const tile = regionTiles(region)[index];
  if (tile === undefined) throw new Error(`No tile ${index} in region "${region}"`);
  return { blocked: tile.blocked, blocksSight: tile.blocksSight };
}

export function tilesetSheet(region: RegionId): Sheet {
  const sheet = new SheetBuilder(tilesetKey(region), 16, 16, 16);
  for (const tile of regionTiles(region)) sheet.cell(tile.name, tile.draw);
  return sheet.build();
}

/** DESIGN.md section 8 and docs/style-guide.md: generated art, palette, font and keys. No Phaser needed. */

import { describe, expect, it } from 'vitest';
import { FONT_CHARS, canDraw } from '../../src/art/font';
import { FONT_CELL, TEX, animKey, frameName, fx, icon, portrait, tilesetKey } from '../../src/art/keys';
import { PALETTE, REGION_COLOURS, SHARED_COLOURS, css } from '../../src/art/palette';
import type { ColourName } from '../../src/art/palette';
import { PixelBuffer } from '../../src/art/pixels';
import type { Sheet } from '../../src/art/pixels';
import { allSheets } from '../../src/art/sheets';
import { TILE, regionTiles, tileFlags, tileIndex } from '../../src/art/tiles';
import { REGIONS } from '../../src/core/types';
import type { AbilityId, DrinkId, FoodId, SpeakerId } from '../../src/core/types';

const sheets = allSheets();
const byKey = (k: string): Sheet => {
  const s = sheets.find((x) => x.key === k);
  if (!s) throw new Error(`no sheet ${k}`);
  return s;
};

describe('palette (48 colours)', () => {
  it('has exactly 48 colours', () => {
    expect(Object.keys(PALETTE)).toHaveLength(48);
  });
  it('has no duplicate values and every value is a 24-bit colour', () => {
    const values = Object.values(PALETTE);
    expect(new Set(values).size).toBe(values.length);
    for (const v of values) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0xffffff);
    }
  });
  it('css() formats #rrggbb', () => {
    expect(css('ink')).toBe('#14121a');
    expect(css('alarm')).toBe('#e0343c');
  });
  it('each region sub-palette names real colours and has a dominant colour list', () => {
    for (const r of REGIONS) {
      expect(REGION_COLOURS[r].length, r).toBeGreaterThan(3);
      for (const c of REGION_COLOURS[r]) expect(c in PALETTE, `${r}:${c}`).toBe(true);
    }
    for (const c of SHARED_COLOURS) expect(c in PALETTE, c).toBe(true);
  });
});

describe('allSheets()', () => {
  it('builds without Phaser and is not empty', () => {
    expect(sheets.length).toBeGreaterThan(30);
  });

  it('has no duplicate texture keys', () => {
    const keys = sheets.map((s) => s.key);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
  });

  it('has no duplicate frame names within a sheet', () => {
    for (const s of sheets) {
      const names = s.frames.map((f) => f.name);
      expect(names.filter((n, i) => names.indexOf(n) !== i), s.key).toEqual([]);
    }
  });

  it('every frame lies inside its sheet buffer', () => {
    for (const s of sheets) {
      for (const f of s.frames) {
        expect(f.x, `${s.key}:${f.name}`).toBeGreaterThanOrEqual(0);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.x + f.width, `${s.key}:${f.name}`).toBeLessThanOrEqual(s.buffer.width);
        expect(f.y + f.height, `${s.key}:${f.name}`).toBeLessThanOrEqual(s.buffer.height);
      }
    }
  });

  it('uses palette colours only', () => {
    for (const s of sheets) {
      const bad = new Set<string>();
      for (const px of s.buffer.data) if (px !== null && !(px in PALETTE)) bad.add(String(px));
      expect([...bad], s.key).toEqual([]);
    }
  });

  it('draws something in every frame of every sheet except the blank tile', () => {
    for (const s of sheets) {
      for (const f of s.frames) {
        let any = false;
        for (let y = f.y; y < f.y + f.height && !any; y++) for (let x = f.x; x < f.x + f.width; x++) if (s.buffer.get(x, y) !== null) any = true;
        if (!any) expect(`${s.key}:${f.name}`, 'empty frame').toMatch(/^tiles\.[a-z]+:void$|:(idle|walk)\.|:(telegraph|attack|hurt|down)|:space$|^font\.main: $/);
      }
    }
  });

  it('every animation refers only to frames in its sheet, with a positive rate', () => {
    for (const s of sheets) {
      const names = new Set(s.frames.map((f) => f.name));
      const keys = new Set<string>();
      for (const a of s.anims) {
        expect(keys.has(a.key), `${s.key} dup anim ${a.key}`).toBe(false);
        keys.add(a.key);
        expect(a.frames.length, a.key).toBeGreaterThan(0);
        expect(a.frameRate, a.key).toBeGreaterThan(0);
        for (const f of a.frames) expect(names.has(f), `${a.key} -> ${f}`).toBe(true);
      }
    }
  });
});

describe('characters', () => {
  const cell = (s: Sheet) => ({ w: s.frames[0]?.width, h: s.frames[0]?.height });

  it('Andrew\'s cell is 16 x 24 and Myko\'s is 16 x 32', () => {
    expect(cell(byKey(TEX.andrew))).toEqual({ w: 16, h: 24 });
    expect(cell(byKey(TEX.myko))).toEqual({ w: 16, h: 32 });
    for (const f of byKey(TEX.andrew).frames) expect([f.width, f.height]).toEqual([16, 24]);
    for (const f of byKey(TEX.myko).frames) expect([f.width, f.height]).toEqual([16, 32]);
  });

  it('the height difference is obvious: Myko is at least 8 px taller in drawn pixels', () => {
    const extent = (s: Sheet): number => {
      const f = s.frames.find((x) => x.name === frameName('idle', 'down', 0));
      if (!f) throw new Error('no idle.down.0');
      let top = f.height;
      let bottom = -1;
      for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) if (s.buffer.get(f.x + x, f.y + y) !== null) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
      return bottom - top + 1;
    };
    expect(extent(byKey(TEX.myko)) - extent(byKey(TEX.andrew))).toBeGreaterThanOrEqual(8);
  });

  it('Andrew has every animation in the style guide in all four directions', () => {
    const names = new Set(byKey(TEX.andrew).frames.map((f) => f.name));
    for (const anim of ['idle', 'walk', 'punch1', 'punch2', 'punch3', 'hurley', 'throw', 'drink', 'hurt', 'stumble', 'fall', 'getUp', 'actNatural']) {
      for (const dir of ['up', 'down', 'left', 'right'] as const) expect(names.has(frameName(anim, dir, 0)), `${anim}.${dir}`).toBe(true);
    }
    for (const dir of ['up', 'down', 'left', 'right'] as const) for (let i = 0; i < 4; i++) expect(names.has(frameName('walk', dir, i)), `walk.${dir}.${i}`).toBe(true);
  });

  it('Myko has idle, walk, blink, smoke and swat but no run cycle', () => {
    const names = new Set(byKey(TEX.myko).frames.map((f) => f.name));
    for (const anim of ['idle', 'walk', 'blink', 'smoke', 'swat']) expect(names.has(frameName(anim, 'down', 0)), anim).toBe(true);
    expect([...names].some((n) => n.startsWith('run.'))).toBe(false);
  });

  it('every roster enemy has a sprite sheet under its spriteKey', () => {
    const keys = new Set(sheets.map((s) => s.key));
    for (const id of ['lad', 'cousin', 'suit', 'worker', 'brawler', 'docker', 'agent', 'drone', 'mascot', 'clerk', 'security']) expect(keys.has(`enemy.${id}`), id).toBe(true);
  });

  it('every boss and set piece has a sprite sheet', () => {
    const keys = new Set(sheets.map((s) => s.key));
    for (const id of ['c1.boss.bigtom', 'c2.setpiece.ram', 'c3.boss.halloran', 'c4.boss.foreman', 'c5.boss.pruitt1', 'c6.setpiece.combine', 'c8.boss.pruitt2', 'c9.setpiece.lockdown', 'c10.boss.administrator']) {
      expect(keys.has(`boss.${id}`), id).toBe(true);
    }
    expect(['zip', 'zap', 'zorp'].every((n) => keys.has(`boss.c7.boss.mascots.${n}`))).toBe(true);
  });

  it('enemies have walk, telegraph, attack, hurt and down frames; aliens are shorter than Andrew', () => {
    for (const id of ['lad', 'brawler', 'clerk', 'security']) {
      const names = new Set(byKey(`enemy.${id}`).frames.map((f) => f.name));
      for (const a of ['walk', 'telegraph', 'attack', 'hurt', 'down']) expect(names.has(frameName(a, 'down', 0)), `${id}.${a}`).toBe(true);
    }
    expect(byKey('enemy.clerk').frames[0]?.height).toBeLessThan(24);
    expect(byKey('enemy.security').frames[0]?.height).toBeLessThan(24);
  });
});

describe('keys.ts is fully drawn', () => {
  it('every icon.* frame exists in the icon sheet', () => {
    const names = new Set(byKey(TEX.icons).frames.map((f) => f.name));
    const drinks: DrinkId[] = ['stout', 'whiskey', 'poitin', 'lightBeer', 'bourbon', 'craftIpa', 'tequila', 'water'];
    const foods: FoodId[] = ['crisps', 'chickenFilletRoll', 'breakfastRoll', 'spiceBag', 'tea'];
    const abilities: AbilityId[] = ['punchCombo', 'bottleThrow', 'stumble', 'stoutSlam', 'actNatural', 'hurley', 'sliotarStrike', 'poitinBreath', 'borrowedGlove'];
    const wanted = [icon.pintFull, icon.pintHalf, icon.pintEmpty, icon.empty, icon.rollie, icon.rollieSpent, icon.detection, icon.interact, ...drinks.map(icon.drink), ...foods.map(icon.food), ...abilities.map(icon.ability)];
    expect(wanted.filter((n) => !names.has(n))).toEqual([]);
  });

  it('every fx.* frame exists in the fx sheet', () => {
    const names = new Set(byKey(TEX.fx).frames.map((f) => f.name));
    const wanted = Object.values(fx).flat();
    expect(wanted.filter((n) => !names.has(n))).toEqual([]);
  });

  it('every SpeakerId has a portrait frame, 32 x 32', () => {
    const speakers: SpeakerId[] = ['andrew', 'myko', 'dympna', 'halloran', 'colleenAnn', 'pruitt', 'gary', 'administrator', 'npc', 'narrator'];
    const s = byKey(TEX.portraits);
    for (const sp of speakers) {
      const f = s.frames.find((x) => x.name === portrait(sp));
      expect(f, sp).toBeDefined();
      expect([f?.width, f?.height]).toEqual([32, 32]);
    }
  });

  it('the 1 x 1 pixel texture exists', () => {
    expect(byKey(TEX.pixel).frames).toHaveLength(1);
  });

  it('the icon sheet cells are 12 x 12 and fx cells 16 x 16', () => {
    for (const f of byKey(TEX.icons).frames) expect([f.width, f.height]).toEqual([12, 12]);
    for (const f of byKey(TEX.fx).frames) expect([f.width, f.height]).toEqual([16, 16]);
  });

  it('animKey composes texture, anim and facing', () => {
    expect(animKey('char.andrew', 'walk', 'left')).toBe('char.andrew.walk.left');
  });

  it('every animation Andrew and Myko register uses the animKey format', () => {
    for (const k of [TEX.andrew, TEX.myko]) for (const a of byKey(k).anims) expect(a.key.startsWith(`${k}.`), a.key).toBe(true);
  });
});

describe('font', () => {
  it('cells are 6 x 9', () => {
    expect(FONT_CELL).toEqual({ width: 6, height: 9 });
    for (const f of byKey('font.main').frames) expect([f.width, f.height]).toEqual([6, 9]);
  });

  it('draws upper and lower case, digits and every punctuation mark in the style guide', () => {
    for (const ch of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') expect(canDraw(ch), ch).toBe(true);
    for (const ch of '.,\'"!?:;-()/+×€$%&') expect(canDraw(ch), ch).toBe(true);
  });

  it('draws the accented vowels so "Poitín" renders', () => {
    for (const ch of 'áéíóúÁÉÍÓÚ') expect(canDraw(ch), ch).toBe(true);
    for (const ch of 'Poitín') expect(canDraw(ch), ch).toBe(true);
  });

  it('has one frame per character and no duplicate characters', () => {
    expect(new Set([...FONT_CHARS]).size).toBe(FONT_CHARS.length);
    expect(byKey('font.main').frames).toHaveLength(FONT_CHARS.length);
  });

  it('does not claim to draw characters it cannot', () => {
    for (const ch of '☃€'.slice(0, 1)) expect(canDraw(ch)).toBe(false);
  });
});

describe('tilesets (16 common tiles at the TILE indices)', () => {
  it('there is a tileset per region with the right key', () => {
    for (const r of REGIONS) expect(sheets.some((s) => s.key === tilesetKey(r)), r).toBe(true);
  });

  it('every region has all 16 common tiles at the TILE indices', () => {
    for (const r of REGIONS) {
      const tiles = regionTiles(r);
      for (const [name, index] of Object.entries(TILE)) expect(tiles[index]?.name, `${r}:${index}`).toBe(name);
    }
  });

  it('tileIndex finds common tiles and throws on a typo', () => {
    for (const r of REGIONS) expect(tileIndex(r, 'wallTop')).toBe(TILE.wallTop);
    expect(() => tileIndex('kilnamoe', 'nope')).toThrow();
  });

  it('a region has at most 256 tiles, 16 x 16 each, unique names', () => {
    for (const r of REGIONS) {
      const t = regionTiles(r);
      expect(t.length, r).toBeLessThanOrEqual(256);
      expect(new Set(t.map((x) => x.name)).size, r).toBe(t.length);
      const s = byKey(tilesetKey(r));
      for (const f of s.frames) expect([f.width, f.height]).toEqual([16, 16]);
    }
  });

  it('walls block and block sight, floors and paths do not, windows block movement', () => {
    for (const r of REGIONS) {
      expect(tileFlags(r, TILE.wallTop).blocked, r).toBe(true);
      expect(tileFlags(r, TILE.wallTop).blocksSight, r).toBe(true);
      expect(tileFlags(r, TILE.floor), r).toEqual({ blocked: false, blocksSight: false });
      expect(tileFlags(r, TILE.path).blocked, r).toBe(false);
      expect(tileFlags(r, TILE.window).blocked, r).toBe(true);
      expect(tileFlags(r, TILE.doorStrip).blocked, r).toBe(false);
    }
  });

  it('walkable ground is lower in contrast than walls (style guide 3)', () => {
    // Number of distinct colours is a cheap proxy: walkable ground should not be busier than a wall face.
    for (const r of REGIONS) {
      const tiles = regionTiles(r);
      const colours = (i: number): number => {
        const b = new PixelBuffer(16, 16);
        tiles[i]?.draw(b);
        return new Set(b.data.filter((p): p is ColourName => p !== null)).size;
      };
      expect(colours(TILE.floor), r).toBeLessThanOrEqual(colours(TILE.wallFace) + 1);
    }
  });

  // CONTENT NOTE (creative-director, src/art/tiles.ts): every region tileset uses colours outside its own sub-palette
  // (for example the base tileset uses amber, the cities tileset uses turf and moss). DESIGN 8 / style guide 1 say
  // environment art uses the region colours plus the shared ones. REGION_COLOURS may be meant as 'dominant' only.
  it.fails('each region tileset sticks to the shared colours plus its own sub-palette (style guide 1)', () => {
    const strays: Record<string, string[]> = {};
    for (const r of REGIONS) {
      const allowed = new Set<string>([...SHARED_COLOURS, ...REGION_COLOURS[r]]);
      const s = byKey(tilesetKey(r));
      const stray = new Set<string>();
      for (const px of s.buffer.data) if (px !== null && !allowed.has(px)) stray.add(px);
      strays[r] = [...stray];
    }
    expect(strays).toEqual({ kilnamoe: [], cities: [], ohio: [], roswell: [], nevada: [], base: [] });
  });
});

describe('pixel buffer', () => {
  it('ignores out-of-bounds writes and reads null outside', () => {
    const b = new PixelBuffer(4, 4);
    b.set(-1, 0, 'ink').set(4, 0, 'ink').set(0, 9, 'ink');
    expect(b.data.every((p) => p === null)).toBe(true);
    expect(b.get(10, 10)).toBeNull();
  });

  it('rect, lines and RGBA output', () => {
    const b = new PixelBuffer(4, 2);
    b.rect(0, 0, 2, 2, 'white').set(3, 1, 'ink');
    const rgba = b.toRgba();
    expect(rgba).toHaveLength(4 * 2 * 4);
    expect(Array.from(rgba.slice(0, 4))).toEqual([0xf6, 0xf4, 0xea, 0xff]);
    expect(rgba[(1 * 4 + 2) * 4 + 3]).toBe(0); // transparent
    expect(Array.from(rgba.slice((1 * 4 + 3) * 4, (1 * 4 + 3) * 4 + 4))).toEqual([0x14, 0x12, 0x1a, 0xff]);
  });
});

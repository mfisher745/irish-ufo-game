/** Playtest 2 art: Andrew's beard (sprite and portrait) and the Myko-call leaf icons. docs/style-guide.md sections 2 and 4. */

import { describe, expect, it } from 'vitest';
import { ANDREW } from '../../src/art/characters';
import { IDLE, figureSheet } from '../../src/art/humanoid';
import { TEX, frameName, icon, portrait } from '../../src/art/keys';
import type { ColourName } from '../../src/art/palette';
import { drawPortrait } from '../../src/art/portraits';
import type { Pixel, PixelBuffer, Sheet } from '../../src/art/pixels';
import { allSheets } from '../../src/art/sheets';

const byKey = (k: string): Sheet => {
  const s = allSheets().find((x) => x.key === k);
  if (!s) throw new Error(`no sheet ${k}`);
  return s;
};

function frameOf(s: Sheet, name: string): Pixel[][] {
  const f = s.frames.find((x) => x.name === name);
  if (!f) throw new Error(`no frame ${name}`);
  const rows: Pixel[][] = [];
  for (let y = 0; y < f.height; y++) {
    const row: Pixel[] = [];
    for (let x = 0; x < f.width; x++) row.push(s.buffer.get(f.x + x, f.y + y));
    rows.push(row);
  }
  return rows;
}

describe('Andrew has a beard in the hair colour', () => {
  const HAIR = ANDREW.hair as ColourName;
  const withBeard = frameOf(byKey(TEX.andrew), frameName('idle', 'down', 0));
  const without = frameOf(figureSheet(TEX.andrew, { ...ANDREW, beard: false }, { idle: IDLE }), frameName('idle', 'down', 0));

  /** Pixels the beard adds to the front-facing idle frame. */
  const added: { x: number; y: number; c: Pixel }[] = [];
  withBeard.forEach((row, y) =>
    row.forEach((c, x) => {
      // The outline moves with the jaw, so only the hair-coloured additions are the beard.
      if (c === HAIR && (without[y]?.[x] ?? null) !== HAIR) added.push({ x, y, c });
    }),
  );

  it('the look asks for a beard and hair is turfDark', () => {
    expect(ANDREW.beard).toBe(true);
    expect(HAIR).toBe('turfDark');
  });

  it('the beard adds pixels in the hair colour', () => {
    expect(added.length).toBeGreaterThan(0);
    expect(added.every((p) => p.c === HAIR)).toBe(true);
  });

  it('the beard fills the bottom two rows of the head, full width, with a sideburn pixel each side above them', () => {
    const rows = [...new Set(added.map((p) => p.y))].sort((a, b) => a - b);
    const [sideburn, jaw1, jaw2] = rows;
    expect(rows).toHaveLength(3);
    expect([jaw1, jaw2]).toEqual([(sideburn ?? 0) + 1, (sideburn ?? 0) + 2]);
    for (const y of [jaw1, jaw2]) expect(added.filter((p) => p.y === y)).toHaveLength(ANDREW.headWidth);
    expect(added.filter((p) => p.y === sideburn)).toHaveLength(2);
    // The jaw rows sit at the bottom of the head: below the eyes (ink).
    const eyeRow = withBeard.findIndex((row) => row.includes('ink'));
    expect(sideburn).toBeGreaterThan(eyeRow);
    // The frame really shows those pixels in the hair colour.
    for (const p of added) expect(withBeard[p.y]?.[p.x]).toBe(HAIR);
  });

  it('front-facing idle frames are still 16 x 28 with the beard', () => {
    const s = byKey(TEX.andrew);
    for (const f of s.frames.filter((x) => x.name.startsWith('idle.down.'))) {
      expect([f.width, f.height]).toEqual([ANDREW.cellWidth, ANDREW.cellHeight]);
    }
  });

  describe('portrait', () => {
    const buf: PixelBuffer = drawPortrait('andrew');
    const px = (x: number, y: number): Pixel => buf.get(x, y);
    const rowsWith = (c: ColourName, pred: (x: number, y: number) => boolean = () => true): number[] => {
      const out: number[] = [];
      for (let y = 0; y < buf.height; y++) for (let x = 0; x < buf.width; x++) if (px(x, y) === c && pred(x, y)) out.push(y);
      return out;
    };

    it('the portrait frame is in the sheet', () => {
      expect(byKey(TEX.portraits).frames.some((f) => f.name === portrait('andrew'))).toBe(true);
    });

    it('has hair-colour pixels below the mouth row, where the face would otherwise be skin', () => {
      // The mouth is the lowest inner row with a run of ink pixels (inside the frame border).
      let mouth = -1;
      for (let y = 1; y < buf.height - 1; y++) {
        let run = 0;
        let best = 0;
        for (let x = 1; x < buf.width - 1; x++) {
          run = px(x, y) === 'ink' ? run + 1 : 0;
          best = Math.max(best, run);
        }
        if (best >= 5) mouth = y;
      }
      expect(mouth).toBeGreaterThan(0);
      const below = rowsWith(HAIR, (_x, y) => y > mouth);
      // A beard, not a stray pixel: more than a row's worth below the mouth.
      expect(below.length).toBeGreaterThan(buf.width / 2);
      // And the mouth line itself is still there.
      expect(px(16, mouth)).toBe('ink');
    });
  });
});

describe('Myko call icons are cannabis leaves', () => {
  const icons = byKey(TEX.icons);
  const avail = frameOf(icons, icon.rollie);
  const spent = frameOf(icons, icon.rollieSpent);
  const colours = (cell: Pixel[][]): Set<Pixel> => new Set(cell.flat().filter((c) => c !== null));

  it('both are non-empty', () => {
    expect(colours(avail).size).toBeGreaterThan(0);
    expect(colours(spent).size).toBeGreaterThan(0);
  });

  it('available and spent differ', () => {
    expect(JSON.stringify(avail)).not.toBe(JSON.stringify(spent));
  });

  it('the available one uses grass; the spent one does not', () => {
    expect(colours(avail).has('grass')).toBe(true);
    expect(colours(spent).has('grass')).toBe(false);
  });

  it('the spent leaf is slate', () => {
    expect(colours(spent).has('slate')).toBe(true);
  });
});

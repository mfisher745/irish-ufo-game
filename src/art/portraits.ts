/**
 * Dialogue portraits, 32 x 32, one per `SpeakerId`. docs/style-guide.md
 * section 4. Faces follow the same three-tone, top-left-light rule as sprites.
 */

import type { SpeakerId } from '../core/types';
import { TEX, portrait } from './keys';
import type { ColourName } from './palette';
import { PixelBuffer, SheetBuilder } from './pixels';
import type { Sheet } from './pixels';

interface Face {
  readonly background: ColourName;
  readonly skin: ColourName;
  readonly skinShade: ColourName;
  readonly top: ColourName;
  readonly topShade: ColourName;
  readonly hair?: ColourName;
  /** How far down the forehead the hair comes, in rows. */
  readonly hairRows?: number;
  readonly longHair?: boolean;
  readonly hat?: ColourName;
  readonly hardhat?: boolean;
  readonly alien?: boolean;
  readonly tired?: boolean;
  readonly shades?: boolean;
  readonly stubble?: boolean;
  readonly halfSmile?: boolean;
  readonly frown?: boolean;
  readonly rollie?: boolean;
  readonly tie?: ColourName;
  readonly collar?: ColourName;
  readonly lanyard?: ColourName;
  /** Narrow face (Myko) or wide (Dympna, Big Tom). */
  readonly width?: number;
}

function drawFace(b: PixelBuffer, f: Face): void {
  b.rect(0, 0, 32, 32, f.background);
  const w = f.width ?? 16;
  const x = 16 - Math.floor(w / 2);
  const top = f.alien === true ? 4 : 6;
  const h = f.alien === true ? 19 : 17;

  // Shoulders.
  b.rect(4, 26, 24, 6, f.top);
  b.rect(6, 25, 20, 1, f.top);
  b.vline(27, 27, 5, f.topShade).hline(4, 31, 24, f.topShade);
  if (f.collar !== undefined) b.rect(12, 25, 8, 2, f.collar);
  if (f.tie !== undefined) b.rect(15, 25, 2, 7, f.tie);
  if (f.lanyard !== undefined) b.line(11, 25, 15, 30, f.lanyard).line(20, 25, 16, 30, f.lanyard).rect(14, 30, 4, 2, 'white');
  // Neck.
  b.rect(13, 22, 6, 4, f.skinShade);

  // Head.
  if (f.alien === true) {
    b.ellipse(x - 2, top, w + 4, h - 4, f.skin);
    b.ellipse(x + 2, top + 8, w - 4, h - 8, f.skin);
    b.ellipse(x + w - 2, top + 3, 3, 8, f.skinShade);
  } else {
    b.ellipse(x, top, w, h, f.skin);
    b.rect(x + 1, top + 4, w - 2, h - 9, f.skin);
    b.vline(x + w - 2, top + 5, h - 9, f.skinShade);
    b.hline(x + 4, top + h - 1, w - 8, f.skinShade);
    // Ears.
    b.rect(x - 1, top + 7, 1, 3, f.skin).rect(x + w, top + 7, 1, 3, f.skinShade);
  }

  // Hair or hat.
  if (f.hat !== undefined) {
    b.ellipse(x - 1, top - 3, w + 2, 10, f.hat);
    b.rect(x - 1, top + 2, w + 2, 3, f.hat);
    if (f.hardhat === true) b.rect(x - 3, top + 4, w + 6, 2, f.hat);
  } else if (f.hair !== undefined) {
    const rows = f.hairRows ?? 4;
    b.ellipse(x - 1, top - 2, w + 2, 9, f.hair);
    b.rect(x, top + 2, w, rows - 2, f.hair);
    b.rect(x - 1, top + 3, 2, 5, f.hair).rect(x + w - 1, top + 3, 2, 5, f.hair);
    if (f.longHair === true) b.rect(x - 2, top + 4, 3, 16, f.hair).rect(x + w - 1, top + 4, 3, 16, f.hair);
  }

  // Eyes.
  const ey = top + (f.alien === true ? 8 : 8);
  if (f.alien === true) {
    b.ellipse(x, ey - 2, 6, 7, 'ink').ellipse(x + w - 6, ey - 2, 6, 7, 'ink');
    b.set(x + 1, ey - 1, 'fog').set(x + w - 5, ey - 1, 'fog');
  } else if (f.shades === true) {
    b.rect(x + 2, ey, 5, 3, 'ink').rect(x + w - 7, ey, 5, 3, 'ink').hline(x + 2, ey, w - 4, 'ink');
    b.set(x + 3, ey + 1, 'slate').set(x + w - 6, ey + 1, 'slate');
  } else {
    b.rect(x + 3, ey, 3, 2, 'white').rect(x + w - 6, ey, 3, 2, 'white');
    b.rect(x + 4, ey, 1, 2, 'ink').rect(x + w - 5, ey, 1, 2, 'ink');
    b.hline(x + 3, ey - 2, 3, f.hair ?? 'coal').hline(x + w - 6, ey - 2, 3, f.hair ?? 'coal');
    if (f.tired === true) {
      b.hline(x + 3, ey, 3, f.skinShade).hline(x + w - 6, ey, 3, f.skinShade);
      b.hline(x + 3, ey + 3, 3, f.skinShade).hline(x + w - 6, ey + 3, 3, f.skinShade);
    }
  }

  // Nose and mouth.
  if (f.alien !== true) b.vline(16, ey + 2, 3, f.skinShade).set(15, ey + 4, f.skinShade);
  const my = top + h - (f.alien === true ? 5 : 4);
  if (f.alien === true) {
    b.hline(15, my, 3, 'ink');
  } else if (f.halfSmile === true) {
    b.hline(13, my, 5, 'ink').set(18, my - 1, 'ink').set(19, my - 2, 'ink');
  } else if (f.frown === true) {
    b.hline(13, my, 6, 'ink').set(12, my + 1, 'ink').set(19, my + 1, 'ink');
  } else {
    b.hline(13, my, 6, 'ink');
  }
  if (f.stubble === true) {
    for (let j = my - 2; j < top + h - 1; j++) {
      for (let i = x + 2; i < x + w - 2; i++) if ((i + j) % 2 === 0 && b.get(i, j) === f.skin) b.set(i, j, f.skinShade);
    }
  }
  if (f.rollie === true) b.hline(19, my, 5, 'white').set(24, my, 'amber').set(25, my - 2, 'fog').set(26, my - 4, 'fog');

  // Frame.
  b.hline(0, 0, 32, 'ink').hline(0, 31, 32, 'ink').vline(0, 0, 32, 'ink').vline(31, 0, 32, 'ink');
}

const FACES: Readonly<Record<SpeakerId, Face>> = {
  andrew: { background: 'mossDark', skin: 'skin', skinShade: 'skinShade', top: 'anorak', topShade: 'mossDark', hair: 'turfDark', tired: true, stubble: true, collar: 'slate' },
  myko: { background: 'coal', skin: 'skinLight', skinShade: 'skin', top: 'mykoCoat', topShade: 'ink', hair: 'turf', hairRows: 5, halfSmile: true, rollie: true, width: 13 },
  dympna: { background: 'turfDark', skin: 'skinLight', skinShade: 'skin', top: 'brick', topShade: 'brickDark', hair: 'fog', hairRows: 5, frown: true, collar: 'bone', width: 17 },
  halloran: { background: 'slate', skin: 'skin', skinShade: 'skinShade', top: 'amberLight', topShade: 'amber', hair: 'fog', hairRows: 3, tie: 'moss', collar: 'white' },
  colleenAnn: { background: 'brickDark', skin: 'skinLight', skinShade: 'skin', top: 'grass', topShade: 'moss', hair: 'amber', longHair: true, halfSmile: true },
  pruitt: { background: 'navyDark', skin: 'skin', skinShade: 'skinShade', top: 'slate', topShade: 'coal', hair: 'fog', hairRows: 3, tired: true, tie: 'brickDark', collar: 'white', lanyard: 'amber' },
  gary: { background: 'magentaShade', skin: 'alienGrey', skinShade: 'steel', top: 'lime', topShade: 'limeShade', alien: true },
  administrator: { background: 'violetDark', skin: 'alienGrey', skinShade: 'steel', top: 'ink', topShade: 'coal', alien: true, tie: 'teal', collar: 'bone' },
  npc: { background: 'slate', skin: 'skin', skinShade: 'skinShade', top: 'steel', topShade: 'slate', hair: 'peat' },
  narrator: { background: 'ink', skin: 'ink', skinShade: 'ink', top: 'ink', topShade: 'ink' },
};

export function portraitSheet(): Sheet {
  const sheet = new SheetBuilder(TEX.portraits, 32, 32, 5);
  for (const [id, face] of Object.entries(FACES)) {
    sheet.cell(portrait(id as SpeakerId), (b) => {
      if (id === 'narrator') b.rect(0, 0, 32, 32, 'ink');
      else drawFace(b, face);
    });
  }
  return sheet.build();
}

/** For previews and tests. */
export function drawPortrait(id: SpeakerId): PixelBuffer {
  const b = new PixelBuffer(32, 32);
  drawFace(b, FACES[id]);
  return b;
}

/**
 * The bitmap font. docs/style-guide.md section 5: 5 x 7 glyphs in a 6 x 9
 * cell, generated in code, drawn in white so it can be tinted.
 *
 * Cell layout: row 0 is for accents on capitals, rows 1 to 7 hold the glyph,
 * row 8 is for descenders. Column 5 is spacing.
 */

import { FONT_CELL, FONT_KEY } from './keys';
import { SheetBuilder } from './pixels';
import type { PixelBuffer, Sheet } from './pixels';

/** Eight rows of five pixels (cell rows 1 to 8), written as groups separated by spaces. */
const G: Readonly<Record<string, string>> = {
  ' ': '..... ..... ..... ..... ..... ..... ..... .....',
  A: '.XXX. X...X X...X XXXXX X...X X...X X...X .....',
  B: 'XXXX. X...X X...X XXXX. X...X X...X XXXX. .....',
  C: '.XXX. X...X X.... X.... X.... X...X .XXX. .....',
  D: 'XXXX. X...X X...X X...X X...X X...X XXXX. .....',
  E: 'XXXXX X.... X.... XXXX. X.... X.... XXXXX .....',
  F: 'XXXXX X.... X.... XXXX. X.... X.... X.... .....',
  G: '.XXX. X...X X.... X.XXX X...X X...X .XXXX .....',
  H: 'X...X X...X X...X XXXXX X...X X...X X...X .....',
  I: '.XXX. ..X.. ..X.. ..X.. ..X.. ..X.. .XXX. .....',
  J: '..XXX ...X. ...X. ...X. ...X. X..X. .XX.. .....',
  K: 'X...X X..X. X.X.. XX... X.X.. X..X. X...X .....',
  L: 'X.... X.... X.... X.... X.... X.... XXXXX .....',
  M: 'X...X XX.XX X.X.X X.X.X X...X X...X X...X .....',
  N: 'X...X XX..X X.X.X X..XX X...X X...X X...X .....',
  O: '.XXX. X...X X...X X...X X...X X...X .XXX. .....',
  P: 'XXXX. X...X X...X XXXX. X.... X.... X.... .....',
  Q: '.XXX. X...X X...X X...X X.X.X X..X. .XX.X .....',
  R: 'XXXX. X...X X...X XXXX. X.X.. X..X. X...X .....',
  S: '.XXXX X.... X.... .XXX. ....X ....X XXXX. .....',
  T: 'XXXXX ..X.. ..X.. ..X.. ..X.. ..X.. ..X.. .....',
  U: 'X...X X...X X...X X...X X...X X...X .XXX. .....',
  V: 'X...X X...X X...X X...X X...X .X.X. ..X.. .....',
  W: 'X...X X...X X...X X.X.X X.X.X XX.XX X...X .....',
  X: 'X...X X...X .X.X. ..X.. .X.X. X...X X...X .....',
  Y: 'X...X X...X .X.X. ..X.. ..X.. ..X.. ..X.. .....',
  Z: 'XXXXX ....X ...X. ..X.. .X... X.... XXXXX .....',
  a: '..... ..... .XXX. ....X .XXXX X...X .XXXX .....',
  b: 'X.... X.... XXXX. X...X X...X X...X XXXX. .....',
  c: '..... ..... .XXX. X.... X.... X...X .XXX. .....',
  d: '....X ....X .XXXX X...X X...X X...X .XXXX .....',
  e: '..... ..... .XXX. X...X XXXXX X.... .XXX. .....',
  f: '..XX. .X... XXX.. .X... .X... .X... .X... .....',
  g: '..... ..... .XXXX X...X X...X .XXXX ....X .XXX.',
  h: 'X.... X.... XXXX. X...X X...X X...X X...X .....',
  i: '..X.. ..... .XX.. ..X.. ..X.. ..X.. .XXX. .....',
  j: '...X. ..... ..XX. ...X. ...X. ...X. X..X. .XX..',
  k: 'X.... X.... X..X. X.X.. XX... X.X.. X..X. .....',
  l: '.XX.. ..X.. ..X.. ..X.. ..X.. ..X.. .XXX. .....',
  m: '..... ..... XX.X. X.X.X X.X.X X.X.X X.X.X .....',
  n: '..... ..... XXXX. X...X X...X X...X X...X .....',
  o: '..... ..... .XXX. X...X X...X X...X .XXX. .....',
  p: '..... ..... XXXX. X...X X...X XXXX. X.... X....',
  q: '..... ..... .XXXX X...X X...X .XXXX ....X ....X',
  r: '..... ..... X.XX. XX..X X.... X.... X.... .....',
  s: '..... ..... .XXXX X.... .XXX. ....X XXXX. .....',
  t: '.X... .X... XXX.. .X... .X... .X..X ..XX. .....',
  u: '..... ..... X...X X...X X...X X...X .XXXX .....',
  v: '..... ..... X...X X...X X...X .X.X. ..X.. .....',
  w: '..... ..... X...X X...X X.X.X X.X.X .X.X. .....',
  x: '..... ..... X...X .X.X. ..X.. .X.X. X...X .....',
  y: '..... ..... X...X X...X X...X .XXXX ....X .XXX.',
  z: '..... ..... XXXXX ...X. ..X.. .X... XXXXX .....',
  '0': '.XXX. X...X X..XX X.X.X XX..X X...X .XXX. .....',
  '1': '..X.. .XX.. ..X.. ..X.. ..X.. ..X.. .XXX. .....',
  '2': '.XXX. X...X ....X ...X. ..X.. .X... XXXXX .....',
  '3': 'XXXX. ....X ....X .XXX. ....X ....X XXXX. .....',
  '4': '...X. ..XX. .X.X. X..X. XXXXX ...X. ...X. .....',
  '5': 'XXXXX X.... XXXX. ....X ....X X...X .XXX. .....',
  '6': '.XXX. X.... X.... XXXX. X...X X...X .XXX. .....',
  '7': 'XXXXX ....X ...X. ..X.. .X... .X... .X... .....',
  '8': '.XXX. X...X X...X .XXX. X...X X...X .XXX. .....',
  '9': '.XXX. X...X X...X .XXXX ....X ....X .XXX. .....',
  '.': '..... ..... ..... ..... ..... .XX.. .XX.. .....',
  ',': '..... ..... ..... ..... ..... .XX.. ..X.. .X...',
  "'": '..X.. ..X.. .X... ..... ..... ..... ..... .....',
  '"': '.X.X. .X.X. ..... ..... ..... ..... ..... .....',
  '!': '..X.. ..X.. ..X.. ..X.. ..X.. ..... ..X.. .....',
  '?': '.XXX. X...X ....X ...X. ..X.. ..... ..X.. .....',
  ':': '..... .XX.. .XX.. ..... .XX.. .XX.. ..... .....',
  ';': '..... .XX.. .XX.. ..... .XX.. ..X.. .X... .....',
  '-': '..... ..... ..... XXXXX ..... ..... ..... .....',
  '(': '...X. ..X.. .X... .X... .X... ..X.. ...X. .....',
  ')': '.X... ..X.. ...X. ...X. ...X. ..X.. .X... .....',
  '/': '....X ....X ...X. ..X.. .X... X.... X.... .....',
  '+': '..... ..X.. ..X.. XXXXX ..X.. ..X.. ..... .....',
  '×': '..... X...X .X.X. ..X.. .X.X. X...X ..... .....',
  '€': '..XXX .X... XXXX. .X... XXXX. .X... ..XXX .....',
  $: '..X.. .XXXX X.X.. .XXX. ..X.X XXXX. ..X.. .....',
  '%': 'XX..X XX..X ...X. ..X.. .X... X..XX X..XX .....',
  '&': '.XX.. X..X. X.X.. .X... X.X.X X..X. .XX.X .....',
  '*': '..... ..X.. X.X.X .XXX. X.X.X ..X.. ..... .....',
  '=': '..... ..... XXXXX ..... XXXXX ..... ..... .....',
  '#': '.X.X. .X.X. XXXXX .X.X. XXXXX .X.X. .X.X. .....',
  '<': '...X. ..X.. .X... X.... .X... ..X.. ...X. .....',
  '>': '.X... ..X.. ...X. ....X ...X. ..X.. .X... .....',
  '[': '.XXX. .X... .X... .X... .X... .X... .XXX. .....',
  ']': '.XXX. ...X. ...X. ...X. ...X. ...X. .XXX. .....',
  _: '..... ..... ..... ..... ..... ..... XXXXX .....',
  // Dotless i, used only to build í.
  ı: '..... ..... .XX.. ..X.. ..X.. ..X.. .XXX. .....',
};

/** Characters drawn as another glyph. */
const ALIAS: Readonly<Record<string, string>> = {
  '’': "'",
  '‘': "'",
  '“': '"',
  '”': '"',
  '−': '-',
  '–': '-',
};

/** Accented letters: base glyph plus an acute accent. */
const ACUTE: Readonly<Record<string, string>> = {
  á: 'a',
  é: 'e',
  í: 'ı',
  ó: 'o',
  ú: 'u',
  Á: 'A',
  É: 'E',
  Í: 'I',
  Ó: 'O',
  Ú: 'U',
};

function drawGlyph(b: PixelBuffer, rows: string): void {
  rows.split(' ').forEach((row, j) => {
    [...row].forEach((ch, i) => {
      if (ch === 'X') b.set(i, j + 1, 'white');
    });
  });
}

function drawChar(b: PixelBuffer, ch: string): void {
  const base = ACUTE[ch];
  if (base !== undefined) {
    drawGlyph(b, G[base] ?? '');
    if (base === base.toLowerCase()) {
      // Lower case: the accent sits in the two rows above the x-height.
      b.set(3, 1, 'white').set(2, 2, 'white');
    } else {
      // Capitals: the accent goes in the spare top row.
      b.set(3, 0, 'white');
    }
    return;
  }
  drawGlyph(b, G[ALIAS[ch] ?? ch] ?? '');
}

/** Every character the font can draw, in sheet order. */
export const FONT_CHARS: string = [
  ...Object.keys(G).filter((ch) => ch !== 'ı'),
  ...Object.keys(ALIAS),
  ...Object.keys(ACUTE),
].join('');

export const FONT_COLUMNS = 16;

export function canDraw(ch: string): boolean {
  return FONT_CHARS.includes(ch);
}

export function fontSheet(): Sheet {
  const sheet = new SheetBuilder(FONT_KEY, FONT_CELL.width, FONT_CELL.height, FONT_COLUMNS);
  for (const ch of FONT_CHARS) sheet.cell(ch, (b) => drawChar(b, ch));
  return sheet.build();
}

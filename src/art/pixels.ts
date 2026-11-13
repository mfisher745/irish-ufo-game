/**
 * Pixel buffers and sprite sheets, independent of Phaser and the DOM so the
 * generators can be unit-tested and previewed from Node. `index.ts` turns a
 * `Sheet` into a Phaser canvas texture.
 */

import { PALETTE } from './palette';
import type { ColourName } from './palette';

export type Pixel = ColourName | null;

export class PixelBuffer {
  readonly data: Pixel[];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Array<Pixel>(width * height).fill(null);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): Pixel {
    return this.inside(x, y) ? (this.data[y * this.width + x] ?? null) : null;
  }

  /** Out-of-bounds writes are ignored, so generators can draw past an edge safely. */
  set(x: number, y: number, colour: Pixel): this {
    if (this.inside(x, y)) this.data[y * this.width + x] = colour;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, colour: Pixel): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, colour);
    return this;
  }

  hline(x: number, y: number, w: number, colour: Pixel): this {
    return this.rect(x, y, w, 1, colour);
  }

  vline(x: number, y: number, h: number, colour: Pixel): this {
    return this.rect(x, y, 1, h, colour);
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, colour: Pixel): this {
    let x = x0;
    let y = y0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x, y, colour);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
    return this;
  }

  /** Filled ellipse inside the box x, y, w, h. */
  ellipse(x: number, y: number, w: number, h: number, colour: Pixel): this {
    const rx = w / 2;
    const ry = h / 2;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const nx = (i + 0.5 - rx) / rx;
        const ny = (j + 0.5 - ry) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x + i, y + j, colour);
      }
    }
    return this;
  }

  /**
   * Rows of text, one character per pixel, mapped through `key`.
   * '.' and ' ' are transparent and leave what is underneath alone.
   */
  stamp(x: number, y: number, rows: readonly string[], key: Readonly<Record<string, ColourName>>): this {
    rows.forEach((row, j) => {
      [...row].forEach((ch, i) => {
        if (ch === '.' || ch === ' ') return;
        const colour = key[ch];
        if (colour !== undefined) this.set(x + i, y + j, colour);
      });
    });
    return this;
  }

  /** Copies non-transparent pixels of `src` to dx, dy. */
  blit(src: PixelBuffer, dx: number, dy: number, flipX = false): this {
    for (let j = 0; j < src.height; j++) {
      for (let i = 0; i < src.width; i++) {
        const p = src.get(flipX ? src.width - 1 - i : i, j);
        if (p !== null) this.set(dx + i, dy + j, p);
      }
    }
    return this;
  }

  /** Replaces one colour with another everywhere. */
  swap(from: ColourName, to: Pixel): this {
    for (let i = 0; i < this.data.length; i++) if (this.data[i] === from) this.data[i] = to;
    return this;
  }

  /**
   * Adds a 1-pixel outline around everything drawn so far (4-neighbour).
   * docs/style-guide.md: characters and interactable objects are outlined in ink.
   */
  outline(colour: ColourName = 'ink'): this {
    const marks: number[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y) !== null) continue;
        if (
          this.get(x - 1, y) !== null ||
          this.get(x + 1, y) !== null ||
          this.get(x, y - 1) !== null ||
          this.get(x, y + 1) !== null
        ) {
          marks.push(y * this.width + x);
        }
      }
    }
    for (const i of marks) this.data[i] = colour;
    return this;
  }

  /** RGBA bytes, row-major. */
  toRgba(): Uint8ClampedArray {
    const out = new Uint8ClampedArray(this.width * this.height * 4);
    this.data.forEach((p, i) => {
      if (p === null) return;
      const rgb = PALETTE[p];
      out[i * 4] = (rgb >> 16) & 0xff;
      out[i * 4 + 1] = (rgb >> 8) & 0xff;
      out[i * 4 + 2] = rgb & 0xff;
      out[i * 4 + 3] = 0xff;
    });
    return out;
  }
}

export interface SheetFrame {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SheetAnim {
  readonly key: string;
  readonly frames: readonly string[];
  readonly frameRate: number;
  /** -1 loops forever, 0 plays once. */
  readonly repeat: number;
}

export interface Sheet {
  readonly key: string;
  readonly buffer: PixelBuffer;
  readonly frames: readonly SheetFrame[];
  readonly anims: readonly SheetAnim[];
}

/** Lays equal-sized cells out on a grid and records a named frame for each. */
export class SheetBuilder {
  private readonly cells: { name: string; buffer: PixelBuffer }[] = [];
  private readonly anims: SheetAnim[] = [];

  constructor(
    readonly key: string,
    readonly cellWidth: number,
    readonly cellHeight: number,
    readonly columns = 16,
  ) {}

  /** Draws one cell. The buffer passed to `draw` is cellWidth x cellHeight. */
  cell(name: string, draw: (b: PixelBuffer) => void): this {
    const buffer = new PixelBuffer(this.cellWidth, this.cellHeight);
    draw(buffer);
    this.cells.push({ name, buffer });
    return this;
  }

  anim(key: string, frames: readonly string[], frameRate = 8, repeat = -1): this {
    this.anims.push({ key, frames, frameRate, repeat });
    return this;
  }

  get count(): number {
    return this.cells.length;
  }

  build(): Sheet {
    const columns = Math.max(1, Math.min(this.columns, this.cells.length));
    const rows = Math.max(1, Math.ceil(this.cells.length / columns));
    const buffer = new PixelBuffer(columns * this.cellWidth, rows * this.cellHeight);
    const frames = this.cells.map((cell, i) => {
      const x = (i % columns) * this.cellWidth;
      const y = Math.floor(i / columns) * this.cellHeight;
      buffer.blit(cell.buffer, x, y);
      return { name: cell.name, x, y, width: this.cellWidth, height: this.cellHeight };
    });
    return { key: this.key, buffer, frames, anims: this.anims };
  }
}

/** Packs frames of different sizes into rows, for props and furniture. */
export class AtlasBuilder {
  private readonly items: { name: string; buffer: PixelBuffer }[] = [];

  constructor(
    readonly key: string,
    readonly maxWidth = 256,
  ) {}

  add(name: string, width: number, height: number, draw: (b: PixelBuffer) => void): this {
    const buffer = new PixelBuffer(width, height);
    draw(buffer);
    this.items.push({ name, buffer });
    return this;
  }

  build(): Sheet {
    const frames: SheetFrame[] = [];
    let x = 0;
    let y = 0;
    let rowHeight = 0;
    for (const item of this.items) {
      if (x + item.buffer.width > this.maxWidth) {
        x = 0;
        y += rowHeight;
        rowHeight = 0;
      }
      frames.push({ name: item.name, x, y, width: item.buffer.width, height: item.buffer.height });
      x += item.buffer.width;
      rowHeight = Math.max(rowHeight, item.buffer.height);
    }
    const buffer = new PixelBuffer(this.maxWidth, Math.max(1, y + rowHeight));
    this.items.forEach((item, i) => {
      const frame = frames[i];
      if (frame !== undefined) buffer.blit(item.buffer, frame.x, frame.y);
    });
    return { key: this.key, buffer, frames, anims: [] };
  }
}

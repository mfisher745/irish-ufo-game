/**
 * Phaser drawing helpers with graceful fallbacks. The art generators may not be
 * registered yet (dev harness, early builds): a missing icon, portrait or font
 * becomes a tinted rectangle or Phaser's default text instead of an error.
 * Once `registerArt` provides the real textures and `FONT_KEY`, the same calls
 * pick them up with no changes.
 */

import Phaser from 'phaser';
import { FONT_KEY, TEX, icon as iconFrames, portrait as portraitFrame } from '../art/keys';
import { PALETTE, css } from '../art/palette';
import type { ColourName } from '../art/palette';
import type { SpeakerId } from '../core/types';
import { CELL } from './layout';

export type Label = Phaser.GameObjects.BitmapText | Phaser.GameObjects.Text;

export interface LabelOptions {
  /** 'left' (default), 'centre' or 'right': which point of the label sits at x. */
  readonly anchor?: 'left' | 'centre' | 'right';
  readonly depth?: number;
}

export const fontReady = (scene: Phaser.Scene): boolean => scene.cache.bitmapFont.exists(FONT_KEY);

export function makeLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  colour: ColourName = 'white',
  opts: LabelOptions = {},
): Label {
  const originX = opts.anchor === 'centre' ? 0.5 : opts.anchor === 'right' ? 1 : 0;
  let label: Label;
  if (fontReady(scene)) {
    const bt = scene.add.bitmapText(x, y, FONT_KEY, str);
    bt.setTint(PALETTE[colour]);
    if (opts.anchor === 'centre') bt.setCenterAlign();
    else if (opts.anchor === 'right') bt.setRightAlign();
    label = bt;
  } else {
    // Dev fallback only. 10 px monospace is 6 px per character, like the real font.
    label = scene.add.text(x, y - 1, str, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: css(colour),
      align: opts.anchor === 'centre' ? 'center' : opts.anchor === 'right' ? 'right' : 'left',
    });
  }
  label.setOrigin(originX, 0);
  if (opts.depth !== undefined) label.setDepth(opts.depth);
  return label;
}

export function setLabelText(label: Label, str: string): void {
  if (label.text !== str) label.setText(str);
}

export function setLabelColour(label: Label, colour: ColourName): void {
  if (label instanceof Phaser.GameObjects.BitmapText) label.setTint(PALETTE[colour]);
  else label.setColor(css(colour));
}

/** Width in pixels of a string in the 6 px glyph cell. */
export const textWidth = (str: string): number => str.length * CELL.width;

export function rect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  colour: ColourName,
  depth?: number,
): Phaser.GameObjects.Rectangle {
  const r = scene.add.rectangle(x, y, w, h, PALETTE[colour]).setOrigin(0, 0);
  if (depth !== undefined) r.setDepth(depth);
  return r;
}

const textureHasFrame = (scene: Phaser.Scene, key: string, frame: string): boolean =>
  scene.textures.exists(key) && scene.textures.get(key).has(frame);

/** An icon or portrait that is a real frame when the art exists and a tinted rectangle when not. */
export class Pic {
  private image: Phaser.GameObjects.Image | null = null;
  private box: Phaser.GameObjects.Rectangle | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly textureKey: string,
    x: number,
    y: number,
    private readonly size: number,
    depth?: number,
  ) {
    if (scene.textures.exists(textureKey)) {
      this.image = scene.add.image(x, y, textureKey).setOrigin(0, 0);
      this.image.setVisible(false);
      if (depth !== undefined) this.image.setDepth(depth);
    }
    this.box = scene.add.rectangle(x, y, size, size, PALETTE.steel).setOrigin(0, 0);
    if (depth !== undefined) this.box.setDepth(depth);
  }

  /** Show `frame` if it exists, otherwise a `fallback` coloured square. */
  set(frame: string, fallback: ColourName): this {
    if (this.image !== null && textureHasFrame(this.scene, this.textureKey, frame)) {
      this.image.setFrame(frame).setVisible(true);
      this.box?.setVisible(false);
    } else {
      this.image?.setVisible(false);
      this.box?.setFillStyle(PALETTE[fallback]).setVisible(true).setSize(this.size, this.size);
    }
    return this;
  }

  setVisible(visible: boolean): this {
    if (!visible) {
      this.image?.setVisible(false);
      this.box?.setVisible(false);
    }
    return this;
  }

  /** Dim a locked or spent icon. */
  setDim(dim: boolean): this {
    if (dim) this.image?.setTint(PALETTE.steel);
    else this.image?.clearTint();
    if (dim) this.box?.setFillStyle(PALETTE.slate);
    return this;
  }

  setPosition(x: number, y: number): this {
    this.image?.setPosition(x, y);
    this.box?.setPosition(x, y);
    return this;
  }

  destroy(): void {
    this.image?.destroy();
    this.box?.destroy();
  }
}

export const makeIcon = (scene: Phaser.Scene, x: number, y: number, depth?: number): Pic =>
  new Pic(scene, TEX.icons, x, y, 12, depth);

export const makePortrait = (scene: Phaser.Scene, x: number, y: number, depth?: number): Pic =>
  new Pic(scene, TEX.portraits, x, y, 32, depth);

export { iconFrames, portraitFrame };

/** Placeholder portrait colour per speaker while the portraits are not generated. */
export const PORTRAIT_FALLBACK: Readonly<Record<SpeakerId, ColourName>> = {
  andrew: 'anorak',
  myko: 'mykoCoat',
  dympna: 'motelPink',
  halloran: 'navy',
  colleenAnn: 'corn',
  pruitt: 'slate',
  gary: 'tan',
  administrator: 'violet',
  npc: 'steel',
  narrator: 'ink',
};

/** Speaker name colours on the dark dialogue box (Myko's beanie is too dark there). */
export function speakerColour(speaker: SpeakerId): ColourName {
  if (speaker === 'andrew') return 'anorak';
  if (speaker === 'myko') return 'motelPinkShade';
  return 'fog';
}

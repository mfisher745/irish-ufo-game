/**
 * Entry point for generated art. Call `registerArt(scene)` once from the boot
 * scene; it creates every texture, the bitmap font and every animation named
 * in `keys.ts`. Everything is drawn in code at load time: there are no image
 * files (DESIGN.md section 8).
 */

import Phaser from 'phaser';
import { FONT_CHARS, FONT_COLUMNS } from './font';
import { FONT_CELL, FONT_KEY } from './keys';
import type { Sheet } from './pixels';
import { allSheets } from './sheets';

export * from './keys';
export { PALETTE, REGION_COLOURS, SHARED_COLOURS, css } from './palette';
export type { ColourName } from './palette';
export { PROP } from './props';
export { TILE, regionTiles, tileFlags, tileIndex } from './tiles';
export type { CommonTileName, TileDef } from './tiles';
export type { NpcId } from './cast';
export { allSheets } from './sheets';

function addSheet(scene: Phaser.Scene, sheet: Sheet): void {
  if (scene.textures.exists(sheet.key)) return;
  const { width, height } = sheet.buffer;
  const texture = scene.textures.createCanvas(sheet.key, width, height);
  if (texture === null) throw new Error(`Could not create texture ${sheet.key}`);
  const image = texture.context.createImageData(width, height);
  image.data.set(sheet.buffer.toRgba());
  texture.context.putImageData(image, 0, 0);
  sheet.frames.forEach((frame, index) => {
    texture.add(frame.name, 0, frame.x, frame.y, frame.width, frame.height);
    // Numeric frames too, so tilemaps can use the texture as a tileset image.
    texture.add(index, 0, frame.x, frame.y, frame.width, frame.height);
  });
  texture.refresh();
  for (const anim of sheet.anims) {
    if (scene.anims.exists(anim.key)) continue;
    scene.anims.create({
      key: anim.key,
      frames: anim.frames.map((frame) => ({ key: sheet.key, frame })),
      frameRate: anim.frameRate,
      repeat: anim.repeat,
    });
  }
}

function addFont(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.exists(FONT_KEY)) return;
  const data = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: FONT_KEY,
    width: FONT_CELL.width,
    height: FONT_CELL.height,
    chars: FONT_CHARS,
    charsPerRow: FONT_COLUMNS,
    'offset.x': 0,
    'offset.y': 0,
    'spacing.x': 0,
    'spacing.y': 0,
    lineSpacing: 1,
  });
  scene.cache.bitmapFont.add(FONT_KEY, data);
}

export function registerArt(scene: Phaser.Scene): void {
  for (const sheet of allSheets()) addSheet(scene, sheet);
  addFont(scene);
}

/**
 * Entry point for generated art. Call `registerArt(scene)` once from the boot
 * scene; it creates every texture, the bitmap font and every animation named
 * in `keys.ts`. Generators are added to GENERATORS as they are written.
 */

import type Phaser from 'phaser';

export * from './keys';
export { PALETTE, REGION_COLOURS, SHARED_COLOURS, css } from './palette';
export type { ColourName } from './palette';

/** A generator draws one or more textures (and their animations) into the scene's managers. */
export type ArtGenerator = (scene: Phaser.Scene) => void;

const GENERATORS: ArtGenerator[] = [];

let registered = false;

export function registerArt(scene: Phaser.Scene): void {
  if (registered) return;
  for (const generate of GENERATORS) generate(scene);
  registered = true;
}

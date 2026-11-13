/**
 * Texture, frame and animation keys for everything `src/art/` generates.
 * This file has no Phaser import, so systems, UI and tests can use the keys
 * without loading the generators. See docs/style-guide.md.
 *
 * Contract:
 * - `registerArt(scene)` in `src/art/index.ts` creates every texture and
 *   animation named here. Call it once, in the boot scene, before any other
 *   scene starts.
 * - Character textures have frames named `<anim>.<facing>.<index>` and
 *   animations registered as `<textureKey>.<anim>.<facing>`; use `animKey()`.
 * - Enemy and boss textures use the `spriteKey` from tuning
 *   (`enemy.<EnemyId>`, `boss.<BossId>`) as the texture key.
 * - Tilesets are 16 x 16 tiles on a 16-column grid, one texture per region.
 */

import type { AbilityId, DrinkId, Facing, FoodId, RegionId, SpeakerId } from '../core/types';

/** Bitmap font key for `scene.add.bitmapText`. Glyph cell is 6 x 9. */
export const FONT_KEY = 'font.main';
export const FONT_CELL = { width: 6, height: 9 } as const;

export const TEX = {
  andrew: 'char.andrew',
  myko: 'char.myko',
  /** Small HUD and world icons; frames listed in `icon`. */
  icons: 'ui.icons',
  /** 32 x 32 dialogue portraits; frames are `SpeakerId`s. */
  portraits: 'ui.portraits',
  /** Projectiles, pickups on the ground, puffs and markers; frames in `fx`. */
  fx: 'fx.main',
  /** 1 x 1 white pixel for tinted rectangles, bars and fades. */
  pixel: 'ui.pixel',
} as const;

export const tilesetKey = (region: RegionId): string => `tiles.${region}`;

/** Animations every walking character has. */
export type CommonAnim = 'idle' | 'walk';

/** Andrew's extra animations. docs/style-guide.md section 2. */
export type AndrewAnim =
  | CommonAnim
  | 'punch1'
  | 'punch2'
  | 'punch3'
  | 'hurley'
  | 'throw'
  | 'drink'
  | 'hurt'
  | 'stumble'
  | 'fall'
  | 'getUp'
  | 'actNatural';

/** Myko's extra animations. He has no run cycle. */
export type MykoAnim = CommonAnim | 'blink' | 'smoke' | 'swat';

/** Animations every enemy has. `telegraph` is held for the attack's telegraphMs. */
export type EnemyAnim = CommonAnim | 'telegraph' | 'attack' | 'hurt' | 'down';

export const animKey = (textureKey: string, anim: string, facing: Facing): string =>
  `${textureKey}.${anim}.${facing}`;

export const frameName = (anim: string, facing: Facing, index: number): string =>
  `${anim}.${facing}.${index}`;

/** Frame names in `TEX.icons`. All 12 x 12 unless noted. */
export const icon = {
  pintFull: 'pint.full',
  pintHalf: 'pint.half',
  pintEmpty: 'pint.empty',
  empty: 'empty',
  rollie: 'rollie',
  rollieSpent: 'rollie.spent',
  detection: 'detection',
  interact: 'interact',
  drink: (id: DrinkId): string => `drink.${id}`,
  food: (id: FoodId): string => `food.${id}`,
  ability: (id: AbilityId): string => `ability.${id}`,
} as const;

/** Frame names in `TEX.portraits`. Generic NPCs share `npc`. */
export const portrait = (speaker: SpeakerId): string => speaker;

/** Frame names in `TEX.fx`. */
export const fx = {
  bottle: 'bottle',
  bottleSmash: ['smash.0', 'smash.1', 'smash.2'],
  sliotar: 'sliotar',
  dart: 'dart',
  bolt: 'bolt',
  ray: 'ray',
  box: 'box',
  bale: 'bale',
  fire: ['fire.0', 'fire.1', 'fire.2'],
  stunRing: ['stun.0', 'stun.1'],
  smokePuff: ['puff.0', 'puff.1', 'puff.2'],
  shadow: 'shadow',
  groundMarker: 'marker',
  pickupGlint: ['glint.0', 'glint.1'],
} as const;

/** Texture key for a named or generic NPC (see `NpcId` in cast.ts). NPCs have `idle` and `walk`. */
export const npcKey = (id: string): string => `npc.${id}`;

/** Texture key for props and furniture; frames are named in props.ts. */
export const PROPS_KEY = 'props.main';

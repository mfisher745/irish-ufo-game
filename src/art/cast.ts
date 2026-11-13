/**
 * Roster enemies, humanoid bosses and named NPCs. Texture keys match the
 * `spriteKey`s in tuning (`enemy.<EnemyId>`, `boss.<BossId>`) and `npcKey()`.
 */

import type { BossId, EnemyId } from '../core/types';
import type { AnimSpec, Item, Look } from './humanoid';
import { IDLE, WALK, figureSheet } from './humanoid';
import { npcKey } from './keys';
import type { Sheet } from './pixels';

const BASE: Look = {
  cellWidth: 16,
  cellHeight: 24,
  headWidth: 8,
  headHeight: 7,
  torsoWidth: 6,
  torsoHeight: 7,
  armWidth: 1,
  legLength: 6,
  legWidth: 2,
  skin: 'skin',
  skinShade: 'skinShade',
  top: 'slate',
  topShade: 'coal',
  legs: 'coal',
  shoes: 'ink',
};

const TALL: Partial<Look> = { cellHeight: 28, torsoHeight: 8, legLength: 9 };
const BIG: Partial<Look> = { cellWidth: 24, cellHeight: 32, headWidth: 9, headHeight: 8, torsoWidth: 12, torsoHeight: 10, armWidth: 2, legLength: 9, legWidth: 3 };
const ALIEN: Partial<Look> = { cellHeight: 20, headWidth: 9, headHeight: 8, torsoWidth: 5, torsoHeight: 5, legLength: 3, skin: 'alienGrey', skinShade: 'steel', eyes: 'alien' };

const look = (...parts: Partial<Look>[]): Look => Object.assign({}, BASE, ...parts) as Look;

/** The animation set every enemy and boss has. docs/style-guide.md section 2. */
function fighter(weapon: Item = 'none'): Readonly<Record<string, AnimSpec>> {
  return {
    idle: IDLE,
    walk: WALK,
    // Frame 0 is the white flash; frame 1 is held for the rest of the telegraph.
    telegraph: { poses: [{ flash: true, arm: 'up', item: weapon }, { arm: 'up', item: weapon, lean: -1 }], frameRate: 10, repeat: 0 },
    attack: { poses: [{ arm: 'out', item: weapon, lean: 1 }, { arm: 'out', item: weapon, lean: 2, step: 1 }, { arm: 'guard', item: weapon }], frameRate: 12, repeat: 0 },
    hurt: { poses: [{ flash: true, lean: -1 }], frameRate: 8, repeat: 0 },
    down: { poses: [{ lean: -2, drop: 2, eyesClosed: true, arm: 'up', otherArm: 'up' }, { lying: true }], frameRate: 6, repeat: 0 },
  };
}

const ENEMY_LOOKS: Readonly<Record<Exclude<EnemyId, 'drone'>, { look: Look; weapon: Item }>> = {
  lad: { look: look({ hair: 'turfDark', top: 'navy', topShade: 'navyDark', band: 'white', legs: 'coal', shoes: 'white' }), weapon: 'none' },
  cousin: { look: look({ hat: 'cap', hatColour: 'peat', top: 'turf', topShade: 'turfDark', legs: 'denim', shoes: 'ink', stubble: true }), weapon: 'none' },
  suit: { look: look(TALL, { hair: 'coal', top: 'coal', topShade: 'ink', tie: 'navy', legs: 'coal', eyes: 'shades' }), weapon: 'baton' },
  worker: { look: look({ hat: 'hardhat', hatColour: 'amber', top: 'navy', topShade: 'navyDark', band: 'amberLight', legs: 'slate' }), weapon: 'box' },
  brawler: { look: look({ hat: 'cap', hatColour: 'navy', top: 'brick', topShade: 'brickDark', legs: 'denim', shoes: 'white', torsoWidth: 8 }), weapon: 'none' },
  docker: { look: look(TALL, { hat: 'beanie', hatColour: 'navyDark', top: 'steel', topShade: 'slate', torsoWidth: 8, armWidth: 2, legs: 'denim', stubble: true }), weapon: 'hook' },
  agent: { look: look(TALL, { hair: 'turfDark', top: 'navyDark', topShade: 'ink', tie: 'brick', lanyard: 'fog', legs: 'navyDark', eyes: 'shades' }), weapon: 'taser' },
  mascot: {
    look: look({ cellHeight: 28, headWidth: 12, headHeight: 11, torsoWidth: 8, torsoHeight: 8, armWidth: 2, legLength: 5, skin: 'lime', skinShade: 'limeShade', top: 'lime', topShade: 'limeShade', legs: 'limeShade', shoes: 'limeShade', eyes: 'alien' }),
    weapon: 'none',
  },
  clerk: { look: look(ALIEN, { top: 'bone', topShade: 'fog', tie: 'violet', legs: 'coal' }), weapon: 'pistol' },
  security: { look: look(ALIEN, { top: 'tealDark', topShade: 'ink', band: 'teal', legs: 'tealDark', torsoWidth: 6 }), weapon: 'shield' },
};

export function enemySheets(): Sheet[] {
  return Object.entries(ENEMY_LOOKS).map(([id, spec]) => figureSheet(`enemy.${id}`, spec.look, fighter(spec.weapon)));
}

const PRUITT: Look = look(TALL, { hair: 'fog', top: 'slate', topShade: 'coal', tie: 'brickDark', lanyard: 'amber', legs: 'coal', eyes: 'tired' });
const ADMINISTRATOR: Look = look(ALIEN, { cellHeight: 22, torsoHeight: 6, legLength: 4, top: 'violetDark', topShade: 'ink', tie: 'teal', legs: 'violetDark' });
const mascotBoss = (skin: Look['skin'], shade: Look['skinShade']): Look =>
  look({ cellWidth: 24, cellHeight: 36, headWidth: 14, headHeight: 13, torsoWidth: 10, torsoHeight: 11, armWidth: 2, legLength: 7, legWidth: 3, skin, skinShade: shade, top: skin, topShade: shade, legs: shade, shoes: shade, eyes: 'alien' });

/** Humanoid bosses. Vehicles and animals are in machines.ts. Variant keys add a suffix to the boss key. */
export function bossFigureSheets(): Sheet[] {
  const key = (id: BossId, suffix = ''): string => `boss.${id}${suffix}`;
  const bigTom = look(BIG, { hair: 'turf', top: 'turfDark', topShade: 'ink', legs: 'slate', shoes: 'ink', stubble: true });
  const foreman = look(BIG, { cellHeight: 30, torsoWidth: 10, hat: 'hardhat', hatColour: 'white', top: 'brickDark', topShade: 'ink', band: 'amberLight', legs: 'navyDark' });
  return [
    figureSheet(key('c1.boss.bigtom'), bigTom, fighter()),
    // Phase 2: the jacket is folded on the wall and he is in a vest.
    figureSheet(key('c1.boss.bigtom', '.jacketOff'), { ...bigTom, top: 'bone', topShade: 'fog' }, fighter()),
    figureSheet(key('c4.boss.foreman'), foreman, fighter('hook')),
    figureSheet(key('c5.boss.pruitt1'), PRUITT, fighter('taser')),
    figureSheet(key('c8.boss.pruitt2'), PRUITT, fighter('taser')),
    figureSheet(key('c7.boss.mascots', '.zip'), mascotBoss('lime', 'limeShade'), fighter()),
    figureSheet(key('c7.boss.mascots', '.zap'), mascotBoss('magenta', 'magentaShade'), fighter('pistol')),
    figureSheet(key('c7.boss.mascots', '.zorp'), mascotBoss('tan', 'tanShade'), fighter('shield')),
    figureSheet(key('c10.boss.administrator'), ADMINISTRATOR, fighter('pistol')),
    // Phase 3: jacket hung up properly, shirt sleeves.
    figureSheet(key('c10.boss.administrator', '.personally'), { ...ADMINISTRATOR, top: 'bone', topShade: 'fog' }, fighter()),
  ];
}

const stand: Readonly<Record<string, AnimSpec>> = { idle: IDLE, walk: WALK };

const NPC_LOOKS = {
  dympna: look({ hair: 'fog', top: 'brick', topShade: 'brickDark', apron: 'bone', legs: 'coal' }),
  halloran: look({ hair: 'fog', top: 'slate', topShade: 'coal', tie: 'moss', band: 'amberLight', legs: 'slate' }),
  colleenAnn: look({ hair: 'amber', top: 'grass', topShade: 'moss', legs: 'denim', shoes: 'white' }),
  pruitt: PRUITT,
  gary: look(ALIEN, { top: 'lime', topShade: 'limeShade', legs: 'tanShade' }),
  administrator: ADMINISTRATOR,
  // Generic townspeople and tourists; chapters pick whichever suits.
  localA: look({ hair: 'coal', top: 'moss', topShade: 'mossDark', legs: 'turf', hat: 'cap', hatColour: 'slate' }),
  localB: look({ hair: 'peat', top: 'peat', topShade: 'turf', legs: 'slate' }),
  americanA: look({ hat: 'cap', hatColour: 'brick', top: 'white', topShade: 'fog', legs: 'tanShade', shoes: 'white', torsoWidth: 8 }),
  americanB: look({ hair: 'amberLight', top: 'navy', topShade: 'navyDark', legs: 'bone', shoes: 'white' }),
  touristA: look({ hat: 'cap', hatColour: 'lime', top: 'magenta', topShade: 'magentaShade', legs: 'tan', shoes: 'white', torsoWidth: 8 }),
  touristB: look({ hair: 'turfDark', top: 'motelPink', topShade: 'motelPinkShade', legs: 'dustyBlue', shoes: 'white' }),
  attendant: look({ hat: 'cap', hatColour: 'rust', top: 'tan', topShade: 'tanShade', legs: 'denim', stubble: true }),
  alienClerk: look(ALIEN, { top: 'bone', topShade: 'fog', tie: 'violet', legs: 'coal' }),
} as const satisfies Record<string, Look>;

export type NpcId = keyof typeof NPC_LOOKS;

export function npcSheets(): Sheet[] {
  return Object.entries(NPC_LOOKS).map(([id, npcLook]) => figureSheet(npcKey(id), npcLook, stand));
}

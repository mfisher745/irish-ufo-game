/**
 * Set dressing for chapter 1: props and standing NPCs, by screen and tile.
 *
 * NOTHING DRAWS THIS YET. `ScreenLayout` has no slot for props or NPCs and
 * `WorldView` renders only tiles, the player, Myko, enemies, pickups and
 * push pieces. The data is here so systems-dev can wire it in once there is a
 * place for it (see the gap list in the chapter 1 report). Positions are
 * tile coordinates of the sprite's top-left tile for props and the feet tile
 * for NPCs.
 */

import { PROP } from '../../art/props';
import type { NpcId } from '../../art/cast';

export interface PropPlacement {
  readonly screen: string;
  readonly frame: string;
  readonly col: number;
  readonly row: number;
  /** Frame cycle for animated props (the bog lights). */
  readonly frames?: readonly string[];
}

export interface NpcPlacement {
  readonly screen: string;
  readonly npc: NpcId;
  readonly col: number;
  readonly row: number;
  readonly facing: 'up' | 'down' | 'left' | 'right';
  /** Examinable that talking to this NPC uses, if any. */
  readonly talkExaminable?: string;
}

export const PROPS: readonly PropPlacement[] = [
  // Feeney's
  { screen: 'c1.pub', frame: PROP.beerTaps, col: 8, row: 2 },
  { screen: 'c1.pub', frame: PROP.beerTaps, col: 14, row: 2 },
  { screen: 'c1.pub', frame: PROP.trophyShelf, col: 24, row: 0 },
  { screen: 'c1.pub', frame: PROP.telly, col: 27, row: 0 },
  { screen: 'c1.pub', frame: PROP.fruitMachine, col: 1, row: 6 },
  { screen: 'c1.pub', frame: PROP.dartboard, col: 1, row: 10 },
  { screen: 'c1.pub', frame: PROP.teamPhoto, col: 1, row: 4 },
  // Keg yard
  { screen: 'c1.yard', frame: PROP.bins, col: 2, row: 4 },
  // Main Street
  { screen: 'c1.street', frame: PROP.pubSign, col: 7, row: 1 },
  { screen: 'c1.street', frame: PROP.bookiesSign, col: 18, row: 1 },
  { screen: 'c1.street', frame: PROP.bins, col: 26, row: 3 },
  { screen: 'c1.street', frame: PROP.bins, col: 27, row: 3 },
  { screen: 'c1.street', frame: PROP.chipperSign, col: 33, row: 1 },
  { screen: 'c1.street', frame: PROP.churchGate, col: 41, row: 7 },
  { screen: 'c1.street', frame: PROP.tractor, col: 65, row: 7 },
  // The wall where Big Tom folds his jacket in phase 2
  { screen: 'c1.street', frame: PROP.foldedJacket, col: 56, row: 4 },
  // Bog road: three lights, animated
  { screen: 'c1.road', frame: PROP.bogLights[0], col: 12, row: 11, frames: PROP.bogLights },
];

export const NPCS: readonly NpcPlacement[] = [
  { screen: 'c1.pub', npc: 'dympna', col: 21, row: 2, facing: 'down', talkExaminable: 'c1.dympna' },
  // The queue at the chipper
  { screen: 'c1.street', npc: 'localA', col: 31, row: 6, facing: 'up' },
  { screen: 'c1.street', npc: 'localB', col: 32, row: 7, facing: 'up' },
  { screen: 'c1.street', npc: 'localA', col: 33, row: 6, facing: 'up' },
];

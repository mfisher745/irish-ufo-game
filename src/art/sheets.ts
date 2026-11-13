/**
 * The full list of generated sheets. No Phaser import, so tests and previews
 * can build every sheet from Node.
 */

import { REGIONS } from '../core/types';
import { bossFigureSheets, enemySheets, npcSheets } from './cast';
import { andrewSheet, mykoSheet } from './characters';
import { fontSheet } from './font';
import { fxSheet, iconSheet, pixelSheet } from './icons';
import { machineSheets } from './machines';
import type { Sheet } from './pixels';
import { portraitSheet } from './portraits';
import { propsSheet } from './props';
import { tilesetSheet } from './tiles';

/** Every sheet the game uses. Pure data; safe to call without Phaser (tests, previews). */
export function allSheets(): Sheet[] {
  return [
    pixelSheet(),
    fontSheet(),
    andrewSheet(),
    mykoSheet(),
    ...enemySheets(),
    ...bossFigureSheets(),
    ...npcSheets(),
    ...machineSheets(),
    iconSheet(),
    fxSheet(),
    portraitSheet(),
    propsSheet(),
    ...REGIONS.map((region) => tilesetSheet(region)),
  ];
}

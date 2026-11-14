/**
 * Text for the key caps on the HUD. Every label is a text ID in
 * `src/content/dialogue/` (the creative director owns that directory). Until the
 * IDs below exist, `keyText` returns the ID itself, so a missing label shows up
 * on screen as an obvious `ui.key.q` rather than a wrong letter.
 */

import { hasText, text } from '../content/dialogue';
import type { TextId } from '../core/types';

/** Text IDs the HUD needs. Wanted values: 1, 2, 3, Q, F, R, M, Space, and the two reasons. */
export const KEY_IDS = {
  drink: ['ui.key.1', 'ui.key.2', 'ui.key.3'],
  drinkSelected: 'ui.key.q',
  special: 'ui.key.f',
  cycleSpecial: 'ui.key.r',
  call: 'ui.key.m',
  dodge: 'ui.key.space',
  needBuzz: 'ui.hud.special.needBuzz',
  recharging: 'ui.hud.special.recharging',
} as const;

export const keyText = (id: TextId): string => (hasText(id) ? text(id) : id);

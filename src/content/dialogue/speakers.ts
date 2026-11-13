/**
 * Facts about speakers that presentation needs (which blip to play, which
 * colour to use). No player-visible text lives here.
 */

import type { DialogueLine } from '../../core/types';

/** Named speakers who are aliens. */
const ALIEN_SPEAKERS: ReadonlySet<string> = new Set(['gary', 'administrator']);

/** Display-name text IDs of generic NPCs who are aliens. */
const ALIEN_NPC_NAMES: ReadonlySet<string> = new Set([
  'name.clerk',
  'name.security',
  'name.zip',
  'name.zap',
  'name.zorp',
  'name.costumeB',
  'name.costumeD',
  'name.announcement',
]);

/** True when the line is spoken by an alien (higher, detuned dialogue blip). */
export function isAlienLine(line: DialogueLine): boolean {
  if (ALIEN_SPEAKERS.has(line.speaker)) return true;
  return line.speaker === 'npc' && line.speakerName !== undefined && ALIEN_NPC_NAMES.has(line.speakerName);
}

/**
 * Throwaway test data for the dev harness only (never imported by the game).
 * The harness build injects this into the dialogue lookup so scene, caption and
 * casebook screens have something to show before the chapter text exists.
 */

import { box, caption, scene } from '../../content/dialogue/build';

export const EXTRA_TEXT: Record<string, string> = {
  'dev.name.bostonian': 'Man at the bar',
};

export const EXTRA_SEQUENCES = [
  box('dev.box.short', ['andrew', 'Everything is very clear. I do not like it.']),
  box('dev.box.myko', ['myko', 'You are thinking. I can hear it from here.', 'quietly']),
  box('dev.box.long', ['andrew', 'This line is exactly as long as the style guide allows, which is sixty-four characters or so, then it wraps to a second line and perhaps a third one if we are unlucky.']),
  scene(
    'dev.scene.one',
    ['dympna', 'Is it the pint or the other thing? There is a difference, and I have a tea towel for both.', 'drying a glass'],
    ['andrew', 'The other thing.'],
    ['npc:dev.name.bostonian', 'Another one. Sit down, pal.'],
    ['administrator', 'A form for you to complete in triplicate.'],
  ),
  caption('dev.caption.one', 'Kilnamoe, County Leitrim. Before dawn.'),
];

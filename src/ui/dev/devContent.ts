/**
 * Throwaway test data for the dev harness only (never imported by the game).
 * The harness build injects this into the dialogue lookup so scene, caption and
 * casebook screens have something to show before the chapter text exists.
 */

import { box, caption, scene } from '../../content/dialogue/build';

export const EXTRA_TEXT: Record<string, string> = {
  'dev.name.bostonian': 'Man at the bar',
  'c2.clue.fragment.title': 'The fragment',
  'c2.clue.fragment.body': 'Metal, light as a crisp packet, and it will not burn. I tried it on the range. The range lost.',
  'c2.clue.fragment.margin': 'It is a baking tray, Andrew.',
  'c2.clue.tracks.title': 'Tracks in the bog',
  'c2.clue.tracks.body': 'Three round marks in a row. Not sheep, not a tractor. Measured with my own foot.',
  'c2.clue.tracks.margin': 'Which foot.',
  'c2.clue.ledger.title': 'Department ledger',
  'c2.clue.ledger.body': 'Payments to a Department that does not exist. Every month, on the first.',
  'c2.clue.ledger.margin': 'You nearly had it.',
  'c2.clue.sheep.title': 'Sheep, nervous',
  'c2.clue.sheep.body': 'The sheep would not go near the shed. Sheep know.',
  'c2.clue.sheep.margin': 'Sheep know nothing.',
  'c2.clue.poitin.title': 'Unlabelled bottle',
  'c2.clue.poitin.body': 'Found in the shed. Evidence, not refreshment.',
  'c2.clue.poitin.margin': 'You opened it.',
  'c2.deduction.office.lead': 'The Department has an office in Dublin. I am going to Dublin.',
  'c2.deduction.office.lead.margin': 'We are going to Dublin.',
  'c3.call.fight.casebook': 'Myko helped a bit.',
  'c3.call.fight.casebook.margin': 'I did the lot.',
  'dev.deduction.lead': 'Regional office, Dublin',
  'dev.deduction.leadMargin': 'You nearly had it.',
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

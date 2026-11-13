/**
 * The blackout when Myko is called in. DESIGN.md section 7.5: the screen cuts
 * to black and two or three narrator cards say, flatly, how little time it
 * took and how little trouble it was. The player never sees how.
 *
 * IDs: `c<N>.call.fight.blackout` and `c<N>.call.puzzle.blackout`. The scene
 * that follows (`c<N>.call.fight`, `c<N>.call.puzzle`) is in the chapter file.
 *
 * Rules for these cards: no exclamation marks, no description of the method,
 * times and small domestic details only. Understate.
 */

import type { DialogueSequence } from '../../core/types';
import type { DialogueFile } from './index';
import { seq } from './build';

const blackout = (id: string, ...cards: string[]): DialogueSequence =>
  seq(
    id,
    'caption',
    cards.map((card) => ['narrator', card] as const),
  );

export const CALLINS: DialogueFile = {
  text: {},
  sequences: [
    blackout('c1.call.fight.blackout', 'Four seconds pass.', 'Myko does not take his hands out of his pockets.', 'Somebody apologises. It is not Myko.'),
    blackout('c1.call.puzzle.blackout', 'Myko looks at the kegs.', 'The kegs reconsider.'),

    blackout('c2.call.fight.blackout', 'Three seconds.', 'A gate creaks. A cousin sits down in a trough.', 'Myko relights his rollie.'),
    blackout('c2.call.puzzle.blackout', 'Myko says one word to the sheep.', 'It is not a word Andrew knows.', 'The sheep know it.'),

    blackout('c3.call.fight.blackout', 'Five seconds, most of it walking.', 'A clipboard is involved.', 'The night shift goes on its break early.'),
    blackout('c3.call.puzzle.blackout', 'One push.', 'It was the crate Andrew had been leaning on.'),

    blackout('c4.call.fight.blackout', 'Six seconds.', 'Myko does not put down his drink.', 'Colleen-Ann loses count of the glasses, then of the men.'),
    blackout('c4.call.puzzle.blackout', 'One lever.', 'Three containers settle into a staircase with a sound like a polite cough.'),

    blackout('c5.call.fight.blackout', 'Nine agents. Four seconds.', 'A lanyard is used for something lanyards are not for.', 'Nobody spills the yoghurt.'),
    blackout('c5.call.puzzle.blackout', 'Myko picks three sheets without turning them over.', 'He was reading the backs on the way in.'),

    blackout('c6.call.fight.blackout', 'Three seconds.', 'An ice bucket leaves Myko’s hand and comes back to it.', 'He says sorry to each drone in turn.'),
    blackout('c6.call.puzzle.blackout', 'Myko walks the formation once.', 'He does not look at the postcard. He has been looking at it for two days.'),

    blackout('c7.call.fight.blackout', 'Four seconds.', 'A snow globe is returned to its shelf, shaken.', 'It is the only thing in the yard still upright.'),
    blackout('c7.call.puzzle.blackout', 'Myko asks which of them are aliens.', 'Three hands go up.'),

    blackout('c8.call.fight.blackout', 'Five seconds, uphill.', 'Myko does not take off the coat.', 'The truck’s headlights go out, one, then the other.'),
    blackout('c8.call.puzzle.blackout', 'One switch.', 'It was the one Andrew was standing beside.'),

    blackout('c9.call.fight.blackout', 'Three seconds.', 'A shield is borrowed and handed back.', 'Somebody files a report about it before he reaches the ground.'),
    blackout('c9.call.puzzle.blackout', 'Myko presses one button and leans.', 'Everything else in the room falls the way he meant.'),

    blackout('c10.call.fight.blackout', 'Myko takes a ticket. Number 849.', 'He is seen at once.', 'It takes four seconds.'),
    blackout('c10.call.puzzle.blackout', 'Five plugs. Five sockets. No looking.', 'He leaves the button.'),
  ],
};

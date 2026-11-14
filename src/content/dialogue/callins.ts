/**
 * The blackout when Myko is called in. DESIGN.md section 7.5: the screen cuts
 * to black and three narrator cards say, flatly, how little time it took and
 * how little trouble it was. The player never sees how.
 *
 * There are three calls in the game and each has its own cutscene, so no two
 * calls ever show the same cards. IDs: `myko.call.<kind>.blackout.<n>`, where
 * kind is `fight` or `puzzle` and n is 1, 2 or 3: the first, second or third
 * call of the save, whatever the chapter. The scene that follows is the
 * chapter's own (`c<N>.call.fight`, `c<N>.call.puzzle`) or one of the shared
 * ones in common.ts.
 *
 * Rules for these cards: no exclamation marks, no description of the method,
 * times and small domestic details only. Understate. The second fight call
 * is the Batman one.
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
    // First call of the game.
    blackout('myko.call.fight.blackout.1', 'What happens next takes four seconds.', 'Myko keeps one hand in his pocket throughout. The other has the rollie.', 'Somebody says sorry. It is not Myko.'),
    blackout('myko.call.puzzle.blackout.1', 'Myko looks at it.', 'This takes as long as it takes to look at something.', 'Then it is done, and he is looking at Andrew instead.'),

    // Second call.
    blackout(
      'myko.call.fight.blackout.2',
      'Batman trained for twelve years, on several continents.',
      'Myko did most of a welding course in Carrick.',
      'It takes Myko three seconds. Batman would still be up on the roof, waiting for the right moment.',
    ),
    blackout('myko.call.puzzle.blackout.2', 'Myko reads the instructions.', 'There are no instructions. He reads them anyway.', 'It is done before he gets to the end.'),

    // Third and last call.
    blackout('myko.call.fight.blackout.3', 'Two seconds.', 'He is getting quicker. Nobody knows what he practises on.', 'The rollie does not go out. It would not dare.'),
    blackout('myko.call.puzzle.blackout.3', 'One move.', 'It was the first thing Andrew tried, done properly.', 'Myko says nothing. It is worse than if he had said something.'),
  ],
};

/**
 * Andrew, Myko and the named cast. docs/style-guide.md section 2 and
 * DESIGN.md section 3: Andrew is short and slight (16 x 28); Myko is half a
 * head taller and thin (16 x 32).
 */

import { TEX } from './keys';
import type { AnimSpec, Look } from './humanoid';
import { IDLE, WALK, figureSheet } from './humanoid';
import type { Sheet } from './pixels';

const once = (poses: AnimSpec['poses'], frameRate = 8): AnimSpec => ({ poses, frameRate, repeat: 0 });

export const ANDREW: Look = {
  cellWidth: 16,
  cellHeight: 28,
  headWidth: 8,
  headHeight: 7,
  torsoWidth: 6,
  torsoHeight: 8,
  armWidth: 1,
  legLength: 9,
  legWidth: 2,
  skin: 'skin',
  skinShade: 'skinShade',
  hair: 'turfDark',
  top: 'anorak',
  topShade: 'mossDark',
  legs: 'denim',
  shoes: 'bone',
  eyes: 'tired',
  stubble: true,
};

export const MYKO: Look = {
  cellWidth: 16,
  cellHeight: 32,
  headWidth: 7,
  headHeight: 7,
  torsoWidth: 4,
  torsoHeight: 9,
  armWidth: 1,
  legLength: 12,
  legWidth: 2,
  skin: 'skinLight',
  skinShade: 'skin',
  hair: 'turf',
  top: 'mykoCoat',
  topShade: 'ink',
  coatLength: 6,
  legs: 'coal',
  shoes: 'ink',
  eyes: 'dot',
  halfSmile: true,
  rollie: true,
};

export function andrewSheet(): Sheet {
  return figureSheet(TEX.andrew, ANDREW, {
    idle: IDLE,
    walk: WALK,
    punch1: once([{ arm: 'guard', otherArm: 'guard' }, { arm: 'out', otherArm: 'guard', lean: 1 }, { arm: 'guard', otherArm: 'guard' }], 14),
    punch2: once([{ arm: 'guard', otherArm: 'guard' }, { arm: 'guard', otherArm: 'out', lean: 1 }, { arm: 'guard', otherArm: 'guard' }], 14),
    punch3: once([{ arm: 'up', otherArm: 'guard', lean: -1 }, { arm: 'out', otherArm: 'down', lean: 2, step: 1 }, { arm: 'out', otherArm: 'down', lean: 1 }], 10),
    hurley: once(
      [
        { arm: 'up', item: 'hurley', lean: -1 },
        { arm: 'guard', item: 'hurley' },
        { arm: 'out', item: 'hurley', lean: 1, step: 1 },
        { arm: 'down', item: 'hurley' },
      ],
      14,
    ),
    throw: once([{ arm: 'up', item: 'bottle', lean: -1 }, { arm: 'out', lean: 1 }, { arm: 'down' }], 12),
    drink: once([{ arm: 'guard', item: 'bottle' }, { arm: 'up', item: 'bottle' }, { arm: 'up', item: 'bottle', headUp: 1 }, { arm: 'down' }], 6),
    hurt: once([{ flash: true, lean: -1 }, { lean: -1, eyesClosed: true }], 8),
    stumble: once(
      [
        { lean: 1, step: 1 },
        { lean: 2, drop: 1, arm: 'out', step: 1 },
        { lean: 3, drop: 2, arm: 'out', otherArm: 'up', step: 3 },
        { lean: 2, drop: 1, arm: 'out', step: 3 },
        { lean: 1 },
      ],
      14,
    ),
    fall: once([{ lean: -1, arm: 'up', otherArm: 'up' }, { lean: -2, drop: 2, arm: 'up', otherArm: 'up', eyesClosed: true }, { lying: true }, { lying: true }], 8),
    getUp: once([{ lying: true }, { drop: 3, eyesClosed: true }, { drop: 1 }], 6),
    actNatural: { poses: [{ arm: 'pocket', otherArm: 'pocket', glance: 1 }, { arm: 'pocket', otherArm: 'pocket', glance: -1 }], frameRate: 1 },
  });
}

export function mykoSheet(): Sheet {
  return figureSheet(TEX.myko, MYKO, {
    idle: { poses: [{ arm: 'pocket', otherArm: 'pocket' }], frameRate: 1 },
    walk: { poses: [{ step: 0, arm: 'pocket', otherArm: 'pocket' }, { step: 1, arm: 'pocket', otherArm: 'pocket' }, { step: 2, arm: 'pocket', otherArm: 'pocket' }, { step: 3, arm: 'pocket', otherArm: 'pocket' }], frameRate: 6 },
    blink: once([{ arm: 'pocket', otherArm: 'pocket', eyesClosed: true }], 3),
    smoke: once([{ arm: 'guard', otherArm: 'pocket' }, { arm: 'up', otherArm: 'pocket', eyesClosed: true }, { arm: 'guard', otherArm: 'pocket' }], 4),
    swat: once([{ arm: 'guard', otherArm: 'pocket' }, { arm: 'out', otherArm: 'pocket' }, { arm: 'down', otherArm: 'pocket' }], 12),
  });
}

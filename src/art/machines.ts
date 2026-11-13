/**
 * Things that are not people: the drone, the ram, the forklift, the combine,
 * the patrol truck and the lockdown door. They use the same animation names
 * as enemies (idle, walk, telegraph, attack, hurt, down) so the systems can
 * treat them alike.
 */

import type { Facing } from '../core/types';
import { FACINGS } from './humanoid';
import { animKey, frameName } from './keys';
import { PixelBuffer, SheetBuilder } from './pixels';
import type { Sheet } from './pixels';

type Draw = (b: PixelBuffer, facing: Facing, frame: number) => void;

interface ObjectAnim {
  readonly frames: number;
  readonly frameRate?: number;
  readonly repeat?: number;
  /** Draw the frame in white (flash). */
  readonly flashOn?: number;
}

const ANIMS: Readonly<Record<string, ObjectAnim>> = {
  idle: { frames: 2, frameRate: 4 },
  walk: { frames: 4, frameRate: 10 },
  telegraph: { frames: 2, frameRate: 10, repeat: 0, flashOn: 0 },
  attack: { frames: 2, frameRate: 10, repeat: 0 },
  hurt: { frames: 1, frameRate: 8, repeat: 0, flashOn: 0 },
  down: { frames: 2, frameRate: 6, repeat: 0 },
};

function objectSheet(key: string, width: number, height: number, draw: (anim: string) => Draw): Sheet {
  const sheet = new SheetBuilder(key, width, height, 8);
  for (const [anim, spec] of Object.entries(ANIMS)) {
    for (const facing of FACINGS) {
      const names: string[] = [];
      for (let i = 0; i < spec.frames; i++) {
        const name = frameName(anim, facing, i);
        names.push(name);
        sheet.cell(name, (b) => {
          const layer = new PixelBuffer(width, height);
          // Left is the mirror of right.
          if (facing === 'left') {
            const right = new PixelBuffer(width, height);
            draw(anim)(right, 'right', i);
            layer.blit(right, 0, 0, true);
          } else {
            draw(anim)(layer, facing, i);
          }
          if (spec.flashOn === i) for (let p = 0; p < layer.data.length; p++) if (layer.data[p] !== null) layer.data[p] = 'white';
          layer.outline('ink');
          b.blit(layer, 0, 0);
        });
      }
      sheet.anim(animKey(key, anim, facing), names, spec.frameRate ?? 8, spec.repeat ?? -1);
    }
  }
  return sheet.build();
}

/** Surveillance drone, 16 x 16. Four rotors that flicker, one red eye. */
function drone(): Sheet {
  return objectSheet('enemy.drone', 16, 16, (anim) => (b, _facing, frame) => {
    if (anim === 'down') {
      b.rect(4, 11, 8, 3, 'slate').hline(4, 13, 8, 'coal');
      if (frame === 0) b.set(8, 9, 'amber').set(6, 8, 'fog');
      return;
    }
    const spin = frame % 2 === 0;
    for (const [x, y] of [[2, 3], [10, 3], [2, 10], [10, 10]] as const) {
      if (spin) b.hline(x, y, 4, 'fog');
      else b.hline(x + 1, y, 2, 'bone');
    }
    b.rect(5, 5, 6, 6, 'slate');
    b.vline(10, 6, 5, 'coal').hline(5, 10, 6, 'coal');
    b.rect(7, 7, 2, 2, anim === 'telegraph' || anim === 'attack' ? 'amberLight' : 'alarm');
  });
}

/** The Brennan ram, 24 x 16. It only ever runs sideways; up and down reuse the side view. */
function ram(): Sheet {
  return objectSheet('boss.c2.setpiece.ram', 24, 16, (anim) => (b, _facing, frame) => {
    const lowered = anim === 'telegraph' || anim === 'attack' ? 2 : 0;
    b.ellipse(3, 3, 14, 8, 'bone');
    b.hline(5, 10, 10, 'fog');
    b.rect(15, 3 + lowered, 6, 5, 'coal');
    b.set(19, 5 + lowered, 'amberLight');
    b.rect(14, 2 + lowered, 3, 2, 'tan').set(13, 3 + lowered, 'tanShade').set(14, 4 + lowered, 'tanShade');
    const stride = anim === 'walk' || anim === 'attack' ? frame % 4 : 0;
    const legs = [5, 8, 12, 15];
    legs.forEach((x, i) => {
      const lifted = stride !== 0 && (i + stride) % 2 === 0;
      b.vline(x, 11, lifted ? 2 : 3, 'coal');
    });
    if (anim === 'down') b.set(21, 3, 'white');
  });
}

/** Mr Halloran on the forklift, 32 x 32. */
function forklift(): Sheet {
  return objectSheet('boss.c3.boss.halloran', 32, 32, (anim) => (b, facing, frame) => {
    const bounce = anim === 'walk' && frame % 2 === 1 ? 1 : 0;
    if (facing === 'right') {
      b.rect(4, 14 + bounce, 16, 10, 'amber');
      b.hline(4, 23 + bounce, 16, 'peat').vline(19, 15 + bounce, 9, 'peat');
      b.rect(6, 6 + bounce, 2, 9, 'coal').rect(16, 6 + bounce, 2, 9, 'coal').rect(6, 5 + bounce, 12, 2, 'coal');
      // Halloran, seated.
      b.rect(10, 9 + bounce, 5, 5, 'slate').hline(10, 11 + bounce, 5, 'amberLight').rect(10, 5 + bounce, 5, 4, 'skin').hline(10, 5 + bounce, 5, 'fog');
      b.rect(21, 4, 2, 21, 'steel');
      const forkY = anim === 'telegraph' ? 18 : 23;
      b.rect(23, forkY, 8, 1, 'fog').rect(23, forkY - 3, 1, 3, 'fog');
      b.ellipse(5, 23, 6, 6, 'ink').ellipse(15, 23, 6, 6, 'ink').set(7, 25, 'steel').set(17, 25, 'steel');
    } else {
      const up = facing === 'up';
      b.rect(8, 10 + bounce, 16, 14, 'amber');
      b.vline(23, 11 + bounce, 13, 'peat').hline(8, 23 + bounce, 16, 'peat');
      b.rect(9, 4 + bounce, 2, 7, 'coal').rect(21, 4 + bounce, 2, 7, 'coal').rect(9, 3 + bounce, 14, 2, 'coal');
      b.rect(13, 8 + bounce, 6, 5, 'slate').rect(13, 4 + bounce, 6, 4, up ? 'fog' : 'skin');
      if (!up) b.hline(13, 4 + bounce, 6, 'fog').hline(13, 10 + bounce, 6, 'amberLight');
      b.rect(7, 22, 3, 6, 'ink').rect(22, 22, 3, 6, 'ink');
      if (up) {
        b.rect(11, 1, 2, 9, 'steel').rect(19, 1, 2, 9, 'steel');
      } else {
        b.rect(11, 24, 2, 7, 'fog').rect(19, 24, 2, 7, 'fog').rect(10, 12, 12, 2, 'steel');
      }
    }
    if (anim === 'down') b.set(14, 2, 'fog').set(16, 1, 'fog').set(18, 2, 'bone');
  });
}

/** The combine harvester, 48 x 32. Three sensor lights on the cab. */
function combine(): Sheet {
  return objectSheet('boss.c6.setpiece.combine', 48, 32, (anim) => (b, facing, frame) => {
    const side = facing === 'right';
    if (side) {
      b.rect(6, 10, 26, 14, 'moss').hline(6, 23, 26, 'mossDark').vline(31, 11, 13, 'mossDark');
      b.rect(18, 3, 12, 8, 'mossDark').rect(20, 5, 8, 4, 'skyPale');
      for (let i = 0; i < 3; i++) b.rect(19 + i * 4, 1, 2, 2, anim === 'down' ? 'coal' : 'alarm');
      b.rect(32, 16, 4, 6, 'steel');
      b.rect(36, 12, 10, 14, 'corn');
      for (let i = 0; i < 4; i++) b.vline(37 + ((i * 3 + frame) % 9), 12, 14, 'cornShade');
      b.ellipse(8, 20, 10, 10, 'ink').ellipse(22, 22, 8, 8, 'ink').set(12, 24, 'steel').set(25, 25, 'steel');
      b.rect(2, 6, 4, 8, 'mossDark');
    } else {
      const up = facing === 'up';
      b.rect(10, 6, 28, 16, 'moss').vline(37, 7, 15, 'mossDark').hline(10, 21, 28, 'mossDark');
      b.rect(16, 2, 16, 8, 'mossDark');
      if (!up) b.rect(18, 4, 12, 4, 'skyPale');
      for (let i = 0; i < 3; i++) b.rect(18 + i * 5, 0, 2, 2, anim === 'down' ? 'coal' : 'alarm');
      b.rect(6, 16, 4, 10, 'ink').rect(38, 16, 4, 10, 'ink');
      if (!up) {
        b.rect(1, 23, 46, 7, 'corn');
        for (let i = 0; i < 10; i++) b.vline(2 + i * 5 + (frame % 4), 23, 7, 'cornShade');
      }
    }
  });
}

/** Patrol truck, 48 x 24. Chapter 8 hazard and Pruitt's backup. Not an enemy, but shares the animation names. */
function truck(): Sheet {
  return objectSheet('hazard.patrolTruck', 48, 24, () => (b, facing, frame) => {
    const side = facing === 'right';
    if (side) {
      b.rect(4, 6, 30, 12, 'sand').hline(4, 17, 30, 'tanShade');
      b.rect(34, 9, 10, 9, 'sand').rect(35, 10, 6, 4, 'skyPale').hline(34, 17, 10, 'tanShade');
      b.rect(44, 13, 2, 2, 'amberLight');
      b.ellipse(8, 15, 8, 8, 'ink').ellipse(32, 15, 8, 8, 'ink');
      b.set(11 + (frame % 2), 18, 'steel').set(35 + (frame % 2), 18, 'steel');
    } else {
      b.rect(14, 2, 20, 20, 'sand').vline(33, 3, 19, 'tanShade');
      b.rect(16, facing === 'up' ? 16 : 4, 16, 4, facing === 'up' ? 'tanShade' : 'skyPale');
      b.rect(12, 4, 2, 6, 'ink').rect(34, 4, 2, 6, 'ink').rect(12, 14, 2, 6, 'ink').rect(34, 14, 2, 6, 'ink');
      if (facing === 'down') b.rect(15, 21, 3, 1, 'amberLight').rect(30, 21, 3, 1, 'amberLight');
    }
  });
}

/** Blast door for the chapter 9 lockdown, 16 x 48. `walk` is closing; `down` is shut. */
function blastDoor(): Sheet {
  return objectSheet('boss.c9.setpiece.lockdown', 16, 48, (anim) => (b, _facing, frame) => {
    const closed = anim === 'down' ? 48 : anim === 'walk' ? 12 + frame * 10 : anim === 'attack' ? 44 : 8;
    b.rect(2, 0, 12, closed, 'tealDark');
    b.vline(13, 0, closed, 'ink').vline(2, 0, closed, 'teal');
    for (let y = 4; y < closed - 2; y += 8) b.hline(4, y, 8, 'violetDark');
    b.hline(2, Math.max(0, closed - 2), 12, anim === 'telegraph' ? 'alarm' : 'amber');
  });
}

export function machineSheets(): Sheet[] {
  return [drone(), ram(), forklift(), combine(), truck(), blastDoor()];
}

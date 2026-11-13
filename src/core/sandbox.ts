/**
 * Dev sandbox (`?sandbox=1`): one 30 x 17 walled room where every system can
 * be exercised with placeholder shapes. Not part of the game; it uses an
 * in-memory save and borrows real section IDs so their tuning applies
 * (`c1.fight.chipper` waves, `c1.puzzle.kegs`, `c2.stealth.bog` and its alarm).
 *
 * Layout (tiles): pickups top left, a suit patrolling the top right with a
 * noticeboard to hide by, the keg puzzle bottom left, the lads' fight bottom
 * right, an examinable clue and a checkpoint in the middle.
 *
 * Dressing and ambience demo (west half): a solid tractor to walk behind and
 * in front of, the animated bog lights, a keg prop that a punch swaps to a
 * crate and whose haymaker toggles the night, Dympna to talk to, and a night
 * tint with one light at the tractor.
 */

import type { ChapterModule, ScreenAmbient } from './chapter';
import type { AbilityId, ChapterNumber, CheckpointId, ScreenId, StealthSectionDef, Vec2 } from './types';
import { gridFromAscii, tileCentre } from '../systems/grid';

const T = (col: number, row: number): Vec2 => tileCentre({ col, row });

const ROWS = [
  '##############################',
  '#............................#',
  '#............#...............#',
  '#............#.......oo......#',
  '#............#...............#',
  '#............#...............#',
  '#..................#.........#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#############.....############',
  '#.........#..................#',
  '#.........#..................#',
  '#.........#..................#',
  '#............................#',
  '#.........#..................#',
  '##############################',
];

const NIGHT: ScreenAmbient = {
  tint: 'navyDark',
  strength: 0.7,
  lights: [{ x: 4 * 16 + 24, y: 6 * 16 + 4, radius: 56, colour: 'amberLight' }],
};

const ALL_ABILITIES: readonly AbilityId[] = [
  'punchCombo',
  'bottleThrow',
  'stumble',
  'stoutSlam',
  'actNatural',
  'hurley',
  'sliotarStrike',
  'poitinBreath',
  'borrowedGlove',
];

export function createSandboxModule(chapter: ChapterNumber = 1): ChapterModule {
  const p = `c${chapter}` as const;
  const screenId: ScreenId = `${p}.sandbox`;
  const startCp: CheckpointId = `${p}.sandbox.start`;
  const midCp: CheckpointId = `${p}.sandbox.mid`;
  const stealthCp: CheckpointId = `${p}.sandbox.stealth`;
  const stealthDef: StealthSectionDef = {
    id: 'c2.stealth.bog',
    checkpointId: stealthCp,
    guards: [
      {
        enemyId: 'suit',
        route: {
          mode: 'pingPong',
          waypoints: [
            { position: T(16, 2), waitMs: 1200, facing: 'down' },
            { position: T(27, 2), waitMs: 1200, facing: 'left' },
            { position: T(27, 7), waitMs: 800 },
          ],
        },
      },
    ],
    hazards: [],
    hidingProps: [{ id: 'sandbox.noticeboard', kind: 'noticeboard', position: T(18, 5), radius: 14 }],
    cleanRunReward: { kind: 'pickup', item: { kind: 'drink', drinkId: 'stout', count: 1 } },
  };

  return {
    def: {
      number: chapter,
      titleTextId: 'ui.title',
      screens: [{ id: screenId, region: 'kilnamoe', widthTiles: 30, heightTiles: 17 }],
      startScreenId: screenId,
      checkpoints: [
        { id: startCp, kind: 'chapterStart', screenId, position: T(3, 7) },
        { id: midCp, kind: 'other', screenId, position: T(15, 8) },
        { id: stealthCp, kind: 'stealth', screenId, position: T(12, 7) },
      ],
      sections: [
        { id: `${p}.explore.sandbox`, kind: 'explore', mykoCallable: false },
        { id: 'c1.puzzle.kegs', kind: 'puzzle', mykoCallable: true },
        { id: 'c2.stealth.bog', kind: 'stealth', mykoCallable: false, checkpointId: stealthCp },
        { id: 'c1.fight.chipper', kind: 'fight', mykoCallable: true, reward: { pickups: [{ kind: 'food', foodId: 'spiceBag' }] } },
      ],
      stealthSections: [stealthDef],
      puzzle: { id: 'c1.puzzle.kegs', chapter: 1, kind: 'push' },
      evidence: ['c2.clue.ring'],
      objectives: [
        {
          id: 'sandbox.objective',
          textId: 'ui.prompt.move',
          hint: { objectiveId: 'sandbox.objective', nudgeDialogueId: 'c1.hint.bar.1', answerDialogueId: 'c1.hint.bar.2' },
        },
      ],
      newAbilities: [],
      mykoCallLines: {
        fight: { sequenceId: `${p}.call.fight`, casebookBodyTextId: `${p}.call.fight.casebook`, casebookMarginTextId: `${p}.call.fight.margin` },
        puzzle: { sequenceId: `${p}.call.puzzle`, casebookBodyTextId: `${p}.call.puzzle.casebook`, casebookMarginTextId: `${p}.call.puzzle.margin` },
      },
      finaleSectionId: 'c1.boss.bigtom',
    },
    screens: [
      {
        id: screenId,
        grid: gridFromAscii(ROWS),
        exits: [],
        playerStart: T(3, 7),
        dressing: {
          props: [
            { id: 'sandbox.tractor', frame: 'tractor', col: 4, row: 4, solid: { dy: 1, width: 3, height: 1 }, blocksSight: true },
            { frame: 'bogLights.0', col: 7, row: 9, frames: ['bogLights.0', 'bogLights.1', 'bogLights.2'], frameRate: 3 },
            { id: 'sandbox.keg', frame: 'keg', col: 10, row: 5, solid: { width: 1, height: 1 } },
          ],
          npcs: [{ id: 'sandbox.dympna', npc: 'dympna', col: 2, row: 9, facing: 'right', examinableId: 'sandbox.dympna', solid: true }],
        },
        ambient: NIGHT,
      },
    ],
    pickups: [
      { id: 'sandbox.stout', item: { kind: 'drink', drinkId: 'stout', count: 2 }, screenId, position: T(3, 2) },
      { id: 'sandbox.whiskey', item: { kind: 'drink', drinkId: 'whiskey', count: 1 }, screenId, position: T(5, 2) },
      { id: 'sandbox.crisps', item: { kind: 'food', foodId: 'crisps' }, screenId, position: T(7, 2) },
      { id: 'sandbox.empties', item: { kind: 'empties', count: 4 }, screenId, position: T(9, 2) },
    ],
    examinables: [
      { id: 'sandbox.ring', screenId, position: T(9, 8), evidenceId: 'c2.clue.ring' },
      { id: 'sandbox.lever', screenId, position: T(12, 12) },
    ],
    fights: [
      {
        sectionId: 'c1.fight.chipper',
        screenId,
        trigger: { kind: 'area', area: { x: 18 * 16, y: 11 * 16, width: 10 * 16, height: 5 * 16 } },
        spawnPoints: [T(26, 12), T(26, 14), T(24, 15)],
        entrance: T(15, 11),
      },
    ],
    bosses: [],
    stealth: [
      {
        sectionId: 'c2.stealth.bog',
        screenId,
        startArea: { x: 14 * 16, y: 1 * 16, width: 4 * 16, height: 9 * 16 },
        exitArea: { x: 28 * 16, y: 1 * 16, width: 1 * 16, height: 2 * 16 },
        entrance: T(13, 8),
        reinforcementPoints: [T(28, 8), T(28, 9)],
      },
    ],
    pushPuzzles: [
      {
        sectionId: 'c1.puzzle.kegs',
        screenId,
        pieceKind: 'keg',
        resetExaminableId: 'sandbox.lever',
        layout: {
          area: { col: 1, row: 11, width: 9, height: 5 },
          pieces: [
            { id: 'keg1', col: 9, row: 14 },
            { id: 'keg2', col: 9, row: 13 },
          ],
          fixed: [{ col: 7, row: 13 }],
          goal: { kind: 'clear', cells: [{ col: 9, row: 14 }, { col: 8, row: 14 }] },
          solution: [
            { id: 'keg1', col: 6, row: 14 },
            { id: 'keg2', col: 9, row: 12 },
          ],
        },
      },
    ],
    triggers: [],
    createScript: (ctx) => {
      let night = true;
      let off: (() => void) | null = null;
      return {
        onStart: () => {
          for (const id of ALL_ABILITIES) ctx.unlockAbility(id);
          ctx.setObjective('sandbox.objective');
          off = ctx.onMeleeHit(
            { x: 10 * 16, y: 5 * 16, width: 16, height: 16 },
            (hit) => {
              ctx.setPropFrame('sandbox.keg', hit.comboIndex % 2 === 0 ? 'crate' : 'keg');
              if (!hit.haymaker) return;
              night = !night;
              ctx.setAmbient(night ? NIGHT : null);
            },
            screenId,
          );
        },
        onExamine: (id) => {
          if (id !== 'sandbox.dympna') return undefined;
          void ctx.say('c1.pub.photo');
          return true;
        },
        dispose: () => off?.(),
      };
    },
  };
}

/**
 * Dev sandbox (`?sandbox=1`): one 30 x 17 walled room where every system can
 * be exercised with placeholder shapes. Not part of the game; it uses an
 * in-memory save and borrows real section IDs so their tuning applies
 * (`c1.fight.chipper` waves, `c1.puzzle.kegs`, `c2.stealth.bog` and its alarm).
 *
 * Layout (tiles): pickups top left, a suit patrolling the top right with a
 * noticeboard to hide by, the keg puzzle bottom left, the lads' fight bottom
 * right, an examinable clue and a checkpoint in the middle.
 */

import type { ChapterModule } from './chapter';
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
          hint: { objectiveId: 'sandbox.objective', nudgeDialogueId: 'myko.idle.01', answerDialogueId: 'myko.idle.02' },
        },
      ],
      newAbilities: [],
      mykoCallLines: {
        fight: { sequenceId: `${p}.myko.call.fight`, casebookBodyTextId: `${p}.myko.call.fight.body`, casebookMarginTextId: `${p}.myko.call.fight.margin` },
        puzzle: { sequenceId: `${p}.myko.call.puzzle`, casebookBodyTextId: `${p}.myko.call.puzzle.body`, casebookMarginTextId: `${p}.myko.call.puzzle.margin` },
      },
      finaleSectionId: 'c1.boss.bigtom',
    },
    screens: [{ id: screenId, grid: gridFromAscii(ROWS), exits: [], playerStart: T(3, 7) }],
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
    createScript: (ctx) => ({
      onStart: () => {
        for (const id of ALL_ABILITIES) ctx.unlockAbility(id);
        ctx.setObjective('sandbox.objective');
      },
    }),
  };
}

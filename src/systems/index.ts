/**
 * Public API of the systems. Chapters, UI and tests import { TUNING } from '../content/tuning';
import from here only.
 * DESIGN.md section 10: "A chapter never reaches into a system's internals;
 * it uses the public API in src/systems/index.ts."
 */

import { createSandboxModule } from '../core/sandbox';
import { GameSession, createUiState } from './session';

// Chapter contract (defined in core, re-exported for convenience).
export type {
  AreaRect,
  BossPlacement,
  ChapterContext,
  ChapterModule,
  ChapterScript,
  ChapterStartInfo,
  DeductionPlacement,
  ExitDef,
  FightPlacement,
  LightSource,
  MeleeHitInfo,
  NpcPlacement,
  PropPlacement,
  PushPuzzlePlacement,
  ScreenAmbient,
  ScreenDressing,
  ScreenLayout,
  ScriptedCompletableHandle,
  SectionTrigger,
  StealthControl,
  StealthPlacement,
  TileFootprint,
  TriggerDef,
} from '../core/chapter';
export { registerChapter, getChapter, registeredChapters } from '../core/chapter';

// Systems a chapter may use or extend.
export { Abilities, abilitiesForChapterStart, isSpecial } from './abilities';
export type { AbilityAction, AbilityRefusal } from './abilities';
export { BossRunner } from './boss';
export type { BossBodyPlacement, BossHooks } from './boss';
export { Buzz, buzzStateFor, buzzStateRank } from './buzz';
export { canHear, canSee, stepDetection, actingNatural, Guard, Hazard, StealthRunner } from './stealth';
export { Casebook, DeductionBoard, PuzzleBase, deductionCorrect } from './investigation';
export { DialogueRunner } from './dialogue';
export type { DialogueLookup } from './dialogue';
export { EnemyActor } from './enemies';
export { FightRunner } from './fight';
export type { FightHooks } from './fight';
export { Hangover, Heat, TimedEffects, hangoverAtChapterStart, hangoverFromChapterEnd, maxHealthFor } from './conditions';
export { Inventory, applyConsumable, wouldHaveEffect, isAlcoholic } from './inventory';
export { Myko, evaluateCall } from './myko';
export { Player, freshPlayerSnapshot } from './player';
export { PushPuzzle, cardinalOf } from './puzzles';
export type { PushPuzzleLayout, PushPiece } from './puzzles';
export { CompletableSection, ScriptedCompletable } from './sections';
export type { SectionHost } from './sections';
export { ChapterRun } from './run';
export { GameSession, createUiState, carryOver, chapterSelectSave, saveAtChapterStart, emptyProgress } from './session';
export type { SceneDriver, UiState } from './session';
export { TILE, gridFromAscii, tileCentre, tileOf, lineOfSight, findPath } from './grid';
export { shapeHits, shapeHitsRect, shieldBlocks, knockbackVector, scaledDamage } from './combat';
export { Dressing } from './dressing';
export type { InteractPoint, LiveNpc, LiveProp } from './dressing';

/** The one game session. */
export const session = new GameSession({ fallbackModule: createSandboxModule });

/** The object the UI receives (`UiStateSource` in `src/ui/contract.ts`). */
export const uiState = createUiState(session);

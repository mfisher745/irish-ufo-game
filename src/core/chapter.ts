/**
 * The chapter-module contract and registry. DESIGN.md section 10: "Chapters
 * are data plus small scripts. A chapter never reaches into a system's
 * internals." Level-builder writes one `ChapterModule` per chapter in
 * `src/chapters/<nn>/` and registers it from `src/chapters/index.ts` with
 * `registerChapter(module)`.
 *
 * ## How a chapter is put together
 *
 * Data (`ChapterModule`):
 * - `def`: the `ChapterDef` from types.ts (screens, checkpoints, sections in
 *   beat order, stealth defs, puzzle, deduction board, evidence, objectives,
 *   new abilities, Myko call lines, finale).
 * - `screens`: one `ScreenLayout` per `def.screens` entry: a `TileGrid` for
 *   collision / sight / shade, optional tile frames for drawing, exits to
 *   other screens and a start position.
 * - `pickups`, `examinables`: placed by screen (types.ts `PickupDef`,
 *   `ExaminableDef`). Examining adds evidence, gives an item and/or plays a
 *   line; the script can take over with `onExamine`.
 * - `fights`, `bosses`, `stealth`, `pushPuzzles`: where each section lives,
 *   what starts it (an area Andrew walks into, or 'script'), spawn points,
 *   and the `entrance` Myko waits at and strolls in from. The numbers
 *   (waves, health, attacks) come from `TUNING` by section ID, never from
 *   here.
 * - `triggers`: named areas; walking in calls `script.onTrigger(id)`.
 * - Checkpoints are `def.checkpoints`; walking near one reaches it (save).
 *   Stealth and boss placements reach their checkpoint when they start, if
 *   it was not reached already.
 *
 * Script (`createScript(ctx)` returns a `ChapterScript`): small event hooks.
 * Everything a script does goes through `ChapterContext`: dialogue by ID
 * (`say` resolves when the line is finished; box lines never block play,
 * scene lines pause it), objectives, flags (saved), starting and finishing
 * sections, scripted completables, boss hooks, abilities, items, evidence,
 * exits, heat, and `completeChapter()` at the end.
 *
 * Every fight, boss, set piece, puzzle and deduction is a `Completable`:
 * fights, bosses, push puzzles and the deduction board are built by the
 * systems from the placements; any other puzzle kind or custom set piece is
 * registered by the script with `ctx.registerCompletable` (a callback that
 * jumps to the solved state) or `ctx.registerPuzzle` (a `PuzzleBase`
 * subclass from `src/systems`). Either way `completeNow()` works for the
 * Myko call and for QA.
 *
 * State after death or Continue: the chapter is rebuilt from the save.
 * Completed sections stay complete, collected pickups stay collected, and
 * `onStart({ checkpointId, resumed })` tells the script where it is; the
 * script restores anything else from `ctx.flag()`.
 *
 * QA: `window.__game.completeCurrent()` calls `completeNow('debug')` on the
 * current section; `window.__game.walkChapter()` completes every section in
 * `def.sections` order (stealth and explore are marked done, evidence and
 * new abilities are granted, `script.debugWalk?.()` runs) and then completes
 * the chapter.
 */

import type { BossBodyPlacement, BossHooks, BossRunner } from '../systems/boss';
import type { FightHooks, FightRunner } from '../systems/fight';
import type { PuzzleBase } from '../systems/investigation';
import type { PushPuzzleLayout } from '../systems/puzzles';
import type { SectionHost } from '../systems/sections';
import type {
  AbilityId,
  BossId,
  ChapterDef,
  ChapterFlagValue,
  ChapterNumber,
  CheckpointId,
  CompletableKind,
  CompletableSectionId,
  CompletionSource,
  DialogueId,
  EvidenceId,
  ExaminableDef,
  FightSectionId,
  GameEventBus,
  ObjectiveId,
  PickupDef,
  PickupItem,
  PuzzleSectionId,
  Reward,
  ScreenId,
  SectionId,
  StealthSectionId,
  TileGrid,
  Vec2,
} from './types';

/** An axis-aligned area in screen pixels. */
export interface AreaRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A way off a screen. */
export interface ExitDef {
  readonly id: string;
  readonly area: AreaRect;
  readonly toScreen: ScreenId;
  /** Where Andrew appears on the target screen. */
  readonly spawn: Vec2;
  /** Closed until all of these sections are complete. */
  readonly lockedUntil?: readonly SectionId[];
}

export interface ScreenLayout {
  readonly id: ScreenId;
  readonly grid: TileGrid;
  /** Optional frame index in the region tileset per tile (row-major); -1 or absent draws nothing. */
  readonly tiles?: readonly number[];
  readonly exits: readonly ExitDef[];
  /** Where Andrew starts if the chapter starts on this screen. */
  readonly playerStart: Vec2;
  /** Where Myko starts (default: beside Andrew). */
  readonly mykoStart?: Vec2;
}

/** What starts a section: Andrew walking into an area, or the script. */
export type SectionTrigger = { readonly kind: 'area'; readonly area: AreaRect } | { readonly kind: 'script' };

export interface FightPlacement {
  readonly sectionId: FightSectionId;
  readonly screenId: ScreenId;
  readonly trigger: SectionTrigger;
  readonly spawnPoints: readonly Vec2[];
  /** Where Myko waits on the phone and strolls in from. */
  readonly entrance: Vec2;
}

export interface BossPlacement {
  readonly bossId: BossId;
  readonly screenId: ScreenId;
  readonly trigger: SectionTrigger;
  readonly bodies: readonly BossBodyPlacement[];
  readonly entrance: Vec2;
  /** For `reachExit` set pieces. */
  readonly exitArea?: AreaRect;
}

export interface StealthPlacement {
  readonly sectionId: StealthSectionId;
  readonly screenId: ScreenId;
  /** Walking in starts the section (and reaches its checkpoint). */
  readonly startArea: AreaRect;
  /** Walking in without the alarm is a clean run. */
  readonly exitArea: AreaRect;
  readonly entrance: Vec2;
  /** Where the `.alarm` fight's reinforcements arrive. */
  readonly reinforcementPoints: readonly Vec2[];
}

export interface PushPuzzlePlacement {
  readonly sectionId: PuzzleSectionId;
  readonly screenId: ScreenId;
  readonly layout: PushPuzzleLayout;
  /** Examinable that resets the puzzle (the chapter 3 lever). */
  readonly resetExaminableId?: string;
  /** Art frame name / texture key hint for the pieces ('keg', 'crate'). */
  readonly pieceKind: string;
}

export interface DeductionPlacement {
  /** Examining this opens the board (or the script calls `ctx.openDeduction()`). */
  readonly examinableId?: string;
}

export interface TriggerDef {
  readonly id: string;
  readonly screenId: ScreenId;
  readonly area: AreaRect;
  /** Fires once per chapter run (default true). */
  readonly once?: boolean;
}

export interface ChapterModule {
  readonly def: ChapterDef;
  readonly screens: readonly ScreenLayout[];
  readonly pickups: readonly PickupDef[];
  readonly examinables: readonly ExaminableDef[];
  readonly fights: readonly FightPlacement[];
  readonly bosses: readonly BossPlacement[];
  readonly stealth: readonly StealthPlacement[];
  readonly pushPuzzles?: readonly PushPuzzlePlacement[];
  readonly deduction?: DeductionPlacement;
  readonly triggers: readonly TriggerDef[];
  /** Pools for Myko's tangents (DESIGN.md 7.5: Ohio from chapter 6). */
  readonly mykoTangentPools?: { readonly ohio?: string; readonly other?: string };
  /** Pool Myko draws from when a clue is found, if any. */
  readonly clueCommentPool?: string;
  createScript?(ctx: ChapterContext): ChapterScript;
}

export interface ChapterStartInfo {
  readonly checkpointId: CheckpointId;
  /** True after a death or Continue; false on a fresh chapter start. */
  readonly resumed: boolean;
}

/** Hooks a chapter script may implement. All optional. */
export interface ChapterScript {
  onStart?(info: ChapterStartInfo): void;
  onScreenEntered?(screenId: ScreenId): void;
  onTrigger?(triggerId: string): void;
  /** Return true to replace the default examine behaviour. */
  onExamine?(examinableId: string): boolean | void;
  onSectionStarted?(sectionId: SectionId): void;
  onSectionCompleted?(sectionId: SectionId, by: CompletionSource): void;
  onUpdate?(dtMs: number): void;
  bossHooks?: Partial<Record<BossId, BossHooks>>;
  fightHooks?: Partial<Record<FightSectionId, FightHooks>>;
  /** Extra work when QA walks the chapter (set flags, give items). */
  debugWalk?(): void;
  dispose?(): void;
}

/** Handle for a completable registered by a script. */
export interface ScriptedCompletableHandle {
  readonly sectionId: CompletableSectionId;
  isComplete(): boolean;
  /** The player finished it. */
  complete(by?: CompletionSource): void;
  /** Make it the current section (for the Myko call and the HUD). */
  start(): void;
}

/** Stealth controls a script may need. */
export interface StealthControl {
  alarm(): void;
  setHazardEnabled(hazardId: string, enabled: boolean): void;
  finish(): void;
  readonly alarmRaised: boolean;
}

/** The public API a chapter script uses. Implemented in `src/systems/`. */
export interface ChapterContext {
  readonly bus: GameEventBus;
  readonly chapter: ChapterNumber;
  readonly sectionHost: SectionHost;

  // Dialogue and objectives
  say(id: DialogueId): Promise<void>;
  setObjective(id: ObjectiveId | null): void;
  objective(): ObjectiveId | null;

  // Flags (saved at each checkpoint)
  flag(key: string): ChapterFlagValue | undefined;
  setFlag(key: string, value: ChapterFlagValue): void;

  // Sections
  isComplete(sectionId: SectionId): boolean;
  startSection(sectionId: SectionId): void;
  /** Finish an explore section, a scripted completable or a `scripted` boss. */
  completeSection(sectionId: SectionId, by?: CompletionSource): void;
  registerCompletable(
    sectionId: CompletableSectionId,
    kind: CompletableKind,
    solve: (source: CompletionSource) => void,
    reward?: Reward,
  ): ScriptedCompletableHandle;
  registerPuzzle(puzzle: PuzzleBase): void;
  boss(id: BossId): BossRunner | null;
  fight(id: FightSectionId): FightRunner | null;
  stealth(id: StealthSectionId): StealthControl | null;
  openDeduction(): void;

  // Player and world
  unlockAbility(id: AbilityId): void;
  give(item: PickupItem): void;
  addEvidence(id: EvidenceId): void;
  reachCheckpoint(id: CheckpointId): void;
  goToScreen(screenId: ScreenId, spawn: Vec2): void;
  currentScreen(): ScreenId;
  setExitLocked(exitId: string, locked: boolean): void;
  setHeatActive(active: boolean): void;
  /** Park Myko at a spot (scripted), or null to let him follow again. */
  setMykoScripted(pos: Vec2 | null): void;
  playerPosition(): Vec2;
  setPlayerPosition(pos: Vec2): void;
  /** Freeze Andrew's controls (cutscene walk-ins). */
  setControlsLocked(locked: boolean): void;
  spawnPickup(def: PickupDef): void;
  removePickup(id: string): void;
  /** Ends the chapter: hangover carry-over, save, next chapter. */
  completeChapter(): void;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const REGISTRY = new Map<ChapterNumber, ChapterModule>();

export function registerChapter(module: ChapterModule): void {
  REGISTRY.set(module.def.number, module);
}

export function getChapter(n: ChapterNumber): ChapterModule | undefined {
  return REGISTRY.get(n);
}

export function registeredChapters(): ChapterNumber[] {
  return [...REGISTRY.keys()].sort((a, b) => a - b);
}

/** Test helper. */
export function clearChapterRegistry(): void {
  REGISTRY.clear();
}
